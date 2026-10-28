import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Building,
  ArrowRightLeft,
  Calendar,
  Layers,
  CheckCircle2,
  X,
  Info,
  Shield,
  Building2,
  Crown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    currentUser,
    activeTab,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    switchPerspective,
    notification,
    setActiveTab,
    companies,
    activeCompanyId,
    setActiveCompanyId,
    activeCompany,
  } = useApp();

  const [showPerspectiveModal, setShowPerspectiveModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isMerkez = currentUser?.role === 'merkez';

  const getPageTitle = () => {
    switch (activeTab) {
      case 'admin_tenants':
        return 'Aboneler & Lisans Yönetimi';
      case 'admin_billing':
        return 'Abonelik Tahsilatları ve Gelir Kayıtları';
      case 'dashboard':
        return isAdmin
          ? `Merkez Yönetim Konsolu (${activeCompany.name})`
          : isMerkez
          ? `${activeCompany.name} (${branches.length} Şube)`
          : `${currentUser?.branchName || 'Şubem'} — Satış ve Gider Paneli`;
      case 'branches':
        return `Tüm Şubeler (${branches.length} Şube)`;
      case 'branch_detail':
        return 'Şube Detay & Finansal Performans';
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
      <header className="h-16 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold text-zinc-100 tracking-tight">
                {getPageTitle()}
              </h1>
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
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              {isAdmin
                ? `Aktif İşletme: ${activeCompany.name} (Tüm merkez & şube erişimleri açık)`
                : isMerkez
                ? `${activeCompany.name} — Çoklu Şube Finans Konsolu`
                : `${currentUser?.branchName || 'Şube'} Satış ve Gider Operasyonu`}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Super Admin: Multi-Company (Tenant) Switcher */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 rounded-lg px-2.5 py-1 text-xs transition-colors">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-zinc-400 text-[11px] font-medium hidden md:inline">Merkez:</span>
              <select
                value={activeCompanyId}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className="bg-transparent text-zinc-100 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                title="Yönetilen Merkez İşletmesini Değiştir"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                    {c.name} ({c.branchesCount} Şube)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Branch Selector for detailed inspection (for admin and merkez) */}
          {(isAdmin || isMerkez) && (
            <div className="hidden lg:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-zinc-400 text-[11px]">Şube:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  if (activeTab !== 'branch_detail' && activeTab !== 'revenue_entry') {
                    setActiveTab('branch_detail');
                  }
                }}
                className="bg-transparent text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-200">
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Tag */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-[11px]">{new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })}</span>
          </div>

          {/* Switch Perspective Modal Trigger (All roles) */}
          <button
            onClick={() => setShowPerspectiveModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 transition-colors shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Perspektif:</span>
            <span className="font-semibold text-emerald-400">
              {isAdmin ? 'Süper Admin' : isMerkez ? 'Merkez' : 'Şube'}
            </span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-200">Bildirimler & Uyarılar</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                  <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-0.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Süper Admin Lisans Kontrolü</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Ege Meze & Balık Evi Zinciri lisans ödemesi 3 gün gecikmede.
                    </p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>38 Şube Günlük Ciro Girdi</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Bugün ciro giriş tamamlanma oranı %95 seviyesinde.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-zinc-900 border border-emerald-500/40 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Perspective Switcher Modal */}
      {showPerspectiveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Kullanıcı Perspektifini Değiştir</h3>
              </div>
              <button
                onClick={() => setShowPerspectiveModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mt-2">
              Sistemi Süper Admin, Merkez Yöneticisi veya Şube Kullanıcısı gözünden deneyimleyebilirsiniz.
            </p>

            <div className="space-y-3 mt-4">
              {/* Option 1: Süper Admin */}
              <button
                onClick={() => {
                  switchPerspective('admin');
                  setShowPerspectiveModal(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isAdmin
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    1. Süper Admin (Sistem & Lisans Sahibi)
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Merkez hesapları açar, aboneleri ve tahsilatları yönetir. Tüm merkezler arasında anında geçiş yapabilir ve merkez operasyonlarını inceler.
                </p>
              </button>

              {/* Option 2: Merkez Yöneticisi */}
              <button
                onClick={() => {
                  switchPerspective('merkez');
                  setShowPerspectiveModal(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isMerkez
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    2. Merkez Yöneticisi ({activeCompany.code})
                  </span>
                  {isMerkez && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tüm 40 şubenin cirosunu, giderlerini, karlarını, sapma analizlerini ve merkez raporlarını görür.
                </p>
              </button>

              {/* Option 3: Şube Kullanıcısı */}
              <button
                onClick={() => {
                  switchPerspective('sube', selectedBranchId);
                  setShowPerspectiveModal(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  !isAdmin && !isMerkez
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    3. Şube Kullanıcısı
                  </span>
                  {!isAdmin && !isMerkez && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Kendi şubesinin günlük cirosunu girer, şube giderlerini işler ve personel yevmiyelerini yönetir.
                </p>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowPerspectiveModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

