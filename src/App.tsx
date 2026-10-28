import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const { currentUser, activeTab } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If user is not logged in, show Login view
  if (!currentUser) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'admin_tenants':
        return <AdminTenantsPage key="admin_tenants" />;
      case 'admin_billing':
        return <AdminBillingPage key="admin_billing" />;
      case 'dashboard':
        return currentUser?.role === 'sube' ? <BranchDetailPage /> : <DashboardPage />;
      case 'branches':
        return currentUser?.role === 'sube' ? <BranchDetailPage /> : <BranchesPage />;
      case 'branch_detail':
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
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-72 h-full bg-zinc-950 border-r border-zinc-800">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="app-workspace flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />

        {/* Offline / Online Status Indicator */}
        <OfflineIndicator />

        {/* Scrollable Main Content Area */}
        <main className={`flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-8 ${activeTab === 'revenue_entry' ? 'lg:px-5 lg:py-4' : ''}`}>
          {renderActivePage()}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
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
