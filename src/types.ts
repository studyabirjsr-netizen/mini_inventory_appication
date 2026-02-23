export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiryDate: string | null;
  discount: number;
  available: boolean;
  discountedPrice: number;
}

export type TabType = 'dashboard' | 'all' | 'add' | 'bulk' | 'expiring' | 'reports';
