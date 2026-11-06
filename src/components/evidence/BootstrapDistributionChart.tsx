import React, { useMemo } from 'react';
import { BootstrapResults, PermutationTestResult } from '../../types/evidence';
import { Shuffle, ShieldAlert, TrendingDown, CheckCircle2 } from 'lucide-react';

interface BootstrapDistributionChartProps {
  bootstrap: BootstrapResults;
  permutation: PermutationTestResult;
}

export const BootstrapDistributionChart: React.FC<BootstrapDistributionChartProps> = ({
  bootstrap,
  permutation,
}) => {
  // Generate histogram bins for meanRDistribution
  const histogram = useMemo(() => {
    const dist = bootstrap.meanRDistribution;
    if (!dist || dist.length === 0) return [];

    let min = Math.min(...dist);
    let max = Math.max(...dist);
    if (min === max) {
      min -= 0.5;
      max += 0.5;
    }

    const binsCount = 24;
    const binWidth = (max - min) / binsCount;
    const bins = new Array(binsCount).fill(0).map((_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      midPoint: min + (i + 0.5) * binWidth,
      count: 0,
      isPositive: min + (i + 0.5) * binWidth > 0,
    }));

    for (const val of dist) {
      const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((val - min) / binWidth)));
      bins[idx].count++;
    }

    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    return bins.map((b) => ({
      ...b,
      heightPct: (b.count / maxCount) * 100,
    }));
  }, [bootstrap.meanRDistribution]);

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">احتمالية الربحية P(E[R] &gt; 0)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 flex items-baseline gap-1">
            {bootstrap.probPositiveExpectancy.toFixed(1)}%
            <span className="text-[10px] text-slate-400 font-normal">من 1,500 دورة</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {bootstrap.probPositiveExpectancy >= 95 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline" /> تفوق إحصائي مثبت
              </span>
            ) : (
              <span className="text-amber-400">احتمالية خسارة جزئية واردة</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">أقصى تراجع 95% (CVaR DD)</div>
          <div className="text-xl font-bold text-rose-400 mt-1 flex items-baseline gap-1">
            -{bootstrap.drawdown95thPercentileR} R
            <span className="text-[10px] text-slate-400 font-normal">أسوأ 5%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            متوسط التراجع المتوقع: -{bootstrap.expectedMaxDrawdownR} R
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">احتمالية الإفلاس (Risk of Ruin)</div>
          <div className="text-xl font-bold text-indigo-400 mt-1 flex items-baseline gap-1">
            {bootstrap.riskOfRuinPct.toFixed(2)}%
            <span className="text-[10px] text-slate-400 font-normal">عند هبوط 20R</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {bootstrap.riskOfRuinPct < 1 ? (
              <span className="text-emerald-400">آمن تماماً (&lt;1%)</span>
            ) : (
              <span className="text-rose-400">تجاوز الحد الآمن</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">اختبار حساسية التسلسل (Sequence Sensitivity)</div>
          <div className="text-xl font-bold text-sky-400 mt-1 flex items-baseline gap-1">
            p = {permutation.pValPermutation.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {permutation.isSignificant ? (
              <span className="text-emerald-400">متفوق على الضوضاء (p&lt;0.05)</span>
            ) : (
              <span className="text-amber-400">قريب من التوزيع العشوائي</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Visual Histogram of Bootstrap Means */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-200">
              توزيع تكرارات العائد المتوقع E[R] (Bootstrap Distribution)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {bootstrap.iterations.toLocaleString()} عملية إعادة سحب بالاستبدال (With Replacement)
          </span>
        </div>

        {/* Histogram Bars */}
        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-800 px-2">
          {histogram.map((bin, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-30 pointer-events-none bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-200 shadow-xl whitespace-nowrap">
                العائد: {bin.midPoint.toFixed(2)} R | التكرار: {bin.count}
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  bin.isPositive
                    ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                    : 'bg-rose-500/80 group-hover:bg-rose-400'
                }`}
                style={{ height: `${Math.max(4, bin.heightPct)}%` }}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-2 px-2">
          <span className="text-rose-400">منطقة العائد السلبي (خسارة)</span>
          <span className="text-slate-400">الصفر (0.00 R)</span>
          <span className="text-emerald-400">منطقة العائد الإيجابي (ربح)</span>
        </div>
      </div>

      {/* 3. Loss Streak Probabilities */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-semibold text-slate-200">
            احتمالية سلاسل الخسائر المتتالية المتوقعة (Loss Streak Probabilities)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs text-slate-400">3 خسائر متتالية</div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {bootstrap.probLossStreak3.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${Math.min(100, bootstrap.probLossStreak3)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">طبيعية وشبه مؤكدة الحدوث</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs text-slate-400">5 خسائر متتالية</div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {bootstrap.probLossStreak5.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${Math.min(100, bootstrap.probLossStreak5)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">تفعّل استراحة إجبارية في وحدة الانضباط</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs text-slate-400">7 خسائر متتالية</div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {bootstrap.probLossStreak7.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{ width: `${Math.min(100, bootstrap.probLossStreak7)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">سيناريو نادر يتطلب فحص تآكل النموذج</div>
          </div>
        </div>
      </div>
    </div>
  );
};
