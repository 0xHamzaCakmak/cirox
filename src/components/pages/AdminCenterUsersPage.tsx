import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Save, Search, Users } from 'lucide-react';
import { api, type CenterUser, type CenterUsersData } from '../../services/api';

const field = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50';
type Draft = Omit<CenterUser, 'id'> & { newPassword: string };
const blank = (): Draft => ({ name: '', username: '', email: '', phone: '', active: true, access: 'selected', branchIds: [], newPassword: '' });

export const AdminCenterUsersPage: React.FC<{ centerId: string; initialUserId?: string; onBack: () => void }> = ({ centerId, initialUserId, onBack }) => {
  const [data, setData] = useState<CenterUsersData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialUserId || null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const base = `/admin/centers/${encodeURIComponent(centerId)}/users`;
  const edit = (user?: CenterUser) => {
    setSelectedId(user?.id || null);
    setDraft(user ? { ...user, branchIds: [...user.branchIds], newPassword: '' } : blank());
    setSearch(''); setError(''); setSuccess('');
  };
  useEffect(() => {
    let cancelled = false;
    void api<CenterUsersData>(base).then(result => {
      if (cancelled) return;
      setData(result);
      const user = result.users.find(item => item.id === initialUserId) || result.users[0];
      edit(user);
    }).catch(failure => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Kullanıcılar yüklenemedi.'); });
    return () => { cancelled = true; };
  }, [base, initialUserId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      const { newPassword, ...fields } = draft;
      const result = await api<{ userId: string }>(selectedId ? `${base}/${encodeURIComponent(selectedId)}` : base, {
        name: fields.name, username: fields.username, email: fields.email, phone: fields.phone, active: fields.active,
        access: fields.access, branchIds: fields.branchIds, ...(newPassword ? { newPassword } : {}),
      });
      const latest = await api<CenterUsersData>(base);
      setData(latest); edit(latest.users.find(user => user.id === result.userId));
      setSuccess('Kullanıcı ve şube yetkileri kaydedildi.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Kullanıcı kaydedilemedi.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const visible = data?.branches.filter(branch => [branch.name, branch.city, branch.district].some(value => value.toLocaleLowerCase('tr-TR').includes(query))) || [];
  const toggle = (id: string) => setDraft(previous => {
    const ids = previous.access === 'all' ? data!.branches.map(branch => branch.id) : previous.branchIds;
    return { ...previous, access: 'selected', branchIds: ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id] };
  });
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-base font-bold text-zinc-100"><Users className="h-5 w-5 text-indigo-400" />Merkez Kullanıcıları ve Şube Yetkileri</h2><p className="mt-1 text-sm text-zinc-400">{data?.center.name}</p></div>
      <button type="button" className={button} disabled={saving} onClick={onBack}><ArrowLeft className="h-4 w-4" />İşletmelere Dön</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
    {success && <p role="status" className="text-sm text-emerald-400">{success}</p>}
    {!data ? !error && <p role="status" className="text-sm text-zinc-400">Kullanıcılar yükleniyor…</p> : <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-3">
        <button type="button" disabled={saving} className={`${button} w-full bg-indigo-600 text-white`} onClick={() => edit()}><Plus className="h-4 w-4" />Yeni Ortak / Kullanıcı Ekle</button>
        <p className="text-xs text-zinc-500">{data.users.length} kullanıcı · {data.branches.length} bağlı işletme</p>
        <label className="block space-y-2 text-xs text-zinc-300 lg:hidden"><span className="block">Merkez Kullanıcısı</span>
          <select className={field} value={selectedId || ''} disabled={saving} onChange={event => edit(data.users.find(user => user.id === event.target.value))}>
            <option value="">Yeni Ortak / Kullanıcı</option>
            {data.users.map(user => <option key={user.id} value={user.id}>{user.name} · {user.access === 'all' ? 'Tüm şubeler' : `${user.branchIds.length} şube`}</option>)}
          </select>
        </label>
        <div className="hidden space-y-3 lg:block">
        {data.users.map(user => <button type="button" key={user.id} disabled={saving} aria-pressed={selectedId === user.id} onClick={() => edit(user)} className={`w-full min-w-0 rounded-xl border p-3 text-left ${selectedId === user.id ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
          <span className="block break-words text-sm font-semibold text-zinc-100">{user.name}</span>
          <span className="mt-1 block break-all text-xs text-zinc-400">{user.username || user.email} · {user.active ? 'Aktif' : 'Pasif'}</span>
          <span className="mt-2 block text-xs text-indigo-300">{user.access === 'all' ? `Tüm şubeler (${data.branches.length})` : `${user.branchIds.length} şube seçili`}</span>
        </button>)}
        </div>
      </div>
      <form onSubmit={submit} className="min-w-0 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-zinc-100">{selectedId ? 'Kullanıcı ve Şube Erişimini Düzenle' : 'Yeni Merkez Kullanıcısı'}</h3>
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'name' as const, label: 'Ad Soyad', max: 128, required: true },
              { key: 'username' as const, label: 'Kullanıcı Adı', max: 32, required: true },
              { key: 'email' as const, label: 'Giriş E-Postası', type: 'email', max: 128, required: true },
              { key: 'phone' as const, label: 'Telefon', type: 'tel', max: 32 },
              { key: 'newPassword' as const, label: selectedId ? 'Yeni Şifre (isteğe bağlı)' : 'Şifre', type: 'password', max: 256, required: !selectedId },
            ].map(item => <label key={item.key} className="min-w-0 space-y-1.5 text-xs text-zinc-300"><span className="block">{item.label}</span><input className={field} type={item.type || 'text'} required={item.required} maxLength={item.max} minLength={item.key === 'newPassword' ? 8 : item.key === 'username' ? 3 : undefined} pattern={item.key === 'username' ? '[a-zA-Z0-9_.-]+' : undefined} autoComplete={item.key === 'newPassword' ? 'new-password' : undefined} value={draft[item.key]} onChange={event => setDraft(previous => ({ ...previous, [item.key]: event.target.value }))} /></label>)}
            <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={draft.active} onChange={event => setDraft(previous => ({ ...previous, active: event.target.checked }))} />Kullanıcı aktif</label>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div><h4 className="text-sm font-semibold text-zinc-100">Görebileceği İşletmeler</h4><p className="mt-1 text-xs leading-relaxed text-zinc-400">Kullanıcı yalnızca seçili işletmelerin cirolarını, işlemlerini ve bildirimlerini görebilir. Hiçbir işletme seçilmezse işletme verisi göremez.</p></div>
            <label className="flex items-start gap-2 text-xs text-zinc-300"><input type="checkbox" className="mt-0.5" checked={draft.access === 'all'} onChange={event => setDraft(previous => ({ ...previous, access: event.target.checked ? 'all' : 'selected', branchIds: event.target.checked ? data.branches.map(branch => branch.id) : previous.branchIds }))} /><span>Merkezin tüm mevcut ve gelecekte eklenecek şubelerini görebilsin</span></label>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input type="search" aria-label="Yetkilendirilecek işletme ara" className={`${field} pl-9`} placeholder="İşletme, il veya ilçe ara…" value={search} onChange={event => setSearch(event.target.value)} /></div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="mr-auto text-indigo-300">{draft.access === 'all' ? data.branches.length : draft.branchIds.length} / {data.branches.length} işletme seçili</span>
              <button type="button" className={button} onClick={() => setDraft(previous => ({ ...previous, access: 'selected', branchIds: [...new Set([...previous.branchIds, ...visible.map(branch => branch.id)])] }))}>Listelenenleri Seç</button>
              <button type="button" className={button} onClick={() => setDraft(previous => ({ ...previous, access: 'selected', branchIds: [] }))}>Seçimleri Temizle</button>
            </div>
            <div className="max-h-[440px] space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-2">
              {visible.map(branch => <label key={branch.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-zinc-950 p-3"><input type="checkbox" className="mt-1" checked={draft.access === 'all' || draft.branchIds.includes(branch.id)} onChange={() => toggle(branch.id)} /><span className="min-w-0"><span className="block break-words text-sm text-zinc-200">{branch.name}</span><span className="mt-1 block text-xs text-zinc-500">{[branch.district, branch.city].filter(Boolean).join(' / ') || 'Konum belirtilmedi'}</span></span></label>)}
              {visible.length === 0 && <p className="p-3 text-xs text-zinc-400">{data.branches.length ? 'Aramaya uygun işletme bulunamadı.' : 'Bu merkeze henüz işletme bağlanmamış.'}</p>}
            </div>
          </div>
          <div className="flex justify-end border-t border-zinc-800 pt-4"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Kaydediliyor…' : 'Kullanıcı ve Yetkileri Kaydet'}</button></div>
        </fieldset>
      </form>
    </div>}
  </section>;
};
