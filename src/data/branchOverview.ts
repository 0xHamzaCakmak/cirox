import type { Branch, DailyRevenueRecord, ExpenseRecord, ExpenseCategory, Staff } from '../types';
import { financialReport } from './financialReports';
import { EMPTY_BRANCH } from './emptyData';

export function branchOverview(branch: Branch | undefined, date: string, revenues: DailyRevenueRecord[], expenses: ExpenseRecord[], categories: ExpenseCategory[], staff: Staff[]) {
  const scope = branch?.id ? [branch] : [];
  const report = financialReport(scope, revenues, expenses, date, date, categories);
  const month = financialReport(scope, [], expenses, date.slice(0, 7) + '-01', date, categories);
  const dailyExpenses = expenses.filter(row => !!branch?.id && row.branchId === branch.id && row.date === date);
  const dailyRevenues = revenues.filter(row => !!branch?.id && row.branchId === branch.id && row.date === date);
  const transactions = [
    ...dailyRevenues.map(row => ({ id: 'revenue-' + row.id, kind: 'revenue' as const, date: row.date, amount: row.total,
      title: 'Günlük Ciro', description: row.notes || 'POS, nakit, online ve diğer tahsilatlar', reference: row.submittedBy,
      timestamp: row.updatedAt || row.createdAt })),
    ...dailyExpenses.map(row => ({ id: 'expense-' + row.id, kind: 'expense' as const, date: row.date, amount: row.amount,
      title: row.categoryName, description: row.description, reference: row.staffName || row.receiptNumber || 'Genel', timestamp: row.createdAt })),
  ].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '') || a.id.localeCompare(b.id));
  return {
    branch: { ...(report.branches[0] || EMPTY_BRANCH),
      staffCount: staff.filter(person => !!branch?.id && person.branchId === branch.id && person.status === 'active').length },
    categories: report.categories, staffPaid: report.staffCost, monthlyStaffPaid: month.staffCost, transactions,
    profitMargin: report.totalRevenue > 0 ? Math.round((report.totalRevenue - report.totalExpense) / report.totalRevenue * 100) : null,
  };
}
