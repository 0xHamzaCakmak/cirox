import { createHash, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/session';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { HttpError, asyncRoute } from '../http';
import { readableBranch, writableBranch } from '../services/branch-access';
import { expenseRecords, branchCategories } from '../services/expenses';
import type { ReceiptRow } from '../services/revenue';
import { bootstrapData } from '../services/bootstrap';

export const expensesRouter = Router();
expensesRouter.use(requireAuth);
const schema = z.object({
  branchId: z.string().uuid(), clientRequestId: z.string().uuid(), categoryId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T12:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1970-01-01' && value <= '2100-12-31';
  }), amount: z.number().finite().positive().max(9999999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001),
  vatRate: z.union([z.literal(0), z.literal(1), z.literal(10), z.literal(20)]), description: z.string().trim().max(5000),
  staffId: z.string().min(1).max(64).optional(), receiptNumber: z.string().trim().max(128).optional(), receiptIds: z.array(z.string().uuid()).max(8).default([]),
  paymentBasis: z.enum(['daily', 'monthly']).optional(), staffPaymentType: z.enum(['yevmiye', 'maas', 'avans', 'prim']).optional(),
});
expensesRouter.get('/expenses', asyncRoute(async (req, res) => {
  const id = z.string().uuid().parse(req.query.branchId); await readableBranch(res.locals.user as UserRow, id);
  res.json({ expenses: await expenseRecords([id]) });
}));
expensesRouter.post('/expenses', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body); const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, input.branchId);
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const id = await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const [existing]: { id: string; branch_id: string; request_hash: string; deleted_at: Date | null }[] = await manager.query('SELECT * FROM expenses WHERE client_request_id=?', [input.clientRequestId]);
    if (existing) {
      if (existing.branch_id !== branch.id || existing.request_hash !== hash || existing.deleted_at) throw new HttpError(409, 'Bu kayıt isteği daha önce kullanıldı. Yeni bir gider formu açın.');
      return existing.id;
    }
    const category = (await branchCategories(branch, manager)).find(category => category.id === input.categoryId);
    if (!category) throw new HttpError(400, 'Gider kalemi bu işletme için geçerli değil.');
    if (Number(category.is_active) === 0) throw new HttpError(400, 'Bu gider kalemi gizli. Önce Gider Kalemleri sayfasından etkinleştirin.');
    if (category.type === 'staff_based' && input.vatRate !== 0) throw new HttpError(400, 'Personel ödemelerinde KDV oranı sıfır olmalıdır.');
    if (category.type !== 'staff_based' && !input.receiptIds.length) throw new HttpError(400, 'Bu gider için fiş veya fatura fotoğrafı ekleyin.');
    let paidStaff: { full_name: string; daily_wage: string; monthly_salary: string } | undefined;
    if (input.staffId) {
      const [staff] = await manager.query('SELECT full_name,daily_wage,monthly_salary FROM staff WHERE id=? AND branch_id=? AND company_id=? AND status=?', [input.staffId, branch.id, branch.companyId, 'active']);
      if (!staff || category.type !== 'staff_based') throw new HttpError(400, 'Personel seçimi bu gider için geçerli değil.');
      paidStaff = staff;
    }
    if (!paidStaff && (input.paymentBasis || input.staffPaymentType)) throw new HttpError(400, 'Ödeme esası için personel seçmelisiniz.');
    if (new Set(input.receiptIds).size !== input.receiptIds.length) throw new HttpError(400, 'Aynı fotoğraf tekrar eklenemez.');
    for (const receiptId of input.receiptIds) {
      const [photo]: ReceiptRow[] = await manager.query('SELECT * FROM receipt_files WHERE id=? AND branch_id=? AND company_id=? FOR UPDATE', [receiptId, branch.id, branch.companyId]);
      if (!photo) throw new HttpError(403, 'Fotoğraf bu işletmeye ait değil.');
      if (photo.revenue_id || photo.expense_id) throw new HttpError(409, 'Fotoğraf başka bir kayda eklenmiş.');
    }
    const id = randomUUID();
    const basis = paidStaff ? input.paymentBasis ?? 'daily' : null;
    await manager.query(`INSERT INTO expenses (id,client_request_id,request_hash,company_id,branch_id,category_id,date,amount,vat_rate,description,receipt_number,staff_id,submitted_by,category_name_snapshot,category_type_snapshot,
      payment_basis,staff_payment_type,staff_name_snapshot,staff_daily_wage_snapshot,staff_monthly_salary_snapshot)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id, input.clientRequestId, hash, branch.companyId, branch.id, category.id, input.date, input.amount.toFixed(2), input.vatRate,
        input.description || category.name + ' harcaması', input.receiptNumber || null, input.staffId || null, user.id, category.name, category.type,
        basis, paidStaff ? input.staffPaymentType ?? (basis === 'monthly' ? 'maas' : 'yevmiye') : null, paidStaff?.full_name ?? null, paidStaff?.daily_wage ?? null, paidStaff?.monthly_salary ?? null]);
    for (const receiptId of input.receiptIds) await manager.query('UPDATE receipt_files SET expense_id=? WHERE id=?', [id, receiptId]);
    return id;
  });
  const bootstrap = await bootstrapData(user);
  res.status(201).json({ expense: bootstrap.expenses.find(expense => expense.id === id), bootstrap });
}));
expensesRouter.post('/expenses/:expenseId/delete', asyncRoute(async (req, res) => {
  const user = res.locals.user as UserRow;
  const [row]: { id: string; branch_id: string }[] = await appDataSource.query('SELECT id,branch_id FROM expenses WHERE id=?', [req.params.expenseId]);
  if (!row) throw new HttpError(404, 'Gider bulunamadı.');
  await writableBranch(user, row.branch_id);
  await appDataSource.query('UPDATE expenses SET deleted_at=CURRENT_TIMESTAMP(3),deleted_by=? WHERE id=? AND deleted_at IS NULL', [user.id, row.id]);
  res.json({ bootstrap: await bootstrapData(user) });
}));
