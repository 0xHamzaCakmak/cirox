import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  TrendingUp,
  Receipt,
  Menu,
  Users,
  BarChart3,
  Settings,
  Tags,
  X,
  Building,
  Plus,
  Camera,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageTab } from '../../types';
import { MobileBranchActionModal } from './MobileBranchActionModal';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const MobileNav: React.FC = () => {
  const { currentUser, activeTab, setActiveTab } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<'revenue' | 'expense'>('revenue');

  const isMerkez = currentUser?.role === 'merkez';

  const handleSelect = (tab: PageTab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  const openFastAction = (mode: 'revenue' | 'expense') => {
    if (mode === 'expense') { setActiveTab('expense_camera'); setDrawerOpen(false); return; }
    setActionModalMode(mode);
    setActionModalOpen(true);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-zinc-800/90 px-2 py-1.5 flex items-center justify-around">
        {/* Tab 1: Dashboard or Şubem */}
        {isMerkez ? (
          <button
            onClick={() => handleSelect('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Panel</span>
          </button>
        ) : (
          <button
            onClick={() => handleSelect('branch_detail')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'branch_detail' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Şubem</span>
          </button>
        )}

        {/* Tab 2: Ciro Gir */}
        <button
          onClick={() => handleSelect('revenue_entry')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'revenue_entry' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Ciro Gir</span>
        </button>

        {/* Center Prominent Fast Action Button (+ İşlem) */}
        <button
          onClick={() => openFastAction('revenue')}
          className="flex flex-col items-center -mt-5 relative group"
          title="Hızlı Ciro veya Gider Ekle"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-zinc-950 active:scale-95 transition-all">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[9px] font-bold text-emerald-400 mt-1">Hızlı Kasa</span>
        </button>

        {/* Tab 3: Giderler */}
        <button
          onClick={() => handleSelect('expenses')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
            ['expenses', 'expense_new', 'expense_camera', 'expense_accounting'].includes(activeTab) ? 'text-rose-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Giderler</span>
        </button>

        {/* Tab 4: More */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold text-zinc-400 hover:text-zinc-200"
        >
          <Menu className="w-4 h-4" />
          <span>Menü</span>
        </button>
      </div>

      {/* Drawer for More Options & PWA Install */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end md:hidden">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-100">Mobil İşlem Menüsü</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {currentUser?.name}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Cards in Drawer */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => openFastAction('revenue')}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-left active:scale-98 transition-all"
              >
                <TrendingUp className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Hızlı Ciro Gir</span>
                  <span className="text-[10px] text-zinc-400">POS & Nakit Kasa</span>
                </div>
              </button>

              <button
                onClick={() => openFastAction('expense')}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-left active:scale-98 transition-all"
              >
                <Receipt className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Hızlı Gider Ekle</span>
                  <span className="text-[10px] text-zinc-400">Fiş & Fatura Çek</span>
                </div>
              </button>
            </div>

            {/* PWA Install Promo inside drawer */}
            <div className="pt-1">
              <PWAInstallPrompt />
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleSelect('staff')}
                className="flex items-center gap-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-medium text-zinc-200 hover:border-zinc-700"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Personeller & Yevmiye</span>
              </button>

              <button
                onClick={() => handleSelect('reports')}
                className="flex items-center gap-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-medium text-zinc-200 hover:border-zinc-700"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Finansal Raporlar</span>
              </button>

              {currentUser && (
                <button
                  onClick={() => handleSelect('expense_categories')}
                  className="flex items-center gap-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-medium text-zinc-200 hover:border-zinc-700"
                >
                  <Tags className="w-4 h-4 text-amber-400" />
                  <span>Gider Kalemleri</span>
                </button>
              )}

              {isMerkez && (
                <button
                  onClick={() => handleSelect('branches')}
                  className="flex items-center gap-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-medium text-zinc-200 hover:border-zinc-700"
                >
                  <Store className="w-4 h-4 text-purple-400" />
                  <span>Tüm Şubeler</span>
                </button>
              )}

              <button
                onClick={() => handleSelect('settings')}
                className="flex items-center gap-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-medium text-zinc-200 hover:border-zinc-700"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Sistem Ayarları</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Action Modal for Mobile Device Operation */}
      <MobileBranchActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        initialMode={actionModalMode}
      />
    </>
  );
};
