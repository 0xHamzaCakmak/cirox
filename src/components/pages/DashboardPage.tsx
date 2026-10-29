import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Filter, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CenterDashboardOverview } from '../common/CenterDashboardOverview';
import { centerDashboardSummary } from '../../data/centerDashboard';
import type { Branch } from '../../types';

export const DashboardPage: React.FC = () => {
  const { currentUser, branches: linkedBranches, dailyRevenueRecords, expenses, expenseCategories, setSelectedBranchId, setActiveTab, activeCompany } = useApp();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const summary = useMemo(() => centerDashboardSummary(linkedBranches, dailyRevenueRecords, expenses, today, expenseCategories),
    [linkedBranches, dailyRevenueRecords, expenses, today, expenseCategories]);
  const branches = summary.branches;
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortField, setSortField] = useState<'dailyRevenue' | 'dailyExpense' | 'netProfit' | 'staffCount'>('dailyRevenue');
  const [sortAsc, setSortAsc] = useState(false);


  // Cities list
  const cities = useMemo(() => {
    const list = Array.from(new Set(branches.map((b) => b.city)));
    return list.sort();
  }, [branches]);

  // Filtered & Sorted Branches
  const filteredBranches = useMemo(() => {
    return branches
      .filter((b) => {
        const matchesSearch =
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.district.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = cityFilter === 'all' || b.city === cityFilter;
        return matchesSearch && matchesCity;
      })
      .sort((a, b) => {
        const diff = a[sortField] - b[sortField];
        return sortAsc ? diff : -diff;
      });
  }, [branches, searchQuery, cityFilter, sortField, sortAsc]);

  const handleSort = (field: 'dailyRevenue' | 'dailyExpense' | 'netProfit' | 'staffCount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleBranchClick = (b: Branch) => {
    setSelectedBranchId(b.id);
    setActiveTab('branch_detail');
  };


  return (
    <div className="center-dashboard-page space-y-4 pb-4">
      <CenterDashboardOverview summary={summary} companyName={activeCompany.name} showHeading={currentUser?.role !== 'merkez'} />
      {/* Branch Performance Table (Şube Performans Tablosu) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">
                Şube Performans Tablosu
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {filteredBranches.length} / {summary.branchCount} Şube
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Şube satırına tıklayarak detaylı gelir/gider dağılımını ve personel maliyetlerini inceleyebilirsiniz.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Şube adı, ilçe veya kod..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-48 sm:w-60 transition-colors"
              />
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300">
              <Filter className="w-3 h-3 text-zinc-400" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900 text-zinc-200">Tüm Şehirler</option>
                {cities.map((city) => (
                  <option key={city} value={city} className="bg-zinc-900 text-zinc-200">
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                <th className="py-3 px-4">Şube</th>
                <th
                  onClick={() => handleSort('dailyRevenue')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ciro</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dailyExpense')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Gider</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('netProfit')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Net</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('staffCount')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-200 transition-colors select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Personel</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredBranches.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-zinc-500">Gösterilecek bağlı şube bulunamadı.</td></tr>}
              {filteredBranches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => handleBranchClick(b)}
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                >
                  {/* Şube adı & Şehir */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-300 group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                        {b.city.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          <span>{b.name}</span>
                          <span className="font-mono text-[10px] text-zinc-500">({b.code})</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {b.district}, {b.city} • Müd: {b.managerName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Ciro */}
                  <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                    {(b.dailyRevenue ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  {/* Gider */}
                  <td className="py-3 px-4 font-mono text-rose-400">
                    {(b.dailyExpense ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  {/* Net */}
                  <td className={`py-3 px-4 font-mono font-bold ${b.netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(b.netProfit ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  {/* Personel sayısı */}
                  <td className="py-3 px-4 text-center font-mono text-zinc-300">
                    {b.staffCount}
                  </td>

                  {/* Durum */}
                  <td className="py-3 px-4 text-center">
                    {b.status === 'active' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {b.status === 'passive' ? 'Pasif' : 'İncelemede'}
                      </span>
                    )}
                  </td>

                  {/* Detay Butonu */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBranchClick(b);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      title="Şube Detayını Aç"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400">
          <span>Toplam {filteredBranches.length} şube listelendi</span>
          <div className="flex items-center gap-4 font-mono text-[11px] mt-2 sm:mt-0">
            <span>Filtrelenen Ciro: {(filteredBranches.reduce((s, b) => s + (b.dailyRevenue || 0), 0) ?? 0).toLocaleString('tr-TR')} ₺</span>
            <span>Net: {(filteredBranches.reduce((s, b) => s + (b.netProfit || 0), 0) ?? 0).toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      </div>
    </div>
  );
};
