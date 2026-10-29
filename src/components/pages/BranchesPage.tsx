import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  TrendingUp,
  Receipt,
  Users,
  Building2,
  Phone,
  User,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Branch } from '../../types';
import { useMobileViewport } from '../../hooks/useMobileViewport';

export const BranchesPage: React.FC = () => {
  const { currentUser, branches, setSelectedBranchId, setActiveTab, branchListViewMode: viewMode, branchListSort: sortBy } = useApp();
  const mobile = useMobileViewport();
  const mobilePatron = mobile && currentUser?.role === 'merkez';
  const [search, setSearch] = useState('');

  const filteredBranches = useMemo(() => {
    return [...branches]
      .filter(branch => !mobilePatron || !search.trim() || [branch.name, branch.code, branch.managerName, branch.city, branch.district].join(' ').toLocaleLowerCase('tr-TR').includes(search.trim().toLocaleLowerCase('tr-TR')))
      .sort((a, b) => {
        switch (sortBy) {
          case 'revenue-desc':
            return b.dailyRevenue - a.dailyRevenue;
          case 'revenue-asc':
            return a.dailyRevenue - b.dailyRevenue;
          case 'expense-desc':
            return b.dailyExpense - a.dailyExpense;
          case 'expense-asc':
            return a.dailyExpense - b.dailyExpense;
          case 'net-desc':
            return b.netProfit - a.netProfit;
          default:
            return 0;
        }
      });
  }, [branches, sortBy, search, mobilePatron]);

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranchId(branch.id);
    setActiveTab('branch_detail');
  };

  return (
    <div className="branches-page space-y-6 pb-12">
      {mobilePatron && <label className="patron-branch-search"><span className="sr-only">Şube ara</span><input type="search" aria-label="Şube ara" value={search} onChange={event => setSearch(event.target.value)} placeholder="Şube, kod veya müdür ara" /></label>}
      {mobilePatron && !filteredBranches.length && <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{branches.length ? 'Aramanıza uygun şube bulunamadı.' : 'Henüz bağlı şube bulunmuyor.'}</p>}
      {/* View: Cards Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBranches.map((b) => (
            <div
              key={b.id}
              role="button" tabIndex={0} aria-label={`${b.name} şubesini incele`}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleBranchSelect(b); } }}
              onClick={() => handleBranchSelect(b)}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-lg hover:shadow-black/40 group"
            >
              <div>
                {/* Branch Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-mono text-xs font-bold text-zinc-300 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-colors">
                      {b.city.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {b.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {b.district}, {b.city}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      b.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {b.code}
                  </span>
                </div>

                {/* Manager & Staff summary */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-xl mb-3">
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-zinc-500 shrink-0" />
                    {b.managerName}
                  </span>
                  <span className="flex items-center gap-1 font-mono shrink-0">
                    <Users className="w-3 h-3 text-zinc-500" />
                    {b.staffCount} Personel
                  </span>
                </div>

                {/* Financial Metrics */}
                <div className="space-y-1.5 py-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Günlük Ciro:
                    </span>
                    <span className="font-mono font-bold text-zinc-100">
                      {(b.dailyRevenue ?? 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-rose-400" /> Günlük Gider:
                    </span>
                    <span className="font-mono text-rose-400">
                      {(b.dailyExpense ?? 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/50">
                    <span className="text-zinc-300 font-medium">Net Kar:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{(b.netProfit ?? 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Detail Link */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <span className="font-medium">Detayları İncele</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* View: Detailed Table */
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse patron-branches-table">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3 px-4">Kod</th>
                  <th className="py-3 px-4">Şube Adı</th>
                  <th className="py-3 px-4">Şehir / İlçe</th>
                  <th className="py-3 px-4">Müdür</th>
                  <th className="py-3 px-4 text-right">Günlük Ciro</th>
                  <th className="py-3 px-4 text-right">Günlük Gider</th>
                  <th className="py-3 px-4 text-right">Net Kar</th>
                  <th className="py-3 px-4 text-center">Personel</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredBranches.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => handleBranchSelect(b)}
                    className="hover:bg-zinc-800/50 cursor-pointer group transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-zinc-400">{b.code}</td>
                    <td className="py-3 px-4 font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {b.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {b.district}, {b.city}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{b.managerName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-100 text-right">
                      {(b.dailyRevenue ?? 0).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-400 text-right">
                      {(b.dailyExpense ?? 0).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-right">
                      +{(b.netProfit ?? 0).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-zinc-300">
                      {b.staffCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {b.status === 'active' ? 'Aktif' : 'İncelemede'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBranchSelect(b);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
