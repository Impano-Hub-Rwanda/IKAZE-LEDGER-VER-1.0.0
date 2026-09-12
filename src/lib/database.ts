import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../database/migrations';
import { seedDefaultSettings } from '../database/seed';

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export function getDb(): PGlite {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<PGlite> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const instance = new PGlite('idb://debt-management');
    await instance.waitReady;

    await runMigrations(instance);
    await seedDefaultSettings(instance);

    db = instance;
    return db;
  })();

  return initPromise;
}
