import React from 'react';
import type { AdminAccountDetails, Company } from '../../types';

const field = 'w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-400';
type TextField = { key: string; label: string; max: number; required?: boolean; type?: string };
const businessFields: TextField[] = [
  { key: 'legalName', label: 'Resmi Unvan', max: 255 },
  { key: 'tradeRegisterNo', label: 'Ticaret Sicil No', max: 64 },
  { key: 'taxOffice', label: 'Vergi Dairesi', max: 128 },
  { key: 'taxNumber', label: 'Vergi Kimlik Numarası (VKN)', max: 11 },
  { key: 'contactEmail', label: 'İletişim E-Postası', max: 128, type: 'email' },
  { key: 'phone', label: 'İletişim Telefonu', max: 32, type: 'tel' },
];

function TextFields({ prefix, fields, values, onChange }: { prefix: string; fields: TextField[]; values: object; onChange: (key: string, value: string) => void }) {
  return <>{fields.map(item => <label key={item.key} className="min-w-0 space-y-1.5 text-xs text-zinc-300" htmlFor={`${prefix}-${item.key}`}>
    <span className="block">{item.label}</span>
    <input id={`${prefix}-${item.key}`} className={field} type={item.type || 'text'} required={item.required} maxLength={item.max}
      minLength={item.key === 'newPassword' ? 8 : item.key === 'username' ? 3 : undefined}
      pattern={item.key === 'username' ? '[a-zA-Z0-9_.-]+' : item.key === 'taxNumber' ? '(?:[0-9]{10,11})?' : undefined}
      autoComplete={item.key === 'newPassword' ? 'new-password' : undefined}
      value={String((values as Record<string, unknown>)[item.key] ?? '')} onChange={event => onChange(item.key, event.target.value)} />
  </label>)}</>;
}

export function AdminAccountFields({ account, onChange, centers, saving }: { account: AdminAccountDetails; onChange: (value: AdminAccountDetails) => void; centers: Company[]; saving: boolean }) {
  return <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
    <legend className="mb-4 text-sm font-semibold text-zinc-100">İşletme / Merkez Bilgileri</legend>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextFields prefix="account" values={account} onChange={(key, value) => onChange({ ...account, [key]: value })} fields={[
        { key: 'name', label: 'İşletme / Merkez Görünen Adı', max: 255, required: true },
        { key: 'sector', label: 'Sektör', max: 128 },
        { key: 'ownerName', label: 'Yetkili Adı Soyadı', max: 128, required: true },
        { key: 'ownerEmail', label: 'Yetkili E-Postası', max: 128, type: 'email', required: true },
        { key: 'ownerPhone', label: 'Yetkili Telefonu', max: 32, type: 'tel' },
        ...businessFields,
      ]} />
      <label className="space-y-1.5 text-xs text-zinc-300 sm:col-span-2"><span className="block">Notlar</span><textarea className={field} rows={3} maxLength={5000} value={account.notes} onChange={event => onChange({ ...account, notes: event.target.value })} /></label>
    </div>
    {account.branches.map((branch, index) => {
      const update = (key: string, value: string) => onChange({ ...account, branches: account.branches.map((item, position) => position === index ? { ...item, [key]: value } : item) });
      return <div key={branch.id} className="space-y-4 border-t border-zinc-800 pt-5">
        <h3 className="text-sm font-semibold text-zinc-100">Şube Bilgileri · {branch.name}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextFields prefix={`branch-${branch.id}`} values={branch} onChange={update} fields={[
            { key: 'name', label: 'Şubenin Görünen Adı', max: 128, required: true },
            { key: 'city', label: 'İl', max: 64 }, { key: 'district', label: 'İlçe', max: 64 },
            { key: 'managerName', label: 'Şube Sorumlusu', max: 128 }, ...businessFields,
          ]} />
          <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Bağlı Merkez</span>
            <select className={field} value={branch.centerCompanyId || ''} onChange={event => onChange({ ...account, branches: account.branches.map((item, position) => position === index ? { ...item, centerCompanyId: event.target.value || null } : item) })}>
              <option value="">Merkez yok / Bağımsız</option>
              {centers.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-zinc-300"><span className="block">Şube Durumu</span><select className={field} value={branch.status} onChange={event => update('status', event.target.value)}><option value="active">Aktif</option><option value="review">İncelemede</option><option value="passive">Pasif</option></select></label>
        </div>
      </div>;
    })}
    {account.users.map((user, index) => <div key={user.id} className="space-y-4 border-t border-zinc-800 pt-5">
      <h3 className="text-sm font-semibold text-zinc-100">Kullanıcı Bilgileri · {user.name}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextFields prefix={`user-${user.id}`} values={user} onChange={(key, value) => onChange({ ...account, users: account.users.map((item, position) => position === index ? { ...item, [key]: value } : item) })} fields={[
          { key: 'name', label: 'Ad Soyad', max: 128, required: true },
          { key: 'username', label: 'Kullanıcı Adı', max: 32, required: true },
          { key: 'email', label: 'Giriş E-Postası', max: 128, type: 'email', required: true },
          { key: 'phone', label: 'Telefon', max: 32, type: 'tel' },
          { key: 'title', label: 'Görevi / Ünvanı', max: 128 },
          { key: 'newPassword', label: 'Yeni Şifre (isteğe bağlı)', max: 256, type: 'password' },
        ]} />
        <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={user.active} onChange={event => onChange({ ...account, users: account.users.map((item, position) => position === index ? { ...item, active: event.target.checked } : item) })} />Kullanıcı hesabı aktif</label>
      </div>
      <p className="text-xs text-zinc-400">Yeni şifre alanını boş bırakırsanız mevcut şifre korunur. Yeni şifre en az 8 karakter olmalıdır.</p>
    </div>)}
  </fieldset>;
}
