import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response, CookieOptions } from 'express';
import { MoreThan } from 'typeorm';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity, type UserRow } from '../database/entities';
import { env } from '../config/env';
import { asyncRoute, HttpError } from '../http';

const cookieName = 'cirox_session';
const cookieOptions: CookieOptions = {
  httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax', path: '/api/v1',
};
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
function readToken(req: Request): string | undefined {
  const token = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export async function clearSession(req: Request, res: Response) {
  const token = readToken(req);
  if (token) await appDataSource.getRepository(SessionEntity).delete({ id: tokenHash(token) });
  res.clearCookie(cookieName, cookieOptions);
}
export async function createSession(user: UserRow, req: Request, res: Response) {
  const previous = readToken(req);
  if (previous) await appDataSource.getRepository(SessionEntity).delete({ id: tokenHash(previous) });
  const token = randomBytes(32).toString('base64url');
  const maxAge = env.sessionDays * 86400000;
  await appDataSource.getRepository(SessionEntity).insert({ id: tokenHash(token), userId: user.id, expiresAt: new Date(Date.now() + maxAge) });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge });
}
export async function assertActive(user: UserRow) {
  if (!user.active) throw new HttpError(403, 'Kullanıcı hesabı pasif.', 'AUTH_REVOKED');
  if (user.role === 'admin') return;
  const company = user.companyId ? await appDataSource.getRepository(CompanyEntity).findOneBy({ id: user.companyId }) : null;
  if (!company || company.status === 'passive') throw new HttpError(403, 'İşletme hesabı kullanıma kapalı.', 'AUTH_REVOKED');
  if (user.role === 'sube') {
    const branch = user.branchId ? await appDataSource.getRepository(BranchEntity).findOneBy({ id: user.branchId, companyId: company.id }) : null;
    if (!branch || branch.status === 'passive') throw new HttpError(403, 'Şube hesabı kullanıma kapalı.', 'AUTH_REVOKED');
  }
}
export const requireAuth = asyncRoute(async (req, res, next) => {
  const token = readToken(req);
  const session = token ? await appDataSource.getRepository(SessionEntity).findOneBy({ id: tokenHash(token), expiresAt: MoreThan(new Date()) }) : null;
  const user = session ? await appDataSource.getRepository(UserEntity).findOneBy({ id: session.userId }) : null;
  if (!user) throw new HttpError(401, 'Oturum açmanız gerekiyor.', 'AUTH_REQUIRED');
  await assertActive(user);
  res.locals.user = user;
  next();
});
export const requireAdmin = asyncRoute(async (_req, res, next) => {
  if ((res.locals.user as UserRow).role !== 'admin') throw new HttpError(403, 'Bu işlem için admin yetkisi gerekiyor.');
  next();
});
