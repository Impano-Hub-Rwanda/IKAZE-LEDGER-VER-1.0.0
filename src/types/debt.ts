export type DebtStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export interface DebtItem {
  id: number;
  debt_id: number;
  product_id: number | null;
  service_id: number | null;
  item_type: 'product' | 'service';
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Debt {
  id: number;
  customer_id: number;
  user_id: number;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  guarantor: string | null;
  status: DebtStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  items?: DebtItem[];
}

export interface DebtLineInput {
  product_id: number;
  service_id: number | null;
  item_type: 'product' | 'service';
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  available_stock: number;
}

export interface DebtInput {
  customer_id: number;
  due_date: string;
  guarantor: string;
  note: string;
  lines: DebtLineInput[];
}
