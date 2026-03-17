import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  inventory: { ar: 'المخازن والمنتجات', en: 'Inventory & Products' },
  purchases: { ar: 'المشتريات', en: 'Purchases' },
  sales: { ar: 'المبيعات', en: 'Sales' },
  currentStockSystem: { ar: 'المخزون الحالي (النظام)', en: 'Current Stock (System)' },
  actualQuantityInventory: { ar: 'الكمية الفعلية (الجرد)', en: 'Actual Quantity (Inventory)' },
  difference: { ar: 'الفرق', en: 'Difference' },
  approveInventoryResult: { ar: 'اعتماد نتيجة الجرد', en: 'Approve Inventory Result' },
  inventoryAdjustment: { ar: 'تسوية مخزنية', en: 'Inventory Adjustment' },
  in: { ar: 'في', en: 'in' },
  saving: { ar: 'جاري الحفظ...', en: 'Saving...' },
  saveStocktaking: { ar: 'حفظ نتائج الجرد', en: 'Save Stocktaking Results' },
  customers: { ar: 'العملاء', en: 'Customers' },
  suppliers: { ar: 'الموردين', en: 'Suppliers' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
  loginWithGoogle: { ar: 'تسجيل الدخول بواسطة جوجل', en: 'Login with Google' },
  welcome: { ar: 'مرحباً بك في نظام ERP', en: 'Welcome to ERP System' },
  totalSales: { ar: 'إجمالي المبيعات', en: 'Total Sales' },
  totalPurchases: { ar: 'إجمالي المشتريات', en: 'Total Purchases' },
  totalProducts: { ar: 'إجمالي المنتجات', en: 'Total Products' },
  activeCustomers: { ar: 'العملاء النشطين', en: 'Active Customers' },
  recentTransactions: { ar: 'أحدث العمليات', en: 'Recent Transactions' },
  add: { ar: 'إضافة', en: 'Add' },
  edit: { ar: 'تعديل', en: 'Edit' },
  delete: { ar: 'حذف', en: 'Delete' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  search: { ar: 'بحث...', en: 'Search...' },
  filter: { ar: 'تصفية', en: 'Filter' },
  name: { ar: 'الاسم', en: 'Name' },
  price: { ar: 'السعر', en: 'Price' },
  quantity: { ar: 'الكمية', en: 'Quantity' },
  category: { ar: 'الفئة', en: 'Category' },
  warehouse: { ar: 'المخزن', en: 'Warehouse' },
  status: { ar: 'الحالة', en: 'Status' },
  date: { ar: 'التاريخ', en: 'Date' },
  total: { ar: 'الإجمالي', en: 'Total' },
  actions: { ar: 'الإجراءات', en: 'Actions' },
  arabic: { ar: 'العربية', en: 'Arabic' },
  english: { ar: 'الإنجليزية', en: 'English' },
  egp: { ar: 'ج.م', en: 'EGP' },
  usd: { ar: 'دولار', en: 'USD' },
  notifications: { ar: 'التنبيهات', en: 'Notifications' },
  profile: { ar: 'الملف الشخصي', en: 'Profile' },
  viewInvoice: { ar: 'عرض الفاتورة', en: 'View Invoice' },
  newPurchase: { ar: 'فاتورة شراء جديدة', en: 'New Purchase' },
  newSale: { ar: 'فاتورة بيع جديدة', en: 'New Sale' },
  product: { ar: 'المنتج', en: 'Product' },
  cost: { ar: 'التكلفة', en: 'Cost' },
  discount: { ar: 'الخصم', en: 'Discount' },
  unit: { ar: 'الوحدة', en: 'Unit' },
  supplier: { ar: 'المورد', en: 'Supplier' },
  customer: { ar: 'العميل', en: 'Customer' },
  phone: { ar: 'الهاتف', en: 'Phone' },
  address: { ar: 'العنوان', en: 'Address' },
  balance: { ar: 'الرصيد', en: 'Balance' },
  stock: { ar: 'المخزون', en: 'Stock' },
  minStock: { ar: 'الحد الأدنى للمخزون', en: 'Min Stock' },
  description: { ar: 'الوصف', en: 'Description' },
  sku: { ar: 'رمز المنتج (SKU)', en: 'SKU' },
  stockValue: { ar: 'قيمة المخزون', en: 'Stock Value' },
  netProfit: { ar: 'صافي الربح', en: 'Net Profit' },
  salesLast7Days: { ar: 'المبيعات (آخر 7 أيام)', en: 'Sales (Last 7 Days)' },
  topProductsInStock: { ar: 'أعلى المنتجات في المخزن', en: 'Top Products in Stock' },
  allCategories: { ar: 'كل التصنيفات', en: 'All Categories' },
  addProduct: { ar: 'إضافة منتج', en: 'Add Product' },
  notSpecified: { ar: 'غير محدد', en: 'Not Specified' },
  editProduct: { ar: 'تعديل منتج', en: 'Edit Product' },
  productName: { ar: 'اسم المنتج', en: 'Product Name' },
  selectCategory: { ar: 'اختر التصنيف', en: 'Select Category' },
  selectUnit: { ar: 'اختر الوحدة', en: 'Select Unit' },
  piecesCount: { ar: 'عدد القطع', en: 'Pieces Count' },
  cartonPrice: { ar: 'سعر الكرتونة', en: 'Carton Price' },
  cartonCost: { ar: 'تكلفة الكرتونة', en: 'Carton Cost' },
  currentStock: { ar: 'المخزون الحالي', en: 'Current Stock' },
  saveProduct: { ar: 'حفظ المنتج', en: 'Save Product' },
  confirmDelete: { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete?' },
  saveSuccess: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully' },
  generalSettings: { ar: 'الإعدادات العامة', en: 'General Settings' },
  financialSettings: { ar: 'الإعدادات المالية', en: 'Financial Settings' },
  appName: { ar: 'نظام ERP المتكامل', en: 'Integrated ERP System' },
  loginPrompt: { ar: 'قم بتسجيل الدخول لإدارة أعمالك بكل سهولة واحترافية.', en: 'Login to manage your business easily and professionally.' },
  stocktaking: { ar: 'الجرد', en: 'Stocktaking' },
  searchSupplier: { ar: 'بحث عن مورد...', en: 'Search supplier...' },
  searchCustomer: { ar: 'بحث عن عميل...', en: 'Search customer...' },
  searchProduct: { ar: 'بحث عن منتج...', en: 'Search for product...' },
  itemsCount: { ar: 'عدد الأصناف', en: 'Items Count' },
  invoice: { ar: 'الفاتورة', en: 'Invoice' },
  newSupplier: { ar: 'مورد جديد', en: 'New Supplier' },
  newCustomer: { ar: 'عميل جديد', en: 'New Customer' },
  selectSupplier: { ar: 'اختر المورد', en: 'Select Supplier' },
  selectCustomer: { ar: 'اختر العميل', en: 'Select Customer' },
  selectProduct: { ar: 'اختر المنتج', en: 'Select Product' },
  selectWarehouse: { ar: 'اختر المخزن', en: 'Select Warehouse' },
  unitType: { ar: 'نوع الوحدة', en: 'Unit Type' },
  sellingPrice: { ar: 'سعر البيع', en: 'Selling Price' },
  newSellingPrice: { ar: 'سعر البيع الجديد', en: 'New Selling Price' },
  discountType: { ar: 'نوع الخصم', en: 'Discount Type' },
  fixed: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
  percentage: { ar: 'نسبة مئوية', en: 'Percentage' },
  grandTotal: { ar: 'الإجمالي النهائي', en: 'Grand Total' },
  uploadInvoice: { ar: 'رفع الفاتورة', en: 'Upload Invoice' },
  fileSizeLimit: { ar: 'حجم الملف يجب أن يكون أقل من 500 كيلوبايت', en: 'File size must be less than 500KB' },
  noInvoice: { ar: 'لا توجد فاتورة', en: 'No Invoice' },
  carton: { ar: 'كرتونة', en: 'Carton' },
  piece: { ar: 'قطعة', en: 'Piece' },
  kg: { ar: 'كجم', en: 'KG' },
  liter: { ar: 'لتر', en: 'Liter' },
  meter: { ar: 'متر', en: 'Meter' },
  box: { ar: 'صندوق', en: 'Box' },
  bag: { ar: 'كيس', en: 'Bag' },
  accounting: { ar: 'الحسابات والقيود', en: 'Accounting & Entries' },
  searchEntries: { ar: 'بحث في القيود...', en: 'Search entries...' },
  allTypes: { ar: 'كل الأنواع', en: 'All Types' },
  income: { ar: 'دخل', en: 'Income' },
  expense: { ar: 'مصروف', en: 'Expense' },
  addManualEntry: { ar: 'إضافة قيد يدوي', en: 'Add Manual Entry' },
  addAccountingEntry: { ar: 'إضافة قيد محاسبي', en: 'Add Accounting Entry' },
  saveEntry: { ar: 'حفظ القيد', en: 'Save Entry' },
  warehouses: { ar: 'المستودعات', en: 'Warehouses' },
  addWarehouse: { ar: 'إضافة مستودع', en: 'Add Warehouse' },
  warehouseName: { ar: 'اسم المستودع', en: 'Warehouse Name' },
  location: { ar: 'الموقع', en: 'Location' },
  saveWarehouse: { ar: 'حفظ المستودع', en: 'Save Warehouse' },
  printInvoice: { ar: 'طباعة الفاتورة', en: 'Print Invoice' },
  salesInvoice: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
  subtotal: { ar: 'المجموع الفرعي', en: 'Subtotal' },
  addQuickCustomer: { ar: 'إضافة عميل سريع', en: 'Add Quick Customer' },
  customerName: { ar: 'اسم العميل', en: 'Customer Name' },
  saveCustomer: { ar: 'حفظ العميل', en: 'Save Customer' },
  saveSettings: { ar: 'حفظ الإعدادات', en: 'Save Settings' },
  settingsSaved: { ar: 'تم حفظ الإعدادات بنجاح', en: 'Settings saved successfully' },
  somethingWentWrong: { ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.', en: 'Something went wrong. Please try again.' },
  permissionDenied: { ar: 'ليس لديك الصلاحيات الكافية للقيام بهذه العملية أو الوصول لهذه البيانات.', en: 'You do not have sufficient permissions for this operation or data access.' },
  errorOccurred: { ar: 'عذراً، حدث خطأ', en: 'Sorry, an error occurred' },
  reloadPage: { ar: 'إعادة تحميل الصفحة', en: 'Reload Page' },
  warehouseProducts: { ar: 'منتجات المخزن', en: 'Warehouse Products' },
  items: { ar: 'أصناف', en: 'Items' },
  totalValue: { ar: 'إجمالي القيمة', en: 'Total Value' },
  noProductsInWarehouse: { ar: 'لا توجد منتجات في هذا المخزن حالياً', en: 'No products in this warehouse currently' },
  customersManagement: { ar: 'إدارة العملاء', en: 'Customers Management' },
  addNewCustomer: { ar: 'إضافة عميل جديد', en: 'Add New Customer' },
  suppliersManagement: { ar: 'إدارة الموردين', en: 'Suppliers Management' },
  addNewSupplier: { ar: 'إضافة مورد جديد', en: 'Add New Supplier' },
  company: { ar: 'الشركة', en: 'Company' },
  taxId: { ar: 'الرقم الضريبي', en: 'Tax ID' },
  viewDetails: { ar: 'عرض التفاصيل', en: 'View Details' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  categories: { ar: 'التصنيفات', en: 'Categories' },
  allSuppliers: { ar: 'كل الموردين', en: 'All Suppliers' },
  allCustomers: { ar: 'كل العملاء', en: 'All Customers' },
  errorOpeningInvoice: { ar: 'حدث خطأ أثناء فتح الفاتورة.', en: 'Error opening invoice.' },
  fileTooLarge: { ar: 'حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 500 كيلوبايت لتتمكن من حفظه.', en: 'File too large. Please choose a file smaller than 500KB.' },
  fileReadFailed: { ar: 'فشل قراءة الملف المرفق. سيتم حفظ الفاتورة بدون المرفق.', en: 'Failed to read the attached file. The invoice will be saved without the attachment.' },
  purchaseFrom: { ar: 'شراء بضاعة من', en: 'Purchase goods from' },
  saleTo: { ar: 'بيع بضاعة لـ', en: 'Sale of goods to' },
  addItem: { ar: 'إضافة صنف', en: 'Add Item' },
  itemDiscount: { ar: 'خصم الصنف', en: 'Item Discount' },
  fixedAmount: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
  optional: { ar: 'اختياري', en: 'Optional' },
  savePurchase: { ar: 'حفظ المشتريات', en: 'Save Purchase' },
  saveSupplier: { ar: 'حفظ المورد', en: 'Save Supplier' },
  available: { ar: 'متاح', en: 'available' },
  saveSale: { ar: 'حفظ المبيعات', en: 'Save Sale' },
  unknownSupplier: { ar: 'مورد غير معروف', en: 'Unknown Supplier' },
  unknownCustomer: { ar: 'عميل غير معروف', en: 'Unknown Customer' },
  type: { ar: 'النوع', en: 'Type' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'ar';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, theme, setTheme }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
