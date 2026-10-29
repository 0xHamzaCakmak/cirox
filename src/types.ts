export type UserRole = 'admin' | 'merkez' | 'sube';

export interface User {
  username?: string | null;
  centerCompanyId?: string | null;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  companyId?: string;
  companyName?: string;
  avatar?: string;
  title: string;
  password?: string;
  phone?: string;
}

export type BillingMethod = 'credit_card' | 'bank_transfer' | 'manual';
export type LicenseStatus = 'active' | 'passive' | 'trial' | 'past_due';
export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface CompanySubscription {
  planTier: PlanTier;
  planName: string;
  price: number; // Aylık/Dönemlik Lisans Ücreti (TRY)
  billingCycle: 'monthly' | 'yearly';
  billingMethod: BillingMethod; // 'credit_card' (Otomatik Çekim) | 'bank_transfer' (Merkezden Havale) | 'manual'
  status: LicenseStatus;
  branchLimit: number; // Max izin verilen şube sayısı
  startDate: string;
  nextBillingDate: string;
  daysRemaining: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  autoRenew: boolean;
  creditCardLast4?: string;
}

export interface PaymentRecord {
  bankAccountId?: string;
  bankName?: string;
  accountName?: string;
  iban?: string;
  currency?: string;
  receiptNumber?: string;
  recordedBy?: string;
  renewedUntil?: string | null;
  id: string;
  companyId: string;
  companyName: string;
  date: string;
  amount: number;
  method: BillingMethod;
  status: 'success' | 'pending' | 'failed';
  transactionId: string;
  invoiceNumber: string;
  description: string;
}

export interface BankAccount {
  id: string; bankName: string; accountName: string; iban: string; branchCode: string; currency: string;
  notes: string; isActive: boolean; totalCollected: number; paymentCount: number; createdAt: string;
}
export interface BankAccountInput { bankName: string; accountName: string; iban: string; branchCode: string; currency: 'TRY'; notes: string }
export interface CollectionOptions { date: string; bankAccountId: string | null; receiptNumber: string; renewLicense: boolean; clientRequestId: string }

export type SubscriptionUpdate = Pick<CompanySubscription, 'planName' | 'price' | 'branchLimit' | 'billingMethod' | 'billingCycle' | 'status' | 'startDate' | 'nextBillingDate'>;

export interface Company {
  kind?: 'center' | 'business';
  id: string;
  name: string; // İşletme Unvanı / Şirket Adı
  code: string; // Kısa Kod (Örn: ALG, KD, BL)
  sector: string; // Sektör (Örn: Restoran, Kafe, Döner Zinciri, Burger)
  ownerName: string; // Yetkili Adı
  ownerEmail: string;
  ownerPhone: string;
  taxNumber?: string;
  taxOffice?: string;
  branchesCount: number;
  ownedBranchesCount?: number;
  subscription: CompanySubscription;
  createdAt: string;
  notes?: string;
  loginPassword?: string;
}

export interface RevenueBreakdown {
  creditCard: number;
  cash: number;
  online: number;
  other: number;
}

export interface ExpenseBreakdown {
  personel: number;
  kasap: number;
  icecek: number;
  sebzeMeyve: number;
  temizlik: number;
  nakliye: number;
  kira: number;
  elektrik: number;
  diger: number;
}

// Future ŞubeSipariş module integration contract
export interface SubeSiparisIntegration {
  externalBranchId: string;
  externalOrderId?: string;
  orderDate?: string;
  productCost: number;       // Şubeye gönderilen ürün/maliyet
  returnedCost: number;      // İade edilen ürün/maliyet
  netProductCost: number;    // Net maliyet (productCost - returnedCost)
  expectedSalesAmount: number; // Beklenen ciro
  branchDebt: number;        // Şubenin merkeze borcu
  lastSyncTime?: string;
  varianceNote?: string;     // Sapma açıklaması (Zarar değil, iade veya analiz sapması)
}

export interface BranchSettings {
  legalName: string; tradeRegisterNo: string; taxOffice: string; taxNumber: string; contactEmail: string; phone: string;
}
export interface OwnProfileUpdate {
  name: string; username: string; email: string; phone: string; currentPassword: string; newPassword?: string;
}
export interface Branch {
  legalName?: string;
  tradeRegisterNo?: string;
  taxOffice?: string;
  taxNumber?: string;
  contactEmail?: string;
  username?: string;
  centerCompanyId?: string | null;
  centerName?: string;
  readOnly?: boolean;
  id: string;
  companyId: string;
  code: string;
  name: string;
  city: string;
  district: string;
  managerName: string;
  phone: string;
  status: 'active' | 'review' | 'passive';
  dailyRevenue: number;
  dailyExpense: number;
  netProfit: number;
  revenueBreakdown: RevenueBreakdown;
  expenseBreakdown: ExpenseBreakdown;
  staffCount: number;
  dailyTotalWage: number;    // Günlük toplam yevmiye
  monthlyStaffCost: number;  // Aylık tahmini personel maliyeti
  siparisIntegration: SubeSiparisIntegration;
  performanceScore: number;  // 1-100
  loginEmail?: string;
  loginPassword?: string;
}

export interface DailyRevenueRecord {
  cashExpected?: number;
  receipts?: ReceiptAttachment[];
  receiptIds?: string[];
  updatedAt?: string;
  id: string;
  companyId?: string;
  branchId: string;
  branchName: string;
  date: string;
  creditCard: number;
  cash: number;
  online: number;
  other: number;
  total: number;
  notes?: string;
  submittedBy: string;
  createdAt: string;
}

export type CashBanknotes = Record<5 | 10 | 20 | 50 | 100 | 200, number>;
export interface CashRevenueEntry {
  id: string; branchId: string; date: string; kind: 'banknotes' | 'manual_adjustment' | 'opening_balance';
  amount: number; banknotes: CashBanknotes | null; actorName: string; note: string; createdAt: string;
}

export interface ReceiptAttachment { id: string; url: string; fileName: string }

export interface ExpenseCategory {
  branchId?: string;
  isActive?: boolean;
  id: string;
  name: string;
  type: 'single' | 'staff_based'; // Tek tutar veya personel bazlı
  iconName: string;
  description: string;
  isSystem?: boolean;
  defaultVatRate?: number; // %1, %10, %20 vergi dengelemesi ve muhasebe için
}

export interface ExpenseRecord {
  paymentBasis?: 'daily' | 'monthly';
  staffPaymentType?: 'yevmiye' | 'maas' | 'avans' | 'prim';
  staffDailyWage?: number;
  staffMonthlySalary?: number;
  clientRequestId?: string;
  receipts?: ReceiptAttachment[];
  receiptIds?: string[];
  categoryType?: 'single' | 'staff_based';
  id: string;
  companyId?: string;
  branchId: string;
  branchName: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  staffId?: string;
  staffName?: string;
  createdAt: string;
  receiptNumber?: string;
  receiptImage?: string; // Fatura / Fiş görseli (Base64 data URL veya resim yolu)
  receiptFileName?: string;
  vatRate?: number; // İlgili harcamanın KDV oranı (%)
}

export interface Staff {
  salaryBasis?: 'daily' | 'monthly';
  clientRequestId?: string;
  id: string;
  companyId?: string;
  branchId: string;
  branchName: string;
  fullName: string;
  role: string; // Aşçı, Garson, Kasiyer, Barista, Kurye, Şef, vb.
  dailyWage: number;
  monthlySalary: number;
  status: 'active' | 'passive';
  phone: string;
  hireDate: string;
}

export interface StaffPaymentHistory {
  clientRequestId?: string;
  paymentBasis?: 'daily' | 'monthly';
  expenseId?: string;
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  date: string;
  amount: number;
  type: 'yevmiye' | 'avans' | 'maas' | 'prim';
  description: string;
}

export type BranchListSort = 'revenue-desc' | 'revenue-asc' | 'expense-desc' | 'expense-asc' | 'net-desc';

export type PageTab = 
  | 'admin_tenants'
  | 'admin_billing'
  | 'admin_branch_centers'
  | 'admin_center_create'
  | 'admin_establishment_create'
  | 'admin_businesses'
  | 'dashboard' 
  | 'branches' 
  | 'branch_detail' 
  | 'branch_transactions'
  | 'revenue_entry' 
  | 'expenses' 
  | 'expense_new'
  | 'expense_camera'
  | 'expense_accounting'
  | 'expense_categories' 
  | 'expense_category_new'
  | 'expense_category_edit'
  | 'staff' 
  | 'staff_new'
  | 'staff_edit'
  | 'staff_history'
  | 'staff_payment'
  | 'reports' 
  | 'settings';
