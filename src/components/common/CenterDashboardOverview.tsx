import React, { useLayoutEffect, useRef, useState } from 'react';
import { TrendingUp, Receipt, Wallet, Store, Users } from 'lucide-react';
import { TrendLineChart } from './SleekCharts';
import type { CenterDashboardSummary } from '../../data/centerDashboard';

const money = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

export const CenterDashboardOverview: React.FC<{ summary: CenterDashboardSummary; companyName: string; showHeading?: boolean }> = ({ summary, companyName, showHeading = true }) => {
  const root = useRef<HTMLElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number | undefined>(undefined);
  const [chartTab, setChartTab] = useState<'trend' | 'balance'>('trend');

  useLayoutEffect(() => {
    const main = root.current?.closest('main');
    if (!main) return;
    const measure = () => {
      const style = window.getComputedStyle(main);
      const height = main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setAvailableHeight(previous => previous === height ? previous : height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const change = summary.revenueChange;
  const cards = [
    { label: 'Toplam Ciro', value: money(summary.totalRevenue), unit: '₺', icon: TrendingUp, tone: 'text-emerald-400',
      note: change === null ? 'Önceki gün ciro yok' : `${change > 0 ? '+' : ''}${Math.round(change)}% düne kıyasla` },
    { label: 'Toplam Gider', value: money(summary.totalExpense), unit: '₺', icon: Receipt, tone: 'text-rose-400', note: `Gider oranı: %${Math.round(summary.expenseRatio)}` },
    { label: 'Net Kar', value: money(summary.totalNet), unit: '₺', icon: Wallet, tone: summary.totalNet < 0 ? 'text-rose-400' : 'text-emerald-400', note: `Net marj: %${Math.round(summary.netMargin)}` },
    { label: 'Şube Sayısı', value: String(summary.branchCount), unit: 'Şube', icon: Store, tone: 'text-amber-400', note: `${summary.activeCount} aktif · ${summary.reviewCount} incelemede` },
    { label: 'Toplam Personel', value: String(summary.staffCount), unit: 'Kişi', icon: Users, tone: 'text-sky-400',
      note: `Şube ortalaması: ${summary.branchCount ? (summary.staffCount / summary.branchCount).toFixed(1) : '0'}` },
  ];

  return <section ref={root} className="center-dashboard-overview" data-heading={showHeading} aria-label="Merkez finans özeti"
    style={{ height: availableHeight }}>
    {showHeading && <div className="center-dashboard-heading">
      <h2 className="font-bold text-zinc-100">Merkez Finans ve Operasyon Takibi — {companyName}</h2>
      <p className="center-dashboard-description text-zinc-400">Bugün bağlı {summary.branchCount} şubenin / işletme biriminin günlük hasılat, gider dağılımı ve net karlılık durumu canlı izleniyor.</p>
      <p className="center-dashboard-description-short text-zinc-400">{summary.branchCount} bağlı şube / işletme biriminin günlük finans özeti.</p>
    </div>}
    <div className="center-dashboard-kpis">
      {cards.map(card => {
        const Icon = card.icon;
        return <article key={card.label} style={{ '--value-length': card.value.length } as React.CSSProperties} className="center-dashboard-kpi rounded-2xl border border-zinc-800 bg-zinc-900/90">
          <div className="center-dashboard-kpi-label text-zinc-400"><span>{card.label}</span><Icon className={`center-dashboard-kpi-icon ${card.tone}`} aria-hidden="true" /></div>
          <p className={`center-dashboard-kpi-value font-mono font-bold ${card.tone}`}>{card.value}<span className="center-dashboard-kpi-unit font-sans font-normal text-zinc-500">{card.unit}</span></p>
          <p className="center-dashboard-kpi-note text-zinc-500">{card.note}</p>
        </article>;
      })}
    </div>
    <div className="center-dashboard-chart-tabs" aria-label="Grafik seçimi">
      <button type="button" aria-pressed={chartTab === 'trend'} onClick={() => setChartTab('trend')} className={chartTab === 'trend' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}>7 Günlük Grafik</button>
      <button type="button" aria-pressed={chartTab === 'balance'} onClick={() => setChartTab('balance')} className={chartTab === 'balance' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}>Günlük Denge</button>
    </div>
    <div className="center-dashboard-charts" data-chart-tab={chartTab}>
      <article className="center-dashboard-trend rounded-2xl border border-zinc-800 bg-zinc-900/90">
        <div className="center-dashboard-chart-heading">
          <h3 className="font-bold text-zinc-100">Son 7 Gün Ciro ve Gider Karşılaştırması</h3>
          <span className="font-mono text-zinc-400">Haftalık Ciro: {money(summary.weeklyRevenue)} ₺</span>
        </div>
        <div className="center-dashboard-trend-plot" data-empty={summary.trend.every(day => day.revenue === 0 && day.expense === 0)}>
          {summary.trend.every(day => day.revenue === 0 && day.expense === 0) && <div className="patron-dashboard-empty text-zinc-400"><TrendingUp aria-hidden="true" /><p>Son 7 günde ciro veya gider kaydı bulunmuyor.</p><span>Şubeler kayıt eklediğinde grafik burada güncellenir.</span></div>}
          <TrendLineChart data={summary.trend} fit />
        </div>
      </article>
      <article className="center-dashboard-balance rounded-2xl border border-zinc-800 bg-zinc-900/90">
        <h3 className="font-bold text-zinc-100">Ciro / Gider / Net Dengesi</h3>
        <div className="center-dashboard-balance-bars">
          {[
            { label: 'Gider Payı', percent: summary.expenseRatio, value: summary.totalExpense, color: 'bg-rose-500', text: 'text-rose-400' },
            { label: 'Net Kar Marjı', percent: summary.netMargin, value: summary.totalNet, color: 'bg-emerald-500', text: summary.totalNet < 0 ? 'text-rose-400' : 'text-emerald-400' },
          ].map(item => <div key={item.label}>
            <div className="center-dashboard-balance-label"><span className="text-zinc-400">{item.label}</span><span className={`font-mono font-semibold ${item.text}`}>%{Math.round(item.percent)} ({money(item.value)} ₺)</span></div>
            <div className="mt-2 h-2 rounded-full bg-zinc-950"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }} /></div>
          </div>)}
        </div>
        <dl className="center-dashboard-balance-details border-t border-zinc-800">
          {[
            ['Personel Yevmiye Toplamı', `${money(summary.dailyStaffCost)} ₺`],
            ['Ortalama Şube Cirosu', `${money(summary.branchCount ? summary.totalRevenue / summary.branchCount : 0)} ₺`],
            ['En Yüksek Ciro', summary.highestBranch ? `${summary.highestBranch.name} (${money(summary.highestBranch.dailyRevenue)} ₺)` : 'Henüz ciro kaydı yok'],
          ].map(([label, value]) => <div key={label}><dt className="text-zinc-400">{label}</dt><dd className="font-medium text-zinc-200">{value}</dd></div>)}
        </dl>
      </article>
    </div>
  </section>;
};
