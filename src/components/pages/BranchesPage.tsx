import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Store,
  ChevronRight,
  TrendingUp,
  Receipt,
  Users,
  Grid,
  List,
  Building2,
  Phone,
  User,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Branch } from '../../types';

export const BranchesPage: React.FC = () => {
  const { branches, setSelectedBranchId, setActiveTab } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'revenue-desc' | 'revenue-asc' | 'expense-desc' | 'expense-asc' | 'net-desc'>('revenue-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Unique cities
  const cities = useMemo(() => {
    return Array.from(new Set(branches.map((b) => b.city))).sort();
  }, [branches]);

  // Filter & Sort logic
  const filteredBranches = useMemo(() => {
    return branches
      .filter((b) => {
        const matchesSearch =
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.managerName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = cityFilter === 'all' || b.city === cityFilter;
        return matchesSearch && matchesCity;
      })
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
  }, [branches, searchQuery, cityFilter, sortBy]);

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranchId(branch.id);
    setActiveTab('branch_detail');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Tüm Şubeler ({branches.length} Aktif Şube)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Türkiye genelindeki tüm şubelerin günlük hasılat, gider, personel ve net kar göstergeleri
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Kart Görünümü"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Kartlar</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Tablo Görünümü"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tablo</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, City Filter, Sort Options */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Şube adı, ilçe, müdür veya şube kodu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* City Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Filter className="w-3 h-3 text-zinc-400" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tüm Şehirler ({cities.length})</option>
              {cities.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c} ({branches.filter((b) => b.city === c).length})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="revenue-desc" className="bg-zinc-900">Ciroya Göre (En Yüksek)</option>
              <option value="revenue-asc" className="bg-zinc-900">Ciroya Göre (En Düşük)</option>
              <option value="expense-desc" className="bg-zinc-900">Gidere Göre (En Yüksek)</option>
              <option value="expense-asc" className="bg-zinc-900">Gidere Göre (En Düşük)</option>
              <option value="net-desc" className="bg-zinc-900">Net Kara Göre (En Yüksek)</option>
            </select>
          </div>
        </div>
      </div>

      {/* View: Cards Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBranches.map((b) => (
            <div
              key={b.id}
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
            <table className="w-full text-left border-collapse">
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
