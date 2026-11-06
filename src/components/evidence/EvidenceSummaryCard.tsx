import React from 'react';
import { StatisticalEvidence } from '../../types/evidence';
import { evaluateStrategyGate } from '../../lib/gate/gatekeeper';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

interface EvidenceSummaryCardProps {
  evidence: StatisticalEvidence;
  onOpenGatekeeperModal: () => void;
}

export const EvidenceSummaryCard: React.FC<EvidenceSummaryCardProps> = ({
  evidence,
  onOpenGatekeeperModal,
}) => {
  const scorecard = evaluateStrategyGate(evidence);

  return (
    <div
      onClick={onOpenGatekeeperModal}
      className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-950/20 group relative overflow-hidden"
      dir="rtl"
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              الأدلة الإحصائية وبوابة اعتماد الاستراتيجية
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${scorecard.statusBadgeColor}`}
              >
                {scorecard.statusLabelAr}
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium group-hover:text-indigo-300">
          <span>عرض البطاقة الكاملة</span>
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </div>
      </div>

      {/* Grid of Key Statistical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
        {/* Metric 1: Expectancy */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">العائد المتوقع E[R]</div>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              evidence.expectancyR.point >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {evidence.expectancyR.point >= 0 ? '+' : ''}
            {evidence.expectancyR.point.toFixed(2)} R
          </div>
          <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
            CI: [{evidence.expectancyR.ci95[0]} إلى {evidence.expectancyR.ci95[1]}]
          </div>
        </div>

        {/* Metric 2: Win Rate with Wilson CI */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">نسبة النجاح (Win Rate)</div>
          <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
            {(evidence.winRate.point * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
            95% CI: [{(evidence.winRate.ci95[0] * 100).toFixed(0)}%-{(evidence.winRate.ci95[1] * 100).toFixed(0)}%]
          </div>
        </div>

        {/* Metric 3: p-value */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">الدلالة الإحصائية (p-value)</div>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              evidence.tTest.isSignificant95 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            p = {evidence.tTest.pValue.toFixed(4)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 truncate">
            {evidence.tTest.isSignificant95 ? 'حافة مثبتة (95%)' : 'احتمال صدفة'}
          </div>
        </div>

        {/* Metric 4: Suggested Risk % */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400">المخاطرة المقترحة (Half-Kelly)</div>
          <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
            {evidence.kellySuggestedRiskPct.appliedCapPct.toFixed(2)}%
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 truncate">
            سقف الانضباط المعتمد
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60">
        <span className="truncate">{scorecard.summaryMessageAr}</span>
        <span className="shrink-0 text-slate-400 font-mono">
          {evidence.sampleSize} صفقة | {evidence.bootstrap.probPositiveExpectancy.toFixed(0)}% ربحية البوتستراب
        </span>
      </div>
    </div>
  );
};
