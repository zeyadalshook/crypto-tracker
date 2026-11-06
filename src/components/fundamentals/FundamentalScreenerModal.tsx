import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  SlidersHorizontal,
  FileText,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Lock,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Activity,
  BarChart2,
} from 'lucide-react';
import { RawAssetFundamentalInput, evaluateAssetFundamentals } from '../../lib/fundamentals/scoringEngine';
import { screenerDataService } from '../../lib/fundamentals/dataSources/screenerDataService';
import { runStageAFastScreening, StageACandidate } from '../../lib/fundamentals/funnel/stageA';
import { runStageBFullEvaluation } from '../../lib/fundamentals/funnel/stageB';
import {
  StageCChecklist,
  createDefaultChecklist,
  canProgressToStageD,
} from '../../lib/fundamentals/funnel/stageC';
import { buildStageDTechnicalContext } from '../../lib/fundamentals/funnel/stageD';
import { candidateLogManager } from '../../lib/fundamentals/storage/candidateLog';
import { snapshotStore } from '../../lib/fundamentals/storage/snapshotStore';
import { AssetReportCard } from './AssetReportCard';
import { ManualChecklistModal } from './ManualChecklistModal';
import { TechnicalContextCard } from './TechnicalContextCard';
import { AuditAndForwardTestView } from './AuditAndForwardTestView';
import { FundamentalEvaluationReport } from '../../lib/fundamentals/types';

interface FundamentalScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol?: string;
}

type MainTab = 'funnel' | 'report' | 'audit';
type FunnelStage = 'stageA' | 'stageB' | 'stageC' | 'stageD';

export const FundamentalScreenerModal: React.FC<FundamentalScreenerModalProps> = ({
  isOpen,
  onClose,
  currentSymbol = 'UNI',
}) => {
  if (!isOpen) return null;

  // Feature Flag State (Default disabled in background / toggleable by user)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ctr_feature_fundamental_screener') === 'true';
    } catch {
      return false;
    }
  });

  const toggleFeatureFlag = (val: boolean) => {
    setIsEnabled(val);
    try {
      localStorage.setItem('ctr_feature_fundamental_screener', val ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  const [mainTab, setMainTab] = useState<MainTab>('funnel');
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('stageA');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(currentSymbol);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data State
  const [universe, setUniverse] = useState<RawAssetFundamentalInput[]>([]);
  const [stageACandidates, setStageACandidates] = useState<StageACandidate[]>([]);
  const [stageBReports, setStageBReports] = useState<FundamentalEvaluationReport[]>([]);
  const [shortlist, setShortlist] = useState<FundamentalEvaluationReport[]>([]);
  const [stageCChecklists, setStageCChecklists] = useState<Map<string, StageCChecklist>>(new Map());

  // Active Manual Checklist Modal
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Load Universe and Run Stage A & B
  useEffect(() => {
    screenerDataService.getUniverseData().then((res) => {
      setUniverse(res.coins);

      // Run Stage A
      const resA = runStageAFastScreening(res.coins);
      setStageACandidates(resA.selectedTopCandidates);

      // Run Stage B
      const resB = runStageBFullEvaluation(resA.selectedTopCandidates);
      setStageBReports(resB.allEvaluations);
      setShortlist(resB.shortlist);

      // Auto-register top shortlist candidates to Hash Chain if not yet registered
      resB.shortlist.forEach((c) => {
        const existing = candidateLogManager.getLog().find((l) => l.symbol === c.symbol);
        if (!existing) {
          candidateLogManager.addCandidate(c);
        }
        snapshotStore.saveSnapshot(c);
      });
    });
  }, []);

  // Selected coin's evaluation report
  const selectedReport = useMemo(() => {
    const coin = universe.find((c) => c.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || universe[0];
    if (!coin) return null;
    return evaluateAssetFundamentals(coin);
  }, [universe, selectedSymbol]);

  // Current checklist for selected coin
  const currentChecklist = useMemo(() => {
    return stageCChecklists.get(selectedSymbol) || createDefaultChecklist(selectedSymbol.toLowerCase(), selectedSymbol);
  }, [stageCChecklists, selectedSymbol]);

  const hasPassedChecklist = canProgressToStageD(currentChecklist);

  // Stage D technical context for selected coin
  const technicalContext = useMemo(() => {
    return buildStageDTechnicalContext({
      symbol: selectedSymbol,
      historyYears: 5.5,
      high24h: 8.45,
      low24h: 7.82,
      closePrice: 8.12,
      hasStatisticalGateApproval: true,
      gateStatus: 'approved',
    });
  }, [selectedSymbol]);

  const handleSaveChecklist = (updated: StageCChecklist) => {
    setStageCChecklists((prev) => {
      const next = new Map(prev);
      next.set(updated.symbol, updated);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="card-glow bg-[#030906] border border-emerald-500/40 rounded-2xl w-full max-w-6xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">تقييم الأساسيات (Fundamental Screener)</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  محور بحثي وصفي معزول
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                قمع فرز واختيار بروتوكولي حتمي مبني على التوكنومكس، الإيرادات الحقيقية، الأمان والنشاط التطويري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Feature Flag Switch */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">ميزة تقييم الأساسيات:</span>
              <button
                type="button"
                onClick={() => toggleFeatureFlag(!isEnabled)}
                className={`px-2 py-0.5 rounded font-bold text-[10px] transition-colors ${
                  isEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isEnabled ? 'مفعلة (Enabled)' : 'معطلة (Disabled)'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Flag Notice if Disabled */}
        {!isEnabled && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                تنبيه العزل: وحدة تقييم الأساسيات معطلة افتراضياً وفق القاعدة 0. يمكنك تفعيلها عبر الزر أعلاه لمعاينة نتائج القمع والأبحاث.
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleFeatureFlag(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0 hover:bg-amber-400 text-[11px]"
            >
              تفعيل الوحدة الآن
            </button>
          </div>
        )}

        {/* Main Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-900/80 border border-slate-800 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMainTab('funnel')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              mainTab === 'funnel'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            قمع الاختيار والفلترة (4 مراحل)
          </button>
          <button
            type="button"
            onClick={() => setMainTab('report')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              mainTab === 'report'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تقرير العملة والمعايير التفصيلي ({selectedSymbol})
          </button>
          <button
            type="button"
            onClick={() => setMainTab('audit')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              mainTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            التدقيق الإحصائي والاختبار الأمامي
          </button>
        </div>

        {/* TAB 1: FUNNEL VIEW */}
        {mainTab === 'funnel' && (
          <div className="space-y-4">
            {/* Funnel Stage Navigator Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'stageA',
                  title: 'المرحلة أ: الفرز السريع',
                  desc: '300 عملة ➔ 20-30 مرشحاً',
                  count: stageACandidates.length,
                },
                {
                  id: 'stageB',
                  title: 'المرحلة ب: التقييم الكامل',
                  desc: 'تطبيق البروتوكول ➔ ≤ 5 مرشحين',
                  count: shortlist.length,
                },
                {
                  id: 'stageC',
                  title: 'المرحلة ج: التدقيق البشري',
                  desc: 'قائمة تحقق إلزامية 5 بنود',
                  count: hasPassedChecklist ? 'مكتمل ✅' : 'قيد الانتظار ⏳',
                },
                {
                  id: 'stageD',
                  title: 'المرحلة د: البحث الفني',
                  desc: 'مناطق ارتكاز Pivot دون توقع',
                  count: 'بحث فقط 📊',
                },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFunnelStage(st.id as FunnelStage)}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    funnelStage === st.id
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{st.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{st.desc}</div>
                  <div className="text-[11px] font-mono font-bold text-emerald-400 mt-1">{st.count}</div>
                </button>
              ))}
            </div>

            {/* STAGE A CONTENT */}
            {funnelStage === 'stageA' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900">
                  <span className="font-bold text-white">
                    المرشحون المختارون من المرحلة أ (أعلى {stageACandidates.length} عملة مستوفية للشروط الصارمة)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    شروط: سيولة ≥ 1M$ · عمر ≥ 24 شهراً · بروتوكول رسوم
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {stageACandidates.map((cand) => (
                    <div
                      key={cand.coin.symbol}
                      onClick={() => {
                        setSelectedSymbol(cand.coin.symbol);
                        setMainTab('report');
                      }}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-white">{cand.coin.symbol}</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {cand.initialScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>السيولة: ${(cand.liquidityUsd / 1e6).toFixed(1)}M</span>
                        <span>العمر: {cand.ageMonths} شهراً</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{cand.sector}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE B CONTENT */}
            {funnelStage === 'stageB' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900">
                  <span className="font-bold text-white">
                    القائمة المختصرة للناجين من البروتوكول الكامل (Stage B Shortlist ≤ 5 عملات)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    معيار الاجتياز: لا استبعاد · درجة ≥ 70 · تغطية ≥ 60%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shortlist.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold font-mono text-white text-base">{item.symbol}</span>
                          <span className="text-xs text-slate-400 mr-1.5">({item.coinName})</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-lg font-bold text-emerald-400">{item.finalScore}</span>
                          <span className="text-slate-500 text-xs"> /100</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center justify-between">
                        <span>التغطية: {item.coveragePct}%</span>
                        <span className="text-emerald-400 font-semibold">{item.classificationLabelAr}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSymbol(item.symbol);
                            setMainTab('report');
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                        >
                          معاينة التقرير
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSymbol(item.symbol);
                            setIsChecklistModalOpen(true);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold transition-colors"
                        >
                          التدقيق اليدوي (Stage C)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE C CONTENT */}
            {funnelStage === 'stageC' && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span>المرحلة ج: التدقيق اليدوي الإلزامي للعملة المحددة ({selectedSymbol})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChecklistModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    فتح نافذة التدقيق اليدوي
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">حالة التدقيق البشري:</span>
                    <span
                      className={`font-mono font-bold ${
                        hasPassedChecklist ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {hasPassedChecklist ? 'مكتمل وموقع ✅ (مسموح بالانتقال للمرحلة د)' : 'غير مكتمل ⏳ (محظور الانتقال)'}
                    </span>
                  </div>
                  <div className="text-slate-400 leading-relaxed text-[11px]">
                    ملاحظات المدقق: {currentChecklist.reviewerNotes || 'لا توجد ملاحظات مسجلة بعد.'}
                  </div>
                </div>
              </div>
            )}

            {/* STAGE D CONTENT */}
            {funnelStage === 'stageD' && (
              <div className="space-y-3">
                {!hasPassedChecklist ? (
                  <div className="p-6 rounded-xl bg-slate-950/80 border border-rose-500/40 text-center space-y-2">
                    <Lock className="w-8 h-8 text-rose-400 mx-auto" />
                    <div className="text-sm font-bold text-rose-300">المرحلة د مقفلة نظامياً لـ {selectedSymbol}</div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      القاعدة 4: لا انتقال لمرحلة البحث الفني دون استكمال المرحلة ج واعتماد قرار المتابعة بعد التدقيق اليدوي.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsChecklistModalOpen(true)}
                      className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    >
                      استكمال التدقيق اليدوي لفتح المرحلة د
                    </button>
                  </div>
                ) : (
                  <TechnicalContextCard context={technicalContext} />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED REPORT VIEW */}
        {mainTab === 'report' && selectedReport && (
          <AssetReportCard
            report={selectedReport}
            onOpenManualChecklist={() => setIsChecklistModalOpen(true)}
            hasCompletedChecklist={hasPassedChecklist}
          />
        )}

        {/* TAB 3: AUDIT AND FORWARD TEST VIEW */}
        {mainTab === 'audit' && (
          <AuditAndForwardTestView reports={stageBReports} rawCoins={universe} />
        )}

        {/* Manual Checklist Modal (Stage C) */}
        {isChecklistModalOpen && (
          <ManualChecklistModal
            isOpen={isChecklistModalOpen}
            onClose={() => setIsChecklistModalOpen(false)}
            checklist={currentChecklist}
            onSave={handleSaveChecklist}
          />
        )}

        {/* Mandatory Bottom Disclaimer (Required on every screen) */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-amber-300/90 font-medium">
          درجة وصفية وفق بروتوكول محدد، ليست توصية ولا توقعاً للسعر. الجودة لا تعني قيمة عادلة ولا تمنع هبوطاً حاداً
        </div>
      </div>
    </div>
  );
};
