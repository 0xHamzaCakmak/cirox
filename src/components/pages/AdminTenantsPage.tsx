import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Shield,
  Search,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  Phone,
  Mail,
  Edit2,
  Lock,
  Unlock,
  RefreshCw,
  Zap,
  X,
  ExternalLink,
  Receipt,
  FileText,
  Landmark,
  MessageSquare,
  Copy,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Company, BillingMethod } from '../../types';
import { AdminSubscriptionEditPage } from './AdminSubscriptionEditPage';
import { AdminCollectionPage } from './AdminCollectionPage';
import { AdminBankAccountsPage } from './AdminBankAccountsPage';

interface AdminTenantsPageProps {
  defaultTab?: 'tenants' | 'billing';
}

export const AdminTenantsPage: React.FC<AdminTenantsPageProps> = ({ defaultTab = 'tenants' }) => {
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    toggleCompanyStatus,
    switchPerspective,
    setActiveTab,
    payments, bankAccounts,
    showNotification,
  } = useApp();

  // Top Tabs: Müşteri Restoranlar vs Tahsilat Defteri
  const [activeMainTab, setActiveMainTab] = useState<'tenants' | 'billing'>(defaultTab);

  useEffect(() => {
    setActiveMainTab(defaultTab);
  }, [defaultTab]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPill, setFilterPill] = useState<'all' | 'near_due' | 'past_due' | 'locked' | 'active'>('all');
  const [reminderTier, setReminderTier] = useState<'3_days' | '7_days' | '10_days'>('3_days');

  // Modal States
  const [collectionCompanyId, setCollectionCompanyId] = useState<string | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [showBankAccountsPage, setShowBankAccountsPage] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // High Level Metrics
  const activeCount = useMemo(() => companies.filter((c) => c.subscription?.status === 'active').length, [companies]);
  const overdueCount = useMemo(
    () => companies.filter((c) => c.subscription?.status === 'past_due' || (c.subscription?.daysRemaining ?? 1) <= 0).length,
    [companies]
  );
  const nearDueCount = useMemo(
    () => companies.filter((c) => (c.subscription?.daysRemaining ?? 0) > 0 && (c.subscription?.daysRemaining ?? 0) <= 7).length,
    [companies]
  );
  const lockedCount = useMemo(
    () => companies.filter((c) => c.subscription?.status === 'passive').length,
    [companies]
  );
  const totalBranchesCount = useMemo(
    () => companies.reduce((sum, c) => sum + (c.ownedBranchesCount ?? c.branchesCount ?? 0), 0),
    [companies]
  );
  const totalCollectedThisMonth = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  // Urgent Overdue Companies List
  const urgentCompanies = useMemo(() => {
    return companies.filter(
      (c) => c.subscription?.status === 'past_due' || (c.subscription?.daysRemaining ?? 1) <= 0 || c.id === 'comp-5'
    );
  }, [companies]);

  // Filtered Companies List for Table
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.sector || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterPill === 'all') return true;
      if (filterPill === 'active') return c.subscription?.status === 'active' && (c.subscription?.daysRemaining ?? 0) > 7;
      if (filterPill === 'past_due') return c.subscription?.status === 'past_due' || (c.subscription?.daysRemaining ?? 1) <= 0;
      if (filterPill === 'near_due') return (c.subscription?.daysRemaining ?? 0) > 0 && (c.subscription?.daysRemaining ?? 0) <= 7;
      if (filterPill === 'locked') return c.subscription?.status === 'passive';
      return true;
    });
  }, [companies, searchTerm, filterPill]);

  // Filtered Payments for Billing History Tab
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [payments, searchTerm]);

  const handleOpenWhatsApp = (comp: Company) => {
    setSelectedCompany(comp);
    setShowWhatsAppModal(true);
  };

  const handleSendWhatsAppMessage = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone}`;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };
  const reminderText = selectedCompany ? `Sayın ${selectedCompany.ownerName} (${selectedCompany.name}),\n\nCiroX lisans yenileme bedeliniz: ${(selectedCompany.subscription.price || 0).toLocaleString('tr-TR')} ₺.\n\n${bankAccounts.filter(bank => bank.isActive).map(bank => `${bank.bankName}\nIBAN: ${bank.iban}\nAlıcı: ${bank.accountName}`).join('\n\n') || 'Banka hesabı bilgileri için bizimle iletişime geçebilirsiniz.'}\n\nİyi çalışmalar dileriz.` : '';

  const openChargePage = (company: Company) => setCollectionCompanyId(company.id);

  const openEditPage = (company: Company) => setEditingCompanyId(company.id);

  const handleEnterCompanyAsMerkez = (comp: Company) => {
    setActiveCompanyId(comp.id);
    switchPerspective('merkez', undefined, comp.id);
    setActiveTab('dashboard');
  };

  const collectionCompany = companies.find(company => company.id === collectionCompanyId);
  if (showBankAccountsPage) return <AdminBankAccountsPage onBack={() => setShowBankAccountsPage(false)} />;
  if (collectionCompany) return <AdminCollectionPage company={collectionCompany} onBack={() => setCollectionCompanyId(null)} onManageBanks={() => setShowBankAccountsPage(true)} />;

  const editingCompany = companies.find(company => company.id === editingCompanyId);
  if (editingCompany) return <AdminSubscriptionEditPage key={editingCompany.id} company={editingCompany} onBack={() => setEditingCompanyId(null)} />;

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                CiroX — Aboneler & Lisans Yönetimi
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Süper Admin
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Merkez / patron hesapları, şube lisansları, paketler ve yetkili hesapları.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('admin_billing')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Abonelik Tahsilatları →</span>
          </button>

          <button
            onClick={() => setShowBankAccountsPage(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-xs font-semibold transition-colors shadow-xs"
          >
            <Landmark className="w-3.5 h-3.5 text-zinc-400" />
            <span>Banka Hesapları</span>
          </button>
        </div>
      </div>

      {/* 2. TOP 4 METRIC KPI CARDS - FOCUSED ON SUBSCRIBERS & LICENSES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplam Abone */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Toplam Abone İşletme
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/20">
              {companies.length} Restoran
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              {companies.length} Firma
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Sistemdeki kayıtlı merkez ve zincir markalar
            </p>
          </div>
        </div>

        {/* Card 2: Lisanslı Şube & Masa */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Lisanslı Şube & Masa
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
              Kapasite
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-indigo-300 tracking-tight">
              {totalBranchesCount} Şube / Lokasyon
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Aktif tanımlı şube ve operasyon alanı
            </p>
          </div>
        </div>

        {/* Card 3: Aktif Lisanslar */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Aktif Lisanslar
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
              %{Math.round((activeCount / Math.max(1, companies.length)) * 100)} Aktiflik
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {activeCount} Restoran
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Kesintisiz hizmet verilen işletmeler
            </p>
          </div>
        </div>

        {/* Card 4: Geciken / Askıda */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Yenileme / Vade Bekleyen
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30">
              Lisans Takibi
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {overdueCount} Restoran
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Vadesi dolan veya 7 gün içinde bitecek lisanslar
            </p>
          </div>
        </div>
      </div>

      {/* 3. URGENT ACTIONS SECTION */}
      {urgentCompanies.length > 0 && (
        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-sm font-bold text-zinc-100">
                  Lisans Süresi Dolan / Yenileme Bekleyen İşletmeler
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Aşağıdaki restoranların lisans süresi dolmuştur. Lisanslarını uzatabilir veya WhatsApp ile bildirim gönderebilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 text-[11px]">Kademeli Hatırlatma:</span>
              <select
                value={reminderTier}
                onChange={(e) => setReminderTier(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="3_days">3 Günlük Hatırlatma</option>
                <option value="7_days">7 Günlük Hatırlatma</option>
                <option value="10_days">10 Günlük Hatırlatma</option>
              </select>
            </div>
          </div>

          {/* Urgent Restaurant Cards */}
          <div className="space-y-2.5">
            {urgentCompanies.map((comp) => {
              const isComp5 = comp.id === 'comp-5';
              const daysOverdue = isComp5 ? 10 : Math.max(1, Math.abs(comp.subscription?.daysRemaining ?? 0));

              return (
                <div
                  key={comp.id}
                  className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-100">{comp.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        {daysOverdue} Gün Gecikti
                      </span>
                      <span className="text-sm font-bold font-mono text-zinc-200 ml-1">
                        ₺{(comp.subscription?.price ?? 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Yetkili: <span className="text-zinc-300 font-medium">{comp.ownerName}</span> •{' '}
                      <span>{comp.ownerPhone}</span> • Vade:{' '}
                      <span className="text-zinc-300 font-mono">{comp.subscription?.nextBillingDate || '—'}</span>
                    </p>
                  </div>

                  {/* Urgent Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenWhatsApp(comp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Hatırlat</span>
                    </button>

                    <button
                      onClick={() => openChargePage(comp)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Lisansı Yenile (Tahsil Et)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTAINER: TABS, FILTER PILLS & TABLE */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Navigation Tabs Header & Filter Pills */}
        <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setActiveMainTab('tenants');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'tenants'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Müşteri Restoranlar ({companies.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('admin_billing');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
              title="Abonelik Tahsilatları sayfasına git"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tahsilat Defteri & Dekontlar ({payments.length}) →</span>
            </button>
          </div>

          {/* Right Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterPill('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterPill === 'all'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
              }`}
            >
              Tümü ({companies.length})
            </button>
            <button
              onClick={() => setFilterPill('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterPill === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              onClick={() => setFilterPill('near_due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterPill === 'near_due'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
              }`}
            >
              Vadesi Yaklaşan ({nearDueCount})
            </button>
            <button
              onClick={() => setFilterPill('past_due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterPill === 'past_due'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
              }`}
            >
              Gecikmede ({overdueCount})
            </button>
            <button
              onClick={() => setFilterPill('locked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterPill === 'locked'
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
              }`}
            >
              Askıda/Kilitli ({lockedCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeMainTab === 'tenants' ? 'Restoran, yetkili, şehir ara...' : 'Referans, işletme veya açıklama ara...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            {activeMainTab === 'tenants' ? `${filteredCompanies.length} Restoran Listeleniyor` : `${filteredPayments.length} Tahsilat Kaydı`}
          </span>
        </div>

        {/* TAB CONTENT 1: MÜŞTERİ RESTORANLAR TABLE */}
        {activeMainTab === 'tenants' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">RESTORAN / YETKİLİ</th>
                  <th className="py-3 px-4">PAKET & PLAN</th>
                  <th className="py-3 px-4">LİSANS ÜCRETİ</th>
                  <th className="py-3 px-4">SON TAHSİLAT</th>
                  <th className="py-3 px-4">GELECEK VADE</th>
                  <th className="py-3 px-4">LİSANS DURUMU</th>
                  <th className="py-3 px-4 text-right">AKSİYONLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs text-zinc-300">
                {filteredCompanies.map((comp) => {
                  const sub = comp.subscription;
                  const isCurrentActive = comp.id === activeCompanyId;
                  const isPastDue = sub?.status === 'past_due' || (sub?.daysRemaining ?? 1) <= 0;
                  const isComp5 = comp.id === 'comp-5';
                  const daysOverdue = isComp5 ? 10 : Math.max(1, Math.abs(sub?.daysRemaining ?? 0));

                  return (
                    <tr
                      key={comp.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isCurrentActive ? 'bg-indigo-600/5' : ''
                      }`}
                    >
                      {/* 1. RESTORAN / YETKİLİ */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 shrink-0 mt-0.5">
                            {(comp.code || 'RST').substring(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-100">{comp.name}</span>
                              {comp.kind === 'center' && <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">Merkez / Patron</span>}
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                  Aktif Seçili
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Yetkili: <span className="text-zinc-300">{comp.ownerName}</span> • {comp.ownerPhone}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {comp.sector?.includes('Cafe') || isComp5 ? 'İstanbul/Kartal' : 'Türkiye Geneli'} • {comp.branchesCount} Masa / Şube
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. PAKET & PLAN */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-zinc-200 block">
                            {isComp5 ? 'POS & Menü Pro' : (sub?.planName || 'Standart Plan')}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {isComp5 ? 'Yıllık Peşin' : sub?.billingCycle === 'yearly' ? 'Yıllık Sözleşme' : 'Aylık Otomatik'}
                          </span>
                          <span className="block text-[10px] text-zinc-500">Başlangıç: {sub.startDate?.split('-').reverse().join('.') || '—'}</span>
                        </div>
                      </td>

                      {/* 3. LİSANS ÜCRETİ */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold font-mono text-zinc-100 text-sm block">
                            ₺{(sub?.price ?? 0).toLocaleString('tr-TR')}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {isComp5 ? '/ yıl' : sub?.billingCycle === 'yearly' ? '/ yıl' : '/ ay'}
                          </span>
                        </div>
                      </td>

                      {/* 4. SON TAHSİLAT */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px]">
                          <span className="text-zinc-400 block font-mono">
                            {sub.lastPaymentDate || '—'}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            {sub?.billingMethod === 'credit_card' ? 'Kredi Kartı' : sub?.billingMethod === 'manual' ? 'Nakit / Elden' : 'Banka Havalesi'}
                          </span>
                        </div>
                      </td>

                      {/* 5. GELECEK VADE */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono text-xs text-zinc-200 block">
                            {sub?.nextBillingDate || '—'}
                          </span>
                          {isPastDue ? (
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              {daysOverdue} gün gecikmede
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-400">
                              {sub?.daysRemaining ?? 0} gün kaldı
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. LİSANS DURUMU */}
                      <td className="py-3.5 px-4">
                        {isPastDue ? (
                           <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Gecikmede
                          </span>
                        ) : sub?.status === 'trial' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-400"><Clock className="h-3 w-3" />Deneme</span>
                        ) : sub?.status === 'active' && sub.startDate > new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400"><Clock className="h-3 w-3" />Başlangıç Bekliyor</span>
                        ) : sub?.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Askıda / Pasif
                          </span>
                        )}
                      </td>

                      {/* 7. AKSİYONLAR */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Button */}
                          <button
                            onClick={() => handleOpenWhatsApp(comp)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                            title="WhatsApp ile Hatırlat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Tahsil Et Button */}
                          <button
                            onClick={() => openChargePage(comp)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-xs"
                            title="Abonelik Tahsilatını İşle"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tahsil Et</span>
                          </button>

                          {/* Lock / Unlock */}
                          <button
                            onClick={() => toggleCompanyStatus(comp.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              sub?.status === 'active'
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                            title={sub?.status === 'active' ? 'Lisansı Askıya Al / Kilitle' : 'Lisansı Aktifleştir'}
                          >
                            {sub?.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditPage(comp)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                            title="Abonelik Şartlarını Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Switch & Manage as Merkez */}
                          <button
                            onClick={() => handleEnterCompanyAsMerkez(comp)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-400 border border-zinc-700 transition-colors"
                            title="Bu Merkezin Hesabına Geç & Yönet"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB CONTENT 2: TAHSİLAT DEFTERİ / GEÇMİŞ TABLE */}
        {activeMainTab === 'billing' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">RESTORAN / İŞLETME</th>
                  <th className="py-3 px-4">İŞLEM / REFERANS NO</th>
                  <th className="py-3 px-4">ÖDEME YÖNTEMİ</th>
                  <th className="py-3 px-4">TARİH & SAAT</th>
                  <th className="py-3 px-4">TUTAR</th>
                  <th className="py-3 px-4">DURUM</th>
                  <th className="py-3 px-4 text-right">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs text-zinc-300">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-100">
                      {p.companyName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">
                      {p.invoiceNumber}
                      <span className="text-[10px] text-zinc-500 block font-sans">{p.description}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        {p.method === 'credit_card' ? (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Kredi Kartı POS</span>
                          </>
                        ) : (
                          <>
                            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{p.method === 'manual' ? 'Nakit / Elden' : 'Banka Havale/EFT'}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                      {p.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-emerald-400">
                      ₺{(p.amount ?? 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Tahsil Edildi
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(`Tahsilat Kaydı:\nReferans: ${p.invoiceNumber}\nİşletme: ${p.companyName}\nTutar: ${(p.amount ?? 0).toLocaleString('tr-TR')} ₺`)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700"
                      >
                        Kaydı Gör
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL: WHATSAPP HATIRLATMA MODAL */}
      {showWhatsAppModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">WhatsApp Lisans Hatırlatması</h3>
                  <p className="text-[11px] text-zinc-400">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                  Alıcı Bilgisi
                </span>
                <p className="text-zinc-200 font-semibold">{selectedCompany.ownerName} ({selectedCompany.ownerPhone})</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Lisans Bedeli: ₺{(selectedCompany.subscription?.price ?? 0).toLocaleString('tr-TR')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Gönderilecek Mesaj Metni
                </label>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {reminderText}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendWhatsAppMessage(
                      selectedCompany.ownerPhone,
                      reminderText
                    )
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp İle Gönder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
