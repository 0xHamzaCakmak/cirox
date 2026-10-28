import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { HttpError } from '../http';

export async function readableBranch(user: UserRow, branchId: string) {
  const branch = await appDataSource.getRepository(BranchEntity).findOneBy({ id: branchId });
  if (!branch) throw new HttpError(404, 'İşletme bulunamadı.');
  const canRead = user.role === 'admin'
    || (user.role === 'sube' && branch.id === user.branchId && branch.companyId === user.companyId)
    || (user.role === 'merkez' && !!user.companyId && branch.centerCompanyId === user.companyId);
  if (!canRead) throw new HttpError(403, 'Bu işletmeyi görüntüleme yetkiniz yok.');
  return branch;
}

// All upcoming branch finance mutations must use this guard. A monitoring center
// can never acquire write permission by passing an observed branch/company ID.
export async function writableBranch(user: UserRow, branchId: string) {
  const branch = await readableBranch(user, branchId);
  if (user.role !== 'sube' || branch.id !== user.branchId || branch.companyId !== user.companyId) {
    throw new HttpError(403, 'Merkez erişimi yalnızca görüntüleme amaçlıdır. İşletme kayıtları değiştirilemez.');
  }
  return branch;
}
