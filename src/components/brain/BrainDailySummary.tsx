import React, { useMemo } from 'react';
import {
  calculateDailySummary,
  BrainDailySummary as IDailySummary,
} from '../../lib/brain/brainStorage';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  ShieldAlert,
  Award,
  Zap,
  CheckCircle2,
  Activity,
  Calendar,
} from 'lucide-react';

interface BrainDailySummaryProps {
  dateStr?: string;
}

export const BrainDailySummary: React.FC<BrainDailySummaryProps> = ({
  dateStr = new Date().toISOString().slice(0, 10),
}) => {
  const summary: IDailySummary = useMemo(() => {
    return calculateDailySummary(dateStr);
  }, [dateStr]);

  const totalDecisions =
    summary.decisionsBreakdown.ENTER_LONG +
    summary.decisionsBreakdown.ENTER_SHORT +
    summary.decisionsBreakdown.EXIT +
    summary.decisionsBreakdown.STAY_OUT;

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* Top Banner with Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>ملخص التداول والتحليل اليومي للعقل المدبر</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {dateStr}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              تقرير موجز يوضح قرارات الذكاء الاصطناعي، أداء الصفقات الورقية، وانضباط طبقة المخاطر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-left font-mono">
            <span className="text-[10px] text-slate-400 block">حصيلة اليوم:</span>
            <span
              className={`text-sm font-extrabold ${
                summary.totalPnlR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.totalPnlR >= 0 ? '+' : ''}
              {summary.totalPnlR.toFixed(2)} R ({summary.totalPnlUsdt >= 0 ? '+' : ''}$
              {summary.totalPnlUsdt.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Analyses */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            الدورات التحليلية
          </span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {summary.totalAnalyses} <span className="text-xs font-normal text-slate-400">دورة</span>
          </div>
          <span className="text-[10px] text-slate-500">تم مسح العملات كل دقيقة</span>
        </div>

        {/* 2. Win Rate */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            نسبة فوز الصفقات
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {summary.tradesCount > 0 ? `${summary.winRatePct}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500">
            {summary.winningTradesCount} رابحة من أصل {summary.tradesCount} منتهية
          </span>
        </div>

        {/* 3. Realized R */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            إجمالي العائد المحقق (R)
          </span>
          <div
            className={`text-xl font-bold font-mono ${
              summary.totalPnlR >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.totalPnlR >= 0 ? '+' : ''}
            {summary.totalPnlR.toFixed(2)} R
          </div>
          <span className="text-[10px] text-slate-500">
            أكبر رابحة: +{summary.biggestWinnerR}R | أكبر خاسرة: {summary.biggestLoserR}R
          </span>
        </div>

        {/* 4. Risk Guard Halts */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            إيقافات حماية المخاطر
          </span>
          <div
            className={`text-xl font-bold font-mono ${
              summary.riskGuardHaltsCount > 0 ? 'text-rose-400' : 'text-slate-100'
            }`}
          >
            {summary.riskGuardHaltsCount}{' '}
            <span className="text-xs font-normal text-slate-400">مرات</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {summary.riskGuardHaltsCount === 0
              ? 'انضباط ممتاز (لا توجد انتهاكات)'
              : 'تم تفعيل الحظر الوقائي'}
          </span>
        </div>
      </div>

      {/* Decisions Breakdown Breakdown Chart / Bars */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-sky-400" />
            توزيع قرارات العقل المدبر اليومية
          </h5>
          <span className="text-[11px] text-slate-400 font-mono">
            {totalDecisions} قرار إجمالي
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
          <div
            style={{
              width: `${
                totalDecisions > 0
                  ? (summary.decisionsBreakdown.ENTER_LONG / totalDecisions) * 100
                  : 0
              }%`,
            }}
            className="bg-emerald-500 transition-all"
            title="دخول شراء"
          />
          <div
            style={{
              width: `${
                totalDecisions > 0
                  ? (summary.decisionsBreakdown.ENTER_SHORT / totalDecisions) * 100
                  : 0
              }%`,
            }}
            className="bg-rose-500 transition-all"
            title="دخول بيع"
          />
          <div
            style={{
              width: `${
                totalDecisions > 0
                  ? (summary.decisionsBreakdown.EXIT / totalDecisions) * 100
                  : 0
              }%`,
            }}
            className="bg-amber-500 transition-all"
            title="إغلاق مركز"
          />
          <div
            style={{
              width: `${
                totalDecisions > 0
                  ? (summary.decisionsBreakdown.STAY_OUT / totalDecisions) * 100
                  : 100
              }%`,
            }}
            className="bg-slate-700 transition-all"
            title="بقاء خارج السوق"
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">شراء (LONG):</span>
              <span className="font-bold font-mono text-emerald-400">
                {summary.decisionsBreakdown.ENTER_LONG}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">بيع (SHORT):</span>
              <span className="font-bold font-mono text-rose-400">
                {summary.decisionsBreakdown.ENTER_SHORT}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">إغلاق (EXIT):</span>
              <span className="font-bold font-mono text-amber-400">
                {summary.decisionsBreakdown.EXIT}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">انتظار (STAY_OUT):</span>
              <span className="font-bold font-mono text-slate-300">
                {summary.decisionsBreakdown.STAY_OUT}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
