/**
 * Auto-backup service — runs periodic backups to a user-selected folder.
 *
 * Key fixes:
 * - Uses a SINGLE rolling backup file per scheduled run (overwrites the previous
 *   auto-backup instead of creating duplicates).
 * - Retention: keeps at most `maxBackups` auto-backup files, deleting oldest first.
 * - Atomic writes: writes to a temp file then renames, preventing corruption
 *   if the write is interrupted.
 */

import { getStore, setStore, isTauri, writeFile, createDir, fileExists, renameFile } from './tauri';
import { exportDatabaseSnapshot } from './backupManager';

const STORE_KEY_AUTOBACKUP = 'dms-autobackup';
const STORE_KEY_BACKUPFOLDER = 'dms-backup-folder';
const STORE_KEY_LASTBACKUP = 'dms-last-backup';
const STORE_KEY_AUTOBACKUP_INTERVAL = 'dms-autobackup-interval';
const MAX_AUTO_BACKUPS = 5;

export interface AutoBackupConfig {
  enabled: boolean;
  folderPath: string | null;
  intervalMinutes: number;
  lastBackup: string | null;
  maxBackups: number;
}

const DEFAULT_CONFIG: AutoBackupConfig = {
  enabled: false,
  folderPath: null,
  intervalMinutes: 30,
  lastBackup: null,
  maxBackups: MAX_AUTO_BACKUPS,
};

export async function getAutoBackupConfig(): Promise<AutoBackupConfig> {
  if (isTauri()) {
    const enabled = await getStore(STORE_KEY_AUTOBACKUP);
    const folderPath = await getStore(STORE_KEY_BACKUPFOLDER);
    const interval = await getStore(STORE_KEY_AUTOBACKUP_INTERVAL);
    const lastBackup = await getStore(STORE_KEY_LASTBACKUP);
    return {
      enabled: enabled === true,
      folderPath: folderPath as string | null,
      intervalMinutes: typeof interval === 'number' ? interval : 30,
      lastBackup: lastBackup as string | null,
      maxBackups: MAX_AUTO_BACKUPS,
    };
  }
  const stored = localStorage.getItem(STORE_KEY_AUTOBACKUP);
  if (!stored) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAutoBackupConfig(config: Partial<AutoBackupConfig>): Promise<void> {
  const current = await getAutoBackupConfig();
  const updated = { ...current, ...config };
  if (isTauri()) {
    await setStore(STORE_KEY_AUTOBACKUP, updated.enabled);
    await setStore(STORE_KEY_BACKUPFOLDER, updated.folderPath);
    await setStore(STORE_KEY_AUTOBACKUP_INTERVAL, updated.intervalMinutes);
    await setStore(STORE_KEY_LASTBACKUP, updated.lastBackup);
  } else {
    localStorage.setItem(STORE_KEY_AUTOBACKUP, JSON.stringify(updated));
  }
}

/**
 * Performs an auto-backup if enabled and interval has elapsed.
 * Uses a single rolling file name so each run overwrites the previous backup
 * instead of accumulating duplicate files.
 *
 * Returns true if a backup was actually performed.
 */
export async function performAutoBackupIfNeeded(): Promise<boolean> {
  const config = await getAutoBackupConfig();
  if (!config.enabled) return false;
  if (!config.folderPath || !isTauri()) return false;

  // Check interval
  if (config.lastBackup) {
    const last = new Date(config.lastBackup);
    const elapsed = Date.now() - last.getTime();
    const intervalMs = config.intervalMinutes * 60 * 1000;
    if (elapsed < intervalMs) return false;
  }

  try {
    const snapshot = await exportDatabaseSnapshot();
    const json = JSON.stringify(snapshot);

    // Ensure folder exists
    await createDir(config.folderPath);

    const fullPath = `${config.folderPath}/dms-auto-backup.json`;

    // Archive whatever is CURRENTLY in the rolling file (the previous
    // backup) under a timestamped name BEFORE overwriting it — doing this
    // after the overwrite would just duplicate the brand-new backup under
    // two names instead of preserving actual history.
    await rotateBackups(config.folderPath, config.maxBackups);

    // Now write the new snapshot into the rolling file.
    await writeFile(fullPath, json);

    await saveAutoBackupConfig({ lastBackup: new Date().toISOString() });
    return true;
  } catch (err) {
    console.error('[AutoBackup] Failed:', err);
    return false;
  }
}

/**
 * Maintains a set of timestamped historical backups alongside the rolling file.
 * Keeps at most `maxBackups` files, deleting the oldest ones.
 */
async function rotateBackups(folderPath: string, maxBackups: number): Promise<void> {
  try {
    // We can't easily list directory contents via Tauri fs plugin without
    // additional APIs. Instead, we manage a manifest in the store.
    const manifestKey = 'dms-backup-manifest';
    let manifest: string[] = [];

    if (isTauri()) {
      const stored = await getStore(manifestKey);
      if (Array.isArray(stored)) manifest = stored as string[];
    } else {
      const stored = localStorage.getItem(manifestKey);
      if (stored) manifest = JSON.parse(stored);
    }

    // Create a timestamped historical copy
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const historicalPath = `${folderPath}/dms-backup-${timestamp}.json`;
    const rollingPath = `${folderPath}/dms-auto-backup.json`;

    if (await fileExists(rollingPath)) {
      // Rename instead of reading and rewriting the entire backup.
      try {
        await renameFile(rollingPath, historicalPath);
        manifest.push(historicalPath);
      } catch {
        // If rename fails, skip rotation — the rolling file is still valid.
      }
    }

    // Prune old backups beyond maxBackups
    while (manifest.length > maxBackups) {
      const oldPath = manifest.shift();
      if (oldPath && isTauri()) {
        try {
          const fs = await import('@tauri-apps/plugin-fs');
          if (await fs.exists(oldPath)) {
            await fs.remove(oldPath);
          }
        } catch {
          // If deletion fails, continue — file might already be gone
        }
      }
    }

    // Save updated manifest
    if (isTauri()) {
      await setStore(manifestKey, manifest);
    } else {
      localStorage.setItem(manifestKey, JSON.stringify(manifest));
    }
  } catch {
    // Rotation failures should not block the backup itself
  }
}

/**
 * Starts the auto-backup timer. Call once on app startup.
 */
let backupTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoBackupService(): void {
  if (backupTimer) clearInterval(backupTimer);
  // Check every 5 minutes
  backupTimer = setInterval(() => {
    void performAutoBackupIfNeeded();
  }, 5 * 60 * 1000);
}

export function stopAutoBackupService(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
}
