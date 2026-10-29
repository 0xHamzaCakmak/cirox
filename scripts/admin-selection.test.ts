import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminBranchOptions, adminCenters, adminSelectedBranch } from '../src/data/adminSelection';
import { resolvePageForRole } from '../src/data/pageAccess';
import type { Branch, Company } from '../src/types';

const branches = [
  { id: 'a', companyId: 'business-a', centerCompanyId: 'center-a' },
  { id: 'b', companyId: 'business-b', centerCompanyId: 'center-b' },
  { id: 'independent', companyId: 'business-c', centerCompanyId: null },
  { id: 'legacy', companyId: 'center-a', centerCompanyId: 'center-b' },
] as Branch[];

test('an empty center selection lists only independent branches', () => {
  assert.deepEqual(adminBranchOptions(branches, '').map(branch => branch.id), ['independent']);
  assert.equal(adminSelectedBranch(branches, '', ''), undefined, 'a placeholder must not auto-select the first branch');
});
test('center options exclude business license tenants', () => {
  assert.deepEqual(adminCenters([{ id: 'center-a', kind: 'center' }, { id: 'business-a', kind: 'business' }] as Company[])
    .map(company => company.id), ['center-a']);
});
test('center branches follow monitoring links, not business ownership', () => {
  assert.deepEqual(adminBranchOptions(branches, 'center-a').map(branch => branch.id), ['a']);
  assert.deepEqual(adminBranchOptions(branches, 'center-b').map(branch => branch.id), ['b', 'legacy']);
  assert.deepEqual(adminBranchOptions(branches, 'empty-center'), []);
});
test('switching center invalidates an old branch selection and never falls back to another branch', () => {
  assert.equal(adminSelectedBranch(branches, 'center-b', 'a'), undefined);
  assert.equal(adminSelectedBranch(branches, 'center-a', 'independent'), undefined);
  assert.equal(adminSelectedBranch(branches, 'center-a', ''), undefined);
  assert.equal(adminSelectedBranch(branches, 'center-a', 'a')?.companyId, 'business-a');
});
test('view selection does not grant customer accounts super admin features', () => {
  assert.equal(resolvePageForRole('admin', 'admin_businesses'), 'admin_businesses');
  assert.notEqual(resolvePageForRole('merkez', 'admin_businesses'), 'admin_businesses');
  assert.notEqual(resolvePageForRole('sube', 'admin_businesses'), 'admin_businesses');
});
