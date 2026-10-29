import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from '../database/entities';
import { hashPassword } from '../auth/password';
import type { notificationFeed } from '../services/notifications';

type Feed = Awaited<ReturnType<typeof notificationFeed>>;
test('persistent branch activity, per-user reads, center isolation, relinking and idempotent events', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const tag = randomUUID().slice(0, 8), password = 'Notifications-' + randomUUID();
  const adminId = randomUUID(), userIds = [adminId], companyIds: string[] = [], branchIds: string[] = [];
  const request = (path: string, body?: unknown, cookie = '') => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const login = async (identifier: string) => {
    const response = await request('/auth/login', { identifier, password }); assert.equal(response.status, 200);
    return response.headers.get('set-cookie')!.split(';')[0];
  };
  const feed = async (cookie: string, query = ''): Promise<Feed> => {
    const response = await request('/notifications' + query, undefined, cookie); assert.equal(response.status, 200); return response.json();
  };
  try {
    await appDataSource.getRepository(UserEntity).save({ id: adminId, username: 'notifyadmin' + tag, email: `notifyadmin-${tag}@example.test`,
      companyId: null, branchId: null, name: 'Notification Test Admin', role: 'admin', title: 'Test', phone: '', active: true, passwordHash: await hashPassword(password) });
    const admin = await login('notifyadmin' + tag);
    const center = async (suffix: string) => {
      const username = 'notifycenter' + tag + suffix;
      const response = await request('/admin/centers', { name: 'Notify Center ' + suffix, username, ownerName: 'Test Patron',
        ownerEmail: `${username}@example.test`, ownerPassword: password, ownerPhone: '', branchLimit: 10, price: 0, billingMethod: 'manual', notes: '' }, admin);
      assert.equal(response.status, 201); const result = await response.json();
      companyIds.push(result.companyId); userIds.push(result.userId);
      return { ...result, cookie: await login(username) };
    };
    const a = await center('a'), b = await center('b');
    const branch = async (suffix: string, centerId: string) => {
      const username = 'notifybranch' + tag + suffix;
      const response = await request('/admin/establishments', { merkezOption: 'existing', selectedCompanyId: centerId,
        establishmentName: 'Notify Branch ' + suffix, username, ownerName: 'Branch Owner ' + suffix, ownerEmail: `${username}@example.test`, ownerPassword: password, price: 0 }, admin);
      assert.equal(response.status, 201); const result = await response.json();
      companyIds.push(result.companyId); userIds.push(result.userId); branchIds.push(result.branchId);
      return { ...result, username, cookie: await login(username) };
    };
    const one = await branch('a', a.companyId), two = await branch('b', b.companyId);
    assert.equal((await request('/notifications')).status, 401);
    assert.equal((await request('/notifications/read', { throughId: '0' })).status, 401);
    assert.equal((await feed(a.cookie)).unreadCount, 0);
    const revenue = { branchId: one.branchId, date: '2026-10-29', creditCard: 100.5, cash: 0, online: 0, other: 0, notes: '', receiptIds: [] };
    assert.equal((await request('/branch/revenue', revenue, one.cookie)).status, 200);
    const first = await feed(a.cookie);
    assert.equal(first.unreadCount, 1); assert.equal(first.events[0].kind, 'revenue_created'); assert.equal(first.events[0].tone, 'income');
    assert.equal(first.events[0].amount, 100.5); assert.equal(first.events[0].branchId, one.branchId); assert.equal(first.events[0].actorName, 'Branch Owner a');
    assert.equal((await feed(b.cookie)).events.length, 0); assert.equal((await feed(two.cookie)).events.length, 0);
    assert.equal((await request('/branch/revenue', { ...revenue, cash: 20 }, one.cookie)).status, 200);
    assert.equal((await feed(a.cookie)).events[0].kind, 'revenue_updated');
    const expense = { branchId: one.branchId, clientRequestId: randomUUID(), categoryId: 'cat-1', date: revenue.date, amount: 25.25, vatRate: 0, description: 'Notification test payroll', receiptIds: [] };
    assert.equal((await request('/branch/expenses', expense, one.cookie)).status, 201);
    const expenseFeed = await feed(a.cookie); assert.equal(expenseFeed.unreadCount, 3); assert.equal(expenseFeed.events[0].tone, 'expense');
    assert.equal(expenseFeed.events[0].amount, 25.25);
    assert.equal((await request('/branch/expenses', expense, one.cookie)).status, 201);
    assert.equal((await feed(a.cookie)).unreadCount, 3, 'a retried expense must not duplicate its notification');
    assert.equal((await request('/branch/expenses', { ...expense, clientRequestId: randomUUID(), categoryId: 'cat-2' }, one.cookie)).status, 400);
    assert.equal((await feed(a.cookie)).unreadCount, 3, 'a failed business transaction must not create a notification');
    const staffInput = { branchId: one.branchId, clientRequestId: randomUUID(), fullName: 'Notification Test Worker', role: 'Servis',
      phone: '', hireDate: '2026-01-01', salaryBasis: 'daily', salaryAmount: 100 };
    const staffCreated = await request('/branch/staff', staffInput, one.cookie); assert.equal(staffCreated.status, 201);
    const person = (await staffCreated.json()).staff;
    assert.equal((await feed(a.cookie)).events[0].kind, 'staff_created');
    assert.equal((await request('/branch/staff', staffInput, one.cookie)).status, 201);
    assert.equal((await feed(a.cookie)).unreadCount, 4, 'a retried staff creation must not duplicate its notification');
    assert.equal((await request('/branch/staff/' + person.id + '/status', { status: 'passive' }, one.cookie)).status, 200);
    assert.equal((await feed(a.cookie)).events[0].tone, 'warning');
    assert.equal((await request('/branch/staff/' + person.id + '/status', { status: 'passive' }, one.cookie)).status, 200);
    assert.equal((await feed(a.cookie)).unreadCount, 5, 'repeating an unchanged staff status must not notify again');
    const [expenseRow] = await appDataSource.query('SELECT id FROM expenses WHERE client_request_id=?', [expense.clientRequestId]);
    assert.equal((await request('/branch/expenses/' + expenseRow.id + '/delete', {}, one.cookie)).status, 200);
    const deleted = await feed(a.cookie); assert.equal(deleted.events[0].kind, 'expense_deleted'); assert.equal(deleted.events[0].tone, 'warning');
    assert.equal((await request('/branch/expenses/' + expenseRow.id + '/delete', {}, one.cookie)).status, 200);
    assert.equal((await feed(a.cookie)).unreadCount, 6);
    assert.equal((await request('/notifications/read', { throughId: deleted.latestId }, a.cookie)).status, 204);
    const read = await feed(a.cookie); assert.equal(read.unreadCount, 0); assert.ok(read.events.every(event => event.read));
    assert.equal((await feed(one.cookie)).unreadCount, 6, 'read status belongs to each user separately');
    assert.equal((await feed(await login('notifycenter' + tag + 'a'))).unreadCount, 0, 'read state must survive another login/device');
    assert.equal((await request('/branch/revenue', { ...revenue, cash: 30 }, one.cookie)).status, 200);
    const next = await feed(a.cookie); assert.equal(next.unreadCount, 1); assert.equal(next.events.length, 7);
    assert.ok(!JSON.stringify(next).includes(password));
    assert.equal((await request('/notifications?centerId=' + b.companyId, undefined, a.cookie)).status, 403);
    assert.equal((await request('/notifications?branchId=' + one.branchId, undefined, two.cookie)).status, 403);
    assert.equal((await request('/notifications/read?centerId=' + b.companyId, { throughId: next.latestId }, a.cookie)).status, 403);
    assert.equal((await request('/admin/establishments/' + one.branchId + '/center', { centerCompanyId: b.companyId }, admin)).status, 200);
    assert.equal((await feed(a.cookie)).events.length, 0, 'unlinking must revoke all visibility for the old center');
    assert.equal((await feed(b.cookie)).events.length, 0, 'a new center must not inherit the old center private activity history');
    assert.equal((await request('/branch/revenue', { ...revenue, cash: 40 }, one.cookie)).status, 200);
    const moved = await feed(b.cookie); assert.equal(moved.events.length, 1); assert.equal(moved.unreadCount, 1);
    assert.equal((await request('/notifications/read', { throughId: moved.latestId }, a.cookie)).status, 204);
    assert.equal((await feed(b.cookie)).unreadCount, 1, 'old center cannot mark a new center event as read');
    assert.equal((await feed(admin, '?centerId=' + b.companyId)).events.length, 1);
    assert.equal((await feed(admin, '?branchId=' + one.branchId)).events.length, 8, 'super admin retains complete branch history');
    assert.equal((await request('/notifications/read', { throughId: 'invalid' }, b.cookie)).status, 400);
  } finally {
    for (const branchId of branchIds) {
      await appDataSource.query('DELETE FROM expenses WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM staff WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM branch_expense_category_settings WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM daily_revenues WHERE branch_id=?', [branchId]);
    }
    for (const userId of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const branchId of branchIds) await appDataSource.getRepository(BranchEntity).delete(branchId);
    for (const companyId of companyIds) await appDataSource.getRepository(CompanyEntity).delete(companyId);
    await new Promise<void>(resolve => server.close(() => resolve())); await appDataSource.destroy();
  }
});
