import type { ExpenseRecord } from '../types';

export const isStaffExpense = (expense: ExpenseRecord) => expense.categoryType ? expense.categoryType === 'staff_based' : expense.categoryId === 'cat-1' || !!expense.staffId;
export function expenseTotals(expenses: ExpenseRecord[]) {
  let total = 0, staff = 0, invoiced = 0;
  const vat: Record<number, number> = { 0: 0, 1: 0, 10: 0, 20: 0 };
  for (const expense of expenses) {
    const cents = Math.round(expense.amount * 100); total += cents;
    if (isStaffExpense(expense)) staff += cents;
    else if (expense.receiptImage || expense.receipts?.length) invoiced += cents;
    const rate = isStaffExpense(expense) ? 0 : expense.vatRate ?? 0;
    vat[rate] = (vat[rate] ?? 0) + Math.round(cents * rate / (100 + rate));
  }
  return { totalAmount: total / 100, staffAmount: staff / 100, invoicedAmount: invoiced / 100,
    vatBreakdown: { vat1: vat[1] / 100, vat10: vat[10] / 100, vat20: vat[20] / 100, totalVat: Object.values(vat).reduce((sum, cents) => sum + cents, 0) / 100 } };
}
