import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Pages
import { LoginPage } from './components/pages/LoginPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { BranchesPage } from './components/pages/BranchesPage';
import { BranchDetailPage } from './components/pages/BranchDetailPage';
import { DailyRevenueEntryPage } from './components/pages/DailyRevenueEntryPage';
import { ExpensesPage } from './components/pages/ExpensesPage';
import { ExpenseCategoriesPage } from './components/pages/ExpenseCategoriesPage';
import { StaffPage } from './components/pages/StaffPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { AdminTenantsPage } from './components/pages/AdminTenantsPage';
import { AdminBillingPage } from './components/pages/AdminBillingPage';
import { AdminBusinessManagementPage } from './components/pages/AdminBusinessManagementPage';
import { resolvePageForRole } from './data/pageAccess';
import { useBranchTheme } from './hooks/useBranchTheme';
import { PatronMobileDrawer } from './components/common/PatronMobileDrawer';

const AppContent: React.FC = () => {
  const { currentUser, viewUser, activeTab, isLoggedIn, isAdminCustomerView } = useApp();
  const { theme, toggleTheme } = useBranchTheme();
  const { theme: centerTheme, toggleTheme: toggleCenterTheme } = useBranchTheme('cirox:center-theme');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => {
    if (currentUser?.role !== 'merkez') return;
    const tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = tag?.content;
    if (tag) tag.content = centerTheme === 'light' ? '#ffffff' : '#09090b';
    return () => { if (tag && previous) tag.content = previous; };
  }, [currentUser?.role, centerTheme]);

  // If user is not logged in, show Login view
  const resolvedTab = isLoggedIn ? resolvePageForRole(currentUser?.role, activeTab) : null;
  const allowedTab = currentUser?.role === 'admin' && !isAdminCustomerView && resolvedTab && !resolvedTab.startsWith('admin_') ? 'admin_tenants' : resolvedTab;
  if (!currentUser || !allowedTab) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (allowedTab) {
      case 'admin_tenants':
        return <AdminTenantsPage key="admin_tenants" />;
      case 'admin_billing':
        return <AdminBillingPage key="admin_billing" />;
      case 'admin_branch_centers':
      case 'admin_center_create':
      case 'admin_establishment_create':
      case 'admin_businesses':
        return <AdminBusinessManagementPage />;
      case 'dashboard':
        return viewUser?.role === 'sube' ? <BranchDetailPage /> : <DashboardPage />;
      case 'branches':
        return viewUser?.role === 'sube' ? <BranchDetailPage /> : <BranchesPage />;
      case 'branch_detail':
      case 'branch_transactions':
        return <BranchDetailPage />;
      case 'revenue_entry':
        return <DailyRevenueEntryPage />;
      case 'expenses':
      case 'expense_new':
      case 'expense_camera':
      case 'expense_accounting':
        return <ExpensesPage />;
      case 'expense_categories':
      case 'expense_category_new':
      case 'expense_category_edit':
        return <ExpenseCategoriesPage />;
      case 'staff':
      case 'staff_new':
      case 'staff_edit':
      case 'staff_history':
      case 'staff_payment':
        return <StaffPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <LoginPage />;
    }
  };

  const interfaceRole = currentUser.role === 'admin' && !isAdminCustomerView ? 'admin' : viewUser?.role;
  return (
    <div data-owner-role={currentUser.role} data-page={allowedTab} data-panel={interfaceRole} data-ui-scale={interfaceRole === 'sube' || interfaceRole === 'merkez' ? 'enlarged' : undefined} data-theme={interfaceRole === 'sube' ? theme : interfaceRole === 'merkez' ? centerTheme : 'dark'} className="app-shell flex h-dvh w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (currentUser.role === 'merkez' ? <PatronMobileDrawer onClose={() => setMobileSidebarOpen(false)} /> : (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className={`relative z-50 ${interfaceRole === 'merkez' ? 'w-48' : 'w-72'} h-full bg-zinc-950 border-r border-zinc-800`}>
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      ))}

      {/* Main Workspace Area */}
      <div className="app-workspace flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} theme={interfaceRole === 'merkez' ? centerTheme : theme} onToggleTheme={interfaceRole === 'merkez' ? toggleCenterTheme : toggleTheme} />

        {/* Offline / Online Status Indicator */}
        <OfflineIndicator />

        {/* Scrollable Main Content Area */}
        <main style={allowedTab === 'branch_detail' && currentUser.role === 'merkez' ? { paddingTop: '0.375rem' } : undefined} className={`flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-8 ${activeTab === 'revenue_entry' ? 'lg:px-5 lg:py-4' : ''} ${allowedTab === 'dashboard' && viewUser?.role === 'merkez' ? 'center-dashboard-workspace' : ''}`}>
          <React.Fragment key={isAdminCustomerView ? `${viewUser?.role}:${viewUser?.branchId || viewUser?.companyId}` : 'admin'}>
            {renderActivePage()}
          </React.Fragment>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav onOpenMenu={() => setMobileSidebarOpen(true)} />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
