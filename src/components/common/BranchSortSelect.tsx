import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BranchListSort } from '../../types';

export const BranchSortSelect: React.FC = () => {
  const { branchListSort, setBranchListSort } = useApp();
  return <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
    <select aria-label="Şubeleri sırala" value={branchListSort} onChange={event => setBranchListSort(event.target.value as BranchListSort)}
      className="min-w-0 max-w-56 bg-transparent text-xs text-zinc-200 focus:outline-none">
      <option value="revenue-desc" className="bg-zinc-900">Ciroya Göre (En Yüksek)</option>
      <option value="revenue-asc" className="bg-zinc-900">Ciroya Göre (En Düşük)</option>
      <option value="expense-desc" className="bg-zinc-900">Gidere Göre (En Yüksek)</option>
      <option value="expense-asc" className="bg-zinc-900">Gidere Göre (En Düşük)</option>
      <option value="net-desc" className="bg-zinc-900">Net Kara Göre (En Yüksek)</option>
    </select>
  </div>;
};
