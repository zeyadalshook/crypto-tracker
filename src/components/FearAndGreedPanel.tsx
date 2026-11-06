import React, { useState } from 'react';
import {
  Flame,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { FearAndGreedData } from '../types/crypto';
import { getFearGreedArabicClassification } from '../utils/formatters';

interface FearAndGreedPanelProps {
  data: FearAndGreedData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const FearAndGreedPanel: React.FC<FearAndGreedPanelProps> = ({
  data,
  onRefresh,
  isRefreshing = false,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const value = Math.min(100, Math.max(0, data.value || 50));
  const classificationAr = data.classification_ar || getFearGreedArabicClassification(value).text;
  const classificationEn = data.classification || 'Neutral';

  const needleAngle = (value / 100) * 180 - 90;

  const getTheme = (val: number) => {
    if (val <= 24) {
      return {
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/15',
        glow: 'shadow-[0_0_25px_rgba(244,63,94,0.3)]',
        colorHex: '#f43f5e',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    if (val <= 46) {
      return {
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        bg: 'bg-orange-500/15',
        glow: 'shadow-[0_0_25px_rgba(249,115,22,0.3)]',
        colorHex: '#f97316',
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      };
    }
    if (val <= 54) {
      return {
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/15',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]',
        colorHex: '#f59e0b',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (val <= 75) {
      return {
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/15',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]',
        colorHex: '#10b981',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
    return {
      text: 'text-emerald-300',
      border: 'border-emerald-400/50',
      bg: 'bg-emerald-500/25',
      glow: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]',
      colorHex: '#34d399',
      badgeBg: 'bg-emerald-400/25 text-emerald-200 border-emerald-400/50',
    };
  };

  const currentTheme = getTheme(value);

  const series = data.history?.series || [];
  const sparklinePoints = series.length > 1 ? series.map((s, i) => {
    const x = (i / (series.length - 1)) * 320;
    const y = 80 - ((s.value) / 100) * 70;
    return `${x},${y}`;
  }).join(' ') : '';

  return (
    <div className={`card-glow rounded-2xl p-5 border ${currentTheme.border} relative overflow-hidden flex flex-col gap-5 transition-all duration-300 ${currentTheme.glow}`}>
      <div
        className="absolute top-0 right-0 w-72 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentTheme.colorHex }}
      />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner"
            style={{
              backgroundColor: `${currentTheme.colorHex}20`,
              borderColor: `${currentTheme.colorHex}50`,
              color: currentTheme.colorHex,
            }}
          >
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>مؤشر الخوف والطمع في السوق</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                0 - 100
              </span>
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>المصدر الرسمي: alternative.me</span>
              <span>•</span>
              <span className="text-emerald-400/90 font-mono">تخزين مؤقت (15 دقيقة)</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              title="تحديث مؤشر الخوف والطمع"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث المؤشر</span>
            </button>
          )}

          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="كيف يُقرأ مؤشر الخوف والطمع؟"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Main Gauge + Hero Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-7 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/70 border border-slate-900 relative">
          <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 240 130" className="w-64 h-36">
              <path
                d="M 24 120 A 96 96 0 0 1 56 46"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 60 42 A 96 96 0 0 1 106 25"
                fill="none"
                stroke="#f97316"
                strokeWidth="18"
              />
              <path
                d="M 110 24 A 96 96 0 0 1 130 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="18"
              />
              <path
                d="M 134 25 A 96 96 0 0 1 180 42"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
              />
              <path
                d="M 184 46 A 96 96 0 0 1 216 120"
                fill="none"
                stroke="#34d399"
                strokeWidth="18"
                strokeLinecap="round"
              />

              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: '120px 120px',
                  transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <line
                  x1="120"
                  y1="120"
                  x2="120"
                  y2="34"
                  stroke={currentTheme.colorHex}
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 4px rgba(0,0,0,0.8))"
                />
                <circle cx="120" cy="120" r="10" fill={currentTheme.colorHex} />
                <circle cx="120" cy="120" r="4" fill="#050b08" />
              </g>
            </svg>

            <div className="absolute bottom-0 right-4 text-[10px] text-rose-400 font-bold">
              0 خوف شديد
            </div>
            <div className="absolute bottom-0 left-4 text-[10px] text-emerald-400 font-bold">
              100 طمع شديد
            </div>
          </div>

          <div className="flex items-center justify-between w-full max-w-xs text-[10px] text-slate-400 mt-2 px-2">
            <span className="text-rose-400">0-24 خوف شديد</span>
            <span className="text-orange-400">25-46 خوف</span>
            <span className="text-amber-400">47-54 حياد</span>
            <span className="text-emerald-400">55-75 طمع</span>
            <span className="text-emerald-300">76-100 طمع شديد</span>
          </div>
        </div>

        <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-right gap-2">
          <span className="text-xs text-slate-400 font-medium">القراءة الحالية للسوق</span>

          <div className="flex items-baseline gap-3">
            <span
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${currentTheme.text}`}
              style={{ textShadow: `0 0 25px ${currentTheme.colorHex}60` }}
            >
              {value}
            </span>
            <span className="text-base text-slate-500 font-mono font-bold">/ 100</span>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm sm:text-base font-extrabold shadow-sm ${currentTheme.badgeBg}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: currentTheme.colorHex }}
            />
            <span>{classificationAr}</span>
            <span className="text-xs opacity-75 font-mono">({classificationEn})</span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {value <= 46
              ? 'يسود القلق والتحفظ بين المتداولين، مما يضغط على الأسعار ويقلل التداول الاندفاعي.'
              : value >= 55
              ? 'تسيطر المعنويات الإيجابية والرغبة في الشراء وجني المكاسب على أوساط السوق.'
              : 'حالة توازن واستقرار نسبي بين ضغوط البيع والطلب.'}
          </p>
        </div>
      </div>

      {/* Historical Sentiment Comparison */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">اليوم الحالي</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl font-black font-mono ${currentTheme.text}`}>{value}</span>
            <span className="text-xs text-slate-300 font-bold">{classificationAr}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">قراءة حية</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">يوم أمس</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black font-mono text-white">
              {data.history?.yesterday?.value ?? '—'}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {data.history?.yesterday?.classification_ar ?? '—'}
            </span>
          </div>
          {data.history?.yesterday && (
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
              {value > data.history.yesterday.value ? (
                <span className="text-emerald-400 flex items-center">
                  <TrendingUp className="w-3 h-3 ml-0.5" /> +{value - data.history.yesterday.value}
                </span>
              ) : value < data.history.yesterday.value ? (
                <span className="text-rose-400 flex items-center">
                  <TrendingDown className="w-3 h-3 ml-0.5" /> -{data.history.yesterday.value - value}
                </span>
              ) : (
                <span className="text-slate-400 flex items-center">
                  <Minus className="w-3 h-3 ml-0.5" /> لا تغير
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">الأسبوع الماضي</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black font-mono text-white">
              {data.history?.last_week?.value ?? '—'}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {data.history?.last_week?.classification_ar ?? '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">متوسط 7 أيام</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">الشهر الماضي</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black font-mono text-white">
              {data.history?.last_month?.value ?? '—'}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {data.history?.last_month?.classification_ar ?? '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">متوسط 30 يوماً</span>
        </div>
      </div>

      {/* 30-Day Trend Sparkline */}
      {series.length > 5 && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">مسار المؤشر خلال آخر 30 يوماً</span>
            <span className="font-mono text-[11px] text-emerald-400">
              أدنى: {Math.min(...series.map((s) => s.value))} | أعلى: {Math.max(...series.map((s) => s.value))}
            </span>
          </div>

          <div className="w-full h-16 pt-1 flex items-center justify-center">
            <svg viewBox="0 0 320 80" className="w-full h-16 overflow-visible">
              <line x1="0" y1="45" x2="320" y2="45" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
              <polyline
                fill="none"
                stroke={currentTheme.colorHex}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
              {series.length > 0 && (
                <circle
                  cx="320"
                  cy={80 - (value / 100) * 70}
                  r="4"
                  fill={currentTheme.colorHex}
                  filter="drop-shadow(0 0 6px currentColor)"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Educational Explanation Box */}
      {showExplanation && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-emerald-400 font-bold pb-1 border-b border-emerald-900/50">
            <ShieldCheck className="w-4 h-4" />
            <span>سيكولوجيا الأسواق وكيفية قراءة المؤشر:</span>
          </div>
          <p>
            • <strong>الخوف الشديد (0 - 24):</strong> يعكس ذعر المستثمرين وقلقهم المفرط. تاريخياً، غالباً ما
            يتزامن الخوف الشديد مع وصول العملات لمستويات تشبع بيعي، مما قد يشكل فرص شراء وتجميع للمستثمرين
            طويلي الأجل.
          </p>
          <p>
            • <strong>الطمع الشديد (76 - 100):</strong> يعكس إفراط المتداولين في الشراء والتفاؤل غير
            المحسوب (FOMO)، مما يجعل السوق عرضة لتصحيحات هابطة وجني أرباح مفاجئ.
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            * يتم تحديث المؤشر يومياً من alternative.me، ويحتفظ التطبيق بنسخة مؤقتة (Cache) مدتها 15 دقيقة
            لتسريع التصفح وتجنب استهلاك معدل الطلبات.
          </p>
        </div>
      )}
    </div>
  );
};
