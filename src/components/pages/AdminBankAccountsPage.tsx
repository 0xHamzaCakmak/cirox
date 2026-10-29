import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Landmark, Plus, RefreshCw, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BankAccountInput } from '../../types';

const field = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50';
const money = (amount: number) => amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AdminBankAccountCreatePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addBankAccount } = useApp();
  const [form, setForm] = useState<BankAccountInput>({ bankName: '', accountName: '', iban: '', branchCode: '', currency: 'TRY', notes: '' });
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const busy = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { await addBankAccount(form); onBack(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Banka hesabı kaydedilemedi.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="mx-auto w-full max-w-5xl space-y-5" aria-labelledby="bank-create-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="bank-create-title" className="flex items-center gap-2 text-lg font-bold text-zinc-100"><Landmark className="h-5 w-5 text-indigo-400" />Banka Hesabı Ekle</h2><button disabled={saving} onClick={onBack} className={button}><ArrowLeft className="h-4 w-4 text-emerald-400" strokeWidth={3} />Banka Hesaplarına Dön</button></div>
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <fieldset disabled={saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-60">
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Banka Adı</span><input required maxLength={128} className={field} value={form.bankName} onChange={event => setForm({ ...form, bankName: event.target.value })} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Hesap Sahibi / Alıcı Unvanı</span><input required maxLength={255} className={field} value={form.accountName} onChange={event => setForm({ ...form, accountName: event.target.value })} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">IBAN</span><input required minLength={26} maxLength={34} placeholder="TR00 0000 0000 0000 0000 0000 00" autoCapitalize="characters" spellCheck={false} className={`${field} font-mono`} value={form.iban} onChange={event => setForm({ ...form, iban: event.target.value.toUpperCase() })} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Şube Kodu / Şube Adı (İsteğe Bağlı)</span><input maxLength={128} className={field} value={form.branchCode} onChange={event => setForm({ ...form, branchCode: event.target.value })} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Para Birimi</span><select className={field} value="TRY" disabled><option value="TRY">Türk Lirası (TRY)</option></select></label>
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Not (İsteğe Bağlı)</span><textarea maxLength={1000} rows={3} className={field} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      </fieldset>
      <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4"><button type="button" disabled={saving} onClick={onBack} className={button}>Vazgeç</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Kaydediliyor…' : 'Banka Hesabını Kaydet'}</button></div>
    </form>
  </section>;
};

export const AdminBankAccountsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { bankAccounts, payments, refreshAdminFinance } = useApp();
  const [creating, setCreating] = useState(false), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const [bankId, setBankId] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [copied, setCopied] = useState(''), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const rows = useMemo(() => payments.filter(payment => (!bankId || payment.bankAccountId === bankId) && (!start || payment.date >= start) && (!end || payment.date <= end)), [payments, bankId, start, end]);
  const total = rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, pages), offset = (current - 1) * pageSize;
  const refresh = async () => { setRefreshing(true); setError(''); try { await refreshAdminFinance(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Banka hesapları yenilenemedi.'); } finally { setRefreshing(false); } };
  const copy = async (iban: string) => { try { await navigator.clipboard.writeText(iban); setCopied(iban); } catch { setError('IBAN kopyalanamadı. Hesap üzerindeki IBAN metnini seçerek kopyalayabilirsiniz.'); } };
  if (creating) return <AdminBankAccountCreatePage onBack={() => setCreating(false)} />;
  return <section className="space-y-5" aria-labelledby="bank-list-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="bank-list-title" className="flex items-center gap-2 text-lg font-bold text-zinc-100"><Landmark className="h-5 w-5 text-indigo-400" />Banka Hesapları</h2><p className="mt-1 text-xs text-zinc-400">Hesap bazında kaydedilen tahsilatlar ve hareketler. Tutarlar banka bakiyesi değildir.</p></div><div className="flex flex-wrap gap-2"><button onClick={onBack} className={button}><ArrowLeft className="h-4 w-4 text-emerald-400" strokeWidth={3} />Geri Dön</button><button disabled={refreshing} onClick={() => void refresh()} className={button}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Yenile</button><button onClick={() => setCreating(true)} className={`${button} bg-indigo-600 text-white`}><Plus className="h-4 w-4" />Banka Hesabı Ekle</button></div></div>
    {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
    {!bankAccounts.length && <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">Henüz banka hesabı eklenmedi. “Banka Hesabı Ekle” ile ilk hesabınızı oluşturun.</p>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{bankAccounts.map(bank => <article key={bank.id} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div><h3 className="font-semibold text-zinc-100">{bank.bankName}</h3><p className="mt-1 break-words text-sm text-zinc-400">{bank.accountName}</p><p className="mt-1 text-xs text-zinc-500">{bank.branchCode || 'Şube bilgisi belirtilmedi'} · {bank.currency}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-950 p-3"><span className="select-text break-all font-mono text-xs text-zinc-200">{bank.iban.replace(/(.{4})/g, '$1 ').trim()}</span><button aria-label={`${bank.bankName} IBAN kopyala`} onClick={() => void copy(bank.iban)} className="inline-flex items-center gap-1 text-xs text-indigo-300"><Copy className="h-3.5 w-3.5" />{copied === bank.iban ? 'Kopyalandı' : 'Kopyala'}</button></div>
      <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-zinc-400">Kayıtlı tahsilat · {bank.paymentCount} işlem</span><strong className="font-mono text-emerald-400">{money(bank.totalCollected)} ₺</strong></div>
      {bank.notes && <p className="break-words text-xs text-zinc-500">{bank.notes}</p>}
      <button onClick={() => { setBankId(bank.id); setPage(1); }} className={button}>Tahsilatları Göster</button>
    </article>)}</div>
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-zinc-100">Tahsilat Hareketleri</h3><span className="font-mono text-sm text-emerald-400">Filtrelenen toplam: {money(total)} ₺</span></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="space-y-1 text-xs text-zinc-400"><span className="block">Banka Hesabı</span><select className={field} value={bankId} onChange={event => { setBankId(event.target.value); setPage(1); }}><option value="">Tüm Hesaplar / Nakit</option>{bankAccounts.map(bank => <option key={bank.id} value={bank.id}>{bank.bankName} — {bank.iban.slice(-6)}</option>)}</select></label><label className="space-y-1 text-xs text-zinc-400"><span className="block">Başlangıç Tarihi</span><input type="date" className={field} value={start} onChange={event => { setStart(event.target.value); setPage(1); }} /></label><label className="space-y-1 text-xs text-zinc-400"><span className="block">Bitiş Tarihi</span><input type="date" className={field} value={end} onChange={event => { setEnd(event.target.value); setPage(1); }} /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b border-zinc-800 text-zinc-400"><tr><th className="p-3">Tarih</th><th className="p-3">İşletme / Merkez</th><th className="p-3">Banka / Hesap</th><th className="p-3">Referans / Dekont</th><th className="p-3 text-right">Tutar</th></tr></thead><tbody className="divide-y divide-zinc-800">{!rows.length && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Seçilen filtrelerde tahsilat bulunmuyor.</td></tr>}{rows.slice(offset, offset + pageSize).map(payment => <tr key={payment.id}><td className="p-3 whitespace-nowrap text-zinc-400">{payment.date.split('-').reverse().join('.')}</td><td className="p-3 text-zinc-200">{payment.companyName}</td><td className="p-3 text-zinc-400">{payment.bankName ? `${payment.bankName} · ${payment.iban?.slice(-6)}` : 'Nakit / Elden'}</td><td className="p-3 text-zinc-400"><p>{payment.receiptNumber || payment.transactionId}</p><p className="mt-1 text-zinc-500">{payment.description}</p></td><td className="p-3 text-right font-mono text-emerald-400">{money(payment.amount)} ₺</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-xs text-zinc-400"><label className="flex items-center gap-2">Sayfa başına<select className="rounded-lg border border-zinc-700 bg-zinc-950 p-2" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label><div className="flex items-center gap-3"><button disabled={current === 1} onClick={() => setPage(current - 1)} className={button}>Önceki</button><span>{current} / {pages}</span><button disabled={current === pages} onClick={() => setPage(current + 1)} className={button}>Sonraki</button></div></div>
    </div>
  </section>;
};
