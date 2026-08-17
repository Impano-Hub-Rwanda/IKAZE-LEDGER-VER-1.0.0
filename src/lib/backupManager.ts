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
const APP_VERSION = '1.0.0';

// Parent-before-child order for INSERT; reversed for DELETE
const DB_TABLES = [
  'users', 'security_questions', 'settings',
  'customers', 'products', 'services',
  'debts', 'debt_items', 'payments',
  'inventory_movements', 'proforma_invoices', 'proforma_items',
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
  const tables: TableData[] = [];

  for (const table of DB_TABLES) {
    const result = await db.query<ExportRow>(`SELECT * FROM ${table} ORDER BY id`);
    tables.push({ name: table, rows: result.rows as ExportRow[] });
  }

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

  // Validate each table entry
  for (const t of obj.tables as TableData[]) {
    if (!t || typeof t.name !== 'string' || !Array.isArray(t.rows)) {
      throw new Error('Invalid backup file: malformed table entry');
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

// ── Restore (atomic with rollback) ────────────────────────

/**
 * Imports a validated snapshot and restores all table data atomically.
 * If any step fails, the database is rolled back to its pre-restore state.
 *
 * Strategy: dump current data to an in-memory snapshot, then attempt the
 * restore. On failure, re-insert the dumped data.
 */
export async function importDatabaseSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
  const db = getDb();

  // Build a map of table data from the snapshot for fast lookup
  const tableMap = new Map<string, TableData>();
  for (const t of snapshot.tables) {
    tableMap.set(t.name, t);
  }

  // Save current state for rollback
  const backupState: { table: string; rows: ExportRow[] }[] = [];
  for (const table of DB_TABLES) {
    const result = await db.query<ExportRow>(`SELECT * FROM ${table} ORDER BY id`);
    backupState.push({ table, rows: result.rows as ExportRow[] });
  }

  let restoreFailed = false;

  try {
    // Disable FK constraints during restore
    await db.query(`SET session_replication_role = 'replica'`);

    // Delete existing data in reverse dependency order
    const deleteOrder = [...DB_TABLES].reverse();
    for (const table of deleteOrder) {
      await db.query(`DELETE FROM ${table}`);
    }

    // Reset sequences
    for (const table of DB_TABLES) {
      try {
        await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
      } catch {
        // Some tables might not have an id sequence
      }
    }

    // Insert data in dependency (parent-before-child) order
    for (const table of DB_TABLES) {
      const tableData = tableMap.get(table);
      if (!tableData || tableData.rows.length === 0) continue;

      // Batch insert: build a single multi-row INSERT for performance
      const rows = tableData.rows;
      const columnNames = Object.keys(rows[0]);
      const colCount = columnNames.length;

      // Insert in batches of 50 rows to balance speed and parameter limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values: unknown[] = [];
        const placeholders: string[] = [];

        for (let r = 0; r < batch.length; r++) {
          const row = batch[r];
          const base = (r * colCount);
          const ph: string[] = [];
          for (let c = 0; c < colCount; c++) {
            ph.push(`$${base + c + 1}`);
            values.push(row[columnNames[c]]);
          }
          placeholders.push(`(${ph.join(', ')})`);
        }

        const sql = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES ${placeholders.join(', ')}`;
        await db.query(sql, values);
      }
    }
  } catch (err) {
    restoreFailed = true;
    // Rollback: restore the saved state
    try {
      const deleteOrder = [...DB_TABLES].reverse();
      for (const table of deleteOrder) {
        await db.query(`DELETE FROM ${table}`);
      }
      for (const table of deleteOrder) {
        try { await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`); } catch { /* no seq */ }
      }
      // Re-insert saved data in parent-before-child order
      for (const table of DB_TABLES) {
        const saved = backupState.find((s) => s.table === table);
        if (!saved || saved.rows.length === 0) continue;
        const columnNames = Object.keys(saved.rows[0]);
        const colCount = columnNames.length;
        const BATCH_SIZE = 50;
        for (let i = 0; i < saved.rows.length; i += BATCH_SIZE) {
          const batch = saved.rows.slice(i, i + BATCH_SIZE);
          const values: unknown[] = [];
          const placeholders: string[] = [];
          for (let r = 0; r < batch.length; r++) {
            const row = batch[r];
            const base = (r * colCount);
            const ph: string[] = [];
            for (let c = 0; c < colCount; c++) {
              ph.push(`$${base + c + 1}`);
              values.push(row[columnNames[c]]);
            }
            placeholders.push(`(${ph.join(', ')})`);
          }
          const sql = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES ${placeholders.join(', ')}`;
          await db.query(sql, values);
        }
      }
    } catch (rollbackErr) {
      // If rollback also fails, re-throw the original error with context
      throw new Error(
        `Restore failed and rollback also failed. Original error: ${err instanceof Error ? err.message : String(err)}. Rollback error: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`,
      );
    }
    throw new Error(
      `Restore failed — database was rolled back to its previous state. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    await db.query(`SET session_replication_role = 'origin'`);
  }

  if (restoreFailed) return;

  // Re-sync sequences to max(id) after successful restore
  for (const table of DB_TABLES) {
    try {
      const tableData = tableMap.get(table);
      if (tableData && tableData.rows.length > 0) {
        await db.query(
          `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
        );
      }
    } catch {
      // Table may not have an id sequence
    }
  }
}

// ── Public API: backup to file ────────────────────────────

/**
 * Saves a backup file to user-selected location.
 */
export async function backupToFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const snapshot = await exportDatabaseSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
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
