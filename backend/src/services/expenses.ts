import { appDataSource } from '../database/data-source';
import type { EntityManager } from 'typeorm';
import { publicReceipt, type ReceiptRow } from './revenue';

export interface CategoryRow { id: string; company_id: string | null; name: string; type: 'single' | 'staff_based'; icon_name: string; description: string; default_vat_rate: number | string; is_system: number | string; is_active: number | string }
export const publicCategory = (row: CategoryRow, branchId?: string) => ({ id: row.id, branchId, name: row.name, type: row.type,
  iconName: row.icon_name, description: row.description, defaultVatRate: Number(row.default_vat_rate), isSystem: Number(row.is_system) !== 0, isActive: Number(row.is_active) !== 0 });
export async function branchCategories(branch: { id: string; companyId: string }, manager: EntityManager = appDataSource.manager): Promise<CategoryRow[]> {
  return manager.query(`SELECT c.id,c.company_id,c.is_system,COALESCE(s.name,c.name) AS name,
    COALESCE(s.type,c.type) AS type,COALESCE(s.icon_name,c.icon_name) AS icon_name,
    COALESCE(s.description,c.description) AS description,COALESCE(s.default_vat_rate,c.default_vat_rate) AS default_vat_rate,
    COALESCE(s.is_active,1) AS is_active FROM expense_categories c LEFT JOIN branch_expense_category_settings s ON s.category_id=c.id AND s.branch_id=?
    WHERE c.company_id IS NULL OR (c.company_id=? AND (c.branch_id IS NULL OR c.branch_id=?)) ORDER BY c.is_system DESC,c.id`, [branch.id, branch.companyId, branch.id]);
}
export async function expenseCategories(branches: { id: string; companyId: string }[]) {
  if (!branches.length) {
    const rows: CategoryRow[] = await appDataSource.query('SELECT *,1 AS is_active FROM expense_categories WHERE company_id IS NULL ORDER BY id');
    return rows.map(row => publicCategory(row));
  }
  const rows = await Promise.all(branches.map(async branch => (await branchCategories(branch)).map(row => publicCategory(row, branch.id))));
  return rows.flat();
}
export async function expenseRecords(branchIds: string[]) {
  if (!branchIds.length) return [];
  const placeholders = branchIds.map(() => '?').join(',');
  const rows: { id: string; company_id: string; branch_id: string; branch_name: string; date: string; category_id: string; category_name: string; category_type: string;
    amount: string; vat_rate: number; description: string; receipt_number: string | null; staff_id: string | null; staff_name: string | null; created_at: Date;
    payment_basis: 'daily' | 'monthly' | null; staff_payment_type: 'yevmiye' | 'maas' | 'avans' | 'prim' | null;
    staff_daily_wage_snapshot: string | null; staff_monthly_salary_snapshot: string | null }[] = await appDataSource.query(`SELECT e.*, DATE_FORMAT(e.date,'%Y-%m-%d') AS date,
    b.name AS branch_name,COALESCE(e.category_name_snapshot,c.name) AS category_name,COALESCE(e.category_type_snapshot,c.type) AS category_type,COALESCE(e.staff_name_snapshot,s.full_name) AS staff_name FROM expenses e JOIN branches b ON b.id=e.branch_id
    JOIN expense_categories c ON c.id=e.category_id LEFT JOIN staff s ON s.id=e.staff_id
    WHERE e.deleted_at IS NULL AND e.branch_id IN (${placeholders}) ORDER BY e.date DESC,e.created_at DESC,e.id`, branchIds);
  const receipts: ReceiptRow[] = await appDataSource.query(`SELECT * FROM receipt_files WHERE expense_id IS NOT NULL AND branch_id IN (${placeholders})`, branchIds);
  return rows.map(row => {
    const photos = receipts.filter(photo => photo.expense_id === row.id).map(publicReceipt);
    return { id: row.id, companyId: row.company_id, branchId: row.branch_id, branchName: row.branch_name,
      categoryId: row.category_id, categoryName: row.category_name, categoryType: row.category_type as 'single' | 'staff_based',
      date: row.date, amount: Number(row.amount), vatRate: row.vat_rate, description: row.description,
      staffId: row.staff_id ?? undefined, staffName: row.staff_name ?? undefined, receiptNumber: row.receipt_number ?? undefined,
      paymentBasis: row.payment_basis ?? undefined, staffPaymentType: row.staff_payment_type ?? undefined,
      staffDailyWage: row.staff_daily_wage_snapshot == null ? undefined : Number(row.staff_daily_wage_snapshot),
      staffMonthlySalary: row.staff_monthly_salary_snapshot == null ? undefined : Number(row.staff_monthly_salary_snapshot),
      receipts: photos, receiptImage: photos[0]?.url, receiptFileName: photos[0]?.fileName, createdAt: row.created_at.toISOString() };
  });
}
export async function staffRecords(branchIds: string[]) {
  if (!branchIds.length) return [];
  const rows: Record<string, string>[] = await appDataSource.query(`SELECT s.*,b.name AS branch_name,DATE_FORMAT(s.hire_date,'%Y-%m-%d') AS hire_date FROM staff s
    JOIN branches b ON b.id=s.branch_id WHERE s.branch_id IN (${branchIds.map(() => '?').join(',')})`, branchIds);
  return rows.map((row: Record<string, string>) => ({ id: row.id, companyId: row.company_id, branchId: row.branch_id, branchName: row.branch_name,
    fullName: row.full_name, role: row.role, dailyWage: Number(row.daily_wage), monthlySalary: Number(row.monthly_salary), salaryBasis: row.salary_basis as 'daily' | 'monthly', status: row.status as 'active' | 'passive', phone: row.phone, hireDate: row.hire_date }));
}
