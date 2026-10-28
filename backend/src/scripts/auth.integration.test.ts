import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../app';
import { hashPassword } from '../auth/password';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from '../database/entities';
import type { bootstrapData } from '../services/bootstrap';
import { writableBranch } from '../services/branch-access';
type BootstrapData = Awaited<ReturnType<typeof bootstrapData>>;
type EstablishmentResult = { companyId: string; branchId: string; userId: string; bootstrap: BootstrapData };

test('real login, persistent branch provisioning, tenant isolation and logout', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const tag = randomUUID().slice(0, 8);
  const adminId = randomUUID();
  const centerA = randomUUID();
  const centerB = randomUUID();
  const centerUserId = randomUUID();
  const password = 'AuthTest-' + randomUUID();
  const companies: string[] = [];
  const branchIds: string[] = [];
  const userIds: string[] = [adminId, centerUserId];
  async function request(path: string, body?: unknown, cookie = '', origin?: string) {
    return fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  const fixture = (suffix: string) => ({
    merkezOption: 'existing', selectedCompanyId: suffix === 'A' ? centerA : centerB,
    establishmentName: 'Şube ' + suffix,
    establishmentCode: 'BR_' + tag + suffix, ownerName: 'Test Sorumlusu',
    ownerEmail: `branch-${tag}${suffix}@example.test`, ownerPassword: password,
    city: 'İstanbul', district: 'Test', price: 0,
  });
  try {
    for (const [id, suffix] of [[centerA, 'A'], [centerB, 'B']]) {
      await appDataSource.getRepository(CompanyEntity).save({
        id, kind: 'center', name: 'Test Center ' + tag + suffix, code: 'C_' + tag + suffix,
        sector: 'Test', ownerName: 'Test Center', ownerEmail: `center-${tag}${suffix}@example.test`, ownerPhone: '',
        status: 'active', planTier: 'growth', planName: 'Test', licensePrice: '0', billingCycle: 'yearly',
        billingMethod: 'manual', branchLimit: 5, startDate: '2026-01-01', nextBillingDate: '2099-01-01', autoRenew: false, notes: null,
      });
      companies.push(id);
    }
    const centerUser = await appDataSource.getRepository(UserEntity).save({
      id: centerUserId, companyId: centerA, branchId: null, name: 'Test Center User',
      email: `center-${tag}@example.test`, passwordHash: await hashPassword(password),
      role: 'merkez', title: 'Center', phone: '', active: true,
    });
    await appDataSource.getRepository(UserEntity).insert({
      id: adminId, companyId: null, branchId: null, name: 'Test Admin',
      email: `admin-${tag}@example.test`, passwordHash: await hashPassword(password),
      role: 'admin', title: 'Test', phone: '', active: true,
    });
    assert.equal((await request('/admin/tenants')).status, 401);
    assert.equal((await request('/admin/establishments', fixture('A'))).status, 401);
    assert.equal((await request('/auth/login', { email: `admin-${tag}@example.test`, password: 'wrong' })).status, 401);
    assert.equal((await request('/auth/login', { email: `missing-${tag}@example.test`, password })).status, 401);
    const login = await request('/auth/login', { email: ` ADMIN-${tag}@EXAMPLE.TEST `, password });
    assert.equal(login.status, 200);
    const cookieHeader = login.headers.get('set-cookie')!;
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    const adminCookie = cookieHeader.split(';')[0];
    const loginData = await login.json() as BootstrapData;
    assert.equal(loginData.user.role, 'admin');
    assert.ok(!JSON.stringify(loginData).includes('password'));
    assert.equal((await request('/admin/establishments', fixture('X'), adminCookie, 'https://evil.example')).status, 403);
    const createdResponse = await request('/admin/establishments', fixture('A'), adminCookie);
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as EstablishmentResult;
    companies.push(created.companyId); branchIds.push(created.branchId); userIds.push(created.userId);
    const secondResponse = await request('/admin/establishments', fixture('B'), adminCookie);
    assert.equal(secondResponse.status, 201);
    const second = await secondResponse.json() as EstablishmentResult;
    companies.push(second.companyId); branchIds.push(second.branchId); userIds.push(second.userId);
    await assert.rejects(
      appDataSource.getRepository(UserEntity).update(created.userId, { companyId: second.companyId }),
      'database must reject a branch user assigned to another tenant',
    );
    const stored = await appDataSource.getRepository(UserEntity).createQueryBuilder('user').addSelect('user.passwordHash').where('user.id = :id', { id: created.userId }).getOneOrFail();
    assert.notEqual(stored.passwordHash, password);
    assert.match(stored.passwordHash, /^scrypt:/);
    assert.equal(stored.username, fixture('A').establishmentCode.toLowerCase());
    assert.ok(!JSON.stringify(created).includes(stored.passwordHash));
    assert.equal((await request('/auth/login', { identifier: stored.username, password: 'wrong-password' })).status, 401);
    const usernameLogin = await request('/auth/login', { identifier: '  ' + stored.username!.toUpperCase() + '  ', password });
    assert.equal(usernameLogin.status, 200, 'username login must trim whitespace and ignore case');
    const usernameData = await usernameLogin.json() as BootstrapData;
    assert.equal(usernameData.user.id, created.userId);
    assert.equal(usernameData.user.username, stored.username);
    assert.equal((await request('/auth/logout', {}, usernameLogin.headers.get('set-cookie')!.split(';')[0])).status, 204);
    const companyCount = await appDataSource.getRepository(CompanyEntity).count();
    const duplicateUsername = await request('/admin/establishments', { ...fixture('J'), username: stored.username!.toUpperCase() }, adminCookie);
    assert.equal(duplicateUsername.status, 409, 'usernames must be unique across tenants, including case variants');
    assert.equal(await appDataSource.getRepository(CompanyEntity).count(), companyCount, 'duplicate username must roll back business creation');
    const invalidUsername = await request('/admin/establishments', { ...fixture('J'), username: 'not an email@example.test' }, adminCookie);
    assert.equal(invalidUsername.status, 400, 'username must not overlap the email identifier namespace');
    const duplicate = await request('/admin/establishments', { ...fixture('C'), ownerEmail: fixture('A').ownerEmail }, adminCookie);
    assert.equal(duplicate.status, 409);
    assert.equal(await appDataSource.getRepository(CompanyEntity).count(), companyCount, 'transaction must roll back the new company on duplicate email');
    await appDataSource.getRepository(CompanyEntity).update(centerA, { branchLimit: 1 });
    const quota = await request('/admin/establishments', { ...fixture('D'), merkezOption: 'existing', selectedCompanyId: centerA }, adminCookie);
    assert.equal(quota.status, 409);
    await appDataSource.getRepository(CompanyEntity).update(centerB, { branchLimit: 2 });
    const concurrent = await Promise.all(['E', 'F'].map(suffix => request('/admin/establishments', {
      ...fixture(suffix), merkezOption: 'existing', selectedCompanyId: centerB,
    }, adminCookie)));
    for (const response of concurrent) {
      if (response.status === 201) {
        const extra = await response.json() as EstablishmentResult;
        branchIds.push(extra.branchId); userIds.push(extra.userId); companies.push(extra.companyId);
      }
    }
    assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409], 'concurrent requests must respect the branch limit');
    const independentResponse = await request('/admin/establishments', { ...fixture('G'), merkezOption: 'none' }, adminCookie);
    assert.equal(independentResponse.status, 201);
    const independent = await independentResponse.json() as EstablishmentResult;
    companies.push(independent.companyId); branchIds.push(independent.branchId); userIds.push(independent.userId);
    const independentBranch = await appDataSource.getRepository(BranchEntity).findOneByOrFail({ id: independent.branchId });
    assert.equal(independentBranch.centerCompanyId, null, 'none must ignore a stale selected center');
    const omittedCenterResponse = await request('/admin/establishments', { ...fixture('I'), selectedCompanyId: '', merkezOption: 'existing' }, adminCookie);
    assert.equal(omittedCenterResponse.status, 201, 'an empty center selection must create an independent business');
    const omittedCenter = await omittedCenterResponse.json() as EstablishmentResult;
    companies.push(omittedCenter.companyId); branchIds.push(omittedCenter.branchId); userIds.push(omittedCenter.userId);
    assert.equal((await appDataSource.getRepository(BranchEntity).findOneByOrFail({ id: omittedCenter.branchId })).centerCompanyId, null);
    assert.equal((await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: independent.companyId })).kind, 'business');
    assert.equal((await request('/admin/establishments', { ...fixture('H'), selectedCompanyId: independent.companyId }, adminCookie)).status, 404, 'a business tenant cannot be selected as a center');
    assert.equal((await request('/admin/establishments', { ...fixture('H'), merkezOption: 'new' }, adminCookie)).status, 400, 'business provisioning must not implicitly open a center');
    const centerLogin = await request('/auth/login', { email: centerUser.email, password });
    assert.equal(centerLogin.status, 200);
    const centerCookie = centerLogin.headers.get('set-cookie')!.split(';')[0];
    const centerData = await centerLogin.json() as BootstrapData;
    assert.deepEqual(centerData.branches.map(branch => branch.id), [created.branchId]);
    assert.equal(centerData.branches[0].readOnly, true);
    assert.equal((await request('/branches/' + created.branchId, undefined, centerCookie)).status, 200);
    assert.equal((await request('/branches/' + second.branchId, undefined, centerCookie)).status, 403);
    assert.equal((await request('/branches/' + independent.branchId, undefined, centerCookie)).status, 403);
    assert.equal((await request('/branches/' + created.branchId, {}, centerCookie)).status, 403);
    assert.equal((await request('/admin/establishments', fixture('Z'), centerCookie)).status, 403);
    assert.equal((await request('/admin/establishments/' + independent.branchId + '/center', { centerCompanyId: centerA }, centerCookie)).status, 403);
    await assert.rejects(writableBranch(centerUser, created.branchId), { status: 403 });
    const independentLogin = await request('/auth/login', { email: fixture('G').ownerEmail, password });
    assert.equal(independentLogin.status, 200);
    const independentCookie = independentLogin.headers.get('set-cookie')!.split(';')[0];
    const independentData = await independentLogin.json() as BootstrapData;
    assert.equal(independentData.branches[0].centerName, 'Merkez yok');
    await writableBranch(await appDataSource.getRepository(UserEntity).findOneByOrFail({ id: independent.userId }), independent.branchId);
    await appDataSource.getRepository(CompanyEntity).update(centerA, { branchLimit: 2 });
    assert.equal((await request('/admin/establishments/' + independent.branchId + '/center', { centerCompanyId: centerA }, adminCookie)).status, 200);
    const monitored = await request('/auth/me', undefined, centerCookie);
    assert.deepEqual(new Set(((await monitored.json()) as BootstrapData).branches.map(branch => branch.id)), new Set([created.branchId, independent.branchId]));
    const afterLink = await request('/auth/me', undefined, independentCookie);
    const afterLinkData = await afterLink.json() as BootstrapData;
    assert.equal(afterLinkData.user.companyId, independent.companyId, 'linking must not change business ownership or invalidate its session');
    assert.equal(afterLinkData.branches[0].centerCompanyId, centerA);
    await appDataSource.getRepository(CompanyEntity).update(centerA, { status: 'passive' });
    assert.equal((await request('/auth/me', undefined, independentCookie)).status, 200, 'monitoring center status must not lock an independently owned business');
    await appDataSource.getRepository(CompanyEntity).update(centerA, { status: 'active' });
    assert.equal((await request('/admin/establishments/' + independent.branchId + '/center', { centerCompanyId: null }, adminCookie)).status, 200);
    assert.equal((await request('/branches/' + independent.branchId, undefined, centerCookie)).status, 403, 'unlink revokes monitoring immediately');
    const branchLogin = await request('/auth/login', { email: fixture('A').ownerEmail, password });
    assert.equal(branchLogin.status, 200);
    const branchCookie = branchLogin.headers.get('set-cookie')!.split(';')[0];
    const branchData = await branchLogin.json() as BootstrapData;
    assert.equal(branchData.user.role, 'sube');
    assert.deepEqual(branchData.companies.map(company => company.id), [created.companyId]);
    assert.deepEqual(branchData.branches.map(branch => branch.id), [created.branchId]);
    assert.equal(branchData.branches[0].dailyRevenue, 0);
    assert.equal((await request('/admin/tenants', undefined, branchCookie)).status, 403);
    assert.equal((await request('/admin/establishments', fixture('Z'), branchCookie)).status, 403);
    assert.equal((await request('/auth/me', undefined, branchCookie)).status, 200);
    await appDataSource.getRepository(BranchEntity).update(created.branchId, { status: 'passive' });
    assert.equal((await request('/auth/me', undefined, branchCookie)).status, 403);
    await appDataSource.getRepository(BranchEntity).update(created.branchId, { status: 'active' });
    await appDataSource.getRepository(CompanyEntity).update(created.companyId, { status: 'passive' });
    assert.equal((await request('/auth/me', undefined, branchCookie)).status, 403);
    await appDataSource.getRepository(CompanyEntity).update(created.companyId, { status: 'active' });
    const logout = await request('/auth/logout', {}, branchCookie);
    assert.equal(logout.status, 204);
    assert.equal((await request('/auth/me', undefined, branchCookie)).status, 401);
    const expiryLogin = await request('/auth/login', { email: fixture('A').ownerEmail, password });
    const expiryCookie = expiryLogin.headers.get('set-cookie')!.split(';')[0];
    await appDataSource.getRepository(SessionEntity).update({ userId: created.userId }, { expiresAt: new Date(Date.now() - 1000) });
    const expiredResponse = await request('/auth/me', undefined, expiryCookie);
    assert.equal(expiredResponse.status, 401); assert.equal((await expiredResponse.json()).code, 'AUTH_REQUIRED');
    const settings = { legalName: 'Test İşletme Unvanı', tradeRegisterNo: 'TEST-123', taxOffice: 'Test Vergi Dairesi', taxNumber: '1234567890', contactEmail: 'contact@example.test', phone: '05321234567' };
    assert.equal((await request('/settings/business', settings)).status, 401);
    assert.equal((await request('/settings/business', settings, centerCookie)).status, 403);
    assert.equal((await request('/settings/business', { ...settings, branchId: second.branchId }, independentCookie)).status, 400);
    const savedSettings = await request('/settings/business', settings, independentCookie); assert.equal(savedSettings.status, 200);
    const settingsData = await savedSettings.json() as { bootstrap: BootstrapData };
    assert.equal(settingsData.bootstrap.branches[0].legalName, settings.legalName);
    const reloadedSettings = await request('/auth/me', undefined, independentCookie);
    assert.equal((await reloadedSettings.json()).branches[0].contactEmail, settings.contactEmail);
    assert.equal((await appDataSource.getRepository(BranchEntity).findOneByOrFail({ id: second.branchId })).legalName, '');
    const profile = { name: 'Updated Owner', username: 'owner_' + tag, email: 'updated-' + tag + '@example.test', phone: '05329876543', currentPassword: password };
    const wrongCurrentPassword = await request('/settings/profile', { ...profile, currentPassword: 'wrong-password' }, independentCookie);
    assert.equal(wrongCurrentPassword.status, 401); assert.equal((await wrongCurrentPassword.json()).code, undefined);
    assert.equal((await request('/settings/profile', { ...profile, role: 'admin' }, independentCookie)).status, 400);
    assert.equal((await request('/settings/profile', { ...profile, email: fixture('A').ownerEmail }, independentCookie)).status, 409);
    const updatedProfile = await request('/settings/profile', profile, independentCookie); assert.equal(updatedProfile.status, 200);
    const profileData = await updatedProfile.json();
    assert.equal(profileData.bootstrap.user.name, profile.name); assert.equal(profileData.bootstrap.user.role, 'sube');
    assert.equal(profileData.bootstrap.user.branchId, independent.branchId);
    assert.ok(!JSON.stringify(profileData).includes('passwordHash'));
    assert.equal((await request('/auth/login', { identifier: profile.username.toUpperCase(), password })).status, 200);
    assert.equal((await request('/auth/login', { identifier: fixture('G').ownerEmail, password })).status, 401);
    const anotherDevice = await request('/auth/login', { identifier: profile.email, password });
    const anotherCookie = anotherDevice.headers.get('set-cookie')!.split(';')[0];
    const nextPassword = 'Changed-' + randomUUID();
    const changedPassword = await request('/settings/profile', { ...profile, newPassword: nextPassword }, independentCookie); assert.equal(changedPassword.status, 200);
    const rotatedCookie = changedPassword.headers.get('set-cookie')!.split(';')[0];
    assert.notEqual(rotatedCookie, independentCookie);
    assert.equal((await request('/auth/me', undefined, rotatedCookie)).status, 200);
    assert.equal((await request('/auth/me', undefined, independentCookie)).status, 401);
    assert.equal((await request('/auth/me', undefined, anotherCookie)).status, 401);
    assert.equal((await request('/auth/login', { identifier: profile.username, password })).status, 401);
    assert.equal((await request('/auth/login', { identifier: profile.username, password: nextPassword })).status, 200);
    assert.equal((await request('/auth/logout', {}, adminCookie)).status, 204);
  } finally {
    // Remove only records created by this test; preserve the seeded admin and user data.
    for (const id of userIds) {
      await appDataSource.getRepository(SessionEntity).delete({ userId: id });
      await appDataSource.getRepository(UserEntity).delete(id);
    }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companies) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await appDataSource.destroy();
  }
});
