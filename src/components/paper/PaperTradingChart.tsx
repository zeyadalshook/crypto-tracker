import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  Maximize2,
  Clock,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { PortfolioSnapshot } from './paperTypes';
import { formatPercentage } from '../../utils/formatters';

interface PaperTradingChartProps {
  snapshots: PortfolioSnapshot[];
  initialBalance: number;
  currentEquity: number;
  currentRoiPct: number;
  unrealizedPnl: number;
  realizedPnl: number;
  isDemo?: boolean;
}

type ChartMetricMode = 'equity' | 'roi';
type TimeframeFilter = 'ALL' | '30D' | '7D' | '24H';

export const PaperTradingChart: React.FC<PaperTradingChartProps> = ({
  snapshots,
  initialBalance,
  currentEquity,
  currentRoiPct,
  unrealizedPnl,
  realizedPnl,
  isDemo,
}) => {
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('equity');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter snapshots by timeframe
  const filteredSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let cutoff = 0;
    if (timeframe === '24H') cutoff = now - 1 * dayMs;
    else if (timeframe === '7D') cutoff = now - 7 * dayMs;
    else if (timeframe === '30D') cutoff = now - 30 * dayMs;

    const filtered = snapshots.filter((s) => s.timestamp >= cutoff);
    // Ensure at least 2 points for a line
    if (filtered.length < 2 && snapshots.length >= 2) {
      return snapshots.slice(-Math.min(snapshots.length, 10));
    }
    return filtered.length > 0 ? filtered : snapshots;
  }, [snapshots, timeframe]);

  // Compute High-Water Mark and Max Drawdown
  const stats = useMemo(() => {
    if (filteredSnapshots.length === 0) {
      return {
        peakEquity: initialBalance,
        peakRoi: 0,
        lowestEquity: initialBalance,
        lowestRoi: 0,
        maxDrawdownPct: 0,
      };
    }

    let peakEquity = -Infinity;
    let peakRoi = -Infinity;
    let lowestEquity = Infinity;
    let lowestRoi = Infinity;
    let maxDrawdownPct = 0;
    let runningPeak = -Infinity;

    filteredSnapshots.forEach((s) => {
      if (s.equity > peakEquity) peakEquity = s.equity;
      if (s.roiPct > peakRoi) peakRoi = s.roiPct;
      if (s.equity < lowestEquity) lowestEquity = s.equity;
      if (s.roiPct < lowestRoi) lowestRoi = s.roiPct;

      if (s.equity > runningPeak) {
        runningPeak = s.equity;
      } else {
        const dd = ((runningPeak - s.equity) / runningPeak) * 100;
        if (dd > maxDrawdownPct) maxDrawdownPct = dd;
      }
    });

    return {
      peakEquity: peakEquity === -Infinity ? initialBalance : peakEquity,
      peakRoi: peakRoi === -Infinity ? 0 : peakRoi,
      lowestEquity: lowestEquity === Infinity ? initialBalance : lowestEquity,
      lowestRoi: lowestRoi === Infinity ? 0 : lowestRoi,
      maxDrawdownPct,
    };
  }, [filteredSnapshots, initialBalance]);

  // Chart Geometry Coordinates
  const chartPoints = useMemo(() => {
    if (filteredSnapshots.length === 0) return null;

    const values = filteredSnapshots.map((s) =>
      metricMode === 'equity' ? s.equity : s.roiPct
    );
    const baselineVal = metricMode === 'equity' ? initialBalance : 0;

    const allValues = [...values, baselineVal];
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);

    const span = rawMax - rawMin || 1;
    // Add 10% padding top and bottom
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.12;
    const range = max - min || 1;

    const width = 1000;
    const height = 260;
    const paddingTop = 25;
    const paddingBottom = 35;
    const paddingLeft = 40;
    const paddingRight = 60;
    const effectiveWidth = width - paddingLeft - paddingRight;
    const effectiveHeight = height - paddingTop - paddingBottom;

    const points = filteredSnapshots.map((s, idx) => {
      const val = metricMode === 'equity' ? s.equity : s.roiPct;
      const x = paddingLeft + (idx / Math.max(1, filteredSnapshots.length - 1)) * effectiveWidth;
      const y = paddingTop + effectiveHeight - ((val - min) / range) * effectiveHeight;
      return { x, y, val, snapshot: s, index: idx };
    });

    // Baseline Y
    const baselineY =
      paddingTop + effectiveHeight - ((baselineVal - min) / range) * effectiveHeight;

    // Peak Y
    const peakVal = metricMode === 'equity' ? stats.peakEquity : stats.peakRoi;
    const peakY = paddingTop + effectiveHeight - ((peakVal - min) / range) * effectiveHeight;

    return {
      points,
      baselineY,
      peakY,
      min,
      max,
      width,
      height,
      paddingLeft,
      paddingRight,
      effectiveWidth,
      effectiveHeight,
    };
  }, [filteredSnapshots, metricMode, initialBalance, stats]);

  // Mouse move handler for interactive tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || !chartPoints || chartPoints.points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * chartPoints.width;

    // Find closest point by X
    let closestIdx = 0;
    let minDistance = Infinity;

    chartPoints.points.forEach((pt, i) => {
      const dist = Math.abs(pt.x - relX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && chartPoints?.points ? chartPoints.points[hoverIndex] : null;

  // Build SVG path strings
  const polylineStr = useMemo(() => {
    if (!chartPoints || chartPoints.points.length === 0) return '';
    return chartPoints.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [chartPoints]);

  const areaPathStr = useMemo(() => {
    if (!chartPoints || chartPoints.points.length === 0) return '';
    const first = chartPoints.points[0];
    const last = chartPoints.points[chartPoints.points.length - 1];
    const bottomY = chartPoints.height - 35;
    return `M ${first.x},${bottomY} L ${chartPoints.points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${last.x},${bottomY} Z`;
  }, [chartPoints]);

  const isProfitable = currentEquity >= initialBalance;

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-emerald-500/30 p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>أداء المحفظة الافتراضية بمرور الوقت (Portfolio Performance & ROI)</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isProfitable
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                ROI: {formatPercentage(currentRoiPct)}
              </span>
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  بيانات تجريبية (DEMO)
                </span>
              )}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            رسم بياني زمني يوضح تطور رأس المال والأرباح التراكمية ونسبة العائد على الاستثمار مع كل صفقة محاكاة
          </p>
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Metric Mode Switch */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('equity')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                metricMode === 'equity'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>القيمة ($ USDT)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('roi')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                metricMode === 'roi'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>العائد (ROI %)</span>
            </button>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['ALL', '30D', '7D', '24H'] as TimeframeFilter[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md font-mono text-[11px] transition-all ${
                  timeframe === tf
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === 'ALL' ? 'الكل' : tf === '30D' ? '30 يوم' : tf === '7D' ? '7 أيام' : '24 ساعة'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block font-medium">رأس المال المبدئي</span>
          <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
            ${initialBalance.toLocaleString()} USDT
          </div>
          <span className="text-[9px] text-slate-500">نقطة ارتكاز ROI (0.0%)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block font-medium">القيمة الحالية للمحفظة</span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 flex items-center gap-1 ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            <span>${currentEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            {isProfitable ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          </div>
          <span className="text-[9px] text-slate-500">
            {isProfitable ? '+' : ''}${(currentEquity - initialBalance).toFixed(2)} USDT
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block font-medium">نسبة العائد التراكمي (ROI)</span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              currentRoiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(currentRoiPct)}
          </div>
          <span className="text-[9px] text-slate-500">من إجمالي رأس المال التجريبي</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block font-medium">أعلى قمة تاريخية (Peak)</span>
          <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
            ${stats.peakEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-slate-500">
            أعلى ROI: {formatPercentage(stats.peakRoi)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 block font-medium">أقصى هبوط تاريخي (Max DD)</span>
          <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
            -{stats.maxDrawdownPct.toFixed(2)}%
          </div>
          <span className="text-[9px] text-slate-500">أقل نقطة انخفاض من القمة</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full h-64 bg-slate-950/60 rounded-xl border border-slate-900 overflow-hidden select-none"
      >
        {isDemo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
            <div className="text-xl sm:text-2xl font-black text-amber-400/20 tracking-widest rotate-[-10deg] border-2 border-dashed border-amber-400/20 px-6 py-2 rounded-2xl uppercase">
              بيانات تجريبية — DEMO DATA
            </div>
          </div>
        )}
        {chartPoints && chartPoints.points.length > 0 ? (
          <svg
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="40" y1="65" x2="940" y2="65" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
            <line x1="40" y1="130" x2="940" y2="130" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
            <line x1="40" y1="195" x2="940" y2="195" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />

            {/* Baseline ($10,000 / 0.0% ROI) */}
            {chartPoints.baselineY >= 25 && chartPoints.baselineY <= 235 && (
              <g>
                <line
                  x1="40"
                  y1={chartPoints.baselineY}
                  x2="940"
                  y2={chartPoints.baselineY}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x="45"
                  y={chartPoints.baselineY - 6}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {metricMode === 'equity' ? 'نقطة الانطلاق: $10,000 USDT' : 'نقطة الانطلاق: 0.0% ROI'}
                </text>
              </g>
            )}

            {/* Peak High-Water Mark Line */}
            {chartPoints.peakY >= 25 && chartPoints.peakY <= 235 && (
              <g>
                <line
                  x1="40"
                  y1={chartPoints.peakY}
                  x2="940"
                  y2={chartPoints.peakY}
                  stroke="#06b6d4"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                  opacity="0.7"
                />
                <text
                  x="930"
                  y={chartPoints.peakY - 5}
                  textAnchor="end"
                  fill="#22d3ee"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {metricMode === 'equity'
                    ? `أعلى قمة: $${stats.peakEquity.toFixed(0)}`
                    : `أعلى عائد: ${stats.peakRoi.toFixed(1)}%`}
                </text>
              </g>
            )}

            {/* Gradient Fill under Curve */}
            <path
              d={areaPathStr}
              fill={isProfitable ? 'url(#emeraldGradient)' : 'url(#roseGradient)'}
            />

            {/* Main Polyline Curve */}
            <polyline
              fill="none"
              stroke={isProfitable ? '#10b981' : '#f43f5e'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />

            {/* Trade Event Circles */}
            {chartPoints.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 6 : 3}
                fill={hoverIndex === i ? '#38bdf8' : isProfitable ? '#10b981' : '#f43f5e'}
                stroke="#020617"
                strokeWidth="1.5"
                className="transition-all duration-150"
              />
            ))}

            {/* Hover Crosshair & Details */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1="25"
                  x2={activePoint.x}
                  y2="225"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="7"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </g>
            )}
          </svg>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 text-slate-600 mb-2" />
            <span>لا توجد نقاط مسجلة بعد في تاريخ أداء المحفظة الافتراضية.</span>
          </div>
        )}

        {/* Floating Tooltip Card */}
        {activePoint && (
          <div
            style={{
              left: `${Math.min(Math.max(activePoint.x / 10, 15), 85)}%`,
              top: `${Math.min(Math.max(activePoint.y / 2.6, 20), 160)}px`,
              transform: 'translate(-50%, -115%)',
            }}
            className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-xl p-2.5 shadow-2xl text-xs space-y-1 min-w-[210px] animate-fadeIn"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-[10px] font-mono text-slate-400">{activePoint.snapshot.dateStr}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  activePoint.snapshot.roiPct >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                ROI: {formatPercentage(activePoint.snapshot.roiPct)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-slate-400">قيمة المحفظة:</span>
              <span className="font-mono font-bold text-white">
                ${activePoint.snapshot.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">الرصيد المتاح:</span>
              <span className="font-mono text-slate-300">
                ${activePoint.snapshot.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
              </span>
            </div>

            {activePoint.snapshot.realizedPnl !== 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">الربح التراكمي المحقق:</span>
                <span
                  className={`font-mono font-bold ${
                    activePoint.snapshot.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activePoint.snapshot.realizedPnl >= 0 ? '+' : ''}$
                  {activePoint.snapshot.realizedPnl.toFixed(2)} USDT
                </span>
              </div>
            )}

            {activePoint.snapshot.eventNote && (
              <div className="text-[10px] text-amber-300/90 pt-1 border-t border-slate-800/80 leading-tight">
                {activePoint.snapshot.eventNote}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Axis labels footer */}
      {filteredSnapshots.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
          <span>{filteredSnapshots[0]?.dateStr}</span>
          <span>
            {filteredSnapshots[Math.floor(filteredSnapshots.length / 2)]?.dateStr}
          </span>
          <span>
            {filteredSnapshots[filteredSnapshots.length - 1]?.dateStr} (الآن)
          </span>
        </div>
      )}
    </div>
  );
};
