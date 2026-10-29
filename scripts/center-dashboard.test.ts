import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centerDashboardSummary } from '../src/data/centerDashboard';
import { EMPTY_BRANCH } from '../src/data/emptyData';
import type { DailyRevenueRecord, ExpenseRecord } from '../src/types';

const today = '2026-10-29';
const branches = [
  { ...EMPTY_BRANCH, id: 'a', name: 'Branch A', dailyRevenue: 99999, dailyExpense: 88888, staffCount: 3 },
  { ...EMPTY_BRANCH, id: 'b', name: 'Branch B', status: 'review' as const, staffCount: 2 },
];
const revenue = (branchId: string, date: string, total: number) => ({ branchId, date, total, creditCard: total, cash: 0, online: 0, other: 0 }) as DailyRevenueRecord;
const expense = (branchId: string, date: string, amount: number, staff = false) => ({ branchId, date, amount,
  categoryId: staff ? 'cat-1' : 'cat-2', categoryType: staff ? 'staff_based' : 'invoiced', paymentBasis: staff ? 'daily' : undefined }) as ExpenseRecord;

test('an empty ledger shows actual zeros rather than mock trends or cached branch amounts', () => {
  const summary = centerDashboardSummary(branches, [], [], today);
  assert.equal(summary.totalRevenue, 0); assert.equal(summary.totalExpense, 0); assert.equal(summary.totalNet, 0);
  assert.equal(summary.weeklyRevenue, 0); assert.equal(summary.revenueChange, 0);
  assert.equal(summary.highestBranch, undefined);
  assert.equal(summary.branchCount, 2); assert.equal(summary.activeCount, 1); assert.equal(summary.reviewCount, 1);
  assert.equal(summary.staffCount, 5);
  assert.ok(summary.trend.every(day => day.revenue === 0 && day.expense === 0 && day.net === 0));
});
test('daily totals and the seven-day trend share scope, real dates and cent precision', () => {
  const summary = centerDashboardSummary(branches, [
    revenue('a', today, 100.1), revenue('b', today, 50), revenue('a', '2026-10-28', 100),
    revenue('other-center', today, 90000), revenue('a', '2026-10-22', 777), revenue('a', '2026-10-30', 555),
  ], [expense('a', today, 75, true), expense('b', today, 125), expense('other-center', today, 80000)], today);
  assert.equal(summary.totalRevenue, 150.1); assert.equal(summary.totalExpense, 200); assert.equal(summary.totalNet, -49.9);
  assert.equal(summary.dailyStaffCost, 75); assert.equal(summary.weeklyRevenue, 250.1);
  assert.equal(summary.trend.length, 7); assert.equal(summary.trend[0].date, '2026-10-23'); assert.equal(summary.trend[6].date, today);
  assert.equal(summary.trend[6].revenue, summary.totalRevenue); assert.equal(summary.trend[6].expense, summary.totalExpense);
  assert.equal(summary.highestBranch?.id, 'a'); assert.equal(summary.branches[1].netProfit, -75);
});
test('a center with no linked branches remains zero without an invented branch or NaN ratios', () => {
  const summary = centerDashboardSummary([], [revenue('other', today, 20)], [expense('other', today, 5)], today);
  assert.equal(summary.branchCount, 0); assert.equal(summary.totalRevenue, 0); assert.equal(summary.staffCount, 0);
  assert.equal(summary.expenseRatio, 0); assert.equal(summary.netMargin, 0); assert.equal(summary.weeklyRevenue, 0);
  assert.ok(!JSON.stringify(summary).includes('null'), 'zero denominators must not create non-finite display values');
});
test('a new first revenue does not fabricate a percentage increase from zero', () => {
  const summary = centerDashboardSummary(branches, [revenue('a', today, 0.1), revenue('b', today, 0.2)], [], today);
  assert.equal(summary.totalRevenue, 0.3); assert.equal(summary.weeklyRevenue, 0.3);
  assert.equal(summary.revenueChange, null);
});
