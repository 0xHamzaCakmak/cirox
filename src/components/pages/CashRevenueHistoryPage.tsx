import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Banknote, Calculator, ChevronDown, Clock, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { createClientId } from '../../services/clientId';
import type { CashRevenueEntry, DailyRevenueRecord } from '../../types';
import { banknotesFromFields, cashBanknoteTotal, cashDenominations, emptyBanknoteFields } from '../../data/cashBanknotes';

const money = (amount: number) => amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const CashRevenueHistoryPage: React.FC<{
  branchId: string; branchName: string; date: string; readOnly: boolean; startWithCalculator: boolean;
  onBack: () => void; onAdded: (record: DailyRevenueRecord) => void; onUseSaved: (record: DailyRevenueRecord) => void;
}> = ({ branchId, branchName, date, readOnly, startWithCalculator, onBack, onAdded, onUseSaved }) => {
  const { addCashRevenueEntry } = useApp();
  const [entries, setEntries] = useState<CashRevenueEntry[]>([]), [record, setRecord] = useState<DailyRevenueRecord | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [calculator, setCalculator] = useState(startWithCalculator), [fields, setFields] = useState(emptyBanknoteFields);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(''), [expanded, setExpanded] = useState<string | null>(null);
  const busy = useRef(false), requestId = useRef(createClientId()), alive = useRef(true);
  const banknotes = banknotesFromFields(fields), total = cashBanknoteTotal(banknotes);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    void api<{ entries: CashRevenueEntry[]; record: DailyRevenueRecord | null }>(`/branch/cash-entries?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`).then(result => {
      if (!cancelled) { setEntries(result.entries); setRecord(result.record); }
    }).catch(failure => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Nakit geçmişi yüklenemedi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, date, reload]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy.current || readOnly || total <= 0) return;
    busy.current = true; setSaving(true); setSaveError('');
    try {
      const saved = await addCashRevenueEntry(branchId, date, banknotes, requestId.current);
      if (!alive.current) return;
      onAdded(saved); setRecord(saved); setFields(emptyBanknoteFields()); requestId.current = createClientId();
      setCalculator(false); setReload(previous => previous + 1);
    } catch (failure) { if (alive.current) setSaveError(failure instanceof Error ? failure.message : 'Nakit girişi kaydedilemedi.'); }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  };
  return <section className="cash-revenue-history mx-auto w-full max-w-5xl space-y-4 pb-6" aria-labelledby="cash-history-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="cash-history-title" className="flex items-center gap-2 text-base font-bold text-zinc-100"><Banknote className="h-5 w-5 text-cyan-400" />Nakit Ciro Geçmişi</h2><p className="mt-1 text-xs text-zinc-400">{branchName} · {date.split('-').reverse().join('.')}</p></div>
      <button type="button" onClick={onBack} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-50"><ArrowLeft className="h-5 w-5 text-emerald-400" strokeWidth={3} />Ciro Girişine Dön</button>
    </div>
    <div className="cash-history-stats grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-400">Kaydedilen Nakit Toplamı</p><p className="mt-2 break-words font-mono text-lg font-bold text-cyan-400">{loading && !record ? '…' : money(record?.cash || 0) + ' ₺'}</p></div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-400">İşlem Sayısı</p><p className="mt-2 font-mono text-lg font-bold text-zinc-100">{loading ? '…' : entries.length}</p></div>
    </div>
    <div className={`cash-workspace${readOnly ? ' cash-workspace-readonly' : ''}`}>
    {!readOnly && <div className="cash-banknote-panel rounded-xl border border-cyan-500/25 bg-zinc-900 p-2">
      <button type="button" disabled={saving} aria-expanded={calculator} aria-controls="cash-banknote-calculator" onClick={() => setCalculator(previous => !previous)} className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-semibold text-cyan-400"><span className="flex items-center gap-2"><Calculator className="h-4 w-4" />Banknot Sayarak Nakit Ekle</span><ChevronDown className={`h-4 w-4 transition-transform ${calculator ? 'rotate-180' : ''}`} /></button>
      {calculator && <form id="cash-banknote-calculator" onSubmit={submit} className="mt-3 space-y-4 border-t border-zinc-800 pt-4">
        <p className="text-xs leading-relaxed text-zinc-400">Yeni eklenecek banknotların adetlerini yazın. “Ekle” sayımı hemen kaydeder ve mevcut nakit toplamına ekler. Diğer ciro alanlarındaki taslağınız korunur.</p>
        {saveError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{saveError}</p>}
        <fieldset disabled={saving} className="space-y-2 disabled:opacity-60">
          <div className="cash-banknote-row grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-xs text-zinc-400"><span>Banknot</span><span>Adet</span><span className="text-right">Tutar</span></div>
          {cashDenominations.map(value => <div key={value} className="cash-banknote-row grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs">
            <label htmlFor={`banknote-${value}`} className="flex items-center gap-1.5 font-semibold text-zinc-200"><Banknote className="h-4 w-4 shrink-0 text-cyan-400" />{value} ₺</label>
            <input id={`banknote-${value}`} aria-label={`${value} TL banknot adedi`} type="number" inputMode="numeric" min={0} max={1000000} step={1} value={fields[value]} onChange={event => { const quantity = event.target.value; if (/^\d*$/.test(quantity)) setFields(previous => ({ ...previous, [value]: quantity })); }} className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-base font-mono text-zinc-100 focus:outline-none focus:border-cyan-400" />
            <output aria-label={`${value} TL satır toplamı`} className="break-words text-right font-mono text-zinc-200">{money(value * banknotes[value])} ₺</output>
          </div>)}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3"><div><p className="text-xs text-zinc-400">Eklenecek Toplam</p><output aria-label="Banknot toplamı" className="mt-1 block font-mono text-lg font-bold text-cyan-400">{money(total)} ₺</output></div><button type="submit" disabled={saving || loading || !!error || total <= 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Kaydediliyor…' : 'Ekle'}</button></div>
      </form>}
    </div>}
    <div className="cash-transactions-panel rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-zinc-100">Günün Nakit İşlemleri</h3><button type="button" aria-label="Nakit geçmişini yenile" disabled={loading || saving} onClick={() => setReload(previous => previous + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <div className="cash-transactions-list space-y-2">
      {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
      {loading && <p role="status" className="py-4 text-center text-xs text-zinc-500">Nakit geçmişi yükleniyor…</p>}
      {!loading && !error && !entries.length && <p className="py-6 text-center text-xs text-zinc-500">Bu gün için nakit girişi bulunmuyor.</p>}
      {entries.map(entry => <article key={entry.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <button type="button" aria-expanded={expanded === entry.id} aria-controls={`cash-entry-${entry.id}`} onClick={() => setExpanded(previous => previous === entry.id ? null : entry.id)} className="flex min-h-14 w-full flex-wrap items-center justify-between gap-3 p-3 text-left text-xs">
          <span className="min-w-0"><span className="flex items-center gap-1.5 font-semibold text-zinc-200"><Clock className="h-3.5 w-3.5 shrink-0 text-zinc-500" /><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time> · {entry.kind === 'banknotes' ? 'Banknot Girişi' : entry.kind === 'opening_balance' ? 'Önceki Bakiye' : entry.amount < 0 ? 'Nakit Düzeltmesi' : 'Manuel Nakit Girişi'}</span><span className="mt-1 block break-words text-zinc-500">{entry.actorName}</span></span>
          <span className="flex items-center gap-2"><strong className={`break-words font-mono ${entry.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)} ₺</strong><ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 ${expanded === entry.id ? 'rotate-180' : ''}`} /></span>
        </button>
        {expanded === entry.id && <div id={`cash-entry-${entry.id}`} className="cash-entry-summary overflow-x-auto border-t border-zinc-800 px-3 py-2 text-xs">
          {entry.banknotes ? <p className="whitespace-nowrap font-mono text-zinc-300">{cashDenominations.filter(value => entry.banknotes![value] > 0).map(value => `${value} TL × ${entry.banknotes![value]}`).join(' + ')}<strong className="text-emerald-400"> = {money(entry.amount)} TL</strong></p> : <p className="text-zinc-400">{entry.note || 'Bu kayıtta banknot adet bilgisi bulunmuyor.'}</p>}
        </div>}
      </article>)}
      </div>
    </div>
    </div>
    {!readOnly && record && !error && <div className="space-y-2"><button type="button" disabled={saving || loading} onClick={() => { onUseSaved(record); onBack(); }} className="min-h-11 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Kaydedilen nakdi forma yükle ve geri dön</button><p className="text-[11px] text-zinc-500">Bu seçenek formdaki kaydedilmemiş nakit değerini yukarıdaki kayıtlı toplamla değiştirir.</p></div>}
  </section>;
};
