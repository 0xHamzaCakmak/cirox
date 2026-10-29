import { appDataSource } from '../database/data-source';

export interface BankRow { id: string; bank_name: string; account_name: string; iban: string; branch_code: string; currency: string; notes: string; is_active: number; created_at: Date }
export interface PaymentRow { id: string; company_id: string; company_name: string; bank_account_id: string | null; bank_name: string | null; account_name: string | null; iban: string | null;
  amount: string; currency: string; method: 'bank_transfer' | 'credit_card' | 'manual'; paid_date: string; receipt_number: string; description: string;
  renew_license: number; renewed_until: string | null; recorded_by: string; recorded_by_name: string; client_request_id: string; created_at: Date }
export const paymentDto = (row: PaymentRow) => ({ id: row.id, companyId: row.company_id, companyName: row.company_name, date: row.paid_date,
  amount: Number(row.amount), method: row.method, status: 'success' as const, transactionId: 'TAH-' + row.id.slice(0, 8).toUpperCase(),
  invoiceNumber: row.receipt_number || 'TAH-' + row.id.slice(0, 8).toUpperCase(), description: row.description,
  bankAccountId: row.bank_account_id ?? undefined, bankName: row.bank_name ?? undefined, accountName: row.account_name ?? undefined, iban: row.iban ?? undefined,
  currency: row.currency, receiptNumber: row.receipt_number, recordedBy: row.recorded_by_name, renewedUntil: row.renewed_until, createdAt: row.created_at.toISOString() });

export async function adminFinanceData() {
  const [accounts, rows]: [BankRow[], PaymentRow[]] = await Promise.all([
    appDataSource.query('SELECT * FROM admin_bank_accounts ORDER BY created_at DESC,id'),
    appDataSource.query(`SELECT p.*,DATE_FORMAT(p.paid_date,'%Y-%m-%d') AS paid_date,DATE_FORMAT(p.renewed_until,'%Y-%m-%d') AS renewed_until,
      b.bank_name,b.account_name,b.iban FROM subscription_payments p LEFT JOIN admin_bank_accounts b ON b.id=p.bank_account_id
      ORDER BY p.paid_date DESC,p.created_at DESC,p.id`),
  ]);
  const sums = new Map<string, { cents: number; count: number }>();
  for (const row of rows) if (row.bank_account_id) {
    const total = sums.get(row.bank_account_id) || { cents: 0, count: 0 };
    total.cents += Math.round(Number(row.amount) * 100); total.count++; sums.set(row.bank_account_id, total);
  }
  return { payments: rows.map(paymentDto), bankAccounts: accounts.map(row => ({ id: row.id, bankName: row.bank_name, accountName: row.account_name,
    iban: row.iban, branchCode: row.branch_code, currency: row.currency, notes: row.notes, isActive: !!row.is_active,
    totalCollected: (sums.get(row.id)?.cents || 0) / 100, paymentCount: sums.get(row.id)?.count || 0, createdAt: row.created_at.toISOString() })) };
}

export function validTurkishIban(value: string) {
  if (!/^TR\d{24}$/.test(value)) return false;
  let remainder = 0;
  for (const character of value.slice(4) + '2927' + value.slice(2, 4)) remainder = (remainder * 10 + Number(character)) % 97;
  return remainder === 1;
}

export function nextLicenseDate(start: string, cycle: 'monthly' | 'yearly') {
  const date = new Date(start + 'T12:00:00Z');
  const year = date.getUTCFullYear() + (cycle === 'yearly' ? 1 : 0), month = date.getUTCMonth() + (cycle === 'monthly' ? 1 : 0);
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate()), 12)).toISOString().slice(0, 10);
}
