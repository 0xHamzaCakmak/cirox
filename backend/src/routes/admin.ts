import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity, type UserRow } from '../database/entities';
import { hashPassword } from '../auth/password';
import { requireAdmin, requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { bootstrapData } from '../services/bootstrap';
import { recordBranchActivity } from '../services/notifications';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
const text = (max: number) => z.string().trim().min(1).max(max);
const username = z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9_.-]+$/);
const schema = z.object({
  merkezOption: z.enum(['existing', 'none']).default('none'), selectedCompanyId: z.string().trim().max(64).optional(),
  establishmentName: text(128), username: username.optional(), establishmentCode: username.optional(),
  city: z.string().trim().max(64).optional(), district: z.string().trim().max(64).optional(),
  sector: z.string().trim().max(128).optional(), ownerName: text(128),
  ownerEmail: z.string().trim().toLowerCase().email().max(128), ownerPassword: z.string().min(6).max(256),
  ownerPhone: z.string().trim().max(32).optional(), price: z.number().finite().min(0).max(9999999999.99).optional(),
  billingMethod: z.enum(['credit_card', 'bank_transfer', 'manual']).optional(), notes: z.string().max(5000).optional(),
  autoLaunch: z.boolean().optional(),
}).refine(input => input.username || input.establishmentCode, { message: 'Kullanıcı adı gerekli.' });

adminRouter.get('/tenants', asyncRoute(async (_req, res) => {
  res.json(await bootstrapData(res.locals.user as UserRow));
}));

adminRouter.get('/accounts', asyncRoute(async (_req, res) => {
  const [companies, branches, users] = await Promise.all([
    appDataSource.getRepository(CompanyEntity).find({ order: { createdAt: 'DESC', id: 'ASC' } }),
    appDataSource.getRepository(BranchEntity).find({ order: { name: 'ASC' } }),
    appDataSource.getRepository(UserEntity).find({ where: [{ role: 'merkez' }, { role: 'sube' }], order: { createdAt: 'ASC' } }),
  ]);
  const companyNames = new Map(companies.map(company => [company.id, company.name]));
  res.json({ accounts: companies.map(company => ({
    id: company.id, name: company.name, kind: company.kind, status: company.status,
    ownerName: company.ownerName, ownerEmail: company.ownerEmail, ownerPhone: company.ownerPhone,
    createdAt: company.createdAt.toISOString(), branchLimit: company.branchLimit,
    branches: branches.filter(branch => company.kind === 'center' ? branch.centerCompanyId === company.id : branch.companyId === company.id)
      .map(branch => ({ id: branch.id, name: branch.name, city: branch.city, district: branch.district,
        centerCompanyId: branch.centerCompanyId, centerName: branch.centerCompanyId ? companyNames.get(branch.centerCompanyId) ?? '' : '', status: branch.status })),
    users: users.filter(user => user.companyId === company.id).map(user => ({
      id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone,
      role: user.role, active: user.active, branchId: user.branchId, createdAt: user.createdAt.toISOString(),
    })),
  })) });
}));

const resetPasswordSchema = z.object({ newPassword: z.string().min(8).max(256) }).strict();
const accountProfileSchema = z.object({
  name: text(128), username, email: z.string().trim().toLowerCase().email().max(128),
  phone: z.string().trim().max(32), newPassword: z.string().min(8).max(256).optional(),
}).strict();
adminRouter.post('/users/:userId/profile', asyncRoute(async (req, res) => {
  const input = accountProfileSchema.parse(req.body);
  const passwordHash = input.newPassword ? await hashPassword(input.newPassword) : undefined;
  await appDataSource.transaction(async manager => {
    const user = await manager.findOne(UserEntity, { where: { id: String(req.params.userId) }, lock: { mode: 'pessimistic_write' } });
    if (!user) throw new HttpError(404, 'Kullanıcı bulunamadı.');
    if (user.role === 'admin') throw new HttpError(403, 'Bu alan yalnızca müşteri hesapları içindir.');
    await manager.update(UserEntity, user.id, { name: input.name, username: input.username, email: input.email, phone: input.phone,
      ...(passwordHash ? { passwordHash } : {}) });
    if (user.branchId) await recordBranchActivity(manager, user.branchId, res.locals.user as UserRow, {
      kind: 'profile_updated', tone: 'info', title: 'Kullanıcı bilgileri güncellendi', detail: 'Şube hesabının profil bilgileri süper admin tarafından güncellendi.',
    });
    if (passwordHash) await manager.delete(SessionEntity, { userId: user.id });
  });
  res.json({ bootstrap: await bootstrapData(res.locals.user as UserRow) });
}));
adminRouter.post('/users/:userId/reset-password', rateLimit({
  windowMs: 15 * 60_000, limit: 20, legacyHeaders: false,
  message: { error: 'Çok fazla şifre sıfırlama isteği. Bir süre sonra tekrar deneyin.' },
}), asyncRoute(async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Yeni şifre 8–256 karakter olmalıdır.');
  const userId = String(req.params.userId);
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await appDataSource.transaction(async manager => {
    const user = await manager.findOne(UserEntity, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
    if (!user) throw new HttpError(404, 'Kullanıcı bulunamadı.');
    if (user.role !== 'merkez' && user.role !== 'sube') throw new HttpError(403, 'Bu alandan yalnızca işletme ve merkez/patron hesaplarının şifresi sıfırlanabilir.');
    await manager.update(UserEntity, user.id, { passwordHash });
    await manager.delete(SessionEntity, { userId: user.id });
    if (user.branchId) await recordBranchActivity(manager, user.branchId, res.locals.user as UserRow, {
      kind: 'password_reset', tone: 'warning', title: 'Şube hesabının şifresi yenilendi', detail: 'Süper admin tarafından şifre sıfırlama işlemi yapıldı.',
    });
  });
  res.status(204).end();
}));

const centerSchema = z.object({
  name: text(128), username, ownerName: text(128),
  ownerEmail: z.string().trim().toLowerCase().email().max(128),
  ownerPassword: z.string().min(6).max(256), ownerPhone: z.string().trim().max(32).default(''),
  branchLimit: z.number().int().min(1).max(10000),
  price: z.number().finite().min(0).max(9999999999.99).default(0),
  billingMethod: z.enum(['credit_card', 'bank_transfer', 'manual']).default('bank_transfer'),
  notes: z.string().trim().max(5000).default(''),
}).strict();

adminRouter.post('/centers', asyncRoute(async (req, res) => {
  const input = centerSchema.parse(req.body);
  const passwordHash = await hashPassword(input.ownerPassword);
  const created = await appDataSource.transaction(async manager => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const next = new Date(today + 'T12:00:00Z');
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    const company = await manager.save(CompanyEntity, {
      id: randomUUID(), kind: 'center', name: input.name,
      code: 'C_' + randomUUID().replaceAll('-', '').slice(0, 28),
      sector: 'Restoran & Yeme-İçme', ownerName: input.ownerName,
      ownerEmail: input.ownerEmail, ownerPhone: input.ownerPhone,
      status: 'active', planTier: 'growth', planName: 'Merkez / Patron Lisansı',
      licensePrice: input.price.toFixed(2), billingCycle: 'yearly', billingMethod: input.billingMethod,
      branchLimit: input.branchLimit, startDate: today, nextBillingDate: next.toISOString().slice(0, 10),
      autoRenew: false, notes: input.notes || null,
    });
    const user = await manager.save(UserEntity, {
      id: randomUUID(), companyId: company.id, branchId: null, name: input.ownerName,
      email: input.ownerEmail, username: input.username, passwordHash, role: 'merkez',
      title: `${company.name} Patronu`.slice(0, 128), phone: input.ownerPhone, active: true,
    });
    return { companyId: company.id, userId: user.id };
  });
  res.status(201).json({ ...created, bootstrap: await bootstrapData(res.locals.user as UserRow) });
}));

adminRouter.post('/establishments', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const loginName = (input.username ?? input.establishmentCode)!;
  const centerId = input.merkezOption === 'existing' && input.selectedCompanyId ? input.selectedCompanyId : null;
  const passwordHash = await hashPassword(input.ownerPassword);
  const created = await appDataSource.transaction(async manager => {
    if (centerId) {
      const center = await manager.findOne(CompanyEntity, { where: { id: centerId, kind: 'center' }, lock: { mode: 'pessimistic_write' } });
      if (!center) throw new HttpError(404, 'Seçilen merkez bulunamadı.');
      if (center.status === 'passive') throw new HttpError(409, 'Pasif merkeze işletme bağlanamaz.');
      const count = await manager.count(BranchEntity, { where: { centerCompanyId: center.id } });
      if (count >= center.branchLimit) throw new HttpError(409, 'Merkezin şube limiti dolu.');
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const next = new Date(today + 'T12:00:00Z');
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    const company = await manager.save(CompanyEntity, {
      id: randomUUID(), kind: 'business', name: input.establishmentName,
      code: 'B_' + randomUUID().replaceAll('-', '').slice(0, 28),
      sector: input.sector || 'Restoran & Yeme-İçme', ownerName: input.ownerName,
      ownerEmail: input.ownerEmail, ownerPhone: input.ownerPhone ?? '',
      status: 'active', planTier: 'starter', planName: 'İşletme Lisansı',
      licensePrice: (input.price ?? 0).toFixed(2), billingCycle: 'yearly',
      billingMethod: input.billingMethod ?? 'bank_transfer', branchLimit: 1,
      startDate: today, nextBillingDate: next.toISOString().slice(0, 10),
      autoRenew: false, notes: input.notes || null,
    });
    const branch = await manager.save(BranchEntity, {
      id: randomUUID(), companyId: company.id, centerCompanyId: centerId,
      code: loginName.toUpperCase(),
      name: input.establishmentName, city: input.city ?? '', district: input.district ?? '',
      managerName: input.ownerName, phone: input.ownerPhone ?? '', status: 'active', royaltyRate: '0.00',
    });
    const user = await manager.save(UserEntity, {
      id: randomUUID(), companyId: company.id, branchId: branch.id, name: input.ownerName,
      email: input.ownerEmail, username: loginName, passwordHash, role: 'sube', title: `${branch.name} Sorumlusu`.slice(0, 128),
      phone: input.ownerPhone ?? '', active: true,
    });
    return { companyId: company.id, centerCompanyId: centerId, branchId: branch.id, userId: user.id };
  });
  res.status(201).json({ ...created, bootstrap: await bootstrapData(res.locals.user as UserRow) });
}));

adminRouter.post('/establishments/:branchId/center', asyncRoute(async (req, res) => {
  const { centerCompanyId } = z.object({ centerCompanyId: z.string().min(1).max(64).nullable() }).parse(req.body);
  const branchId = String(req.params.branchId);
  await appDataSource.transaction(async manager => {
    // Lock the destination before counting to serialize quota checks and provisioning.
    if (centerCompanyId) {
      const center = await manager.findOne(CompanyEntity, { where: { id: centerCompanyId, kind: 'center' }, lock: { mode: 'pessimistic_write' } });
      if (!center) throw new HttpError(404, 'Merkez bulunamadı.');
      if (center.status === 'passive') throw new HttpError(409, 'Merkez pasif.');
      const count = await manager.count(BranchEntity, { where: { centerCompanyId } });
      const current = await manager.findOneBy(BranchEntity, { id: branchId });
      if (current?.centerCompanyId !== centerCompanyId && count >= center.branchLimit) throw new HttpError(409, 'Merkezin şube limiti dolu.');
    }
    const branch = await manager.findOne(BranchEntity, { where: { id: branchId }, lock: { mode: 'pessimistic_write' } });
    if (!branch) throw new HttpError(404, 'İşletme bulunamadı.');
    await manager.update(BranchEntity, branch.id, { centerCompanyId });
  });
  res.json(await bootstrapData(res.locals.user as UserRow));
}));
