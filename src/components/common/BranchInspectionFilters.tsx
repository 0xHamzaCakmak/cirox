import React from 'react';
import type { BranchInspectionPeriod } from '../../data/branchInspectionRange';

const fieldClass = 'min-w-0 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600';
export const BranchInspectionFilters: React.FC<{
  period: BranchInspectionPeriod; start: string; end: string;
  compact?: boolean;
  range: { start: string; end: string; custom: boolean; error: string };
  onPeriod: (period: BranchInspectionPeriod) => void; onStart: (date: string) => void; onEnd: (date: string) => void;
}> = ({ period, start, end, range, onPeriod, onStart, onEnd, compact = false }) => {
  const format = (date: string) => date.split('-').reverse().join('.');
  return <div className={compact ? 'patron-period-fields min-w-0 space-y-[2px]' : 'min-w-0 space-y-2'}>
    <div className="grid grid-cols-3 items-end gap-2">
      <label className="min-w-0 space-y-1 text-[11px] text-zinc-400"><span className="block">Dönem</span>
        <select className={fieldClass} value={range.custom ? 'custom' : period} onChange={event => onPeriod(event.target.value as BranchInspectionPeriod)}>
          <option value="today">Bugün</option><option value="7days">Son 7 Gün</option>
          <option value="1month">Son 1 Ay</option><option value="3months">Son 3 Ay</option>
          <option value="year">Son 1 Yıl (Bu Yıl)</option><option value="custom" disabled>Özel Tarih Aralığı</option>
        </select>
      </label>
      <label className="min-w-0 space-y-1 text-[11px] text-zinc-400"><span className="block">Başlangıç Tarihi</span>
        <input type="date" className={fieldClass} value={start} onChange={event => onStart(event.target.value)} aria-label="Özet başlangıç tarihi" />
      </label>
      <label className="min-w-0 space-y-1 text-[11px] text-zinc-400"><span className="block">Bitiş Tarihi</span>
        <input type="date" className={fieldClass} value={end} onChange={event => onEnd(event.target.value)} aria-label="Özet bitiş tarihi" />
      </label>
    </div>
    {range.error && <p role="alert" className="text-xs text-amber-400">{range.error} Menüdeki dönem gösteriliyor.</p>}
    <p className="text-[11px] text-zinc-500">Gösterilen dönem: {format(range.start)}{range.end !== range.start ? ` — ${format(range.end)}` : ''}</p>
  </div>;
};
