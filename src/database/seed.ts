import type { PGlite } from '@electric-sql/pglite';

/**
 * Inserts default business settings row if the settings table is empty.
 */
export async function seedDefaultSettings(db: PGlite): Promise<void> {
  const result = await db.query<{ id: number }>(
    'SELECT id FROM settings LIMIT 1',
  );
  if (result.rows.length === 0) {
    await db.query(
      `INSERT INTO settings (business_name, currency)
       VALUES ('My Business', 'RWF')`,
    );
  }
}

/**
 * Returns true if at least one user account exists.
 * The app requires account setup on first launch.
 */
export async function hasAnyUser(db: PGlite): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM users',
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}
