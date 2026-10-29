import React from 'react';
import { ArrowLeft, Calendar, History, Menu, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BranchTheme } from '../../hooks/useBranchTheme';
import { NotificationBell } from './NotificationBell';
import { BranchSortSelect } from './BranchSortSelect';
import { BranchViewToggle } from './BranchViewToggle';

export const PatronMobileHeader: React.FC<{ onOpenMenu: () => void; theme: BranchTheme; onToggleTheme?: () => void }> = ({ onOpenMenu, theme, onToggleTheme }) => {
  const { activeTab, activeCompany, selectedBranch, selectableBranches, setSelectedBranchId, setActiveTab } = useApp();
  const inspection = ['branch_detail', 'branch_transactions'].includes(activeTab);
  const title = activeTab === 'dashboard' ? 'Finans Özeti' : activeTab === 'branches' ? 'Şubeler' : activeTab === 'settings' ? 'Ayarlar' : activeTab === 'branch_transactions' ? 'Son İşlemler' : 'Şube İnceleme';
  return <div className="patron-mobile-header">
    <div className="patron-mobile-header-row">
      <button onClick={onOpenMenu} aria-label="Menüyü Aç" className="patron-mobile-icon text-zinc-300"><Menu aria-hidden="true" /></button>
      <div className="min-w-0">
        <h1 className="font-bold text-zinc-100">{title}</h1>
        <p className="text-zinc-400" title={inspection ? selectedBranch.name : activeCompany.name}>{inspection ? selectedBranch.name : activeCompany.name}</p>
      </div>
      <NotificationBell />
      <button onClick={onToggleTheme} className="patron-mobile-icon text-zinc-400" aria-pressed={theme === 'light'} aria-label={theme === 'dark' ? 'Gündüz moduna geç' : 'Gece moduna geç'}>
        {theme === 'dark' ? <Moon className="text-indigo-400" /> : <Sun className="text-amber-500" />}
      </button>
    </div>
    {inspection && <label className="patron-mobile-branch-select text-zinc-400"><span>İncelenen şube</span>
      <select aria-label="İncelenen şubeyi değiştir" value={selectedBranch.id} onChange={event => setSelectedBranchId(event.target.value)}>
        {!selectedBranch.id && <option value="">Şube seçin</option>}
        {selectableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
    </label>}
    {activeTab !== 'dashboard' && <div className="patron-mobile-toolbar">
      {inspection && <div className="flex items-center gap-1">
        {activeTab === 'branch_transactions' && <button className="patron-mobile-icon text-emerald-400" onClick={() => setActiveTab('branch_detail')} aria-label="Şube incelemeye geri dön"><ArrowLeft strokeWidth={3.5} /></button>}
        <button aria-pressed={activeTab === 'branch_transactions'} onClick={() => setActiveTab('branch_transactions')} className="patron-mobile-history text-zinc-200 bg-zinc-900 border border-zinc-800"><History className="text-amber-400" />Son İşlemler</button>
      </div>}
      <span className="patron-mobile-date text-zinc-400"><Calendar aria-hidden="true" />{new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      {activeTab === 'branches' && <><BranchSortSelect /><BranchViewToggle /></>}
    </div>}
  </div>;
};
