import React, { useState } from 'react';
import {
  FundamentalEvaluationReport,
  EvaluatedCriterion,
  ExclusionRuleResult,
  HiddenRiskItem,
} from '../../lib/fundamentals/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  Clock,
  Info,
} from 'lucide-react';

interface AssetReportCardProps {
  report: FundamentalEvaluationReport;
  onOpenManualChecklist?: () => void;
  hasCompletedChecklist?: boolean;
}

export const AssetReportCard: React.FC<AssetReportCardProps> = ({
  report,
  onOpenManualChecklist,
  hasCompletedChecklist,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (catId: string) => {
    setExpandedCategory((prev) => (prev === catId ? null : catId));
  };

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-6 space-y-6 text-slate-100" dir="rtl">
      {/* Top Banner: Asset, Verdict, Score & Coverage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-white font-mono">{report.symbol}</h3>
            <span className="text-xs text-slate-400 font-medium">({report.coinName})</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              {report.sector}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>تاريخ التقييم: {report.evaluationDateStr}</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-slate-500">
              بروتوكول v{report.protocolVersion} ({report.protocolHash.slice(0, 8)}...)
            </span>
          </div>
        </div>

        {/* Final Verdict Badge & Score Display */}
        <div className="flex items-center gap-4">
          <div className="text-left">
            <div className="text-2xl font-black font-mono text-white">
              {report.finalScore}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              تغطية البيانات: {report.coveragePct}%
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-xs ${
              report.hasPassed
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : report.isOutOfScope
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            {report.hasPassed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>اجتاز معايير الجودة 🟢</span>
              </>
            ) : report.isOutOfScope ? (
              <>
                <Info className="w-4 h-4 text-slate-400" />
                <span>خارج نطاق البروتوكول ⚪</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>لم يجتز 🔴</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Out of scope notice if applicable */}
      {report.isOutOfScope && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 shrink-0" />
            <span>تنبيه نطاق التقييم:</span>
          </div>
          <p className="leading-relaxed">{report.outOfScopeReasonAr}</p>
        </div>
      )}

      {/* Exclusions Block (قواعد الاستبعاد) */}
      {report.exclusions.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>فحص قواعد الاستبعاد الصارمة (Exclusion Rules)</span>
            </span>
            <span>{report.hasAnyExclusion ? 'تم تفعيل استبعاد ⛔' : 'لا استبعاد مفعّل ✅'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {report.exclusions.map((ex) => (
              <div
                key={ex.ruleId}
                className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                  ex.isTriggered
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div>
                  <div className="font-semibold">{ex.nameAr}</div>
                  {ex.reasonAr && <div className="text-[10px] text-rose-400 mt-0.5">{ex.reasonAr}</div>}
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                    ex.isTriggered ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ex.valueStr}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counts Summary Bar: Compliant, Partial, Non-compliant, Insufficient */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">معايير متوافقة (Pass)</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {report.compliantCount} / {report.totalCriteriaCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">معايير جزئية (Partial)</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {report.partialCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">معايير فاشلة (Fail)</span>
          <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            {report.nonCompliantCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">بيانات غير كافية (N/A)</span>
          <div className="text-lg font-bold font-mono text-slate-400 mt-0.5">
            {report.insufficientCount}
          </div>
        </div>
      </div>

      {/* Top 3 Strengths & Top 3 Weaknesses (Computed Deterministically) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 space-y-2">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>أبرز 3 نقاط قوة (حتمية الحساب)</span>
          </div>
          <div className="space-y-1.5">
            {report.topStrengths.map((s, idx) => (
              <div key={s.id} className="text-xs flex items-start gap-2">
                <span className="font-mono text-emerald-500 font-bold">{idx + 1}.</span>
                <div>
                  <div className="font-medium text-slate-200">{s.nameAr}</div>
                  <div className="text-[11px] text-slate-400">{s.notesAr}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-500/20 space-y-2">
          <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <XCircle className="w-4 h-4" />
            <span>أبرز 3 نقاط ضعف / تحديات (حتمية الحساب)</span>
          </div>
          <div className="space-y-1.5">
            {report.topWeaknesses.map((w, idx) => (
              <div key={w.id} className="text-xs flex items-start gap-2">
                <span className="font-mono text-rose-500 font-bold">{idx + 1}.</span>
                <div>
                  <div className="font-medium text-slate-200">{w.nameAr}</div>
                  <div className="text-[11px] text-slate-400">{w.notesAr}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Risks Block (المخاطر الخفية) */}
      {report.hiddenRisks.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/30 space-y-2">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>المخاطر البنيوية الخفية (Hidden Risks)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {report.hiddenRisks.map((risk, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{risk.titleAr}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      risk.severity === 'high'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{risk.descriptionAr}</p>
                <div className="text-[10px] font-mono text-slate-500">الدليل: {risk.evidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown & Detailed Criteria Table */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>تفصيل فئات البروتوكول وجدول المعايير الشامل (6 فئات)</span>
          <span className="text-[11px] text-slate-500 font-normal">اضغط على أي فئة لمعاينة معاييرها ومصادرها</span>
        </div>

        <div className="space-y-2">
          {report.categoryScores.map((cat) => {
            const isExpanded = expandedCategory === cat.category;
            return (
              <div
                key={cat.category}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{cat.titleAr}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({cat.criteria.length} معايير)
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left font-mono">
                      <span className="font-bold text-emerald-400">{cat.earnedPoints}</span>
                      <span className="text-slate-500"> / {cat.maxPoints} نقطة</span>
                      <span className="text-[10px] text-slate-500 ml-2">(تغطية: {cat.coveragePct}%)</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="text-[11px] text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="pb-2 font-medium">المعيار</th>
                          <th className="pb-2 font-medium">النتيجة</th>
                          <th className="pb-2 font-medium">القيمة الفعلية</th>
                          <th className="pb-2 font-medium">الحد المطلوب</th>
                          <th className="pb-2 font-medium">المصدر وتاريخ الجلب</th>
                          <th className="pb-2 font-medium">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {cat.criteria.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-900/30">
                            <td className="py-2.5 pl-2 font-medium text-slate-200">
                              <div>{c.nameAr}</div>
                              <span className="text-[10px] font-mono text-slate-500">({c.weight.toFixed(1)} نقطة)</span>
                            </td>

                            <td className="py-2.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  c.result === 'pass'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : c.result === 'partial'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : c.result === 'fail'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {c.result === 'pass'
                                  ? 'نجاح'
                                  : c.result === 'partial'
                                  ? 'جزئي'
                                  : c.result === 'fail'
                                  ? 'فشل'
                                  : 'غير كافٍ'}
                              </span>
                            </td>

                            <td className="py-2.5 font-mono text-slate-300">
                              {c.actualValueStr}
                              {c.metric?.hasDiscrepancy && (
                                <div className="text-[10px] text-amber-400 mt-0.5">
                                  ⚠️ تعارض مصادر ({c.metric.secondarySource?.sourceName}: {c.metric.secondaryValue})
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 font-mono text-[11px] text-slate-400">
                              {c.thresholdStr}
                            </td>

                            <td className="py-2.5 text-[11px] text-slate-400">
                              {c.source ? (
                                <div className="space-y-0.5">
                                  <a
                                    href={c.source.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                                  >
                                    <span>{c.source.sourceName}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                  <span className="text-[9px] text-slate-500 block font-mono">
                                    {c.source.fetchedAt.split('T')[0]}
                                    {c.source.isStale && (
                                      <span className="text-amber-400 ml-1">(قديمة)</span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="py-2.5 text-[11px] text-slate-400 max-w-xs">
                              {c.notesAr}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage C Manual Checklist Trigger Button if needed */}
      {onOpenManualChecklist && (
        <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30">
          <div>
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>المرحلة ج: المراجعة اليدوية الإلزامية (Mandatory Manual Audit)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {hasCompletedChecklist
                ? 'تم استكمال قائمة التحقق والتوقيع عليها بنجاح.'
                : 'يُشترط تدقيق الأرقام الخمسة الأساسية وجدول الفك والحوكمة قبل الانتقال للبحث الفني.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenManualChecklist}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              hasCompletedChecklist
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {hasCompletedChecklist ? 'مراجعة القائمة المكتملة' : 'بدء التدقيق اليدوي'}
          </button>
        </div>
      )}

      {/* Mandatory Disclaimer Fixed Footer */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-amber-300/90 font-medium leading-relaxed">
        {report.mandatoryDisclaimerAr}
      </div>
    </div>
  );
};
