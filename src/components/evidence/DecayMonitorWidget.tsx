import React, { useState } from 'react';
import { IncubationSession, EvidenceTrade } from '../../types/evidence';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  addTradeToIncubationSession,
  updateSessionPhase,
} from '../../lib/gate/incubationManager';

interface DecayMonitorWidgetProps {
  session: IncubationSession;
  onSessionUpdated: (updated: IncubationSession) => void;
}

export const DecayMonitorWidget: React.FC<DecayMonitorWidgetProps> = ({
  session,
  onSessionUpdated,
}) => {
  const [testTradeR, setTestTradeR] = useState<number>(1.5);

  const handleAddSampleTrade = (r: number) => {
    const fakeTrade: EvidenceTrade = {
      id: `live_tr_${Date.now()}`,
      entryTime: Date.now() - 3600000,
      exitTime: Date.now(),
      side: 'long',
      entryPrice: 65000,
      exitPrice: 65000 * (1 + r * 0.02),
      riskAmount: 100,
      pnlAmount: r * 100,
      pnlR: r,
      durationBars: 4,
      fees: 2,
      slippage: 1,
      regime: 'chop',
      sampleType: session.currentPhase === 'paper' ? 'paper' : 'live',
    };

    const updated = addTradeToIncubationSession(session.strategyId, fakeTrade);
    if (updated) {
      onSessionUpdated(updated);
    }
  };

  const handlePhaseChange = (phase: 'paper' | 'micro_live' | 'full_live' | 'suspended') => {
    const updated = updateSessionPhase(session.strategyId, phase);
    if (updated) {
      onSessionUpdated(updated);
    }
  };

  const phaseLabels: Record<string, { label: string; color: string }> = {
    paper: { label: 'تداول ورقي (Paper Incubation)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    micro_live: { label: 'حي بحجم مصغر (Micro Size)', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    full_live: { label: 'حي كامل (Full Production)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    suspended: { label: 'معلق احترازياً (Suspended)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Header and Current Phase */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h4 className="text-base font-semibold text-slate-200">
              مراقبة الحضانة وتآكل الحافة (Real-time Decay & CUSUM Monitor)
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            استراتيجية: {session.strategyName} ({session.symbol} - {session.timeframe})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full border font-medium ${
              phaseLabels[session.currentPhase]?.color || ''
            }`}
          >
            {phaseLabels[session.currentPhase]?.label}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400">العائد المتحرك الحالي E[R]</div>
          <div
            className={`text-xl font-bold mt-1 ${
              session.rollingExpectancyR >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {session.rollingExpectancyR >= 0 ? '+' : ''}
            {session.rollingExpectancyR.toFixed(2)} R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            الأساس المتوقع: +{session.expectedBaselineExpectancyR.toFixed(2)} R
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400">مؤشر الانحراف التراكمي CUSUM</div>
          <div
            className={`text-xl font-bold mt-1 ${
              session.cusumScore >= 3.5
                ? 'text-rose-400'
                : session.cusumScore >= 2.0
                ? 'text-amber-400'
                : 'text-slate-200'
            }`}
          >
            {session.cusumScore.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">عتبة الخطر: ≥ 3.50</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400">الخسائر المتتالية الجارية</div>
          <div
            className={`text-xl font-bold mt-1 ${
              session.consecutiveLosses >= 4 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {session.consecutiveLosses}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            إجمالي صفقات الحضانة: {session.trades.length}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400">سلامة الحافة التنافسية</div>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-sm">
            {session.cusumAlertTriggered ? (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 inline" /> تآكل حرج
              </span>
            ) : session.edgeDecayWarning ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 inline" /> تحت الملاحظة
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 inline" /> حافة ممتازة
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            نسبة فوز الحضانة: {(session.rollingWinRate * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Decay Alert Banner if triggered */}
      {session.decayMessageAr && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
            session.cusumAlertTriggered
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : session.edgeDecayWarning
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {session.cusumAlertTriggered ? (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          )}
          <div>{session.decayMessageAr}</div>
        </div>
      )}

      {/* Controls & Simulating/Testing Trades in Incubation */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">
            محاكاة تسجيل صفقة في جلسة الحضانة لاختبار حساسية CUSUM:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddSampleTrade(2.0)}
              className="px-2.5 py-1 text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 transition-colors"
            >
              + صفقة رابحة (+2.0 R)
            </button>
            <button
              onClick={() => handleAddSampleTrade(-1.0)}
              className="px-2.5 py-1 text-[11px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded border border-rose-500/30 transition-colors"
            >
              - صفقة خاسرة (-1.0 R)
            </button>
          </div>
        </div>

        {/* Phase Advancement buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 ml-2">ترقية مرحلة الاستراتيجية:</span>
          <button
            onClick={() => handlePhaseChange('paper')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              session.currentPhase === 'paper'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            1. تداول ورقي
          </button>
          <button
            onClick={() => handlePhaseChange('micro_live')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              session.currentPhase === 'micro_live'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            2. حجم مصغر (Micro)
          </button>
          <button
            onClick={() => handlePhaseChange('full_live')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              session.currentPhase === 'full_live'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            3. تداول حي كامل
          </button>
          <button
            onClick={() => handlePhaseChange('suspended')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              session.currentPhase === 'suspended'
                ? 'bg-rose-500 text-white font-bold'
                : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
            }`}
          >
            إيقاف احترازي
          </button>
        </div>

        {/* Pre-Registration Immutable Record & Export Card (Phase 5 Item 7) */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                وثيقة التسجيل المسبق المشفرة (Pre-Registration Hash Chain)
              </span>
              <span className="text-[11px] text-amber-400/90 font-medium">
                تنبيه: هذا السجل محلي، ولا قيمة له إثباتية إلا إن نُشرت بصمته خارجياً.
              </span>
            </div>
            <button
              onClick={() => {
                const payload = {
                  specVersion: '1.0-genesis',
                  strategyId: session.strategyId,
                  strategyName: session.strategyName,
                  symbol: session.symbol,
                  timeframe: '1d',
                  breakoutWindow: 20,
                  takeProfitPct: 12.0,
                  stopLossPct: 6.0,
                  feePct: 0.075,
                  slippagePct: 0.05,
                  executionModel: 'limit_order_conservative_0.05_buffer',
                  maxOpenPositions: 1,
                  registeredAt: session.startDate ? new Date(session.startDate).toISOString() : '2026-10-15T00:00:00Z',
                  holdoutSampleStatus: 'CONSUMED (2025-01-01 to 2026-10-15 consumed for Stage 4 validation on 2026-10-15)',
                  continuationRule: 'Rolling 30-trade E[R] > 0 and cumulative DD <= 12 R',
                  haltingRule: 'Rolling 20-trade E[R] < -0.20 R or cumulative DD > 18 R',
                  minTradesForStatisticalSignificance: 60,
                  disclaimerAr: 'هذا السجل محلي، ولا قيمة له إثباتية إلا إن نُشرت بصمته خارجياً',
                  genesisSha256: 'b3209cbb637f1555a744a39e2e41f9dfd94c415686abd571483a129b52299c38'
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `preregistration-${session.symbol}-${session.strategyId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5"
            >
              تحميل ملف التسجيل المسبق (JSON)
            </button>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all">
            <span className="text-slate-500 select-none">SHA-256 Genesis: </span>
            b3209cbb637f1555a744a39e2e41f9dfd94c415686abd571483a129b52299c38
          </div>
        </div>
      </div>
    </div>
  );
};
