import type { Branch, DailyRevenueRecord, ExpenseRecord, ExpenseCategory } from '../types';
import { isStaffExpense } from './expenseMath';
export function reportRange(period: 'today' | 'week' | 'month' | 'custom', today: string, start: string, end: string) {
  if (period === 'custom') return { start, end };
  const date = new Date(today + 'T12:00:00Z');
  if (period === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  if (period === 'month') date.setUTCDate(1);
  return { start: date.toISOString().slice(0, 10), end: today };
}
export function financialReport(branches: Branch[], revenues: DailyRevenueRecord[], expenses: ExpenseRecord[], start: string, end: string, definitions: ExpenseCategory[] = []) {
  const ids = new Set(branches.map(b => b.id));
  const inRange = (row: { branchId: string; date: string }) => ids.has(row.branchId) && !!start && !!end && row.date >= start && row.date <= end;
  const revenueRows = revenues.filter(inRange), expenseRows = expenses.filter(inRange);
  const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + Math.round(value(row) * 100), 0) / 100;
  const views = branches.map(branch => {
    const rev = revenueRows.filter(r => r.branchId === branch.id), exp = expenseRows.filter(e => e.branchId === branch.id);
    const dailyRevenue = sum(rev, r => r.total), dailyExpense = sum(exp, e => e.amount);
    return { ...branch, dailyRevenue, dailyExpense, netProfit: Math.round((dailyRevenue - dailyExpense) * 100) / 100,
      monthlyStaffCost: sum(exp.filter(isStaffExpense), e => e.amount), dailyTotalWage: sum(exp.filter(e => isStaffExpense(e) && e.paymentBasis === 'daily'), e => e.amount),
      revenueBreakdown: { creditCard: sum(rev, r => r.creditCard), cash: sum(rev, r => r.cash), online: sum(rev, r => r.online), other: sum(rev, r => r.other) } };
  });
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];
  const keyOf = (category: ExpenseCategory) => JSON.stringify([category.id, category.name]);
  const scoped = new Map<string, Map<string, ExpenseCategory>>();
  const categories = new Map<string, { id: string; label: string; cents: number; color: string; historical: boolean }>();
  for (const branch of branches) {
    const resolved = new Map<string, ExpenseCategory>();
    for (const category of definitions.filter(c => !c.branchId)) resolved.set(category.id, category);
    for (const category of definitions.filter(c => c.branchId === branch.id)) resolved.set(category.id, category);
    scoped.set(branch.id, resolved);
    for (const category of resolved.values()) {
      if (category.isActive === false) continue;
      const id = keyOf(category);
      // Stable colors when a category is added, hidden, renamed or re-sorted.
      const hash = Array.from(category.id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
      if (!categories.has(id)) categories.set(id, { id, label: category.name, cents: 0, color: colors[hash % colors.length], historical: false });
    }
  }
  for (const expense of expenseRows) {
    const definition = scoped.get(expense.branchId)?.get(expense.categoryId);
    const id = definition && definition.isActive !== false ? keyOf(definition) : 'historical';
    if (!categories.has(id)) categories.set(id, { id, label: 'Pasif kalemlerin geçmiş giderleri', cents: 0, color: '#64748b', historical: true });
    categories.get(id)!.cents += Math.round(expense.amount * 100);
  }
  const totalRevenue = sum(revenueRows, r => r.total), totalExpense = sum(expenseRows, e => e.amount);
  const categoryRows = [...categories.values()].map(({ cents, ...category }) => ({ ...category, value: cents / 100,
    expenseShare: totalExpense > 0 ? cents / (totalExpense * 100) * 100 : 0,
    revenueShare: totalRevenue > 0 ? cents / (totalRevenue * 100) * 100 : null,
  }));
  return { branches: views, categories: categoryRows,
    expenseComparison: [...categoryRows].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'tr')),
    totalRevenue, totalExpense, staffCost: sum(expenseRows.filter(isStaffExpense), e => e.amount),
    dailyStaffCost: sum(expenseRows.filter(e => isStaffExpense(e) && e.paymentBasis === 'daily'), e => e.amount),
    monthlyStaffCost: sum(expenseRows.filter(e => isStaffExpense(e) && e.paymentBasis === 'monthly'), e => e.amount) };
}
