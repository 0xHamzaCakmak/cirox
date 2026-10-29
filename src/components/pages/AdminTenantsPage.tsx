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

interface BankAccount {
  bankName: string;
  accountName: string;
  iban: string;
  currency: string;
  branchCode: string;
}

const CORPORATE_BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: 'Garanti BBVA',
    accountName: 'MasaM QR Bilişim Teknolojileri A.Ş.',
    iban: 'TR84 0006 2000 1234 5678 9012 34',
    currency: 'TRY',
    branchCode: '245 - Kadıköy Rıhtım',
  },
  {
    bankName: 'Akbank',
    accountName: 'MasaM QR Bilişim Teknolojileri A.Ş.',
    iban: 'TR42 0004 6000 9876 5432 1098 76',
    currency: 'TRY',
    branchCode: '312 - Kartal Çarşı',
  },
  {
    bankName: 'Türkiye İş Bankası',
    accountName: 'MasaM QR Bilişim Teknolojileri A.Ş.',
    iban: 'TR19 0006 4000 5544 3322 1100 99',
    currency: 'TRY',
    branchCode: '108 - Levent Ticari',
  },
];

interface AdminTenantsPageProps {
  defaultTab?: 'tenants' | 'billing';
}

export const AdminTenantsPage: React.FC<AdminTenantsPageProps> = ({ defaultTab = 'tenants' }) => {
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    toggleCompanyStatus,
    updateCompanySubscription,
    chargeCompany,
    switchPerspective,
    setActiveTab,
    payments,
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
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Charge Modal Form State
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [chargeMethod, setChargeMethod] = useState<BillingMethod>('bank_transfer');
  const [chargeNote, setChargeNote] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Edit Subscription Modal Form State
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editBranchLimit, setEditBranchLimit] = useState<number>(0);
  const [editBillingMethod, setEditBillingMethod] = useState<BillingMethod>('bank_transfer');
  const [editPlanName, setEditPlanName] = useState('');

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

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2500);
  };

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

  const openChargeModal = (comp: Company) => {
    setSelectedCompany(comp);
    setChargeAmount(comp.subscription?.price ?? 0);
    setChargeMethod(comp.subscription?.billingMethod ?? 'bank_transfer');
    setChargeNote(`${comp.name} - Lisans Yenileme ve Tahsilat`);
    setShowChargeModal(true);
  };

  const handleProcessCharge = () => {
    if (!selectedCompany) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      chargeCompany(selectedCompany.id, chargeAmount, chargeMethod, chargeNote);
      setIsProcessingPayment(false);
      setShowChargeModal(false);
    }, 700);
  };

  const openEditModal = (comp: Company) => {
    setSelectedCompany(comp);
    setEditPrice(comp.subscription?.price ?? 0);
    setEditBranchLimit(comp.subscription?.branchLimit ?? 1);
    setEditBillingMethod(comp.subscription?.billingMethod ?? 'bank_transfer');
    setEditPlanName(comp.subscription?.planName ?? 'Pro');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    updateCompanySubscription(selectedCompany.id, {
      price: editPrice,
      branchLimit: editBranchLimit,
      billingMethod: editBillingMethod,
      planName: editPlanName,
    });
    setShowEditModal(false);
  };

  const handleEnterCompanyAsMerkez = (comp: Company) => {
    setActiveCompanyId(comp.id);
    switchPerspective('merkez', undefined, comp.id);
    setActiveTab('dashboard');
  };

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
                MasaM QR — Aboneler & Lisans Yönetimi
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
            <span>Abonelik Tahsilatları (Sanal POS) →</span>
          </button>

          <button
            onClick={() => setShowBankAccountsModal(true)}
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
                      onClick={() => openChargeModal(comp)}
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
              placeholder={activeMainTab === 'tenants' ? 'Restoran, yetkili, şehir ara...' : 'Fatura no, işletme veya açıklama ara...'}
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
                            {isComp5 ? '—' : '2026-08-01'}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            {sub?.billingMethod === 'credit_card' ? 'Kredi Kartı' : 'Banka Havalesi'}
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
                            onClick={() => openChargeModal(comp)}
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
                            onClick={() => openEditModal(comp)}
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
                  <th className="py-3 px-4">İŞLEM / FATURA NO</th>
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
                            <span>Banka Havale/EFT</span>
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
                        onClick={() => alert(`Fatura & Dekont Görüntüleniyor:\nFatura No: ${p.invoiceNumber}\nİşletme: ${p.companyName}\nTutar: ${(p.amount ?? 0).toLocaleString('tr-TR')} ₺`)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700"
                      >
                        Dekont Gör
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL: BANKA HESAPLARI MODAL */}
      {showBankAccountsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Şirket Banka Tahsilat Hesapları</h3>
                  <p className="text-[11px] text-zinc-400">Restoranların lisans havalesi yapacağı resmi hesaplar</p>
                </div>
              </div>
              <button
                onClick={() => setShowBankAccountsModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {CORPORATE_BANK_ACCOUNTS.map((acc, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-100 text-xs">{acc.bankName}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{acc.branchCode}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-2">Alıcı: <span className="text-zinc-200 font-medium">{acc.accountName}</span></p>
                  <div className="flex items-center justify-between bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
                    <span className="font-mono text-xs font-semibold text-zinc-200 tracking-wider">
                      {acc.iban}
                    </span>
                    <button
                      onClick={() => handleCopyIban(acc.iban)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-zinc-700"
                    >
                      {copiedIban === acc.iban ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>IBAN Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowBankAccountsModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {`Sayın *${selectedCompany.ownerName}* (${selectedCompany.name}),\n\nMasaM QR restoran yazılım lisansınızın yenileme vadesi dolmuştur. Kesintisiz sipariş ve menü erişimi için ₺${(selectedCompany.subscription?.price ?? 0).toLocaleString('tr-TR')} tutarındaki lisans bedelini havale yapmanızı rica ederiz.\n\nGaranti BBVA IBAN:\nTR84 0006 2000 1234 5678 9012 34\nAlıcı: MasaM QR Bilişim A.Ş.\n\nBilgilerinize sunar, iyi çalışmalar dileriz.`}
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
                      `Sayın ${selectedCompany.ownerName} (${selectedCompany.name}), MasaM QR lisansınızın vadesi dolmuştur. Kesintisiz kullanım için ₺${(selectedCompany.subscription?.price ?? 0).toLocaleString('tr-TR')} tutarındaki lisans bedelini Garanti BBVA TR84 0006 2000 1234 5678 9012 34 hesabımıza havale etmenizi rica ederiz.`
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

      {/* 7. MODAL: TAHSİLAT YAP (CHARGE MODAL) */}
      {showChargeModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Abonelik Lisans Tahsilatı Yap</h3>
                  <p className="text-[11px] text-zinc-400">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChargeModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              {/* Payment Method Option */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Tahsilat Yolu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeMethod('bank_transfer')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      chargeMethod === 'bank_transfer'
                        ? 'bg-emerald-500/10 border-emerald-500/60 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="font-bold block text-emerald-300">Havale / EFT</span>
                    <span className="text-[10px] text-zinc-400">Merkez banka dekontu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChargeMethod('credit_card')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      chargeMethod === 'credit_card'
                        ? 'bg-indigo-500/10 border-indigo-500/60 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="font-bold block text-indigo-300">Sanal POS / Kart</span>
                    <span className="text-[10px] text-zinc-400">Kayıtlı karttan çek</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tahsil Edilecek Lisans Bedeli (₺)
                </label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Dekont / Fatura Notu
                </label>
                <input
                  type="text"
                  value={chargeNote}
                  onChange={(e) => setChargeNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Info Box */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>İşlem Sonrası Lisans Süresi:</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Tahsilat onaylandığında işletmenin lisansı 1 dönem uzatılır ve gecikme uyarısı anında kalkar.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleProcessCharge}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Tahsilat İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Tahsilatı Onayla & Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT SUBSCRIPTION */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-100">Abonelik & Lisans Düzenle</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Paket Adı
                </label>
                <input
                  type="text"
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Lisans Bedeli (₺)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Şube / Masa Limiti
                  </label>
                  <input
                    type="number"
                    value={editBranchLimit}
                    onChange={(e) => setEditBranchLimit(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tahsilat Modeli
                </label>
                <select
                  value={editBillingMethod}
                  onChange={(e) => setEditBillingMethod(e.target.value as BillingMethod)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  <option value="bank_transfer">Merkezden Banka Havale / EFT</option>
                  <option value="credit_card">Otomatik Kredi Kartı Çekimi (Sanal POS)</option>
                  <option value="manual">Manuel Nakit / Elden</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-600/20"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
