import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Calendar,
  Building,
  Receipt,
  FileCheck,
  CreditCard,
  Percent,
} from 'lucide-react';
import { ExpenseRecord } from '../../types';

interface ReceiptModalProps {
  expense: ExpenseRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ expense, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => { setImageIndex(0); setZoom(1); setRotation(0); }, [expense?.id]);

  if (!expense) return null;
  const imageUrl = expense.receipts?.[imageIndex]?.url || expense.receiptImage;
  const imageName = expense.receipts?.[imageIndex]?.fileName || expense.receiptFileName;

  const handlePrint = () => {
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
    const safe = { ...expense, branchName: escape(expense.branchName), date: escape(expense.date),
      categoryName: escape(expense.categoryName), description: escape(expense.description), receiptNumber: escape(expense.receiptNumber),
      createdAt: escape(expense.createdAt), receiptImage: escape(imageUrl) };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Fiş / Fatura Kanıtı - ${safe.receiptNumber || expense.categoryName}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; text-align: center; color: #111; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
            img { max-width: 90%; max-height: 80vh; object-fit: contain; border: 1px solid #ccc; }
            .meta { margin-top: 15px; font-size: 14px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; }
            .meta div { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Harcama Fiş / Fatura Belgesi (Muhasebe Kanıtı)</h2>
            <p>${safe.branchName} - ${safe.date}</p>
          </div>
          ${safe.receiptImage ? `<img src="${safe.receiptImage}" alt="Fiş" />` : '<p>Görsel bulunamadı</p>'}
          <div class="meta">
            <div><strong>Fatura / Fiş No:</strong> ${safe.receiptNumber || 'Belirtilmemiş'}</div>
            <div><strong>Kategori:</strong> ${safe.categoryName}</div>
            <div><strong>Tutar:</strong> ${(expense.amount ?? 0).toLocaleString('tr-TR')} ₺</div>
            <div><strong>Açıklama:</strong> ${safe.description}</div>
            <div><strong>Kayıt Zamanı:</strong> ${safe.createdAt}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = (imageName || `fis_${expense.id}`).replace(/\.[^.]+$/, '') + '.webp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="receipt-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div role="dialog" aria-modal="true" aria-label="Fiş ve fatura görseli" className="receipt-modal-panel relative z-10 bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="receipt-modal-header px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Fiş / Fatura Görsel Kanıtı
                </h3>
                {expense.receiptNumber && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-emerald-300 font-semibold">
                    {expense.receiptNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {expense.branchName} • {expense.categoryName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/70 rounded-lg p-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                title="Küçült"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-zinc-300 px-1 min-w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                title="Büyüt"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Döndür"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors border-l border-zinc-700 ml-0.5 pl-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              title="Yazdır"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors border border-zinc-700/60"
            >
              <Printer className="w-4 h-4" />
            </button>

            {imageUrl && (
              <button
                onClick={handleDownload}
                title="Görseli İndir"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors border border-zinc-700/60"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              title="Kapat"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(expense.receipts?.length ?? 0) > 1 && <div className="flex gap-2 p-3 overflow-x-auto border-b border-zinc-800">{expense.receipts!.map((photo, index) =>
          <button key={photo.id} onClick={() => { setImageIndex(index); setZoom(1); setRotation(0); }} className={`shrink-0 border rounded-lg p-1 ${index === imageIndex ? 'border-emerald-500' : 'border-zinc-700'}`} title={photo.fileName}>
            <img src={photo.url} alt={photo.fileName} className="w-12 h-12 object-cover rounded" />
          </button>)}</div>}
        {/* Content Body: Image Viewport + Metadata Side Panel */}
        <div className="receipt-modal-body flex-1 flex flex-col md:flex-row overflow-hidden min-h-[350px]">
          {/* Image Display Area */}
          <div className="flex-1 bg-zinc-950 p-4 flex items-center justify-center overflow-auto relative select-none">
            {imageUrl ? (
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={imageUrl}
                  alt={imageName || 'Fiş Kanıtı'}
                  className="max-h-[60vh] md:max-h-[68vh] object-contain rounded-lg shadow-2xl border border-zinc-800/80"
                />
              </div>
            ) : (
              <div className="text-center p-8 text-zinc-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-400">Bu harcama için görsel yüklenmemiş</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Maaş ödemeleri elden nakit yapıldığı için kanıt görseli gerekmeyebilir.
                </p>
              </div>
            )}
          </div>

          {/* Metadata Sidebar */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/60 p-4 space-y-4 overflow-y-auto text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                Harcama Tutarı
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                {(expense.amount ?? 0).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">₺</span>
              </div>
              {expense.vatRate !== undefined && expense.vatRate > 0 && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                  <Percent className="w-3 h-3" />
                  <span>KDV %{expense.vatRate} dahil ({(Math.round((expense.amount ?? 0) * 100 * (expense.vatRate / (100 + expense.vatRate))) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)</span>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-3 space-y-2.5">
              <div>
                <span className="text-zinc-500 block text-[11px]">Şube</span>
                <span className="font-semibold text-zinc-200">{expense.branchName}</span>
              </div>

              <div>
                <span className="text-zinc-500 block text-[11px]">Gider Kalemi</span>
                <span className="font-semibold text-zinc-200">{expense.categoryName}</span>
              </div>

              <div>
                <span className="text-zinc-500 block text-[11px]">Harcama Tarihi</span>
                <span className="font-mono text-zinc-200">{expense.date}</span>
              </div>

              {expense.receiptNumber && (
                <div>
                  <span className="text-zinc-500 block text-[11px]">İrsaliye / Fatura No</span>
                  <span className="font-mono text-emerald-400 font-semibold">{expense.receiptNumber}</span>
                </div>
              )}

              {expense.staffName && (
                <div>
                  <span className="text-zinc-500 block text-[11px]">İlgili Personel</span>
                  <span className="text-sky-300 font-medium">{expense.staffName}</span>
                </div>
              )}

              <div>
                <span className="text-zinc-500 block text-[11px]">Açıklama</span>
                <p className="text-zinc-300 mt-0.5 leading-relaxed bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                  {expense.description}
                </p>
              </div>

              <div>
                <span className="text-zinc-500 block text-[11px]">Sisteme Kayıt Zamanı</span>
                <span className="font-mono text-[11px] text-zinc-400">{expense.createdAt}</span>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 leading-snug">
                <strong>Muhasebe Notu:</strong> Bu belge işletmenin mali kayıtları ve vergi dengelemesi için saklanmaktadır.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
