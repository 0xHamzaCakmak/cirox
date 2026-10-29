import { Router } from 'express';
import { requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import type { UserRow } from '../database/entities';
import { readableBranch } from '../services/branch-access';
import { bootstrapData } from '../services/bootstrap';

export const branchesRouter = Router();
branchesRouter.use(requireAuth);
branchesRouter.use((req, res, next) => {
  if ((res.locals.user as UserRow).role === 'merkez' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next(new HttpError(403, 'Merkez erişimi yalnızca görüntüleme amaçlıdır.'));
    return;
  }
  next();
});
branchesRouter.get('/:branchId', asyncRoute(async (req, res) => {
  const user = res.locals.user as UserRow;
  const id = String(req.params.branchId);
  await readableBranch(user, id);
  const data = await bootstrapData(user);
  res.json({ branch: data.branches.find(branch => branch.id === id), readOnly: user.role === 'merkez' });
}));
