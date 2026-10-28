import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CreditCard,
  Banknote,
  Globe,
  Coins,
  TrendingUp,
  Receipt,
  Wallet,
  Users,
  Building,
  ArrowLeft,
  Sparkles,
  Info,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DonutBreakdownChart } from '../common/SleekCharts';
import { branchOverview } from '../../data/branchOverview';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { Camera } from 'lucide-react';

export const BranchDetailPage: React.FC = () => {
  const {
    selectedBranch,
    branches,
    setSelectedBranchId,
    setActiveTab,
    expenses,
    dailyRevenueRecords,
    currentUser, expenseCategories, staffList,
  } = useApp();

  const isSubeUser = currentUser?.role === 'sube';
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'siparis_integration' | 'transactions'>('overview');
  const identity = isSubeUser ? branches.find(br => br.id === currentUser?.branchId) : branches.find(br => br.id === selectedBranch.id) || branches[0];
  const overview = useMemo(() => branchOverview(identity, selectedDate, dailyRevenueRecords, expenses, expenseCategories, staffList), [identity, selectedDate, dailyRevenueRecords, expenses, expenseCategories, staffList]);
  const b = overview.branch;
  const readOnly = !isSubeUser || !b.id;
  const openEntry = (tab: 'revenue_entry' | 'expense_new' | 'expense_camera') => {
    if (readOnly) return;
    setSelectedBranchId(b.id); setActiveTab(tab);
  };

  // Revenue breakdown segments for donut chart
  const revSegments = [
    { label: 'Kredi Kartı', value: b.revenueBreakdown.creditCard, color: '#10b981' }, // Emerald
    { label: 'Nakit', value: b.revenueBreakdown.cash, color: '#06b6d4' }, // Cyan
    { label: 'Online Satış', value: b.revenueBreakdown.online, color: '#6366f1' }, // Indigo
    { label: 'Diğer', value: b.revenueBreakdown.other, color: '#a855f7' }, // Purple
  ];

  const expSegments = overview.categories;

  const integration = b.siparisIntegration;
  const variance = b.dailyRevenue - integration.expectedSalesAmount;

  return (
    <div className="space-y-6 pb-12">
      {/* PWA Mobile Installation Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Branch Fast Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Button 1: Hızlı Ciro Girişi */}
        <button
          onClick={() => {
            openEntry('revenue_entry');
          }}
          disabled={readOnly} className="disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-zinc-950 border border-emerald-500/30 hover:border-emerald-500/50 active:scale-98 flex items-center justify-between group transition-all text-left shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-100 block">+ Hızlı Ciro Girişi</span>
              <span className="text-[11px] text-zinc-400">POS, Nakit, Online & Z-Raporu</span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 font-mono">₺</span>
        </button>

        {/* Button 2: Hızlı Gider / Fatura Ekle */}
        <button
          onClick={() => {
            openEntry('expense_new');
          }}
          disabled={readOnly} className="disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-zinc-950 border border-rose-500/30 hover:border-rose-500/50 active:scale-98 flex items-center justify-between group transition-all text-left shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-100 block">+ Gider / Fatura Ekle</span>
              <span className="text-[11px] text-zinc-400">Kasap, Hal, Sebze, Yevmiye</span>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-400 font-mono">₺</span>
        </button>

        {/* Button 3: Kamera ile Fiş Çek */}
        <button
          onClick={() => {
            openEntry('expense_camera');
          }}
          disabled={readOnly} className="disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 to-zinc-950 border border-sky-500/30 hover:border-sky-500/50 active:scale-98 flex items-center justify-between group transition-all text-left shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-100 block">📷 Kamera ile Fiş Çek</span>
              <span className="text-[11px] text-zinc-400">Tek dokunuşla fiş fotoğrafı</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">Kamera</span>
        </button>
      </div>

      {/* Top Header Card with Branch Switcher & Date Picker */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            {!isSubeUser && (
              <button
                onClick={() => setActiveTab('branches')}
                className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 transition-colors"
                title="Şubeler Listesine Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                  {b.name}
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {b.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {b.city} / {b.district}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Şube Müdürü: <span className="text-zinc-200 font-medium">{b.managerName}</span> • İletişim: {b.phone}
              </p>
            </div>
          </div>

          {/* Quick Branch & Date Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {!isSubeUser && (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
                <Building className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={b.id}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer pr-2"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id} className="bg-zinc-900">
                      {br.name} ({br.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                aria-label="Özet tarihi"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-mono"
              />
            </div>
          </div>
        </div>

        {/* 4 Upper KPI Cards (Günlük Ciro, Günlük Gider, Net, Personel Sayısı) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-zinc-800/80">
          {/* Günlük Ciro */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Günlük Ciro</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {b.dailyRevenue.toLocaleString('tr-TR')} <span className="text-xs text-zinc-400">₺</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Günün toplam tahsilatı</p>
          </div>

          {/* Günlük Gider */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Günlük Gider</span>
              <Receipt className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {b.dailyExpense.toLocaleString('tr-TR')} <span className="text-xs text-zinc-400">₺</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Yevmiye, hammadde & genel</p>
          </div>

          {/* Net Kar */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Net Kar</span>
              <Wallet className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${b.netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {b.netProfit.toLocaleString('tr-TR')} <span className="text-xs text-zinc-400">₺</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex justify-between">
              <span>Kar Marjı:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {overview.profitMargin === null ? '—' : '%' + overview.profitMargin}
              </span>
            </div>
          </div>

          {/* Personel Sayısı */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Personel Sayısı</span>
              <Users className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {b.staffCount} <span className="text-xs text-zinc-400">Kişi</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Güncel aktif çalışan kadrosu</p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeSubTab === 'overview'
              ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          Gelir, Gider & Personel Dağılımı
        </button>

        <button
          onClick={() => setActiveSubTab('siparis_integration')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeSubTab === 'siparis_integration'
              ? 'bg-zinc-900 text-indigo-400 border border-indigo-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>ŞubeSipariş Entegrasyonu & Borç</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeSubTab === 'transactions'
              ? 'bg-zinc-900 text-amber-400 border border-amber-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Son İşlemler ({overview.transactions.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview (Gelir Dağılımı, Gider Dağılımı, Personel Özeti) */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* 2 Donut Cards Side-by-Side: Gelir & Gider Dağılımı */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Gelir Dağılımı (Kredi Kartı, Nakit, Online, Diğer) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Gelir Dağılımı</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Ödeme kanallarına göre ciro kırılımı
                  </p>
                </div>
                <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {b.dailyRevenue.toLocaleString('tr-TR')} ₺
                </span>
              </div>

              <DonutBreakdownChart
                segments={revSegments}
                centerLabel="Toplam Ciro"
                centerValue={`${b.dailyRevenue.toLocaleString('tr-TR')} ₺`}
              />

              {/* Channel Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-zinc-800/80">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 mb-0.5">
                    <CreditCard className="w-3 h-3 text-emerald-400" /> Kart
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-200">
                    {b.revenueBreakdown.creditCard.toLocaleString('tr-TR')} ₺
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 mb-0.5">
                    <Banknote className="w-3 h-3 text-cyan-400" /> Nakit
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-200">
                    {b.revenueBreakdown.cash.toLocaleString('tr-TR')} ₺
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 mb-0.5">
                    <Globe className="w-3 h-3 text-indigo-400" /> Online
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-200">
                    {b.revenueBreakdown.online.toLocaleString('tr-TR')} ₺
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 mb-0.5">
                    <Coins className="w-3 h-3 text-purple-400" /> Diğer
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-200">
                    {b.revenueBreakdown.other.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              </div>
            </div>

            {/* Gider Dağılımı (Personel, Kasap, İçecek, Temizlik, Nakliye, Diğer) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-rose-400" />
                    <span>Gider Dağılımı</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Kategori bazlı günlük operasyonel harcamalar
                  </p>
                </div>
                <span className="font-mono text-xs text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                  {b.dailyExpense.toLocaleString('tr-TR')} ₺
                </span>
              </div>

              <DonutBreakdownChart
                segments={expSegments}
                centerLabel="Toplam Gider"
                centerValue={`${b.dailyExpense.toLocaleString('tr-TR')} ₺`}
              />

              {/* En yüksek gider kalemlerine kısa bakış */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-800/80 text-xs">
                {[...expSegments].sort((a, b) => b.value - a.value).filter(category => category.value > 0).slice(0, 3).map(category => <div key={category.id} className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80 flex flex-wrap gap-2 items-center justify-between"><span className="text-[11px] text-zinc-400">{category.label}</span><span className="font-mono font-semibold text-zinc-200">{category.value.toLocaleString('tr-TR')} ₺</span></div>)}
              </div>
            </div>
          </div>

          {/* Personel Özeti */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Personel Maliyet Özeti</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Güncel aktif kadro ve gider kayıtlarından hesaplanan gerçek personel ödemeleri
                </p>
              </div>
              <button
                onClick={() => setActiveTab('staff')}
                className="self-start sm:self-auto text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Personel Yönetimine Git</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs text-zinc-400 block mb-1">Aktif Personel</span>
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  {b.staffCount} <span className="text-xs font-normal text-zinc-500">Çalışan</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Şube müdürü, şef, servis, kurye dahil
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs text-zinc-400 block mb-1">Seçili Gün Personel Ödemesi</span>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {overview.staffPaid.toLocaleString('tr-TR')} <span className="text-xs text-zinc-500">₺</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Kaydedilmiş maaş, yevmiye, avans ve prim ödemeleri
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs text-zinc-400 block mb-1">Ay Başından Seçili Güne Ödemeler</span>
                <div className="text-2xl font-bold font-mono text-indigo-300">
                  {overview.monthlyStaffPaid.toLocaleString('tr-TR')} <span className="text-xs text-zinc-500">₺</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Seçili ayda bu tarihe kadar kaydedilen personel giderleri
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Gelecek Entegrasyon (ŞubeSipariş Modeli & Sapma Kuralı) */}
      {activeSubTab === 'siparis_integration' && (
        <div className="space-y-6">
          {/* Important Business Rule Card (Zarar Değil Analitik Sapma Kuralı) */}
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Önemli İş Kuralı (Finansal Sapma İlkesi)
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Beklenen ciro ile gerçekleşen ciro arasındaki fark otomatik olarak <strong>“zarar”</strong> veya <strong>“hırsızlık”</strong> olarak yorumlanamaz.
                  Ürünlerin bir kısmı satılmayıp merkeze iade edilebilir veya dondurucu stokta sonraki güne devredilebilir.
                  Sistemin amacı; zaman içerisinde gerçek ciro, ürün maliyeti, iade, gider ve personel maliyetleri arasındaki anormal sapmaları merkez yöneticisinin analiz edebilmesidir.
                </p>
              </div>
            </div>
          </div>

          {/* Integration Data Metrics Grid */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>POS & Sipariş Otomasyon Entegrasyon Modeli</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Harici sipariş uygulamasından REST API ile aktarılacak mal giriş ve maliyet alanları
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Demo · Bağlantı Kapalı
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {/* externalBranchId */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Harici Şube Kodu</span>
                <div className="font-mono text-sm font-bold text-indigo-400">
                  {integration.externalBranchId}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">externalBranchId</p>
              </div>

              {/* productCost */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Şubeye Gönderilen Ürün Maliyeti</span>
                <div className="font-mono text-sm font-bold text-zinc-100">
                  {integration.productCost.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">productCost (Et, içecek vb.)</p>
              </div>

              {/* returnedCost */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">İade Edilen Ürün / Maliyet</span>
                <div className="font-mono text-sm font-bold text-amber-400">
                  {integration.returnedCost.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">returnedCost (Merkeze iade)</p>
              </div>

              {/* netProductCost */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Net Mal Giriş Maliyeti</span>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  {integration.netProductCost.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">netProductCost = Gelen - İade</p>
              </div>

              {/* expectedSalesAmount */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Beklenen Ciro (Katsayılı)</span>
                <div className="font-mono text-sm font-bold text-sky-400">
                  {integration.expectedSalesAmount.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">expectedSalesAmount</p>
              </div>

              {/* Gerçekleşen Ciro */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Gerçekleşen Günlük Ciro</span>
                <div className="font-mono text-sm font-bold text-zinc-100">
                  {b.dailyRevenue.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">POS + Nakit + Online</p>
              </div>

              {/* Sapma */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Analitik Ciro Sapması</span>
                <div className={`font-mono text-sm font-bold ${variance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {integration.lastSyncTime ? (variance >= 0 ? `+${variance.toLocaleString('tr-TR')}` : variance.toLocaleString('tr-TR')) + ' ₺' : '—'}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Gerçekleşen - Beklenen</p>
              </div>

              {/* branchDebt */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-1">Şubenin Merkeze Borcu</span>
                <div className="font-mono text-sm font-bold text-rose-400">
                  {integration.branchDebt.toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">branchDebt (Cari bakiye)</p>
              </div>
            </div>

            {/* Note & Diagnosis */}
            <div className="mt-5 p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200">Entegrasyon Durum Notu: </span>
                <span>{integration.varianceNote || 'ŞubeSipariş ve MasaM QR bağlantıları henüz aktif değildir. Bu alandan veri aktarımı veya otomatik finansal kayıt yapılmıyor.'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Son İşlemler Listesi */}
      {activeSubTab === 'transactions' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100">
              {b.name} - Günlük Ciro & Gider Hareketleri
            </h3>
            <span className="text-xs text-zinc-400">
              Seçilen tarihe ait gerçek kayıtlar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Açıklama / Kalem</th>
                  <th className="py-3 px-4">Personel / İrsaliye</th>
                  <th className="py-3 px-4 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {overview.transactions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Seçilen tarihte ciro veya gider kaydı bulunmuyor.</td></tr>}
                {overview.transactions.map(transaction => <tr key={transaction.id} className="hover:bg-zinc-850/50">
                  <td className="py-3 px-4 font-mono text-zinc-400">{transaction.date}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${transaction.kind === 'revenue' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{transaction.kind === 'revenue' ? 'GÜNLÜK CİRO' : 'GİDER'}</span></td>
                  <td className="py-3 px-4 text-zinc-200"><div className="font-medium">{transaction.title}</div><div className="text-[11px] text-zinc-500">{transaction.description}</div></td>
                  <td className="py-3 px-4 text-zinc-400">{transaction.reference}</td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${transaction.kind === 'revenue' ? 'text-emerald-400' : 'text-rose-400'}`}>{transaction.kind === 'revenue' ? '+' : '-'}{transaction.amount.toLocaleString('tr-TR')} ₺</td>
                </tr>)}

              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
};
