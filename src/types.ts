export interface Product {
  id?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  warehouseId: string;
  piecesPerCarton?: number;
  cartonPrice?: number;
  cartonCost?: number;
}

export interface Warehouse {
  id?: string;
  name: string;
  location?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  taxId?: string;
  address?: string;
}

export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  cost: number;
  discount?: number; // percentage
  unitType?: 'piece' | 'carton';
}

export interface Purchase {
  id?: string;
  supplierId: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  totalDiscount?: number; // percentage
  discountType?: 'percentage' | 'fixed';
  invoiceUrl?: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  unitType?: 'piece' | 'carton';
}

export interface Sale {
  id?: string;
  customerId: string;
  date: string;
  items: SaleItem[];
  total: number;
  discount?: number;
  tax?: number;
}

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
}

export interface Category {
  id?: string;
  name: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName?: string;
  isActive?: boolean;
  allowedScreens?: string[];
}

export interface SystemSettings {
  id?: string;
  companyName?: string;
  taxNumber?: string;
  taxRate?: number;
  invoiceHeader?: string;
  invoiceFooter?: string;
  primaryColor?: string;
}
