import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, KeyRound, RefreshCw, Search, Store } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, type AdminBusinessAccount } from '../../services/api';

const inputClass = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50';
const statusLabels = { active: 'Aktif', passive: 'Pasif', trial: 'Deneme', past_due: 'Vadesi Geçmiş' };
const formatDate = (value: string) => new Date(value).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });

export const AdminBusinessesPage: React.FC = () => {
  const { currentUser } = useApp();
  const [accounts, setAccounts] = useState<AdminBusinessAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccessId, setResetSuccessId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let cancelled = false;
    setLoading(true); setLoadError('');
    void api<{ accounts: AdminBusinessAccount[] }>('/admin/accounts').then(result => {
      if (!cancelled) setAccounts(result.accounts);
    }).catch(error => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : 'İşletmeler yüklenemedi.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role, reload]);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return accounts.filter(account => (filter === 'all' || account.kind === filter) &&
      [account.name, account.ownerName, account.ownerEmail, account.ownerPhone,
        ...account.users.flatMap(user => [user.name, user.username || '', user.email, user.phone]),
        ...account.branches.flatMap(branch => [branch.name, branch.centerName])]
        .some(value => value.toLocaleLowerCase('tr-TR').includes(query)));
  }, [accounts, search, filter]);

  const clearReset = () => {
    setResetUserId(null); setNewPassword(''); setConfirmation(''); setResetError('');
  };
  const startReset = (userId: string) => {
    if (submitting.current) return;
    setNewPassword(''); setConfirmation(''); setResetError(''); setResetSuccessId(null);
    setResetUserId(userId);
  };
  const resetPassword = async (event: React.FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault();
    if (submitting.current) return;
    if (newPassword !== confirmation) { setResetError('Yeni şifre ile tekrarı aynı olmalıdır.'); return; }
    submitting.current = true; setSaving(true); setResetError('');
    try {
      await api<void>(`/admin/users/${encodeURIComponent(userId)}/reset-password`, { newPassword });
      clearReset(); setResetSuccessId(userId);
    } catch (error) { setResetError(error instanceof Error ? error.message : 'Şifre sıfırlanamadı.'); }
    finally { submitting.current = false; setSaving(false); }
  };

  if (currentUser?.role !== 'admin') return null;
  return <section className="space-y-4" aria-labelledby="admin-businesses-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="admin-businesses-title" className="text-base font-bold text-zinc-100">İşletmeler</h2>
        <p className="mt-1 text-xs text-zinc-400">İşletme ve merkez / patron hesaplarının kullanıcı bilgileri ve şifre yönetimi.</p>
      </div>
      <button type="button" className={buttonClass} disabled={loading || saving} onClick={() => setReload(value => value + 1)}>
        <RefreshCw className="h-4 w-4" />Yenile
      </button>
    </div>
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
        <input className={`${inputClass} pl-10`} aria-label="İşletme veya kullanıcı ara" placeholder="İşletme, kullanıcı adı, e-posta veya telefon ara…"
          value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      <select aria-label="Hesap türü" className={`${inputClass} sm:w-56`} value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">Tüm Hesaplar</option><option value="business">İşletmeler / Şubeler</option><option value="center">Merkez / Patron Hesapları</option>
      </select>
    </div>
    {loadError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{loadError}</p>}
    {loading ? <p role="status" className="py-8 text-center text-sm text-zinc-400">İşletmeler yükleniyor…</p> : !loadError && <>
      <p className="text-xs text-zinc-500">{visibleAccounts.length} / {accounts.length} hesap gösteriliyor.</p>
      <div className="space-y-4">{visibleAccounts.map(account => {
        const Icon = account.kind === 'center' ? Building2 : Store;
        return <article key={account.id} className="min-w-0 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-indigo-400" />
              <div className="min-w-0 break-words">
                <h3 className="text-sm font-bold text-zinc-100">{account.name}</h3>
                <p className="mt-1 text-xs text-zinc-400">{account.kind === 'center' ? 'Merkez / Patron' : 'İşletme / Şube'} · Kayıt: {formatDate(account.createdAt)}</p>
                {account.kind === 'center' && <p className="mt-2 text-sm font-semibold text-indigo-300">Bağlı işletme: {account.branches.length} / {account.branchLimit}</p>}
              </div>
            </div>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${account.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{statusLabels[account.status]}</span>
          </div>
          {account.users.length === 0 ? <div className="space-y-2 rounded-xl bg-zinc-950 p-4 text-xs text-zinc-400">
            <p>Bu hesaba ait giriş kullanıcısı bulunmuyor.</p><p>Yetkili: {account.ownerName || '—'} · E-posta: {account.ownerEmail || '—'} · Telefon: {account.ownerPhone || '—'}</p>
          </div> : account.users.map(user => <div key={user.id} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><p className="break-words text-sm font-semibold text-zinc-200">{user.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{user.role === 'merkez' ? 'Patron / Merkez Kullanıcısı' : 'Şube Kullanıcısı'} · {user.active ? 'Aktif' : 'Pasif'}</p>
              </div>
              <button type="button" className={buttonClass} disabled={saving} onClick={() => startReset(user.id)} aria-expanded={resetUserId === user.id}>
                <KeyRound className="h-4 w-4" />Şifre Sıfırla
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs">
              {[
                ['Kullanıcı Adı', user.username || '—'], ['E-posta', user.email || '—'],
                ['Telefon', user.phone || '—'], ['Kullanıcı Kayıt Tarihi', formatDate(user.createdAt)],
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-zinc-500">{label}</dt><dd className="break-all text-zinc-200 select-text">{value}</dd></div>)}
            </dl>
            {resetSuccessId === user.id && <p role="status" className="text-sm text-emerald-400">Şifre sıfırlandı. Kullanıcının açık oturumları kapatıldı; yeni şifreyle giriş yapabilir.</p>}
            {resetUserId === user.id && <form onSubmit={event => void resetPassword(event, user.id)} className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-400">{user.username || user.email} için yeni şifre belirleyin. Kaydedildiğinde bu kullanıcının tüm açık oturumları kapatılır.</p>
              {resetError && <p role="alert" className="text-sm text-rose-400">{resetError}</p>}
              <fieldset disabled={saving} className="space-y-3 disabled:opacity-60">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-xs text-zinc-300"><span className="block">Yeni Şifre</span>
                    <input type="password" autoComplete="new-password" minLength={8} maxLength={256} required value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-2 text-xs text-zinc-300"><span className="block">Yeni Şifre Tekrar</span>
                    <input type="password" autoComplete="new-password" minLength={8} maxLength={256} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className={inputClass} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <span className="mr-auto text-xs text-zinc-500">En az 8 karakter.</span>
                  <button type="button" onClick={clearReset} className={buttonClass}>Vazgeç</button>
                  <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">{saving ? 'Kaydediliyor…' : 'Yeni Şifreyi Kaydet'}</button>
                </div>
              </fieldset>
            </form>}
          </div>)}
          {account.branches.length > 0 && <details className="rounded-xl border border-zinc-800 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-300">{account.kind === 'center' ? 'Bağlı İşletmeler' : 'Şube ve Merkez Bilgileri'} ({account.branches.length})</summary>
            <ul className="mt-3 space-y-2">{account.branches.map(branch => <li key={branch.id} className="break-words text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">{branch.name}</span> · {[branch.district, branch.city].filter(Boolean).join(' / ') || 'Konum belirtilmedi'}
              {account.kind === 'business' && <span> · Merkez: {branch.centerName || 'Bağımsız'}</span>}
            </li>)}</ul>
          </details>}
        </article>;
      })}</div>
      {visibleAccounts.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">Bu aramaya uygun hesap bulunamadı.</p>}
    </>}
  </section>;
};
