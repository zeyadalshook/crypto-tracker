import React, { useState } from 'react';
import { FullAnalysisReport } from '../../types/pipeline';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  BarChart2,
  Clock,
  Download,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Calendar,
  Check,
} from 'lucide-react';
import { saveDisciplineSettings, getDisciplineSettings } from '../../utils/disciplineStorage';
import { startNewIncubationSession } from '../../lib/gate/incubationManager';
import { calculateStatisticalEvidence } from '../../lib/stats';

interface FullAnalysisReportViewProps {
  report: FullAnalysisReport;
  onClose?: () => void;
  onRerun?: () => void;
  onOpenGateModal?: () => void;
}

export const FullAnalysisReportView: React.FC<FullAnalysisReportViewProps> = ({
  report,
  onClose,
  onRerun,
  onOpenGateModal,
}) => {
  const [appliedRiskSuccess, setAppliedRiskSuccess] = useState(false);
  const [incubationStartedSuccess, setIncubationStartedSuccess] = useState(false);
  const [calcSigma, setCalcSigma] = useState(1.0);
  const [calcEdge, setCalcEdge] = useState(0.3);

  const handleApplyDisciplineRisk = () => {
    if (!report.proposedSetup) return;
    try {
      const settings = getDisciplineSettings();
      settings.maxRiskPerTradePct = report.proposedSetup.recommendedRiskPct;
      saveDisciplineSettings(settings);
      setAppliedRiskSuccess(true);
      setTimeout(() => setAppliedRiskSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartIncubation = () => {
    if (!report.proposedSetup) return;
    try {
      const dummyEvidence = calculateStatisticalEvidence([], {
        strategyName: report.proposedSetup.strategyName,
        symbol: report.symbol,
      });
      startNewIncubationSession(dummyEvidence, 'paper');
      setIncubationStartedSuccess(true);
      setTimeout(() => setIncubationStartedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* 1. Header & Metadata Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                تقرير التحليل الشامل بضغطة واحدة (Full Pipeline Report)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                الزوج: <span className="text-indigo-400 font-bold">{report.symbol}</span> | الإطار: {report.timeframe} | استغرق: {report.totalDurationSeconds} ثانية | بذرة المحاكاة: {report.seed} | التركيبات المختبرة: {report.totalTrialsLogged}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRerun && (
            <button
              onClick={onRerun}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> إعادة التحليل
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> طباعة / تصدير PDF
          </button>
        </div>
      </div>

      {/* 2. Top Executive Summary Box */}
      <div
        className={`p-5 rounded-2xl border ${
          report.verdictType === 'approved_found'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : report.verdictType === 'paper_candidate_only'
            ? 'bg-amber-500/10 border-amber-500/30'
            : report.verdictType === 'exploratory_only'
            ? 'bg-sky-500/10 border-sky-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {report.verdictType === 'approved_found' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : report.verdictType === 'paper_candidate_only' ? (
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          ) : report.verdictType === 'exploratory_only' ? (
            <Info className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-base font-bold text-slate-100">
              خلاصة التحليل التنفيذية:
            </h3>
            <p className="text-sm text-slate-200 mt-1 leading-relaxed">
              {report.executiveSummaryAr}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Proposed Setup Card (if approved or paper candidate) */}
      {report.proposedSetup && (
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h4 className="text-base font-bold text-slate-100">
                الإعداد المعتمد المقترح: {report.proposedSetup.strategyName}
              </h4>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${report.proposedSetup.gateBadgeColor}`}
            >
              {report.proposedSetup.gateStatusLabelAr}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">المعاملات المثالية</span>
              <span className="text-sm font-bold text-slate-200 mt-1 font-mono block">
                TP: +{report.proposedSetup.params.tpPct}% | SL: -{report.proposedSetup.params.slPct}%
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">المخاطرة المقترحة (Half-Kelly)</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 font-mono block">
                {report.proposedSetup.recommendedRiskPct}% لكل صفقة
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">هدف الربح ووقف الخسارة</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {report.proposedSetup.takeProfitDescAr} / {report.proposedSetup.stopLossDescAr}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">مبرر حجم المخاطرة</span>
              <span className="text-[11px] text-slate-300 mt-1 leading-snug block">
                {report.proposedSetup.riskRationaleAr}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleStartIncubation}
              disabled={incubationStartedSuccess}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                incubationStartedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
              }`}
            >
              {incubationStartedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> بدأت فترة الحضانة الورقية بنجاح
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> ابدأ فترة حضانة ورقية بهذا الإعداد
                </>
              )}
            </button>

            <button
              onClick={handleApplyDisciplineRisk}
              disabled={appliedRiskSuccess}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                appliedRiskSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              {appliedRiskSuccess ? (
                <>
                  <Check className="w-4 h-4 inline ml-1" /> تم التطبيق في وحدة الانضباط
                </>
              ) : (
                `تطبيق نسبة المخاطرة (${report.proposedSetup.recommendedRiskPct}%) في الانضباط`
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. Top Candidates Ranking Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h4 className="text-base font-bold text-slate-100">
              جدول أفضل الاستراتيجيات والتركيبات (مرتبة بدرجة الصمود الشاملة)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            تم فرز {report.topCandidates.length} مرشحين نهائيين
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="p-3">الاستراتيجية</th>
                <th className="p-3">المعاملات</th>
                <th className="p-3">درجة الصمود</th>
                <th className="p-3">E[R] التحقق</th>
                <th className="p-3">E[R] العينة المحجوبة</th>
                <th className="p-3">Deflated Sharpe (DSR)</th>
                <th className="p-3">أقصى تراجع</th>
                <th className="p-3 text-center">شارة البوابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {report.topCandidates.map((cand, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-sans font-medium text-slate-200">
                    {cand.strategyName}
                  </td>
                  <td className="p-3 text-slate-400">
                    TP:{cand.params.tpPct}% SL:{cand.params.slPct}%
                  </td>
                  <td className="p-3">
                    <span className="text-indigo-400 font-bold">{cand.robustnessRankScore} / 100</span>
                  </td>
                  <td className="p-3 text-emerald-400">
                    +{cand.validationExpectancyR} R
                  </td>
                  <td className="p-3">
                    {cand.testedOnHoldout !== false ? (
                      <span className={cand.finalHoldoutExpectancyR >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {cand.finalHoldoutExpectancyR >= 0 ? '+' : ''}{cand.finalHoldoutExpectancyR} R
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-sans bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 inline-block">
                        لم تُختبر على المحجوبة
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sky-400">
                    {(cand.deflatedSharpeRatio * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 text-rose-400">
                    -{cand.validationMaxDrawdownPct}%
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold border ${
                        cand.gateStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : cand.gateStatus === 'paper_only'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {cand.gateStatus === 'approved'
                        ? '🟢 معتمدة'
                        : cand.gateStatus === 'paper_only'
                        ? '🟡 تجريبية'
                        : '🔴 مرفوضة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Item 7: Fixed Methodological Note & Sample Size Calculator */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3">
          <div className="flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-200 font-medium leading-relaxed">
              <strong>ملاحظة إحصائية منهجية ثابتة:</strong> بهذا الحجم من البيانات لا يمكن تأكيد حافة أقل من ≈0.3R للصفقة. غياب 🟢 لا يعني غياب حافة.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                محسِّب العينة الإحصائية المطلوبة: عدد الصفقات اللازم = (2.5 × σ ÷ الحافة)²
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                (معيار t ≥ 2.50 بدلالة 99%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  الانحراف المعياري (σ بالـ R):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="3.0"
                  value={calcSigma}
                  onChange={(e) => setCalcSigma(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  الحافة المتوقعة (الحافة بالـ R):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="1.5"
                  value={calcEdge}
                  onChange={(e) => setCalcEdge(parseFloat(e.target.value) || 0.3)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded p-1.5 text-center">
                <span className="text-[10px] text-slate-400 block">الصفقات المطلوبة:</span>
                <span className="text-sm font-black font-mono text-emerald-400">
                  {Math.ceil(Math.pow((2.5 * calcSigma) / Math.max(0.01, calcEdge), 2))} صفقة
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Benchmarks Comparison: Strategy vs Buy & Hold vs DCA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30">
          <span className="text-xs text-indigo-400 font-bold block mb-1">الاستراتيجية المعتمدة</span>
          <span className="text-2xl font-black text-slate-100 font-mono">
            {report.benchmark.strategyReturnPct >= 0 ? '+' : ''}{report.benchmark.strategyReturnPct}%
          </span>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>رأس المال النهائي: ${Math.round(report.benchmark.strategyFinalCapital).toLocaleString()}</div>
            <div>أقصى تراجع: -{report.benchmark.strategyMaxDrawdownPct}%</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-bold block mb-1">الشراء والاحتفاظ (B&H)</span>
          <span className="text-2xl font-black text-sky-400 font-mono">
            {report.benchmark.buyAndHoldReturnPct >= 0 ? '+' : ''}{report.benchmark.buyAndHoldReturnPct}%
          </span>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>أقصى تراجع: -{report.benchmark.buyAndHoldMaxDrawdownPct}%</div>
            <div>معاناة تقلبات السوق الكاملة</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-bold block mb-1">الاستثمار المنتظم (DCA)</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {report.benchmark.dcaReturnPct >= 0 ? '+' : ''}{report.benchmark.dcaReturnPct}%
          </span>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>أقصى تراجع: -{report.benchmark.dcaMaxDrawdownPct}%</div>
            <div>توزيع الشراء على 30 فترة دورية</div>
          </div>
        </div>
      </div>

      {/* 6. Funnel Pruning ("ماذا استبعدنا ولماذا") */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h4 className="text-base font-bold text-slate-100">
            قمع الفرز والاستبعاد الإحصائي ("ماذا استبعدنا ولماذا")
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {report.funnelPruning.map((f, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-bold text-slate-300">مرحلة {f.stageNumber}</span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold">
                  ناجٍ: {f.survivorsCount}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">{f.stageNameAr}</div>
              <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {f.primaryPruneReasonAr}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Automatic Warnings */}
      {report.warningsAr.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            تحذيرات وضوابط يجب أخذها بالحسبان:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 mr-4">
            {report.warningsAr.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. Fixed Legal Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
        ⚖️ <strong>إخلاء مسؤولية قانوني:</strong> {report.legalDisclaimerAr}
      </div>
    </div>
  );
};
