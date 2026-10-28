import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, UserEntity, type UserRow } from '../database/entities';
import { hashPassword } from '../auth/password';
import { requireAdmin, requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { bootstrapData } from '../services/bootstrap';

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
