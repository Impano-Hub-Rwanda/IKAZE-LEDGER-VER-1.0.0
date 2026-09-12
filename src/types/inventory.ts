export type MovementType = 'in' | 'out' | 'adjust';

export interface InventoryMovement {
  id: number;
  product_id: number;
  user_id: number | null;
  movement_type: MovementType;
  quantity_change: number;
  reason: string | null;
  created_at: string;
  product_name?: string;
  user_name?: string;
}

export interface StockAdjustmentInput {
  product_id: number;
  movement_type: MovementType;
  quantity_change: number;
  reason: string;
}
