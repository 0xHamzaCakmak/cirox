import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { UserEntity, type UserRow } from '../database/entities';
import { hashPassword, verifyPassword } from '../auth/password';
import { assertActive, clearSession, createSession, requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { bootstrapData } from '../services/bootstrap';

export const authRouter = Router();
const dummyHash = hashPassword('cirox-nonexistent-user-password');
const identifier = z.string().trim().min(1).max(128);
const loginSchema = z.object({
  identifier: identifier.optional(), email: identifier.optional(), username: identifier.optional(),
  password: z.string().min(1).max(256),
}).refine(input => input.identifier || input.email || input.username);
authRouter.post('/login', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi. Bir süre sonra tekrar deneyin.' },
}), asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const login = (input.identifier ?? input.username ?? input.email)!.toLowerCase();
  const user = await appDataSource.getRepository(UserEntity).createQueryBuilder('user')
    .addSelect('user.passwordHash').where(login.includes('@') ? 'user.email = :login' : 'user.username = :login', { login }).getOne();
  const matches = await verifyPassword(input.password, user?.passwordHash ?? await dummyHash);
  if (!user || !matches) throw new HttpError(401, 'Kullanıcı adı, e-posta veya şifre hatalı.');
  await assertActive(user);
  const data = await bootstrapData(user);
  await createSession(user, req, res);
  res.json(data);
}));
authRouter.get('/me', requireAuth, asyncRoute(async (_req, res) => {
  res.json(await bootstrapData(res.locals.user as UserRow));
}));
authRouter.post('/logout', asyncRoute(async (req, res) => {
  await clearSession(req, res);
  res.status(204).end();
}));
