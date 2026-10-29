import { randomUUID, createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { readableBranch, writableBranch } from '../services/branch-access';
import { bootstrapData } from '../services/bootstrap';
import { calculateWages } from '../services/staff-wages';
import { staffRecords } from '../services/expenses';
import { recordBranchActivity } from '../services/notifications';

export const staffRouter = Router();
staffRouter.use(requireAuth);
const schema = z.object({
  branchId: z.string().uuid(), clientRequestId: z.string().uuid(), fullName: z.string().trim().min(1).max(128),
  role: z.string().trim().min(1).max(64), phone: z.string().trim().max(32).default(''),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T12:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }), salaryBasis: z.enum(['daily', 'monthly']), salaryAmount: z.number().finite().min(0).max(99999999.99)
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001),
});
staffRouter.get('/staff', asyncRoute(async (req, res) => {
  const branch = await readableBranch(res.locals.user as UserRow, z.string().uuid().parse(req.query.branchId));
  res.json({ staff: await staffRecords([branch.id]) });
}));
staffRouter.post('/staff', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body); const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, input.branchId);
  const wages = calculateWages(input.salaryBasis, input.salaryAmount);
  if (wages.monthlySalary > 99999999.99) throw new HttpError(400, 'Aylık ücret sınırı aşıldı.');
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const id = await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const [existing] = await manager.query('SELECT id,branch_id,request_hash FROM staff WHERE client_request_id=?', [input.clientRequestId]);
    if (existing) {
      if (existing.branch_id !== branch.id || existing.request_hash !== hash) throw new HttpError(409, 'Bu personel isteği farklı bilgilerle kullanıldı. Yeni form açın.');
      return existing.id as string;
    }
    const id = randomUUID();
    await manager.query(`INSERT INTO staff (id,company_id,branch_id,full_name,role,daily_wage,monthly_salary,status,phone,hire_date,salary_basis,client_request_id,request_hash)
      VALUES (?,?,?,?,?,?,?,'active',?,?,?,?,?)`, [id, branch.companyId, branch.id, input.fullName, input.role,
      wages.dailyWage.toFixed(2), wages.monthlySalary.toFixed(2), input.phone, input.hireDate, input.salaryBasis, input.clientRequestId, hash]);
    await recordBranchActivity(manager, branch.id, user, { kind: 'staff_created', tone: 'info', title: 'Personel eklendi', detail: `${input.fullName} · ${input.role}` });
    return id;
  });
  const bootstrap = await bootstrapData(user); res.status(201).json({ staff: bootstrap.staffList.find(person => person.id === id), bootstrap });
}));
staffRouter.post('/staff/:staffId/update', asyncRoute(async (req, res) => {
  const input = schema.omit({ branchId: true, clientRequestId: true }).parse(req.body);
  const [staff] = await appDataSource.query('SELECT * FROM staff WHERE id=?', [req.params.staffId]);
  if (!staff) throw new HttpError(404, 'Personel bulunamadı.');
  const user = res.locals.user as UserRow; await writableBranch(user, staff.branch_id);
  const wages = calculateWages(input.salaryBasis, input.salaryAmount);
  if (wages.monthlySalary > 99999999.99) throw new HttpError(400, 'Aylık ücret sınırı aşıldı.');
  await appDataSource.transaction(async manager => {
    await manager.query('SELECT id FROM staff WHERE id=? FOR UPDATE', [staff.id]);
    await manager.query('UPDATE staff SET full_name=?,role=?,phone=?,hire_date=?,salary_basis=?,daily_wage=?,monthly_salary=? WHERE id=?',
      [input.fullName, input.role, input.phone, input.hireDate, input.salaryBasis, wages.dailyWage.toFixed(2), wages.monthlySalary.toFixed(2), staff.id]);
    await recordBranchActivity(manager, staff.branch_id, user, { kind: 'staff_updated', tone: 'info', title: 'Personel bilgileri güncellendi', detail: input.fullName });
  });
  res.json({ bootstrap: await bootstrapData(user) });
}));
staffRouter.post('/staff/:staffId/status', asyncRoute(async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'passive']) }).parse(req.body);
  const [staff] = await appDataSource.query('SELECT * FROM staff WHERE id=?', [req.params.staffId]);
  if (!staff) throw new HttpError(404, 'Personel bulunamadı.');
  const user = res.locals.user as UserRow; await writableBranch(user, staff.branch_id);
  await appDataSource.transaction(async manager => {
    const [current] = await manager.query('SELECT status FROM staff WHERE id=? FOR UPDATE', [staff.id]);
    if (current.status === status) return;
    await manager.query('UPDATE staff SET status=? WHERE id=?', [status, staff.id]);
    await recordBranchActivity(manager, staff.branch_id, user, { kind: 'staff_status', tone: status === 'active' ? 'info' : 'warning',
      title: status === 'active' ? 'Personel aktifleştirildi' : 'Personel pasife alındı', detail: staff.full_name });
  });
  res.json({ bootstrap: await bootstrapData(user) });
}));
