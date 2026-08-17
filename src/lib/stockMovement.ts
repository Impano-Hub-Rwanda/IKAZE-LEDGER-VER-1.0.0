import { getDb } from './database';
import type { MovementType } from '../types';

/**
 * Adjusts a product's stock and records an inventory movement in one step.
 * Used by both the Inventory module (manual Stock In/Out) and the Debt module
 * (automatic stock changes) so stock and history always stay in sync.
 *
 * Wrapped in a transaction so stock and movement log never drift apart.
 */
export async function applyStockChange(params: {
  productId: number;
  userId: number | null;
  movementType: MovementType;
  /** Signed change: positive for in, negative for out. */
  quantityChange: number;
  reason: string;
}): Promise<void> {
  const db = getDb();
  const { productId, userId, movementType, quantityChange, reason } = params;
  await db.query('BEGIN');
  try {
    await db.query(
      'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now() WHERE id = $2',
      [quantityChange, productId],
    );
    await db.query(
      'INSERT INTO inventory_movements (product_id, user_id, movement_type, quantity_change, reason) VALUES ($1, $2, $3, $4, $5)',
      [productId, userId, movementType, quantityChange, reason],
    );
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}
