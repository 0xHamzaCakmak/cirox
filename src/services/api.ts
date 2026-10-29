import type { Branch, Company, User, DailyRevenueRecord, ExpenseRecord, ExpenseCategory, Staff, StaffPaymentHistory, BankAccount, PaymentRecord } from '../types';

export interface BootstrapData { user: User; companies: Company[]; branches: Branch[]; bankAccounts?: BankAccount[]; payments?: PaymentRecord[]; managedUsers?: User[]; dailyRevenueRecords?: DailyRevenueRecord[];
  expenses?: ExpenseRecord[]; expenseCategories?: ExpenseCategory[]; staffList?: Staff[]; staffPayments?: StaffPaymentHistory[] }
export interface EstablishmentResult {
  centerCompanyId: string | null;
  companyId: string; branchId: string; userId: string; bootstrap: BootstrapData;
}
export interface CenterAccountInput {
  name: string; username: string; ownerName: string; ownerEmail: string; ownerPassword: string;
  ownerPhone: string; branchLimit: number; price: number;
  billingMethod: 'credit_card' | 'bank_transfer' | 'manual'; notes: string;
}
export interface CenterAccountResult { companyId: string; userId: string; bootstrap: BootstrapData }
export interface AdminBusinessAccount {
  id: string; name: string; kind: 'center' | 'business'; status: Company['subscription']['status'];
  ownerName: string; ownerEmail: string; ownerPhone: string; createdAt: string; branchLimit: number;
  branches: { id: string; name: string; city: string; district: string; centerCompanyId: string | null; centerName: string; status: string }[];
  users: { id: string; name: string; username: string | null; email: string; phone: string;
    role: 'merkez' | 'sube'; active: boolean; branchId: string | null; createdAt: string }[];
}
export interface BranchNotification {
  id: string; branchId: string; branchName: string; kind: string;
  tone: 'income' | 'expense' | 'info' | 'warning'; title: string; detail: string;
  amount: number | null; actorName: string; createdAt: string; read: boolean;
}
export interface BranchNotificationFeed { events: BranchNotification[]; unreadCount: number; latestId: string }
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
let sessionVersion = 0;
export function advanceSessionVersion() { sessionVersion++; }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const requestVersion = sessionVersion;
  const formData = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include',
      headers: body === undefined || formData ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamıyor. Backend bağlantısını kontrol edin.', 0);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (requestVersion === sessionVersion && ['AUTH_REQUIRED', 'AUTH_REVOKED'].includes(data?.code) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cirox:session-expired'));
  }
  if (!response.ok) throw new ApiError(data?.error || 'İşlem tamamlanamadı.', response.status);
  return data as T;
}
