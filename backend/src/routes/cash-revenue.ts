import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { readableBranch, writableBranch } from '../services/branch-access';
import { banknoteSchema, banknoteTotal, cashDateSchema, cashEntries, countsOf, type CashEntryRow } from '../services/cash-revenue';
import { revenueRecords } from '../services/revenue';
import { recordBranchActivity } from '../services/notifications';

export const cashRevenueRouter = Router();
cashRevenueRouter.use(requireAuth);
cashRevenueRouter.get('/cash-entries', asyncRoute(async (req, res) => {
  const input = z.object({ branchId: z.string().uuid(), date: cashDateSchema }).strict().parse(req.query);
  await readableBranch(res.locals.user as UserRow, input.branchId);
  const [entries, records] = await Promise.all([cashEntries(input.branchId, input.date), revenueRecords([input.branchId])]);
  res.json({ entries, record: records.find(record => record.date === input.date) ?? null });
}));
const schema = z.object({ branchId: z.string().uuid(), date: cashDateSchema, banknotes: banknoteSchema, clientRequestId: z.string().uuid() }).strict();
cashRevenueRouter.post('/cash-entries', asyncRoute(async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Banknot adetleri 0–1.000.000 arasında tam sayı, tarih ise geçerli olmalıdır.');
  const input = parsed.data, amount = banknoteTotal(input.banknotes), actor = res.locals.user as UserRow;
  if (amount <= 0) throw new HttpError(400, 'En az bir banknot adedi girin.');
  const branch = await writableBranch(actor, input.branchId);
  const entryId = await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const [previous]: CashEntryRow[] = await manager.query(`SELECT *,DATE_FORMAT(record_date,'%Y-%m-%d') AS record_date FROM cash_revenue_entries WHERE branch_id=? AND client_request_id=? FOR UPDATE`, [branch.id, input.clientRequestId]);
    if (previous) {
      if (previous.actor_id !== actor.id || previous.kind !== 'banknotes' || previous.record_date !== input.date || JSON.stringify(banknoteSchema.parse(countsOf(previous))) !== JSON.stringify(input.banknotes)) throw new HttpError(409, 'Bu nakit giriş isteği farklı bilgilerle daha önce kaydedildi.');
      return previous.id;
    }
    const [existing]: { id: string; cash: string }[] = await manager.query('SELECT id,cash FROM daily_revenues WHERE branch_id=? AND date=? FOR UPDATE', [branch.id, input.date]);
    const cents = Math.round(Number(existing?.cash || 0) * 100) + amount * 100;
    if (cents > 99999999999) throw new HttpError(400, 'Günlük nakit tutarı izin verilen sınırı aşıyor.');
    const revenueId = existing?.id || randomUUID();
    if (existing) await manager.query('UPDATE daily_revenues SET cash=?,submitted_by=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?', [(cents / 100).toFixed(2), actor.id, revenueId]);
    else await manager.query(`INSERT INTO daily_revenues (id,company_id,branch_id,date,credit_card,cash,online,other,notes,submitted_by) VALUES (?,?,?,?,0,?,0,0,'',?)`, [revenueId, branch.companyId, branch.id, input.date, amount.toFixed(2), actor.id]);
    const id = randomUUID();
    await manager.query(`INSERT INTO cash_revenue_entries (id,revenue_id,company_id,branch_id,record_date,kind,amount,banknotes,actor_id,actor_name,client_request_id) VALUES (?,?,?,?,?,'banknotes',?,?,?,?,?)`,
      [id, revenueId, branch.companyId, branch.id, input.date, amount.toFixed(2), JSON.stringify(input.banknotes), actor.id, actor.name, input.clientRequestId]);
    await recordBranchActivity(manager, branch.id, actor, { kind: 'cash_banknotes_created', tone: 'income', title: 'Banknot sayımıyla nakit girişi eklendi', detail: `${input.date} tarihli nakit hasılatı.`, amount });
    return id;
  });
  const records = await revenueRecords([branch.id]);
  res.json({ entryId, record: records.find(record => record.date === input.date) });
}));
