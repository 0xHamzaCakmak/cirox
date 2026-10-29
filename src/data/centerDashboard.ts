import type { Branch, DailyRevenueRecord, ExpenseRecord, ExpenseCategory } from '../types';
import { financialReport } from './financialReports';

export function centerDashboardSummary(branches: Branch[], revenues: DailyRevenueRecord[], expenses: ExpenseRecord[], today: string, categories: ExpenseCategory[] = []) {
  const daily = financialReport(branches, revenues, expenses, today, today, categories);
  const ids = new Set(branches.map(branch => branch.id));
  const cents = (values: number[]) => values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    const revenue = cents(revenues.filter(row => ids.has(row.branchId) && row.date === key).map(row => row.total));
    const expense = cents(expenses.filter(row => ids.has(row.branchId) && row.date === key).map(row => row.amount));
    return { date: key, day: date.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short' }),
      revenue, expense, net: Math.round((revenue - expense) * 100) / 100 };
  });
  const yesterday = trend[5].revenue;
  const highestBranch = [...daily.branches].filter(branch => branch.dailyRevenue > 0).sort((a, b) => b.dailyRevenue - a.dailyRevenue)[0];
  return {
    ...daily, trend, highestBranch,
    totalNet: Math.round((daily.totalRevenue - daily.totalExpense) * 100) / 100,
    branchCount: branches.length, activeCount: branches.filter(branch => branch.status === 'active').length,
    reviewCount: branches.filter(branch => branch.status === 'review').length,
    staffCount: branches.reduce((sum, branch) => sum + branch.staffCount, 0),
    weeklyRevenue: cents(trend.map(day => day.revenue)),
    revenueChange: yesterday > 0 ? (daily.totalRevenue - yesterday) / yesterday * 100 : daily.totalRevenue === 0 ? 0 : null,
    expenseRatio: daily.totalRevenue > 0 ? daily.totalExpense / daily.totalRevenue * 100 : 0,
    netMargin: daily.totalRevenue > 0 ? (daily.totalRevenue - daily.totalExpense) / daily.totalRevenue * 100 : 0,
  };
}

export type CenterDashboardSummary = ReturnType<typeof centerDashboardSummary>;
