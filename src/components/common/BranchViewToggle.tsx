import React from 'react';
import { Grid, List } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BranchViewToggle: React.FC = () => {
  const { branchListViewMode, setBranchListViewMode } = useApp();
  return <div role="group" aria-label="Şube listesi görünümü" className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
    {[
      { mode: 'grid' as const, label: 'Kartlar', icon: Grid },
      { mode: 'table' as const, label: 'Tablo', icon: List },
    ].map(item => {
      const Icon = item.icon;
      const selected = branchListViewMode === item.mode;
      return <button key={item.mode} type="button" aria-pressed={selected} onClick={() => setBranchListViewMode(item.mode)}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${selected ? 'bg-zinc-800 font-medium text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
        <Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
      </button>;
    })}
  </div>;
};
