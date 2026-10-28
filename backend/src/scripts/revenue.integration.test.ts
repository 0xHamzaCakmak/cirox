import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../app';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from '../database/entities';
import { hashPassword } from '../auth/password';
import { removeReceiptObject } from '../services/receipt-storage';
import sharp from 'sharp';

test('revenue is persistent, precise, scoped, upserted and linked to encrypted R2 receipts', async () => {
  await appDataSource.initialize();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const companies: string[] = []; const users: string[] = []; const branches: string[] = [];
  const password = 'RevenueTest-' + randomUUID();
  const request = (path: string, body?: unknown, cookie = '') => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  async function account(role: 'sube' | 'merkez') {
    const id = randomUUID();
    await appDataSource.getRepository(CompanyEntity).save({ id, kind: role === 'sube' ? 'business' : 'center', name: 'Revenue Test', code: id.slice(0, 8),
      sector: 'Test', ownerName: 'Test', ownerEmail: id + '@example.test', ownerPhone: '', status: 'active', planTier: 'growth', planName: 'Test',
      licensePrice: '0', billingCycle: 'monthly', billingMethod: 'manual', branchLimit: 10, startDate: '2026-01-01', nextBillingDate: '2099-01-01', autoRenew: false, notes: null });
    companies.push(id);
    const branchId = role === 'sube' ? randomUUID() : null;
    if (branchId) {
      await appDataSource.getRepository(BranchEntity).save({ id: branchId, companyId: id, centerCompanyId: null, code: id.slice(0, 8), name: 'Test Branch', city: '', district: '', managerName: 'Test', phone: '', status: 'active', royaltyRate: '0' });
      branches.push(branchId);
    }
    const userId = randomUUID(); const email = userId + '@example.test';
    await appDataSource.getRepository(UserEntity).save({ id: userId, username: 't_' + userId.slice(0, 8), companyId: id, branchId, name: 'Revenue Tester', email,
      passwordHash: await hashPassword(password), role, title: 'Test', phone: '', active: true });
    users.push(userId);
    const login = await request('/auth/login', { identifier: email, password }); assert.equal(login.status, 200);
    return { id, branchId: branchId!, userId, cookie: login.headers.get('set-cookie')!.split(';')[0] };
  }
  try {
    const owner = await account('sube'); const other = await account('sube'); const center = await account('merkez');
    await appDataSource.getRepository(BranchEntity).update(owner.branchId, { centerCompanyId: center.id });
    const input = { branchId: owner.branchId, date: '2026-10-27', creditCard: 0.1, cash: 0.2, online: 12.34, other: 1, total: 999, submittedBy: 'Spoof', companyId: other.id, notes: 'Test' };
    assert.equal((await request('/branch/revenue', input)).status, 401);
    assert.equal((await request('/branch/revenue', input, other.cookie)).status, 403);
    assert.equal((await request('/branch/revenue', input, center.cookie)).status, 403);
    for (const invalid of [{ creditCard: -1 }, { cash: 0.123 }, { date: '2026-02-30' }]) assert.equal((await request('/branch/revenue', { ...input, ...invalid }, owner.cookie)).status, 400);
    const saved = await request('/branch/revenue', input, owner.cookie); assert.equal(saved.status, 200);
    const first = (await saved.json()).record;
    assert.equal(first.total, 13.64); assert.equal(first.companyId, owner.id); assert.equal(first.submittedBy, 'Revenue Tester');
    const updated = await request('/branch/revenue', { ...input, cash: 100 }, owner.cookie); assert.equal(updated.status, 200);
    const second = (await updated.json()).record;
    assert.equal(second.id, first.id); assert.equal(second.total, 113.44);
    assert.equal((await appDataSource.query('SELECT id FROM daily_revenues WHERE branch_id=? AND date=?', [owner.branchId, input.date])).length, 1);
    const visible = await request('/branch/revenue?branchId=' + owner.branchId, undefined, center.cookie); assert.equal(visible.status, 200);
    assert.equal((await visible.json()).records[0].total, 113.44);
    assert.equal((await request('/branch/revenue?branchId=' + owner.branchId, undefined, other.cookie)).status, 403);
    const restored = await request('/auth/me', undefined, owner.cookie);
    assert.equal((await restored.json()).dailyRevenueRecords[0].id, first.id);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    await request('/branch/revenue', { ...input, date: today }, owner.cookie);
    const todayData = await request('/auth/me', undefined, owner.cookie);
    assert.equal((await todayData.json()).branches[0].dailyRevenue, 13.64);
    const image = await sharp({ create: { width: 30, height: 40, channels: 3, background: '#10b981' } }).png().toBuffer();
    const form = new FormData(); form.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'test-fis.png');
    const forbidden = await fetch(base + '/branch/' + owner.branchId + '/receipts', { method: 'POST', headers: { Cookie: center.cookie }, body: form }); assert.equal(forbidden.status, 403);
    const upload = await fetch(base + '/branch/' + owner.branchId + '/receipts', { method: 'POST', headers: { Cookie: owner.cookie }, body: form }); assert.equal(upload.status, 201);
    const receipt = await upload.json(); assert.ok(receipt.url.startsWith('/api/')); assert.ok(!JSON.stringify(receipt).includes('cloudflare'));
    assert.equal((await request('/branch/receipts/' + receipt.id)).status, 401);
    assert.equal((await request('/branch/receipts/' + receipt.id, undefined, other.cookie)).status, 403);
    const photo = await request('/branch/receipts/' + receipt.id, undefined, owner.cookie); assert.equal(photo.status, 200);
    assert.match(photo.headers.get('content-type')!, /image\/webp/);
    assert.equal(photo.headers.get('cache-control'), 'private, no-cache');
    assert.ok(photo.headers.get('vary')?.includes('Cookie'));
    const etag = photo.headers.get('etag'); assert.ok(etag);
    // Undici otherwise adds request Cache-Control:no-cache for explicit validators,
    // which deliberately asks Express for a full response rather than a 304.
    const conditional = (cookie: string) => fetch(base + '/branch/receipts/' + receipt.id, { cache: 'no-cache', headers: { Cookie: cookie, 'If-None-Match': etag } });
    const reused = await conditional(owner.cookie); assert.equal(reused.status, 304); assert.equal((await reused.arrayBuffer()).byteLength, 0);
    assert.equal((await conditional('')).status, 401, 'cached image still requires a session');
    assert.equal((await conditional(other.cookie)).status, 403, 'conditional requests cannot bypass branch access');
    assert.equal((await request('/branch/receipts/' + receipt.id, undefined, center.cookie)).status, 200);
    const attach = await request('/branch/revenue', { ...input, receiptIds: [receipt.id] }, owner.cookie); assert.equal(attach.status, 200);
    assert.equal((await attach.json()).record.receipts[0].id, receipt.id);
    assert.equal((await request('/branch/revenue', { ...input, branchId: other.branchId, receiptIds: [receipt.id] }, other.cookie)).status, 403);
    assert.equal((await request('/branch/revenue', { ...input, date: '2026-10-26', receiptIds: [receipt.id] }, owner.cookie)).status, 409);
    const payroll = { branchId: owner.branchId, clientRequestId: randomUUID(), categoryId: 'cat-1', amount: 12.34, vatRate: 0, description: 'Test personel ödemesi', date: today, receiptIds: [] };
    const missingProof = await request('/branch/expenses', { ...payroll, categoryId: 'cat-2' }, owner.cookie); assert.equal(missingProof.status, 400);
    assert.equal((await request('/branch/expenses', payroll, center.cookie)).status, 403);
    assert.equal((await request('/branch/expenses', payroll, other.cookie)).status, 403);
    assert.equal((await request('/branch/expenses', { ...payroll, amount: -1 }, owner.cookie)).status, 400);
    assert.equal((await request('/branch/expenses', { ...payroll, amount: 1.001 }, owner.cookie)).status, 400);
    assert.equal((await request('/branch/expenses', { ...payroll, categoryId: 'not-a-category' }, owner.cookie)).status, 400);
    assert.equal((await request('/branch/expenses', { ...payroll, vatRate: 20 }, owner.cookie)).status, 400);
    const repeated = await Promise.all([request('/branch/expenses', payroll, owner.cookie), request('/branch/expenses', payroll, owner.cookie)]);
    for (const response of repeated) assert.equal(response.status, 201);
    const payrollData = await repeated[0].json(); const repeatedData = await repeated[1].json();
    assert.equal(payrollData.expense.id, repeatedData.expense.id, 'retry must not duplicate a financial record');
    assert.equal(payrollData.bootstrap.branches[0].dailyExpense, 12.34);
    assert.equal(payrollData.bootstrap.branches[0].netProfit, 1.3);
    assert.equal((await request('/branch/expenses', { ...payroll, amount: 50 }, owner.cookie)).status, 409);
    assert.equal((await request('/branch/expenses?branchId=' + owner.branchId, undefined, other.cookie)).status, 403);
    assert.equal((await request('/branch/expenses?branchId=' + owner.branchId, undefined, center.cookie)).status, 200);
    assert.equal((await request('/branch/expenses/' + payrollData.expense.id + '/delete', {}, center.cookie)).status, 403);
    assert.equal((await request('/branch/expenses/' + payrollData.expense.id + '/delete', {}, other.cookie)).status, 403);
    const invoice = { ...payroll, clientRequestId: randomUUID(), categoryId: 'cat-2', amount: 123.45, vatRate: 20, description: 'Test fatura', receiptIds: [receipt.id] };
    assert.equal((await request('/branch/expenses', invoice, owner.cookie)).status, 409, 'a revenue receipt cannot be reused in an expense');
    const invoiceForm = new FormData(); invoiceForm.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'test-fatura.png');
    const invoiceUpload = await fetch(base + '/branch/' + owner.branchId + '/receipts', { method: 'POST', headers: { Cookie: owner.cookie }, body: invoiceForm }); assert.equal(invoiceUpload.status, 201);
    const invoicePhoto = await invoiceUpload.json();
    const invoiceSaved = await request('/branch/expenses', { ...invoice, receiptIds: [invoicePhoto.id] }, owner.cookie); assert.equal(invoiceSaved.status, 201);
    const invoiceData = await invoiceSaved.json(); assert.equal(invoiceData.expense.receipts[0].id, invoicePhoto.id);
    assert.equal(invoiceData.bootstrap.branches[0].dailyExpense, 135.79);
    assert.equal((await request('/branch/revenue', { ...input, receiptIds: [invoicePhoto.id] }, owner.cookie)).status, 409, 'an expense receipt cannot be reused in revenue');
    const afterRefresh = await request('/auth/me', undefined, owner.cookie);
    assert.equal((await afterRefresh.json()).expenses.length, 2, 'expenses must survive page reload');
    const archived = await request('/branch/expenses/' + invoiceData.expense.id + '/delete', {}, owner.cookie); assert.equal(archived.status, 200);
    const archivedData = await archived.json(); assert.equal(archivedData.bootstrap.expenses.length, 1); assert.equal(archivedData.bootstrap.branches[0].dailyExpense, 12.34);
    const [archivedRow] = await appDataSource.query('SELECT deleted_at FROM expenses WHERE id=?', [invoiceData.expense.id]); assert.ok(archivedRow.deleted_at);
    assert.equal((await request('/branch/receipts/' + invoicePhoto.id, undefined, owner.cookie)).status, 200, 'archiving must preserve the accounting evidence');
    const categoryList = await request('/branch/expense-categories?branchId=' + owner.branchId, undefined, owner.cookie);
    assert.equal(categoryList.status, 200);
    const initialCategories = (await categoryList.json()).categories;
    assert.equal(initialCategories.length, 9); assert.ok(initialCategories.every((category: { isActive: boolean }) => category.isActive));
    const hidden = await request('/branch/expense-categories/cat-2/update', { branchId: owner.branchId, isActive: false }, owner.cookie);
    assert.equal(hidden.status, 200);
    assert.equal((await hidden.json()).bootstrap.expenseCategories.find((category: { id: string }) => category.id === 'cat-2').isActive, false);
    const otherDefaults = await request('/branch/expense-categories?branchId=' + other.branchId, undefined, other.cookie);
    assert.equal((await otherDefaults.json()).categories.find((category: { id: string }) => category.id === 'cat-2').isActive, true, 'hiding must not affect another business');
    const hiddenEntry = await request('/branch/expenses', { ...invoice, clientRequestId: randomUUID(), receiptIds: [invoicePhoto.id] }, owner.cookie);
    assert.equal(hiddenEntry.status, 400); assert.match((await hiddenEntry.json()).error, /gizli/);
    // Wage conversion uses the entered basis; payments are actual expenses, never a second ledger.
    const staffInput = { branchId: owner.branchId, clientRequestId: randomUUID(), fullName: 'Test Personel', role: 'Garson', phone: '', hireDate: today, salaryBasis: 'daily', salaryAmount: 650 };
    assert.equal((await request('/branch/staff', staffInput, center.cookie)).status, 403);
    assert.equal((await request('/branch/staff', staffInput, other.cookie)).status, 403);
    const createdStaff = await request('/branch/staff', staffInput, owner.cookie); assert.equal(createdStaff.status, 201);
    const person = (await createdStaff.json()).staff; assert.equal(person.dailyWage, 650); assert.equal(person.monthlySalary, 19500);
    const retriedStaff = await request('/branch/staff', staffInput, owner.cookie); assert.equal((await retriedStaff.json()).staff.id, person.id);
    assert.equal((await request('/branch/staff', { ...staffInput, fullName: 'Changed' }, owner.cookie)).status, 409);
    const monthlyProfile = { ...staffInput, salaryBasis: 'monthly', salaryAmount: 10000 };
    assert.equal((await request('/branch/staff/' + person.id + '/update', monthlyProfile, other.cookie)).status, 403);
    const changedStaff = await request('/branch/staff/' + person.id + '/update', monthlyProfile, owner.cookie); assert.equal(changedStaff.status, 200);
    const monthlyPerson = (await changedStaff.json()).bootstrap.staffList.find((p: { id: string }) => p.id === person.id);
    assert.equal(monthlyPerson.dailyWage, 333.33); assert.equal(monthlyPerson.monthlySalary, 10000); assert.equal(monthlyPerson.salaryBasis, 'monthly');
    const dailyPay = { ...payroll, clientRequestId: randomUUID(), staffId: person.id, amount: 333.33, paymentBasis: 'daily', staffPaymentType: 'yevmiye' };
    assert.equal((await request('/branch/expenses', { ...dailyPay, branchId: other.branchId }, other.cookie)).status, 400);
    const dailyPaid = await request('/branch/expenses', dailyPay, owner.cookie); assert.equal(dailyPaid.status, 201);
    const dailyExpense = (await dailyPaid.json()).expense; assert.equal(dailyExpense.paymentBasis, 'daily'); assert.equal(dailyExpense.staffName, 'Test Personel');
    const monthlyPay = { ...dailyPay, clientRequestId: randomUUID(), amount: 9999.99, paymentBasis: 'monthly', staffPaymentType: 'maas' };
    const monthlyPaid = await request('/branch/expenses', monthlyPay, owner.cookie); assert.equal(monthlyPaid.status, 201);
    const paid = await monthlyPaid.json(); assert.equal(paid.expense.amount, 9999.99); assert.equal(paid.expense.paymentBasis, 'monthly');
    assert.equal(paid.expense.staffMonthlySalary, 10000); assert.equal(paid.expense.staffDailyWage, 333.33);
    assert.equal(paid.bootstrap.staffPayments.length, 2); assert.equal(paid.bootstrap.staffPayments.find((p: { id: string }) => p.id === paid.expense.id).expenseId, paid.expense.id);
    assert.equal(paid.bootstrap.branches[0].dailyExpense, 10345.66);
    const repeatedMonthly = await request('/branch/expenses', monthlyPay, owner.cookie); assert.equal((await repeatedMonthly.json()).bootstrap.staffPayments.length, 2);
    await request('/branch/staff/' + person.id + '/update', { ...monthlyProfile, fullName: 'Renamed Person', salaryAmount: 15000 }, owner.cookie);
    const history = await request('/auth/me', undefined, owner.cookie); const historyData = await history.json();
    assert.equal(historyData.expenses.find((e: { id: string }) => e.id === paid.expense.id).staffName, 'Test Personel');
    assert.equal(historyData.expenses.find((e: { id: string }) => e.id === paid.expense.id).staffMonthlySalary, 10000);
    assert.equal((await request('/branch/staff/' + person.id + '/status', { status: 'passive' }, center.cookie)).status, 403);
    await request('/branch/staff/' + person.id + '/status', { status: 'passive' }, owner.cookie);
    assert.equal((await request('/branch/expenses', { ...dailyPay, clientRequestId: randomUUID() }, owner.cookie)).status, 400);
    const removedPayment = await request('/branch/expenses/' + paid.expense.id + '/delete', {}, owner.cookie);
    assert.equal((await removedPayment.json()).bootstrap.staffPayments.length, 1, 'archived expenses disappear from the derived payment history');
    const renamed = await request('/branch/expense-categories/cat-1/update', { branchId: owner.branchId, name: 'Ekip Ödemesi', type: 'single', defaultVatRate: 20 }, owner.cookie);
    assert.equal(renamed.status, 200);
    const renameData = await renamed.json();
    const historicalPayroll = renameData.bootstrap.expenses.find((expense: { id: string }) => expense.id === payrollData.expense.id);
    assert.equal(historicalPayroll.categoryName, 'Personel'); assert.equal(historicalPayroll.categoryType, 'staff_based', 'historical financial meaning must be preserved');
    const changedRules = await request('/branch/expenses', { ...payroll, clientRequestId: randomUUID(), vatRate: 20 }, owner.cookie);
    assert.equal(changedRules.status, 400); assert.match((await changedRules.json()).error, /fotoğraf/, 'new entries must follow the edited category type');
    const newCategory = { branchId: owner.branchId, name: 'Şube Özel Kalem', type: 'staff_based', description: 'Test custom category', iconName: 'Users', defaultVatRate: 20, isActive: true };
    assert.equal((await request('/branch/expense-categories', newCategory, center.cookie)).status, 403);
    assert.equal((await request('/branch/expense-categories', newCategory, other.cookie)).status, 403);
    const customResponse = await request('/branch/expense-categories', newCategory, owner.cookie); assert.equal(customResponse.status, 201);
    const custom = (await customResponse.json()).bootstrap.expenseCategories.find((category: { name: string }) => category.name === newCategory.name);
    assert.ok(custom); assert.equal(custom.defaultVatRate, 0); assert.equal(custom.isSystem, false);
    assert.equal((await request('/branch/expense-categories', { ...newCategory, name: 'Kasap & Et Ürünleri' }, owner.cookie)).status, 409);
    const foreignList = await request('/branch/expense-categories?branchId=' + other.branchId, undefined, other.cookie);
    assert.ok(!(await foreignList.json()).categories.some((category: { id: string }) => category.id === custom.id));
    assert.equal((await request('/branch/expense-categories/' + custom.id + '/update', { branchId: other.branchId, isActive: false }, other.cookie)).status, 404);
    assert.equal((await request('/branch/expenses', { ...payroll, branchId: other.branchId, clientRequestId: randomUUID(), categoryId: custom.id }, other.cookie)).status, 400);
    const customExpense = await request('/branch/expenses', { ...payroll, clientRequestId: randomUUID(), categoryId: custom.id }, owner.cookie); assert.equal(customExpense.status, 201);
    const customExpenseId = (await customExpense.json()).expense.id;
    const updatedCustom = await request('/branch/expense-categories/' + custom.id + '/update', { branchId: owner.branchId, name: 'Yeni Kalem Adı', isActive: false }, owner.cookie);
    assert.equal(updatedCustom.status, 200);
    const customHistory = (await updatedCustom.json()).bootstrap.expenses.find((expense: { id: string }) => expense.id === customExpenseId);
    assert.equal(customHistory.categoryName, newCategory.name);
    const restoredCategory = await request('/branch/expense-categories/cat-2/update', { branchId: owner.branchId, isActive: true }, owner.cookie); assert.equal(restoredCategory.status, 200);
    const reloadCategories = await request('/auth/me', undefined, owner.cookie);
    assert.equal((await reloadCategories.json()).expenseCategories.find((category: { id: string }) => category.id === custom.id).isActive, false, 'settings must survive reload');
    const otherPersonel = await request('/branch/expense-categories?branchId=' + other.branchId, undefined, other.cookie);
    assert.equal((await otherPersonel.json()).categories.find((category: { id: string }) => category.id === 'cat-1').name, 'Personel');
  } finally {
    for (const branchId of branches) {
      const photos = await appDataSource.query('SELECT bucket,object_key FROM receipt_files WHERE branch_id=?', [branchId]);
      for (const photo of photos) await removeReceiptObject(photo.bucket, photo.object_key);
      await appDataSource.query('DELETE FROM receipt_files WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM expenses WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM branch_expense_category_settings WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM expense_categories WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM staff WHERE branch_id=?', [branchId]);
      await appDataSource.query('DELETE FROM daily_revenues WHERE branch_id=?', [branchId]);
    }
    for (const userId of users) { await appDataSource.getRepository(SessionEntity).delete({ userId }); await appDataSource.getRepository(UserEntity).delete(userId); }
    for (const id of branches) await appDataSource.getRepository(BranchEntity).delete(id);
    for (const id of companies) await appDataSource.getRepository(CompanyEntity).delete(id);
    await new Promise<void>(resolve => server.close(() => resolve())); await appDataSource.destroy();
  }
});
