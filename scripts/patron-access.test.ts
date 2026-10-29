import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolvePageForRole } from '../src/data/pageAccess';
import type { PageTab } from '../src/types';

const operationalPages: PageTab[] = ['revenue_entry', 'expenses', 'expense_new', 'expense_camera', 'expense_accounting',
  'expense_categories', 'expense_category_new', 'expense_category_edit',
  'staff', 'staff_new', 'staff_edit', 'staff_history', 'staff_payment', 'reports'];

test('patrons cannot open operational expense, personnel or report pages, including their subpages', () => {
  for (const page of operationalPages) assert.equal(resolvePageForRole('merkez', page), 'dashboard', page);
});

test('branch and super admin access to all operational pages remains available', () => {
  for (const role of ['sube', 'admin'] as const) {
    for (const page of operationalPages) assert.equal(resolvePageForRole(role, page), page, `${role}: ${page}`);
  }
});

test('patrons retain their overview, branch inspection and account settings', () => {
  for (const page of ['dashboard', 'branches', 'branch_detail', 'branch_transactions', 'settings'] as const) {
    assert.equal(resolvePageForRole('merkez', page), page);
  }
});
