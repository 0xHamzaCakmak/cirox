import type { PageTab, UserRole } from '../types';

const shared: PageTab[] = ['dashboard', 'branch_detail', 'revenue_entry', 'expenses', 'expense_accounting', 'expense_categories', 'staff', 'staff_history', 'reports', 'settings'];
const access: Record<UserRole, ReadonlySet<PageTab>> = {
  admin: new Set([...shared, 'admin_tenants', 'admin_billing', 'branches', 'expense_new', 'expense_camera', 'expense_category_new', 'expense_category_edit', 'staff_new', 'staff_edit', 'staff_payment']),
  merkez: new Set([...shared, 'branches']),
  sube: new Set([...shared, 'expense_new', 'expense_camera', 'expense_category_new', 'expense_category_edit', 'staff_new', 'staff_edit', 'staff_payment']),
};
export function homePage(role: UserRole): PageTab {
  return role === 'admin' ? 'admin_tenants' : role === 'merkez' ? 'dashboard' : 'revenue_entry';
}
export function resolvePageForRole(role: UserRole | null | undefined, page: PageTab): PageTab | null {
  if (!role || !Object.prototype.hasOwnProperty.call(access, role)) return null;
  return access[role].has(page) ? page : homePage(role);
}
