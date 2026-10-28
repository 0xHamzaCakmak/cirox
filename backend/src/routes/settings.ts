import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, createSession } from '../auth/session';
import { hashPassword, verifyPassword } from '../auth/password';
import { appDataSource } from '../database/data-source';
import { BranchEntity, SessionEntity, UserEntity, type UserRow } from '../database/entities';
import { writableBranch } from '../services/branch-access';
import { bootstrapData } from '../services/bootstrap';
import { asyncRoute, HttpError } from '../http';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);
const businessSchema = z.object({
  legalName: z.string().trim().max(255), tradeRegisterNo: z.string().trim().max(64), taxOffice: z.string().trim().max(128),
  taxNumber: z.string().trim().regex(/^(?:\d{10,11})?$/), contactEmail: z.union([z.literal(''), z.email().max(128)]), phone: z.string().trim().max(32),
}).strict();
settingsRouter.post('/business', asyncRoute(async (req, res) => {
  const parsed = businessSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Şube bilgilerini kontrol edin. Vergi numarası boş veya 10–11 rakam, e-posta geçerli olmalıdır.');
  const user = res.locals.user as UserRow;
  if (!user.branchId) throw new HttpError(403, 'Şube hesabı gerekli.');
  const branch = await writableBranch(user, user.branchId);
  await appDataSource.getRepository(BranchEntity).update(branch.id, parsed.data);
  res.json({ bootstrap: await bootstrapData(user) });
}));
const profileSchema = z.object({
  name: z.string().trim().min(1).max(128), username: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9_.-]+$/),
  email: z.email().max(128).transform(value => value.toLowerCase()), phone: z.string().trim().max(32),
  currentPassword: z.string().min(1).max(256), newPassword: z.string().min(8).max(256).optional(),
}).strict();
settingsRouter.post('/profile', rateLimit({ windowMs: 15 * 60_000, limit: 20, legacyHeaders: false,
  message: { error: 'Çok fazla hesap güncelleme denemesi. Bir süre sonra tekrar deneyin.' } }), asyncRoute(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Ad, kullanıcı adı ve e-postayı kontrol edin. Yeni şifre en az 8 karakter olmalıdır.');
  const user = res.locals.user as UserRow;
  if (!user.branchId) throw new HttpError(403, 'Şube hesabı gerekli.');
  await writableBranch(user, user.branchId);
  const input = parsed.data;
  const updated = await appDataSource.transaction(async manager => {
    const repo = manager.getRepository(UserEntity);
    const current = await repo.createQueryBuilder('user').addSelect('user.passwordHash').where('user.id=:id', { id: user.id }).setLock('pessimistic_write').getOneOrFail();
    if (!await verifyPassword(input.currentPassword, current.passwordHash)) throw new HttpError(401, 'Mevcut şifre hatalı.');
    const changes = { name: input.name, username: input.username, email: input.email, phone: input.phone,
      ...(input.newPassword ? { passwordHash: await hashPassword(input.newPassword) } : {}) };
    await repo.update(current.id, changes);
    if (input.newPassword) await manager.getRepository(SessionEntity).delete({ userId: current.id });
    return { ...current, ...changes };
  });
  if (input.newPassword) await createSession(updated, req, res);
  res.json({ bootstrap: await bootstrapData(updated) });
}));
