import React from 'react';
import {
  Menu,
  Building,
  Calendar,
  CheckCircle2,
  Shield,
  Building2,
  Sun,
  Moon,
  ArrowLeft,
  History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BranchTheme } from '../../hooks/useBranchTheme';
import { adminCenters } from '../../data/adminSelection';
import { BranchViewToggle } from './BranchViewToggle';
import { BranchSortSelect } from './BranchSortSelect';
import { NotificationBell } from './NotificationBell';
import { useMobileViewport } from '../../hooks/useMobileViewport';
import { PatronMobileHeader } from './PatronMobileHeader';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  theme?: BranchTheme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, theme = 'dark', onToggleTheme }) => {
  const mobile = useMobileViewport();
  const {
    currentUser,
    viewUser,
    adminCenterId,
    selectableBranches,
    selectAdminCenter,
    selectAdminBranch,
    returnToAdmin,
    isAdminCustomerView,
    activeTab,
    setActiveTab,
    branches,
    selectedBranchId,
    selectedBranch,
    setSelectedBranchId,
    notification,
    companies,
    activeCompany,
  } = useApp();


  const isBranch = viewUser?.role === 'sube';
  const isAdmin = currentUser?.role === 'admin';
  const isMerkez = viewUser?.role === 'merkez';
  const isPatronDashboard = currentUser?.role === 'merkez' && activeTab === 'dashboard';

  const getPageTitle = () => {
    switch (activeTab) {
      case 'admin_tenants':
        return 'Aboneler & Lisans Yönetimi';
      case 'admin_branch_centers':
      case 'admin_center_create':
      case 'admin_establishment_create':
      case 'admin_businesses':
        return 'İşletme Yönetimi';
      case 'admin_billing':
        return 'Abonelik Tahsilatları ve Gelir Kayıtları';
      case 'dashboard':
          if (isPatronDashboard) return `Merkez Finans ve Operasyon Takibi — ${activeCompany.name} (${branches.length} Şube)`;
          return isAdmin
          ? (isBranch ? `${viewUser?.branchName} — Satış ve Gider Paneli` : `${activeCompany.name} (${branches.length} Şube)`)
          : isMerkez
          ? `${activeCompany.name} (${branches.length} Şube)`
          : `${currentUser?.branchName || 'Şubem'} — Satış ve Gider Paneli`;
      case 'branches':
        return `Tüm Şubeler (${branches.length} Şube)`;
      case 'branch_detail':
        return selectedBranch.name || 'Şube Detay & Finansal Performans';
      case 'branch_transactions':
        return `${selectedBranch.name || 'Şube'} — Son İşlemler`;
      case 'revenue_entry':
        return 'Günlük Ciro Girişi';
      case 'expenses':
        return 'Gider Kayıtları ve Faturalar';
      case 'expense_new': return 'Yeni Gider ve Fatura Kaydı';
      case 'expense_camera': return 'Fiş Çek & Gider Ekle';
      case 'expense_accounting': return 'Muhasebe Gider Dosyası';
      case 'expense_categories':
        return 'İşletme Gider Kalemleri';
      case 'expense_category_new': return 'Yeni Gider Kalemi';
      case 'expense_category_edit': return 'Gider Kalemini Düzenle';
      case 'staff':
        return 'Personel ve Yevmiye Yönetimi';
      case 'staff_new': return 'Yeni Personel';
      case 'staff_edit': return 'Personel Bilgilerini Düzenle';
      case 'staff_history': return 'Personel Ödeme Geçmişi';
      case 'staff_payment': return 'Personel Ödemesi';
      case 'reports':
        return 'Finansal Analitik ve Raporlar';
      case 'settings':
        return 'Sistem ve Entegrasyon Ayarları';
      default:
        return 'Analitik Konsolu';
    }
  };

  return (
    <>
      <header className="min-h-16 shrink-0 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/80 px-4 md:px-6 py-3 flex flex-wrap gap-3 items-center justify-between sticky top-0 z-30">
        {mobile && currentUser?.role === 'merkez' ? <PatronMobileHeader onOpenMenu={onOpenMobileMenu} theme={theme} onToggleTheme={onToggleTheme} /> : <>
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-sm md:text-base font-bold text-zinc-100 tracking-tight">
                {getPageTitle()}
              </h1>
              {['branch_detail', 'branch_transactions'].includes(activeTab) && currentUser?.role === 'merkez' && (
                <select aria-label="İncelenen şubeyi değiştir" value=""
                  onChange={event => { if (event.target.value) setSelectedBranchId(event.target.value); }}
                  className="max-w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-emerald-400 cursor-pointer">
                  <option value="" disabled>Değiştir</option>
                  {selectableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              )}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  Süper Admin
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  TRY (₺)
                </span>
              )}
            </div>
            <p className={`text-[11px] text-zinc-500 ${isPatronDashboard ? 'mt-1' : 'hidden sm:block'}`}>
              {isPatronDashboard
                ? `Çoklu Şube Finans Konsolu. Bugün bağlı ${branches.length} şubenin / işletme biriminin günlük hasılat, gider dağılımı ve net karlılık durumu canlı izleniyor.`
                : ['branch_detail', 'branch_transactions'].includes(activeTab) && selectedBranch.id
                ? `${selectedBranch.code} • ${selectedBranch.city} / ${selectedBranch.district} • Şube Müdürü: ${selectedBranch.managerName} • İletişim: ${selectedBranch.phone}`
                : isAdmin
                ? (isAdminCustomerView ? `Seçili hesap: ${viewUser?.branchName || activeCompany.name}` : 'Süper Admin Yönetim Paneli')
                : isMerkez
                ? `${activeCompany.name} — Çoklu Şube Finans Konsolu`
                : `${currentUser?.branchName || 'Şube'} Satış ve Gider Operasyonu`}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap min-w-0 items-center gap-2 md:gap-3">
          {/* Super Admin: Multi-Company (Tenant) Switcher */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 rounded-lg px-2.5 py-1 text-xs transition-colors">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <label htmlFor="admin-center-select" className="text-zinc-400 text-[11px] font-medium">Merkez Seç</label>
              <select
                id="admin-center-select"
                value={adminCenterId}
                onChange={(e) => selectAdminCenter(e.target.value)}
                className="min-w-0 max-w-[min(16rem,55vw)] bg-transparent text-zinc-100 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-zinc-900">Merkez Seç</option>
                {adminCenters(companies).map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                    {c.name} ({c.branchesCount} Şube)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Branch Selector for detailed inspection (for admin and merkez) */}
          {isAdmin && (
            <div className="flex min-w-0 items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <label htmlFor="header-branch-select" className="text-zinc-400 text-[11px]">Şube Seç</label>
              <select
                id="header-branch-select"
                value={selectedBranchId}
                onChange={(e) => selectAdminBranch(e.target.value)}
                className="min-w-0 max-w-[min(16rem,55vw)] bg-transparent text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-zinc-900">Şube Seç</option>
                {(isAdmin ? selectableBranches : branches).map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-200">
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdminCustomerView && <button type="button" onClick={returnToAdmin}
            className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20">Admin Paneline Dön</button>}

          {/* Date Tag */}
          {currentUser?.role === 'merkez' && ['branch_detail', 'branch_transactions'].includes(activeTab) && <div className="flex items-center gap-1">
            {activeTab === 'branch_transactions' && <button type="button" onClick={() => setActiveTab('branch_detail')}
              aria-label="Şube incelemeye geri dön" title="Şube incelemeye geri dön" className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10">
              <ArrowLeft className="h-5 w-5" strokeWidth={3.5} aria-hidden="true" />
            </button>}
            <button type="button" onClick={() => setActiveTab('branch_transactions')} aria-pressed={activeTab === 'branch_transactions'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800">
              <History className="h-3.5 w-3.5 text-amber-400" />Son İşlemler
            </button>
          </div>}
          <div className={`${isMerkez ? 'flex' : 'hidden xl:flex'} items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg`}>
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-[11px]">{new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })}</span>
          </div>

          {/* Branch users choose appearance instead of another role. */}
          {isBranch ? (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
              title={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
              aria-pressed={theme === 'light'}
              className="inline-flex items-center justify-center gap-2 min-w-11 min-h-11 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" /> : <Moon className="w-5 h-5 text-indigo-400" aria-hidden="true" />}
              <span className="hidden sm:inline text-xs font-medium">{theme === 'dark' ? 'Gündüz' : 'Gece'}</span>
            </button>
          ) : null}

          {isMerkez && activeTab === 'branches' && <><BranchSortSelect /><BranchViewToggle /></>}

          <NotificationBell />
          {isMerkez && <button type="button" onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
            title={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'} aria-pressed={theme === 'light'}
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 transition-colors">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-indigo-400" aria-hidden="true" /> : <Sun className="h-4 w-4 text-amber-500" aria-hidden="true" />}
          </button>}
        </div>
        </>}
      </header>

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-zinc-900 border border-emerald-500/40 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

    </>
  );
};
