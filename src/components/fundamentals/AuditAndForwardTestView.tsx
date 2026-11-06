import React, { useState } from 'react';
import {
  CorrelationAuditResult,
  computeScoreMarketCapCorrelation,
} from '../../lib/fundamentals/audit/correlationAudit';
import {
  SensitivityAuditReport,
  runSensitivityAnalysis,
} from '../../lib/fundamentals/audit/sensitivityAudit';
import {
  candidateLogManager,
  PreRegisteredCandidate,
} from '../../lib/fundamentals/storage/candidateLog';
import { FundamentalEvaluationReport } from '../../lib/fundamentals/types';
import { RawAssetFundamentalInput } from '../../lib/fundamentals/scoringEngine';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Activity,
  Layers,
  Sparkles,
  Link2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface AuditAndForwardTestViewProps {
  reports: FundamentalEvaluationReport[];
  rawCoins: RawAssetFundamentalInput[];
}

export const AuditAndForwardTestView: React.FC<AuditAndForwardTestViewProps> = ({
  reports,
  rawCoins,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'correlation' | 'sensitivity' | 'hashchain'>('correlation');

  // Compute correlation
  const correlationResult = React.useMemo(() => {
    const pairs = reports.map((r) => {
      const raw = rawCoins.find((c) => c.symbol === r.symbol);
      const cap = raw?.marketCapUsd?.value ?? 0;
      return { report: r, marketCapUsd: cap };
    });
    return computeScoreMarketCapCorrelation(pairs);
  }, [reports, rawCoins]);

  // Compute sensitivity
  const sensitivityResult = React.useMemo(() => {
    return runSensitivityAnalysis(rawCoins);
  }, [rawCoins]);

  // Get Candidate Log
  const candidateLog = candidateLogManager.getLog();

  const handleDownloadLog = () => {
    const jsonStr = candidateLogManager.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundamental-candidates-hashchain-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-5 space-y-4 text-slate-100" dir="rtl">
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-900">
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('correlation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'correlation'
                ? 'bg-slate-800 text-sky-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ارتباط الدرجة بالقيمة السوقية (r)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('sensitivity')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'sensitivity'
                ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تحليل حساسية الأوزان (±5 نقاط)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('hashchain')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'hashchain'
                ? 'bg-slate-800 text-indigo-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            سجل المرشحين المشفر (Hash Chain)
          </button>
        </div>

        {activeSubTab === 'hashchain' && (
          <button
            type="button"
            onClick={handleDownloadLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير السجل JSON</span>
          </button>
        )}
      </div>

      {/* 1. Correlation View */}
      {activeSubTab === 'correlation' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">معامل ارتباط بيرسون (Pearson r)</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                r = {correlationResult.pearsonR}
              </div>
              <span className="text-[10px] text-slate-500">الحد الأقصى المقبول: r ≤ 0.80</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">معامل التفسير (R²)</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {(correlationResult.rSquared * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">نسبة التباين المفسرة بحجم السوق</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">حالة الاستقلالية</span>
              <div
                className={`text-sm font-bold mt-1 ${
                  correlationResult.isOverlyCorrelated ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {correlationResult.isOverlyCorrelated ? 'ارتباط مفرط بالقيمة السوقية' : 'مستقلة وتضيف معلومات بنيوية'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-white block mb-0.5">الحكم الإحصائي:</span>
            <p className="leading-relaxed">{correlationResult.verdictAr}</p>
          </div>
        </div>
      )}

      {/* 2. Sensitivity Analysis View */}
      {activeSubTab === 'sensitivity' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">متوسط ارتباط الرتب (Spearman ρ)</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                ρ = {sensitivityResult.averageSpearmanR}
              </div>
              <span className="text-[10px] text-slate-500">الحد الأدنى لصلابة الترتيب: ≥ 0.85</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">أدنى ارتباط مسجل عند التغيير</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                ρ = {sensitivityResult.minSpearmanR}
              </div>
              <span className="text-[10px] text-slate-500">أسوأ سيناريو لتغير الأوزان</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">صلابة القائمة المختصرة</span>
              <div
                className={`text-sm font-bold mt-1 ${
                  sensitivityResult.isRobust ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {sensitivityResult.isRobust ? 'صلابة عالية لقائمة المرشحين' : 'حساسية مرتفعة للأوزان'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-white block mb-0.5">الخلاصة المعلمية:</span>
            <p className="leading-relaxed">{sensitivityResult.summaryAr}</p>
          </div>
        </div>
      )}

      {/* 3. Hash Chain Pre-Registration Log View */}
      {activeSubTab === 'hashchain' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-indigo-500/30 text-xs text-slate-300 space-y-1">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              <span>سلسلة البصمات المشفرة للمرشحين (Immutable Pre-Registration Hash Chain)</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-400">
              كل عملة تنتقل للقائمة المختصرة تُقفل ببصمة SHA-256 مرتبطة بسابقتها لضمان عدم التعديل بأثر رجعي.
            </p>
          </div>

          <div className="space-y-2">
            {candidateLog.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl border border-slate-900">
                لا توجد عملات مقفلة في سجل المرشحين بعد. يمكنك إضافة العملات المجتازة للمرحلة ب وج.
              </div>
            ) : (
              candidateLog.map((cand) => (
                <div
                  key={cand.entryIndex}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-white">
                      #{cand.entryIndex + 1} {cand.symbol} ({cand.score}/100)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{cand.registeredAt}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 break-all select-all">
                    <span className="text-slate-600">Current Hash: </span>
                    {cand.currentHash}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 break-all select-all">
                    <span className="text-slate-600">Prev Hash: </span>
                    {cand.previousHash}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Forward Tracking Mandatory Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-amber-500/20 text-center text-[11px] text-amber-400/90 leading-relaxed">
            تنبيه الاختبار الأمامي: لا يمكن استخلاص أي نتيجة إحصائية حاسمة قبل مرور 12 شهراً ومتابعة 20 عملة على الأقل مقابل BTC وسلة القيمة السوقية.
          </div>
        </div>
      )}
    </div>
  );
};
