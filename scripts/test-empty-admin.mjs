import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Render the real application with the same empty data returned to the first admin.
// Replace only the context provider; all page and shared components remain real.
const bundle = await build({
  stdin: {
    contents: `export {default as App} from './src/App';
      export {MobileBranchActionModal} from './src/components/common/MobileBranchActionModal';
      export {AdminTenantsPage} from './src/components/pages/AdminTenantsPage';
      export {EMPTY_BRANCH, EMPTY_COMPANY} from './src/data/emptyData';
      export {expenseTotals} from './src/data/expenseMath';
      export {calculateWages} from './src/data/staffWages';
      export {financialReport, reportRange} from './src/data/financialReports';
      export {branchOverview} from './src/data/branchOverview';
      export {resolvePageForRole, homePage} from './src/data/pageAccess';
      export {api, ApiError, advanceSessionVersion} from './src/services/api';
      export {createClientId} from './src/services/clientId';`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  jsx: 'automatic',
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  plugins: [{
    name: 'empty-admin-context',
    setup(pluginBuild) {
      pluginBuild.onLoad({ filter: /[\\/]context[\\/]AppContext\.tsx$/ }, () => ({
        contents: `export const useApp = () => globalThis.__ciroxRenderContext;
          export const AppProvider = ({children}) => children;`, loader: 'js',
      }));
      pluginBuild.onLoad({ filter: /[\\/]pages[\\/]SettingsPage\.tsx$/ }, async ({ path }) => {
        const { readFile } = await import('node:fs/promises');
        return { contents: (await readFile(path, 'utf8')).replace("useState<'business' | 'integration' | 'masamqr' | 'users' | 'security'>('business')", "useState<'business' | 'integration' | 'masamqr' | 'users' | 'security'>(globalThis.__ciroxSettingsTab || 'business')"), loader: 'tsx' };
      });
      pluginBuild.onLoad({ filter: /[\\/]pages[\\/]BranchDetailPage\.tsx$/ }, async ({ path }) => {
        const { readFile } = await import('node:fs/promises');
        return { contents: (await readFile(path, 'utf8')).replace("useState<'overview' | 'siparis_integration' | 'transactions'>('overview')", "useState<'overview' | 'siparis_integration' | 'transactions'>(globalThis.__ciroxOverviewTab || 'overview')"), loader: 'tsx' };
      });
      pluginBuild.onLoad({ filter: /[\\/]pages[\\/](StaffPage|ExpensesPage)\.tsx$/ }, async ({ path }) => {
        const { readFile } = await import('node:fs/promises');
        const contents = (await readFile(path, 'utf8'))
          .replace("const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<Staff | null>(null);", "const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<Staff | null>(globalThis.__ciroxPersonnelForm ? staffList[0] : null);")
          .replace("useState('cat-2')", "useState(globalThis.__ciroxPersonnelForm ? 'cat-1' : 'cat-2')")
          .replace("const [formStaffId, setFormStaffId] = useState('');", "const [formStaffId, setFormStaffId] = useState(globalThis.__ciroxPersonnelForm ? staffList[0]?.id : '');");
        return { contents, loader: 'tsx' };
      });
      pluginBuild.onLoad({ filter: /[\\/]pages[\\/]AdminTenantsPage\.tsx$/ }, async ({ path }) => {
        const { readFile } = await import('node:fs/promises');
        const contents = (await readFile(path, 'utf8')).replace(
          'const [showCreateModal, setShowCreateModal] = useState(false);',
          'const [showCreateModal, setShowCreateModal] = useState(true);',
        );
        return { contents, loader: 'tsx' };
      });
    },
  }],
});
const compiled = { exports: {} };
const localRequire = createRequire(import.meta.url);
const requireForRender = id => {
  const actual = localRequire(id);
  if (id !== 'react/jsx-runtime') return actual;
  const capture = factory => (type, props, ...args) => {
    if (globalThis.__ciroxOverviewButtons && type === 'button' && props.onClick) globalThis.__ciroxOverviewButtons.push(props);
    return factory(type, props, ...args);
  };
  return { ...actual, jsx: capture(actual.jsx), jsxs: capture(actual.jsxs) };
};
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(requireForRender, compiled, compiled.exports);
const { App, AdminTenantsPage, MobileBranchActionModal, EMPTY_BRANCH, EMPTY_COMPANY, expenseTotals, createClientId, calculateWages, financialReport, reportRange, branchOverview, resolvePageForRole, homePage, api, ApiError, advanceSessionVersion } = compiled.exports;
const state = {
  currentUser: { id: 'test-admin', name: 'Admin', email: 'admin@example.test', role: 'admin', title: 'Admin' },
  isLoggedIn: true,
  companies: [], branches: [], activeCompanyId: '', selectedBranchId: '',
  activeCompany: EMPTY_COMPANY, selectedBranch: EMPTY_BRANCH,
  dailyRevenueRecords: [], expenses: [], expenseCategories: [], staffList: [], staffPayments: [],
  registeredUsers: [], payments: [], notification: null, activeTab: 'admin_tenants',
};
globalThis.__ciroxRenderContext = new Proxy(state, { get: (target, key) => key in target ? target[key] : () => {} });
try {
  for (const activeTab of ['admin_tenants', 'admin_billing', 'dashboard', 'branches', 'branch_detail', 'revenue_entry', 'expenses', 'expense_new', 'expense_camera', 'expense_accounting', 'expense_categories', 'expense_category_new', 'expense_category_edit', 'staff', 'staff_new', 'staff_edit', 'staff_history', 'staff_payment', 'reports', 'settings']) {
    state.activeTab = activeTab;
    const html = renderToString(React.createElement(App));
    assert.ok(html.length > 0);
    if (activeTab === 'admin_tenants') assert.ok(html.includes('Aboneler'));
    console.log(`PASS: first admin without companies or branches: ${activeTab}`);
  }
  assert.equal(renderToString(React.createElement(MobileBranchActionModal, { isOpen: false, onClose() {} })), '');
  assert.equal(renderToString(React.createElement(MobileBranchActionModal, { isOpen: true, onClose() {} })), '');
  console.log('PASS: closed/open fast-action modal without a branch');
  const branch = { ...EMPTY_BRANCH, id: 'test-branch', name: 'Test Branch', companyId: 'test-company' };
  state.branches = [branch];
  state.selectedBranch = branch;
  state.selectedBranchId = branch.id;
  assert.ok(renderToString(React.createElement(MobileBranchActionModal, { isOpen: true, onClose() {} })).includes('Test Branch'));
  console.log('PASS: fast-action modal still renders when a branch exists');
  const center = { ...EMPTY_COMPANY, id: 'test-center', name: 'Existing Center', kind: 'center' };
  const business = { ...EMPTY_COMPANY, id: 'test-business', name: 'Independent Business', kind: 'business' };
  state.companies = [center, business];
  const html = renderToString(React.createElement(AdminTenantsPage));
  const centerSelect = [...html.matchAll(/<select[^>]*>([\s\S]*?)<\/select>/g)]
    .map(match => match[1]).find(options => options.includes('Bağımsız işletme'));
  assert.ok(centerSelect, 'creation form must expose the optional center selector');
  assert.ok(centerSelect.includes('Existing Center'));
  assert.ok(!centerSelect.includes('Independent Business'), 'business tenants must not be offered as monitoring centers');
  assert.match(centerSelect, /<option value="" selected="">/);
  assert.ok(!html.includes('Yeni Merkez / Marka Adı'));
  assert.ok(html.includes('Kullanıcı Adı *'));
  assert.ok(!html.includes('İşletme Kodu'));
  console.log('PASS: business creation defaults to no center and lists only existing centers');
  state.currentUser = { id: 'test-owner', name: 'Test Owner', email: 'owner@example.test', username: 'test_owner', role: 'sube', title: 'Owner', branchId: branch.id };
  state.activeTab = 'revenue_entry';
  const branchHtml = renderToString(React.createElement(App));
  assert.ok(branchHtml.includes('CIROX'));
  assert.ok(branchHtml.includes('CIROX logosu'));
  assert.ok(branchHtml.includes('Şube Bilgileri'));
  assert.ok(!branchHtml.includes('Merkez Modu'));
  assert.ok(!branchHtml.includes('Süper Admin'));
  assert.ok(branchHtml.includes('Kamerayı Aç &amp; Çek'));
  assert.ok(branchHtml.includes('Dosya Seç'));
  assert.ok(branchHtml.includes('step="0.01"'));
  assert.ok(branchHtml.includes('revenue-entry'));
  assert.ok(branchHtml.includes('Gider Kalemleri'));
  console.log('PASS: CIROX branch identity, photo controls and decimal revenue form');
  for (const activeTab of ['expense_new', 'expense_camera', 'expense_accounting']) {
    state.activeTab = activeTab;
    const fullPage = renderToString(React.createElement(App));
    assert.ok(fullPage.includes('Giderlere Dön'));
    assert.ok(!fullPage.includes('fixed inset-0 z-50 bg-black/75'));
    assert.ok(!fullPage.includes('accounting-page fixed'));
    assert.ok(!fullPage.includes('ANADOLU LEZZETLERİ'));
    assert.ok(!fullPage.includes('0710849201'));
    console.log(`PASS: full-page expense workflow and back control: ${activeTab}`);
  }
  const entries = [
    { amount: 120, vatRate: 20, categoryId: 'cat-2', receiptImage: '/image' },
    { amount: 101, vatRate: 1, categoryId: 'cat-2', receiptImage: '/image' },
    { amount: 110, vatRate: 10, categoryId: 'cat-3', receiptImage: '/image' },
    { amount: 123.45, vatRate: 0, categoryId: 'cat-9', receiptImage: '/image' },
    { amount: 50, vatRate: 0, categoryId: 'cat-1' },
  ];
  const totals = expenseTotals(entries);
  assert.equal(totals.totalAmount, 504.45);
  assert.equal(totals.vatBreakdown.totalVat, 31);
  assert.equal(totals.staffAmount, 50);
  assert.equal(totals.invoicedAmount, 454.45);
  assert.equal(expenseTotals([{ amount: 123.45, vatRate: 20, categoryId: 'cat-9' }]).vatBreakdown.totalVat, 20.58);
  console.log('PASS: accounting gross/VAT calculations retain kuruş precision and zero VAT');
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
  try {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    assert.match(createClientId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis.crypto, 'randomUUID', cryptoDescriptor);
    else delete globalThis.crypto.randomUUID;
  }
  console.log('PASS: local-network mobile pages can create request IDs without crypto.randomUUID');
  state.activeTab = 'expense_accounting';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  state.expenses = [
    { ...entries[0], id: 'today', branchId: branch.id, branchName: branch.name, categoryName: 'Test', description: 'Current period expense', date: today, createdAt: today },
    { ...entries[0], id: 'old', branchId: branch.id, branchName: branch.name, categoryName: 'Test', description: 'Historical expense outside period', date: '2000-01-01', createdAt: '2000-01-01' },
  ];
  const accounting = renderToString(React.createElement(App));
  assert.ok(accounting.includes('Current period expense'));
  assert.ok(!accounting.includes('Historical expense outside period'));
  console.log('PASS: accounting report filters the real current month');
  state.expenseCategories = [
    { id: 'cat-2', branchId: branch.id, name: 'Active Category', type: 'single', description: 'Active', iconName: 'Tags', isSystem: true, isActive: true, defaultVatRate: 20 },
    { id: 'cat-9', branchId: branch.id, name: 'Hidden Category', type: 'single', description: 'Hidden', iconName: 'Tags', isSystem: true, isActive: false, defaultVatRate: 0 },
    { id: 'foreign', branchId: 'other-branch', name: 'Foreign Category', type: 'single', description: 'Foreign', iconName: 'Tags', isActive: true, defaultVatRate: 20 },
  ];
  state.activeTab = 'expense_categories';
  const cards = renderToString(React.createElement(App));
  assert.ok(cards.includes('Active Category') && cards.includes('Hidden Category'));
  assert.ok(!cards.includes('Foreign Category'));
  assert.ok(cards.includes('aria-label="Gizle: Active Category"'));
  assert.ok(cards.includes('aria-label="Etkinleştir: Hidden Category"'));
  assert.ok(cards.includes('Gizli — kullanılmıyor'));
  state.activeTab = 'expense_new';
  const picker = renderToString(React.createElement(App));
  assert.ok(picker.includes('Active Category'));
  assert.ok(!picker.includes('Hidden Category') && !picker.includes('Foreign Category'));
  state.expenseCategories = state.expenseCategories.map(category => ({ ...category, isActive: false }));
  const emptyPicker = renderToString(React.createElement(App));
  assert.ok(emptyPicker.includes('Aktif gider kalemi yok'));
  assert.equal(expenseTotals([{ amount: 120, vatRate: 20, categoryId: 'cat-1', categoryType: 'single', receiptImage: '/image' }]).vatBreakdown.totalVat, 20);
  console.log('PASS: branch category menu, visibility toggles, branch-scoped active picker and all-hidden state');
  for (const activeTab of ['expense_category_new', 'expense_category_edit', 'staff_new', 'staff_edit']) {
    state.activeTab = activeTab;
    const page = renderToString(React.createElement(App));
    assert.ok(page.includes(activeTab.startsWith('staff') ? 'Personel Listesine Dön' : 'Gider Kalemlerine Dön'));
    assert.ok(!page.includes('fixed inset-0 z-50 bg-black/70'), 'editor must render inside the page');
  }
  assert.deepEqual(calculateWages('daily', 650), { dailyWage: 650, monthlySalary: 19500 });
  assert.deepEqual(calculateWages('monthly', 10000), { dailyWage: 333.33, monthlySalary: 10000 });
  assert.deepEqual(reportRange('week', '2026-10-28', '', ''), { start: '2026-10-26', end: '2026-10-28' });
  const payrollRows = [
    { branchId: branch.id, date: '2026-10-27', categoryId: 'cat-1', categoryName: 'Personel', categoryType: 'staff_based', amount: 10000, paymentBasis: 'monthly' },
    { branchId: branch.id, date: '2026-10-28', categoryId: 'cat-1', categoryName: 'Personel', categoryType: 'staff_based', amount: 333.33, paymentBasis: 'daily' },
    { branchId: 'foreign', date: '2026-10-28', categoryId: 'cat-1', categoryName: 'Personel', amount: 999 },
  ];
  const dailyReport = financialReport([branch], [], payrollRows, '2026-10-28', '2026-10-28');
  assert.equal(dailyReport.totalExpense, 333.33); assert.equal(dailyReport.monthlyStaffCost, 0);
  const monthReport = financialReport([branch], [], payrollRows, '2026-10-01', '2026-10-31');
  assert.equal(monthReport.totalExpense, 10333.33); assert.equal(monthReport.monthlyStaffCost, 10000); assert.equal(monthReport.staffCost, 10333.33);
  assert.equal(financialReport([branch], [], payrollRows, '2026-10-31', '2026-10-01').totalExpense, 0);
  console.log('PASS: full-page category/staff editors, 30-day salary conversion and dated actual-payment reports');
  globalThis.__ciroxPersonnelForm = true;
  state.staffList = [{ id: 'test-person', branchId: branch.id, branchName: branch.name, fullName: 'Test Person', role: 'Garson', status: 'active', dailyWage: 333.33, monthlySalary: 10000 }];
  state.expenseCategories = [{ id: 'cat-1', branchId: branch.id, name: 'Personel', type: 'staff_based', isActive: true, defaultVatRate: 0 }];
  for (const activeTab of ['staff_payment', 'expense_new']) {
    state.activeTab = activeTab;
    const page = renderToString(React.createElement(App));
    assert.ok(page.includes('Ödeme Dönemi'));
    assert.ok(page.includes('value="daily"') && page.includes('value="monthly"'));
    assert.ok(!page.includes('fixed inset-0 z-60 bg-black/80'));
  }
  console.log('PASS: daily/monthly selectors render in both personnel payment entry points');
  delete globalThis.__ciroxPersonnelForm;
  const categories = [
    { id: 'cat-1', branchId: branch.id, name: 'Personel', type: 'staff_based', isSystem: true, isActive: true },
    { id: 'cat-2', branchId: branch.id, name: 'Kasap', type: 'single', isSystem: true, isActive: true },
    { id: 'cat-3', branchId: branch.id, name: 'İçecek', type: 'single', isSystem: true, isActive: true },
    { id: 'custom', branchId: branch.id, name: 'Yeni Gider', type: 'single', isActive: true },
    { id: 'unused', branchId: branch.id, name: 'Henüz Kullanılmayan Kalem', type: 'single', isActive: true },
    { id: 'hidden', branchId: branch.id, name: 'Gizli Kalem', type: 'single', isActive: false },
    { id: 'foreign', branchId: 'other-branch', name: 'Yabancı Kalem', type: 'single', isActive: true },
  ];
  const exampleExpenses = [1000, 500, 250, 250].map((amount, i) => ({
    id: 'report-' + i, branchId: branch.id, date: today, categoryId: categories[i].id,
    categoryName: i === 1 ? 'Eski Kasap Adı' : categories[i].name, amount,
  }));
  const exampleRevenues = [{ branchId: branch.id, date: today, creditCard: 5000, cash: 0, online: 0, other: 0, total: 5000 }];
  const comparison = financialReport([branch], exampleRevenues, exampleExpenses, today, today, categories);
  assert.equal(comparison.totalExpense, 2000); assert.equal(comparison.totalRevenue, 5000);
  assert.deepEqual(comparison.expenseComparison.map(c => c.value), [1000, 500, 250, 250, 0]);
  assert.equal(comparison.expenseComparison[0].revenueShare, 20);
  assert.equal(comparison.expenseComparison[0].expenseShare, 50);
  assert.equal(comparison.categories.find(c => c.label === 'Kasap').value, 500, 'renamed categories retain their real historic spending by ID');
  assert.ok(!comparison.categories.some(c => ['Eski Kasap Adı', 'Gizli Kalem', 'Yabancı Kalem'].includes(c.label)));
  const emptyCategories = financialReport([branch], [], [], today, today, categories);
  assert.equal(emptyCategories.categories.length, 5); assert.ok(emptyCategories.categories.every(c => c.value === 0 && c.revenueShare === null && c.expenseShare === 0));
  const withHistorical = financialReport([branch], [], [...exampleExpenses, { ...exampleExpenses[0], categoryId: 'hidden', categoryName: 'Gizli Kalem', amount: 100 }], today, today, categories);
  assert.equal(withHistorical.categories.reduce((sum, c) => sum + c.value, 0), withHistorical.totalExpense);
  assert.equal(withHistorical.categories.find(c => c.historical).value, 100);
  assert.equal(financialReport([branch], [], [], today, today, [...categories, { ...categories[4], id: 'newly-added', name: 'Anlık Eklenen Kalem' }]).categories.length, 6);
  state.expenseCategories = categories; state.expenses = exampleExpenses; state.dailyRevenueRecords = exampleRevenues;
  state.activeTab = 'reports';
  const reportHtml = renderToString(React.createElement(App)).replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(reportHtml.includes('Gider Kalemleri Karşılaştırması'));
  assert.ok(reportHtml.includes('Yeni Gider') && reportHtml.includes('Henüz Kullanılmayan Kalem'));
  assert.ok(reportHtml.includes('Ciroya oran: %20') && reportHtml.includes('Toplam gidere oran: %50'));
  assert.ok(reportHtml.includes('aria-valuenow="50"'));
  assert.ok(!reportHtml.includes('Şube Ciro ve Kar Karşılaştırması') && !reportHtml.includes('Tüm Şubeler ('));
  assert.ok(reportHtml.indexOf('Harcama: 1.000') < reportHtml.indexOf('Harcama: 500'));
  assert.ok(!reportHtml.includes('0.00M'));
  state.currentUser = { ...state.currentUser, role: 'merkez' };
  const centerReport = renderToString(React.createElement(App));
  assert.ok(centerReport.includes('Şube Ciro ve Kar Karşılaştırması'));
  assert.ok(!centerReport.includes('Gider Kalemleri Karşılaştırması'));
  console.log('PASS: active/default/custom categories, zero spending, rename history, expense ratios and branch/center report separation');
  state.currentUser = { ...state.currentUser, role: 'sube', name: 'Own Account', username: 'own_account', email: 'own@example.test' };
  state.branches = [{ ...branch, legalName: 'Gerçek Şube Unvanı', contactEmail: 'branch@example.test', phone: '05321234567' }];
  state.activeTab = 'settings';
  for (const tab of ['business', 'users', 'integration', 'masamqr', 'security']) {
    globalThis.__ciroxSettingsTab = tab;
    const settings = renderToString(React.createElement(App));
    assert.ok(settings.includes('settings-page') && !settings.includes('space-y-6 max-w-5xl mx-auto'));
    assert.ok(settings.includes('MasaM QR Entegrasyonu'));
    if (tab === 'business') {
      assert.ok(settings.includes('Gerçek Şube Unvanı') && settings.includes('branch@example.test'));
      assert.ok(settings.includes('Şube İletişim E-Posta') && !settings.includes('Merkez Çağrı'));
      assert.ok(!settings.includes('Anadolu Lezzetleri'));
    }
    if (tab === 'users') {
      assert.ok(settings.includes('Own Account') && settings.includes('own_account'));
      assert.ok(settings.includes('Mevcut Şifre') && settings.includes('new-password'));
      assert.ok(!settings.includes('Yeni Kullanıcı Davet Et') && !settings.includes('Merkez Finans Direktörü'));
      assert.ok(settings.includes('form="settings-profile"'));
    }
    if (tab === 'integration' || tab === 'masamqr') assert.ok(settings.includes('Demo · Veri Çekilmiyor'));
    if (tab === 'masamqr') assert.ok(settings.includes('Yemek Kartları') && settings.includes('masam-endpoint'));
    if (tab === 'security') assert.ok(settings.includes('Sessiz Sapma Monitörü'));
  }
  delete globalThis.__ciroxSettingsTab;
  console.log('PASS: full-width settings, real branch data, own account only, password form and disconnected demo integrations');
  const summaryBranch = { ...branch, dailyRevenue: 999999, dailyExpense: 888888, staffCount: 99 };
  const summaryStaff = [
    { id: 'active', branchId: branch.id, status: 'active' },
    { id: 'passive', branchId: branch.id, status: 'passive' },
    { id: 'foreign-person', branchId: 'foreign', status: 'active' },
  ];
  const summaryExpenses = [...exampleExpenses,
    { ...exampleExpenses[0], id: 'old-expense', date: '2000-01-01', amount: 99999 },
    { ...exampleExpenses[0], id: 'foreign-expense', branchId: 'foreign', amount: 99999 },
  ];
  const summaryRevenues = [...exampleRevenues,
    { ...exampleRevenues[0], id: 'old-revenue', date: '2000-01-01', total: 99999 },
    { ...exampleRevenues[0], id: 'foreign-revenue', branchId: 'foreign', total: 99999 },
  ];
  const summary = branchOverview(summaryBranch, today, summaryRevenues, summaryExpenses, categories, summaryStaff);
  assert.equal(summary.branch.dailyRevenue, 5000); assert.equal(summary.branch.dailyExpense, 2000);
  assert.equal(summary.branch.netProfit, 3000); assert.equal(summary.profitMargin, 60);
  assert.equal(summary.branch.staffCount, 1); assert.equal(summary.staffPaid, 1000); assert.equal(summary.monthlyStaffPaid, 1000);
  assert.equal(summary.transactions.length, 5); assert.equal(summary.categories.reduce((sum, c) => sum + c.value, 0), 2000);
  const emptySummary = branchOverview(summaryBranch, '1999-01-01', summaryRevenues, summaryExpenses, categories, []);
  assert.equal(emptySummary.profitMargin, null); assert.equal(emptySummary.transactions.length, 0); assert.equal(emptySummary.branch.staffCount, 0);
  assert.equal(branchOverview(undefined, today, summaryRevenues, summaryExpenses, categories, summaryStaff).branch.dailyRevenue, 0);
  assert.equal(branchOverview(summaryBranch, today, [], exampleExpenses, categories, []).branch.netProfit, -2000);
  state.branches = [summaryBranch]; state.staffList = summaryStaff; state.dailyRevenueRecords = summaryRevenues; state.expenses = summaryExpenses;
  state.activeTab = 'branch_detail'; globalThis.__ciroxOverviewButtons = [];
  const summaryHtml = renderToString(React.createElement(App)).replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(summaryHtml.includes('5.000') && summaryHtml.includes('2.000') && summaryHtml.includes('3.000') && summaryHtml.includes('%60'));
  assert.ok(summaryHtml.includes('Yeni Gider') && !summaryHtml.includes('NaN') && !summaryHtml.includes('999.999'));
  assert.ok(summaryHtml.includes('value="' + today + '"'));
  const textOf = node => Array.isArray(node) ? node.map(textOf).join('') : node && typeof node === 'object' ? textOf(node.props?.children) : String(node ?? '');
  const navigated = [], selected = [];
  state.setActiveTab = tab => navigated.push(tab); state.setSelectedBranchId = id => selected.push(id);
  // Re-render so callbacks capture the actual navigation spies.
  globalThis.__ciroxOverviewButtons = []; renderToString(React.createElement(App));
  for (const label of ['Hızlı Ciro Girişi', 'Gider / Fatura Ekle', 'Kamera ile Fiş Çek']) {
    const button = globalThis.__ciroxOverviewButtons.find(button => textOf(button.children).includes(label));
    assert.ok(button && !button.disabled); button.onClick();
  }
  assert.deepEqual(navigated, ['revenue_entry', 'expense_new', 'expense_camera']);
  assert.deepEqual(selected, [branch.id, branch.id, branch.id]);
  state.currentUser = { ...state.currentUser, role: 'merkez' }; globalThis.__ciroxOverviewButtons = [];
  renderToString(React.createElement(App));
  const centerAction = globalThis.__ciroxOverviewButtons.find(button => textOf(button.children).includes('Hızlı Ciro Girişi'));
  assert.equal(centerAction.disabled, true); centerAction.onClick(); assert.equal(navigated.length, 3);
  state.currentUser = { ...state.currentUser, role: 'sube' };
  delete state.setActiveTab; delete state.setSelectedBranchId; delete globalThis.__ciroxOverviewButtons;
  globalThis.__ciroxOverviewTab = 'transactions';
  const movements = renderToString(React.createElement(App));
  assert.ok(!movements.includes('11 Eyl 2026') && !movements.includes('old-expense') && !movements.includes('99.999'));
  state.expenses = []; state.dailyRevenueRecords = [];
  const noMovements = renderToString(React.createElement(App));
  assert.ok(noMovements.includes('Seçilen tarihte ciro veya gider kaydı bulunmuyor.'));
  delete globalThis.__ciroxOverviewTab;
  console.log('PASS: branch/day scoped summary, active staff, actual payments, no fabricated transactions and full-page quick-action navigation');
  assert.equal(resolvePageForRole(null, 'admin_tenants'), null);
  assert.equal(resolvePageForRole('unknown', 'dashboard'), null);
  assert.equal(resolvePageForRole('sube', 'admin_tenants'), 'revenue_entry');
  assert.equal(resolvePageForRole('merkez', 'admin_billing'), 'dashboard');
  assert.equal(resolvePageForRole('merkez', 'expense_new'), 'dashboard');
  assert.equal(resolvePageForRole('sube', 'expense_new'), 'expense_new');
  assert.equal(resolvePageForRole('admin', 'admin_tenants'), 'admin_tenants');
  assert.equal(homePage('merkez'), 'dashboard');
  state.activeTab = 'admin_tenants';
  const blockedAdmin = renderToString(React.createElement(App));
  assert.ok(blockedAdmin.includes('Günlük Ciro Giriş Formu') && !blockedAdmin.includes('Yeni İşletme / Lisans Ekle'));
  state.isLoggedIn = false;
  for (const activeTab of ['admin_tenants', 'dashboard', 'revenue_entry', 'expenses', 'staff', 'reports', 'settings']) {
    state.activeTab = activeTab;
    const denied = renderToString(React.createElement(App));
    assert.ok(denied.includes('Kullanıcı Adı veya E-posta') && !denied.includes('app-shell'));
    assert.ok(denied.includes('CIROX logosu') && !denied.includes('Demo Merkez') && !denied.includes('Hızlı Demo') && !denied.includes('ŞA'));
  }
  console.log('PASS: all protected pages require a verified session; role-only navigation and login without demo access');
  const previousFetch = globalThis.fetch, previousWindow = globalThis.window;
  let expiredEvents = 0;
  try {
    globalThis.window = { dispatchEvent(event) { if (event.type === 'cirox:session-expired') expiredEvents++; } };
    const respond = (status, body) => { globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); };
    respond(401, { error: 'Session missing', code: 'AUTH_REQUIRED' });
    await assert.rejects(() => api('/auth/me'), error => error instanceof ApiError && error.status === 401);
    assert.equal(expiredEvents, 1);
    respond(403, { error: 'Account disabled', code: 'AUTH_REVOKED' });
    await assert.rejects(() => api('/auth/me')); assert.equal(expiredEvents, 2);
    respond(401, { error: 'Mevcut şifre hatalı.' });
    await assert.rejects(() => api('/settings/profile', {})); assert.equal(expiredEvents, 2, 'wrong current password must not expire a valid session');
    respond(403, { error: 'Insufficient role' });
    await assert.rejects(() => api('/admin/tenants')); assert.equal(expiredEvents, 2);
    let completeOldRequest;
    globalThis.fetch = () => new Promise(resolve => { completeOldRequest = resolve; });
    const staleRequest = api('/auth/me');
    advanceSessionVersion();
    completeOldRequest(new Response(JSON.stringify({ error: 'Old session', code: 'AUTH_REQUIRED' }), { status: 401 }));
    await assert.rejects(() => staleRequest); assert.equal(expiredEvents, 2, 'a delayed old-session response must not invalidate a new login');
  } finally { globalThis.fetch = previousFetch; if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
  console.log('PASS: session-required/revoked API responses invalidate the UI; credential and permission errors preserve the session');
  const realBundle = await build({ entryPoints: ['src/App.tsx'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, jsx: 'automatic', define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
  const realModule = { exports: {} };
  new Function('require', 'module', 'exports', realBundle.outputFiles[0].text)(localRequire, realModule, realModule.exports);
  const realLogin = renderToString(React.createElement(realModule.exports.default));
  assert.ok(realLogin.includes('CIROX logosu') && realLogin.includes('Kullanıcı Adı veya E-posta'));
  assert.ok(!realLogin.includes('app-shell') && !realLogin.includes('Demo Merkez') && !realLogin.includes('Hızlı Demo'));
  console.log('PASS: real provider starts logged out with empty account data and credential-only login');
  state.currentUser = null;
  const loginHtml = renderToString(React.createElement(App));
  assert.ok(loginHtml.includes('Kullanıcı Adı veya E-posta'));
  assert.match(loginHtml, /type="text"[^>]*autoComplete="username"/);
  console.log('PASS: login field accepts usernames without browser email validation');
} finally {
  delete globalThis.__ciroxOverviewTab;
  delete globalThis.__ciroxOverviewButtons;
  delete globalThis.__ciroxSettingsTab;
  delete globalThis.__ciroxPersonnelForm;
  delete globalThis.__ciroxRenderContext;
}
