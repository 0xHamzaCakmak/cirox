import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Store, KeyRound, UserCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BillingMethod } from '../../types';

export const AdminCreateEstablishmentPage: React.FC = () => {
  const { companies, createEstablishmentAndStart, setActiveTab, showNotification } = useApp();
  const [busy, setBusy] = useState(false);
  // Establishment / Lisans Ekle Form State
  const centers = useMemo(() => companies.filter(company => company.kind !== 'business'), [companies]);
  const [merkezOption, setMerkezOption] = useState<'existing' | 'none'>('none');
  const [selectedMerkezId, setSelectedMerkezId] = useState('');
  useEffect(() => {
    if (selectedMerkezId && !centers.some(company => company.id === selectedMerkezId)) {
      setSelectedMerkezId('');
      setMerkezOption('none');
    }
  }, [centers, selectedMerkezId]);
  const [establishmentName, setEstablishmentName] = useState('Savcı Usta');
  const [establishmentCode, setEstablishmentCode] = useState('SAVCI');
  const [establishmentCity, setEstablishmentCity] = useState('İstanbul');
  const [establishmentDistrict, setEstablishmentDistrict] = useState('Sarıyer');
  const [establishmentOwnerName, setEstablishmentOwnerName] = useState('Savcı Usta');
  const [establishmentOwnerEmail, setEstablishmentOwnerEmail] = useState('savci@sariyerborekcisi.com');
  const [establishmentOwnerPassword, setEstablishmentOwnerPassword] = useState('123456');
  const [establishmentOwnerPhone, setEstablishmentOwnerPhone] = useState('0532 999 88 77');
  const [establishmentPrice, setEstablishmentPrice] = useState<number>(15000);
  const [establishmentBillingMethod, setEstablishmentBillingMethod] = useState<BillingMethod>('bank_transfer');
  const [establishmentAutoLaunch, setEstablishmentAutoLaunch] = useState<boolean>(true);
  const [establishmentNotes, setEstablishmentNotes] = useState('');


  const createSubmitting = React.useRef(false);
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishmentName.trim() || !establishmentOwnerName.trim()) return;
    if (createSubmitting.current) return;
    createSubmitting.current = true; setBusy(true);

    try {
      await createEstablishmentAndStart({
        merkezOption: selectedMerkezId ? 'existing' : 'none',
        selectedCompanyId: selectedMerkezId,
        establishmentName,
        establishmentCode,
        city: establishmentCity,
        district: establishmentDistrict,
        ownerName: establishmentOwnerName,
        ownerEmail: establishmentOwnerEmail,
        ownerPassword: establishmentOwnerPassword,
        ownerPhone: establishmentOwnerPhone,
        price: establishmentPrice,
        billingMethod: establishmentBillingMethod,
        notes: establishmentNotes,
        autoLaunch: establishmentAutoLaunch,
      });

      if (!establishmentAutoLaunch) setActiveTab('admin_tenants');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'İşletme oluşturulamadı.', 'warning');
    } finally {
      createSubmitting.current = false; setBusy(false);
    }
  };


  return <section className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6 text-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">İşletme Ekle</h2>
                  <p className="text-[11px] text-zinc-400">
                    İşletme hesabını oluşturun; varsa bağlı olacağı mevcut merkezi seçin
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setActiveTab('admin_tenants')}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />Abonelere Dön
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4">
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
              {/* Bölüm 1: Merkez Seçimi */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    1. Bağlı Olacağı Merkez (Firma)
                  </label>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMerkezOption('existing')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        merkezOption === 'existing'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Mevcut Merkeze Bağla
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMerkezOption('none'); setSelectedMerkezId(''); }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        merkezOption === 'none'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Merkez yok
                    </button>
                  </div>
                </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Bağlı Olacağı Merkez (İsteğe Bağlı)
                    </label>
                    <select
                      value={selectedMerkezId}
                      onChange={(e) => { setSelectedMerkezId(e.target.value); setMerkezOption(e.target.value ? 'existing' : 'none'); }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">Merkez yok — Bağımsız işletme</option>
                      {centers.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.code}) — {comp.branchesCount} Şube — {comp.sector}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
                      <span>Merkez seçilmezse işletme bağımsız çalışır. Seçilen merkez işletmeyi yalnızca görüntüleyebilir; kayıtlarını değiştiremez.</span>
                    </p>
                  </div>
              </div>

              {/* Bölüm 2: İşletme / Şube Bilgileri */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  2. İşletme / Şube Bilgileri
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      İşletme / Şube Adı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Savcı Usta"
                      value={establishmentName}
                      onChange={(e) => setEstablishmentName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Kullanıcı Adı *
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: SAVCI"
                      value={establishmentCode}
                      required
                      minLength={3}
                      maxLength={32}
                      pattern="[A-Za-z0-9_.-]+"
                      onChange={(e) => setEstablishmentCode(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Şehir
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: İstanbul"
                      value={establishmentCity}
                      onChange={(e) => setEstablishmentCity(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      İlçe / Bölge
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Sarıyer"
                      value={establishmentDistrict}
                      onChange={(e) => setEstablishmentDistrict(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bölüm 3: Giriş Bilgileri (İşletme bu bilgilerle giriş yapacak) */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    3. İşletme Giriş ve Yetkili Bilgileri (Giriş Yapılacak Hesap)
                  </label>
                  <span className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Giriş Yetkisi Verilir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Yetkili Adı Soyadı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Savcı Usta"
                      value={establishmentOwnerName}
                      onChange={(e) => setEstablishmentOwnerName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Telefon Numarası
                    </label>
                    <input
                      type="tel"
                      placeholder="0532 999 88 77"
                      value={establishmentOwnerPhone}
                      onChange={(e) => setEstablishmentOwnerPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Giriş E-postası *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Örn: savci@sariyerborekcisi.com"
                      value={establishmentOwnerEmail}
                      onChange={(e) => setEstablishmentOwnerEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Giriş Şifresi *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      value={establishmentOwnerPassword}
                      onChange={(e) => setEstablishmentOwnerPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    İşletme sorumlusu kullanıcı adı veya e-postası ve şifresi ile sisteme doğrudan giriş yapabilir.
                  </span>
                </div>
              </div>

              {/* Bölüm 4: Lisanslama ve Tahsilat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Yıllık Lisans Bedeli (₺)
                  </label>
                  <input
                    type="number"
                    value={establishmentPrice}
                    onChange={(e) => setEstablishmentPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tahsilat Modeli
                  </label>
                  <select
                    value={establishmentBillingMethod}
                    onChange={(e) => setEstablishmentBillingMethod(e.target.value as BillingMethod)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="bank_transfer">Banka Havalesi / EFT</option>
                    <option value="credit_card">Kredi Kartı / Sanal POS</option>
                    <option value="manual">Manuel Nakit</option>
                  </select>
                </div>
              </div>

              {/* Hızlı Başlat Seçeneği */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={establishmentAutoLaunch}
                  onChange={(e) => setEstablishmentAutoLaunch(e.target.checked)}
                  className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-zinc-900"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-zinc-200 block">
                    İşletmeyi Oluştur ve Hemen Başlat (Hesaba Otomatik Giriş Yap)
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Oluşturduktan sonra doğrudan bu işletmenin ciro giriş ekranı başlatılır.
                  </span>
                </div>
              </label>

              {/* Alt Butonlar */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_tenants')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>İşletmeyi Oluştur ve Başlat</span>
                </button>
              </div>
              </fieldset>
            </form>
  </section>;
};
