import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  Building,
  Calendar,
  CheckCircle2,
  FileText,
  Percent,
  Download,
  Receipt,
  UserCheck,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { ExpenseRecord, Branch } from '../../types';
import { expenseTotals, isStaffExpense } from '../../data/expenseMath';

interface AccountingReportModalProps {
  inline?: boolean;
  companyName?: string;
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseRecord[];
  branches: Branch[];
  currentBranchId?: string;
  isMerkez: boolean;
}

export const AccountingReportModal: React.FC<AccountingReportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  branches,
  currentBranchId,
  isMerkez,
  inline = false,
  companyName = 'CIROX',
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isMerkez ? 'all' : currentBranchId || 'branch-1'
  );
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [includeReceiptThumbnails, setIncludeReceiptThumbnails] = useState(true);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  useEffect(() => () => { document.body.classList.remove('cirox-print-accounting'); }, []);

  // Filter expenses according to selection
  const filteredList = useMemo(() => {
    return expenses.filter((e) => {
      const matchBranch = selectedBranchId === 'all' || e.branchId === selectedBranchId;
      const startWeek = new Date(today + 'T12:00:00Z'); startWeek.setUTCDate(startWeek.getUTCDate() - 6);
      const matchDate = dateFilter === 'all' || (dateFilter === 'today' ? e.date === today : dateFilter === 'week'
        ? e.date >= startWeek.toISOString().slice(0, 10) && e.date <= today : e.date.slice(0, 7) === today.slice(0, 7));
      return matchBranch && matchDate;
    });
  }, [expenses, selectedBranchId, dateFilter, today]);

  const { totalAmount, staffAmount, invoicedAmount, vatBreakdown } = useMemo(() => expenseTotals(filteredList), [filteredList]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    document.body.classList.add('cirox-print-accounting');
    await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.accounting-page img')).map(image => image.decode().catch(() => {})));
    window.addEventListener('afterprint', () => document.body.classList.remove('cirox-print-accounting'), { once: true });
    window.print();
  };

  const selectedBranchObj = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className={inline ? 'accounting-page w-full space-y-4' : 'accounting-page fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm'}>
      {!inline && <div className="fixed inset-0 print:hidden" onClick={onClose} />}

      <div className={`bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full flex flex-col overflow-hidden print:border-none print:bg-white print:text-black ${inline ? '' : 'relative z-10 max-w-5xl max-h-[95vh] shadow-2xl'}`}>
        {/* Top Action Bar (Hidden when printing) */}
        <div className="px-4 md:px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Muhasebe Gider & Masraf Dosyası</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  SMMM Formatı
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                İşletme kayıtları, belge ekleri ve muhasebe teslim dökümü
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select value={dateFilter} onChange={event => setDateFilter(event.target.value as typeof dateFilter)} aria-label="Rapor dönemi" className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
              <option value="today">Bugün</option><option value="week">Son 7 Gün</option><option value="month">Bu Ay</option><option value="all">Tüm Tarihler</option>
            </select>
            {isMerkez && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="all">Tüm Şubeler ({branches.length} Şube)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <label className="hidden md:flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/80 px-2.5 py-1.5 rounded-lg border border-zinc-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReceiptThumbnails}
                onChange={(e) => setIncludeReceiptThumbnails(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-0"
              />
              <span>Fiş Görsellerini Ekle</span>
            </label>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition-colors shadow-md shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>PDF Olarak Yazdır / İndir</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-2 p-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              {inline ? <><ArrowLeft className="w-4 h-4" /><span>Giderlere Dön</span></> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 p-4 md:p-8 bg-zinc-950 text-zinc-200 print:bg-white print:text-black print:p-4 print:overflow-visible font-sans">
          {/* Document Header */}
          <div className="border-b-2 border-zinc-800 pb-5 mb-6 print:border-black">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-100 print:text-black">
                  {companyName}
                </h1>
                <p className="text-xs text-zinc-400 print:text-zinc-600 mt-1">
                  CIROX • İşletme kayıtları ve belge ekleri
                </p>
                <div className="mt-2 text-xs font-medium text-emerald-400 print:text-emerald-700">
                  {selectedBranchId === 'all'
                    ? 'Konsolide Çoklu Şube Harcama ve Gider Beyan Raporu'
                    : `${selectedBranchObj?.name || 'Şube'} İşletme Masraf ve Fiş Dosyası`}
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="font-mono text-zinc-400 print:text-zinc-600">
                  Rapor No: <strong>RPR-{today.replaceAll('-', '')}-{selectedBranchId === 'all' ? 'ALL' : selectedBranchObj?.code || '01'}</strong>
                </div>
                <div className="font-mono text-zinc-400 print:text-zinc-600">
                  Tarih: <strong>{new Date(today + 'T12:00:00Z').toLocaleDateString('tr-TR')}</strong>
                </div>
                <div className="text-[11px] text-zinc-500 print:text-zinc-500">
                  Dönem: <strong>{dateFilter === 'all' ? 'Tüm tarihler' : dateFilter === 'today' ? 'Bugün' : dateFilter === 'week' ? 'Son 7 gün' : today.slice(0, 7)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Rebalancing & Financial Ledger Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <span className="text-[11px] text-zinc-400 print:text-zinc-600 block">
                Toplam Harcama (Brüt)
              </span>
              <div className="text-lg font-bold font-mono text-zinc-100 print:text-black mt-1">
                {(totalAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] text-zinc-500 print:text-zinc-600">
                {filteredList.length} adet işlem kaydı
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <span className="text-[11px] text-emerald-400 print:text-emerald-700 block font-medium">
                Faturalı & Fişli Gider
              </span>
              <div className="text-lg font-bold font-mono text-emerald-400 print:text-emerald-800 mt-1">
                {(invoicedAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] text-zinc-500 print:text-zinc-600">
                Belge eki bulunan giderler
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <span className="text-[11px] text-indigo-400 print:text-indigo-700 block font-medium">
                Tahmini İndirilecek KDV
              </span>
              <div className="text-lg font-bold font-mono text-indigo-300 print:text-indigo-900 mt-1">
                {(vatBreakdown.totalVat ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] text-zinc-500 print:text-zinc-600">
                Vergi dengelemesi avantajı
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <span className="text-[11px] text-amber-400 print:text-amber-700 block font-medium">
                Elden Nakit (Yevmiye/Maaş)
              </span>
              <div className="text-lg font-bold font-mono text-amber-300 print:text-amber-900 mt-1">
                {(staffAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] text-zinc-500 print:text-zinc-600">
                Fiş gerekmez (Elden ödendi)
              </span>
            </div>
          </div>

          {/* Detailed Itemized Expense Table */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-2">
              Harcama Kalemleri ve Fatura Listesi
            </h4>
            <div className="border border-zinc-800 print:border-black rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900 print:bg-zinc-100 border-b border-zinc-800 print:border-black text-[11px] font-semibold text-zinc-400 print:text-zinc-800">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Tarih</th>
                    <th className="py-2.5 px-3">Şube</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Fatura / Fiş No</th>
                    <th className="py-2.5 px-3">Açıklama</th>
                    <th className="py-2.5 px-3 text-center">Kanıt Durumu</th>
                    <th className="py-2.5 px-3 text-right">KDV</th>
                    <th className="py-2.5 px-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 print:divide-zinc-300 font-mono">
                  {filteredList.map((e, idx) => {
                    const isStaff = isStaffExpense(e);
                    const hasReceipt = !!e.receiptImage;
                    const vat = e.vatRate !== undefined ? `%${e.vatRate}` : isStaff ? '-' : '%0';

                    return (
                      <tr key={e.id} className="hover:bg-zinc-900/50 print:hover:bg-transparent">
                        <td className="py-2.5 px-3 text-zinc-500 font-normal">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-zinc-300 print:text-black">{e.date}</td>
                        <td className="py-2.5 px-3 text-zinc-200 print:text-black font-sans truncate max-w-[120px]">
                          {e.branchName.replace(' Şubesi', '')}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 print:text-black font-sans">
                          {e.categoryName}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 print:text-black font-semibold">
                          {e.receiptNumber || (isStaff ? 'Elden Nakit' : '-')}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 print:text-black font-sans truncate max-w-[180px]">
                          {e.description}
                          {e.staffName && <div className="text-[10px] text-zinc-500 print:text-black">{e.staffName} {e.paymentBasis === 'monthly' ? '· Aylık' : e.paymentBasis === 'daily' ? '· Günlük' : ''}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans text-[10px]">
                          {hasReceipt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 print:text-emerald-800 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Fiş Ekli
                            </span>
                          ) : isStaff ? (
                            <span className="text-zinc-500 print:text-zinc-600">
                              Nakit Ödeme
                            </span>
                          ) : (
                            <span className="text-amber-400 print:text-amber-800">
                              Fiş Bekleniyor
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-400 print:text-black">{vat}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-100 print:text-black">
                          {(e.amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-900/90 print:bg-zinc-100 border-t-2 border-zinc-800 print:border-black font-bold text-xs">
                    <td colSpan={7} className="py-3 px-3 text-right font-sans text-zinc-300 print:text-black">
                      Genel Toplam Masraf:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-400 print:text-black">
                      {(vatBreakdown.totalVat ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 print:text-black text-sm">
                      {(totalAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Attached Receipt Thumbnails (Evidence Appendix) */}
          {includeReceiptThumbnails && (
            <div className="mb-8 pt-4 border-t border-zinc-800 print:border-black print:page-break-before-always">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 print:text-black flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Ek-1: Fatura ve Fiş Kanıt Belgeleri Fotokopisi</span>
                </h4>
                <span className="text-[11px] text-zinc-500 print:text-zinc-600">
                  {filteredList.reduce((sum, expense) => sum + (expense.receipts?.length || (expense.receiptImage ? 1 : 0)), 0)} ekli belge
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredList.flatMap(expense => (expense.receipts?.length ? expense.receipts : expense.receiptImage ? [{ id: expense.id, url: expense.receiptImage, fileName: expense.receiptFileName || 'Fiş' }] : [])
                  .map(photo => ({ ...expense, id: expense.id + photo.id, receiptImage: photo.url })))
                  .map((e, idx) => (
                    <div
                      key={e.id}
                      className="border border-zinc-800 print:border-zinc-400 rounded-lg p-2 bg-zinc-900/40 print:bg-white text-[10px]"
                    >
                      <div className="h-32 bg-zinc-950 print:bg-zinc-100 rounded overflow-hidden flex items-center justify-center mb-1.5 border border-zinc-800 print:border-zinc-300">
                        <img
                          src={e.receiptImage}
                          alt={e.receiptNumber || 'Fiş'}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between font-mono font-bold text-zinc-200 print:text-black">
                        <span>Belge #{idx + 1}</span>
                        <span className="text-emerald-400 print:text-emerald-800">{(e.amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                      </div>
                      <p className="text-zinc-400 print:text-zinc-600 truncate mt-0.5">{e.description}</p>
                      <p className="text-zinc-500 print:text-zinc-500 font-mono text-[9px]">{e.receiptNumber || e.date}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Legal Signatures / Certification Box */}
          <div className="border-t-2 border-zinc-800 print:border-black pt-6 grid grid-cols-2 gap-8 text-xs">
            <div className="border border-zinc-800 print:border-zinc-400 rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-zinc-300 print:text-black uppercase block">
                İşletme Yetkilisi / Şube Sorumlusu
              </span>
              <p className="text-[11px] text-zinc-400 print:text-zinc-600">
                Yukarıda dökümü yapılan gider ve harcamaların işletme faaliyetleri kapsamında gerçekleştirildiğini, maaşların nakden elden personele ödendiğini beyan ederim.
              </p>
              <div className="pt-6 border-t border-dashed border-zinc-800 print:border-zinc-400 flex items-center justify-between text-[11px]">
                <span>İmza / Kaşe:</span>
                <span className="font-mono text-zinc-500">Tarih: {new Date(today + 'T12:00:00Z').toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

            <div className="border border-zinc-800 print:border-zinc-400 rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-zinc-300 print:text-black uppercase block">
                Mali Müşavir / Muhasebe Kabul
              </span>
              <p className="text-[11px] text-zinc-400 print:text-zinc-600">
                Ekli fatura, fiş ve yevmiye belgeleri vergi mevzuatına ve KDV indirim şartlarına göre kontrol edilmiş olup cari dönem yevmiye defterine işlenmek üzere teslim alınmıştır.
              </p>
              <div className="pt-6 border-t border-dashed border-zinc-800 print:border-zinc-400 flex items-center justify-between text-[11px]">
                <span>Mühür / İmza:</span>
                <span className="font-mono text-zinc-500">Kabul Tarihi: ____/____/{today.slice(0, 4)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
