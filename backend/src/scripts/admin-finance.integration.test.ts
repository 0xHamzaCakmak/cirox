import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, UserEntity, SessionEntity } from '../database/entities';
import { hashPassword } from '../auth/password';
import { nextLicenseDate, validTurkishIban } from '../services/admin-finance';

test('license periods and Turkish IBAN check digits are validated', () => {
  assert.equal(nextLicenseDate('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(nextLicenseDate('2024-02-29', 'yearly'), '2025-02-28');
  assert.ok(validTurkishIban('TR330006100519786457841326'));
  assert.ok(!validTurkishIban('TR340006100519786457841326'));
  assert.ok(!validTurkishIban('DE89370400440532013000'));
});

test('bank-linked collections persist, remain admin-only and never double count or double renew on retry', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`, tag = randomUUID().replaceAll('-', '').slice(0, 10);
  const adminId = randomUUID(), password = 'FinanceTest-' + randomUUID();
  const companyIds: string[] = [], userIds = [adminId], branchIds: string[] = [], bankIds: string[] = [];
  const request = (url: string, body?: unknown, cookie = '') => fetch(base + url, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (identifier: string) => { const response = await request('/auth/login', { identifier, password }); assert.equal(response.status, 200); return response.headers.get('set-cookie')!.split(';')[0]; };
  const iban = () => { const bban = '000610' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join(''); return 'TR' + String(98n - BigInt(bban + '292700') % 97n).padStart(2, '0') + bban; };
  try {
    await appDataSource.getRepository(UserEntity).insert({ id: adminId, companyId: null, branchId: null, name: 'Finance Test Admin', email: `finance-${tag}@example.test`, passwordHash: await hashPassword(password), role: 'admin', title: 'Test', phone: '', active: true });
    const admin = await login(`finance-${tag}@example.test`);
    const centerResponse = await request('/admin/centers', { name: 'Finance Center ' + tag, username: 'financecenter' + tag, ownerName: 'Test Patron', ownerEmail: `financecenter-${tag}@example.test`, ownerPassword: password, ownerPhone: '', branchLimit: 10, price: 100, billingMethod: 'manual', notes: '' }, admin);
    assert.equal(centerResponse.status, 201);
    const center = await centerResponse.json(); companyIds.push(center.companyId); userIds.push(center.userId);
    const branchResponse = await request('/admin/establishments', { merkezOption: 'none', establishmentName: 'Finance Branch ' + tag, username: 'financebranch' + tag, ownerName: 'Test Owner', ownerEmail: `financebranch-${tag}@example.test`, ownerPassword: password }, admin);
    assert.equal(branchResponse.status, 201);
    const branch = await branchResponse.json(); companyIds.push(branch.companyId); branchIds.push(branch.branchId); userIds.push(branch.userId);
    const patron = await login('financecenter' + tag), owner = await login('financebranch' + tag);
    assert.equal((await request('/admin/finance')).status, 401);
    for (const cookie of [patron, owner]) {
      assert.equal((await request('/admin/finance', undefined, cookie)).status, 403);
      assert.equal((await request('/admin/bank-accounts', {}, cookie)).status, 403);
      assert.equal((await request('/admin/collections', {}, cookie)).status, 403);
      const bootstrap = await (await request('/auth/me', undefined, cookie)).json();
      assert.ok(!('bankAccounts' in bootstrap)); assert.ok(!('payments' in bootstrap));
    }
    const createBank = async (suffix: string) => {
      const number = iban();
      const input = { bankName: 'Finance Bank ' + tag + suffix, accountName: 'Test Account', iban: number.toLowerCase().replace(/(.{4})/g, '$1 '), branchCode: '123 Test', currency: 'TRY', notes: 'Isolated fixture' };
      const response = await request('/admin/bank-accounts', input, admin); assert.equal(response.status, 201);
      const result = await response.json(); bankIds.push(result.id);
      assert.equal(result.bootstrap.bankAccounts.find((bank: { id: string }) => bank.id === result.id).iban, number);
      assert.equal((await request('/admin/bank-accounts', input, admin)).status, 409);
      return result.id as string;
    };
    const bankA = await createBank('A'), bankB = await createBank('B');
    assert.equal((await request('/admin/bank-accounts', { bankName: 'Bad', accountName: 'Bad', iban: 'TR00000000000000000000000000' }, admin)).status, 400);
    const license = { planName: 'Finance Plan', price: 100, branchLimit: 10, billingMethod: 'bank_transfer', billingCycle: 'monthly', status: 'trial', startDate: '2090-01-31', nextBillingDate: '2090-02-28' };
    assert.equal((await request(`/admin/companies/${center.companyId}/subscription`, license, admin)).status, 200);
    const input = { companyId: center.companyId, bankAccountId: bankA, amount: 100.11, method: 'bank_transfer', date: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }), receiptNumber: 'TEST-REF', notes: 'Test receipt', renewLicense: false, clientRequestId: randomUUID() };
    const parallel = await Promise.all([request('/admin/collections', input, admin), request('/admin/collections', input, admin)]);
    assert.deepEqual(parallel.map(response => response.status), [200, 200]);
    const responses = await Promise.all(parallel.map(response => response.json()));
    assert.equal(responses[0].paymentId, responses[1].paymentId);
    let state = await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId });
    assert.equal(state.nextBillingDate, license.nextBillingDate); assert.equal(state.status, 'trial');
    const renewedInput = { ...input, bankAccountId: bankB, amount: 200.22, renewLicense: true, clientRequestId: randomUUID() };
    assert.equal((await request('/admin/collections', renewedInput, admin)).status, 200);
    assert.equal((await request('/admin/collections', renewedInput, admin)).status, 200);
    state = await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId });
    assert.equal(state.nextBillingDate, '2090-03-28'); assert.equal(state.status, 'active');
    assert.equal((await request('/admin/collections', { ...renewedInput, amount: 300 }, admin)).status, 409);
    assert.equal((await request('/admin/collections', { ...input, companyId: branch.companyId }, admin)).status, 409);
    for (const invalid of [{ amount: 0 }, { amount: -1 }, { amount: 1.123 }, { bankAccountId: null }, { bankAccountId: randomUUID() }, { date: '2099-01-01' }, { date: '2026-02-30' }, { role: 'admin' }]) {
      assert.equal((await request('/admin/collections', { ...input, ...invalid, renewLicense: true, clientRequestId: randomUUID() }, admin)).status, 400);
    }
    assert.equal((await appDataSource.getRepository(CompanyEntity).findOneByOrFail({ id: center.companyId })).nextBillingDate, '2090-03-28');
    assert.equal((await request('/admin/collections', { ...input, amount: 9.99, method: 'manual', bankAccountId: null, clientRequestId: randomUUID() }, admin)).status, 200);
    assert.equal((await request('/admin/collections', { ...input, amount: 10, method: 'credit_card', clientRequestId: randomUUID() }, admin)).status, 200);
    const finance = await (await request('/admin/finance', undefined, await login(`finance-${tag}@example.test`))).json();
    const accountA = finance.bankAccounts.find((bank: { id: string }) => bank.id === bankA), accountB = finance.bankAccounts.find((bank: { id: string }) => bank.id === bankB);
    assert.equal(accountA.totalCollected, 110.11); assert.equal(accountA.paymentCount, 2);
    assert.equal(accountB.totalCollected, 200.22); assert.equal(accountB.paymentCount, 1);
    const ownPayments = finance.payments.filter((payment: { companyId: string }) => payment.companyId === center.companyId);
    assert.equal(ownPayments.length, 4);
    assert.ok(ownPayments.some((payment: { bankAccountId?: string; method: string }) => payment.method === 'manual' && !payment.bankAccountId));
    assert.ok(!JSON.stringify(finance).includes('passwordHash'));
    const persisted = await (await request('/auth/me', undefined, admin)).json();
    assert.equal(persisted.payments.filter((payment: { companyId: string }) => payment.companyId === center.companyId).length, 4);
    assert.equal(persisted.companies.find((company: { id: string }) => company.id === center.companyId).subscription.lastPaymentAmount, 10);
  } finally {
    await appDataSource.query('DELETE FROM subscription_payments WHERE recorded_by=?', [adminId]);
    for (const id of bankIds) await appDataSource.query('DELETE FROM admin_bank_accounts WHERE id=?', [id]);
    for (const userId of userIds) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const id of branchIds) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companyIds) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve())); await appDataSource.destroy();
  }
});
