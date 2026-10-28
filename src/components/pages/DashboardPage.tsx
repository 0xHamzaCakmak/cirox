import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Wallet,
  Store,
  Users,
  Search,
  ArrowUpDown,
  Filter,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SEVEN_DAYS_TREND } from '../../data/mockData';
import { TrendLineChart, Sparkline } from '../common/SleekCharts';
import { Branch } from '../../types';

export const DashboardPage: React.FC = () => {
  const { branches, setSelectedBranchId, setActiveTab, activeCompany } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortField, setSortField] = useState<'dailyRevenue' | 'dailyExpense' | 'netProfit' | 'staffCount'>('dailyRevenue');
  const [sortAsc, setSortAsc] = useState(false);

  // Compute Aggregate KPI metrics across active branches
  const totalRevenue = useMemo(() => branches.reduce((sum, b) => sum + b.dailyRevenue, 0), [branches]);
  const totalExpense = useMemo(() => branches.reduce((sum, b) => sum + b.dailyExpense, 0), [branches]);
  const totalNet = totalRevenue - totalExpense;
  const totalBranchesCount = branches.length || 1;
  const totalStaffCount = useMemo(() => branches.reduce((sum, b) => sum + b.staffCount, 0), [branches]);

  // Dynamic 7-day trend scaled to active company
  const companyTrendData = useMemo(() => {
    if (!activeCompany) return SEVEN_DAYS_TREND;
    if (activeCompany.id === 'comp-1') return SEVEN_DAYS_TREND;
    const factor = totalRevenue > 0 ? totalRevenue / 2618500 : 0.02;
    return SEVEN_DAYS_TREND.map((d) => {
      const rev = Math.round(d.revenue * factor);
      const exp = Math.round(d.expense * factor);
      const netVal = rev - exp;
      return {
        day: d.day,
        revenue: rev,
        expense: exp,
        net: netVal,
        profit: netVal,
      };
    });
  }, [activeCompany, totalRevenue]);

  const weeklyRevenue = useMemo(() => {
    return companyTrendData.reduce((sum, d) => sum + d.revenue, 0);
  }, [companyTrendData]);

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
    <div className="space-y-6 pb-12">
      {/* Welcome Banner / Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
              Merkez Finans ve Operasyon Takibi — {activeCompany.name}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Bugün aktif {branches.length} şubenin / işletme biriminin günlük hasılat, gider dağılımı ve net karlılık durumu canlı izleniyor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Rapor Al</span>
          </button>
          <button
            onClick={() => setActiveTab('revenue_entry')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-bold transition-colors shadow-md shadow-emerald-500/10"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ciro Girişi Yap</span>
          </button>
        </div>
      </div>

      {/* 5 Upper KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Toplam Ciro */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Toplam Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {(totalRevenue ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="flex items-center text-emerald-400 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +8.4%
              </span>
              <span className="text-zinc-500">düne kıyasla</span>
            </div>
          </div>
        </div>

        {/* 2. Toplam Gider */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Toplam Gider</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {(totalExpense ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-400">Gider Oranı:</span>
              <span className="text-rose-400 font-mono font-medium">
                %{totalRevenue > 0 ? Math.round((totalExpense / totalRevenue) * 100) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Net */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Net Kar</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              +{(totalNet ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-400">Net Marj:</span>
              <span className="text-emerald-400 font-mono font-semibold">
                %{totalRevenue > 0 ? Math.round((totalNet / totalRevenue) * 100) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Şube Sayısı */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Şube Sayısı</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {totalBranchesCount} <span className="text-sm font-normal text-zinc-400">Şube</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-emerald-400 font-medium">39 Aktif</span>
              <span className="text-amber-400 font-medium">1 İncelemede</span>
            </div>
          </div>
        </div>

        {/* 5. Toplam Personel */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Toplam Personel</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {totalStaffCount} <span className="text-sm font-normal text-zinc-400">Kişi</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-400">Şube Ortalaması:</span>
              <span className="text-zinc-200 font-mono font-medium">
                {(totalStaffCount / totalBranchesCount).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main 7-Day Trend Chart */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Son 7 Gün Toplam Ciro & Gider Karşılaştırması
              </h3>
              <p className="text-[11px] text-zinc-400">
                Tüm şubelerin günlük kümülatif hasılat ve harcama eğrisi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
                Haftalık Ciro: {weeklyRevenue >= 1000000 ? `${(weeklyRevenue / 1000000).toFixed(2)}M ₺` : `${(weeklyRevenue ?? 0).toLocaleString('tr-TR')} ₺`}
              </span>
            </div>
          </div>

          <TrendLineChart data={companyTrendData} height={230} />
        </div>

        {/* Financial Distribution & Margin Gauge Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">
              Ciro / Gider / Net Dengesi
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4">
              Bugünkü genel operasyonel karlılık dağılımı
            </p>

            {/* Proportion Bar */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Gider Payı</span>
                  <span className="font-mono text-rose-400 font-semibold">
                    %{totalRevenue > 0 ? Math.round((totalExpense / totalRevenue) * 100) : 0} ({(totalExpense ?? 0).toLocaleString('tr-TR')} ₺)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${totalRevenue > 0 ? Math.min(100, (totalExpense / totalRevenue) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Net Kar Marjı</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    %{totalRevenue > 0 ? Math.round((totalNet / totalRevenue) * 100) : 0} ({(totalNet ?? 0).toLocaleString('tr-TR')} ₺)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalRevenue > 0 ? Math.max(0, Math.min(100, (totalNet / totalRevenue) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Key Quick Breakdown stats */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400">Personel Yevmiye Toplamı:</span>
                <span className="font-mono font-semibold">
                  {(branches.reduce((s, b) => s + (b.dailyTotalWage || 0), 0) ?? 0).toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400">Ortalama Şube Günlük Cirosu:</span>
                <span className="font-mono font-semibold">
                  {(totalBranchesCount > 0 ? Math.round(totalRevenue / totalBranchesCount) : 0).toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-400">En Yüksek Ciro Yapan Şube:</span>
                <span className="font-medium text-emerald-400">
                  Şişli Nişantaşı (94.800 ₺)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Note */}
          <div className="mt-4 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
            <span className="text-indigo-400 font-medium">Bilgi:</span> 40 şubenin tamamı için irsaliyeli mal ve nakit akış senkronizasyonu aktiftir.
          </div>
        </div>
      </div>

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
                {filteredBranches.length} / 40 Şube
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
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    +{(b.netProfit ?? 0).toLocaleString('tr-TR')} ₺
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
                        İncelemede
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
