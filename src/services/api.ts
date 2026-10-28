import type { Branch, Company, User, DailyRevenueRecord, ExpenseRecord, ExpenseCategory, Staff, StaffPaymentHistory } from '../types';

export interface BootstrapData { user: User; companies: Company[]; branches: Branch[]; dailyRevenueRecords?: DailyRevenueRecord[];
  expenses?: ExpenseRecord[]; expenseCategories?: ExpenseCategory[]; staffList?: Staff[]; staffPayments?: StaffPaymentHistory[] }
export interface EstablishmentResult {
  centerCompanyId: string | null;
  companyId: string; branchId: string; userId: string; bootstrap: BootstrapData;
}
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
