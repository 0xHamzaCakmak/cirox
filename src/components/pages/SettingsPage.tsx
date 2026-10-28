import React, { useState, useRef } from 'react';
import {
  Settings,
  Building,
  Users,
  Shield,
  Key,
  Save,
  Link,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsPage: React.FC = () => {
  const { branches, currentUser, selectedBranchId, saveBranchSettings, saveOwnProfile, showNotification } = useApp();
  const isBranch = currentUser?.role === 'sube';
  const branch = branches.find(b => b.id === (currentUser?.branchId || selectedBranchId));
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'business' | 'integration' | 'masamqr' | 'users' | 'security'>('business');

  // Business settings state
  const [companyName, setCompanyName] = useState(branch?.legalName || '');
  const [tradeRegisterNo, setTradeRegisterNo] = useState(branch?.tradeRegisterNo || '');
  const [taxOffice, setTaxOffice] = useState(branch?.taxOffice || '');
  const [taxNumber, setTaxNumber] = useState(branch?.taxNumber || '');
  const [centralEmail, setCentralEmail] = useState(branch?.contactEmail || '');
  const [centralPhone, setCentralPhone] = useState(branch?.phone || '');

  // Integration settings state
  const [apiEndpoint, setApiEndpoint] = useState('https://demo.subesiparis.example/api/v1');
  const [apiKey, setApiKey] = useState('demo-api-key');
  const [webhookUrl, setWebhookUrl] = useState('https://demo.cirox.example/webhooks/orders');
  const [syncInterval, setSyncInterval] = useState('15');
  const [autoReconcile, setAutoReconcile] = useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting.current || !isBranch || !branch) return;
    if (activeSubTab === 'users' && newPassword !== confirmPassword) { showNotification('Yeni şifreler eşleşmiyor.', 'warning'); return; }
    submitting.current = true; setSaving(true);
    try {
      if (activeSubTab === 'business') await saveBranchSettings({ legalName: companyName.trim(), tradeRegisterNo: tradeRegisterNo.trim(), taxOffice: taxOffice.trim(), taxNumber: taxNumber.trim(), contactEmail: centralEmail.trim(), phone: centralPhone.trim() });
      if (activeSubTab === 'users') {
        await saveOwnProfile({ name: profileName.trim(), username: username.trim().toLowerCase(), email: profileEmail.trim().toLowerCase(), phone: profilePhone.trim(), currentPassword, ...(newPassword ? { newPassword } : {}) });
        setUsername(username.trim().toLowerCase()); setProfileEmail(profileEmail.trim().toLowerCase());
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (error) { showNotification(error instanceof Error ? error.message : 'Ayarlar kaydedilemedi.', 'warning'); }
    finally { submitting.current = false; setSaving(false); }
  };

  return (
    <div className="settings-page space-y-4 w-full min-w-0 pb-6">
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-300" />
            <h2 className="text-base font-bold text-zinc-100">
              {isBranch ? 'Sistem ve Şube Ayarları' : 'Sistem ve İşletme Ayarları'}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            İşletme kurumsal bilgileri, POS & sipariş API entegrasyonu ve gider kalemleri yönetimi
          </p>
        </div>

        <button
          type="submit" form={activeSubTab === 'users' ? 'settings-profile' : 'settings-business'}
          disabled={saving || !isBranch || !branch || !['business', 'users'].includes(activeSubTab)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/10 self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Kaydediliyor…' : ['integration', 'masamqr'].includes(activeSubTab) ? 'Demo · Bağlantı Kapalı' : 'Değişiklikleri Kaydet'}</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="settings-tabs flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('business')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 ${
            activeSubTab === 'business'
              ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{isBranch ? 'Şube Bilgileri' : 'İşletme Bilgileri'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('integration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 ${
            activeSubTab === 'integration'
              ? 'bg-zinc-900 text-indigo-400 border border-indigo-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>ŞubeSipariş Entegrasyonu</span>
        </button>

        <button onClick={() => setActiveSubTab('masamqr')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 ${activeSubTab === 'masamqr' ? 'bg-zinc-900 text-indigo-400 border border-indigo-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}><Link className="w-4 h-4" /><span>MasaM QR Entegrasyonu</span></button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 ${
            activeSubTab === 'users'
              ? 'bg-zinc-900 text-sky-400 border border-sky-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isBranch ? 'Kullanıcı Bilgilerim' : 'Kullanıcı Yönetimi'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 ${
            activeSubTab === 'security'
              ? 'bg-zinc-900 text-amber-400 border border-amber-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Güvenlik & Bildirimler</span>
        </button>
      </div>

      {/* Tab Content: Business Information */}
      {activeSubTab === 'business' && (
        <form id="settings-business" onSubmit={handleSave} className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-5 text-xs">
          <h3 className="text-sm font-bold text-zinc-100 pb-3 border-b border-zinc-800">
            Kurumsal ve Vergi Bilgileri
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{isBranch ? 'Şube / İşletme Resmi Unvanı' : 'Şirket Resmi Unvanı'}</label>
              <input
                type="text"
                value={companyName} maxLength={255} disabled={!isBranch || saving}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Ticaret Sicil No</label>
              <input
                type="text"
                value={tradeRegisterNo} maxLength={64} disabled={!isBranch || saving}
                onChange={(e) => setTradeRegisterNo(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Vergi Dairesi</label>
              <input
                type="text"
                value={taxOffice} maxLength={128} disabled={!isBranch || saving}
                onChange={(e) => setTaxOffice(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Vergi Kimlik Numarası (VKN)</label>
              <input
                type="text"
                value={taxNumber} maxLength={11} disabled={!isBranch || saving}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{isBranch ? 'Şube İletişim E-Posta' : 'Merkez İletişim E-Posta'}</label>
              <input
                type="email"
                value={centralEmail} maxLength={128} disabled={!isBranch || saving}
                onChange={(e) => setCentralEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{isBranch ? 'Şube İletişim / Telefon' : 'Merkez Çağrı / Telefon'}</label>
              <input
                type="text"
                value={centralPhone} maxLength={32} disabled={!isBranch || saving}
                onChange={(e) => setCentralPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-3 items-center justify-between text-zinc-400">
            <span>Sistem Para Birimi: <strong className="text-zinc-200">TRY / ₺ (Türk Lirası)</strong></span>
            <span>{isBranch ? <>Şube: <strong className="text-emerald-400">{branch?.name || 'Şubeniz'}</strong></> : <>Kayıtlı Şube Sayısı: <strong className="text-emerald-400">{branches.length} Şube</strong></>}</span>
          </div>
        </form>
      )}

      {/* Tab Content: ŞubeSipariş Integration */}
      {activeSubTab === 'integration' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-5 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                ŞubeSipariş Entegrasyon Yapılandırması (Gelecek Aşama)
              </h3>
              <p className="text-zinc-400 text-[11px]">
                Şubeye verilen siparişler için ödenen tutarların giderlere aktarılması planlanmaktadır. Bu alanlar demo amaçlıdır; kaydedilmez ve bağlantı kurulmaz.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Demo · Veri Çekilmiyor
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">ŞubeSipariş REST API Base URL</label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">ŞubeSipariş API Anahtarı (Demo)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Webhook Dinleyici Adresi (Gelen Sipariş / Sevkiyat)</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Otomatik Senkronizasyon Periyodu</label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none"
                >
                  <option value="5">Her 5 Dakikada Bir</option>
                  <option value="15">Her 15 Dakikada Bir (Önerilen)</option>
                  <option value="60">Her Saat Başı</option>
                  <option value="daily">Günde 1 Kez (Gece 03:00)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="autoReconcile"
                  checked={autoReconcile}
                  onChange={(e) => setAutoReconcile(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoReconcile" className="text-zinc-300 font-medium cursor-pointer">
                  İade ve sapma hesaplamalarını otomatik çalıştır
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'masamqr' && <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-5 text-xs">
        <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-zinc-800"><h3 className="text-sm font-bold text-zinc-100">MasaM QR Entegrasyon Yapılandırması</h3><span className="text-[10px] text-indigo-400 border border-indigo-500/20 rounded-full px-3 py-1">Demo · Veri Çekilmiyor</span></div>
        <p className="text-zinc-400">İşletmenin günlük POS, nakit, online satış, yemek kartı ve diğer tahsilatlarının ciroya aktarılması planlanmaktadır. Şimdilik veri çekilmez, finansal kayıt oluşmaz ve bilgiler kaydedilmez.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div><label className="block text-zinc-400 mb-1" htmlFor="masam-endpoint">MasaM QR API Adresi (Demo)</label><input id="masam-endpoint" type="url" defaultValue="https://demo.masamqr.example/api/v1" className="settings-input w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono" /></div>
          <div><label className="block text-zinc-400 mb-1" htmlFor="masam-key">API Anahtarı (Demo)</label><input id="masam-key" type="password" autoComplete="off" defaultValue="demo-api-key" className="settings-input w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono" /></div>
          <div><label className="block text-zinc-400 mb-1" htmlFor="masam-business">MasaM QR İşletme / Şube Kimliği (Demo)</label><input id="masam-business" defaultValue="demo-isletme" className="settings-input w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono" /></div>
        </div>
        <div className="flex flex-wrap gap-2">{['POS / Kredi Kartı', 'Nakit', 'Online Satış', 'Yemek Kartları', 'Diğer Tahsilatlar'].map(label => <span key={label} className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">{label}</span>)}</div>
      </div>}

      {/* Tab Content: Users Management */}
      {activeSubTab === 'users' && (isBranch ? (
        <BranchProfileForm name={profileName} setName={setProfileName} username={username} setUsername={setUsername} email={profileEmail} setEmail={setProfileEmail} phone={profilePhone} setPhone={setProfilePhone} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} branchName={branch?.name || ''} saving={saving} onSubmit={handleSave} />
      ) : (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Kullanıcı ve Rol Yönetimi
              </h3>
              <p className="text-zinc-400 text-[11px]">
                Merkez yöneticileri ve 40+ şube yöneticisinin erişim hesapları
              </p>
            </div>
            <button
              onClick={() => showNotification('Yeni kullanıcı davet ekranı', 'info')}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-zinc-950 font-bold text-xs"
            >
              Yeni Kullanıcı Davet Et
            </button>
          </div>

          <div className="space-y-2">
            {/* User 1: Merkez */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <div className="font-bold text-zinc-200">Merkez Finans Direktörü</div>
                  <div className="text-[11px] text-zinc-500">merkez@anadolulezzetleri.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Merkez Yöneticisi (Full)
                </span>
                <span className="text-[11px] text-zinc-500">Aktif</span>
              </div>
            </div>

            {/* User 2: Şube */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  K
                </div>
                <div>
                  <div className="font-bold text-zinc-200">Kadıköy Şube Müdürü</div>
                  <div className="text-[11px] text-zinc-500">sube.kadikoy@anadolulezzetleri.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Şube Kullanıcısı (Kısıtlı)
                </span>
                <span className="text-[11px] text-zinc-500">Aktif</span>
              </div>
            </div>

            {/* User 3: Şube Beşiktaş */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <div className="font-bold text-zinc-200">Beşiktaş Şube Müdürü</div>
                  <div className="text-[11px] text-zinc-500">sube.besiktas@anadolulezzetleri.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Şube Kullanıcısı
                </span>
                <span className="text-[11px] text-zinc-500">Aktif</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {isBranch && ['business', 'users'].includes(activeSubTab) && <div className="md:hidden sticky bottom-0 z-20 bg-zinc-950 border-t border-zinc-800 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="submit" form={activeSubTab === 'users' ? 'settings-profile' : 'settings-business'} disabled={saving || !branch} className="w-full min-h-12 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}</button>
      </div>}

      {/* Tab Content: Security */}
      {activeSubTab === 'security' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-100 pb-3 border-b border-zinc-800">
            Güvenlik İlkeleri ve Kritik Sapma Uyarı Kuralları
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <div>
                <div className="font-semibold text-zinc-200">Çift Faktörlü Kimlik Doğrulama (2FA)</div>
                <div className="text-[11px] text-zinc-500">Merkez yöneticileri için zorunlu SMS veya TOTP doğrulaması</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Aktif
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <div>
                <div className="font-semibold text-zinc-200">Sessiz Sapma Monitörü (Gereksiz Alarm Engelleme)</div>
                <div className="text-[11px] text-zinc-500">Kritik sapmaları renk/ikon ile gösterir ancak şube yöneticisini gereksiz alarm yağmuruna tutmaz</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Standart Kural Devrede
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface BranchProfileFormProps {
  name: string; username: string; email: string; phone: string; currentPassword: string; newPassword: string; confirmPassword: string;
  setName: (value: string) => void; setUsername: (value: string) => void; setEmail: (value: string) => void; setPhone: (value: string) => void;
  setCurrentPassword: (value: string) => void; setNewPassword: (value: string) => void; setConfirmPassword: (value: string) => void;
  branchName: string; saving: boolean; onSubmit: (event: React.FormEvent) => void;
}
function BranchProfileForm(props: BranchProfileFormProps) {
  const fields = [
    { id: 'profile-name', label: 'Ad Soyad', value: props.name, update: props.setName, type: 'text', autoComplete: 'name', maxLength: 128, required: true },
    { id: 'profile-username', label: 'Kullanıcı Adı', value: props.username, update: props.setUsername, type: 'text', autoComplete: 'username', maxLength: 32, required: true, minLength: 3, pattern: '[a-zA-Z0-9_.-]+' },
    { id: 'profile-email', label: 'Giriş E-Postası', value: props.email, update: props.setEmail, type: 'email', autoComplete: 'email', maxLength: 128, required: true },
    { id: 'profile-phone', label: 'Telefon', value: props.phone, update: props.setPhone, type: 'tel', autoComplete: 'tel', maxLength: 32 },
    { id: 'profile-current', label: 'Mevcut Şifre', value: props.currentPassword, update: props.setCurrentPassword, type: 'password', autoComplete: 'current-password', maxLength: 256, required: true },
    { id: 'profile-new', label: 'Yeni Şifre', value: props.newPassword, update: props.setNewPassword, type: 'password', autoComplete: 'new-password', maxLength: 256, minLength: 8 },
    { id: 'profile-confirm', label: 'Yeni Şifre Tekrar', value: props.confirmPassword, update: props.setConfirmPassword, type: 'password', autoComplete: 'new-password', maxLength: 256, minLength: 8, required: !!props.newPassword },
  ];
  return <form id="settings-profile" onSubmit={props.onSubmit} className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-5 text-xs">
    <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-zinc-800"><div><h3 className="text-sm font-bold text-zinc-100">Şube Kullanıcı Bilgileri</h3><p className="text-zinc-400 text-[11px] mt-1">{props.branchName} · Kendi giriş hesabınız</p></div><span className="px-3 py-1 rounded-full text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20">Şube Kullanıcısı</span></div>
    {[fields.slice(0, 4), fields.slice(4)].map((group, index) => <div key={index} className={index === 0 ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800'}>
      {group.map(field => <div key={field.id} className="min-w-0 flex flex-col"><label className="block text-zinc-400 mb-1 font-medium" htmlFor={field.id}>{field.label}</label><input id={field.id} type={field.type} autoComplete={field.autoComplete} required={field.required} minLength={field.minLength} maxLength={field.maxLength} pattern={field.pattern} value={field.value} disabled={props.saving} onChange={event => field.update(event.target.value)} className="mt-auto w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-sky-500" /></div>)}
    </div>)}
    <p className="text-[11px] text-zinc-400">Güncellemeyi mevcut şifrenizle onaylayın. Yeni şifre en az 8 karakter olmalıdır; yeni şifre alanlarını boş bırakırsanız şifreniz değişmez. Şifre değiştiğinde diğer oturumlar kapatılır.</p>
  </form>;
}
