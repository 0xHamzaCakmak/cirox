import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { appDataSource } from '../database/data-source';
import { CompanyEntity, type UserRow } from '../database/entities';
import { adminFinanceData, nextLicenseDate, validTurkishIban, type BankRow, type PaymentRow } from '../services/admin-finance';
import { bootstrapData } from '../services/bootstrap';

export const adminFinanceRouter = Router();
adminFinanceRouter.use(requireAuth, requireAdmin);
const bankSchema = z.object({ bankName: z.string().trim().min(1).max(128), accountName: z.string().trim().min(1).max(255),
  iban: z.string().transform(value => value.replace(/\s/g, '').toUpperCase()).refine(validTurkishIban),
  branchCode: z.string().trim().max(128).default(''), currency: z.literal('TRY').default('TRY'), notes: z.string().trim().max(1000).default('') }).strict();
adminFinanceRouter.get('/finance', asyncRoute(async (_req, res) => res.json(await adminFinanceData())));
adminFinanceRouter.post('/bank-accounts', asyncRoute(async (req, res) => {
  const parsed = bankSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Banka, hesap sahibi ve geçerli bir Türkiye IBAN numarası girin.');
  const input = parsed.data, id = randomUUID();
  try {
    await appDataSource.query('INSERT INTO admin_bank_accounts (id,bank_name,account_name,iban,branch_code,currency,notes,created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, input.bankName, input.accountName, input.iban, input.branchCode, input.currency, input.notes, (res.locals.user as UserRow).id]);
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY' || error?.driverError?.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Bu IBAN zaten kayıtlı.');
    throw error;
  }
  res.status(201).json({ id, bootstrap: await bootstrapData(res.locals.user as UserRow) });
}));
const paymentSchema = z.object({ companyId: z.string().uuid(), bankAccountId: z.string().uuid().nullable().default(null),
  amount: z.number().finite().positive().max(9999999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001),
  method: z.enum(['bank_transfer', 'credit_card', 'manual']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1970-01-01' && value <= new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  }), receiptNumber: z.string().trim().max(128).default(''), notes: z.string().trim().max(2000).default(''),
  renewLicense: z.boolean().default(true), clientRequestId: z.string().uuid() }).strict().refine(input => input.method === 'manual' || input.bankAccountId);
adminFinanceRouter.post('/collections', asyncRoute(async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Tutar pozitif ve en fazla iki ondalık basamaklı olmalı. Geçerli bir tahsilat tarihi ve banka hesabı seçin.');
  const input = parsed.data, actor = res.locals.user as UserRow;
  const paymentId = await appDataSource.transaction(async manager => {
    const company = await manager.findOne(CompanyEntity, { where: { id: input.companyId }, lock: { mode: 'pessimistic_write' } });
    if (!company) throw new HttpError(404, 'İşletme veya merkez hesabı bulunamadı.');
    const [existing]: PaymentRow[] = await manager.query(`SELECT *,DATE_FORMAT(paid_date,'%Y-%m-%d') AS paid_date FROM subscription_payments WHERE recorded_by=? AND client_request_id=? FOR UPDATE`, [actor.id, input.clientRequestId]);
    const bankId = input.method === 'manual' ? null : input.bankAccountId;
    if (existing) {
      if (existing.company_id !== input.companyId || existing.bank_account_id !== bankId || Number(existing.amount) !== input.amount || existing.method !== input.method || existing.paid_date !== input.date || existing.description !== input.notes || existing.receipt_number !== input.receiptNumber || !!existing.renew_license !== input.renewLicense) throw new HttpError(409, 'Bu tahsilat isteği farklı bilgilerle daha önce kaydedildi. Listeyi kontrol edin.');
      return existing.id;
    }
    if (bankId) {
      const [bank]: BankRow[] = await manager.query('SELECT * FROM admin_bank_accounts WHERE id=? FOR UPDATE', [bankId]);
      if (!bank || !bank.is_active || bank.currency !== 'TRY') throw new HttpError(400, 'Etkin bir TL banka hesabı seçin.');
    }
    let renewedUntil: string | null = null;
    if (input.renewLicense) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
      renewedUntil = nextLicenseDate([today, company.startDate, company.nextBillingDate].sort().at(-1)!, company.billingCycle);
      if (renewedUntil > '2100-12-31') throw new HttpError(400, 'Lisans bitiş tarihi desteklenen sınırı aşıyor.');
      await manager.update(CompanyEntity, company.id, { nextBillingDate: renewedUntil, status: 'active' });
    }
    const id = randomUUID();
    await manager.query(`INSERT INTO subscription_payments (id,company_id,company_name,bank_account_id,amount,currency,method,paid_date,receipt_number,description,renew_license,renewed_until,recorded_by,recorded_by_name,client_request_id) VALUES (?,?,?,?,?,'TRY',?,?,?,?,?,?,?,?,?)`,
      [id, company.id, company.name, bankId, input.amount.toFixed(2), input.method, input.date, input.receiptNumber, input.notes, input.renewLicense, renewedUntil, actor.id, actor.name, input.clientRequestId]);
    return id;
  });
  res.json({ paymentId, bootstrap: await bootstrapData(actor) });
}));
