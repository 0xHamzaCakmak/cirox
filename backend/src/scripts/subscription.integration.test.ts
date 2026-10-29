import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { CompanyEntity, UserEntity, BranchEntity, SessionEntity } from '../database/entities';
import { hashPassword } from '../auth/password';

test('only super admin can persist future-dated and trial subscriptions without affecting other accounts', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const tag = randomUUID().replaceAll('-', '').slice(0, 10), adminId = randomUUID(), password = 'LicenseTest-' + randomUUID();
  const companyIds: string[] = [], userIds = [adminId], branchIds: string[] = [];
  const request = (path: string, body?: unknown, cookie = '') => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (identifier: string) => { const response = await request('/auth/login', { identifier, password }); assert.equal(response.status, 200); return response.headers.get('set-cookie')!.split(';')[0]; };
  try {
    await appDataSource.getRepository(UserEntity).insert({ id: adminId, companyId: null, branchId: null, name: 'License Test Admin', email: `licenseadmin-${tag}@example.test`, passwordHash: await hashPassword(password), role: 'admin', title: 'Test', phone: '', active: true });
    const admin = await login(`licenseadmin-${tag}@example.test`);
    const createCenter = await request('/admin/centers', { name: 'License Center ' + tag, username: 'licensecenter' + tag, ownerName: 'Test Patron', ownerEmail: `licensecenter-${tag}@example.test`, ownerPassword: password, ownerPhone: '', branchLimit: 10, price: 0, billingMethod: 'manual', notes: '' }, admin);
    assert.equal(createCenter.status, 201);
    const center = await createCenter.json(); companyIds.push(center.companyId); userIds.push(center.userId);
    const createBranch = await request('/admin/establishments', { merkezOption: 'none', establishmentName: 'License Branch ' + tag, username: 'licensebranch' + tag, ownerName: 'Test Owner', ownerEmail: `licensebranch-${tag}@example.test`, ownerPassword: password }, admin);
    assert.equal(createBranch.status, 201);
    const branch = await createBranch.json(); companyIds.push(branch.companyId); userIds.push(branch.userId); branchIds.push(branch.branchId);
    const patron = await login('licensecenter' + tag), owner = await login('licensebranch' + tag);
    const url = `/admin/companies/${center.companyId}/subscription`;
    const input = { planName: 'Future License', price: 199.5, branchLimit: 50, billingMethod: 'bank_transfer', billingCycle: 'yearly', status: 'active', startDate: '2090-02-01', nextBillingDate: '2091-02-01' };
    assert.equal((await request(url, input)).status, 401);
    assert.equal((await request(url, input, patron)).status, 403);
    assert.equal((await request(url, input, owner)).status, 403);
    const unrelatedBefore = await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: branch.companyId });
    const saved = await request(url, input, admin); assert.equal(saved.status, 200);
    const savedData = await saved.json();
    const license = savedData.bootstrap.companies.find((company: { id: string }) => company.id === center.companyId).subscription;
    assert.equal(license.startDate, input.startDate); assert.equal(license.nextBillingDate, input.nextBillingDate);
    assert.equal(license.price, input.price); assert.equal(license.branchLimit, 50);
    const persisted = await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId });
    assert.equal(persisted.startDate, input.startDate); assert.equal(persisted.licensePrice, '199.50');
    for (const invalid of [{ startDate: '2090-02-30' }, { nextBillingDate: input.startDate }, { nextBillingDate: '2089-01-01' }, { price: -1 }, { price: 1.123 }, { branchLimit: 0 }, { branchLimit: 1.5 }, { role: 'admin' }]) {
      assert.equal((await request(url, { ...input, ...invalid }, admin)).status, 400);
    }
    assert.equal((await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId })).nextBillingDate, input.nextBillingDate);
    assert.equal((await request(`/admin/companies/${randomUUID()}/subscription`, input, admin)).status, 404);
    const trial = { ...input, status: 'trial', price: 0, startDate: '2090-03-01', nextBillingDate: '2090-03-08' };
    assert.equal((await request(url, trial, admin)).status, 200);
    const restored = await request('/auth/me', undefined, await login('licensecenter' + tag));
    assert.equal(restored.status, 200);
    const restoredTrial = (await restored.json()).companies[0].subscription;
    assert.equal(restoredTrial.status, 'trial'); assert.equal(restoredTrial.startDate, trial.startDate); assert.equal(restoredTrial.nextBillingDate, trial.nextBillingDate);
    assert.deepEqual(await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: branch.companyId }), unrelatedBefore);
    assert.equal((await request(`/admin/companies/${branch.companyId}/subscription`, { ...input, planName: 'Branch Plan' }, admin)).status, 200);
    assert.equal((await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: branch.companyId })).planName, 'Branch Plan');
  } finally {
    for (const userId of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companyIds) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await appDataSource.destroy();
  }
});
