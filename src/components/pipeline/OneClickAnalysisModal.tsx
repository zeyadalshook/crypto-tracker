import React, { useState, useRef, useEffect } from 'react';
import {
  PipelineConfig,
  PipelineProgress,
  FullAnalysisReport,
  PipelineAnalysisLevel,
  PipelineTimeRange,
  PipelineTimeframe,
} from '../../types/pipeline';
import { PipelineOrchestrator } from '../../lib/pipeline/orchestrator';
import { savePipelineReport, getLatestReportForSymbol } from '../../lib/pipeline/storage';
import { FullAnalysisReportView } from './FullAnalysisReportView';
import {
  Play,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Pause,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { OHLCV } from '../../types/crypto';

interface OneClickAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  klines: OHLCV[];
  onOpenGateModal?: () => void;
}

export const OneClickAnalysisModal: React.FC<OneClickAnalysisModalProps> = ({
  isOpen,
  onClose,
  symbol,
  klines,
  onOpenGateModal,
}) => {
  // View state: 'config' | 'running' | 'report'
  const [viewState, setViewState] = useState<'config' | 'running' | 'report'>('config');

  // Configuration options
  const [level, setLevel] = useState<PipelineAnalysisLevel>('balanced');
  const [range, setRange] = useState<PipelineTimeRange>('5y');
  const [timeframes, setTimeframes] = useState<PipelineTimeframe[]>(['1d', '4h']);
  const [maxDrawdownLimitPct, setMaxDrawdownLimitPct] = useState<number>(30);
  const [ruinTargetPct, setRuinTargetPct] = useState<number>(1);

  // Progress state
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [completedReport, setCompletedReport] = useState<FullAnalysisReport | null>(null);

  const orchestratorRef = useRef<PipelineOrchestrator | null>(null);

  // Pre-load latest report if available
  useEffect(() => {
    const existing = getLatestReportForSymbol(symbol);
    if (existing && !completedReport && viewState === 'config') {
      // User can view existing or start fresh
    }
  }, [symbol]);

  if (!isOpen) return null;

  const handleStartAnalysis = async () => {
    setViewState('running');
    const config: PipelineConfig = {
      symbol,
      level,
      range,
      timeframes,
      maxDrawdownLimitPct,
      ruinTargetPct,
      seed: 4242,
    };

    const orchestrator = new PipelineOrchestrator(config, (p) => {
      setProgress(p);
    });
    orchestratorRef.current = orchestrator;

    try {
      // Use provided klines or generate historical set
      const report = await orchestrator.run(klines);
      savePipelineReport(report);
      setCompletedReport(report);
      setViewState('report');
    } catch (err: any) {
      if (err.message?.includes('إلغاء')) {
        setViewState('config');
      } else {
        alert(err.message || 'حدث خطأ أثناء تشغيل خط الإنتاج');
        setViewState('config');
      }
    }
  };

  const handleCancel = () => {
    if (orchestratorRef.current) {
      orchestratorRef.current.cancel();
    }
    setViewState('config');
  };

  const handlePauseResume = () => {
    if (!orchestratorRef.current || !progress) return;
    if (progress.isPaused) {
      orchestratorRef.current.resume();
    } else {
      orchestratorRef.current.pause();
    }
  };

  const stageLabels = [
    '0. تجهيز وفحص سلامة البيانات والمؤشرات',
    '1. الفرز السريع على التدريب واستبعاد الضعيف',
    '2. صقل المعاملات والتحقق المزدوج',
    '3. الفحوصات الثقيلة: بوتستراب ومونت كارلو وDSR',
    '4. الاختبار الحاسم على العينة المحجوبة OOS',
    '5. بوابة الاعتماد والتوصية والمقارنة مع B&H',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  التحليل الشامل بضغطة واحدة (One-Click Full Analysis)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  {symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                خط إنتاج ذكي مؤتمت: فرز سريع ← صقل معاملات ← بوتستراب 5,000 ← مونت كارلو 10,000 ← بوابة الاعتماد
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* VIEW 1: PRE-RUN CONFIGURATION */}
          {viewState === 'config' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                💡 <strong className="text-slate-200">فكرة العمل:</strong> يقوم خط الإنتاج بمسح مئات التركيبات واختبارها عبر قمع علمي صارم يمنع الملاءمة المفرطة (Overfitting) مع عزل عينة محجوبة واحتساب نسبة شارب المنكمشة (Deflated Sharpe) دون أي تجميد للواجهة.
              </div>

              {/* Options Form */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-5">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  خيارات التحليل الشامل (يمكن الضغط على "ابدأ التحليل" مباشرة):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Analysis Level */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">مستوى عمق التحليل:</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="quick">سريع (~1-2 دقيقة) - استكشاف أولي</option>
                      <option value="balanced">متوازن (~5-10 دقائق) - الموصى به للاعتماد</option>
                      <option value="deep">معمّق (~20-30 دقيقة) - شبكة معاملات دقيقة</option>
                    </select>
                  </div>

                  {/* Historical Range */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">المدى التاريخي للبيانات:</label>
                    <select
                      value={range}
                      onChange={(e) => setRange(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="5y">الأقصى المتاح حتى 5 سنوات (الافتراضي)</option>
                      <option value="3y">آخر 3 سنوات</option>
                      <option value="1y">آخر سنة فقط</option>
                      <option value="all">كل التاريخ المتاح من أول شمعة</option>
                    </select>
                  </div>

                  {/* Max Drawdown Limit */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">
                      حد التراجع الأقصى المقبول: <span className="text-rose-400 font-mono font-bold">-{maxDrawdownLimitPct}%</span>
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="45"
                      step="5"
                      value={maxDrawdownLimitPct}
                      onChange={(e) => setMaxDrawdownLimitPct(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Ruin Goal */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">
                      هدف احتمالية الإفلاس في مونت كارلو: <span className="text-emerald-400 font-mono font-bold">&lt; {ruinTargetPct}%</span>
                    </label>
                    <select
                      value={ruinTargetPct}
                      onChange={(e) => setRuinTargetPct(parseFloat(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="1">أقل من 1.0% (أمان فائق)</option>
                      <option value="2">أقل من 2.0% (متوازن)</option>
                      <option value="5">أقل من 5.0% (مخاطرة مقبولة)</option>
                    </select>
                  </div>
                </div>

                {/* Pre-run estimate ribbon */}
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Clock className="w-4 h-4" />
                    <span>الوقت التقديري: {level === 'quick' ? 'دقيقة ونصف' : level === 'balanced' ? '6-8 دقائق' : '20 دقيقة'}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    التركيبات المتوقعة: {level === 'quick' ? '40' : level === 'balanced' ? '90' : '200'} تركيبة
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleStartAnalysis}
                  className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-95 transition-all inline-flex items-center gap-2.5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  حلّل هذا الزوج بالكامل الآن
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: RUNNING PIPELINE PROGRESS */}
          {viewState === 'running' && progress && (
            <div className="space-y-6 max-w-3xl mx-auto py-4">
              {/* Overall Progress Bar */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                    {progress.statusMessageAr}
                  </span>
                  <span className="font-mono text-indigo-400 font-bold text-sm">
                    {progress.overallProgressPct}%
                  </span>
                </div>

                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress.overallProgressPct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
                  <span>المنقضي: {progress.elapsedSeconds} ثانية</span>
                  <span>ناجٍ من الفرز: {progress.survivorsCount} من {progress.testedCombinationsCount}</span>
                  <span>المتبقي التقريبي: {progress.estimatedRemainingSeconds} ثانية</span>
                </div>
              </div>

              {/* Stage by stage checklist */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300">مراحل خط الإنتاج وقمع الاستبعاد:</h4>

                <div className="space-y-2">
                  {stageLabels.map((label, idx) => {
                    const isDone = progress.completedStages[idx];
                    const isCurrent = progress.currentStage === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isDone
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                            : isCurrent
                            ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200 font-bold'
                            : 'bg-slate-950/30 border-slate-900 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                          )}
                          <span>{label}</span>
                        </div>

                        {isCurrent && (
                          <span className="font-mono text-indigo-400 text-[11px]">
                            {progress.stageProgressPct}%
                          </span>
                        )}
                        {isDone && (
                          <span className="text-emerald-400 text-[11px]">منتهية ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {progress.isPaused ? 'استئناف' : 'إيقاف مؤقت'}
                </button>

                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  إلغاء التحليل
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: COMPLETED FULL REPORT */}
          {viewState === 'report' && completedReport && (
            <FullAnalysisReportView
              report={completedReport}
              onRerun={() => setViewState('config')}
              onClose={onClose}
              onOpenGateModal={onOpenGateModal}
            />
          )}
        </div>
      </div>
    </div>
  );
};
