export type Role = 'admin' | 'employee';

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecurityQuestion {
  id: number;
  user_id: number;
  question: string;
}

export interface Session {
  userId: number;
  username: string;
  role: Role;
  full_name: string;
  loginAt: string;
}
