// Comprehensive Unit and Integration Test Suite for:
// 1. One-Click Full Analysis Pipeline (خط إنتاج التحليل الشامل)
// 2. Automated Execution Engine & Risk Layer (محرك التنفيذ الآلي وطبقة المخاطر)

import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { runVectorizedSimulation } from '../src/lib/pipeline/simulator';
import { calculateDeflatedSharpe } from '../src/lib/pipeline/deflatedSharpe';
import { PipelineOrchestrator } from '../src/lib/pipeline/orchestrator';
import { evaluateIntentRisk, updateRiskLimitsWithAntiRage, DEFAULT_RISK_LIMITS } from '../src/lib/risk/riskEngine';
import { TradingIntent } from '../src/lib/risk/riskTypes';
import { PaperAdapter } from '../src/lib/execution/adapters/PaperAdapter';
import { OrderManager } from '../src/lib/execution/orderManager';
import { scanCandleCloseSignals } from '../src/lib/execution/scannerEngine';
import { generateSupervisorDigest } from '../src/lib/execution/aiSupervisor';
import { Mulberry32 } from '../src/lib/stats/random';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runAcceptanceTests() {
  console.log('\n======================================================');
  console.log('PART 1: TESTING ONE-CLICK PIPELINE & VECTORIZED ENGINE');
  console.log('======================================================');

  // 1. Synthetic Candles Generation (500 candles)
  const rng = new Mulberry32(101);
  let p = 50000;
  const candles: Array<[number, number, number, number, number, number]> = [];
  const now = Date.now();
  for (let i = 0; i < 500; i++) {
    const change = (rng.next() - 0.49) * 1500;
    const open = p;
    const close = p + change;
    const high = Math.max(open, close) + rng.next() * 500;
    const low = Math.min(open, close) - rng.next() * 500;
    const vol = 1000 + rng.next() * 5000;
    candles.push([now - (500 - i) * 86400000, open, high, low, close, vol]);
    p = Math.max(1000, close);
  }

  // 1.1 Fast Vectorized Indicators
  console.log('\n--- 1.1 Vectorized Indicators Precalculation ---');
  const tInd0 = Date.now();
  const ind = computeIndicatorsOnce(candles);
  const tIndMs = Date.now() - tInd0;
  assert(ind.length === 500, 'Indicator array length matches candle count');
  assert(ind.close[499] > 0, 'Closing prices parsed accurately');
  assert(ind.rsi14[499] >= 0 && ind.rsi14[499] <= 100, 'RSI14 is bounded in [0, 100]');
  assert(ind.atr14[499] > 0, 'ATR14 is strictly positive');
  assert(tIndMs < 50, `Indicator precalculation completed in ${tIndMs}ms (< 50ms)`);

  // 1.2 Fast Vectorized Simulation
  console.log('\n--- 1.2 Vectorized Simulation & Early Stopping ---');
  const simRes = runVectorizedSimulation(
    ind,
    {
      entryType: 'rsi_oversold',
      exitType: 'tp_sl',
      tpPct: 8.0,
      slPct: 4.0,
      maxDrawdownLimitPct: 30,
    },
    0,
    300
  );
  assert(simRes.tradesCount >= 0, `Trades simulated: ${simRes.tradesCount}`);
  assert(typeof simRes.expectancyR === 'number', 'Expectancy in R calculated');
  assert(typeof simRes.profitFactor === 'number', 'Profit Factor calculated');

  // 1.3 Deflated Sharpe Ratio (DSR)
  console.log('\n--- 1.3 Deflated Sharpe Ratio (DSR) ---');
  const dsrRes = calculateDeflatedSharpe({
    estimatedSharpe: 1.8,
    totalTrials: 100,
    varianceOfTrialsSharpe: 0.25,
    sampleSizeBars: 500,
  });
  assert(dsrRes.dsr >= 0 && dsrRes.dsr <= 1.0, `DSR must be in [0, 1], got ${dsrRes.dsr}`);
  assert(dsrRes.expectedMaxSharpe > 0, `Expected max Sharpe under 100 random trials is positive (${dsrRes.expectedMaxSharpe})`);

  // 1.4 Pipeline Orchestrator Run (Stages 0 - 5)
  console.log('\n--- 1.4 Pipeline Orchestrator Full Funnel Run ---');
  const orchestrator = new PipelineOrchestrator(
    {
      symbol: 'BTCUSDT',
      level: 'quick',
      range: '1y',
      timeframes: ['1d'],
      maxDrawdownLimitPct: 30,
      ruinTargetPct: 1,
      seed: 9999,
    },
    (prog) => {
      // Progress received
    }
  );

  const tPipe0 = Date.now();
  const report = await orchestrator.run(candles);
  const tPipeSec = ((Date.now() - tPipe0) / 1000).toFixed(2);
  assert(report.symbol === 'BTCUSDT', 'Report matches symbol');
  assert(report.totalTrialsLogged > 0, `Trials logged for DSR: ${report.totalTrialsLogged}`);
  assert(report.funnelPruning.length === 6, 'All 6 stages (0 through 5) registered in funnel stats');
  assert(report.equityCurve.length > 0, 'Equity curve generated with phase indicators');
  assert(report.benchmark.buyAndHoldReturnPct !== undefined, 'B&H benchmark calculated');
  assert(report.benchmark.dcaReturnPct !== undefined, 'DCA benchmark calculated');
  console.log(`Pipeline run finished in ${tPipeSec}s! Verdict: ${report.verdictType}`);

  console.log('\n======================================================');
  console.log('PART 2: TESTING AUTOMATED EXECUTION ENGINE & RISK LAYER');
  console.log('======================================================');

  const baseIntent: TradingIntent = {
    id: 'test_intent_1',
    strategyId: 'strat_1',
    strategyName: 'استراتيجية الزخم',
    params: { sl: 4.0, tp: 8.0 },
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'entry',
    reason: 'تقاطع إيجابي',
    entryPriceRef: 60000,
    stopPrice: 57600, // 4% SL
    targets: [{ price: 64800, closePct: 100 }], // 8% TP
    signalCandleTime: Date.now() - 60000,
    createdAt: Date.now(),
  };

  const baseSanity = {
    currentPrice: 60000,
    dataAgeSeconds: 1.0,
    estimatedSlippagePct: 0.04,
    spreadPct: 0.05,
    volume24hUsd: 50000000,
    atrValue: 1200,
  };

  // 2.1 Rule 1: Mandatory Stop Loss
  console.log('\n--- 2.1 Risk Rule 1: Mandatory Stop Loss ---');
  const noSlIntent = { ...baseIntent, stopPrice: 0 };
  const decNoSl = evaluateIntentRisk({
    intent: noSlIntent,
    limits: DEFAULT_RISK_LIMITS,
    equity: 10000,
    dailyLossPct: 0,
    weeklyLossPct: 0,
    monthlyLossPct: 0,
    drawdownFromPeakPct: 0,
    openPositions: [],
    consecutiveLosses: 0,
    recentOrdersCount1h: 0,
    recentOrdersCount24h: 0,
    rolloutPhase: 'PAPER',
    recommendedRiskPct: 1.0,
    marketSanity: baseSanity,
    accountDriftPct: 0,
    systemState: 'PAPER',
  });
  assert(decNoSl.status === 'rejected', 'Intent without Stop Loss must be rejected');
  assert(decNoSl.ruleViolatedId === 'RULE_1_MANDATORY_SL', 'Violated rule is RULE_1_MANDATORY_SL');

  // 2.2 Rule 5: Daily Loss Limit HALT
  console.log('\n--- 2.2 Risk Rule 5: Daily Loss Limit triggers HALT ---');
  const decDailyLoss = evaluateIntentRisk({
    intent: baseIntent,
    limits: DEFAULT_RISK_LIMITS,
    equity: 10000,
    dailyLossPct: 2.1, // >= 2.0% daily limit!
    weeklyLossPct: 2.1,
    monthlyLossPct: 2.1,
    drawdownFromPeakPct: 2.1,
    openPositions: [],
    consecutiveLosses: 0,
    recentOrdersCount1h: 0,
    recentOrdersCount24h: 0,
    rolloutPhase: 'PAPER',
    recommendedRiskPct: 1.0,
    marketSanity: baseSanity,
    accountDriftPct: 0,
    systemState: 'PAPER',
  });
  assert(decDailyLoss.status === 'halt_triggered', 'Exceeding daily loss limit must trigger HALT');

  // 2.3 Rule 9: Consecutive Loss Reduction (2 losses -> 50% cut, 3 losses -> cooloff)
  console.log('\n--- 2.3 Risk Rule 9: Consecutive Loss Reduction & Cooloff ---');
  const dec2Losses = evaluateIntentRisk({
    intent: baseIntent,
    limits: DEFAULT_RISK_LIMITS,
    equity: 10000,
    dailyLossPct: 0.5,
    weeklyLossPct: 0.5,
    monthlyLossPct: 0.5,
    drawdownFromPeakPct: 0.5,
    openPositions: [],
    consecutiveLosses: 2, // 2 losses
    recentOrdersCount1h: 1,
    recentOrdersCount24h: 2,
    rolloutPhase: 'PAPER',
    recommendedRiskPct: 1.0,
    marketSanity: baseSanity,
    accountDriftPct: 0,
    systemState: 'PAPER',
  });
  assert(dec2Losses.status === 'reduced', 'After 2 consecutive losses, position must be reduced');
  assert(dec2Losses.reductionRatio === 0.5, `Risk must be halved (50%), got ${dec2Losses.reductionRatio}`);

  const dec3Losses = evaluateIntentRisk({
    intent: baseIntent,
    limits: DEFAULT_RISK_LIMITS,
    equity: 10000,
    dailyLossPct: 0.5,
    weeklyLossPct: 0.5,
    monthlyLossPct: 0.5,
    drawdownFromPeakPct: 0.5,
    openPositions: [],
    consecutiveLosses: 3, // 3 losses -> cooloff!
    recentOrdersCount1h: 1,
    recentOrdersCount24h: 2,
    rolloutPhase: 'PAPER',
    recommendedRiskPct: 1.0,
    marketSanity: baseSanity,
    accountDriftPct: 0,
    systemState: 'PAPER',
  });
  assert(dec3Losses.status === 'rejected', 'After 3 consecutive losses, order must be rejected for cooloff');

  // 2.4 Rule 3: Rollout Phase Discount in LIVE_SMALL
  console.log('\n--- 2.4 Risk Rule 3: LIVE_SMALL 1/4th (25%) Risk Fraction ---');
  const decLiveSmall = evaluateIntentRisk({
    intent: baseIntent,
    limits: DEFAULT_RISK_LIMITS,
    equity: 10000,
    dailyLossPct: 0,
    weeklyLossPct: 0,
    monthlyLossPct: 0,
    drawdownFromPeakPct: 0,
    openPositions: [],
    consecutiveLosses: 0,
    recentOrdersCount1h: 0,
    recentOrdersCount24h: 0,
    rolloutPhase: 'LIVE_SMALL',
    recommendedRiskPct: 1.0,
    marketSanity: baseSanity,
    accountDriftPct: 0,
    systemState: 'LIVE_SMALL',
  });
  assert(decLiveSmall.status === 'reduced', 'LIVE_SMALL must cut risk to 1/4th');
  assert(decLiveSmall.approvedRiskPct === 0.25, `Risk must be 0.25% (got ${decLiveSmall.approvedRiskPct}%)`);

  // 2.5 Anti-Rage 24-Hour Lock on Relaxing Limits
  console.log('\n--- 2.5 Anti-Rage 24-Hour Delay Enforcement ---');
  const updateRes = updateRiskLimitsWithAntiRage(DEFAULT_RISK_LIMITS, { maxRiskPerTradePct: 2.0 });
  assert(updateRes.requiresDelay === true, 'Relaxing risk limit from 1% to 2% requires 24h delay');
  assert(updateRes.effectiveAt !== undefined && updateRes.effectiveAt > Date.now(), 'Effective time is in future');

  // 2.6 PaperAdapter & OrderManager Execution
  console.log('\n--- 2.6 PaperAdapter & OrderManager Execution ---');
  const paper = new PaperAdapter(10000);
  const manager = new OrderManager(paper);
  const approvedDecision = {
    intentId: baseIntent.id,
    status: 'approved' as const,
    approvedQty: 0.05,
    approvedRiskAmount: 100,
    approvedRiskPct: 1.0,
    originalRequestedRiskPct: 1.0,
    reductionRatio: 1.0,
    checkedAt: Date.now(),
  };

  const executed = await manager.executeApprovedIntent(baseIntent, approvedDecision);
  assert(executed !== null, 'Order was executed successfully');
  assert(executed?.state === 'FILLED', 'Paper order filled with depth slippage');
  assert(manager.getOpenPositions().length === 1, 'Position recorded in OrderManager');
  assert(manager.getOpenPositions()[0].hasActiveExchangeStop === true, 'Position has active on-exchange stop order');

  // Test Kill Switch
  const killRes = await manager.executeKillSwitch();
  assert(killRes.canceledCount >= 0, 'Kill Switch executed cleanly without throwing');

  // 2.7 Candle-Close Scanner
  console.log('\n--- 2.7 Candle-Close Scanner ---');
  const scannedIntents = scanCandleCloseSignals([
    {
      symbol: 'BTCUSDT',
      currentPrice: 60000,
      volume24hUsd: 80000000, // > 20M
      spreadPct: 0.03,        // < 0.2%
      rsiValue: 28,           // oversold signal!
      ema9: 61000,
      ema21: 62000,
      atrValue: 1000,
      strategyId: 'rsi_strat',
      strategyName: 'RSI Reversal',
      isGateApproved: true,   // Approved in Gatekeeper
    },
    {
      symbol: 'UNAPPROVED_COIN',
      currentPrice: 10,
      volume24hUsd: 50000000,
      spreadPct: 0.05,
      rsiValue: 20,
      ema9: 11,
      ema21: 12,
      atrValue: 0.5,
      strategyId: 'unapproved_strat',
      strategyName: 'Unapproved',
      isGateApproved: false,  // NOT approved in Gatekeeper
    },
  ]);
  assert(scannedIntents.length === 1, 'Only the gatekeeper-approved coin generates an active intent');
  assert(scannedIntents[0].symbol === 'BTCUSDT', 'Scanned intent is BTCUSDT');

  // 2.8 AI Supervisor Digest
  console.log('\n--- 2.8 Read-Only AI Supervisor Digest ---');
  const supervisor = generateSupervisorDigest({
    intentsCount: 10,
    approvedCount: 8,
    rejectedCount: 2,
    rejectionReasons: ['مسافة الوقف بعيدة'],
    dailyPnlAmount: 220,
    dailyPnlR: 2.2,
    dailyLossConsumedPct: 20,
    avgSlippagePct: 0.03,
    backtestExpectedSlippagePct: 0.035,
  });
  assert(supervisor.digestTextAr.length > 50, 'Supervisor generated Arabic digest text');
  assert(supervisor.disclaimer.includes('مولَّد بالذكاء الاصطناعي'), 'Supervisor output is strictly disclaimed');

  console.log('\n======================================================');
  console.log('🎉 ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runAcceptanceTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
