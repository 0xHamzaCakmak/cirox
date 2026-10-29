import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Branch, Company } from '../../types';
import type { CenterAccountInput } from '../../services/api';

const fieldClass = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-zinc-800 disabled:opacity-50';

const BranchCenterRow: React.FC<{
  branch: Branch; centers: Company[]; busy: boolean;
  save: (branchId: string, centerId: string | null) => Promise<void>;
}> = ({ branch, centers, busy, save }) => {
  const [centerId, setCenterId] = useState(branch.centerCompanyId || '');
  useEffect(() => { setCenterId(branch.centerCompanyId || ''); }, [branch.centerCompanyId]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="min-w-0 break-words">
        <p className="text-sm font-semibold text-zinc-100">{branch.name}</p>
        <p className="mt-1 text-xs text-zinc-400">{branch.username || branch.loginEmail || branch.code}</p>
        <p className="mt-1 text-xs text-zinc-500">Mevcut merkez: {branch.centerName || 'Merkez yok'}</p>
      </div>
      <select aria-label={`${branch.name} için merkez`} className={fieldClass} value={centerId} disabled={busy}
        onChange={event => setCenterId(event.target.value)}>
        <option value="">Bağımsız — merkez yok</option>
        {centers.map(center => <option key={center.id} value={center.id}
          disabled={center.subscription.status === 'passive' && center.id !== branch.centerCompanyId}>
          {center.name}{center.subscription.status === 'passive' ? ' (Pasif)' : ''}
        </option>)}
      </select>
      <button type="button" className={actionClass} disabled={busy || centerId === (branch.centerCompanyId || '')}
        onClick={() => void save(branch.id, centerId || null)}>Kaydet</button>
    </div>
  );
};

export function AdminCenterManagement({ view }: { view: 'create' | 'branches' }) {
  const { companies, adminBranches, createCenterAccount, updateBranchCenter, setActiveTab } = useApp();
  const mode = view;
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const centers = useMemo(() => companies.filter(company => company.kind === 'center'), [companies]);
  const visibleBranches = useMemo(() => adminBranches.filter(branch => {
    const matchesSearch = [branch.name, branch.username, branch.loginEmail, branch.centerName, branch.city, branch.district]
      .some(value => value?.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
    return matchesSearch && (centerFilter === 'all' || (centerFilter === 'none' ? !branch.centerCompanyId : branch.centerCompanyId === centerFilter));
  }), [adminBranches, search, centerFilter]);

  const close = () => {
    if (submitting.current) return;
    setActiveTab(mode === 'create' ? 'admin_branch_centers' : 'admin_tenants');
  };
  const saveBranch = async (branchId: string, centerId: string | null) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await updateBranchCenter(branchId, centerId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Merkez bağlantısı kaydedilemedi.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const createCenter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const input: CenterAccountInput = {
      name: String(form.get('name') || '').trim(), username: String(form.get('username') || '').trim().toLowerCase(),
      ownerName: String(form.get('ownerName') || '').trim(), ownerEmail: String(form.get('ownerEmail') || '').trim(),
      ownerPassword: String(form.get('ownerPassword') || ''), ownerPhone: String(form.get('ownerPhone') || '').trim(),
      branchLimit: Number(form.get('branchLimit')), price: Number(form.get('price')),
      billingMethod: form.get('billingMethod') as CenterAccountInput['billingMethod'], notes: String(form.get('notes') || ''),
    };
    submitting.current = true; setBusy(true); setError('');
    try {
      await createCenterAccount(input);
      setActiveTab('admin_branch_centers');
    } catch (err) { setError(err instanceof Error ? err.message : 'Merkez hesabı oluşturulamadı.'); }
    finally { submitting.current = false; setBusy(false); }
  };

  return <section aria-labelledby="admin-center-title" className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-5">
        <h2 id="admin-center-title" className="text-base font-bold">{mode === 'create' ? 'Merkez / Patron Hesabı Oluştur' : 'Şube–Merkez Bağlantıları'}</h2>
        <button type="button" onClick={close} disabled={busy} className="rounded-lg p-2 text-xs hover:bg-zinc-800 disabled:opacity-50">{mode === 'create' ? 'Bağlantılara Dön' : 'Aboneler ve Lisanslara Dön'}</button>
      </div>
      <div className="space-y-5 p-5">
        {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        {mode === 'create' ? <>
          <p className="text-sm text-zinc-400">Patron bu hesapla giriş yaparak bağlı şubelerin ciro, gider ve raporlarını görüntüler. Şube kayıtları kendi hesaplarında kalır.</p>
          <form onSubmit={createCenter}>
            <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'name', label: 'Merkez / Marka Adı', max: 128, required: true },
                  { name: 'ownerName', label: 'Patron / Yetkili Adı', max: 128, required: true },
                  { name: 'username', label: 'Kullanıcı Adı', max: 32, required: true, type: 'text', autoComplete: 'off' },
                  { name: 'ownerEmail', label: 'Giriş E-postası', max: 128, required: true, type: 'email', autoComplete: 'off' },
                  { name: 'ownerPassword', label: 'Giriş Şifresi', max: 256, required: true, type: 'password', autoComplete: 'new-password' },
                  { name: 'ownerPhone', label: 'Telefon', max: 32, required: false, type: 'tel' },
                ].map(field => <label key={field.name} className="block space-y-2 text-xs font-medium text-zinc-300">
                  <span>{field.label}</span>
                  <input name={field.name} type={field.type || 'text'} required={field.required} maxLength={field.max}
                    minLength={field.name === 'username' ? 3 : field.name === 'ownerPassword' ? 6 : undefined}
                    title={field.name === 'username' ? '3–32 karakter. Özel karakter zorunlu değildir. Örnek: savcisahin' : undefined}
                    autoComplete={field.autoComplete} autoCapitalize={field.name === 'username' ? 'none' : undefined} className={fieldClass} />
                </label>)}
                <label className="block space-y-2 text-xs font-medium text-zinc-300"><span>Bağlanabilecek Şube Sayısı</span>
                  <input name="branchLimit" type="number" min="1" max="10000" step="1" required defaultValue="10" className={fieldClass} />
                </label>
                <label className="block space-y-2 text-xs font-medium text-zinc-300"><span>Yıllık Merkez Lisans Bedeli (₺)</span>
                  <input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue="0" className={fieldClass} />
                </label>
              </div>
              <p className="text-xs text-zinc-500">Kullanıcı adı 3–32 karakter olmalıdır; özel karakter zorunlu değildir (örnek: savcisahin). Şifre en az 6 karakter olmalıdır. Patron kullanıcı adı veya e-posta ile giriş yapabilir.</p>
              <label className="block space-y-2 text-xs font-medium text-zinc-300"><span>Ödeme Yöntemi</span>
                <select name="billingMethod" defaultValue="bank_transfer" className={fieldClass}>
                  <option value="bank_transfer">Banka Havalesi</option><option value="credit_card">Kredi Kartı</option><option value="manual">Manuel</option>
                </select>
              </label>
              <label className="block space-y-2 text-xs font-medium text-zinc-300"><span>Not (İsteğe Bağlı)</span>
                <textarea name="notes" maxLength={5000} rows={2} className={fieldClass} />
              </label>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button type="button" onClick={close} className={actionClass}>Vazgeç</button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-500">{busy ? 'Oluşturuluyor…' : 'Merkez Hesabını Oluştur'}</button>
              </div>
            </fieldset>
          </form>
        </> : <>
          <p className="text-sm text-zinc-400">Mevcut şubeyi bir merkeze bağlayın, başka merkeze taşıyın veya bağımsız bırakın. Şubenin giriş bilgileri, lisansı ve kayıtları korunur.</p>
          <details className="rounded-xl border border-zinc-800 p-4">
            <summary className="cursor-pointer text-sm font-semibold">Merkez / Patron Hesapları ({centers.length})</summary>
            {centers.length === 0 ? <p className="mt-3 text-sm text-zinc-400">Henüz merkez yok. Önce bir merkez / patron hesabı oluşturun.</p> :
              <div className="mt-3 space-y-3">{centers.map(center => <div key={center.id} className="flex flex-wrap justify-between gap-2 text-xs">
                <div className="min-w-0 break-words"><p className="font-semibold text-zinc-200">{center.name}</p><p className="text-zinc-400">{center.ownerName} · {center.ownerEmail}</p></div>
                <span className="text-zinc-400">{adminBranches.filter(branch => branch.centerCompanyId === center.id).length} / {center.subscription.branchLimit} şube</span>
              </div>)}</div>}
          </details>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input aria-label="Şube ara" placeholder="Şube, kullanıcı veya konum ara…" value={search} onChange={event => setSearch(event.target.value)} className={fieldClass} />
            <select aria-label="Merkeze göre filtrele" value={centerFilter} onChange={event => setCenterFilter(event.target.value)} className={fieldClass}>
              <option value="all">Tüm Şubeler</option><option value="none">Bağımsız Şubeler</option>
              {centers.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-zinc-500">{visibleBranches.length} şube gösteriliyor.</p>
          <div className="space-y-3">{visibleBranches.map(branch => <BranchCenterRow key={branch.id} branch={branch} centers={centers} busy={busy} save={saveBranch} />)}</div>
          {!visibleBranches.length && <p className="py-5 text-center text-sm text-zinc-400">Bu filtreye uygun şube bulunamadı. Bağlantı yapmak için “Tüm Şubeler” veya “Bağımsız Şubeler” seçeneğini kullanabilirsiniz.</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={() => setActiveTab('admin_center_create')} className={actionClass}>Merkez / Patron Ekle</button>
            <button type="button" disabled={busy} onClick={close} className={actionClass}>Aboneler ve Lisanslara Dön</button>
          </div>
        </>}
      </div>
    </section>;
}
