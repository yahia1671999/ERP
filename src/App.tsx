/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  LogOut, 
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  X,
  Menu,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Truck,
  UserCircle,
  MapPin,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  where,
  query, 
  orderBy, 
  Timestamp,
  increment,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { auth, db, storage, handleFirestoreError, OperationType } from './firebase';
import { 
  Product, 
  Warehouse,
  Supplier, 
  Customer, 
  Purchase, 
  Sale, 
  Transaction, 
  UserProfile,
  UserPermissions,
  Category,
  SystemSettings
} from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const UNITS = ['قطعة', 'كجم', 'لتر', 'متر', 'صندوق', 'كيس', 'كرتونة'];

// --- Components ---

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if ((this as any).state.hasError) {
      let message = "حدث خطأ ما. يرجى المحاولة مرة أخرى.";
      try {
        const errInfo = JSON.parse((this as any).state.error?.message || "{}");
        if (errInfo.error && errInfo.error.includes("permission-denied")) {
          message = "ليس لديك الصلاحيات الكافية للقيام بهذه العملية أو الوصول لهذه البيانات.";
        }
      } catch (e) {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center" dir="rtl">
          <Card className="p-8 max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              إعادة تحميل الصفحة
            </Button>
          </Card>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm dark:bg-indigo-500 dark:hover:bg-indigo-600',
      secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600',
      outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700', className)} {...props}>
    {children}
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-400 dark:ring-offset-slate-900',
        className
      )}
      {...props}
    />
  )
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-900/60"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn("relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden dark:bg-slate-800", maxWidth)}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Modules ---

const Dashboard = ({ 
  products, 
  sales, 
  purchases, 
  transactions 
}: { 
  products: Product[], 
  sales: Sale[], 
  purchases: Purchase[], 
  transactions: Transaction[] 
}) => {
  const totalSales = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales]);
  const totalPurchases = useMemo(() => purchases.reduce((acc, p) => acc + p.total, 0), [purchases]);
  const totalStockValue = useMemo(() => products.reduce((acc, p) => acc + (p.stock * p.cost), 0), [products]);
  const netProfit = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return income - expense;
  }, [transactions]);

  const salesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    return last7Days.map(date => ({
      date: format(new Date(date), 'EEE', { locale: ar }),
      amount: sales
        .filter(s => s.date.startsWith(date))
        .reduce((acc, s) => acc + s.total, 0)
    }));
  }, [sales]);

  const stockData = useMemo(() => {
    return products
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5)
      .map(p => ({ name: p.name, stock: p.stock }));
  }, [products]);

  return (
    <div className="space-y-8" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي المبيعات</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalSales.toLocaleString()} ج.م</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي المشتريات</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalPurchases.toLocaleString()} ج.م</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">قيمة المخزون</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStockValue.toLocaleString()} ج.م</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">صافي الربح</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{netProfit.toLocaleString()} ج.م</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h4 className="text-base font-semibold text-slate-900 mb-6">المبيعات (آخر 7 أيام)</h4>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-base font-semibold text-slate-900 mb-6">أعلى المنتجات في المخزن</h4>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="stock"
                >
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

const InventoryModule = ({ products, warehouses, categories, canDo }: { products: Product[], warehouses: Warehouse[], categories: Category[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  useEffect(() => {
    if (editingProduct) {
      setSelectedUnit(editingProduct.unit);
    } else {
      setSelectedUnit('');
    }
  }, [editingProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (editingProduct) {
      if (!canDo('inventory', 'canEdit')) {
        alert('ليس لديك صلاحية التعديل');
        return;
      }
    } else {
      if (!canDo('inventory', 'canAdd')) {
        alert('ليس لديك صلاحية الإضافة');
        return;
      }
    }

    const data: any = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      cost: Number(formData.get('cost')),
      stock: Number(formData.get('stock')),
      unit: formData.get('unit') as string,
      warehouseId: formData.get('warehouseId') as string,
    };

    if (data.unit === 'كرتونة' || data.unit === 'صندوق') {
      data.piecesPerCarton = Number(formData.get('piecesPerCarton'));
      data.cartonPrice = Number(formData.get('cartonPrice'));
      data.cartonCost = Number(formData.get('cartonCost'));
    }

    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingProduct?.id ? `products/${editingProduct.id}` : 'products');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">المخازن والمنتجات</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث عن منتج..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">كل التصنيفات</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {canDo('inventory', 'canAdd') && (
            <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة منتج
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">المنتج</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">SKU</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التصنيف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">المخزن</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">سعر البيع</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التكلفة</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">المخزون</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {warehouses.find(w => w.id === product.warehouseId)?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{product.price.toLocaleString()} ج.م</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{product.cost.toLocaleString()} ج.م</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      product.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    )}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {canDo('inventory', 'canEdit') && (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}>
                          تعديل
                        </Button>
                      )}
                      {canDo('inventory', 'canDelete') && (
                        <Button variant="danger" size="sm" onClick={async () => {
                          if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                            try {
                              await deleteDoc(doc(db, 'products', product.id!));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, `products/${product.id}`);
                            }
                          }
                        }}>
                          حذف
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اسم المنتج</label>
            <Input name="name" defaultValue={editingProduct?.name} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">SKU</label>
              <Input name="sku" defaultValue={editingProduct?.sku} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">التصنيف</label>
              <select 
                name="category" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                defaultValue={editingProduct?.category}
                required
              >
                <option value="">اختر التصنيف</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">سعر البيع</label>
              <Input name="price" type="number" defaultValue={editingProduct?.price} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">التكلفة</label>
              <Input name="cost" type="number" defaultValue={editingProduct?.cost} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">المخزن</label>
              <select 
                name="warehouseId" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                defaultValue={editingProduct?.warehouseId}
                required
              >
                <option value="">اختر المخزن</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الوحدة</label>
              <select 
                name="unit" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                required
              >
                <option value="">اختر الوحدة</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {(selectedUnit === 'كرتونة' || selectedUnit === 'صندوق') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">عدد القطع</label>
                <Input name="piecesPerCarton" type="number" defaultValue={editingProduct?.piecesPerCarton} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">سعر الكرتونة</label>
                <Input name="cartonPrice" type="number" defaultValue={editingProduct?.cartonPrice} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">تكلفة الكرتونة</label>
                <Input name="cartonCost" type="number" defaultValue={editingProduct?.cartonCost} required />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">المخزون الحالي</label>
            <Input name="stock" type="number" defaultValue={editingProduct?.stock} required />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ المنتج</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const PurchasesModule = ({ purchases, suppliers, products, warehouses, canDo }: { purchases: Purchase[], suppliers: Supplier[], products: Product[], warehouses: Warehouse[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [items, setItems] = useState<{ 
    productId: string; 
    quantity: number; 
    cost: number; 
    discount: number;
    sellingPrice: number;
    warehouseId: string;
    unitType?: 'piece' | 'carton';
  }[]>([]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const supplier = suppliers.find(s => s.id === p.supplierId);
      const matchesSearch = supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           supplier?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !dateFilter || p.date.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  }, [purchases, suppliers, searchQuery, dateFilter]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, cost: 0, discount: 0, sellingPrice: 0, warehouseId: '', unitType: 'piece' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    const product = products.find(p => p.id === newItems[index].productId);
    if (product) {
      if (field === 'productId') {
        const isCarton = product.unit === 'كرتونة' || product.unit === 'صندوق';
        newItems[index].unitType = isCarton ? 'carton' : 'piece';
        newItems[index].cost = isCarton ? (product.cartonCost || product.cost) : product.cost;
        newItems[index].sellingPrice = isCarton ? (product.cartonPrice || product.price) : product.price;
        newItems[index].warehouseId = product.warehouseId;
      } else if (field === 'unitType') {
        newItems[index].cost = value === 'carton' ? (product.cartonCost || product.cost) : product.cost;
        newItems[index].sellingPrice = value === 'carton' ? (product.cartonPrice || product.price) : product.price;
      }
    }
    setItems(newItems);
  };

  const calculateItemTotal = (item: any) => {
    const base = item.quantity * item.cost;
    const discount = (base * (item.discount || 0)) / 100;
    return base - discount;
  };

  const calculateGrandTotal = () => {
    const subtotal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    if (discountType === 'percentage') {
      return subtotal - (subtotal * totalDiscount) / 100;
    }
    return subtotal - totalDiscount;
  };

  const handleOpenInvoice = (url: string) => {
    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (error) {
        console.error("Error opening base64 invoice:", error);
        alert("حدث خطأ أثناء فتح الفاتورة.");
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    let invoiceUrl = '';
    
    try {
      if (invoiceFile) {
        if (invoiceFile.size > 500 * 1024) {
          alert("حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 500 كيلوبايت لتتمكن من حفظه.");
          setIsUploading(false);
          return;
        }
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(invoiceFile);
          });
          invoiceUrl = await base64Promise;
        } catch (uploadError) {
          console.error("File read failed:", uploadError);
          alert("فشل قراءة الملف المرفق. سيتم حفظ الفاتورة بدون المرفق.");
        }
      }

      const grandTotal = calculateGrandTotal();
      const purchaseData: any = {
        supplierId: selectedSupplier,
        date: new Date().toISOString(),
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          discount: item.discount,
          unitType: item.unitType
        })),
        total: grandTotal,
        totalDiscount,
        discountType
      };

      if (invoiceUrl) {
        purchaseData.invoiceUrl = invoiceUrl;
      }

      const batch = writeBatch(db);
      
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, purchaseData);

      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        let stockAddition = item.quantity;
        let updateData: any = {
          warehouseId: item.warehouseId,
        };
        
        if (product && (product.unit === 'كرتونة' || product.unit === 'صندوق')) {
          if (item.unitType === 'piece') {
            stockAddition = item.quantity / (product.piecesPerCarton || 1);
            updateData.cost = item.cost;
            updateData.price = item.sellingPrice;
          } else {
            updateData.cartonCost = item.cost;
            updateData.cartonPrice = item.sellingPrice;
          }
        } else {
          updateData.cost = item.cost;
          updateData.price = item.sellingPrice;
        }
        
        updateData.stock = increment(stockAddition);
        
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, updateData);
      });

      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        date: new Date().toISOString(),
        description: `شراء بضاعة من ${suppliers.find(s => s.id === selectedSupplier)?.name}`,
        type: 'expense',
        amount: grandTotal,
        category: 'مشتريات'
      });

      await batch.commit();
      setIsModalOpen(false);
      setItems([]);
      setSelectedSupplier('');
      setTotalDiscount(0);
      setInvoiceFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchases');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      companyName: formData.get('companyName') as string,
      taxId: formData.get('taxId') as string,
      address: formData.get('address') as string,
    };

    try {
      const docRef = await addDoc(collection(db, 'suppliers'), data);
      setSelectedSupplier(docRef.id);
      setIsSupplierModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'suppliers');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">المشتريات</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث عن مورد..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Input 
            type="date"
            className="w-40"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            فاتورة شراء جديدة
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">المورد</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">عدد الأصناف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الإجمالي</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الفاتورة</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(purchase.date), 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {suppliers.find(s => s.id === purchase.supplierId)?.name || 'مورد غير معروف'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{purchase.items.length}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{purchase.total.toLocaleString()} ج.م</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {purchase.invoiceUrl ? (
                      <button 
                        onClick={() => handleOpenInvoice(purchase.invoiceUrl)} 
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        المرفق
                      </button>
                    ) : (
                      <span className="text-slate-400">لا يوجد</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <Button variant="outline" size="sm" onClick={() => setPurchaseToView(purchase)}>
                      عرض التفاصيل
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="فاتورة شراء جديدة" maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">المورد</label>
              <button 
                type="button" 
                onClick={() => setIsSupplierModalOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                مورد جديد
              </button>
            </div>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              required
            >
              <option value="">اختر المورد</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">الأصناف</h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 ml-1" />
                إضافة صنف
              </Button>
            </div>
            
            {items.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              const isCartonProduct = product && (product.unit === 'كرتونة' || product.unit === 'صندوق');
              
              return (
              <div key={index} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                <button type="button" onClick={() => removeItem(index)} className="absolute top-2 left-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm">
                  <X className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] text-slate-500">المنتج</label>
                    <select 
                      className="w-full h-9 rounded border border-slate-200 text-xs"
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      required
                    >
                      <option value="">اختر المنتج</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {isCartonProduct && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] text-slate-500">نوع الوحدة</label>
                      <select 
                        className="w-full h-9 rounded border border-slate-200 text-xs"
                        value={item.unitType || 'carton'}
                        onChange={(e) => updateItem(index, 'unitType', e.target.value)}
                      >
                        <option value="carton">كرتونة</option>
                        <option value="piece">قطعة</option>
                      </select>
                    </div>
                  )}
                  <div className={isCartonProduct ? "md:col-span-3 space-y-1" : "md:col-span-4 space-y-1"}>
                    <label className="text-[10px] text-slate-500">الكمية</label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className={isCartonProduct ? "md:col-span-3 space-y-1" : "md:col-span-4 space-y-1"}>
                    <label className="text-[10px] text-slate-500">التكلفة</label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs"
                      value={item.cost}
                      onChange={(e) => updateItem(index, 'cost', Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-500">خصم صنف (%)</label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] text-slate-500">سعر البيع الجديد</label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs"
                      value={item.sellingPrice}
                      onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-500">توجيه للمخزن</label>
                    <select 
                      className="w-full h-9 rounded border border-slate-200 text-xs"
                      value={item.warehouseId}
                      onChange={(e) => updateItem(index, 'warehouseId', e.target.value)}
                    >
                      <option value="">اختر المخزن</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )})}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">نوع خصم الفاتورة</label>
                <select 
                  className="w-full h-9 rounded border border-slate-200 text-xs"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                >
                  <option value="percentage">نسبة (%)</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">قيمة الخصم</label>
                <Input 
                  type="number" 
                  className="h-9 text-xs"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">الإجمالي النهائي:</span>
              <span className="text-xl font-bold text-indigo-600">
                {calculateGrandTotal().toLocaleString()} ج.م
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">رفع الفاتورة (اختياري)</label>
              <Input 
                type="file" 
                className="h-9 text-xs"
                accept="image/*,.pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={items.length === 0 || isUploading}>
              {isUploading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="إضافة مورد سريع">
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الاسم</label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اسم الشركة</label>
              <Input name="companyName" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الرقم الضريبي</label>
              <Input name="taxId" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">رقم الهاتف</label>
              <Input name="phone" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">العنوان</label>
            <Input name="address" />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ المورد</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!purchaseToView} onClose={() => setPurchaseToView(null)} title="تفاصيل فاتورة الشراء">
        {purchaseToView && (
          <div className="space-y-6" dir="rtl">
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">المورد</p>
                  <p className="font-semibold text-slate-900">{suppliers.find(s => s.id === purchaseToView.supplierId)?.name || 'مورد غير معروف'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">التاريخ</p>
                  <p className="font-semibold text-slate-900">{format(new Date(purchaseToView.date), 'yyyy/MM/dd HH:mm')}</p>
                </div>
              </div>
              
              <h4 className="font-semibold text-slate-900 mb-3">الأصناف</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 rounded-r-lg">المنتج</th>
                      <th className="py-2 px-3">الكمية</th>
                      <th className="py-2 px-3">التكلفة</th>
                      <th className="py-2 px-3">الخصم</th>
                      <th className="py-2 px-3 rounded-l-lg">المجموع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {purchaseToView.items.map((item, idx) => {
                      const base = item.quantity * item.cost;
                      const discountVal = (base * (item.discount || 0)) / 100;
                      const itemTotal = base - discountVal;
                      return (
                        <tr key={idx}>
                          <td className="py-2 px-3">{products.find(p => p.id === item.productId)?.name || 'منتج غير معروف'}</td>
                          <td className="py-2 px-3">{item.quantity} {item.unitType === 'carton' ? 'كرتونة' : 'قطعة'}</td>
                          <td className="py-2 px-3">{item.cost.toLocaleString()} ج.م</td>
                          <td className="py-2 px-3">{item.discount || 0}%</td>
                          <td className="py-2 px-3">{itemTotal.toLocaleString()} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
                {purchaseToView.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>خصم الفاتورة:</span>
                    <span>{purchaseToView.totalDiscount.toLocaleString()} {purchaseToView.discountType === 'percentage' ? '%' : 'ج.م'}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-slate-900">
                  <span>الإجمالي النهائي:</span>
                  <span>{purchaseToView.total.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setPurchaseToView(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SalesModule = ({ sales, customers, products, settings, canDo }: { sales: Sale[], customers: Customer[], products: Product[], settings: SystemSettings, canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; price: number; unitType?: 'piece' | 'carton' }[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate || 0);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

  useEffect(() => {
    if (isModalOpen && items.length === 0) {
      setTaxRate(settings.taxRate || 0);
    }
  }, [isModalOpen, settings.taxRate]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const matchesSearch = customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           customer?.phone?.includes(searchQuery);
      const matchesDate = !dateFilter || s.date.startsWith(dateFilter);
      return matchesSearch && matchesDate;
    });
  }, [sales, customers, searchQuery, dateFilter]);

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0, unitType: 'piece' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    const product = products.find(p => p.id === newItems[index].productId);
    if (product) {
      if (field === 'productId') {
        const isCarton = product.unit === 'كرتونة' || product.unit === 'صندوق';
        newItems[index].unitType = isCarton ? 'carton' : 'piece';
        newItems[index].price = isCarton ? (product.cartonPrice || product.price) : product.price;
      } else if (field === 'unitType') {
        newItems[index].price = value === 'carton' ? (product.cartonPrice || product.price) : product.price;
      }
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const afterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;
    
    const saleData = {
      customerId: selectedCustomer,
      date: new Date().toISOString(),
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        unitType: item.unitType
      })),
      total,
      discount,
      tax: taxAmount
    };

    try {
      const batch = writeBatch(db);
      
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, saleData);

      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        let stockDeduction = item.quantity;
        if (product && (product.unit === 'كرتونة' || product.unit === 'صندوق') && item.unitType === 'piece') {
          stockDeduction = item.quantity / (product.piecesPerCarton || 1);
        }
        
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, { stock: increment(-stockDeduction) });
      });

      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        date: new Date().toISOString(),
        description: `بيع بضاعة لـ ${customers.find(c => c.id === selectedCustomer)?.name}`,
        type: 'income',
        amount: total,
        category: 'مبيعات'
      });

      await batch.commit();
      setIsModalOpen(false);
      setItems([]);
      setSelectedCustomer('');
      setDiscount(0);
      setSaleToPrint({ id: saleRef.id, ...saleData });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
    };

    try {
      const docRef = await addDoc(collection(db, 'customers'), data);
      setSelectedCustomer(docRef.id);
      setIsCustomerModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'customers');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">المبيعات</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث عن عميل..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Input 
            type="date"
            className="w-40"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            فاتورة بيع جديدة
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">العميل</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">عدد الأصناف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الإجمالي</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(sale.date), 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {customers.find(c => c.id === sale.customerId)?.name || 'عميل غير معروف'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sale.items.length}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{sale.total.toLocaleString()} ج.م</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <Button variant="outline" size="sm" onClick={() => setSaleToPrint(sale)}>
                      عرض التفاصيل
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="فاتورة بيع جديدة" maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">العميل</label>
              <button 
                type="button" 
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                عميل جديد
              </button>
            </div>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
            >
              <option value="">اختر العميل</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">الأصناف</h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 ml-1" />
                إضافة صنف
              </Button>
            </div>
            
            {items.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              const isCartonProduct = product && (product.unit === 'كرتونة' || product.unit === 'صندوق');
              
              return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg relative">
                <button type="button" onClick={() => removeItem(index)} className="absolute top-2 left-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm md:hidden">
                  <X className="w-4 h-4" />
                </button>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] text-slate-500">المنتج</label>
                  <select 
                    className="w-full h-9 rounded border border-slate-200 text-xs"
                    value={item.productId}
                    onChange={(e) => updateItem(index, 'productId', e.target.value)}
                    required
                  >
                    <option value="">اختر المنتج</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} ({p.stock} متاح)
                      </option>
                    ))}
                  </select>
                </div>
                {isCartonProduct && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-500">نوع الوحدة</label>
                    <select 
                      className="w-full h-9 rounded border border-slate-200 text-xs"
                      value={item.unitType || 'carton'}
                      onChange={(e) => updateItem(index, 'unitType', e.target.value)}
                    >
                      <option value="carton">كرتونة</option>
                      <option value="piece">قطعة</option>
                    </select>
                  </div>
                )}
                <div className={isCartonProduct ? "md:col-span-2 space-y-1" : "md:col-span-3 space-y-1"}>
                  <label className="text-[10px] text-slate-500">الكمية</label>
                  <Input 
                    type="number" 
                    className="h-9 text-xs"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    max={product?.stock}
                    required
                  />
                </div>
                <div className={isCartonProduct ? "md:col-span-3 space-y-1" : "md:col-span-4 space-y-1"}>
                  <label className="text-[10px] text-slate-500">السعر</label>
                  <Input 
                    type="number" 
                    className="h-9 text-xs"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                    required
                  />
                </div>
                <div className="hidden md:flex md:col-span-1 items-center justify-center pb-2">
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">المجموع الفرعي:</span>
              <span className="text-lg font-medium text-slate-900">
                {items.reduce((acc, item) => acc + (item.quantity * item.price), 0).toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">الخصم (قيمة):</span>
              <Input 
                type="number" 
                className="w-32 text-left" 
                value={discount} 
                onChange={(e) => setDiscount(Number(e.target.value))} 
                min="0"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">الضريبة (%):</span>
              <Input 
                type="number" 
                className="w-32 text-left" 
                value={taxRate} 
                onChange={(e) => setTaxRate(Number(e.target.value))} 
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-4">
              <span className="text-slate-600">الإجمالي النهائي:</span>
              <span className="text-xl font-bold text-slate-900">
                {(() => {
                  const sub = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
                  const afterD = Math.max(0, sub - discount);
                  const tax = (afterD * taxRate) / 100;
                  return (afterD + tax).toLocaleString();
                })()} ج.م
              </span>
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={items.length === 0}>حفظ الفاتورة</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!saleToPrint} onClose={() => setSaleToPrint(null)} title="تفاصيل الفاتورة">
        {saleToPrint && (
          <div className="space-y-6">
            <div id="invoice-print-area" className="p-8 bg-white text-slate-900 border border-slate-200 rounded-lg" dir="rtl">
              {settings.invoiceHeader && (
                <div className="mb-6 pb-4 border-b border-slate-200 whitespace-pre-wrap text-center" style={{ color: settings.primaryColor || '#4f46e5' }}>
                  {settings.invoiceHeader}
                </div>
              )}
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold" style={{ color: settings.primaryColor || '#4f46e5' }}>فاتورة مبيعات</h2>
                {settings.companyName && <p className="text-lg font-semibold mt-2">{settings.companyName}</p>}
                {settings.taxNumber && <p className="text-sm text-slate-500">الرقم الضريبي: {settings.taxNumber}</p>}
                <p className="text-sm text-slate-500 mt-2">التاريخ: {format(new Date(saleToPrint.date), 'yyyy/MM/dd HH:mm')}</p>
                <p className="text-sm text-slate-500">العميل: {customers.find(c => c.id === saleToPrint.customerId)?.name}</p>
              </div>
              <table className="w-full mb-6 text-right">
                <thead>
                  <tr className="border-b" style={{ borderBottomColor: settings.primaryColor || '#4f46e5' }}>
                    <th className="py-2">المنتج</th>
                    <th className="py-2">الكمية</th>
                    <th className="py-2">السعر</th>
                    <th className="py-2">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {saleToPrint.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2">{products.find(p => p.id === item.productId)?.name}</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{item.price}</td>
                      <td className="py-2">{item.quantity * item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{(() => {
                    const sub = saleToPrint.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
                    return sub.toLocaleString();
                  })()} ج.م</span>
                </div>
                {saleToPrint.discount ? (
                  <div className="flex justify-between text-red-600">
                    <span>الخصم:</span>
                    <span>{saleToPrint.discount.toLocaleString()} ج.م</span>
                  </div>
                ) : null}
                {saleToPrint.tax ? (
                  <div className="flex justify-between text-slate-600">
                    <span>الضريبة:</span>
                    <span>{saleToPrint.tax.toLocaleString()} ج.م</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: settings.primaryColor || '#4f46e5' }}>
                  <span>الإجمالي:</span>
                  <span>{saleToPrint.total.toLocaleString()} ج.م</span>
                </div>
              </div>
              {settings.invoiceFooter && (
                <div className="mt-8 pt-4 border-t border-slate-200 whitespace-pre-wrap text-center text-sm text-slate-500">
                  {settings.invoiceFooter}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button 
                className="flex-1"
                onClick={() => {
                  const printContent = document.getElementById('invoice-print-area');
                  const windowPrint = window.open('', '', 'width=900,height=650');
                  if (windowPrint && printContent) {
                    windowPrint.document.write(`
                      <html dir="rtl">
                        <head>
                          <title>طباعة الفاتورة</title>
                          <style>
                            body { font-family: system-ui, sans-serif; padding: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: right; }
                            .text-center { text-align: center; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .font-bold { font-weight: bold; }
                            .text-lg { font-size: 1.125rem; }
                            .text-2xl { font-size: 1.5rem; }
                            .border-b { border-bottom: 1px solid #eee; }
                            .border-t { border-top: 1px solid #eee; }
                            .pb-4 { padding-bottom: 1rem; }
                            .pt-4 { padding-top: 1rem; }
                            .mb-6 { margin-bottom: 1.5rem; }
                            .mt-1 { margin-top: 0.25rem; }
                          </style>
                        </head>
                        <body>
                          ${printContent.innerHTML}
                        </body>
                      </html>
                    `);
                    windowPrint.document.close();
                    windowPrint.focus();
                    windowPrint.print();
                    windowPrint.close();
                  }
                }}
              >
                طباعة
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setSaleToPrint(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="إضافة عميل سريع">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الاسم</label>
            <Input name="name" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">رقم الهاتف</label>
            <Input name="phone" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">العنوان</label>
            <Input name="address" />
          </div>
          <div className="pt-4">
            <Button type="submit" variant="secondary" className="w-full">حفظ العميل</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const AccountingModule = ({ transactions, canDo }: { transactions: Transaction[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesDate = !dateFilter || t.date.startsWith(dateFilter);
      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchQuery, typeFilter, dateFilter]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      date: new Date().toISOString(),
      description: formData.get('description') as string,
      type: formData.get('type') as 'income' | 'expense',
      amount: Number(formData.get('amount')),
      category: formData.get('category') as string,
    };

    try {
      await addDoc(collection(db, 'transactions'), data);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">الحسابات والقيود</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث في القيود..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">كل الأنواع</option>
            <option value="income">دخل</option>
            <option value="expense">مصروف</option>
          </select>
          <Input 
            type="date"
            className="w-40"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {canDo('accounting', 'canAdd') && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة قيد يدوي
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الوصف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">التصنيف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((trans) => (
                <tr key={trans.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(trans.date), 'yyyy/MM/dd')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{trans.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{trans.category}</td>
                  <td className={cn(
                    'px-6 py-4 text-sm font-bold',
                    trans.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {trans.type === 'income' ? '+' : '-'}{trans.amount.toLocaleString()} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة قيد محاسبي">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الوصف</label>
            <Input name="description" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">النوع</label>
              <select name="type" className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                <option value="income">دخل (+)</option>
                <option value="expense">مصروف (-)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">المبلغ</label>
              <Input name="amount" type="number" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">التصنيف</label>
            <Input name="category" placeholder="رواتب، إيجار، مبيعات..." />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ القيد</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const WarehousesModule = ({ warehouses, products, canDo }: { warehouses: Warehouse[], products: Product[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      location: formData.get('location') as string,
    };

    try {
      await addDoc(collection(db, 'warehouses'), data);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'warehouses');
    }
  };

  const selectedWarehouseProducts = useMemo(() => {
    if (!selectedWarehouseId) return [];
    return products.filter(p => p.warehouseId === selectedWarehouseId);
  }, [products, selectedWarehouseId]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">هيكل المخازن</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة مخزن جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(w => (
          <Card 
            key={w.id} 
            className={cn(
              "p-6 cursor-pointer transition-all border-2",
              selectedWarehouseId === w.id ? "border-indigo-500 bg-indigo-50/30" : "border-transparent"
            )}
            onClick={() => setSelectedWarehouseId(selectedWarehouseId === w.id ? null : w.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-slate-400 font-mono">#{w.id?.slice(0, 6)}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{w.name}</h3>
            <p className="text-sm text-slate-500 flex items-center">
              <MapPin className="w-3 h-3 ml-1" />
              {w.location}
            </p>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedWarehouseId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  منتجات مخزن: {warehouses.find(w => w.id === selectedWarehouseId)?.name}
                </h3>
                <span className="text-sm text-slate-500">{selectedWarehouseProducts.length} صنف</span>
              </div>
              
              {selectedWarehouseProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">المنتج</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">SKU</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">المخزون</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">القيمة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWarehouseProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{product.sku}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{product.stock} {product.unit}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{(product.stock * product.cost).toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  لا توجد منتجات في هذا المخزن حالياً
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مخزن جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اسم المخزن</label>
            <Input name="name" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الموقع / العنوان</label>
            <Input name="location" required />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const StocktakingModule = ({ products, warehouses, canDo }: { products: Product[], warehouses: Warehouse[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [counts, setCounts] = useState<{ [productId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const warehouseProducts = useMemo(() => {
    if (!selectedWarehouseId) return [];
    return products.filter(p => p.warehouseId === selectedWarehouseId);
  }, [products, selectedWarehouseId]);

  const handleCountChange = (productId: string, value: number) => {
    setCounts(prev => ({ ...prev, [productId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedWarehouseId) return;
    if (!canDo('stocktaking', 'canAdd')) {
      alert('ليس لديك صلاحية إجراء الجرد');
      return;
    }
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      Object.entries(counts).forEach(([productId, count]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const productRef = doc(db, 'products', productId);
        batch.update(productRef, { stock: count });

        // Log the adjustment in transactions if there's a difference
        const currentStock = Number(product.stock);
        const newCount = Number(count);
        const diff = newCount - currentStock;
        if (diff !== 0) {
          const transRef = doc(collection(db, 'transactions'));
          batch.set(transRef, {
            date: timestamp,
            description: `تسوية مخزنية (جرد): ${product.name} في ${warehouses.find(w => w.id === selectedWarehouseId)?.name}`,
            type: diff > 0 ? 'income' : 'expense',
            amount: Math.abs(diff * Number(product.cost)),
            category: 'تسوية مخزنية'
          });
        }
      });

      await batch.commit();
      alert('تم تحديث المخزون بنجاح بناءً على الجرد');
      setCounts({});
      setSelectedWarehouseId('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الجرد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">عملية الجرد</h2>
      </div>

      <Card className="p-6">
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اختر المخزن للجرد</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setCounts({});
              }}
            >
              <option value="">اختر المخزن</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {selectedWarehouseId && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">المنتج</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">المخزون الحالي (النظام)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الكمية الفعلية (الجرد)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الفرق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseProducts.map((product) => {
                  const currentCount = counts[product.id!] ?? product.stock;
                  const diff = currentCount - product.stock;
                  
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.stock} {product.unit}</td>
                      <td className="px-6 py-4">
                        <Input 
                          type="number" 
                          className="w-32 h-9 text-sm"
                          value={currentCount}
                          onChange={(e) => handleCountChange(product.id!, Number(e.target.value))}
                        />
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-bold",
                        diff === 0 ? "text-slate-400" : diff > 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            {canDo('stocktaking', 'canAdd') && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || warehouseProducts.length === 0}
                className="px-8"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'اعتماد نتيجة الجرد'}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

const CustomersModule = ({ customers, canDo }: { customers: Customer[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    try {
      await addDoc(collection(db, 'customers'), data);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'customers');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">إدارة العملاء</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث عن عميل..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canDo('customers', 'canAdd') && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة عميل جديد
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الاسم</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">البريد الإلكتروني</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الهاتف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 font-medium">عرض التفاصيل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة عميل جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الاسم</label>
            <Input name="name" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">رقم الهاتف</label>
            <Input name="phone" />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SuppliersModule = ({ suppliers, canDo }: { suppliers: Supplier[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery)
    );
  }, [suppliers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      companyName: formData.get('companyName') as string,
      taxId: formData.get('taxId') as string,
      address: formData.get('address') as string,
    };

    try {
      await addDoc(collection(db, 'suppliers'), data);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'suppliers');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">إدارة الموردين</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث عن مورد..." 
              className="pr-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canDo('suppliers', 'canAdd') && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مورد جديد
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الاسم</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الشركة</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">البريد الإلكتروني</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الهاتف</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.companyName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 font-medium">عرض التفاصيل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مورد جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الاسم</label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اسم الشركة</label>
              <Input name="companyName" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الرقم الضريبي</label>
              <Input name="taxId" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">رقم الهاتف</label>
              <Input name="phone" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">العنوان</label>
            <Input name="address" />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


const CategoriesModule = ({ categories, canDo }: { categories: Category[], canDo: (s: string, a: 'canAdd' | 'canEdit' | 'canDelete') => boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
    };

    try {
      if (editingCategory?.id) {
        await updateDoc(doc(db, 'categories', editingCategory.id), data);
      } else {
        await addDoc(collection(db, 'categories'), data);
      }
      setIsModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingCategory?.id ? `categories/${editingCategory.id}` : 'categories');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">إدارة التصنيفات</h2>
        <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة تصنيف جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(c => (
          <Card key={c.id} className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-bold text-slate-900">{c.name}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(c); setIsModalOpen(true); }}>تعديل</Button>
              <Button variant="danger" size="sm" onClick={() => c.id && handleDelete(c.id)}>حذف</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اسم التصنيف</label>
            <Input name="name" defaultValue={editingCategory?.name} required />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SettingsModule = ({ settings, users }: { settings: SystemSettings, users: UserProfile[] }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<{ [screenId: string]: UserPermissions }>({});

  const availableScreens = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'inventory', label: 'المخزون' },
    { id: 'warehouses', label: 'المخازن' },
    { id: 'stocktaking', label: 'الجرد' },
    { id: 'purchases', label: 'المشتريات' },
    { id: 'sales', label: 'المبيعات' },
    { id: 'accounting', label: 'الحسابات' },
    { id: 'customers', label: 'العملاء' },
    { id: 'suppliers', label: 'الموردون' },
    { id: 'categories', label: 'التصنيفات' },
  ];

  useEffect(() => {
    if (editingUser) {
      setSelectedScreens(editingUser.allowedScreens || []);
      setUserPermissions(editingUser.permissions || {});
    } else {
      setSelectedScreens([]);
      setUserPermissions({});
    }
  }, [editingUser]);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get('companyName') as string,
      taxNumber: formData.get('taxNumber') as string,
      taxRate: Number(formData.get('taxRate')),
      invoiceHeader: formData.get('invoiceHeader') as string,
      invoiceFooter: formData.get('invoiceFooter') as string,
      primaryColor: formData.get('primaryColor') as string,
    };

    try {
      await setDoc(doc(db, 'settings', 'system'), data, { merge: true });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/system');
    }
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      displayName: formData.get('displayName') as string,
      role: formData.get('role') as string,
      isActive: formData.get('isActive') === 'true',
      allowedScreens: selectedScreens,
      permissions: userPermissions,
    };

    try {
      if (editingUser?.uid) {
        await updateDoc(doc(db, 'users', editingUser.uid), data);
      } else {
        // Use email as ID for new users added by admin, will be migrated to UID on login
        await setDoc(doc(db, 'users', data.email), data);
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingUser?.uid ? `users/${editingUser.uid}` : 'users');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">إعدادات النظام</h2>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap">
        <button
          className={cn("pb-3 px-1 border-b-2 font-medium text-sm transition-colors", activeTab === 'general' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          onClick={() => setActiveTab('general')}
        >
          الإعدادات العامة
        </button>
        <button
          className={cn("pb-3 px-1 border-b-2 font-medium text-sm transition-colors", activeTab === 'invoice' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          onClick={() => setActiveTab('invoice')}
        >
          تصميم الفواتير
        </button>
        <button
          className={cn("pb-3 px-1 border-b-2 font-medium text-sm transition-colors", activeTab === 'users' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          onClick={() => setActiveTab('users')}
        >
          المستخدمين والصلاحيات
        </button>
      </div>

      {activeTab === 'general' && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <input type="hidden" name="invoiceHeader" value={settings.invoiceHeader || ''} />
            <input type="hidden" name="invoiceFooter" value={settings.invoiceFooter || ''} />
            <input type="hidden" name="primaryColor" value={settings.primaryColor || '#4f46e5'} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اسم الشركة</label>
              <Input name="companyName" defaultValue={settings.companyName} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الرقم الضريبي</label>
              <Input name="taxNumber" defaultValue={settings.taxNumber} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">نسبة الضريبة الافتراضية (%)</label>
              <Input name="taxRate" type="number" step="0.01" defaultValue={settings.taxRate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">لغة النظام</label>
              <select 
                name="language" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                defaultValue={localStorage.getItem('language') || 'ar'}
                onChange={(e) => {
                  localStorage.setItem('language', e.target.value);
                  window.location.reload();
                }}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="pt-4">
              <Button type="submit">حفظ الإعدادات</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'invoice' && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <input type="hidden" name="companyName" value={settings.companyName || ''} />
            <input type="hidden" name="taxNumber" value={settings.taxNumber || ''} />
            <input type="hidden" name="taxRate" value={settings.taxRate || 0} />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">ترويسة الفاتورة (Header)</label>
              <textarea 
                name="invoiceHeader" 
                defaultValue={settings.invoiceHeader}
                className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="مثال: شركة الأمل للتجارة العامة..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">تذييل الفاتورة (Footer)</label>
              <textarea 
                name="invoiceFooter" 
                defaultValue={settings.invoiceFooter}
                className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="مثال: شكراً لتعاملكم معنا..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اللون الأساسي للفاتورة</label>
              <Input name="primaryColor" type="color" defaultValue={settings.primaryColor || '#4f46e5'} className="h-12 w-24 p-1" />
            </div>
            <div className="pt-4">
              <Button type="submit">حفظ تصميم الفاتورة</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مستخدم
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">الاسم</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">البريد الإلكتروني</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">الصلاحية</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">الحالة</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.displayName || 'غير محدد'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {u.role === 'admin' ? 'مدير نظام' : 'مستخدم'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", u.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                          {u.isActive !== false ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }}>تعديل</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}>
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الاسم</label>
            <Input name="displayName" defaultValue={editingUser?.displayName} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <Input name="email" type="email" defaultValue={editingUser?.email} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الصلاحية</label>
            <select 
              name="role" 
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue={editingUser?.role || 'user'}
            >
              <option value="user">مستخدم</option>
              <option value="admin">مدير نظام</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الحالة</label>
            <select 
              name="isActive" 
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue={editingUser?.isActive !== false ? 'true' : 'false'}
            >
              <option value="true">نشط</option>
              <option value="false">موقوف</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الشاشات والصلاحيات</label>
            <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-600">الشاشة</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 text-center">دخول</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 text-center">إضافة</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 text-center">تعديل</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {availableScreens.map(screen => (
                    <tr key={screen.id} className="hover:bg-white transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{screen.label}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedScreens.includes(screen.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScreens([...selectedScreens, screen.id]);
                              if (!userPermissions[screen.id]) {
                                setUserPermissions({
                                  ...userPermissions,
                                  [screen.id]: { canAdd: true, canEdit: true, canDelete: true }
                                });
                              }
                            } else {
                              setSelectedScreens(selectedScreens.filter(id => id !== screen.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!selectedScreens.includes(screen.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          checked={userPermissions[screen.id]?.canAdd || false}
                          onChange={(e) => {
                            setUserPermissions({
                              ...userPermissions,
                              [screen.id]: { ...userPermissions[screen.id], canAdd: e.target.checked }
                            });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!selectedScreens.includes(screen.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          checked={userPermissions[screen.id]?.canEdit || false}
                          onChange={(e) => {
                            setUserPermissions({
                              ...userPermissions,
                              [screen.id]: { ...userPermissions[screen.id], canEdit: e.target.checked }
                            });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!selectedScreens.includes(screen.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          checked={userPermissions[screen.id]?.canDelete || false}
                          onChange={(e) => {
                            setUserPermissions({
                              ...userPermissions,
                              [screen.id]: { ...userPermissions[screen.id], canDelete: e.target.checked }
                            });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">حفظ المستخدم</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'ar');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ensureUserProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          // Check if there's a profile with this email but different ID (e.g. email or random ID)
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            // Found a profile created by admin
            const existingDoc = querySnap.docs[0];
            const data = existingDoc.data();
            // Create new doc with UID as ID
            await setDoc(userRef, { ...data, uid: user.uid });
            // Delete old doc if it's not the same as the new one
            if (existingDoc.id !== user.uid) {
              await deleteDoc(existingDoc.ref);
            }
          } else {
            // Create new profile
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || '',
              role: 'user',
              isActive: false,
              allowedScreens: []
            });
          }
        } else {
          // Profile exists, update email/displayName if needed
          await updateDoc(userRef, {
            email: user.email,
            displayName: user.displayName || docSnap.data().displayName || ''
          });
        }
      } catch (err) {
        console.error("Error ensuring user profile:", err);
      }
    };
    
    ensureUserProfile();

    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name')), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'products'));

    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), orderBy('name')), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'suppliers'));

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('name')), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));

    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), orderBy('date', 'desc')), (snap) => {
      setPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'purchases'));

    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'transactions'));

    const unsubWarehouses = onSnapshot(query(collection(db, 'warehouses'), orderBy('name')), (snap) => {
      setWarehouses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'warehouses'));

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'categories'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (doc) => {
      if (doc.exists()) {
        setSettings({ id: doc.id, ...doc.data() } as SystemSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/system'));

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setIsUsersLoaded(true);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

    return () => {
      unsubProducts(); unsubSuppliers(); unsubCustomers(); unsubPurchases(); unsubSales(); unsubTransactions(); unsubWarehouses(); unsubCategories(); unsubSettings(); unsubUsers();
    };
  }, [user]);

  useEffect(() => {
    if (user && isUsersLoaded && users.length === 0) {
      setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'admin',
        displayName: user.displayName,
        isActive: true
      }).catch(err => console.error("Error creating initial admin:", err));
    }
  }, [user, isUsersLoaded, users.length]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => signOut(auth);

  const currentUserProfile = users.find(u => u.uid === user?.uid || u.email === user?.email);

  const canDo = (screenId: string, action: 'canAdd' | 'canEdit' | 'canDelete') => {
    if (currentUserProfile?.role === 'admin' || users.length === 0) return true;
    return currentUserProfile?.permissions?.[screenId]?.[action] === true;
  };

  const navItems = useMemo(() => {
    let items = [
      { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
      { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Inventory', icon: Package },
      { id: 'warehouses', label: language === 'ar' ? 'المخازن' : 'Warehouses', icon: MapPin },
      { id: 'stocktaking', label: language === 'ar' ? 'الجرد' : 'Stocktaking', icon: CheckCircle2 },
      { id: 'purchases', label: language === 'ar' ? 'المشتريات' : 'Purchases', icon: ShoppingCart },
      { id: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales', icon: TrendingUp },
      { id: 'accounting', label: language === 'ar' ? 'الحسابات' : 'Accounting', icon: DollarSign },
      { id: 'customers', label: language === 'ar' ? 'العملاء' : 'Customers', icon: UserCircle },
      { id: 'suppliers', label: language === 'ar' ? 'الموردون' : 'Suppliers', icon: Truck },
      { id: 'categories', label: language === 'ar' ? 'التصنيفات' : 'Categories', icon: Settings },
    ];

    if (currentUserProfile?.role !== 'admin' && users.length > 0) {
      items = items.filter(item => currentUserProfile?.allowedScreens?.includes(item.id));
    }

    if (currentUserProfile?.role === 'admin' || users.length === 0) {
      items.push({ id: 'settings', label: language === 'ar' ? 'إعدادات النظام' : 'Settings', icon: Settings });
    }
    
    return items;
  }, [currentUserProfile?.role, currentUserProfile?.allowedScreens, users.length, language]);

  // Ensure activeTab is valid
  useEffect(() => {
    if (navItems.length > 0 && !navItems.find(item => item.id === activeTab)) {
      setActiveTab(navItems[0].id);
    }
  }, [navItems, activeTab]);

  if (!user) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">نظام ERP المتكامل</h1>
              <p className="text-slate-500 mb-8">قم بتسجيل الدخول لإدارة أعمالك بكل سهولة واحترافية.</p>
              <Button onClick={handleLogin} className="w-full h-12 text-base">
                تسجيل الدخول بواسطة جوجل
              </Button>
            </Card>
          </motion.div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!isUsersLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-slate-500">جاري تحميل بيانات النظام...</div>
      </div>
    );
  }

  if (users.length > 0 && !currentUserProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">غير مصرح لك بالدخول</h2>
          <p className="text-slate-600 mb-6">حسابك غير مسجل في النظام. يرجى التواصل مع مدير النظام لإضافتك.</p>
          <Button onClick={handleLogout} className="w-full">
            تسجيل الخروج
          </Button>
        </Card>
      </div>
    );
  }

  if (currentUserProfile && currentUserProfile.isActive === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">حساب موقوف</h2>
          <p className="text-slate-600 mb-6">تم إيقاف حسابك من قبل مدير النظام.</p>
          <Button onClick={handleLogout} className="w-full">
            تسجيل الخروج
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar Overlay for mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden dark:bg-slate-900/60"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? 280 : (isSidebarOpen ? 280 : 80),
          x: isMobile ? (isSidebarOpen ? 0 : (language === 'ar' ? 280 : -280)) : 0
        }}
        className={cn(
          "fixed inset-y-0 z-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden",
          language === 'ar' ? "right-0 border-l" : "left-0 border-r"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {(isSidebarOpen || isMobile) && <span className="mx-3 font-bold text-slate-900 dark:text-white truncate">نظام ERP</span>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                'w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group',
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
              {(isSidebarOpen || isMobile) && <span className="mx-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(isSidebarOpen || isMobile) && <span className="mx-3 font-medium text-sm whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 transition-all duration-300 min-w-0',
        isMobile ? 'mx-0' : (isSidebarOpen ? (language === 'ar' ? 'mr-[280px]' : 'ml-[280px]') : (language === 'ar' ? 'mr-[80px]' : 'ml-[80px]'))
      )}>
        <header className="h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{user.displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-5 h-5 text-indigo-600" />
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} purchases={purchases} transactions={transactions} />}
              {activeTab === 'inventory' && <InventoryModule products={products} warehouses={warehouses} categories={categories} canDo={canDo} />}
              {activeTab === 'warehouses' && <WarehousesModule warehouses={warehouses} products={products} canDo={canDo} />}
              {activeTab === 'stocktaking' && <StocktakingModule products={products} warehouses={warehouses} canDo={canDo} />}
              {activeTab === 'purchases' && <PurchasesModule purchases={purchases} suppliers={suppliers} products={products} warehouses={warehouses} canDo={canDo} />}
              {activeTab === 'sales' && <SalesModule sales={sales} customers={customers} products={products} settings={settings} canDo={canDo} />}
              {activeTab === 'accounting' && <AccountingModule transactions={transactions} canDo={canDo} />}
              {activeTab === 'customers' && <CustomersModule customers={customers} canDo={canDo} />}
              {activeTab === 'suppliers' && <SuppliersModule suppliers={suppliers} canDo={canDo} />}
              {activeTab === 'categories' && <CategoriesModule categories={categories} canDo={canDo} />}
              {activeTab === 'settings' && (currentUserProfile?.role === 'admin' || users.length === 0) && <SettingsModule settings={settings} users={users} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
