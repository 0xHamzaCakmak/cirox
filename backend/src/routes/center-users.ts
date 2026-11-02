import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from '../database/entities';
import { hashPassword } from '../auth/password';
import { asyncRoute, HttpError } from '../http';

// Mounted after the admin router's authentication and admin checks.
export const centerUsersRouter = Router();
const fields = z.object({
  name: z.string().trim().min(1).max(128), username: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9_.-]+$/),
  email: z.string().trim().toLowerCase().email().max(128), phone: z.string().trim().max(32), active: z.boolean(),
  access: z.enum(['all', 'selected']), branchIds: z.array(z.string().uuid()).max(10000).refine(ids => new Set(ids).size === ids.length),
  newPassword: z.string().min(8).max(256).optional(),
}).strict();

centerUsersRouter.get('/centers/:centerId/users', asyncRoute(async (req, res) => {
  const centerId = z.string().uuid().parse(req.params.centerId);
  const center = await appDataSource.getRepository(CompanyEntity).findOneBy({ id: centerId, kind: 'center' });
  if (!center) throw new HttpError(404, 'Merkez bulunamadı.');
  const [users, branches, grants] = await Promise.all([
    appDataSource.getRepository(UserEntity).find({ where: { companyId: centerId, role: 'merkez' }, order: { createdAt: 'ASC', id: 'ASC' } }),
    appDataSource.getRepository(BranchEntity).find({ where: { centerCompanyId: centerId }, order: { name: 'ASC', id: 'ASC' } }),
    appDataSource.query(`SELECT g.user_id,g.branch_id FROM center_user_branches g JOIN users u ON u.id=g.user_id
      JOIN branches b ON b.id=g.branch_id WHERE u.company_id=? AND b.center_company_id=?`, [centerId, centerId]) as Promise<{ user_id: string; branch_id: string }[]>,
  ]);
  res.json({ center: { id: center.id, name: center.name },
    branches: branches.map(branch => ({ id: branch.id, name: branch.name, city: branch.city, district: branch.district })),
    users: users.map(user => ({ id: user.id, name: user.name, username: user.username || '', email: user.email, phone: user.phone,
      active: user.active, access: user.centerBranchAccess, branchIds: user.centerBranchAccess === 'all' ? branches.map(branch => branch.id) : grants.filter(grant => grant.user_id === user.id).map(grant => grant.branch_id) })),
  });
}));

const save = (creating: boolean) => asyncRoute(async (req, res) => {
  const centerId = z.string().uuid().parse(req.params.centerId);
  const parsed = fields.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Kullanıcı bilgilerini ve şube seçimlerini kontrol edin. Yeni şifre en az 8 karakter olmalıdır.');
  const input = parsed.data;
  if (creating && !input.newPassword) throw new HttpError(400, 'Yeni kullanıcı için şifre gerekli.');
  const userId = creating ? randomUUID() : z.string().uuid().parse(req.params.userId);
  const passwordHash = input.newPassword ? await hashPassword(input.newPassword) : undefined;
  await appDataSource.transaction(async manager => {
    const center = await manager.findOne(CompanyEntity, { where: { id: centerId, kind: 'center' }, lock: { mode: 'pessimistic_write' } });
    if (!center) throw new HttpError(404, 'Merkez bulunamadı.');
    const branches = await manager.find(BranchEntity, { where: { centerCompanyId: centerId }, lock: { mode: 'pessimistic_read' } });
    const allowed = new Set(branches.map(branch => branch.id));
    if (input.branchIds.some(id => !allowed.has(id))) throw new HttpError(400, 'Yalnızca bu merkeze bağlı işletmeler seçilebilir.');
    const current = creating ? null : await manager.findOne(UserEntity, { where: { id: userId, companyId: centerId, role: 'merkez' }, lock: { mode: 'pessimistic_write' } });
    if (!creating && !current) throw new HttpError(404, 'Merkez kullanıcısı bulunamadı.');
    const profile = { name: input.name, username: input.username, email: input.email, phone: input.phone, active: input.active, centerBranchAccess: input.access };
    if (creating) {
      await manager.insert(UserEntity, { ...profile, id: userId, companyId: centerId, branchId: null, role: 'merkez', title: `${center.name} Ortağı`.slice(0, 128), passwordHash: passwordHash! });
    } else {
      await manager.update(UserEntity, userId, { ...profile, ...(passwordHash ? { passwordHash } : {}) });
    }
    await manager.query('DELETE FROM center_user_branches WHERE user_id=?', [userId]);
    if (input.access === 'selected') {
      for (const branchId of input.branchIds) await manager.query('INSERT INTO center_user_branches (user_id,branch_id) VALUES (?,?)', [userId, branchId]);
    }
    if (!input.active || passwordHash && !creating) await manager.delete(SessionEntity, { userId });
  });
  res.status(creating ? 201 : 200).json({ userId });
});
centerUsersRouter.post('/centers/:centerId/users', save(true));
centerUsersRouter.post('/centers/:centerId/users/:userId', save(false));
