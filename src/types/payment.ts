export type PaymentMethod = 'cash' | 'mobile_money' | 'bank' | 'other';

export interface Payment {
  id: number;
  debt_id: number;
  user_id: number;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  paid_at: string;
  created_at: string;
  customer_name?: string | null;
  user_name?: string | null;
  debt_total?: number;
  debt_paid?: number;
}

export interface PaymentInput {
  debt_id: number;
  amount: number;
  method: PaymentMethod;
  note: string;
  paid_at: string;
}
