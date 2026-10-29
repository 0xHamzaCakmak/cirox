import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import type { ExpenseRecord } from '../../types';
import { ReceiptModal } from './ReceiptModal';

export const BranchExpenseHistory: React.FC<{
  branchId: string; branchName: string; start: string; end: string; expenses: ExpenseRecord[];
}> = ({ branchId, branchName, start, end, expenses }) => {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState<ExpenseRecord | null>(null);
  const rows = useMemo(() => expenses.filter(row => !!branchId && row.branchId === branchId && row.date >= start && row.date <= end)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
  [expenses, branchId, start, end]);
  useEffect(() => { setPage(1); setReceipt(null); }, [branchId, start, end, pageSize]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;

  return <section className="branch-expense-history bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
    <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-zinc-100">{branchName} — Son İşlemler</h3>
      <span className="text-xs text-zinc-400">Seçili dönemde {rows.length} gider kaydı</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-950/40 border-b border-zinc-800 text-zinc-400">
          <tr><th className="p-3 whitespace-nowrap">Tarih</th><th className="p-3">Gider Kalemi</th>
            <th className="p-3">Açıklama</th><th className="p-3">Personel / Fiş No</th>
            <th className="p-3 text-right">Tutar</th><th className="p-3">Fiş / Fatura</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Seçilen dönemde gider kaydı bulunmuyor.</td></tr>}
          {rows.slice(offset, offset + pageSize).map(row => {
            const photos = row.receipts?.length || (row.receiptImage ? 1 : 0);
            return <tr key={row.id} className="hover:bg-zinc-800/30">
              <td className="p-3 font-mono text-zinc-400 whitespace-nowrap">{row.date.split('-').reverse().join('.')}</td>
              <td className="p-3 font-medium text-zinc-200">{row.categoryName}</td>
              <td className="p-3 text-zinc-400 max-w-sm break-words">{row.description || '—'}</td>
              <td className="p-3 text-zinc-400">{row.staffName || row.receiptNumber || '—'}</td>
              <td className="p-3 font-mono text-right text-rose-400 font-semibold whitespace-nowrap">-{row.amount.toLocaleString('tr-TR')} ₺</td>
              <td className="p-3">{photos ? <button onClick={() => setReceipt(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-1.5 text-sky-400 whitespace-nowrap" aria-label={`${row.categoryName} fişlerini görüntüle`}>
                <Image className="h-3.5 w-3.5" />Görüntüle ({photos})</button> : <span className="text-zinc-500">Ek yok</span>}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 p-4 text-xs text-zinc-400">
      <label className="flex items-center gap-2">Sayfa başına
        <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-zinc-700 bg-zinc-950 p-1.5 text-zinc-200">
          {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
        <span>{rows.length ? `${offset + 1}–${Math.min(offset + pageSize, rows.length)} / ${rows.length}` : '0 kayıt'}</span>
      </label>
      <div className="flex items-center gap-3">
        <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Önceki sayfa" className="p-2 rounded-lg border border-zinc-700 disabled:opacity-30 hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /></button>
        <span>Sayfa {currentPage} / {pages}</span>
        <button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="Sonraki sayfa" className="p-2 rounded-lg border border-zinc-700 disabled:opacity-30 hover:bg-zinc-800"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
    <ReceiptModal expense={receipt} onClose={() => setReceipt(null)} />
  </section>;
};
