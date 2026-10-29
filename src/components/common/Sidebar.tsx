import React from 'react';
import {
  LayoutDashboard,
  Store,
  TrendingUp,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Tags,
  LogOut,
  Building,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Shield,
  CreditCard,
  Building2,
  Crown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageTab } from '../../types';
import { CiroxLogo } from './CiroxLogo';
import { resolvePageForRole } from '../../data/pageAccess';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const {
    currentUser,
    viewUser,
    isAdminCustomerView,
    activeTab,
    setActiveTab,
    logout,
    branches,
    companies,
    activeCompany,
    selectedBranch,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const isMerkez = viewUser?.role === 'merkez';
  const isPatron = currentUser?.role === 'merkez';

  // Super Admin Navigation Items
  const adminNavItems = [
    {
      id: 'admin_tenants' as PageTab,
      label: 'Aboneler & Lisanslar',
      icon: Shield,
      badge: `${companies.length}`,
    },
    {
      id: 'admin_billing' as PageTab,
      label: 'Abonelik Tahsilatları',
      icon: CreditCard,
      badge: 'Sanal POS',
    },
  ];

  const managementActive = ['admin_businesses', 'admin_establishment_create', 'admin_center_create', 'admin_branch_centers'].includes(activeTab);

  // Merkez / Operational Nav Items
  const coreNavItems = [
    {
      id: 'dashboard' as PageTab,
      label: viewUser?.role === 'sube' ? 'Şubem (Özet)' : 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Canlı',
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'branches' as PageTab,
      label: 'Şubeler',
      icon: Store,
      badge: `${branches.length}`,
      visibleFor: ['admin', 'merkez'],
    },
    {
      id: 'branch_detail' as PageTab,
      label: 'Şube İnceleme',
      icon: Building,
      visibleFor: ['admin', 'merkez'],
    },
    {
      id: 'revenue_entry' as PageTab,
      label: 'Ciro Girişi',
      icon: TrendingUp,
      badge: 'Günlük',
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'expenses' as PageTab,
      label: 'Giderler & Faturalar',
      icon: Receipt,
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'expense_categories' as PageTab,
      label: 'Gider Kalemleri',
      icon: Tags,
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'staff' as PageTab,
      label: 'Personeller',
      icon: Users,
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'reports' as PageTab,
      label: 'Raporlar & Analiz',
      icon: BarChart3,
      visibleFor: ['admin', 'merkez', 'sube'],
    },
    {
      id: 'settings' as PageTab,
      label: 'Ayarlar',
      icon: Settings,
      visibleFor: ['admin', 'merkez', 'sube'],
    },
  ];

  const handleNavClick = (tab: PageTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`${isMerkez ? 'w-48' : 'w-64'} shrink-0 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-full select-none`}>
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CiroxLogo />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-100 tracking-tight text-base">
                CIROX
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              Çoklu Şube & Finans Konsolu
            </p>
          </div>
        </div>
      </div>

      {/* Perspective Switcher Pill */}
      <div className="px-4 pt-3 pb-1">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2">
          <div className="flex items-center justify-between text-[11px] mb-1 text-zinc-400">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              {isAdmin || isMerkez ? 'Aktif Rol:' : 'Şube Bilgileri'}
            </span>
            <span
              className={`font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
                isAdmin
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : isMerkez
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isAdmin ? 'Süper Admin' : isMerkez ? 'Patron' : 'Şube'}
            </span>
          </div>
          <p className={`text-xs font-semibold text-zinc-200 ${isPatron ? 'break-words' : 'truncate'}`}>
            {isAdmin
              ? (isAdminCustomerView ? viewUser?.branchName || activeCompany.name : 'Yönetim Paneli')
              : isMerkez
              ? (currentUser?.name || activeCompany.ownerName).toLocaleUpperCase('tr-TR')
              : currentUser?.branchName}
          </p>
          {isPatron && <p className="mt-1 text-[11px] font-semibold text-zinc-400">ŞUBE : {branches.length}</p>}

          {!isAdmin && !isMerkez && <div className="mt-2 space-y-1 text-[10px] text-zinc-400">
            <p className="truncate">Kullanıcı: {currentUser?.username || selectedBranch.username || currentUser?.name}</p>
            <p className="truncate">Merkez: {selectedBranch.centerName || 'Merkez yok'}</p>
            <p className="truncate">{[selectedBranch.district, selectedBranch.city].filter(Boolean).join(' / ')}</p>
          </div>}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* Super Admin Section */}
        {isAdmin && (
          <div className="mb-3">
            <div className="text-[10px] uppercase font-bold text-indigo-400/90 px-3 py-1 tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Süper Admin & Lisanslar</span>
            </div>
            <button type="button" aria-current={managementActive ? 'page' : undefined}
              onClick={() => handleNavClick('admin_businesses')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border ${managementActive ? 'border-indigo-500/30 bg-indigo-600/15 text-indigo-300' : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}>
              <span className="flex items-center gap-2.5"><Building2 className="w-4 h-4 shrink-0" />İşletme Yönetimi</span>
              {managementActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'branch_detail' && activeTab === 'branch_transactions') || (item.id === 'expenses' && ['expense_new', 'expense_camera', 'expense_accounting'].includes(activeTab)) || (item.id === 'expense_categories' && ['expense_category_new', 'expense_category_edit'].includes(activeTab)) || (item.id === 'staff' && ['staff_new', 'staff_edit', 'staff_history', 'staff_payment'].includes(activeTab));
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-200'
                            : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Operational / Merkez Navigation */}
        {(!isAdmin || viewUser?.role !== 'admin') && <>
        {!isPatron && <div className="text-[10px] uppercase font-semibold text-zinc-500 px-3 py-1 tracking-wider">
          {isMerkez ? `${activeCompany.name} (${branches.length} Şube)` : 'Şube İşlemleri'}
        </div>}
        {coreNavItems
          .filter((item) => item.visibleFor.includes(viewUser?.role || 'merkez') && resolvePageForRole(currentUser?.role, item.id) === item.id)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'branch_detail' && activeTab === 'branch_transactions') || (item.id === 'expenses' && ['expense_new', 'expense_camera', 'expense_accounting'].includes(activeTab)) || (item.id === 'expense_categories' && ['expense_category_new', 'expense_category_edit'].includes(activeTab)) || (item.id === 'staff' && ['staff_new', 'staff_edit', 'staff_history', 'staff_payment'].includes(activeTab));
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </>}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80">
        <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
              {currentUser?.name.substring(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-zinc-200 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{currentUser?.title}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Çıkış Yap"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

