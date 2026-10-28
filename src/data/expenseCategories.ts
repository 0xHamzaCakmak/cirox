import type { ExpenseCategory } from '../types';

export const entryExpenseCategories = (categories: ExpenseCategory[], branchId: string): ExpenseCategory[] =>
  categories.filter(category => category.isActive !== false && (!category.branchId || category.branchId === branchId));
