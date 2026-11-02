import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { CompanyEntity, UserEntity, BranchEntity, SessionEntity } from '../database/entities';
import { hashPassword, verifyPassword } from '../auth/password';

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
    const businessFields = { legalName: 'Test Resmi Unvan', tradeRegisterNo: 'TEST-123', taxOffice: 'Çankaya', taxNumber: '1234567890', contactEmail: `contact-${tag}@example.test`, phone: '05321234567' };
    const account = {
      ...businessFields, name: 'Güncel İşletme ' + tag, sector: 'Kafe', ownerName: 'Yeni Yetkili',
      ownerEmail: `owner-${tag}@example.test`, ownerPhone: '05321112233', notes: 'Admin tarafından güncellendi',
      branches: [{ ...businessFields, id: branch.branchId, name: 'Yeni Şube Adı', city: 'Ankara', district: 'Çankaya', managerName: 'Yeni Sorumlu', status: 'active', centerCompanyId: center.companyId }],
      users: [{ id: branch.userId, name: 'Yeni Kullanıcı', username: 'edited' + tag, email: `edited-${tag}@example.test`, phone: '05329876543', title: 'Şube Yetkilisi', active: true, newPassword: 'UpdatedPassword-' + tag }],
    };
    const branchUrl = `/admin/companies/${branch.companyId}/subscription`;
    const before = await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: branch.companyId });
    // Invalid or unrelated targets must roll back the company and license edits too.
    assert.equal((await request(branchUrl, { ...input, account: { ...account, users: [{ ...account.users[0], id: center.userId }] } }, admin)).status, 400);
    assert.equal((await request(branchUrl, { ...input, account: { ...account, branches: [{ ...account.branches[0], id: randomUUID() }] } }, admin)).status, 400);
    assert.equal((await request(branchUrl, { ...input, account: { ...account, users: [{ ...account.users[0], role: 'admin' }] } }, admin)).status, 400);
    assert.equal((await request(branchUrl, { ...input, account: { ...account, users: [{ ...account.users[0], username: 'licensecenter' + tag }] } }, admin)).status, 409);
    assert.deepEqual(await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: branch.companyId }), before);
    const edited = await request(branchUrl, { ...input, account }, admin);
    assert.equal(edited.status, 200);
    const editedData = (await edited.json()).bootstrap;
    assert.equal(editedData.companies.find((item: { id: string }) => item.id === branch.companyId).name, account.name);
    const editedBranch = editedData.branches.find((item: { id: string }) => item.id === branch.branchId);
    assert.equal(editedBranch.name, 'Yeni Şube Adı'); assert.equal(editedBranch.city, 'Ankara'); assert.equal(editedBranch.district, 'Çankaya');
    assert.equal(editedBranch.centerCompanyId, center.companyId); assert.equal(editedBranch.legalName, businessFields.legalName);
    const storedUser = await appDataSource.getRepository(UserEntity).createQueryBuilder('user').addSelect('user.passwordHash').where('user.id=:id', { id: branch.userId }).getOneOrFail();
    assert.equal(storedUser.username, account.users[0].username); assert.equal(storedUser.name, account.users[0].name);
    assert.equal(await verifyPassword(account.users[0].newPassword, storedUser.passwordHash), true);
    assert.equal((await request('/auth/me', undefined, owner)).status, 401, 'password change revokes existing sessions');
    const relogin = await request('/auth/login', { identifier: account.users[0].username, password: account.users[0].newPassword });
    assert.equal(relogin.status, 200);
    assert.equal((await relogin.json()).user.branchName, 'Yeni Şube Adı');
    const centerAccount = { ...account, name: 'Güncel Merkez', branches: [], users: [{ ...account.users[0], id: center.userId, username: 'editedcenter' + tag, email: `editedcenter-${tag}@example.test`, newPassword: undefined }] };
    assert.equal((await request(url, { ...input, account: centerAccount }, admin)).status, 200);
    assert.equal((await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId })).name, 'Güncel Merkez');
    const unchangedPassword = await appDataSource.getRepository(UserEntity).createQueryBuilder('user').addSelect('user.passwordHash').where('user.id=:id', { id: center.userId }).getOneOrFail();
    assert.equal(await verifyPassword(password, unchangedPassword.passwordHash), true, 'blank new password preserves password');
  } finally {
    for (const userId of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companyIds) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await appDataSource.destroy();
  }
});
