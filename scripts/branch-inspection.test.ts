import assert from 'node:assert/strict';
import { test } from 'node:test';
import { branchInspectionRange, istanbulToday } from '../src/data/branchInspectionRange';
import { branchOverview } from '../src/data/branchOverview';
import { EMPTY_BRANCH } from '../src/data/emptyData';
import type { DailyRevenueRecord, ExpenseRecord, ExpenseCategory, Staff } from '../src/types';

test('today is the Istanbul business date, including UTC evenings on the previous date', () => {
  assert.equal(istanbulToday(new Date('2026-10-28T22:30:00Z')), '2026-10-29');
  assert.deepEqual(branchInspectionRange('today', '2026-10-29'), { start: '2026-10-29', end: '2026-10-29', custom: false, error: '' });
});
test('the last seven days includes today and the preceding six dates across year boundaries', () => {
  const range = branchInspectionRange('7days', '2026-01-01');
  assert.equal(range.start, '2025-12-26'); assert.equal(range.end, '2026-01-01');
});
test('rolling calendar-month periods clamp correctly at month ends and leap years', () => {
  assert.equal(branchInspectionRange('1month', '2026-03-31').start, '2026-02-28');
  assert.equal(branchInspectionRange('3months', '2026-05-31').start, '2026-02-28');
  assert.equal(branchInspectionRange('3months', '2024-05-31').start, '2024-02-29');
});
test('the yearly preset is the current calendar year to date', () => {
  const range = branchInspectionRange('year', '2026-10-29');
  assert.equal(range.start, '2026-01-01'); assert.equal(range.end, '2026-10-29');
});
test('two valid custom dates override the preset; incomplete or invalid dates do not', () => {
  assert.deepEqual(branchInspectionRange('year', '2026-10-29', '2025-01-01', '2025-01-31'), {
    start: '2025-01-01', end: '2025-01-31', custom: true, error: '',
  });
  for (const dates of [['2026-10-01', ''], ['2026-10-29', '2026-10-01'], ['2026-02-30', '2026-03-02']]) {
    const range = branchInspectionRange('today', '2026-10-29', ...dates as [string, string]);
    assert.equal(range.custom, false); assert.ok(range.error); assert.equal(range.start, '2026-10-29');
  }
});

const branch = { ...EMPTY_BRANCH, id: 'selected', name: 'Selected Branch' };
const rev = (branchId: string, date: string, total: number) => ({ id: branchId + date, branchId, date, total,
  creditCard: total, cash: 0, online: 0, other: 0 }) as DailyRevenueRecord;
const exp = (branchId: string, date: string, amount: number) => ({ id: branchId + date, branchId, date, amount,
  categoryId: 'staff', categoryName: 'Personel', categoryType: 'staff_based', paymentBasis: 'daily' }) as ExpenseRecord;
const categories = [{ id: 'staff', name: 'Personel', type: 'staff_based' }] as ExpenseCategory[];
const staff = [
  { id: 'one', branchId: branch.id, status: 'active' }, { id: 'two', branchId: branch.id, status: 'passive' },
  { id: 'other', branchId: 'unrelated', status: 'active' },
] as Staff[];
test('one branch summary aggregates both inclusive endpoints and excludes other branches and out-of-range records', () => {
  const revenues = [rev(branch.id, '2026-10-01', 100), rev(branch.id, '2026-10-29', 200), rev(branch.id, '2026-09-30', 777), rev('unrelated', '2026-10-10', 999)];
  const expenses = [exp(branch.id, '2026-10-01', 25), exp(branch.id, '2026-10-29', 50), exp(branch.id, '2026-10-30', 666), exp('unrelated', '2026-10-10', 888)];
  const summary = branchOverview(branch, '2026-10-01', revenues, expenses, categories, staff, '2026-10-29');
  assert.equal(summary.branch.dailyRevenue, 300); assert.equal(summary.branch.dailyExpense, 75); assert.equal(summary.branch.netProfit, 225);
  assert.equal(summary.branch.revenueBreakdown.creditCard, 300); assert.equal(summary.categories[0].value, 75);
  assert.equal(summary.staffPaid, 75); assert.equal(summary.dailyStaffPaid, 75); assert.equal(summary.branch.staffCount, 1);
  assert.equal(summary.transactions.length, 4); assert.equal(summary.profitMargin, 75);
});
test('the existing single-day branch summary remains a single-day calculation', () => {
  const summary = branchOverview(branch, '2026-10-29', [rev(branch.id, '2026-10-28', 999), rev(branch.id, '2026-10-29', 100)],
    [exp(branch.id, '2026-10-29', 25)], categories, staff);
  assert.equal(summary.branch.dailyRevenue, 100); assert.equal(summary.branch.dailyExpense, 25); assert.equal(summary.transactions.length, 2);
});
