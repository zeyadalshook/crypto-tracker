import React from 'react';
import {
  Gauge,
  TrendingDown,
  TrendingUp,
  Activity,
  Flame,
  Zap,
  Percent,
  Compass,
} from 'lucide-react';
import { TechnicalAnalysisResult } from '../types/crypto';
import { formatNumberCompact } from '../utils/formatters';

interface VolumeAndMomentumProps {
  analysis: TechnicalAnalysisResult;
}

export const VolumeAndMomentum: React.FC<VolumeAndMomentumProps> = ({ analysis }) => {
  const { momentumScore, volumeTrend, monthlyVolumes, rsi14, macd, adx14, annualizedVolatility } =
    analysis;

  const maxVolume = Math.max(...monthlyVolumes.map((m) => m.volume), 1);
  const scoreClamped = Math.min(100, Math.max(0, momentumScore));
  const angle = (scoreClamped / 100) * 180 - 90;

  const gaugeLabel =
    momentumScore >= 80
      ? 'شراء قوي'
      : momentumScore >= 60
      ? 'شراء'
      : momentumScore >= 40
      ? 'محايد'
      : momentumScore >= 20
      ? 'بيع'
      : 'بيع قوي';

  const gaugeColor =
    momentumScore >= 60
      ? '#10b981'
      : momentumScore >= 40
      ? '#f59e0b'
      : '#f43f5e';

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            الحجم والزخم الفني
          </h3>
        </div>

        {/* Volume Trend Badge */}
        {volumeTrend.isDeclining ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-pulse">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>الحجم في تراجع ({volumeTrend.currentVsAvgPercent}%)</span>
          </div>
        ) : volumeTrend.isSurging ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ارتفاع الحجم (+{volumeTrend.currentVsAvgPercent}%)</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            حجم التداول ضمن المتوسط الطبيعي
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        {/* Left: Monthly Volume Bars (past 6-8 months) */}
        <div>
          <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center justify-between">
            <span>أحجام التداول الشهرية (آخر 6-8 أشهر)</span>
            <span className="text-[11px] text-slate-400">
              الشهر الحالي <span className="text-emerald-400 font-bold">بالأخضر</span>
            </span>
          </div>

          <div className="flex items-end gap-2 h-36 pt-4 px-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            {monthlyVolumes.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.volume / maxVolume) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-950 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap mb-1">
                    ${formatNumberCompact(item.volume)}
                  </div>

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      item.isCurrentMonth
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-gradient-to-t from-orange-700 to-orange-400 opacity-75 group-hover:opacity-100'
                    }`}
                  />

                  <span className="text-[10px] text-slate-400 mt-1.5 font-medium truncate w-full text-center">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Circular SVG Needle Gauge */}
        <div className="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
          <div className="text-xs font-semibold text-slate-300 mb-1">
            مقياس الزخم الفني الموزون (0 - 100)
          </div>

          <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-48 h-28">
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1e293b"
                strokeWidth="16"
                strokeLinecap="round"
              />

              <path
                d="M 20 100 A 80 80 0 0 1 65 35"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="16"
                strokeDasharray="4 2"
              />

              <path
                d="M 65 35 A 80 80 0 0 1 135 35"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeDasharray="4 2"
              />

              <path
                d="M 135 35 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray="4 2"
              />

              <g
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '100px 100px',
                  transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke={gaugeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="8" fill={gaugeColor} />
                <circle cx="100" cy="100" r="3" fill="#050b08" />
              </g>
            </svg>

            <div className="absolute bottom-0 text-center">
              <span className="text-xl font-black text-white font-mono">{momentumScore}</span>
              <span className="text-xs text-slate-400 font-mono">/100</span>
            </div>
          </div>

          <div
            className="text-sm font-black mt-1 px-3 py-0.5 rounded-full border shadow-sm"
            style={{
              color: gaugeColor,
              borderColor: `${gaugeColor}40`,
              backgroundColor: `${gaugeColor}15`,
            }}
          >
            {gaugeLabel}
          </div>
        </div>
      </div>

      {/* 4 Key Numerical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">مؤشر RSI (14)</div>
          <div
            className={`text-lg font-black font-mono mt-0.5 ${
              rsi14 >= 70 ? 'text-rose-400' : rsi14 <= 30 ? 'text-emerald-400' : 'text-slate-100'
            }`}
          >
            {rsi14}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {rsi14 >= 70 ? 'تشبع شراء' : rsi14 <= 30 ? 'تشبع بيع' : 'منطقة متوازنة'}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">MACD (12, 26, 9)</div>
          <div
            className={`text-lg font-black font-mono mt-0.5 ${
              macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {macd.histogram >= 0 ? '+' : ''}
            {macd.histogram.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            خط الإشارة: {macd.signal.toFixed(4)}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">مؤشر ADX (قوة الاتجاه)</div>
          <div
            className={`text-lg font-black font-mono mt-0.5 ${
              adx14 >= 25 ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {adx14}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {adx14 >= 25 ? 'اتجاه قوي ونشط' : 'اتجاه ضعيف / عرضي'}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">التقلب السنوي (Volatility)</div>
          <div
            className={`text-lg font-black font-mono mt-0.5 ${
              annualizedVolatility >= 60 ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            {annualizedVolatility}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {annualizedVolatility >= 60 ? 'مخاطرة وتقلبات حادة' : 'تقلبات معتدلة'}
          </div>
        </div>
      </div>
    </div>
  );
};
