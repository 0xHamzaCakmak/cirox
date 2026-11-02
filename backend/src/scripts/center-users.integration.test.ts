import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from '../database/entities';
import { hashPassword } from '../auth/password';

test('center partners see only assigned branches across bootstrap, direct reads and notifications', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const tag = randomUUID().replaceAll('-', '').slice(0, 9), password = 'PartnerTest-' + randomUUID();
  const adminId = randomUUID(), userIds = [adminId], companyIds: string[] = [], branchIds: string[] = [];
  const request = (path: string, body?: unknown, cookie = '') => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (identifier: string) => {
    const response = await request('/auth/login', { identifier, password }); assert.equal(response.status, 200);
    return response.headers.get('set-cookie')!.split(';')[0];
  };
  try {
    await appDataSource.getRepository(UserEntity).insert({ id: adminId, role: 'admin', companyId: null, branchId: null, name: 'Partner Test Admin', username: 'padmin' + tag, email: `padmin${tag}@example.test`, passwordHash: await hashPassword(password), active: true, title: 'Test', phone: '' });
    const admin = await login('padmin' + tag);
    const createCenter = async (suffix: string) => {
      const response = await request('/admin/centers', { name: 'Test Center ' + suffix, username: 'pcenter' + tag + suffix, ownerName: 'Test Patron', ownerEmail: `pcenter${tag}${suffix}@example.test`, ownerPassword: password, ownerPhone: '', branchLimit: 40, price: 0, billingMethod: 'manual', notes: '' }, admin);
      assert.equal(response.status, 201); const result = await response.json();
      companyIds.push(result.companyId); userIds.push(result.userId); return result;
    };
    const center = await createCenter('a'), other = await createCenter('b');
    const createBranch = async (suffix: string, centerId: string) => {
      const response = await request('/admin/establishments', { merkezOption: 'existing', selectedCompanyId: centerId, establishmentName: 'Partner Branch ' + suffix, username: 'pbranch' + tag + suffix, ownerName: 'Test Owner', ownerEmail: `pbranch${tag}${suffix}@example.test`, ownerPassword: password, city: 'İstanbul', district: 'Sarıyer' }, admin);
      assert.equal(response.status, 201); const result = await response.json();
      companyIds.push(result.companyId); branchIds.push(result.branchId); userIds.push(result.userId); return result;
    };
    const one = await createBranch('a', center.companyId), two = await createBranch('b', center.companyId), foreign = await createBranch('c', other.companyId);
    const path = `/admin/centers/${center.companyId}/users`;
    const principal = await login('pcenter' + tag + 'a');
    const fields = (suffix: string, ids: string[]) => ({ name: 'Ortak ' + suffix, username: 'partner' + tag + suffix, email: `partner${tag}${suffix}@example.test`, phone: '05321234567', active: true, access: 'selected', branchIds: ids, newPassword: password });
    assert.equal((await request(path)).status, 401); assert.equal((await request(path, undefined, principal)).status, 403);
    assert.equal((await request(path, fields('x', [one.branchId]), principal)).status, 403);
    assert.equal((await request(path, fields('x', [foreign.branchId]), admin)).status, 400);
    assert.equal((await request(path, { ...fields('x', []), access: 'selected', newPassword: undefined }, admin)).status, 400);
    const partners: { userId: string; cookie: string; fields: ReturnType<typeof fields> }[] = [];
    for (const [suffix, ids] of [['a', [one.branchId]], ['b', [two.branchId]], ['c', [one.branchId, two.branchId]], ['d', []]] as [string, string[]][]) {
      const input = fields(suffix, ids); const response = await request(path, input, admin);
      assert.equal(response.status, 201); const result = await response.json(); userIds.push(result.userId);
      partners.push({ userId: result.userId, cookie: await login(input.username), fields: input });
    }
    const [a, b, both, empty] = partners;
    const listing = await (await request(path, undefined, admin)).json();
    assert.equal(listing.users.length, 5); assert.equal(listing.branches.length, 2);
    assert.deepEqual(listing.users.find((user: { id: string }) => user.id === a.userId).branchIds, [one.branchId]);
    assert.ok(!JSON.stringify(listing).includes('passwordHash')); assert.ok(!JSON.stringify(listing).includes(password));
    for (const item of [one, two, foreign]) {
      assert.equal((await request('/branch/revenue', { branchId: item.branchId, date: '2026-11-03', creditCard: item === one ? 100 : 999, cash: 0, online: 0, other: 0, notes: '', receiptIds: [] }, admin)).status, 200);
      assert.equal((await request('/branch/expenses', { branchId: item.branchId, clientRequestId: randomUUID(), categoryId: 'cat-1', date: '2026-11-03', amount: 25, vatRate: 0, description: 'Test expense', receiptIds: [] }, admin)).status, 201);
      assert.equal((await request('/branch/staff', { branchId: item.branchId, clientRequestId: randomUUID(), fullName: 'Test Staff', role: 'Test', hireDate: '2026-11-01', salaryBasis: 'daily', salaryAmount: 100 }, admin)).status, 201);
    }
    for (const partner of partners) {
      const data = await (await request('/auth/me', undefined, partner.cookie)).json();
      assert.deepEqual(data.branches.map((row: { id: string }) => row.id).sort(), [...partner.fields.branchIds].sort());
      for (const key of ['dailyRevenueRecords', 'expenses', 'staffList', 'staffPayments', 'expenseCategories']) {
        assert.ok(data[key].every((row: { branchId?: string }) => key === 'expenseCategories' && !row.branchId || partner.fields.branchIds.includes(row.branchId!)), key);
      }
      assert.equal(data.companies[0].branchesCount, partner.fields.branchIds.length);
      const feed = await (await request('/notifications', undefined, partner.cookie)).json();
      assert.ok(feed.events.every((event: { branchId: string }) => partner.fields.branchIds.includes(event.branchId)));
      if (partner === empty) assert.equal(feed.unreadCount, 0);
    }
    for (const endpoint of ['/branch/revenue', '/branch/expenses', '/branch/staff', '/branch/expense-categories', '/branch/cash-entries']) {
      const suffix = endpoint.endsWith('cash-entries') ? '&date=2026-11-03' : '';
      assert.equal((await request(`${endpoint}?branchId=${one.branchId}${suffix}`, undefined, a.cookie)).status, 200, endpoint);
      assert.equal((await request(`${endpoint}?branchId=${two.branchId}${suffix}`, undefined, a.cookie)).status, 403, endpoint);
      assert.equal((await request(`${endpoint}?branchId=${foreign.branchId}${suffix}`, undefined, both.cookie)).status, 403, endpoint);
    }
    assert.equal((await request(`/branches/${two.branchId}`, undefined, a.cookie)).status, 403);
    assert.equal((await request('/notifications?branchId=' + two.branchId, undefined, a.cookie)).status, 403);
    const feedB = await (await request('/notifications', undefined, b.cookie)).json();
    assert.equal((await request('/notifications/read', { throughId: feedB.latestId }, a.cookie)).status, 204);
    assert.equal((await (await request('/notifications', undefined, b.cookie)).json()).unreadCount, feedB.unreadCount);
    assert.equal((await request(`${path}/${other.userId}`, { ...a.fields, newPassword: undefined }, admin)).status, 404);
    assert.equal((await request(`${path}/${a.userId}`, { ...a.fields, branchIds: [two.branchId], newPassword: undefined }, admin)).status, 200);
    assert.equal((await request('/branch/revenue?branchId=' + one.branchId, undefined, a.cookie)).status, 403, 'grant removal applies to existing sessions');
    assert.equal((await request('/branch/revenue?branchId=' + two.branchId, undefined, a.cookie)).status, 200);
    assert.equal((await request(`${path}/${a.userId}`, { ...a.fields, branchIds: [], newPassword: undefined }, admin)).status, 200);
    assert.equal((await (await request('/auth/me', undefined, a.cookie)).json()).dailyRevenueRecords.length, 0);
    assert.equal((await request(`/admin/establishments/${one.branchId}/center`, { centerCompanyId: other.companyId }, admin)).status, 200);
    assert.equal((await request('/branch/revenue?branchId=' + one.branchId, undefined, both.cookie)).status, 403);
    assert.equal((await request(`/admin/establishments/${one.branchId}/center`, { centerCompanyId: center.companyId }, admin)).status, 200);
    assert.equal((await request('/branch/revenue?branchId=' + one.branchId, undefined, both.cookie)).status, 403, 'moving back does not restore stale grants');
    assert.equal((await request(`${path}/${empty.userId}`, { ...empty.fields, access: 'all', newPassword: undefined }, admin)).status, 200);
    assert.equal((await (await request('/auth/me', undefined, empty.cookie)).json()).branches.length, 2);
  } finally {
    for (const id of branchIds) {
      await appDataSource.query('DELETE FROM expenses WHERE branch_id=?', [id]);
      await appDataSource.query('DELETE FROM staff WHERE branch_id=?', [id]);
      await appDataSource.query('DELETE FROM branch_expense_category_settings WHERE branch_id=?', [id]);
      await appDataSource.query('DELETE FROM daily_revenues WHERE branch_id=?', [id]);
    }
    for (const id of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId: id }); await appDataSource.getRepository(UserEntity).delete(id); }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companyIds) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve())); await appDataSource.destroy();
  }
});
