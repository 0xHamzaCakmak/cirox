import React, { useState, useLayoutEffect, useRef } from 'react';

// Trend Area Chart with dual lines (Ciro & Gider)
export interface TrendDataPoint {
  day: string;
  revenue: number;
  expense: number;
  net: number;
}

export const TrendLineChart: React.FC<{
  data: TrendDataPoint[];
  height?: number;
  fit?: boolean;
}> = ({ data, height: suppliedHeight = 240, fit = false }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [bounds, setBounds] = useState({ width: 600, height: suppliedHeight });
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!fit || !svg) return;
    const measure = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setBounds(previous => previous.width === rect.width && previous.height === rect.height
        ? previous : { width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(svg);
    return () => observer.disconnect();
  }, [fit]);

  const hasValues = data.some(point => point.revenue > 0 || point.expense > 0);
  const maxVal = Math.max(0, ...data.map((d) => Math.max(d.revenue, d.expense))) * 1.15;
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const width = fit ? bounds.width : 600;
  const height = fit ? bounds.height : suppliedHeight;
  const paddingLeft = fit ? 56 : 40;
  const paddingRight = 20;
  const paddingTop = fit ? Math.min(8, height * .1) : 20;
  const paddingBottom = fit ? Math.min(26, height * .35) : 35;
  const plotWidth = Math.max(1, width - paddingLeft - paddingRight);
  const plotHeight = Math.max(1, height - paddingTop - paddingBottom);

  const getX = (idx: number) => paddingLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
  const getY = (val: number) => paddingTop + plotHeight - ((val - minVal) / range) * plotHeight;

  // Build SVG path for revenue
  const revPoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const expPoints = data.map((d, i) => `${getX(i)},${getY(d.expense)}`).join(' ');

  const revArea = `${getX(0)},${getY(0)} ${revPoints} ${getX(data.length - 1)},${getY(0)}`;
  const expArea = `${getX(0)},${getY(0)} ${expPoints} ${getX(data.length - 1)},${getY(0)}`;

  return (
    <div data-financial-chart className={`relative w-full overflow-hidden select-none ${fit ? 'trend-chart--fit' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + plotHeight * (1 - ratio);
          const val = (minVal + range * ratio) / 1000000;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--chart-track, #27272a)"
                strokeDasharray="4 4"
              />
              {(!fit || hasValues || ratio === 0) && <text
                x={paddingLeft - 8}
                y={y + 3}
                fill="var(--chart-muted, #71717a)"
                fontSize={fit ? 11 : 10}
                textAnchor="end"
                className="font-mono"
              >
                {fit ? `${new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(hasValues ? range * ratio : 0)} ₺` : `${val.toFixed(1)}M ₺`}
              </text>}
            </g>
          );
        })}

        {/* Revenue Area & Line */}
        <polygon points={revArea} fill="url(#revGradient)" />
        <polyline
          points={revPoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Expense Area & Line */}
        <polygon points={expArea} fill="url(#expGradient)" />
        <polyline
          points={expPoints}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & Interaction columns */}
        {data.map((d, i) => {
          const x = getX(i);
          const isHovered = hoveredIdx === i;
          return (
            <g key={i}>
              {/* Invisible interaction bar */}
              <rect
                x={x - plotWidth / (data.length * 2)}
                y={paddingTop}
                width={plotWidth / data.length}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Vertical guideline on hover */}
              {isHovered && (
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + plotHeight}
                  stroke="#52525b"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Dot for Revenue */}
              <circle
                cx={x}
                cy={getY(d.revenue)}
                r={isHovered ? 5 : 3.5}
                fill="#10b981"
                stroke="var(--chart-surface, #09090b)"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              {/* Dot for Expense */}
              <circle
                cx={x}
                cy={getY(d.expense)}
                r={isHovered ? 4.5 : 3}
                fill="#f43f5e"
                stroke="var(--chart-surface, #09090b)"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              {/* X Axis labels */}
              <text
                x={x}
                y={fit ? height - Math.min(10, height * .1) : height - 10}
                fill={isHovered ? 'var(--chart-text, #f4f4f5)' : 'var(--chart-muted, #71717a)'}
                fontSize={fit ? 11 : 10}
                textAnchor="middle"
                className="transition-colors duration-150"
              >
                {d.day.split(' ')[0]} {d.day.split(' ')[1]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-20 bg-zinc-900/95 backdrop-blur border border-zinc-700/80 px-3 py-2 rounded-lg shadow-xl text-xs"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: '10px',
            transform: hoveredIdx > data.length / 2 ? 'translateX(-105%)' : 'translateX(5%)',
          }}
        >
          <div className="font-semibold text-zinc-200 border-b border-zinc-800 pb-1 mb-1.5">
            {data[hoveredIdx].day}
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-mono">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Ciro:
            </span>
            <span>{(data[hoveredIdx].revenue ?? 0).toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400 font-mono">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Gider:
            </span>
            <span>{(data[hoveredIdx].expense ?? 0).toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-indigo-300 font-mono pt-1 border-t border-zinc-800 mt-1">
            <span className="text-zinc-400">Net Kar:</span>
            <span>{((data[hoveredIdx].net ?? (data[hoveredIdx].revenue - data[hoveredIdx].expense)) ?? 0).toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="trend-chart-legend flex items-center justify-center gap-6 mt-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded-full bg-emerald-500" />
          <span>Toplam Ciro</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded-full bg-rose-500" />
          <span>Toplam Gider</span>
        </div>
        <div className="trend-chart-legend-note flex items-center gap-2 text-zinc-500">
          <span>Net Fark: Yeşil bölge marjı</span>
        </div>
      </div>
    </div>
  );
};

// Donut Breakdown Chart
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export const DonutBreakdownChart: React.FC<{
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  responsive?: boolean;
}> = ({ segments, centerLabel, centerValue, size = 180, responsive = false }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  const radius = 65;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div data-financial-chart className={responsive ? 'branch-responsive-donut' : 'flex flex-col sm:flex-row items-center gap-5'}>
      <div className="relative shrink-0" style={responsive ? { width: '100%', maxWidth: size, aspectRatio: '1' } : { width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
          {/* Background circle track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--chart-track, #27272a)"
            strokeWidth={strokeWidth}
          />

          {segments.map((seg, idx) => {
              if (seg.value <= 0) return null;
            const percent = seg.value / total;
            const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
            const strokeDashoffset = -circumference * cumulativePercent;
            cumulativePercent += percent;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {centerLabel && <span className="text-[11px] text-zinc-400 font-medium">{centerLabel}</span>}
          {centerValue && (
            <span className="text-sm font-bold text-zinc-100 font-mono tracking-tight">
              {centerValue}
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="donut-legend flex-1 w-full space-y-2">
        {segments.map((seg, idx) => {
          const pct = Math.round((seg.value / total) * 100);
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between text-xs py-1 px-2 rounded transition-colors ${
                isHovered ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                  <span title={seg.label} className="break-words">{seg.label}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-zinc-400">%{pct}</span>
                <span className="font-semibold text-zinc-200">
                  {(seg.value ?? 0).toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mini Sparkline for KPI Cards
export const Sparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ data, color = '#10b981', height = 32, width = 90 }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
