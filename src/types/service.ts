export type ServiceStatus = 'active' | 'inactive';

export interface Service {
  id: number;
  name: string;
  description: string | null;
  default_price: number;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export type ServiceInput = {
  name: string;
  description: string;
  default_price: number;
  status: ServiceStatus;
};
