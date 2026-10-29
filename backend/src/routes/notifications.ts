import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/session';
import type { UserRow } from '../database/entities';
import { asyncRoute, HttpError } from '../http';
import { markNotificationsRead, notificationFeed } from '../services/notifications';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
const scopeSchema = z.object({ centerId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).strict();
function readScope(user: UserRow, query: unknown) {
  const scope = scopeSchema.parse(query);
  if (user.role !== 'admin' && (scope.centerId || scope.branchId)) throw new HttpError(403, 'Başka bir hesabın bildirimleri seçilemez.');
  return scope;
}
notificationsRouter.get('/', asyncRoute(async (req, res) => {
  const user = res.locals.user as UserRow;
  res.json(await notificationFeed(user, readScope(user, req.query)));
}));
notificationsRouter.post('/read', asyncRoute(async (req, res) => {
  const user = res.locals.user as UserRow;
  const scope = readScope(user, req.query);
  const { throughId } = z.object({ throughId: z.string().regex(/^\d{1,20}$/) }).strict().parse(req.body);
  await markNotificationsRead(user, throughId, scope);
  res.status(204).end();
}));
