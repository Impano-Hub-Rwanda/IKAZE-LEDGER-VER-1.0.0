export interface Customer {
  id: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  tin_number: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInput = {
  full_name: string;
  phone: string;
  address: string;
  tin_number: string;
};
