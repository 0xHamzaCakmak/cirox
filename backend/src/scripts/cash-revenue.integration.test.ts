import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, UserEntity, SessionEntity } from '../database/entities';
import { hashPassword } from '../auth/password';

test('cash banknotes add atomically, preserve other revenue fields and produce scoped, idempotent daily history', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`, tag = randomUUID().replaceAll('-', '').slice(0, 10), password = 'CashTest-' + randomUUID();
  const adminId = randomUUID(), companyIds: string[] = [], branchIds: string[] = [], userIds = [adminId];
  const request = (url: string, body?: unknown, cookie = '') => fetch(base + url, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (identifier: string) => { const response = await request('/auth/login', { identifier, password }); assert.equal(response.status, 200); return response.headers.get('set-cookie')!.split(';')[0]; };
  try {
    await appDataSource.getRepository(UserEntity).insert({ id: adminId, companyId: null, branchId: null, name: 'Cash Test Admin', email: `cashadmin-${tag}@example.test`, passwordHash: await hashPassword(password), role: 'admin', title: 'Test', phone: '', active: true });
    const admin = await login(`cashadmin-${tag}@example.test`);
    const center = async (suffix: string) => {
      const username = 'cashcenter' + tag + suffix;
      const response = await request('/admin/centers', { name: 'Cash Center ' + tag + suffix, username, ownerName: 'Test Patron', ownerEmail: `${username}@example.test`, ownerPassword: password, ownerPhone: '', branchLimit: 10, price: 0, billingMethod: 'manual', notes: '' }, admin);
      assert.equal(response.status, 201); const data = await response.json(); companyIds.push(data.companyId); userIds.push(data.userId);
      return { ...data, cookie: await login(username) };
    };
    const centerA = await center('a'), centerB = await center('b');
    const branch = async (suffix: string, centerId: string) => {
      const username = 'cashbranch' + tag + suffix;
      const response = await request('/admin/establishments', { merkezOption: 'existing', selectedCompanyId: centerId, establishmentName: 'Cash Branch ' + tag + suffix, username, ownerName: 'Test Owner', ownerEmail: `${username}@example.test`, ownerPassword: password }, admin);
      assert.equal(response.status, 201); const data = await response.json(); companyIds.push(data.companyId); userIds.push(data.userId); branchIds.push(data.branchId);
      return { ...data, cookie: await login(username) };
    };
    const a = await branch('a', centerA.companyId), b = await branch('b', centerB.companyId);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const history = () => `/branch/cash-entries?branchId=${a.branchId}&date=${today}`;
    const input = { branchId: a.branchId, date: today, banknotes: { 5: 2, 10: 3, 20: 4, 50: 5, 100: 6, 200: 7 }, clientRequestId: randomUUID() };
    assert.equal((await request(history())).status, 401);
    assert.equal((await request('/branch/cash-entries', input)).status, 401);
    assert.equal((await request(history(), undefined, b.cookie)).status, 403);
    assert.equal((await request(history(), undefined, centerB.cookie)).status, 403);
    assert.equal((await request('/branch/cash-entries', input, centerA.cookie)).status, 403);
    const revenue = { branchId: a.branchId, date: today, creditCard: 12.34, cash: 50.25, online: 6, other: 0.66, notes: 'Preserve POS and notes', receiptIds: [] };
    assert.equal((await request('/branch/revenue', revenue, a.cookie)).status, 200);
    let feed = await (await request(history(), undefined, a.cookie)).json();
    assert.equal(feed.entries.length, 1); assert.equal(feed.entries[0].amount, 50.25); assert.equal(feed.entries[0].banknotes, null);
    const receiptId = randomUUID();
    await appDataSource.query(`INSERT INTO receipt_files (id,company_id,branch_id,revenue_id,bucket,object_key,file_name,byte_size,uploaded_by) VALUES (?,?,?,?,? ,?,'fixture.webp',1,?)`, [receiptId, a.companyId, a.branchId, feed.record.id, 'isolated-fixture', 'cash-test/' + receiptId, a.userId]);
    const responses = await Promise.all([request('/branch/cash-entries', input, a.cookie), request('/branch/cash-entries', input, a.cookie)]);
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    const results = await Promise.all(responses.map(response => response.json()));
    assert.equal(results[0].entryId, results[1].entryId); assert.equal(results[0].record.cash, 2420.25);
    assert.equal(results[0].record.creditCard, 12.34); assert.equal(results[0].record.online, 6); assert.equal(results[0].record.other, 0.66);
    assert.equal(results[0].record.notes, revenue.notes); assert.equal(results[0].record.receipts[0].id, receiptId);
    feed = await (await request(history(), undefined, centerA.cookie)).json();
    const counted = feed.entries.find((entry: { id: string }) => entry.id === results[0].entryId);
    assert.equal(feed.entries.length, 2); assert.deepEqual(counted.banknotes, input.banknotes); assert.equal(counted.amount, 2370);
    assert.equal((await request('/branch/cash-entries', { ...input, date: '2026-01-01' }, a.cookie)).status, 409);
    assert.equal((await request('/branch/cash-entries', { ...input, banknotes: { 200: 1 } }, a.cookie)).status, 409);
    const additions = await Promise.all([1, 2].map(() => request('/branch/cash-entries', { ...input, banknotes: { 200: 1 }, clientRequestId: randomUUID() }, a.cookie)));
    assert.deepEqual(additions.map(response => response.status), [200, 200]);
    const stale = await request('/branch/revenue', { ...revenue, cash: 2500, cashExpected: 2420.25, receiptIds: [receiptId] }, a.cookie);
    assert.equal(stale.status, 409); assert.equal((await stale.json()).code, 'CASH_CONFLICT');
    assert.equal((await request('/branch/revenue', { ...revenue, cash: 2750.10, cashExpected: 2820.25, receiptIds: [receiptId] }, a.cookie)).status, 200);
    feed = await (await request(history(), undefined, a.cookie)).json();
    assert.equal(feed.record.cash, 2750.1); assert.equal(feed.entries.length, 5);
    assert.ok(feed.entries.some((entry: { amount: number; banknotes: unknown }) => entry.amount === -70.15 && entry.banknotes === null));
    assert.equal(feed.entries.reduce((sum: number, entry: { amount: number }) => sum + Math.round(entry.amount * 100), 0), 275010);
    assert.equal((await request('/branch/revenue', { ...revenue, cash: 2750.10, cashExpected: 2750.1, receiptIds: [receiptId] }, a.cookie)).status, 200);
    assert.equal((await (await request(history(), undefined, a.cookie)).json()).entries.length, 5);
    for (const invalid of [{ banknotes: {} }, { banknotes: { 5: -1 } }, { banknotes: { 5: 1.2 } }, { banknotes: { 5: '2' } }, { banknotes: { 500: 1 } }, { banknotes: { 200: 1000001 } }, { date: '2026-02-30' }, { amount: 1 }]) {
      assert.equal((await request('/branch/cash-entries', { ...input, ...invalid, clientRequestId: randomUUID() }, a.cookie)).status, 400);
    }
    const otherDay = '2026-01-01';
    const byAdmin = await request('/branch/cash-entries', { branchId: b.branchId, date: otherDay, banknotes: { 50: 1 }, clientRequestId: randomUUID() }, admin);
    assert.equal(byAdmin.status, 200); assert.equal((await byAdmin.json()).record.cash, 50);
    const otherFeed = await (await request(`/branch/cash-entries?branchId=${b.branchId}&date=${otherDay}`, undefined, b.cookie)).json();
    assert.equal(otherFeed.entries[0].actorName, 'Cash Test Admin');
    assert.equal((await (await request(`/branch/cash-entries?branchId=${a.branchId}&date=${otherDay}`, undefined, a.cookie)).json()).entries.length, 0);
    assert.equal((await request('/branch/revenue', { ...revenue, date: '2026-01-02', cash: 999999999, receiptIds: [] }, a.cookie)).status, 200);
    assert.equal((await request('/branch/cash-entries', { ...input, date: '2026-01-02', banknotes: { 5: 1 }, clientRequestId: randomUUID() }, a.cookie)).status, 400);
    const notifications = await (await request('/notifications', undefined, centerA.cookie)).json();
    assert.equal(notifications.events.filter((event: { kind: string }) => event.kind === 'cash_banknotes_created').length, 3);
    const bootstrap = await (await request('/auth/me', undefined, a.cookie)).json();
    assert.equal(bootstrap.dailyRevenueRecords.find((record: { date: string }) => record.date === today).cash, 2750.1);
  } finally {
    for (const id of branchIds) { await appDataSource.query('DELETE FROM receipt_files WHERE branch_id=?', [id]); await appDataSource.query('DELETE FROM daily_revenues WHERE branch_id=?', [id]); }
    for (const userId of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companyIds) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve())); await appDataSource.destroy();
  }
});
