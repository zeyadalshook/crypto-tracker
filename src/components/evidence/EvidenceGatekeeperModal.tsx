import React, { useState, useEffect } from 'react';
import {
  StatisticalEvidence,
  StrategyGateScorecard,
  IncubationSession,
} from '../../types/evidence';
import { evaluateStrategyGate } from '../../lib/gate/gatekeeper';
import {
  loadAllIncubationSessions,
  startNewIncubationSession,
} from '../../lib/gate/incubationManager';
import { ConfidenceIntervalBar } from './ConfidenceIntervalBar';
import { BootstrapDistributionChart } from './BootstrapDistributionChart';
import { DegradationAnalysisView } from './DegradationAnalysisView';
import { KellyRiskRecommender } from './KellyRiskRecommender';
import { DecayMonitorWidget } from './DecayMonitorWidget';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BarChart2,
  Shuffle,
  Layers,
  Percent,
  Activity,
  FileCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface EvidenceGatekeeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: StatisticalEvidence | null;
  onApplyDisciplineRisk?: (riskPct: number) => void;
}

export const EvidenceGatekeeperModal: React.FC<EvidenceGatekeeperModalProps> = ({
  isOpen,
  onClose,
  evidence,
  onApplyDisciplineRisk,
}) => {
  const [activeTab, setActiveTab] = useState<
    'scorecard' | 'confidence' | 'bootstrap' | 'degradation' | 'incubation' | 'kelly'
  >('scorecard');

  // Sample size calculator states (Item 7)
  const [calcSigma, setCalcSigma] = useState<number>(1.0);
  const [calcEdge, setCalcEdge] = useState<number>(0.3);

  // Active Incubation Session
  const [incubationSession, setIncubationSession] = useState<IncubationSession | null>(
    null
  );

  useEffect(() => {
    if (!evidence) return;
    const sessions = loadAllIncubationSessions();
    const existing = sessions.find((s) => s.strategyId === evidence.strategyId);
    if (existing) {
      setIncubationSession(existing);
    } else {
      setIncubationSession(null);
    }
  }, [evidence?.strategyId]);

  if (!isOpen || !evidence) return null;

  // Compute scorecard
  const scorecard: StrategyGateScorecard = evaluateStrategyGate(evidence);

  const handleStartIncubation = () => {
    const session = startNewIncubationSession(
      evidence,
      scorecard.status === 'approved' ? 'paper' : 'paper'
    );
    setIncubationSession(session);
    setActiveTab('incubation');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  نظام الأدلة الإحصائية وبوابة اعتماد الاستراتيجية
                </h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${scorecard.statusBadgeColor}`}
                >
                  {scorecard.statusLabelAr}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {evidence.strategyName} | الزوج: <span className="font-mono text-slate-300">{evidence.symbol}</span> | الإطار: <span className="font-mono text-slate-300">{evidence.timeframe}</span> | عدد الصفقات: <span className="font-mono text-slate-300">{evidence.sampleSize}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400">نقاط الاستقرار الإحصائي:</span>
              <span className="text-sm font-bold text-indigo-400 font-mono">
                {evidence.stabilityScore} / 100
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 overflow-x-auto gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'scorecard'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            بطاقة التحقق الإحصائي
          </button>

          <button
            onClick={() => setActiveTab('confidence')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'confidence'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            مجالات الثقة وفرضية E[R]
          </button>

          <button
            onClick={() => setActiveTab('bootstrap')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'bootstrap'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            البوتستراب وحساسية التسلسل
          </button>

          <button
            onClick={() => setActiveTab('degradation')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'degradation'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            التآكل وأطوار السوق
          </button>

          <button
            onClick={() => setActiveTab('incubation')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'incubation'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            الحضانة وتآكل CUSUM
          </button>

          <button
            onClick={() => setActiveTab('kelly')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'kelly'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-4 h-4" />
            حاسبة كيلي للانضباط
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: SCORECARD */}
          {activeTab === 'scorecard' && (
            <div className="space-y-6">
              {/* Verdict Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  scorecard.status === 'approved'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : scorecard.status === 'paper_only'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {scorecard.status === 'approved' && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    )}
                    {scorecard.status === 'paper_only' && (
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    )}
                    {scorecard.status === 'rejected' && (
                      <XCircle className="w-6 h-6 text-rose-400" />
                    )}
                    <h4 className="text-lg font-bold text-slate-100">
                      قرار البوابة: {scorecard.statusLabelAr}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {scorecard.summaryMessageAr}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {scorecard.status !== 'rejected' && !incubationSession && (
                    <button
                      onClick={handleStartIncubation}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      <Activity className="w-4 h-4" /> بدء فترة الحضانة
                    </button>
                  )}
                  {incubationSession && (
                    <button
                      onClick={() => setActiveTab('incubation')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Activity className="w-4 h-4" /> متابعة جلسة الحضانة النشطة
                    </button>
                  )}
                </div>
              </div>

              {/* Criteria List */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200">
                    قائمة معايير الاعتماد الإحصائية (Gatekeeper Checklist)
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {scorecard.criteria.filter((c) => c.passed).length} من أصل {scorecard.criteria.length} معايير مكتملة
                  </span>
                </div>

                <div className="space-y-3">
                  {scorecard.criteria.map((crit) => (
                    <div
                      key={crit.id}
                      className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        crit.passed
                          ? 'bg-slate-950/60 border-slate-800'
                          : crit.isWarning
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {crit.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : crit.isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-200">
                            {crit.titleAr}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (المطلوب: {crit.thresholdAr})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mr-6">
                          {crit.notesAr}
                        </p>
                      </div>

                      <div className="text-left shrink-0 mr-6 md:mr-0">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                          {crit.actualValueStr}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Item 7: Fixed Methodological Note & Sample Size Calculator */}
              <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-5 space-y-4 shadow-lg shadow-indigo-950/20">
                <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3.5">
                  <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-indigo-200 mb-1">
                      ملاحظة إحصائية منهجية ثابتة:
                    </h5>
                    <p className="text-xs text-indigo-100 font-semibold leading-relaxed">
                      "بهذا الحجم من البيانات لا يمكن تأكيد حافة أقل من ≈0.3R للصفقة. غياب 🟢 لا يعني غياب حافة."
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-400" />
                      محسِّب العينة الإحصائية المطلوبة: عدد الصفقات اللازم = (2.5 × σ ÷ الحافة)²
                    </h5>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (معيار t ≥ 2.50 بدلالة 99%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        الانحراف المعياري للصفقات (σ بالـ R):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="3.0"
                        value={calcSigma}
                        onChange={(e) => setCalcSigma(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        الحافة المتوقعة للصفقة (الحافة بالـ R):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        max="1.5"
                        value={calcEdge}
                        onChange={(e) => setCalcEdge(parseFloat(e.target.value) || 0.3)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 text-center">
                      <span className="text-[10px] text-slate-400 block mb-0.5">عدد الصفقات اللازم:</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        {Math.ceil(Math.pow((2.5 * calcSigma) / Math.max(0.01, calcEdge), 2))} صفقة
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item 2: Yearly Performance Breakdown Table (جدول السنوات) */}
              {evidence.yearlyPerformance && evidence.yearlyPerformance.length > 0 && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-sky-400" />
                      جدول أداء السنوات وتراكم الصفقات (Yearly Performance)
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      تراكم {evidence.yearlyPerformance[evidence.yearlyPerformance.length - 1].cumulativeTradesCount} صفقة
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                          <th className="p-2">السنة</th>
                          <th className="p-2">الصفقات</th>
                          <th className="p-2">التراكم</th>
                          <th className="p-2">نسبة الفوز</th>
                          <th className="p-2">E[R]</th>
                          <th className="p-2">عامل الربح (PF)</th>
                          <th className="p-2">إجمالي R</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {evidence.yearlyPerformance.map((y) => (
                          <tr key={y.year} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 font-bold text-slate-200">{y.year}</td>
                            <td className="p-2 text-slate-300">{y.tradesCount}</td>
                            <td className="p-2 text-indigo-400 font-semibold">{y.cumulativeTradesCount}</td>
                            <td className="p-2 text-slate-300">{y.winRate}%</td>
                            <td className={`p-2 font-bold ${y.expectancyR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {y.expectancyR > 0 ? '+' : ''}{y.expectancyR} R
                            </td>
                            <td className="p-2 text-slate-300">{y.profitFactor}</td>
                            <td className={`p-2 font-bold ${y.pnlTotalR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {y.pnlTotalR > 0 ? '+' : ''}{y.pnlTotalR} R
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {scorecard.recommendationsAr.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h5 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    توصيات النظام الاسترشادية:
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {scorecard.recommendationsAr.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONFIDENCE & HYPOTHESIS */}
          {activeTab === 'confidence' && (
            <div className="space-y-6">
              {/* Hypothesis Test Banner */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-semibold text-slate-200">
                      اختبار الفرضية الإحصائية (One-Tailed Student's t-test)
                    </h4>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      evidence.tTest.isSignificant95
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {evidence.tTest.isSignificant95 ? 'دال إحصائياً (p < 0.05)' : 'غير دال إحصائياً'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] text-slate-400">إحصائية t-statistic</div>
                    <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                      {evidence.tTest.tStat}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] text-slate-400">القيمة الاحتمالية p-value</div>
                    <div className="text-lg font-bold text-sky-400 font-mono mt-1">
                      {evidence.tTest.pValue.toFixed(5)}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] text-slate-400">درجات الحرية (df)</div>
                    <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                      {evidence.tTest.degreesOfFreedom}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] text-slate-400">مستوى الثقة</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                      {evidence.tTest.isSignificant99 ? '99% (فائق)' : evidence.tTest.isSignificant95 ? '95%' : '<90%'}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  {evidence.tTest.verdictAr}
                </div>
              </div>

              {/* Confidence Interval Bars */}
              <div className="space-y-4">
                <ConfidenceIntervalBar
                  label="متوسط العائد لكل صفقة E[R] (Expectancy)"
                  metric={evidence.expectancyR}
                  unit=" R"
                  zeroThreshold={0.0}
                  minDisplay={-0.5}
                  maxDisplay={2.5}
                />

                <ConfidenceIntervalBar
                  label="نسبة الصفقات الرابحة (Win Rate - Wilson Score 95% CI)"
                  metric={evidence.winRate}
                  isPercentage={true}
                  zeroThreshold={50}
                  minDisplay={20}
                  maxDisplay={90}
                />

                <ConfidenceIntervalBar
                  label="معامل الربحية الإجمالي (Profit Factor - Log-Normal CI)"
                  metric={evidence.profitFactor}
                  zeroThreshold={1.0}
                  minDisplay={0.5}
                  maxDisplay={4.0}
                />
              </div>

              {/* Ratios Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">نسبة شارب (Sharpe Ratio)</div>
                  <div className="text-xl font-bold text-slate-200 mt-1 font-mono">
                    {evidence.sharpeRatio.point}
                    <span className="text-xs text-slate-400 font-normal mr-2">
                      (سنوي: {evidence.sharpeRatio.annualized})
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">نسبة سورتينو (Sortino Ratio)</div>
                  <div className="text-xl font-bold text-slate-200 mt-1 font-mono">
                    {evidence.sortinoRatio.point}
                    <span className="text-xs text-slate-400 font-normal mr-2">
                      (سنوي: {evidence.sortinoRatio.annualized})
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">أقصى تراجع بوحدات R</div>
                  <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
                    -{evidence.maxDrawdown.r} R
                    <span className="text-xs text-slate-400 font-normal mr-2">
                      ({evidence.maxDrawdown.durationBars} شمعة)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BOOTSTRAP & PERMUTATION */}
          {activeTab === 'bootstrap' && (
            <BootstrapDistributionChart
              bootstrap={evidence.bootstrap}
              permutation={evidence.permutationTest}
            />
          )}

          {/* TAB 4: DEGRADATION & REGIMES */}
          {activeTab === 'degradation' && (
            <DegradationAnalysisView
              degradation={evidence.outOfSampleDegradation}
              regimes={evidence.regimeRobustness}
            />
          )}

          {/* TAB 5: INCUBATION */}
          {activeTab === 'incubation' && (
            <div>
              {incubationSession ? (
                <DecayMonitorWidget
                  session={incubationSession}
                  onSessionUpdated={(updated) => setIncubationSession(updated)}
                />
              ) : (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-300">
                    لا توجد جلسة حضانة نشطة لهذه الاستراتيجية
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    ابدأ فترة حضانة بتتبع الصفقات الورقية للتأكد من عدم حدوث تآكل في الحافة التنافسية.
                  </p>
                  <button
                    onClick={handleStartIncubation}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> بدء فترة حضانة جديدة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: KELLY RISK */}
          {activeTab === 'kelly' && (
            <KellyRiskRecommender
              evidence={evidence}
              onAppliedToDiscipline={(newRisk) => {
                if (onApplyDisciplineRisk) {
                  onApplyDisciplineRisk(newRisk);
                }
              }}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            🔒 <strong className="text-slate-300">مبدأ الانضباط الإحصائي:</strong> النموذج يقدّر هوامش الخطأ ومجالات الثقة ولا يعد بأي نتائج مستقبلية.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
