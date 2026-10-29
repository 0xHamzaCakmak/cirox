import React, { useRef, useState } from 'react';
import { ArrowLeft, Calendar, Save, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Company, SubscriptionUpdate } from '../../types';
import { subscriptionRenewalDate } from '../../data/subscriptionDates';

const field = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
export const AdminSubscriptionEditPage: React.FC<{ company: Company; onBack: () => void }> = ({ company, onBack }) => {
  const { updateCompanySubscription } = useApp();
  const [form, setForm] = useState<SubscriptionUpdate>(() => ({
    planName: company.subscription.planName, price: company.subscription.price, branchLimit: company.subscription.branchLimit,
    billingCycle: company.subscription.billingCycle, billingMethod: company.subscription.billingMethod,
    status: company.subscription.status, startDate: company.subscription.startDate, nextBillingDate: company.subscription.nextBillingDate,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const update = <K extends keyof SubscriptionUpdate>(key: K, value: SubscriptionUpdate[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const changeStart = (value: string) => setForm(previous => ({ ...previous, startDate: value,
    nextBillingDate: subscriptionRenewalDate(value, previous.billingCycle) || previous.nextBillingDate }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (!form.startDate || !form.nextBillingDate || form.nextBillingDate <= form.startDate) { setError('Bitiş / yenileme tarihi başlangıç tarihinden sonra olmalıdır.'); return; }
    busy.current = true; setSaving(true); setError('');
    try { await updateCompanySubscription(company.id, form); onBack(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Lisans kaydedilemedi.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="mx-auto w-full max-w-5xl space-y-5" aria-labelledby="subscription-edit-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="subscription-edit-title" className="flex items-center gap-2 text-lg font-bold text-zinc-100"><Shield className="h-5 w-5 text-indigo-400" />Abonelik & Lisans Düzenle</h2><p className="mt-1 text-sm text-zinc-400">{company.name}</p></div>
      <button type="button" disabled={saving} onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><ArrowLeft className="h-4 w-4 text-emerald-400" strokeWidth={3} />Aboneler ve Lisanslara Dön</button>
    </div>
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <fieldset disabled={saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-60">
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Paket Adı</span><input required maxLength={64} className={field} value={form.planName} onChange={event => update('planName', event.target.value)} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Lisans Bedeli (₺)</span><input required type="number" min={0} max={9999999999.99} step="0.01" className={field} value={form.price} onChange={event => update('price', Number(event.target.value))} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Şube / Masa Limiti</span><input required type="number" min={1} max={10000} step={1} className={field} value={form.branchLimit} onChange={event => update('branchLimit', Number(event.target.value))} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Lisans Durumu</span><select className={field} value={form.status} onChange={event => update('status', event.target.value as SubscriptionUpdate['status'])}><option value="active">Aktif</option><option value="trial">Deneme</option><option value="passive">Pasif / Askıda</option><option value="past_due">Vadesi Geçmiş</option></select></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Lisans Dönemi</span><select className={field} value={form.billingCycle} onChange={event => { const cycle = event.target.value as SubscriptionUpdate['billingCycle']; setForm(previous => ({ ...previous, billingCycle: cycle, nextBillingDate: subscriptionRenewalDate(previous.startDate, cycle) || previous.nextBillingDate })); }}><option value="yearly">Yıllık</option><option value="monthly">Aylık</option></select></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Lisans Başlangıç Tarihi</span><input required type="date" min="1970-01-01" max="2100-12-30" className={field} value={form.startDate} onChange={event => changeStart(event.target.value)} /></label>
        <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Bitiş / Yenileme Tarihi</span><input required type="date" min={form.startDate || '1970-01-01'} max="2100-12-31" className={field} value={form.nextBillingDate} onChange={event => update('nextBillingDate', event.target.value)} /></label>
        <p className="text-xs leading-relaxed text-zinc-400 sm:col-span-2">Başlangıç tarihi ileri bir gün olabilir. Başlangıç veya dönem değiştiğinde yenileme tarihi hesaplanır; isterseniz elle değiştirebilirsiniz. Deneme vermek için durumu “Deneme” seçip denemenin bitiş tarihini belirleyin.</p>
        <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Tahsilat Modeli</span><select className={field} value={form.billingMethod} onChange={event => update('billingMethod', event.target.value as SubscriptionUpdate['billingMethod'])}><option value="bank_transfer">Banka Havalesi / EFT</option><option value="credit_card">Kredi Kartı</option><option value="manual">Manuel Nakit / Elden</option></select></label>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
        <button type="button" disabled={saving} onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 disabled:opacity-50">Vazgeç</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Kaydediliyor…' : 'Lisansı Kaydet'}</button>
      </div>
    </form>
  </section>;
};
