import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult, FearAndGreedData, DerivativesData, NewsItem } from '../types/crypto';
import {
  runTradingAgentsPipeline,
  TraderRiskProfile,
  TradingAgentsPipelineResult,
} from '../utils/tradingAgentsEngine';
import { formatAdaptivePrice } from '../lib/brain/decisionEngine';
import { AutoTraderEngine } from '../lib/brain/autoTrader';

interface TradingAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  fearGreed?: FearAndGreedData | null;
  derivatives?: DerivativesData | null;
  news?: NewsItem[];
}

export const TradingAgentsModal: React.FC<TradingAgentsModalProps> = ({
  isOpen,
  onClose,
  coin,
  analysis,
  fearGreed,
  derivatives,
  news = [],
}) => {
  const [riskProfile, setRiskProfile] = useState<TraderRiskProfile>('balanced');
  const [activeStage, setActiveStage] = useState<'all' | 'analysts' | 'debate' | 'trader' | 'risk' | 'manager'>('all');
  const [aiDebateSummary, setAiDebateSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [paperOrderFeedback, setPaperOrderFeedback] = useState<string | null>(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset AI synthesis when coin changes
  useEffect(() => {
    setAiDebateSummary(null);
    setAiError(null);
    setPaperOrderFeedback(null);
  }, [coin.symbol]);

  const traderEngine = useMemo(() => AutoTraderEngine.getInstance(), []);
  const traderState = traderEngine.getState();
  const killSwitchActive = Boolean(traderState.killSwitchTriggered || traderState.isHalted);

  const pipelineResult: TradingAgentsPipelineResult = useMemo(() => {
    return runTradingAgentsPipeline({
      coin,
      analysis,
      fearGreed,
      derivatives,
      news,
      riskProfile,
      killSwitchActive,
    });
  }, [coin, analysis, fearGreed, derivatives, news, riskProfile, killSwitchActive]);

  if (!isOpen) return null;

  const handleRunGeminiDebate = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/trading-agents/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: coin.symbol,
          currentPrice: coin.current_price,
          pipeline: pipelineResult,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر توليد المناظرة المعمقة حالياً');
      }
      setAiDebateSummary(data.synthesisAr || null);
    } catch (err: any) {
      setAiError(err.message || 'حدث خطأ أثناء الاتصال بمحرك المناظرة');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleExecutePaperTrade = () => {
    const { fundManager, traderProposal } = pipelineResult;
    if (fundManager.finalAction === 'HOLD_WAIT') {
      setPaperOrderFeedback('القرار التنفيذي الحالي هو الانتظار (HOLD_WAIT) — لا يتم فتح مركز ورقي.');
      return;
    }

    const prevOpenCount = traderEngine.getState().openPositions.length;
    const wasAutopilot = traderEngine.getState().settings.autopilotEnabled;
    if (!wasAutopilot) {
      traderEngine.updateSettings({ autopilotEnabled: true });
    }

    traderEngine.processDecisionsCycle([
      {
        coin: coin.symbol,
        timestamp: Date.now(),
        type: fundManager.finalAction,
        confidence: fundManager.consensusConfidencePct,
        confluenceCount: 5,
        confluenceGroups: ['فريق المحللين', 'مناظرة الأبحاث', 'وكيل التداول', 'لجنة المخاطر', 'مدير الصندوق'],
        indicatorGroups: [],
        currentPrice: traderProposal.entryPrice,
        entryPrice: traderProposal.entryPrice,
        stopLossPrice: traderProposal.stopLossPrice,
        takeProfit1Price: traderProposal.takeProfit1Price,
        takeProfit2Price: traderProposal.takeProfit2Price,
        riskRewardRatio: traderProposal.riskRewardRatio,
        reasoningAr: `[TradingAgents Fund Manager] ${fundManager.executiveSummaryAr}`,
        factors: {
          signalScore: pipelineResult.debate.netEdgeScore,
          mtfAlignmentPct: fundManager.consensusConfidencePct,
          fundamentalScore: 80,
          fearGreedValue: fearGreed?.value ?? 50,
          fundingRatePct: (derivatives?.fundingRate ?? 0.0001) * 100,
          regime: analysis.trend === 'صاعد' ? 'bull' : analysis.trend === 'هابط' ? 'bear' : 'chop',
          atrUsd: analysis.atr14 || traderProposal.entryPrice * 0.02,
          distToSupportPct: Math.abs(analysis.distanceToS1Percent || 2),
          distToResistancePct: Math.abs(analysis.distanceToR1Percent || 2),
        },
        isActionable: true,
      },
    ]);

    if (!wasAutopilot) {
      traderEngine.updateSettings({ autopilotEnabled: false });
    }

    const newOpenCount = traderEngine.getState().openPositions.length;
    if (newOpenCount > prevOpenCount) {
      setPaperOrderFeedback(`تم فتح الصفقة الورقية المحاكاة بنجاح على ${coin.symbol} بسعر $${formatAdaptivePrice(traderProposal.entryPrice)}`);
    } else {
      setPaperOrderFeedback(`يوجد مركز ورقي مفتوح مسبقاً على ${coin.symbol} أو تم إيقاف الدخول بواسطة حواجز المخاطر.`);
    }
  };

  const handleExportJson = () => {
    const payload = {
      framework: 'TauricResearch/TradingAgents (Paper Simulation)',
      exportedAt: new Date().toISOString(),
      ...pipelineResult,
      aiEnhancedSynthesisAr: aiDebateSummary || undefined,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-agents-${coin.symbol.toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { analysts, debate, traderProposal, riskReview, fundManager } = pipelineResult;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trading-agents-modal-title"
    >
      <div className="relative w-full max-w-6xl bg-[#06120b] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>إطار عمل الوكلاء المتعددين</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">TauricResearch / TradingAgents</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-semibold">تداول ورقي محاكى 100% (Paper Only)</span>
            </div>
            <h2 id="trading-agents-modal-title" className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>غرفة عمليات وكلاء التداول المتعددين — {coin.symbol}/USDT</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير التقرير JSON</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Filter & Trader Risk Profile Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
          {/* Pipeline Stage Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'all', label: 'جميع المراحل (5 مراحل)' },
              { id: 'analysts', label: '1. فريق المحللين (4)' },
              { id: 'debate', label: '2. مناظرة الأبحاث (Bull vs Bear)' },
              { id: 'trader', label: '3. وكيل التداول' },
              { id: 'risk', label: '4. لجنة المخاطر' },
              { id: 'manager', label: '5. مدير الصندوق' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeStage === st.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Trader Risk Profile Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">نمط وكيل التداول:</span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              {(
                [
                  { id: 'conservative', label: 'محافظ (0.5%)' },
                  { id: 'balanced', label: 'متوازن (1.0%)' },
                  { id: 'aggressive', label: 'هجومي منضبط (1.5%)' },
                ] as { id: TraderRiskProfile; label: string }[]
              ).map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setRiskProfile(prof.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    riskProfile === prof.id
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {prof.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STAGE 1: ANALYST TEAM (4 AGENTS) */}
        {(activeStage === 'all' || activeStage === 'analysts') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">
                01. فريق المحللين المختصين (Analyst Team — جمع البيانات المتعددة)
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                السعر المرجعي الحي: ${formatAdaptivePrice(coin.current_price)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {analysts.map((agent) => {
                const stanceColor =
                  agent.stance === 'BULLISH'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                    : agent.stance === 'BEARISH'
                    ? 'text-rose-400 border-rose-500/30 bg-rose-950/20'
                    : 'text-amber-400 border-amber-500/30 bg-amber-950/20';

                const stanceLabelAr =
                  agent.stance === 'BULLISH' ? 'إيجابي / صعودي' : agent.stance === 'BEARISH' ? 'سلبي / هبوطي' : 'محايد / متوازن';

                return (
                  <div
                    key={agent.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 bg-slate-900/60 ${stanceColor}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
                        <span>{agent.roleNameEn}</span>
                        <span className="font-mono tabular-nums font-bold">
                          ثقة {agent.confidencePct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">{agent.roleNameAr}</h4>
                        <span className="text-xs font-mono tabular-nums font-bold">
                          {agent.score > 0 ? `+${agent.score}` : agent.score} · {stanceLabelAr}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{agent.headlineAr}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                      {agent.metrics.map((m, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">{m.labelAr}:</span>
                          <span
                            className={`font-mono tabular-nums font-semibold ${
                              m.status === 'positive'
                                ? 'text-emerald-300'
                                : m.status === 'negative'
                                ? 'text-rose-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* STAGE 2: RESEARCH TEAM DIALECTICAL DEBATE (BULL VS BEAR) */}
        {(activeStage === 'all' || activeStage === 'debate') && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  02. مناظرة فريق الأبحاث الجدلية (Bull Researcher vs. Bear Researcher)
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums">
                صافي الأفضلية الجدلية: {debate.netEdgeScore > 0 ? `+${debate.netEdgeScore}` : debate.netEdgeScore}
              </div>
            </div>

            {/* Tug of War Conviction Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-mono tabular-nums">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  الباحث الصعودي (Bull): {debate.bullConvictionPct}%
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  الباحث الهبوطي (Bear): {debate.bearConvictionPct}%
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-rose-950/80 overflow-hidden flex border border-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${debate.bullConvictionPct}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${debate.bearConvictionPct}%` }}
                />
              </div>
            </div>

            {/* 3 Rounds of Dialectical Debate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {debate.rounds.map((r) => (
                <div key={r.roundNumber} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200">{r.topicAr}</span>
                  </div>
                  <div className="text-xs text-emerald-200/90 leading-relaxed bg-emerald-950/25 border border-emerald-500/20 rounded-lg p-2.5">
                    {r.bullArgumentAr}
                  </div>
                  <div className="text-xs text-rose-200/90 leading-relaxed bg-rose-950/25 border border-rose-500/20 rounded-lg p-2.5">
                    {r.bearArgumentAr}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/90 border border-slate-800 rounded-lg p-3">
              <strong className="text-emerald-400">خلاصة فريق الأبحاث: </strong>
              {debate.consensusSummaryAr}
            </div>
          </section>
        )}

        {/* STAGE 3 & 4: TRADER PROPOSAL & RISK MANAGEMENT GUARDIANS */}
        {(activeStage === 'all' || activeStage === 'trader' || activeStage === 'risk') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Stage 3: Trader Agent Proposal */}
            <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>03. مسودة وكيل التداول (Trader Agent)</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    R:R 1:{traderProposal.riskRewardRatio.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{traderProposal.rationaleAr}</p>

                <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs font-mono tabular-nums">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">سعر الدخول المقترح</div>
                    <div className="text-white font-bold mt-0.5">${formatAdaptivePrice(traderProposal.entryPrice)}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/30">
                    <div className="text-rose-300 text-[11px] font-sans">وقف الخسارة (SL)</div>
                    <div className="text-rose-400 font-bold mt-0.5">${formatAdaptivePrice(traderProposal.stopLossPrice)}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30">
                    <div className="text-emerald-300 text-[11px] font-sans">الهدف الأول (TP1)</div>
                    <div className="text-emerald-400 font-bold mt-0.5">${formatAdaptivePrice(traderProposal.takeProfit1Price)}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30">
                    <div className="text-emerald-300 text-[11px] font-sans">الهدف الثاني (TP2)</div>
                    <div className="text-emerald-400 font-bold mt-0.5">${formatAdaptivePrice(traderProposal.takeProfit2Price)}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 border-t border-slate-800 pt-2.5 flex items-center justify-between font-mono tabular-nums">
                <span>المخاطرة المبدئية المقترحة:</span>
                <span className="text-emerald-300 font-bold">{traderProposal.recommendedRiskPct}% من الرصيد</span>
              </div>
            </div>

            {/* Stage 4: Risk Management Team */}
            <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>04. مراجعة لجنة المخاطر والامتثال (Risk Management Team)</span>
                </h3>
                <span
                  className={`text-xs font-bold font-mono tabular-nums ${
                    riskReview.status === 'APPROVED'
                      ? 'text-emerald-400'
                      : riskReview.status === 'MODIFIED'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  حالة الامتثال: {riskReview.status} · درجة المخاطرة {riskReview.riskScore}/100
                </span>
              </div>

              <div className="space-y-2">
                {riskReview.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      {chk.severity === 'OK' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : chk.severity === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-slate-200">{chk.titleAr}</div>
                        <div className="text-slate-400 mt-0.5">{chk.detailAr}</div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold shrink-0 ${
                        chk.severity === 'OK'
                          ? 'text-emerald-400'
                          : chk.severity === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {chk.severity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-3">
                <strong className="text-amber-300">قرار لجنة المخاطر: </strong>
                {riskReview.committeeNoteAr}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: FUND MANAGER FINAL VERDICT & AI DEEP SYNTHESIS */}
        {(activeStage === 'all' || activeStage === 'manager') && (
          <section className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/35 via-slate-900 to-slate-950 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">
                  05. القرار النهائي لمدير الصندوق التنفيذي (Fund Manager Executive Verdict)
                </div>
                <div className="text-lg sm:text-xl font-black text-white flex items-center gap-3 flex-wrap">
                  <span
                    className={
                      fundManager.finalAction === 'ENTER_LONG'
                        ? 'text-emerald-400'
                        : fundManager.finalAction === 'ENTER_SHORT'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }
                  >
                    {fundManager.finalActionAr}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-300 font-normal">
                    توافق الوكلاء: {fundManager.consensusConfidencePct}% · المخاطرة المعتمدة: {fundManager.approvedRiskPct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleRunGeminiDebate}
                  disabled={isGeneratingAi}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isGeneratingAi ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {isGeneratingAi ? 'جاري عقد مناظرة الذكاء الاصطناعي...' : 'توليد مذكرة مناظرة معمقة (AI Synthesis)'}
                  </span>
                </button>

                {fundManager.finalAction !== 'HOLD_WAIT' && (
                  <button
                    type="button"
                    onClick={handleExecutePaperTrade}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors shadow-lg whitespace-nowrap shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>تنفيذ الصفقة الورقية المحاكاة</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              {fundManager.executiveSummaryAr}
            </p>

            {paperOrderFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 font-semibold">
                {paperOrderFeedback}
              </div>
            )}

            {aiError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {aiError}
              </div>
            )}

            {aiDebateSummary && (
              <div className="p-4 rounded-xl bg-slate-950/95 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>مذكرة المناظرة التحليلية المعمقة (TauricResearch Multi-Agent LLM Synthesis):</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {aiDebateSummary}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
