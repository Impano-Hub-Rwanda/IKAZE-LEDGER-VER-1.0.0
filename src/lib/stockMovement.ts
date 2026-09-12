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
  /** When false, the caller owns the surrounding transaction. */
  manageTransaction?: boolean;
}): Promise<void> {
  const db = getDb();
  const { productId, userId, movementType, quantityChange, reason, manageTransaction = true } = params;
  if (!Number.isInteger(productId) || productId <= 0) throw new Error('Invalid product id');
  if (!Number.isInteger(quantityChange) || quantityChange === 0) throw new Error('Invalid stock change');
  if (!reason.trim()) throw new Error('Stock movement reason is required');
  if (manageTransaction) await db.query('BEGIN');
  try {
    const updated = await db.query<{ id: number }>(
      `UPDATE products
       SET stock_quantity = stock_quantity + $1, updated_at = now()
       WHERE id = $2 AND stock_quantity + $1 >= 0
       RETURNING id`,
      [quantityChange, productId],
    );
    if (!(updated.rows as { id: number }[])[0]) throw new Error('Insufficient stock or product not found');
    await db.query(
      'INSERT INTO inventory_movements (product_id, user_id, movement_type, quantity_change, reason) VALUES ($1, $2, $3, $4, $5)',
      [productId, userId, movementType, quantityChange, reason],
    );
    if (manageTransaction) await db.query('COMMIT');
  } catch (err) {
    if (manageTransaction) await db.query('ROLLBACK');
    throw err;
  }
}
