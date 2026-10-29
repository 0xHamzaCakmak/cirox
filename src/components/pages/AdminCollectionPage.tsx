import React, { useRef, useState } from 'react';
import { ArrowLeft, CreditCard, Save, Landmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Company, BillingMethod } from '../../types';
import { createClientId } from '../../services/clientId';
import { istanbulToday } from '../../data/branchInspectionRange';

const field = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
export const AdminCollectionPage: React.FC<{ company?: Company; onBack: () => void; onManageBanks: () => void }> = ({ company, onBack, onManageBanks }) => {
  const { companies, bankAccounts, chargeCompany } = useApp();
  const [companyId, setCompanyId] = useState(company?.id || companies[0]?.id || '');
  const selected = companies.find(item => item.id === companyId);
  const [amount, setAmount] = useState(company?.subscription.price || companies[0]?.subscription.price || 0);
  const [method, setMethod] = useState<BillingMethod>(company?.subscription.billingMethod || 'bank_transfer');
  const [bankId, setBankId] = useState('');
  const [date, setDate] = useState(istanbulToday);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState(company ? `${company.name} — Lisans tahsilatı` : '');
  const [renew, setRenew] = useState(true);
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const busy = useRef(false), requestId = useRef(createClientId());
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy.current) return;
    if (!selected || amount <= 0 || (method !== 'manual' && !bankId)) { setError('İşletme, pozitif bir tutar ve uygun banka hesabı seçin.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await chargeCompany(companyId, amount, method, notes, { date, bankAccountId: method === 'manual' ? null : bankId, receiptNumber, renewLicense: renew, clientRequestId: requestId.current });
      onBack();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tahsilat kaydedilemedi.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="mx-auto w-full max-w-5xl space-y-5" aria-labelledby="collection-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="collection-title" className="flex items-center gap-2 text-lg font-bold text-zinc-100"><CreditCard className="h-5 w-5 text-indigo-400" />Lisans Tahsilatı Kaydet</h2><p className="mt-1 text-sm text-zinc-400">{selected?.name || 'Ödeme yapan işletmeyi seçin'}</p></div><button disabled={saving} onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300"><ArrowLeft className="h-4 w-4 text-emerald-400" strokeWidth={3} />Geri Dön</button></div>
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <fieldset disabled={saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-60">
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Ödeme Yapan İşletme / Merkez</span><select required disabled={!!company} className={field} value={companyId} onChange={event => { setCompanyId(event.target.value); setAmount(companies.find(item => item.id === event.target.value)?.subscription.price || 0); }}><option value="">İşletme seçin</option>{companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Tahsil Edilen Tutar (₺)</span><input required type="number" min="0.01" max="9999999999.99" step="0.01" className={field} value={amount} onChange={event => setAmount(Number(event.target.value))} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Tahsilat Tarihi</span><input required type="date" min="1970-01-01" max={istanbulToday()} className={field} value={date} onChange={event => setDate(event.target.value)} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Tahsilat Yolu</span><select className={field} value={method} onChange={event => setMethod(event.target.value as BillingMethod)}><option value="bank_transfer">Banka Havalesi / EFT</option><option value="credit_card">Gerçekleşmiş Kart Tahsilatı</option><option value="manual">Nakit / Elden</option></select></label>
        {method !== 'manual' && <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Tutarın Yattığı Banka Hesabı</span><select required className={field} value={bankId} onChange={event => setBankId(event.target.value)}><option value="">Banka hesabı seçin</option>{bankAccounts.filter(bank => bank.isActive && bank.currency === 'TRY').map(bank => <option key={bank.id} value={bank.id}>{bank.bankName} — {bank.accountName} — {bank.iban.slice(-6)}</option>)}</select></label>}
        {method !== 'manual' && <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 sm:col-span-2"><span>{bankAccounts.length ? 'Tahsilat seçilen hesabın toplamına eklenecek.' : 'Önce tahsilat için bir banka hesabı ekleyin.'}</span><button type="button" onClick={onManageBanks} className="inline-flex items-center gap-1 text-indigo-300 underline"><Landmark className="h-3.5 w-3.5" />Banka Hesapları</button></div>}
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Dekont / Referans Numarası (İsteğe Bağlı)</span><input maxLength={128} className={field} value={receiptNumber} onChange={event => setReceiptNumber(event.target.value)} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Açıklama</span><textarea maxLength={2000} rows={3} className={field} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <label className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200 sm:col-span-2"><input type="checkbox" className="mt-1 accent-indigo-500" checked={renew} onChange={event => setRenew(event.target.checked)} /><span>Lisansı bir {selected?.subscription.billingCycle === 'yearly' ? 'yıl' : 'ay'} uzat ve aktif yap<span className="mt-1 block text-xs text-zinc-400">İşaretlemezseniz yalnız tahsilat kaydedilir; lisans tarihleri ve durumu korunur.</span></span></label>
      </fieldset>
      <p className="text-xs text-zinc-400">Bu ekran gerçekleşmiş ödemeyi kaydeder; banka veya kredi kartından para çekmez.</p>
      <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4"><button type="button" disabled={saving} onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300">Vazgeç</button><button disabled={saving || !companies.length} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Kaydediliyor…' : 'Tahsilatı Kaydet'}</button></div>
    </form>
  </section>;
};
