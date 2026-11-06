import React, { useState } from 'react';
import {
  Activity,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  SignalScoreResult,
  SignalWeightsConfig,
} from '../utils/signalScore';
import { SignalScoreBreakdownModal } from './SignalScoreBreakdownModal';

interface SignalScoreCardProps {
  scoreResult: SignalScoreResult;
  symbol: string;
  weights: SignalWeightsConfig;
  onSaveWeights: (weights: SignalWeightsConfig) => void;
  onOpenBacktest?: () => void;
}

export const SignalScoreCard: React.FC<SignalScoreCardProps> = ({
  scoreResult,
  symbol,
  weights,
  onSaveWeights,
  onOpenBacktest,
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Score S ranges from -100 to +100. Normalize to 0 - 180 degrees for arc gauge.
  // -100 is 0 deg (far left red), 0 is 90 deg (top neutral), +100 is 180 deg (far right green)
  const normalizedAngle = ((scoreResult.netScore + 100) / 200) * 180;

  // Arc Gauge Color
  const gaugeColor =
    scoreResult.netScore >= 60
      ? '#10b981' // strong buy emerald
      : scoreResult.netScore >= 20
      ? '#34d399' // buy light emerald
      : scoreResult.netScore <= -60
      ? '#f43f5e' // strong sell rose
      : scoreResult.netScore <= -20
      ? '#fb7185' // sell light rose
      : '#94a3b8'; // neutral slate

  return (
    <div className="card-glow rounded-2xl bg-gradient-to-b from-[#07170e] via-[#05110a] to-slate-950 border border-emerald-500/40 p-4 sm:p-5 shadow-2xl relative overflow-hidden text-slate-100">
      {/* Background ambient glow */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: gaugeColor }}
      />

      <div className="flex flex-col gap-4 relative z-10">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  ملخص الإشارات المئوي (Signal Score Engine)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold">
                  {symbol}/USDT
                </span>
                {/* Confidence Badge */}
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    scoreResult.confidence === 'عالية'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : scoreResult.confidence === 'متوسطة'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  الثقة: {scoreResult.confidence}
                </span>

                {scoreResult.hasSignalConflict && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    إشارات متعارضة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تجميع موضوعي لـ 15+ مؤشراً فنياً داخل 6 مجموعات مستقلة تمنع الانحياز، مع تحييد أثر السوق العرضي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBreakdownOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all hover:border-emerald-500/40"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>كيف حُسبت؟</span>
            </button>

            {onOpenBacktest && (
              <button
                onClick={onOpenBacktest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                title="اختبار ربحية هذه النتيجة تاريخياً"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>اختبار النتيجة</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Grid: The Gauge & The Tri-color Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left: Semi-Circular Arc Gauge (MD: 5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 relative">
            {/* SVG Arc Gauge */}
            <div className="w-48 h-28 relative flex items-end justify-center">
              <svg className="w-48 h-28 overflow-visible" viewBox="0 0 200 115">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="16"
                  strokeLinecap="round"
                />

                {/* Sell Zone Arc (Left red) */}
                <path
                  d="M 20 100 A 80 80 0 0 1 65 35"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="16"
                  strokeDasharray="4 2"
                  opacity="0.3"
                />

                {/* Neutral Zone Arc (Top gray) */}
                <path
                  d="M 68 32 A 80 80 0 0 1 132 32"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="16"
                  strokeDasharray="4 2"
                  opacity="0.25"
                />

                {/* Buy Zone Arc (Right green) */}
                <path
                  d="M 135 35 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="16"
                  strokeDasharray="4 2"
                  opacity="0.3"
                />

                {/* Active Indicator Arc */}
                {(() => {
                  const r = 80;
                  const cx = 100;
                  const cy = 100;
                  const rad = (normalizedAngle * Math.PI) / 180;
                  const nx = cx - r * Math.cos(rad);
                  const ny = cy - r * Math.sin(rad);
                  return (
                    <>
                      {/* Needle line */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={nx}
                        y2={ny}
                        stroke={gaugeColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Pivot center circle */}
                      <circle cx={cx} cy={cy} r="6" fill="#0f172a" stroke={gaugeColor} strokeWidth="3" />
                      <circle cx={nx} cy={ny} r="4.5" fill={gaugeColor} />
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Gauge Score Value */}
            <div className="text-center mt-1">
              <span className="text-[11px] text-slate-400 font-sans block">النتيجة الصافية (S)</span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span
                  className="text-2xl sm:text-3xl font-black tracking-tight"
                  style={{ color: gaugeColor }}
                >
                  {scoreResult.netScore > 0 ? '+' : ''}{scoreResult.netScore}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <span
                className="text-xs font-black font-sans px-3 py-0.5 rounded-full inline-block mt-0.5"
                style={{
                  backgroundColor: `${gaugeColor}20`,
                  color: gaugeColor,
                  border: `1px solid ${gaugeColor}40`,
                }}
              >
                {scoreResult.classification}
              </span>
            </div>
          </div>

          {/* Right: Tri-color Distribution Bar & Multi-Timeframe Matrix (MD: 7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between gap-3">
            {/* 1. Main Consensus Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white text-sm">
                  ميل المؤشرات: <strong style={{ color: gaugeColor }}>{scoreResult.classification} ({scoreResult.netScore > 0 ? scoreResult.buyPercentage : scoreResult.netScore < 0 ? scoreResult.sellPercentage : scoreResult.neutralPercentage}%)</strong>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  شراء {scoreResult.buyPercentage}% | محايد {scoreResult.neutralPercentage}% | بيع {scoreResult.sellPercentage}%
                </span>
              </div>

              {/* Tri-Color Stacked Bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800 shadow-inner">
                {/* Buy segment (Green) */}
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${scoreResult.buyPercentage}%` }}
                  title={`شراء: ${scoreResult.buyPercentage}%`}
                />
                {/* Neutral segment (Gray) */}
                <div
                  className="h-full bg-slate-600 transition-all duration-500"
                  style={{ width: `${scoreResult.neutralPercentage}%` }}
                  title={`محايد: ${scoreResult.neutralPercentage}%`}
                />
                {/* Sell segment (Red) */}
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${scoreResult.sellPercentage}%` }}
                  title={`بيع: ${scoreResult.sellPercentage}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  شراء: {scoreResult.buyPercentage}%
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                  محايد: {scoreResult.neutralPercentage}%
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  بيع: {scoreResult.sellPercentage}%
                </span>
              </div>
            </div>

            {/* 2. Multi-Timeframe Mini Matrix */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <span className="text-[11px] text-slate-400 block font-semibold">
                اتفاق الأطر الزمنية المتعددة (Multi-Timeframe):
              </span>
              <div className="grid grid-cols-5 gap-1.5 font-mono text-center">
                {scoreResult.multiTimeframe.map((tf) => (
                  <div
                    key={tf.timeframe}
                    className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                  >
                    <span className="text-[10px] text-slate-400">{tf.timeframe}</span>
                    <span
                      className={`text-xs font-black font-sans block mt-0.5 ${
                        tf.color === 'emerald'
                          ? 'text-emerald-400'
                          : tf.color === 'rose'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {tf.classification}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {tf.score > 0 ? `+${tf.score}` : tf.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 Drivers Section (شفافية الحساب المباشرة) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Bullish Drivers */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5" />
              أكثر ما دعم الشراء:
            </span>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              {scoreResult.topBullishDrivers.length > 0 ? (
                scoreResult.topBullishDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{driver}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">لا توجد إشارات شراء قوية حالياً.</li>
              )}
            </ul>
          </div>

          {/* Bearish Drivers */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-1">
            <span className="font-bold text-rose-400 flex items-center gap-1.5 text-[11px]">
              <TrendingDown className="w-3.5 h-3.5" />
              أكثر ما عارض الشراء (نقاط الضعف):
            </span>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              {scoreResult.topBearishDrivers.length > 0 ? (
                scoreResult.topBearishDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{driver}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">لا توجد إشارات بيع قوية حالياً.</li>
              )}
            </ul>
          </div>
        </div>

        {/* No-Trade Filter Banner if active */}
        {scoreResult.isNoTradeFilterActive && (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>تنبيه (فلتر لا تتداول):</strong> {scoreResult.noTradeReason || 'السوق في حالة تذبذب عرضي دون اتجاه أو سيولة واضحة، يُفضل الانتظار.'}
            </span>
          </div>
        )}

        {/* Mandatory Educational Disclaimer */}
        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 border-t border-slate-900">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              هذه نسبة اتفاق المؤشرات الفنية وليست احتمال ربح الصفقة. للتثقيف والتحليل الفني فقط وليست توصية مالية.
            </span>
          </div>

          <button
            onClick={() => setIsBreakdownOpen(true)}
            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>تفاصيل الأوزان والمؤشرات</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Breakdown Transparency Modal */}
      {isBreakdownOpen && (
        <SignalScoreBreakdownModal
          isOpen={isBreakdownOpen}
          onClose={() => setIsBreakdownOpen(false)}
          result={scoreResult}
          weights={weights}
          onSaveWeights={onSaveWeights}
        />
      )}
    </div>
  );
};
