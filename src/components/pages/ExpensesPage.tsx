import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Building,
  User,
  Tags,
  X,
  Sparkles,
  CheckCircle2,
  DollarSign,
  ArrowUpDown,
  Camera,
  Upload,
  Image as ImageIcon,
  FileCheck,
  FileSpreadsheet,
  Eye,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExpenseRecord } from '../../types';
import { ReceiptModal } from '../common/ReceiptModal';
import { AccountingReportModal } from '../common/AccountingReportModal';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { ReceiptCapture } from '../common/ReceiptCapture';
import type { ReceiptAttachment } from '../../types';
import { createClientId } from '../../services/clientId';
import { entryExpenseCategories } from '../../data/expenseCategories';
import { isStaffExpense } from '../../data/expenseMath';

export const ExpensesPage: React.FC = () => {
  const {
    expenses,
    branches,
    selectedBranchId,
    addExpense,
    deleteExpense,
    expenseCategories,
    staffList,
    currentUser: actor, viewUser: currentUser,
    showNotification,
    activeTab,
    setActiveTab,
  } = useApp();

  const isMerkez = currentUser?.role === 'merkez';
  const userBranchId = currentUser?.branchId || selectedBranchId || 'branch-1';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState(isMerkez ? 'all' : userBranchId);
  const view = activeTab === 'expense_new' ? 'new' : activeTab === 'expense_camera' ? 'camera' : activeTab === 'expense_accounting' ? 'accounting' : 'list';
  const setView = (next: 'list' | 'new' | 'camera' | 'accounting') => setActiveTab(next === 'list' ? 'expenses' : next === 'new' ? 'expense_new' : next === 'camera' ? 'expense_camera' : 'expense_accounting');
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<ExpenseRecord | null>(null);

  // New Expense Form state
  const [formBranchId, setFormBranchId] = useState(isMerkez ? selectedBranchId || branches[0]?.id || '' : userBranchId);
  const [formCategoryId, setFormCategoryId] = useState('cat-2'); // Default to Kasap
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  const [formStaffId, setFormStaffId] = useState('');
  const [paymentBasis, setPaymentBasis] = useState<'daily' | 'monthly'>('daily');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [receipts, setReceipts] = useState<ReceiptAttachment[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(createClientId());
  const submitting = useRef(false);
  const [deletingId, setDeletingId] = useState('');
  const readOnly = branches.length === 0 || (actor?.role !== 'admin' && currentUser?.role !== 'sube');
  const [formVatRate, setFormVatRate] = useState<number>(1);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (view !== 'new' && view !== 'camera') return;
    setFormBranchId(userBranchId); setFormAmount(''); setFormDescription(''); setFormReceiptNumber('');
    setFormStaffId(''); setPaymentBasis('daily'); setReceipts([]); requestId.current = createClientId();
    setFormDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  }, [view]);

  const entryCategories = useMemo(() => entryExpenseCategories(expenseCategories, formBranchId), [expenseCategories, formBranchId]);
  const filterCategories = useMemo(() => Array.from(new Map(expenseCategories
    .filter(category => !category.branchId || category.branchId === (isMerkez ? selectedBranch : userBranchId) || (isMerkez && selectedBranch === 'all'))
    .map(category => [category.id, category])).values()), [expenseCategories, isMerkez, selectedBranch, userBranchId]);
  const currentCategory = entryCategories.find((c) => c.id === formCategoryId);
  const isStaffBased = currentCategory?.type === 'staff_based';
  useEffect(() => {
    if (!entryCategories.some(category => category.id === formCategoryId)) { setFormCategoryId(''); setFormStaffId(''); setPaymentBasis('daily'); }
  }, [entryCategories, formCategoryId]);
  useEffect(() => {
    if (currentCategory) setFormVatRate(currentCategory.type === 'staff_based' ? 0 : currentCategory.defaultVatRate ?? 20);
  }, [formCategoryId, currentCategory?.type, currentCategory?.defaultVatRate, view]);

  // Branch staff options for staff-based expenses
  const branchStaff = useMemo(() => {
    return staffList.filter((s) => s.branchId === formBranchId && s.status === 'active');
  }, [staffList, formBranchId]);

  // Suggest last used values for quick UX
  const lastAmountsForCategory = useMemo(() => {
    const matching = expenses
      .filter((e) => e.categoryId === formCategoryId)
      .slice(0, 3)
      .map((e) => e.amount);
    return Array.from(new Set(matching));
  }, [expenses, formCategoryId]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.staffName && e.staffName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.receiptNumber && e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || e.categoryId === selectedCategory;
      const targetBranch = isMerkez ? selectedBranch : userBranchId;
      const matchesBranch = targetBranch === 'all' || e.branchId === targetBranch;
      return matchesSearch && matchesCategory && matchesBranch;
    });
  }, [expenses, searchQuery, selectedCategory, selectedBranch, isMerkez, userBranchId]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleStaffSelect = (staffId: string, basis: 'daily' | 'monthly' = paymentBasis) => {
    setPaymentBasis(basis);
    setFormStaffId(staffId);
    const staff = staffList.find((s) => s.id === staffId);
    if (staff) {
      setFormAmount(basis === 'monthly' ? staff.monthlySalary : staff.dailyWage);
      setFormDescription(`${staff.fullName} (${staff.role}) - ${basis === 'monthly' ? 'Aylık Maaş' : 'Günlük Yevmiye'}`);
      setFormVatRate(0);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setFormStaffId(''); setPaymentBasis('daily');
    setFormCategoryId(catId);
    const cat = entryCategories.find((c) => c.id === catId);
    if (cat) {
      if (cat.type === 'staff_based') {
        setFormVatRate(0);
      } else {
        setFormVatRate(cat.defaultVatRate ?? 20);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0 || submitting.current || photoBusy || readOnly) return;
    if (!isStaffBased && !receipts.length) { showNotification('Fiş veya fatura fotoğrafı ekleyin.', 'warning'); return; }

    const b = branches.find((br) => br.id === formBranchId) || branches[0];
    const cat = entryCategories.find((c) => c.id === formCategoryId);
    const st = staffList.find((s) => s.id === formStaffId);

    if (!b || !cat) { showNotification('Geçerli şube ve gider kalemi seçin.', 'warning'); return; }
    submitting.current = true; setSaving(true);
    try {
    await addExpense({
      branchId: b.id,
      branchName: b.name,
      date: formDate,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryType: cat.type,
      amount: Number(formAmount),
      description: formDescription || `${cat.name} harcaması`,
      staffId: st ? st.id : undefined,
      paymentBasis: isStaffBased && st ? paymentBasis : undefined,
      staffPaymentType: isStaffBased && st ? (paymentBasis === 'monthly' ? 'maas' : 'yevmiye') : undefined,
      staffName: st ? st.fullName : undefined,
      receiptNumber: formReceiptNumber || undefined,
      clientRequestId: requestId.current, receipts, receiptIds: receipts.map(photo => photo.id),
      receiptImage: receipts[0]?.url, receiptFileName: receipts[0]?.fileName,
      vatRate: formVatRate,
    });

    if (!mounted.current) return;
    setView('list');
    setFormAmount('');
    setFormDescription('');
    setFormReceiptNumber('');
    setFormStaffId(''); setPaymentBasis('daily');
    setReceipts([]); requestId.current = createClientId();
    } catch (error) { showNotification(error instanceof Error ? error.message : 'Gider kaydedilemedi.', 'warning'); }
    finally { submitting.current = false; setSaving(false); }
  };

  const openEntry = (nextView: 'new' | 'camera') => {
    if (readOnly) { showNotification('Bu hesap işletme giderlerini yalnızca görüntüleyebilir.', 'info'); return; }
    setFormBranchId(userBranchId); setFormAmount(''); setFormDescription(''); setFormReceiptNumber('');
    setFormStaffId(''); setPaymentBasis('daily'); setReceipts([]); setFormDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
    requestId.current = createClientId(); setView(nextView);
  };
  const handleDelete = async (id: string) => {
    if (deletingId || readOnly) return;
    setDeletingId(id);
    try { await deleteExpense(id); }
    catch (error) { showNotification(error instanceof Error ? error.message : 'Gider kaldırılamadı.', 'warning'); }
    finally { setDeletingId(''); }
  };
  const receiptEditor = <div className="lg:col-span-2 space-y-2">
    <ReceiptCapture inlineCamera branchId={formBranchId} receipts={receipts} onChange={setReceipts} disabled={saving || readOnly} onBusyChange={setPhotoBusy} />
    <p className="text-[11px] text-zinc-500">{isStaffBased ? 'Personel ödemesinde fotoğraf isteğe bağlıdır.' : 'Gider kaydı için fiş veya fatura fotoğrafı gereklidir.'}</p>
  </div>;

  return (
    <div className="expense-page space-y-6 pb-12 min-w-0">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {view === 'list' && <>
      {/* Header Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Gider Yönetimi ve Fatura Kayıtları
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              Kanıt & Fiş Doğrulamalı
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isMerkez
              ? 'Tüm şubelerden girilen fiş, fatura ve personel harcamaları'
              : `${currentUser?.branchName || 'Şubeniz'} harcama ve fatura belgeleri`}
          </p>
        </div>

        <div className="expense-header-actions flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
          {/* Mobile Fast Camera Receipt Action Button */}
          <button
            onClick={() => {
              openEntry('camera');
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-all shadow-xs"
            title="Kamera ile Fiş Çek & Ekle"
          >
            <Camera className="w-4 h-4" />
            <span>Fiş Çek & Ekle</span>
          </button>

          <button
            onClick={() => setView('accounting')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs transition-colors border border-zinc-700/80 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Muhasebe Gider Dosyası (PDF)</span>
            <span className="sm:hidden">Muhasebe PDF</span>
          </button>

          <button
            onClick={() => {
              openEntry('new');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-rose-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Gider Ekle</span>
          </button>
        </div>
      </div>

      {/* Accounting & Evidence Policy Notice */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-zinc-300">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
          <FileCheck className="w-4 h-4" />
        </div>
        <div className="leading-relaxed">
          <strong className="text-zinc-100">İşletme Belge ve Kanıt Kuralı: </strong>
          Maaş ve yevmiyeler personele elden nakit ödendiği için fiş kanıtı aranmaz. Kasap, sebze (hal), içecek, temizlik ve lojistik gibi diğer tüm harcamaların fatura veya fiş görselleri kamera veya galeri ile sisteme yüklenmelidir. Bu belgeler dönem sonunda PDF formatında mali müşavir / muhasebe gider dosyası olarak teslim edilir ve vergi dengelemesi sağlar.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Açıklama, fiş no, şube veya personel ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter (Only for Merkez view; in Sube view it's locked to their branch) */}
          {isMerkez && (
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900">Tüm Şubeler ({branches.length} Şube)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Tags className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tüm Kalemler</option>
              {filterCategories.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List: Mobile Cards + Desktop Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Mobile View: High-contrast Cards (Phones & small tablets) */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredExpenses.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Kriterlere uygun gider kaydı bulunamadı.
            </div>
          ) : (
            filteredExpenses.map((exp) => {
              const isStaff = isStaffExpense(exp);
              const hasReceipt = !!exp.receiptImage;

              return (
                <div key={exp.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {exp.categoryName}
                      </span>
                      {isMerkez && (
                        <span className="text-[10px] font-medium text-zinc-400">
                          {exp.branchName}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-zinc-500">
                        {exp.date}
                      </span>
                    </div>

                    <div className="font-mono font-bold text-rose-400 text-base">
                      -{(exp.amount ?? 0).toLocaleString('tr-TR')} ₺
                    </div>
                  </div>

                  <p className="text-xs text-zinc-200 font-medium">
                    {exp.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      {hasReceipt ? (
                        <button
                          onClick={() => setSelectedExpenseForReceipt(exp)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 active:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Fiş Görseli</span>
                          <Eye className="w-3 h-3 opacity-70 ml-0.5" />
                        </button>
                      ) : isStaff ? (
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-sky-400" />
                          {exp.staffName || 'Personel'} {exp.paymentBasis === 'monthly' ? '(Aylık)' : exp.paymentBasis === 'daily' ? '(Günlük)' : ''} (Elden)
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Fiş Eklenmemiş
                        </span>
                      )}

                      {exp.receiptNumber && (
                        <span className="text-[10px] font-mono text-zinc-500">
                          #{exp.receiptNumber}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => void handleDelete(exp.id)} disabled={readOnly || deletingId === exp.id}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 active:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Gideri Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[11px] font-semibold text-zinc-400">
                <th className="py-3 px-4">Tarih</th>
                {isMerkez && <th className="py-3 px-4">Şube</th>}
                <th className="py-3 px-4">Gider Kalemi</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4">Belge / Fiş No</th>
                <th className="py-3 px-4 text-center">Kanıt Durumu</th>
                <th className="py-3 px-4 text-right">Tutar</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={isMerkez ? 8 : 7} className="py-8 text-center text-zinc-500">
                    Kriterlere uygun gider kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isStaff = isStaffExpense(exp);
                  const hasReceipt = !!exp.receiptImage;

                  return (
                    <tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-3 px-4 font-mono text-zinc-400">{exp.date}</td>
                      {isMerkez && (
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          {exp.branchName}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {exp.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {exp.staffName ? (
                          <span className="flex items-center gap-1 text-sky-400">
                            <User className="w-3 h-3" />
                            {exp.staffName} {exp.paymentBasis ? (exp.paymentBasis === 'monthly' ? '(Aylık)' : '(Günlük)') : ''}
                          </span>
                        ) : exp.receiptNumber ? (
                          <span className="font-mono text-emerald-400 font-semibold">{exp.receiptNumber}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      {/* Evidence / Proof Column */}
                      <td className="py-3 px-4 text-center">
                        {hasReceipt ? (
                          <button
                            onClick={() => setSelectedExpenseForReceipt(exp)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition-colors"
                            title="Fiş görselini görüntüle"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Fiş Ekli</span>
                            <Eye className="w-3 h-3 opacity-70 ml-0.5" />
                          </button>
                        ) : isStaff ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                            <span>Elden Nakit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            <span>Fiş Yok</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        -{(exp.amount ?? 0).toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasReceipt && (
                            <button
                              onClick={() => setSelectedExpenseForReceipt(exp)}
                              className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                              title="Görseli İncele"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => void handleDelete(exp.id)} disabled={readOnly || deletingId === exp.id}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Gider Kaydını Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Total */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Toplam {filteredExpenses.length} gider kaydı
          </span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Filtrelenen Toplam Gider:</span>
            <span className="font-mono font-bold text-rose-400 text-sm">
              {(totalFilteredAmount ?? 0).toLocaleString('tr-TR')} ₺
            </span>
          </div>
        </div>
      </div>

      </>}

      {/* Add Expense Modal with Image/Camera Upload */}
      {(view === 'new' || view === 'camera') && (
        <div className="space-y-4 w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full p-4 md:p-6 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-100">{view === 'camera' ? 'Fiş Çek & Gider Ekle' : 'Yeni Gider ve Fatura Kaydı'}</h3>
              </div>
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 p-2"
              >
                <ArrowLeft className="w-4 h-4" /><span className="text-xs">Giderlere Dön</span>
              </button>
            </div>

            {view === 'camera' && <div className="mt-5">{receiptEditor}</div>}
            {!entryCategories.length && <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
              <span>Aktif gider kalemi yok. Yeni gider için bir kalem ekleyin veya etkinleştirin.</span>
              <button type="button" onClick={() => setActiveTab('expense_categories')} className="underline font-semibold">Gider Kalemlerine Git</button>
            </div>}
            <form onSubmit={handleFormSubmit} className="expense-entry-form grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 text-xs">
              {/* Branch & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isMerkez ? (
                  <div>
                    <label className="block text-zinc-400 mb-1">Şube</label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-zinc-400 mb-1">Şube</label>
                    <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2 text-zinc-300 font-medium">
                      {currentUser?.branchName || 'Şubeniz'}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 mb-1">Tarih</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              {/* Expense Category */}
              <div>
                <label className="block text-zinc-400 mb-1">Gider Kalemi</label>
                <select
                  value={formCategoryId}
                  required
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                >
                  <option value="">Gider kalemi seçin…</option>
                  {entryCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'staff_based' ? 'Personel Bazlı' : 'Fatura/Fişli'})
                    </option>
                  ))}
                </select>
              </div>

              {/* If staff-based, select staff */}
              {isStaffBased && (
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <label className="block text-sky-400 font-medium">
                    Personel Seçimi (Kayıtlı Ücret)
                  </label>
                  <select
                    value={formStaffId}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none text-xs"
                  >
                    <option value="">Personel Seçin...</option>
                    {branchStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} - {s.role} (Yevmiye: {s.dailyWage} ₺)
                      </option>
                    ))}
                  </select>
                  {formStaffId && <div><label className="block text-zinc-400 mb-1">Ödeme Dönemi</label><select value={paymentBasis} onChange={e => handleStaffSelect(formStaffId, e.target.value as 'daily' | 'monthly')} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2"><option value="daily">Günlük</option><option value="monthly">Aylık (30 gün)</option></select><p className="text-[11px] text-zinc-500 mt-2">Kayıtlı ücret önerilir; ödenen tutarı değiştirebilirsiniz. Seçilen tarihte tek gider kaydedilir.</p></div>}
                  <p className="text-[11px] text-zinc-500">
                    💡 Maaşlar elden nakit ödendiği için fiş kanıtı zorunlu değildir.
                  </p>
                </div>
              )}

              {/* Amount & Suggested values */}
              <div>
                <div className="flex flex-wrap gap-2 items-center justify-between mb-1">
                  <label className="text-zinc-400">Tutar (TRY / ₺)</label>
                  {lastAmountsForCategory.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Son kullanılanlar:</span>
                      {lastAmountsForCategory.map((val, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormAmount(val)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
                        >
                          {val} ₺
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xl sm:text-2xl font-black font-mono text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors"
                />
                {/* Mobile Quick Increment Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[100, 250, 500, 1000, 2500, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormAmount((prev) => (Number(prev) || 0) + val)}
                      className="px-2 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 active:bg-rose-500 active:text-white transition-colors"
                    >
                      +{val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {view !== 'camera' && receiptEditor}

              {/* Description, Receipt Number & VAT Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">İrsaliye / Fatura No</label>
                  <input
                    type="text"
                    placeholder="IRS-2026-4401"
                    maxLength={128}
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">KDV Oranı (Vergi Dengeleme)</label>
                  <select
                    value={formVatRate}
                    onChange={(e) => setFormVatRate(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value={0}>%0 (Maaş / Vergiden Muaf)</option>
                    <option value={1}>%1 (Et, Kasap, Sebze/Meyve)</option>
                    <option value={10}>%10 (Gıda & Meşrubat)</option>
                    <option value={20}>%20 (Temizlik, Lojistik, Genel Mal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Harcama Açıklaması</label>
                <input
                  type="text"
                  maxLength={5000}
                  placeholder="Kasap faturası, koli sevkiyatı veya detay..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Actions */}
              <div className="expense-actions lg:col-span-2 pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!formAmount || Number(formAmount) <= 0 || !currentCategory || saving || photoBusy || readOnly}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-zinc-950 font-bold transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor…' : 'Gideri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Lightbox Modal */}
      <ReceiptModal
        expense={selectedExpenseForReceipt}
        onClose={() => setSelectedExpenseForReceipt(null)}
      />

      {/* SMMM Accounting PDF Report Modal */}
      <AccountingReportModal
        isOpen={view === 'accounting'}
        inline
        companyName={currentUser?.companyName || currentUser?.branchName || 'CIROX'}
        onClose={() => setView('list')}
        expenses={expenses}
        branches={branches}
        currentBranchId={userBranchId}
        isMerkez={isMerkez}
      />
    </div>
  );
};
