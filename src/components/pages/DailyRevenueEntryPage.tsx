import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Globe,
  Coins,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  Copy,
  Building,
  Info,
  History,
  Camera,
  X,
  Smartphone,
  Calculator,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { ReceiptCapture } from '../common/ReceiptCapture';
import type { ReceiptAttachment, DailyRevenueRecord } from '../../types';
import { CashRevenueHistoryPage } from './CashRevenueHistoryPage';

export const DailyRevenueEntryPage: React.FC = () => {
  const {
    currentUser: actor, viewUser: currentUser,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    addDailyRevenue,
    dailyRevenueRecords,
    showNotification,
    selectedBranch,
  } = useApp();

  const isMerkez = currentUser?.role === 'merkez';
  const effectiveBranchId = !isMerkez && currentUser?.branchId ? currentUser.branchId : selectedBranchId;
  const branch = branches.find((b) => b.id === effectiveBranchId) || branches[0] || selectedBranch;

  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  const [creditCard, setCreditCard] = useState<number | ''>(branch.revenueBreakdown.creditCard || '');
  const [cash, setCash] = useState<number | ''>(branch.revenueBreakdown.cash || '');
  const [cashBase, setCashBase] = useState(0);
  const [cashView, setCashView] = useState<'form' | 'history'>('form');
  const [startCashCalculator, setStartCashCalculator] = useState(false);
  const [online, setOnline] = useState<number | ''>(branch.revenueBreakdown.online || '');
  const [other, setOther] = useState<number | ''>(branch.revenueBreakdown.other || '');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const submitting = useRef(false);
  const readOnly = !branch.id || (actor?.role !== 'admin' && currentUser?.role !== 'sube');
  const cashDraft = useRef({ branchId: branch.id, date, amount: Number(cash) || 0, base: cashBase });
  cashDraft.current = { branchId: branch.id, date, amount: Number(cash) || 0, base: cashBase };

  // Auto sum
  const total = (Number(creditCard) || 0) + (Number(cash) || 0) + (Number(online) || 0) + (Number(other) || 0);

  // Quick increment helper
  const addQuick = (field: 'cc' | 'cash' | 'online' | 'other', val: number) => {
    if (field === 'cc') setCreditCard((prev) => (Number(prev) || 0) + val);
    if (field === 'cash') setCash((prev) => (Number(prev) || 0) + val);
    if (field === 'online') setOnline((prev) => (Number(prev) || 0) + val);
    if (field === 'other') setOther((prev) => (Number(prev) || 0) + val);
  };

  // Update defaults when branch changes
  useEffect(() => {
    const record = dailyRevenueRecords.find(record => record.branchId === branch.id && record.date === date);
    setCreditCard(record?.creditCard ?? '');
    setCash(record?.cash ?? '');
    setCashBase(record?.cash ?? 0); setCashView('form');
    setOnline(record?.online ?? '');
    setOther(record?.other ?? '');
    setNotes(record?.notes ?? '');
    setReceipts(record?.receipts ?? []);
    setIsSaved(false);
  }, [branch.id, date]);

  const handleCopyYesterday = () => {
    const previous = new Date(date + 'T12:00:00Z'); previous.setUTCDate(previous.getUTCDate() - 1);
    if (!Number.isFinite(previous.getTime())) { showNotification('Önce geçerli bir kayıt tarihi seçin.', 'warning'); return; }
    const yesterday = dailyRevenueRecords.find(record => record.branchId === branch.id && record.date === previous.toISOString().slice(0, 10));
    if (!yesterday) { showNotification('Önceki güne ait ciro kaydı bulunamadı.', 'info'); return; }
    setCreditCard(yesterday.creditCard); setCash(yesterday.cash); setOnline(yesterday.online); setOther(yesterday.other);
  };

  const handleClear = () => {
    setCreditCard('');
    setCash('');
    setOnline('');
    setOther('');
    setNotes('');
    setReceipts([]);
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total <= 0 || photoBusy || readOnly || submitting.current) return;
    submitting.current = true; setIsSaving(true); setIsSaved(false);
    const savedCash = Number(cash) || 0;
    try {
    await addDailyRevenue({
      branchId: branch.id,
      branchName: branch.name,
      date,
      creditCard: Number(creditCard) || 0,
      cash: Number(cash) || 0,
      cashExpected: cashBase,
      online: Number(online) || 0,
      other: Number(other) || 0,
      total,
      notes,
      receiptIds: receipts.map(receipt => receipt.id),
      receipts,
      submittedBy: currentUser?.name || 'Şube Kullanıcısı',
    });

    if (cashDraft.current.branchId !== branch.id || cashDraft.current.date !== date) return;
    setCashBase(savedCash); setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    } catch (error) { showNotification(error instanceof Error ? error.message : 'Ciro kaydedilemedi.', 'warning'); }
    finally { submitting.current = false; setIsSaving(false); }
  };

  const branchRecords = dailyRevenueRecords.filter((r) => r.branchId === branch.id);
  const useCashRecord = (record: DailyRevenueRecord, preserveDraft: boolean) => {
    const draft = cashDraft.current;
    if (draft.branchId !== record.branchId || draft.date !== record.date) return;
    const difference = preserveDraft ? Math.round((draft.amount - draft.base) * 100) / 100 : 0;
    setCash(Math.round((record.cash + difference) * 100) / 100); setCashBase(record.cash); setIsSaved(false);
  };
  if (cashView === 'history') return <CashRevenueHistoryPage key={branch.id + date} branchId={branch.id} branchName={branch.name} date={date} readOnly={readOnly} startWithCalculator={startCashCalculator}
    onBack={() => setCashView('form')} onAdded={record => useCashRecord(record, true)} onUseSaved={record => useCashRecord(record, false)} />;

  return (
    <div className="revenue-entry space-y-6 w-full max-w-4xl mx-auto pb-12">
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Header Banner */}
      <div className="revenue-header bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Günlük Ciro Giriş Formu
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Günün POS tahsilatlarını, nakit hasılatını ve online sipariş cirolarını giriniz.
          </p>
        </div>

        {/* Branch Selector (if merkez or testing) */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
          <Building className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-zinc-500">Şube:</span>
          {isMerkez ? (
            <select
              value={branch.id}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-zinc-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-zinc-900">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-zinc-200">{branch.name}</span>
          )}
        </div>
      </div>

      {/* Main Entry Form */}
      <div className="revenue-form-panel bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="revenue-form space-y-5">
          {/* Top Date & Fast Actions Bar */}
          <div className="revenue-date-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <label className="text-xs font-semibold text-zinc-300">
                Kayıt Tarihi:
              </label>
              <input
                type="date"
                required
                disabled={photoBusy || isSaving}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyYesterday}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
                title="Dünkü değerleri şablon olarak doldur"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dünkü Değerleri Öner</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                title="Formu Temizle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form Fields (Credit Card, Cash, Online, Other) */}
          <div className="money-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kredi Kartı */}
            <div className="money-cell bg-zinc-950 p-4 rounded-xl border border-zinc-800/90 focus-within:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Kredi Kartı (POS Toplamı)</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">₺</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="0"
                step="0.01"
                value={creditCard}
                onChange={(e) => setCreditCard(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-transparent text-xl sm:text-2xl font-bold font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              {/* Quick increment chips */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                {[1000, 5000, 10000, 25000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addQuick('cc', val)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 active:bg-emerald-500 active:text-black border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors"
                  >
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Gün sonu Z raporundaki POS toplamı
              </p>
            </div>

            {/* Nakit */}
            <div className="money-cell bg-zinc-950 p-4 rounded-xl border border-zinc-800/90 focus-within:border-cyan-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-cyan-400" />
                  <span>Nakit Kasa Hasılatı</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">₺</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="0"
                step="0.01"
                value={cash}
                onChange={(e) => setCash(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-transparent text-xl sm:text-2xl font-bold font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                {[500, 1000, 2500, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addQuick('cash', val)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 active:bg-cyan-500 active:text-black border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors"
                  >
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Kasadaki sayılan nakit ciro
              </p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                <button type="button" disabled={readOnly || isSaving || photoBusy} onClick={() => { setStartCashCalculator(true); setCashView('history'); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-2 text-[11px] font-semibold text-cyan-400 disabled:opacity-50"><Calculator className="h-3.5 w-3.5" />Banknot Ekle</button>
                <button type="button" disabled={isSaving || photoBusy || !branch.id} onClick={() => { setStartCashCalculator(false); setCashView('history'); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-2 text-[11px] text-zinc-300 disabled:opacity-50"><History className="h-3.5 w-3.5" />Nakit Geçmişi</button>
              </div>
            </div>

            {/* Online Satış */}
            <div className="money-cell bg-zinc-950 p-4 rounded-xl border border-zinc-800/90 focus-within:border-indigo-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Online Satış (Getir, Yemeksepeti, Trendyol)</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">₺</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="0"
                step="0.01"
                value={online}
                onChange={(e) => setOnline(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-transparent text-xl sm:text-2xl font-bold font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                {[1000, 2500, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addQuick('online', val)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 active:bg-indigo-500 active:text-white border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors"
                  >
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Paket servis ve pazaryeri sipariş toplamı
              </p>
            </div>

            {/* Diğer */}
            <div className="money-cell bg-zinc-950 p-4 rounded-xl border border-zinc-800/90 focus-within:border-purple-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-400" />
                  <span>Diğer Tahsilatlar</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">₺</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="0"
                step="0.01"
                value={other}
                onChange={(e) => setOther(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-transparent text-xl sm:text-2xl font-bold font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Yemek kartları (Sodexo, Multinet vb.) veya havale
              </p>
            </div>
          </div>

          <ReceiptCapture branchId={branch.id} receipts={receipts} onChange={setReceipts} disabled={readOnly || isSaving} onBusyChange={setPhotoBusy} />

          {/* Açıklama / Notlar */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Şube Günlük Notu / Açıklama (İsteğe Bağlı)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hava durumu, özel organizasyon, elektrik kesintisi veya sepet hacmi hakkında kısa not..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Otomatik Toplam & Kaydet Bar */}
          <div className="revenue-total bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-400 block">
                Otomatik Hesaplanmış Günlük Toplam Ciro:
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {total.toLocaleString('tr-TR')} <span className="text-base text-zinc-400">₺</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={total <= 0 || isSaving || photoBusy || readOnly}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all shadow-lg ${
                total > 0
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 cursor-pointer shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor…' : isSaved ? 'Başarıyla Kaydedildi!' : 'Günlük Ciroyu Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Past Submissions for this Branch */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-200">
              {branch.name} - Son Girilen Ciro Kayıtları
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {branchRecords.length} Kayıt
          </span>
        </div>

        <div className="space-y-2">
          {branchRecords.map((r) => (
            <div
              key={r.id}
              className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-300 font-semibold">{r.date}</span>
                  <span className="text-[10px] text-zinc-500">• {r.createdAt}</span>
                  <span className="text-[10px] text-zinc-400">({r.submittedBy})</span>
                </div>
                {r.notes && <p className="text-[11px] text-zinc-400 mt-1">{r.notes}</p>}
                {!!r.receipts?.length && <div className="mt-1 flex flex-wrap gap-2">{r.receipts.map((receipt, index) =>
                  <a key={receipt.id} href={receipt.url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:underline">Fotoğraf {index + 1}</a>)}</div>}
              </div>

              <div className="flex items-center gap-4 text-right self-end sm:self-auto">
                <div className="text-[11px] text-zinc-400 hidden md:block">
                  Kart: {r.creditCard.toLocaleString('tr-TR')} ₺ | Nakit: {r.cash.toLocaleString('tr-TR')} ₺
                </div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  {r.total.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
