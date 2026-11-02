import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { HttpError } from '../http';

export async function readableBranch(user: UserRow, branchId: string) {
  const branch = await appDataSource.getRepository(BranchEntity).findOneBy({ id: branchId });
  if (!branch) throw new HttpError(404, 'İşletme bulunamadı.');
  let canRead = user.role === 'admin'
    || (user.role === 'sube' && branch.id === user.branchId && branch.companyId === user.companyId)
    || (user.role === 'merkez' && !!user.companyId && branch.centerCompanyId === user.companyId);
  if (canRead && user.role === 'merkez' && user.centerBranchAccess !== 'all') {
    const grants = await appDataSource.query('SELECT 1 FROM center_user_branches WHERE user_id=? AND branch_id=?', [user.id, branch.id]);
    canRead = grants.length > 0;
  }
  if (!canRead) throw new HttpError(403, 'Bu işletmeyi görüntüleme yetkiniz yok.');
  return branch;
}

// The authenticated super admin can manage every branch. Monitoring-center
// accounts remain read-only, regardless of which branch ID they submit.
export async function writableBranch(user: UserRow, branchId: string) {
  const branch = await readableBranch(user, branchId);
  if (user.role === 'admin') return branch;
  if (user.role !== 'sube' || branch.id !== user.branchId || branch.companyId !== user.companyId) {
    throw new HttpError(403, 'Merkez erişimi yalnızca görüntüleme amaçlıdır. İşletme kayıtları değiştirilemez.');
  }
  return branch;
}
