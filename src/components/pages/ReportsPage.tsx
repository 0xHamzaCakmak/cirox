import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Building,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DonutBreakdownChart } from '../common/SleekCharts';
import { financialReport, reportRange } from '../../data/financialReports';

export const ReportsPage: React.FC = () => {
  const { branches, dailyRevenueRecords, expenses, expenseCategories, viewUser: currentUser, selectedBranchId: currentBranchId, showNotification } = useApp();
  const isBranch = currentUser?.role === 'sube';
  const ownBranchId = currentUser?.branchId || currentBranchId;
  const money = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  const percent = (value: number | null) => value === null ? '—' : '%' + value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const [startDate, setStartDate] = useState(today.slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(today);

  const range = reportRange(period, today, startDate, endDate);
  const report = useMemo(() => financialReport(
    branches.filter(b => isBranch ? b.id === ownBranchId : selectedBranchId === 'all' || b.id === selectedBranchId),
    dailyRevenueRecords, expenses, range.start, range.end, expenseCategories,
  ), [branches, isBranch, ownBranchId, selectedBranchId, dailyRevenueRecords, expenses, range.start, range.end, expenseCategories]);
  const activeBranches = report.branches;
  const totalRev = report.totalRevenue, totalExp = report.totalExpense;
  const totalNet = Math.round((totalRev - totalExp) * 100) / 100;
  const totalStaffCost = report.staffCost, totalDailyWage = report.dailyStaffCost;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const cc = activeBranches.reduce((s, b) => s + b.revenueBreakdown.creditCard, 0);
    const cash = activeBranches.reduce((s, b) => s + b.revenueBreakdown.cash, 0);
    const online = activeBranches.reduce((s, b) => s + b.revenueBreakdown.online, 0);
    const other = activeBranches.reduce((s, b) => s + b.revenueBreakdown.other, 0);

    return [
      { label: 'Kredi Kartı', value: cc, color: '#10b981' },
      { label: 'Nakit', value: cash, color: '#06b6d4' },
      { label: 'Online Satış', value: online, color: '#6366f1' },
      { label: 'Diğer', value: other, color: '#a855f7' },
    ];
  }, [activeBranches]);

  const expenseCategoriesBreakdown = report.categories;

  // Top 10 Branches for comparison
  const topBranches = useMemo(() => {
    return [...activeBranches]
      .sort((a, b) => b.dailyRevenue - a.dailyRevenue)
      .slice(0, 10);
  }, [activeBranches]);

  const handleExportCSV = () => {
    const headers = isBranch ? 'Gider Kalemi,Harcama (TRY),Ciroya Oranı (%),Toplam Gidere Oranı (%)\n' : 'Şube Kodu,Şube Adı,Şehir,Ciro (TRY),Gider (TRY),Net Kar (TRY),Personel Sayısı,Dönemde Günlük Personel Ödemesi (TRY)\n';
    const csvText = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const rows = isBranch ? report.expenseComparison.map(category => `${csvText(category.label)},${category.value},${category.revenueShare ?? ''},${category.expenseShare}`).join('\n') : activeBranches
      .map(
        (b) =>
          `${csvText(b.code)},${csvText(b.name)},${csvText(b.city)},${b.dailyRevenue},${b.dailyExpense},${b.netProfit},${b.staffCount},${b.dailyTotalWage}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${isBranch ? 'Gider' : 'Sube'}_Analitik_Raporu_${range.start}_${range.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Rapor CSV formatında dışa aktarıldı');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Export */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Finansal Raporlar ve Analitik
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isBranch ? 'İşletmenizin dönemsel ciro, gider dağılımı, gider karşılaştırması ve personel ödemeleri' : 'Dönemsel ciro, gider, ödeme dağılımı, şube karşılaştırması ve personel maliyeti raporları'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 font-semibold text-xs transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel / CSV İndir</span>
          </button>
        </div>
      </div>

      {/* Period & Scope Filters */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Period Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'today' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bugün
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'week' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bu Hafta
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'month' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bu Ay
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'custom' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Özel Tarih
          </button>
        </div>

        {/* Custom date range if selected */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-200 font-mono focus:outline-none"
            />
            <span className="text-zinc-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-200 font-mono focus:outline-none"
            />
          </div>
        )}

        {/* Branch Filter */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300">
          <Building className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-500">Kapsam:</span>
          {isBranch ? <span className="font-semibold">{activeBranches[0]?.name || 'Şubeniz'}</span> : <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-zinc-900">Tüm Şubeler ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="bg-zinc-900">
                {b.name}
              </option>
            ))}
          </select>}
        </div>
      </div>

      {/* KPI Cards for Report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Ciro */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 block mb-1">Raporlanan Toplam Ciro</span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {(totalRev ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {period === 'today' ? 'Günün hasılatı' : 'Seçili periyod ciro toplamı'}
          </p>
        </div>

        {/* Toplam Gider */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 block mb-1">Raporlanan Toplam Gider</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {(totalExp ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Gider payı: %{totalRev > 0 ? Math.round((totalExp / totalRev) * 100) : 0}
          </p>
        </div>

        {/* Net */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 block mb-1">Net Kar</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {(totalNet ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Kar marjı: %{totalRev > 0 ? Math.round((totalNet / totalRev) * 100) : 0}
          </p>
        </div>

        {/* Personel Maliyeti */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 block mb-1">Dönemde Ödenen Personel Gideri</span>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {(totalStaffCost ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Günlük: {totalDailyWage.toLocaleString('tr-TR')} ₺ · Aylık: {report.monthlyStaffCost.toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </div>

      {/* 2 Breakdown Donut Charts (Kart/Nakit/Online & Gider Kategorileri) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kart / Nakit / Online Dağılımı */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-100 mb-1">
            Tahsilat ve Ödeme Dağılımı (Kart / Nakit / Online)
          </h3>
          <p className="text-[11px] text-zinc-400 mb-4">
            Kredi kartı POS, kasa nakdi ve dijital paket sipariş hacmi
          </p>

          <DonutBreakdownChart
            segments={paymentBreakdown}
            centerLabel="Toplam Ciro"
            centerValue={`${money(totalRev)} ₺`}
          />
        </div>

        {/* Gider Kategorileri Dağılımı */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-100 mb-1">
            Gider Kategorileri Dağılımı
          </h3>
          <p className="text-[11px] text-zinc-400 mb-4">
            Aktif gider kalemleri ve seçili dönemdeki gerçek harcamalar
          </p>

          <DonutBreakdownChart
            segments={expenseCategoriesBreakdown}
            centerLabel="Toplam Gider"
            centerValue={`${money(totalExp)} ₺`}
          />
          {report.categories.some(category => category.historical) && <p className="text-[11px] text-zinc-500 mt-3">Pasif kalemlere ait geçmiş harcamalar, toplam giderin eksilmemesi için ayrı gösterilir.</p>}
        </div>
      </div>

      {isBranch ? <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Gider Kalemleri Karşılaştırması</h3>
            <p className="text-[11px] text-zinc-400">Seçili dönemde en yüksek harcamadan en düşüğe · Bar uzunluğu toplam gider içindeki payı gösterir</p>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-semibold">Ciro: {money(totalRev)} ₺</span>
        </div>
        {totalRev === 0 && <p className="text-[11px] text-zinc-500 mb-3">Bu dönemde ciro kaydı bulunmadığı için ciroya oran hesaplanamaz.</p>}
        {report.expenseComparison.length === 0 && <p className="text-xs text-zinc-500 py-3">Gösterilecek gider kalemi bulunmuyor.</p>}
        <div className="space-y-4">
          {report.expenseComparison.map((category, idx) => <div key={category.id} className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-zinc-200 break-words"><span className="text-zinc-500 mr-1.5 font-mono">#{idx + 1}</span>{category.label}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
                <span className="font-bold text-zinc-100">Harcama: {money(category.value)} ₺</span>
                <span className="text-indigo-400">Ciroya oran: {percent(category.revenueShare)}</span>
                <span className="text-amber-400">Toplam gidere oran: {percent(category.expenseShare)}</span>
              </div>
            </div>
            <div role="meter" aria-label={`${category.label} toplam gider payı`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={category.expenseShare} className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, category.expenseShare))}%`, backgroundColor: category.color }} />
            </div>
          </div>)}
        </div>
      </div> : <>
      {/* Merkez: Şube Karşılaştırması */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              Şube Ciro ve Kar Karşılaştırması (En Yüksek 10 Şube)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Şubelerin seçili dönemdeki ciro ve net kar marjı sıralaması
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Top 10 Performans</span>
        </div>

        <div className="space-y-3.5">
          {topBranches.map((br, idx) => {
            const maxRev = topBranches[0]?.dailyRevenue || 1;
            const revPct = maxRev > 0 ? Math.round(((br.dailyRevenue || 0) / maxRev) * 100) : 0;
            const netPct = br.dailyRevenue ? Math.round(((br.netProfit || 0) / br.dailyRevenue) * 100) : 0;

            return (
              <div key={br.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">
                    <span className="text-zinc-500 mr-1.5 font-mono">#{idx + 1}</span>
                    {br.name} ({br.city})
                  </span>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-zinc-400">Gider: {(br.dailyExpense ?? 0).toLocaleString('tr-TR')} ₺</span>
                    <span className="text-emerald-400 font-bold">Ciro: {(br.dailyRevenue ?? 0).toLocaleString('tr-TR')} ₺</span>
                    <span className="text-indigo-400">Net: {(br.netProfit ?? 0).toLocaleString('tr-TR')} ₺ (%{netPct})</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${revPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>}
    </div>
  );
};
