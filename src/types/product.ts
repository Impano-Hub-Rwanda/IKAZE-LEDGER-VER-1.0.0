export interface Product {
  id: number;
  name: string;
  model: string | null;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string | null;
  description: string | null;
  category: string | null;
  sku: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductInput = {
  name: string;
  model: string;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  unit: string;
  description: string;
  category: string;
  sku: string;
};

export type StockStatus = 'in' | 'low' | 'out';

export function getStockStatus(p: Pick<Product, 'stock_quantity' | 'low_stock_threshold'>): StockStatus {
  if (p.stock_quantity <= 0) return 'out';
  if (p.stock_quantity <= p.low_stock_threshold) return 'low';
  return 'in';
}
