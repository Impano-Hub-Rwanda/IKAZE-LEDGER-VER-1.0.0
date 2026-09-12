import { getDb } from './database';
import { writeFile, readFile, saveFileDialog, showMessageBox, confirmDialog, isTauri, openFilePicker } from './tauri';

/**
 * Database backup & restore manager for PGlite.
 *
 * Backup format: versioned JSON with SHA-256 integrity hash.
 * Restore validates integrity, checks version compatibility, and
 * performs an atomic restore with automatic rollback on failure.
 */

// ── Backup format versioning ──────────────────────────────
const BACKUP_FORMAT_VERSION = 2;
const APP_VERSION = '1.0.12';
const MAX_BACKUP_JSON_CHARS = 50_000_000;

// Parent-before-child order for INSERT; reversed for DELETE
const DB_TABLES = [
  'users', 'security_questions', 'settings',
  'customers', 'products', 'services',
  'debts', 'debt_items', 'payments',
  'inventory_movements', 'proforma_invoices', 'proforma_items', 'demand_letters',
  'audit_logs',
] as const;

interface ExportRow {
  [key: string]: unknown;
}

interface TableData {
  name: string;
  rows: ExportRow[];
}

interface DatabaseSnapshot {
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  checksum: string;
  tables: TableData[];
}

// Legacy v1 format (no formatVersion, no checksum)
interface LegacySnapshot {
  version: string;
  createdAt: string;
  appVersion: string;
  tables: TableData[];
}

export interface BackupMetadata {
  version: string;
  createdAt: string;
  tableCount: number;
  totalRows: number;
  tableSummaries: { table: string; rows: number }[];
}

// ── Hashing ───────────────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Export ────────────────────────────────────────────────

/**
 * Exports all tables to a structured JSON snapshot with integrity checksum.
 */
export async function exportDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const db = getDb();
  // These reads are independent. Let PGlite schedule them together instead of
  // paying a JS/IPC round-trip for each table sequentially.
  const tableResults = await Promise.all(
    DB_TABLES.map(async (table) => {
      const result = await db.query<ExportRow>(`SELECT * FROM ${table}`);
      return { name: table, rows: result.rows as ExportRow[] } as TableData;
    }),
  );
  const tables = tableResults;

  const createdAt = new Date().toISOString();
  // Checksum covers table data (not the checksum field itself)
  const payload = JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION, appVersion: APP_VERSION, createdAt, tables });
  const checksum = await sha256Hex(payload);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    createdAt,
    checksum,
    tables,
  };
}

// Backup files are untrusted input. Table/column identifiers must never be
// accepted blindly into SQL statements. Keep the table set closed and only
// allow normal PostgreSQL identifier characters for columns.
function safeIdentifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('Invalid backup file: unsafe database identifier');
  }
  return value;
}

function validateBackupTableName(name: unknown): string {
  const table = safeIdentifier(name);
  if (!(DB_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Invalid backup file: unsupported table "${table}"`);
  }
  return table;
}

// ── Validation ────────────────────────────────────────────

/**
 * Validates a parsed snapshot object. Throws with a clear error message
 * if the backup is invalid or corrupted.
 */
export async function validateSnapshot(snapshot: unknown): Promise<DatabaseSnapshot> {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid backup file: not a valid JSON object');
  }

  const obj = snapshot as Record<string, unknown>;

  // Detect legacy v1 format (no formatVersion field) and migrate it
  if (!('formatVersion' in obj) && 'tables' in obj) {
    return migrateLegacySnapshot(snapshot as LegacySnapshot);
  }

  if (!('formatVersion' in obj)) {
    throw new Error('Invalid backup file: missing format version');
  }

  const fmtVer = Number(obj.formatVersion);
  if (!Number.isFinite(fmtVer)) {
    throw new Error('Invalid backup file: format version is not a number');
  }

  if (fmtVer > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Backup format version ${fmtVer} is newer than this app supports (v${BACKUP_FORMAT_VERSION}). Please update the app to restore this backup.`,
    );
  }

  if (!Array.isArray(obj.tables)) {
    throw new Error('Invalid backup file: missing or invalid tables array');
  }

  // Verify checksum for v2+ backups
  if (typeof obj.checksum === 'string' && typeof obj.createdAt === 'string') {
    const payload = JSON.stringify({
      formatVersion: obj.formatVersion,
      appVersion: obj.appVersion,
      createdAt: obj.createdAt,
      tables: obj.tables,
    });
    const computed = await sha256Hex(payload);
    if (computed !== obj.checksum) {
      throw new Error('Backup file integrity check failed — the file may be corrupted or was modified after creation');
    }
  }

  // Validate each table entry. Duplicate table names are rejected so a
  // malformed backup can never silently overwrite one table's rows in the
  // restore map.
  const seenTables = new Set<string>();
  for (const t of obj.tables as TableData[]) {
    if (!t || typeof t.name !== 'string' || !Array.isArray(t.rows)) {
      throw new Error('Invalid backup file: malformed table entry');
    }
    const tableName = validateBackupTableName(t.name);
    if (seenTables.has(tableName)) {
      throw new Error(`Invalid backup file: duplicate table "${tableName}"`);
    }
    seenTables.add(tableName);
    // Validate identifiers once per table. Extra keys on later rows are not
    // used by the restore query, so scanning every key on every row only adds
    // CPU cost for large backups without improving SQL safety.
    if (t.rows.length > 0) {
      const firstRow = t.rows[0];
      if (!firstRow || typeof firstRow !== 'object' || Array.isArray(firstRow)) {
        throw new Error('Invalid backup file: malformed row');
      }
      for (const key of Object.keys(firstRow)) safeIdentifier(key);
    }
    for (const row of t.rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('Invalid backup file: malformed row');
      }
    }
  }

  return snapshot as DatabaseSnapshot;
}

/**
 * Migrates a legacy v1 snapshot (no formatVersion, no checksum) to v2 format.
 * Legacy backups are trusted without checksum verification since they predate it.
 */
async function migrateLegacySnapshot(legacy: LegacySnapshot): Promise<DatabaseSnapshot> {
  if (!Array.isArray(legacy.tables)) {
    throw new Error('Invalid legacy backup file: missing tables array');
  }
  // Validate each table entry
  for (const t of legacy.tables) {
    if (!t || typeof t.name !== 'string' || !Array.isArray(t.rows)) {
      throw new Error('Invalid legacy backup file: malformed table entry');
    }
  }
  // Return as v2 format — no checksum to verify on legacy backups
  return {
    formatVersion: 1, // mark as migrated from v1
    appVersion: legacy.appVersion ?? 'unknown',
    createdAt: legacy.createdAt ?? new Date(0).toISOString(),
    checksum: '',
    tables: legacy.tables,
  };
}

// Normalize legacy debt_items before insertion. Older backups may not contain
// service_id/item_type, and some early snapshots used slightly different item
// field names. We preserve every recoverable business value and derive only
// fields that are structurally required by the current schema.
function normalizeLegacyDebtItems(tableData: TableData | undefined): TableData | undefined {
  if (!tableData) return undefined;
  const rows = tableData.rows.map((raw) => {
    const row = { ...raw } as Record<string, unknown>;
    const productId = row.product_id ?? row.productId ?? null;
    const serviceId = row.service_id ?? row.serviceId ?? null;
    const rawType = row.item_type ?? row.type;
    const itemType = rawType === 'service' || serviceId !== null ? 'service' : 'product';
    const name = row.product_name ?? row.item_name ?? row.name ?? '';
    const quantity = Number(row.quantity ?? 1);
    const unitPrice = Number(row.unit_price ?? row.price ?? 0);
    const subtotalValue = row.subtotal ?? row.total ?? row.amount;
    const subtotal = subtotalValue == null || !Number.isFinite(Number(subtotalValue))
      ? quantity * unitPrice
      : Number(subtotalValue);

    // Write current-schema names while retaining any other compatible fields.
    row.product_id = itemType === 'product' && productId != null ? Number(productId) : null;
    row.service_id = itemType === 'service' && serviceId != null ? Number(serviceId) : null;
    row.item_type = itemType;
    row.product_name = String(name ?? '');
    row.quantity = Number.isFinite(quantity) ? quantity : 1;
    row.unit_price = Number.isFinite(unitPrice) ? unitPrice : 0;
    row.subtotal = Number.isFinite(subtotal) ? subtotal : 0;
    return row;
  });
  return { ...tableData, rows };
}

// After restoring legacy rows, repair only structural/derived item data.
// IMPORTANT: never recalculate a persisted debt total from debt_items here.
// Historical backups can legitimately contain total-only debts or incomplete
// item history; silently replacing their stored total would change financial
// data during restore.
async function reconcileRestoredDebtData(db: ReturnType<typeof getDb>): Promise<void> {
  await db.query(`
    UPDATE debt_items di
    SET product_name = p.name
    FROM products p
    WHERE di.product_id = p.id
      AND (di.product_name IS NULL OR TRIM(di.product_name) = '')
  `);
  await db.query(`
    UPDATE debt_items di
    SET product_name = s.name
    FROM services s
    WHERE di.service_id = s.id
      AND (di.product_name IS NULL OR TRIM(di.product_name) = '')
  `);
  await db.query(`
    UPDATE debt_items
    SET product_name = CASE
      WHEN item_type = 'service' AND service_id IS NOT NULL THEN CONCAT('Service #', service_id)
      WHEN product_id IS NOT NULL THEN CONCAT('Product #', product_id)
      ELSE 'Item'
    END
    WHERE product_name IS NULL OR TRIM(product_name) = ''
  `);
}

async function verifyRestoredRowCounts(
  db: ReturnType<typeof getDb>,
  tableMap: Map<string, TableData>,
): Promise<void> {
  for (const table of DB_TABLES) {
    const expected = tableMap.get(table)?.rows.length ?? 0;
    const result = await db.query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count FROM ${safeIdentifier(table)}`,
    );
    const actual = Number(result.rows[0]?.count ?? 0);
    if (actual !== expected) {
      throw new Error(
        `Restore verification failed for "${table}": expected ${expected} records, restored ${actual}.`,
      );
    }
  }
}

// ── Restore (atomic with rollback) ────────────────────────

/**
 * Imports a validated snapshot and restores all table data atomically.
 * If any step fails, the database is rolled back to its pre-restore state.
 *
 * Strategy: execute the complete replacement inside one PostgreSQL transaction.
 * On failure, ROLLBACK leaves the pre-restore database unchanged.
 */
export async function importDatabaseSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
  const db = getDb();

  const tableMap = new Map<string, TableData>();
  for (const t of snapshot.tables) {
    const table = validateBackupTableName(t.name);
    tableMap.set(table, table === 'debt_items' ? normalizeLegacyDebtItems(t)! : t);
  }

  // PGlite supports PostgreSQL transactions. Use one transaction for the whole
  // restore instead of making a second full in-memory copy for manual rollback.
  // This is substantially faster for large databases and remains atomic.
  try {
    await db.query('BEGIN');

    // Delete in dependency order and insert in parent-before-child order.
    // No FK disabling is necessary because the ordering is already correct.
    for (const table of [...DB_TABLES].reverse()) {
      await db.query(`DELETE FROM ${table}`);
    }

    // Read the current schema once. This makes restore forward-compatible with
    // backups from the immediately previous app version when a table gained a
    // new column: columns that no longer exist are ignored, while missing
    // current columns are left to PostgreSQL defaults/constraints.
    const schemaResult = await db.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name, ordinal_position`,
      [Array.from(DB_TABLES)],
    );
    const currentColumns = new Map<string, Set<string>>();
    for (const row of schemaResult.rows) {
      const table = String(row.table_name);
      const set = currentColumns.get(table) ?? new Set<string>();
      set.add(String(row.column_name));
      currentColumns.set(table, set);
    }

    for (const table of DB_TABLES) {
      const tableData = tableMap.get(table);
      if (!tableData || tableData.rows.length === 0) continue;

      const availableColumns = currentColumns.get(table) ?? new Set<string>();
      // Legacy JSON exports can contain rows with slightly different key sets.
      // Build the union of all row keys instead of trusting the first row, so a
      // field that exists only on a later row is never silently dropped.
      const backupColumns = Array.from(new Set(
        tableData.rows.flatMap((row) => Object.keys(row)),
      )).map(safeIdentifier);
      const columnNames = backupColumns.filter((column) => availableColumns.has(column));
      if (columnNames.length === 0) continue;

      const colCount = columnNames.length;
      const rows = tableData.rows;
      // Keep enough rows per statement to reduce query overhead without creating
      // oversized parameter arrays on bigger backups.
      const BATCH_SIZE = 2000;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const end = Math.min(i + BATCH_SIZE, rows.length);
        const values: unknown[] = [];
        const placeholders: string[] = [];

        for (let r = i; r < end; r++) {
          const row = rows[r];
          const ph: string[] = [];
          for (let c = 0; c < colCount; c++) {
            ph.push(`$${(r - i) * colCount + c + 1}`);
            values.push(row[columnNames[c]] ?? null);
          }
          placeholders.push(`(${ph.join(', ')})`);
        }

        await db.query(
          `INSERT INTO ${safeIdentifier(table)} (${columnNames.join(', ')}) VALUES ${placeholders.join(', ')}`,
          values,
        );
      }
    }

    // Verify that every source row was actually restored before any commit.
    // This is a hard safety gate against silent partial restores.
    await verifyRestoredRowCounts(db, tableMap);

    // Normalize and reconcile debt data after all parent/child rows exist.
    // This makes legacy backups behave like native current-version backups.
    await reconcileRestoredDebtData(db);

    // Re-sync sequences before committing so newly created records continue from
    // the restored maximum id. Tables without an id sequence are simply skipped.
    for (const table of DB_TABLES) {
      try {
        await db.query(
          `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
        );
      } catch {
        // Table may not have an id sequence.
      }
    }

    await db.query('COMMIT');
  } catch (err) {
    try {
      await db.query('ROLLBACK');
    } catch {
      // Preserve the original restore error.
    }
    throw new Error(
      `Restore failed — database was left unchanged. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── Public API: backup to file ────────────────────────────

/**
 * Saves a backup file to user-selected location.
 */
export async function backupToFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const snapshot = await exportDatabaseSnapshot();
    const json = JSON.stringify(snapshot);
    const fileName = `dms-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;

    if (isTauri()) {
      const path = await saveFileDialog(fileName, [
        { name: 'JSON Backup', extensions: ['json'] },
      ]);
      if (!path) return { success: false, error: 'Cancelled' };
      await writeFile(path, json);
      return { success: true, path };
    }

    // Web fallback — download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, path: fileName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Public API: restore from file ─────────────────────────

/**
 * Restores from a user-selected backup file.
 * Validates the file before importing. Shows clear errors only for truly invalid files.
 */
export async function restoreFromFile(): Promise<{ success: boolean; error?: string }> {
  try {
    let json: string;
    if (isTauri()) {
      const path = await openFilePicker([{ name: 'JSON Backup', extensions: ['json'] }]);
      if (!path) return { success: false, error: 'Cancelled' };
      json = await readFile(path);
    } else {
      // Web fallback — file input
      json = await new Promise<string>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return reject(new Error('No file selected'));
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        };
        input.click();
      });
    }

    if (json.length > MAX_BACKUP_JSON_CHARS) {
      throw new Error('Backup file is too large to process safely.');
    }

    // Parse JSON — catch syntax errors with a clear message
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid backup file: the file is not valid JSON. It may be corrupted or not a backup file.');
    }

    // Validate before prompting the user
    const snapshot = await validateSnapshot(parsed);

    // Confirm with user before replacing data
    const totalRows = snapshot.tables.reduce((sum, t) => sum + t.rows.length, 0);
    const confirmed = await confirmDialog(
      'Restore Database',
      `This backup was created on ${new Date(snapshot.createdAt).toLocaleString()} and contains ${totalRows} records across ${snapshot.tables.length} tables.\n\nThis will REPLACE ALL current data. This cannot be undone. Continue?`,
      'warning',
    );
    if (!confirmed) return { success: false, error: 'Cancelled' };

    await importDatabaseSnapshot(snapshot);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Public API: reset ─────────────────────────────────────

/**
 * Resets the database by deleting all data except settings.
 */
export async function resetDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const confirmed = await confirmDialog(
      'Reset Database',
      'This will permanently delete ALL data (customers, products, debts, payments, inventory, users). Settings will be preserved. This cannot be undone. Continue?',
      'warning',
    );
    if (!confirmed) return { success: false, error: 'Cancelled' };

    const db = getDb();
    const deleteOrder = [
      'proforma_items', 'proforma_invoices', 'audit_logs', 'inventory_movements',
      'payments', 'debt_items', 'debts', 'products', 'services',
      'customers', 'security_questions', 'users',
    ];
    await db.query(`SET session_replication_role = 'replica'`);
    try {
      for (const table of deleteOrder) {
        await db.query(`DELETE FROM ${table}`);
      }
      for (const table of deleteOrder) {
        try { await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`); } catch { /* no seq */ }
      }
    } finally {
      await db.query(`SET session_replication_role = 'origin'`);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Public API: metadata & health ─────────────────────────

/**
 * Gets backup metadata (summary of current DB state).
 */
export async function getBackupMetadata(): Promise<BackupMetadata> {
  const db = getDb();
  const tableSummaries: { table: string; rows: number }[] = [];
  let totalRows = 0;

  for (const table of DB_TABLES) {
    const result = await db.query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM ${table}`);
    const count = Number(result.rows[0]?.count ?? 0);
    tableSummaries.push({ table, rows: count });
    totalRows += count;
  }

  return {
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    tableCount: DB_TABLES.length,
    totalRows,
    tableSummaries,
  };
}

/**
 * Performs a database health check.
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  checks: { name: string; passed: boolean; detail: string }[];
}> {
  const db = getDb();
  const checks: { name: string; passed: boolean; detail: string }[] = [];

  try {
    const res = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const existing = new Set(res.rows.map((r) => r.table_name));
    const missing = DB_TABLES.filter((t) => !existing.has(t));
    checks.push({
      name: 'Table integrity',
      passed: missing.length === 0,
      detail: missing.length === 0 ? `All ${DB_TABLES.length} tables present` : `Missing: ${missing.join(', ')}`,
    });
  } catch (err) {
    checks.push({ name: 'Table integrity', passed: false, detail: String(err) });
  }

  try {
    const res = await db.query<{ count: string }>('SELECT COUNT(*)::int AS count FROM settings');
    const count = Number(res.rows[0]?.count ?? 0);
    checks.push({
      name: 'Settings row',
      passed: count > 0,
      detail: count > 0 ? 'Settings configured' : 'No settings row found',
    });
  } catch {
    checks.push({ name: 'Settings row', passed: false, detail: 'Cannot query settings' });
  }

  try {
    const res = await db.query<{ count: string }>('SELECT COUNT(*)::int AS count FROM users');
    const count = Number(res.rows[0]?.count ?? 0);
    checks.push({
      name: 'User account',
      passed: count > 0,
      detail: count > 0 ? `${count} user(s) found` : 'No users — setup required',
    });
  } catch {
    checks.push({ name: 'User account', passed: false, detail: 'Cannot query users' });
  }

  try {
    const res = await db.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM debt_items di WHERE NOT EXISTS (SELECT 1 FROM debts d WHERE d.id = di.debt_id)',
    );
    const orphaned = Number(res.rows[0]?.count ?? 0);
    checks.push({
      name: 'Referential integrity',
      passed: orphaned === 0,
      detail: orphaned === 0 ? 'No orphaned records' : `${orphaned} orphaned debt items`,
    });
  } catch {
    checks.push({ name: 'Referential integrity', passed: false, detail: 'Cannot check' });
  }

  try {
    const res = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const indexCount = res.rows.length;
    checks.push({
      name: 'Database indexes',
      passed: indexCount >= 10,
      detail: `${indexCount} indexes found`,
    });
  } catch {
    checks.push({ name: 'Database indexes', passed: false, detail: 'Cannot check indexes' });
  }

  const failedChecks = checks.filter((c) => !c.passed);
  const status = failedChecks.length === 0 ? 'healthy' : failedChecks.length <= 2 ? 'warning' : 'error';

  return { status, checks };
}

// ── Convenience wrappers for SettingsPage ─────────────────

export async function exportDatabaseToJsonFile(): Promise<void> {
  const result = await backupToFolder();
  if (result.success) {
    await showMessageBox('Backup Complete', `Database backup saved successfully${result.path ? ` to:\n${result.path}` : ''}`, 'info');
  } else if (result.error !== 'Cancelled') {
    await showMessageBox('Backup Failed', result.error || 'Unknown error', 'error');
  }
}

export async function importDatabaseFromJsonFile(): Promise<void> {
  const result = await restoreFromFile();
  if (result.success) {
    await showMessageBox('Restore Complete', 'Database restored successfully. The application will reload.', 'info');
    setTimeout(() => window.location.reload(), 1500);
  } else if (result.error !== 'Cancelled') {
    await showMessageBox('Restore Failed', result.error || 'Unknown error', 'error');
  }
}

export { DB_TABLES };
export { BACKUP_FORMAT_VERSION };
export type { DatabaseSnapshot };
