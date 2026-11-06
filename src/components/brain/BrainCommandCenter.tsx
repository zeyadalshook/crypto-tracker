import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Power,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  Clock,
  ArrowRight,
  ChevronDown,
  Wallet,
  Play,
  Pause,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { BrainDecision, CoinAnalysisInput } from '../../lib/brain/decisionTypes';
import { evaluateCoinDecision, formatAdaptivePrice, DEFAULT_DECISION_CONFIG } from '../../lib/brain/decisionEngine';
import { AutoTraderEngine, BrainPosition, AutoTraderState } from '../../lib/brain/autoTrader';
import { BrainDailySummary } from './BrainDailySummary';
import { BrainActivityLog } from './BrainActivityLog';
import { BrainAlerts } from './BrainAlerts';
import { appendBrainActivity, addBrainAlert, getBrainAlerts } from '../../lib/brain/brainStorage';
import { FearAndGreedData, DerivativesData, CoinDetail } from '../../types/crypto';

interface BrainCommandCenterProps {
  currentSymbol: string;
  coinDetail: CoinDetail | null;
  derivatives: DerivativesData | null;
  fearGreed: FearAndGreedData;
  onSelectSymbol?: (sym: string) => void;
  onOpenPaperModal?: () => void;
}

const TRACKED_COINS = ['BTC', 'ETH', 'SOL', 'PYTH', 'BNB', 'XRP', 'AVAX', 'LINK', 'SUI', 'NEAR'];

export const BrainCommandCenter: React.FC<BrainCommandCenterProps> = ({
  currentSymbol,
  coinDetail,
  derivatives,
  fearGreed,
  onSelectSymbol,
  onOpenPaperModal,
}) => {
  const trader = useMemo(() => AutoTraderEngine.getInstance(), []);
  const [traderState, setTraderState] = useState<AutoTraderState>(trader.getState());
  const [activeSubTab, setActiveSubTab] = useState<'decisions' | 'summary' | 'log' | 'alerts' | 'settings'>('decisions');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [expandedCoin, setExpandedCoin] = useState<string | null>(currentSymbol);

  // Quick settings edit states
  const [riskPct, setRiskPct] = useState<number>(traderState.settings.riskPerTradePct);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(traderState.settings.maxDailyLossPct);
  const [maxConsecLosses, setMaxConsecLosses] = useState<number>(traderState.settings.maxConsecutiveLosses);
  const [roundTripFee, setRoundTripFee] = useState<number>(traderState.settings.roundTripFeePct ?? 0.25);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Coins analysis inputs map
  const [coinsData, setCoinsData] = useState<Record<string, CoinAnalysisInput>>({});

  // Sync state from engine
  const refreshState = useCallback(() => {
    setTraderState(trader.getState());
  }, [trader]);

  // Load LIVE Market Inputs for Tracked Coins from Real Data Feed (No fake or cross-coin prices)
  const loadMarketInputs = useCallback(async () => {
    setIsEvaluating(true);
    const newInputs: Record<string, CoinAnalysisInput> = {};
    const openPosSymbols = new Set(trader.getState().openPositions.map((p) => p.symbol));

    let liveFeed: Record<string, any> = {};
    try {
      const resp = await fetch('/api/brain/market-inputs');
      if (resp.ok) {
        liveFeed = await resp.json();
      }
    } catch (err) {
      console.warn('Failed to fetch /api/brain/market-inputs:', err);
    }

    for (const sym of TRACKED_COINS) {
      const liveItem = liveFeed[sym];
      const hasPos = openPosSymbols.has(sym);
      const openPos = trader.getState().openPositions.find((p) => p.symbol === sym);

      // CRITICAL FIX: Only use dashboard coinDetail if it matches THIS specific coin's symbol!
      const isSelectedDashboardCoin =
        Boolean(coinDetail && coinDetail.symbol && coinDetail.symbol.toUpperCase() === sym);

      let price = liveItem?.currentPrice || 0;
      if (isSelectedDashboardCoin && coinDetail && coinDetail.current_price > 0) {
        price = coinDetail.current_price;
      }

      // If price is genuinely unavailable, flag as isDataUnavailable instead of inventing a number
      if (!price || price <= 0 || liveItem?.isDataUnavailable) {
        newInputs[sym] = {
          symbol: sym,
          currentPrice: 0,
          signalScore: 0,
          mtfAlignmentPct: 0,
          fundamentalScore: 0,
          fearGreedValue: fearGreed.value || 50,
          fundingRatePct: 0,
          openInterestChange24hPct: 0,
          volatilityAtr: 0,
          volatilityAtrPct: 0,
          regime: 'chop',
          nearestSupportPrice: 0,
          nearestResistancePrice: 0,
          hasOpenPosition: hasPos,
          openPositionSide: openPos?.side,
          openPositionEntryPrice: openPos?.entryPrice,
          openPositionSlPrice: openPos?.stopLossPrice,
          openPositionPnlR: openPos?.unrealizedPnlR,
          killSwitchActive: traderState.killSwitchTriggered,
          riskGuardHalted: traderState.isHalted,
          isDataUnavailable: true,
        };
        continue;
      }

      const atr = liveItem?.volatilityAtr || (price * 0.03);
      const atrPct = (atr / price) * 100;
      const supp = liveItem?.nearestSupportPrice || (price * 0.97);
      const resis = liveItem?.nearestResistancePrice || (price * 1.03);

      newInputs[sym] = {
        symbol: sym,
        currentPrice: price,
        signalScore: liveItem?.signalScore ?? 15,
        mtfAlignmentPct: liveItem?.mtfAlignmentPct ?? 65,
        fundamentalScore: liveItem?.fundamentalScore ?? (sym === 'BTC' ? 95 : sym === 'ETH' ? 90 : sym === 'SOL' ? 85 : 75),
        fearGreedValue: fearGreed.value || liveItem?.fearGreedValue || 50,
        fundingRatePct: isSelectedDashboardCoin && derivatives?.fundingRate !== undefined
          ? derivatives.fundingRate * 100
          : (liveItem?.fundingRatePct ?? 0.01),
        openInterestChange24hPct: liveItem?.openInterestChange24hPct ?? 2.5,
        volatilityAtr: atr,
        volatilityAtrPct: atrPct,
        regime: liveItem?.regime || 'chop',
        nearestSupportPrice: supp,
        nearestResistancePrice: resis,
        hasOpenPosition: hasPos,
        openPositionSide: openPos?.side,
        openPositionEntryPrice: openPos?.entryPrice,
        openPositionSlPrice: openPos?.stopLossPrice,
        openPositionPnlR: openPos?.unrealizedPnlR,
        killSwitchActive: traderState.killSwitchTriggered,
        riskGuardHalted: traderState.isHalted,
        bidAskSpreadPct: liveItem?.bidAskSpreadPct,
        newsSentimentScore: liveItem?.newsSentimentScore,
        hasSevereNegativeNews: liveItem?.hasSevereNegativeNews,
        newsHeadlineAr: liveItem?.newsHeadlineAr,
        isDataUnavailable: false,
      };
    }

    setCoinsData(newInputs);
    setIsEvaluating(false);
  }, [coinDetail, derivatives, fearGreed, trader, traderState.isHalted, traderState.killSwitchTriggered]);

  useEffect(() => {
    loadMarketInputs();
  }, [loadMarketInputs]);

  // Compute decisions for all tracked coins
  const decisions: BrainDecision[] = useMemo(() => {
    return Object.values(coinsData).map((input) => {
      return evaluateCoinDecision(input, {
        minConfidence: traderState.settings.minConfidence,
      });
    });
  }, [coinsData, traderState.settings.minConfidence]);

  // Run trader evaluation cycle when decisions update
  useEffect(() => {
    if (decisions.length > 0) {
      trader.processDecisionsCycle(decisions);
      refreshState();
    }
  }, [decisions, trader, refreshState]);

  // Handle Autopilot Toggle
  const handleToggleAutopilot = () => {
    const next = !traderState.settings.autopilotEnabled;
    trader.toggleAutopilot(next);
    refreshState();
  };

  // Handle Kill Switch (Flattens all open positions immediately)
  const handleKillSwitch = () => {
    const livePrices: Record<string, number> = {};
    for (const [sym, data] of Object.entries(coinsData)) {
      if (data.currentPrice > 0) livePrices[sym] = data.currentPrice;
    }
    trader.triggerKillSwitchHalt(
      'تم الضغط المباشر على زر الإيقاف الطارئ (Kill Switch) وتصفية كافة المراكز الورقية المفتوحة بسعر السوق الحي.',
      livePrices
    );
    refreshState();
  };

  // Handle Resume / Reset Halt
  const handleResetHalt = () => {
    trader.resetHalt();
    refreshState();
  };

  // Handle Manual Position Close
  const handleManualClosePosition = (posId: string) => {
    trader.closePositionManually(posId);
    refreshState();
  };

  // Save Settings
  const handleSaveSettings = () => {
    trader.updateSettings({
      riskPerTradePct: riskPct,
      maxDailyLossPct: maxDailyLoss,
      maxConsecutiveLosses: maxConsecLosses,
      roundTripFeePct: roundTripFee,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    refreshState();
  };

  const unreadAlertsCount = useMemo(() => {
    return getBrainAlerts().filter((a) => !a.read).length;
  }, []);

  const getDecisionBadge = (type: BrainDecision['type']) => {
    switch (type) {
      case 'ENTER_LONG':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold';
      case 'ENTER_SHORT':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-bold';
      case 'EXIT':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      {/* 1. TOP COMMAND HEADER RIBBON */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#07130c] to-slate-900 border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Brain className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>العقل المدبر للتداول</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  AUTONOMOUS TRADING BRAIN
                </span>
              </h2>

              {/* HARD CONSTRAINT STANDING BADGE */}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow">
                <ShieldCheck className="w-3.5 h-3.5" />
                تداول ورقي محاكى فقط (100% Paper Simulated - لا أموال حقيقية)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مدير آلي يفكر ويتخذ القرارات وينفذ الصفقات الورقية بانضباط حتمي ومراقبة مستمرة للمخاطر
            </p>
          </div>
        </div>

        {/* Action Controls & Autopilot Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Autopilot Button */}
          <button
            onClick={handleToggleAutopilot}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              traderState.settings.autopilotEnabled
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {traderState.settings.autopilotEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                <span>الطيار الآلي: نشط (ON)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>تشغيل الطيار الآلي (OFF)</span>
              </>
            )}
          </button>

          {/* Quick Kill Switch */}
          {!traderState.killSwitchTriggered ? (
            <button
              onClick={handleKillSwitch}
              className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center gap-1.5"
              title="إيقاف طارئ فوري لجميع الأنشطة الآلية"
            >
              <Power className="w-4 h-4" />
              <span>KILL SWITCH</span>
            </button>
          ) : (
            <button
              onClick={handleResetHalt}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استئناف بعد الإيقاف</span>
            </button>
          )}

          {/* Refresh Cycle Button */}
          <button
            onClick={loadMarketInputs}
            disabled={isEvaluating}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-300 rounded-xl transition-colors disabled:opacity-50"
            title="إعادة تقييم الإشارات الآن"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. RISK GUARDS STATUS BANNER & METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Status Card 1: System State */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            traderState.killSwitchTriggered || traderState.isHalted
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              : traderState.settings.autopilotEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">حالة نظام الطيار الآلي</span>
            {traderState.killSwitchTriggered || traderState.isHalted ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : traderState.settings.autopilotEnabled ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Pause className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-base font-black font-mono">
            {traderState.killSwitchTriggered
              ? 'HALT (مفتاح الإيقاف)'
              : traderState.isHalted
              ? 'HALT (حماية المخاطر)'
              : traderState.settings.autopilotEnabled
              ? 'ACTIVE AUTOPILOT (تداول آلي)'
              : 'IDLE (وضع الاستعداد اليدوي)'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {traderState.haltReasonAr || 'كل الحواجز السلوكية وقواعد الأمان مستقرة'}
          </span>
        </div>

        {/* Status Card 2: Daily Loss Consumed */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">سقف الخسارة اليومي</span>
            <span className="text-[10px] text-slate-500 font-mono">
              الحد الأقصى: {traderState.settings.maxDailyLossPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black font-mono ${
                traderState.dailyLossConsumedPct >= traderState.settings.maxDailyLossPct
                  ? 'text-rose-400'
                  : 'text-slate-100'
              }`}
            >
              {traderState.dailyLossConsumedPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (${Math.abs(traderState.dailyRealizedPnlUsdt).toFixed(1)} USDT)
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full mt-2 overflow-hidden">
            <div
              style={{
                width: `${Math.min(
                  100,
                  (traderState.dailyLossConsumedPct / traderState.settings.maxDailyLossPct) * 100
                )}%`,
              }}
              className={`h-full transition-all ${
                traderState.dailyLossConsumedPct >= traderState.settings.maxDailyLossPct
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Status Card 3: Consecutive Losses */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">تتابع الخسائر المتتالية</span>
            <span className="text-[10px] text-slate-500 font-mono">
              الحد: {traderState.settings.maxConsecutiveLosses} صفقات
            </span>
          </div>
          <div className="text-xl font-black font-mono text-slate-100">
            {traderState.consecutiveLosses} / {traderState.settings.maxConsecutiveLosses}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {traderState.consecutiveLosses === 0
              ? 'سلسلة ممتازة (لا خسائر متتالية)'
              : 'سيتم فرض فترة تهدئة عند بلوغ الحد الأقصى'}
          </span>
        </div>

        {/* Status Card 4: Paper Equity & Active Positions */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">الرصيد الورقي والمراكز</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">محفظة تجريبية</span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-400">
            ${Math.round(traderState.equity).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">USDT</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            المراكز المفتوحة حالياً: {traderState.openPositions.length} صفقات
          </span>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'decisions', label: 'القرارات اللحظية والمراكز', icon: Activity },
          { id: 'summary', label: 'ملخص اليوم والتحليل', icon: Sparkles },
          { id: 'log', label: 'سجل الأنشطة والقرارات (Log)', icon: Clock },
          {
            id: 'alerts',
            label: `مركز التنبيهات ${unreadAlertsCount > 0 ? `(${unreadAlertsCount})` : ''}`,
            icon: Bell,
          },
          { id: 'settings', label: 'إعدادات الانضباط والمخاطر', icon: SlidersHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB A: DECISIONS & OPEN POSITIONS */}
      {activeSubTab === 'decisions' && (
        <div className="space-y-6">
          {/* Active Brain-Managed Paper Positions */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>المراكز الورقية المفتوحة التي يديرها العقل المدبر</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {traderState.openPositions.length} مركز مفتوح
                </span>
              </h4>

              {onOpenPaperModal && (
                <button
                  onClick={onOpenPaperModal}
                  className="text-xs text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>عرض دفتر التداول الورقي الكامل</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {traderState.openPositions.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl text-slate-500 text-xs">
                لا توجد مراكز ورقية مفتوحة حالياً. عند تفعيل الطيار الآلي وتوفر إشارة مؤكدة بتوافق 3+ مجموعات وثقة $\ge$ 60%، سيفتح العقل المدبر مركزاً تلقائياً.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="p-3">الرمز والاتجاه</th>
                      <th className="p-3">سعر الدخول</th>
                      <th className="p-3">السعر الحالي</th>
                      <th className="p-3">وقف الخسارة (SL)</th>
                      <th className="p-3">الأهداف (TP)</th>
                      <th className="p-3">الحجم والمخاطرة</th>
                      <th className="p-3">الربح/الخسارة الحالية</th>
                      <th className="p-3 text-center">إجراء يدوي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {traderState.openPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{pos.symbol}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                pos.side === 'long'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {pos.side === 'long' ? 'شراء LONG 🟢' : 'بيع SHORT 🔴'}
                            </span>
                            {pos.isBreakevenMoved && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                تأمين الدخول
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">${pos.entryPrice}</td>
                        <td className="p-3 text-slate-100 font-bold">${pos.currentPrice}</td>
                        <td className="p-3 text-rose-400 font-bold">${pos.stopLossPrice}</td>
                        <td className="p-3 text-emerald-400">
                          TP1: ${pos.takeProfit1Price} | TP2: ${pos.takeProfit2Price}
                        </td>
                        <td className="p-3 text-slate-300">
                          {pos.quantity} (${pos.riskAmountUsdt} USDT مخاطرة)
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-black ${
                              pos.unrealizedPnlUsdt >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pos.unrealizedPnlUsdt >= 0 ? '+' : ''}${pos.unrealizedPnlUsdt} USDT
                            {' ('}
                            {pos.unrealizedPnlR >= 0 ? '+' : ''}
                            {pos.unrealizedPnlR} R{')'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-sans">
                          <button
                            onClick={() => handleManualClosePosition(pos.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            إغلاق المركز
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Current Live Decisions Grid Across Tracked Coins */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>القرارات الحية للعقل المدبر لكل عملة (Live Decisions Engine)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  توليد قرار حتمي واحد لكل عملة (ENTER_LONG / ENTER_SHORT / EXIT / STAY_OUT) وفق قاعدة التوافق الثلاثي
                </p>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {decisions.length} عملة ممسوحة لحظياً
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {decisions.map((d) => {
                const isExpanded = expandedCoin === d.coin;
                return (
                  <div
                    key={d.coin}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => onSelectSymbol && onSelectSymbol(d.coin)}
                          className="font-mono text-base font-black text-slate-100 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                          title="عرض في لوحة التحليل الفني"
                        >
                          <span>{d.coin}</span>
                          <span className="text-[10px] text-slate-500 font-normal">/USDT</span>
                        </button>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          ${d.currentPrice}
                        </span>
                      </div>

                      {/* Explicit Decision Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs border ${getDecisionBadge(d.type)}`}>
                        {d.type === 'ENTER_LONG' && 'دخول شراء (ENTER_LONG) 🟢'}
                        {d.type === 'ENTER_SHORT' && 'دخول بيع (ENTER_SHORT) 🔴'}
                        {d.type === 'EXIT' && 'إغلاق مركز (EXIT) 🟡'}
                        {d.type === 'STAY_OUT' && 'انتظار (STAY_OUT) ⚪'}
                      </span>
                    </div>

                    {/* Confidence & Confluence Bar */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          درجة الثقة: <strong className="text-slate-200">{d.confidence}%</strong>
                        </span>
                        <span className="text-slate-400">
                          توافق المجموعات: <strong className="text-indigo-400">{d.confluenceCount} من أصل 3+</strong>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${d.confidence}%` }}
                          className={`h-full transition-all ${
                            d.confidence >= 60 ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Levels Preview if Enter Decision */}
                    {(d.type === 'ENTER_LONG' || d.type === 'ENTER_SHORT') && (
                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/60 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">الدخول المقترح:</span>
                          <span className="font-bold text-slate-200">${d.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-rose-400/80 block text-[10px]">وقف الخسارة (SL):</span>
                          <span className="font-bold text-rose-400">${d.stopLossPrice}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400/80 block text-[10px]">الهدف الأول (TP1):</span>
                          <span className="font-bold text-emerald-400">${d.takeProfit1Price}</span>
                        </div>
                      </div>
                    )}

                    {/* Blocked Alert Banner if blocked */}
                    {d.blockedReasonAr && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{d.blockedReasonAr}</span>
                      </div>
                    )}

                    {/* Expandable Arabic Reasoning Paragraph */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedCoin(isExpanded ? null : d.coin)}
                        className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center justify-between w-full font-medium"
                      >
                        <span>تفسير العقل المدبر والقرائن المعتمدة</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2.5 animate-in fade-in duration-150">
                          <p className="text-slate-200 leading-relaxed font-normal">
                            {d.reasoningAr}
                          </p>

                          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-bold block">
                              تفاصيل المجموعات الـ 6 المفحوصة:
                            </span>
                            <div className="space-y-1">
                              {d.indicatorGroups.map((grp, i) => (
                                <div
                                  key={i}
                                  className="flex items-start justify-between text-[11px] gap-2 p-1.5 rounded bg-slate-900/60"
                                >
                                  <div className="flex items-center gap-1.5">
                                    {grp.agreed ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-block shrink-0" />
                                    )}
                                    <span className="font-bold text-slate-300">{grp.nameAr}</span>
                                  </div>
                                  <span className="text-slate-400 text-left font-mono">
                                    {grp.detailsAr}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: DAILY SUMMARY */}
      {activeSubTab === 'summary' && <BrainDailySummary />}

      {/* TAB C: ACTIVITY LOG */}
      {activeSubTab === 'log' && <BrainActivityLog onRefresh={refreshState} />}

      {/* TAB D: ALERTS */}
      {activeSubTab === 'alerts' && <BrainAlerts onRefresh={refreshState} />}

      {/* TAB E: RISK SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5 max-w-2xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-100">
              إعدادات انضباط الطيار الآلي وطبقة المخاطر (Paper Risk Guards)
            </h4>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                نسبة المخاطرة لكل صفقة (Risk % of Equity):
              </label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="3.0"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                تُحسب منها كمية العقد بناءً على مسافة الوقف الحقيقي (الافتراضي: 1.0%)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                سقف الخسارة اليومية المسموح (Daily Loss Limit %):
              </label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="8.0"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || 3.0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                عند بلوغ هذه النسبة يتم تفعيل الـ HALT ومنع أي صفقات جديدة حتى اليوم التالي (الافتراضي: 3.0%)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                حد تتابع الخسائر المتتالية (Consecutive Losses Limit):
              </label>
              <input
                type="number"
                step="1"
                min="2"
                max="6"
                value={maxConsecLosses}
                onChange={(e) => setMaxConsecLosses(parseInt(e.target.value) || 3)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                إيقاف الدخول الآلي لفترة تهدئة عند تسجيل هذا العدد من الخسائر المتتالية (الافتراضي: 3 صفقات)
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all shadow"
              >
                حفظ إعدادات الانضباط
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" /> تم الحفظ بنجاح
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
