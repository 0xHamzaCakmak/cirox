import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Camera,
  X,
  Plus,
  CheckCircle2,
  CreditCard,
  Banknote,
  Globe,
  Coins,
  Calendar,
  Sparkles,
  User,
  Tags,
  DollarSign,
  AlertCircle,
  Beef,
  Coffee,
  Sparkle,
  Truck,
  Zap,
  ShoppingBag,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReceiptCapture } from './ReceiptCapture';
import type { ReceiptAttachment } from '../../types';
import { entryExpenseCategories } from '../../data/expenseCategories';

interface MobileBranchActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'revenue' | 'expense' | 'camera';
}

export const MobileBranchActionModal: React.FC<MobileBranchActionModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'revenue',
}) => {
  const {
    currentUser: actor, viewUser: currentUser,
    branches,
    selectedBranchId,
    addDailyRevenue,
    addExpense,
    expenseCategories,
    staffList,
    showNotification,
    dailyRevenueRecords,
    setActiveTab,
  } = useApp();

  const isMerkez = currentUser?.role === 'merkez';
  const effectiveBranchId = !isMerkez && currentUser?.branchId ? currentUser.branchId : selectedBranchId;
  const branch = branches.find((b) => b.id === effectiveBranchId) || branches[0];

  const [mode, setMode] = useState<'revenue' | 'expense'>(initialMode === 'expense' ? 'expense' : 'revenue');

  // Revenue Form State
  const [revDate, setRevDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  });
  const [creditCard, setCreditCard] = useState<number | ''>('');
  const [cash, setCash] = useState<number | ''>('');
  const [online, setOnline] = useState<number | ''>('');
  const [other, setOther] = useState<number | ''>('');
  const [revNotes, setRevNotes] = useState('');
  const [receipts, setReceipts] = useState<ReceiptAttachment[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  // Expense Form State
  const [expCategoryId, setExpCategoryId] = useState<string>('cat-2'); // Kasap
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDescription, setExpDescription] = useState('');
  const [expDate, setExpDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  });
  const [expStaffId, setExpStaffId] = useState('');
  const [expReceiptNumber, setExpReceiptNumber] = useState('');
  const [expReceiptImage, setExpReceiptImage] = useState<string | null>(null);
  const [expReceiptFileName, setExpReceiptFileName] = useState('');
  const [expVatRate, setExpVatRate] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);


  // Active staff in this branch
  const branchStaff = useMemo(() => {
    return staffList.filter((s) => s.branchId === branch?.id && s.status === 'active');
  }, [staffList, branch?.id]);

  // Selected category info
  const activeCategories = entryExpenseCategories(expenseCategories, branch?.id || '');
  const currentCategory = activeCategories.find((c) => c.id === expCategoryId);
  const isStaffCategory = currentCategory ? currentCategory.type === 'staff_based' : expCategoryId === 'cat-1';

  // Revenue total calculation
  const totalRevenue =
    (Number(creditCard) || 0) + (Number(cash) || 0) + (Number(online) || 0) + (Number(other) || 0);

  useEffect(() => {
    if (!isOpen) return;
    if (initialMode === 'expense' || initialMode === 'camera') { onClose(); setActiveTab('expense_camera'); return; }
    setMode('revenue');
  }, [isOpen, initialMode]);
  useEffect(() => {
    if (!isOpen || !branch || mode !== 'revenue') return;
    const record = dailyRevenueRecords.find(record => record.branchId === branch.id && record.date === revDate);
    setCreditCard(record?.creditCard ?? ''); setCash(record?.cash ?? '');
    setOnline(record?.online ?? ''); setOther(record?.other ?? '');
    setRevNotes(record?.notes ?? ''); setReceipts(record?.receipts ?? []);
  }, [isOpen, branch?.id, revDate, mode]);

  if (!isOpen || !branch) return null;

  // Camera file handler for receipts
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExpReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setExpReceiptImage(reader.result as string);
      showNotification('Fiş/fatura fotoğrafı başarıyla eklendi', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Category visual icons & labels
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'cat-1':
        return <User className="w-4 h-4 text-amber-400" />;
      case 'cat-2':
        return <Beef className="w-4 h-4 text-rose-400" />;
      case 'cat-3':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'cat-4':
        return <Coffee className="w-4 h-4 text-sky-400" />;
      case 'cat-5':
        return <Sparkle className="w-4 h-4 text-cyan-400" />;
      case 'cat-6':
        return <Truck className="w-4 h-4 text-purple-400" />;
      case 'cat-7':
      case 'cat-8':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <Tags className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Quick amount additions for revenue
  const addRevenueQuickAmount = (
    field: 'creditCard' | 'cash' | 'online' | 'other',
    val: number
  ) => {
    if (field === 'creditCard') setCreditCard((prev) => (Number(prev) || 0) + val);
    if (field === 'cash') setCash((prev) => (Number(prev) || 0) + val);
    if (field === 'online') setOnline((prev) => (Number(prev) || 0) + val);
    if (field === 'other') setOther((prev) => (Number(prev) || 0) + val);
  };

  // Quick amount additions for expense
  const addExpenseQuickAmount = (val: number) => {
    setExpAmount((prev) => (Number(prev) || 0) + val);
  };

  // Select staff member
  const handleSelectStaff = (staff: typeof branchStaff[0]) => {
    setExpStaffId(staff.id);
    setExpAmount(staff.dailyWage);
    setExpDescription(`${staff.fullName} (${staff.role}) - Günlük Yevmiye`);
    setExpVatRate(0);
  };

  // Submit Revenue
  const handleSubmitRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRevenue <= 0) {
      showNotification('Lütfen en az bir gelir tutarı giriniz', 'warning');
      return;
    }

    if (submitting.current || photoBusy) return;
    submitting.current = true; setSaving(true);
    try {
    await addDailyRevenue({
      branchId: branch.id,
      branchName: branch.name,
      date: revDate,
      creditCard: Number(creditCard) || 0,
      cash: Number(cash) || 0,
      online: Number(online) || 0,
      other: Number(other) || 0,
      total: totalRevenue,
      notes: revNotes,
      receipts, receiptIds: receipts.map(receipt => receipt.id),
      submittedBy: currentUser?.name || `${branch.name} Sorumlusu`,
    });

    showNotification(`${branch.name} için ₺${totalRevenue.toLocaleString('tr-TR')} ciro kaydedildi`, 'success');
    onClose();
    } catch (error) { showNotification(error instanceof Error ? error.message : 'Ciro kaydedilemedi.', 'warning'); }
    finally { submitting.current = false; setSaving(false); }
  };

  // Submit Expense
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (!amountNum || amountNum <= 0) {
      showNotification('Lütfen geçerli bir gider tutarı giriniz', 'warning');
      return;
    }

    const cat = expenseCategories.find((c) => c.id === expCategoryId);
    const staff = staffList.find((s) => s.id === expStaffId);

    addExpense({
      branchId: branch.id,
      branchName: branch.name,
      date: expDate,
      categoryId: expCategoryId,
      categoryName: cat?.name || 'Genel Gider',
      amount: amountNum,
      description: expDescription || `${cat?.name || 'Gider'} Harcaması`,
      staffId: isStaffCategory ? expStaffId : undefined,
      staffName: isStaffCategory ? staff?.fullName : undefined,
      receiptNumber: expReceiptNumber || undefined,
      receiptImage: expReceiptImage || undefined,
      receiptFileName: expReceiptFileName || undefined,
      vatRate: expVatRate,
    });

    showNotification(`${branch.name} için ₺${amountNum.toLocaleString('tr-TR')} gider kaydedildi`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4">
      {/* Container / Bottom Sheet */}
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Top Handle / Header */}
        <div className="px-5 pt-3 pb-3 border-b border-zinc-800 shrink-0">
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                {branch.name}
              </span>
              <span className="text-[11px] text-zinc-400">Mobil Hızlı İşlem</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('revenue')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'revenue'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>+ Ciro Girişi</span>
            </button>

            {actor?.role !== 'merkez' && <button
              type="button"
              onClick={() => { onClose(); setActiveTab('expense_new'); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'expense'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>+ Gider / Fatura</span>
            </button>}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ======================= REVENUE MODE ======================= */}
          {mode === 'revenue' && (
            <form id="mobileRevenueForm" onSubmit={handleSubmitRevenue} className="space-y-4">
              {/* Date & Yesterday Quick Template */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="date"
                    value={revDate}
                  required
                  disabled={photoBusy || saving}
                    onChange={(e) => setRevDate(e.target.value)}
                    className="bg-transparent text-xs font-mono font-medium text-zinc-200 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreditCard(Math.round(branch.dailyRevenue * 0.65));
                    setCash(Math.round(branch.dailyRevenue * 0.22));
                    setOnline(Math.round(branch.dailyRevenue * 0.10));
                    setOther(Math.round(branch.dailyRevenue * 0.03));
                  }}
                  className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Dünkü Şablon</span>
                </button>
              </div>

              {/* 1. Kredi Kartı (POS) */}
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 focus-within:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Kredi Kartı (POS Z-Raporu)</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400 font-bold">₺</span>
                </div>
                <input
                  type="number"
                  min="0" step="0.01"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={creditCard}
                  onChange={(e) => setCreditCard(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-black font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none"
                />
                {/* Quick Add Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[1000, 5000, 10000, 25000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addRevenueQuickAmount('creditCard', amount)}
                      className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 active:bg-emerald-500 active:text-black transition-colors"
                    >
                      +{amount >= 1000 ? `${amount / 1000}k` : amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Nakit Kasa */}
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 focus-within:border-cyan-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-cyan-400" />
                    <span>Nakit Kasa Hasılatı</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400 font-bold">₺</span>
                </div>
                <input
                  type="number"
                  min="0" step="0.01"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={cash}
                  onChange={(e) => setCash(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-black font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[500, 1000, 2500, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addRevenueQuickAmount('cash', amount)}
                      className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 active:bg-cyan-500 active:text-black transition-colors"
                    >
                      +{amount >= 1000 ? `${amount / 1000}k` : amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Online Sipariş (Getir, Yemeksepeti, Trendyol) */}
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 focus-within:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Online Paket Servis</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400 font-bold">₺</span>
                </div>
                <input
                  type="number"
                  min="0" step="0.01"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={online}
                  onChange={(e) => setOnline(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-black font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none"
                />
              </div>

              {/* 4. Diğer / Yemek Kartları (Sodexo, Multinet) */}
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 focus-within:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span>Yemek Kartı / Diğer</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400 font-bold">₺</span>
                </div>
                <input
                  type="number"
                  min="0" step="0.01"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={other}
                  onChange={(e) => setOther(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-xl font-black font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none"
                />
              </div>

              <ReceiptCapture branchId={branch.id} receipts={receipts} onChange={setReceipts} disabled={saving || (actor?.role !== 'admin' && currentUser?.role !== 'sube')} onBusyChange={setPhotoBusy} />

              {/* Ek Not */}
              <div>
                <input
                  type="text"
                  value={revNotes}
                  onChange={(e) => setRevNotes(e.target.value)}
                  placeholder="Varsa gün sonu kasa notu (opsiyonel)..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </form>
          )}

          {/* ======================= EXPENSE MODE ======================= */}
          {mode === 'expense' && (
            <form id="mobileExpenseForm" onSubmit={handleSubmitExpense} className="space-y-4">
              {/* Camera Direct Action Bar (Top of Expense) */}
              <div className="p-3 bg-gradient-to-r from-rose-950/40 via-zinc-950 to-zinc-950 border border-rose-500/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                      <Camera className="w-4 h-4 text-rose-400" />
                      <span>Fiş / Fatura Fotoğrafı Çek</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Kasap, hal veya market fişini kamerayla çekin
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                      title="Galeriden Seç"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expReceiptImage && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img
                        src={expReceiptImage}
                        alt="Fiş Önizleme"
                        className="w-12 h-12 object-cover rounded-lg border border-zinc-700"
                      />
                      <div className="truncate">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fiş Fotoğrafı Eklendi
                        </span>
                        <p className="text-[10px] text-zinc-400 truncate">{expReceiptFileName || 'Kamera Çekimi'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpReceiptImage(null);
                        setExpReceiptFileName('');
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Gider Kategorileri (Büyük Görsel Çipler) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Gider Türü / Kalemi:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeCategories.map((cat) => {
                    const isSelected = expCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setExpCategoryId(cat.id);
                          if (cat.defaultVatRate !== undefined) {
                            setExpVatRate(cat.defaultVatRate);
                          }
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-zinc-800 border-rose-500 text-zinc-100 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-zinc-900 shrink-0">
                          {getCategoryIcon(cat.id)}
                        </div>
                        <span className="text-xs font-semibold truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Staff category: Show Staff quick selection */}
              {isStaffCategory && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Personel Seçiniz:
                    </span>
                    <span className="text-[10px] text-zinc-400">Yevmiye otomatik yazılır</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {branchStaff.map((staff) => {
                      const isSelected = expStaffId === staff.id;
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => handleSelectStaff(staff)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <span>{staff.fullName}</span>
                          <span className="font-mono text-[11px] opacity-80">
                            ({staff.dailyWage}₺)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tutar Girişi (Büyük Nümerik Input) */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 focus-within:border-rose-500/60 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-200">Harcama / Fatura Tutarı</label>
                  <span className="text-xs font-mono text-zinc-400 font-bold">₺</span>
                </div>
                <input
                  type="number"
                  min="0" step="0.01"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-3xl font-black font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none"
                />

                {/* Quick Add Amount Buttons */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[100, 250, 500, 1000, 2500, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addExpenseQuickAmount(amount)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 active:bg-rose-500 active:text-white transition-colors"
                    >
                      +{amount >= 1000 ? `${amount / 1000}k` : amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Açıklama & Fiş No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Açıklama (Örn: Kasap kıyma alımı)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />

                <input
                  type="text"
                  value={expReceiptNumber}
                  onChange={(e) => setExpReceiptNumber(e.target.value)}
                  placeholder="Fiş / Fatura No (Opsiyonel)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* KDV Oranı Çipleri */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">KDV Oranı:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 10, 20, 0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setExpVatRate(rate)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        expVatRate === rate
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      %{rate}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur shrink-0 flex items-center justify-between gap-3">
          {mode === 'revenue' ? (
            <>
              <div>
                <span className="text-[10px] text-zinc-500 block">TOPLAM CİRO</span>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {totalRevenue.toLocaleString('tr-TR')} <span className="text-xs">₺</span>
                </div>
              </div>

              <button
                type="submit"
                form="mobileRevenueForm"
                disabled={saving || photoBusy || (actor?.role !== 'admin' && currentUser?.role !== 'sube')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Ciroyu Kaydet</span>
              </button>
            </>
          ) : (
            <>
              <div>
                <span className="text-[10px] text-zinc-500 block">GİDER TUTARI</span>
                <div className="text-xl font-black font-mono text-rose-400">
                  {(Number(expAmount) || 0).toLocaleString('tr-TR')} <span className="text-xs">₺</span>
                </div>
              </div>

              <button
                type="submit"
                form="mobileExpenseForm"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-500/25 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Gideri Kaydet</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
