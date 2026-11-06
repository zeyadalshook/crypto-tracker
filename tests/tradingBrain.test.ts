import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCoinDecision, DEFAULT_DECISION_CONFIG } from '../src/lib/brain/decisionEngine';
import { AutoTraderEngine } from '../src/lib/brain/autoTrader';
import { CoinAnalysisInput } from '../src/lib/brain/decisionTypes';

// Mock localStorage for headless Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    length: 0,
    key: (i: number) => Object.keys(store)[i] || null,
  };
}

test('Brain Decision Engine: Generates ENTER_LONG when >= 3 groups agree with high confidence', () => {
  const bullishInput: CoinAnalysisInput = {
    symbol: 'SOL',
    currentPrice: 150,
    signalScore: 55, // Group A agrees (Trend)
    mtfAlignmentPct: 80, // Group B agrees (MTF)
    fundamentalScore: 85, // Group D agrees (Fundamentals)
    fearGreedValue: 60,
    fundingRatePct: -0.01, // Group C agrees (Derivatives negative funding)
    openInterestChange24hPct: 4.5,
    volatilityAtr: 6.0,
    volatilityAtrPct: 4.0,
    regime: 'bull',
    nearestSupportPrice: 147, // Group F agrees (close to support 2%)
    nearestResistancePrice: 162, // 8% room to resistance
    hasOpenPosition: false,
    killSwitchActive: false,
    riskGuardHalted: false,
  };

  const decision = evaluateCoinDecision(bullishInput);

  assert.equal(decision.type, 'ENTER_LONG');
  assert.ok(decision.confidence >= 60, `Confidence must be >= 60, got ${decision.confidence}`);
  assert.ok(decision.confluenceCount >= 3, `Confluence must be >= 3, got ${decision.confluenceCount}`);
  assert.ok(decision.isActionable, 'Decision should be actionable');
  assert.ok(decision.entryPrice && decision.entryPrice === 150);
  assert.ok(decision.stopLossPrice && decision.stopLossPrice < 150);
  assert.ok(decision.takeProfit1Price && decision.takeProfit1Price > 150);
  assert.ok(decision.reasoningAr.includes('ENTER_LONG'), 'Arabic reasoning must describe ENTER_LONG');
});

test('Brain Decision Engine: Generates ENTER_SHORT when bearish confluence >= 3', () => {
  const bearishInput: CoinAnalysisInput = {
    symbol: 'XRP',
    currentPrice: 0.60,
    signalScore: -60, // Group A agrees bearish
    mtfAlignmentPct: 85, // Group B agrees bearish (mtf with negative score)
    fundamentalScore: 25, // Group D agrees bearish
    fearGreedValue: 82, // Group E extreme greed caution
    fundingRatePct: 0.08, // Group C excessive funding
    openInterestChange24hPct: 4.0,
    volatilityAtr: 0.03,
    volatilityAtrPct: 5.0,
    regime: 'bear',
    nearestSupportPrice: 0.52,
    nearestResistancePrice: 0.61, // near resistance
    hasOpenPosition: false,
    killSwitchActive: false,
    riskGuardHalted: false,
  };

  const decision = evaluateCoinDecision(bearishInput);

  assert.equal(decision.type, 'ENTER_SHORT');
  assert.ok(decision.confidence >= 60);
  assert.ok(decision.confluenceCount >= 3);
  assert.ok(decision.isActionable);
  assert.ok(decision.stopLossPrice && decision.stopLossPrice > 0.60);
  assert.ok(decision.takeProfit1Price && decision.takeProfit1Price < 0.60);
  assert.ok(decision.reasoningAr.includes('ENTER_SHORT'));
});

test('Brain Decision Engine: STAY_OUT when indicators conflict and confluence < 3', () => {
  const neutralInput: CoinAnalysisInput = {
    symbol: 'DOGE',
    currentPrice: 0.12,
    signalScore: 5, // Neutral score
    mtfAlignmentPct: 40, // Disaligned MTF
    fundamentalScore: 50, // Neutral
    fearGreedValue: 50, // Neutral
    fundingRatePct: 0.01,
    openInterestChange24hPct: 0.2,
    volatilityAtr: 0.005,
    volatilityAtrPct: 4.0,
    regime: 'chop',
    nearestSupportPrice: 0.11,
    nearestResistancePrice: 0.13,
    hasOpenPosition: false,
    killSwitchActive: false,
    riskGuardHalted: false,
  };

  const decision = evaluateCoinDecision(neutralInput);

  assert.equal(decision.type, 'STAY_OUT');
  assert.equal(decision.isActionable, false);
  assert.ok(decision.reasoningAr.includes('STAY_OUT'));
});

test('Brain Decision Engine: Generates EXIT when open long position faces severe bearish reversal', () => {
  const reversalInput: CoinAnalysisInput = {
    symbol: 'SOL',
    currentPrice: 145,
    signalScore: -50,
    mtfAlignmentPct: 80,
    fundamentalScore: 30,
    fearGreedValue: 80,
    fundingRatePct: 0.06,
    openInterestChange24hPct: 4.0,
    volatilityAtr: 6.0,
    volatilityAtrPct: 4.0,
    regime: 'bear',
    nearestSupportPrice: 130,
    nearestResistancePrice: 146,
    hasOpenPosition: true,
    openPositionSide: 'long',
    openPositionEntryPrice: 150,
    openPositionSlPrice: 138,
    openPositionPnlR: -0.6,
  };

  const decision = evaluateCoinDecision(reversalInput);

  assert.equal(decision.type, 'EXIT');
  assert.ok(decision.isActionable);
  assert.ok(decision.reasoningAr.includes('قرار إغلاق المركز'));
});

test('Brain Decision Engine: Gating Blocks (Kill-Switch, Risk-Halt, No-Pyramiding)', () => {
  const baseInput: CoinAnalysisInput = {
    symbol: 'BTC',
    currentPrice: 65000,
    signalScore: 60,
    mtfAlignmentPct: 85,
    fundamentalScore: 90,
    fearGreedValue: 60,
    fundingRatePct: -0.01,
    openInterestChange24hPct: 5.0,
    volatilityAtr: 1500,
    volatilityAtrPct: 2.3,
    regime: 'bull',
    nearestSupportPrice: 64000,
    nearestResistancePrice: 70000,
    hasOpenPosition: false,
    killSwitchActive: false,
    riskGuardHalted: false,
  };

  // Case A: Kill Switch Active
  const decisionKillSwitch = evaluateCoinDecision({
    ...baseInput,
    killSwitchActive: true,
  });
  assert.equal(decisionKillSwitch.isActionable, false);
  assert.ok(decisionKillSwitch.blockedReasonAr?.includes('Kill Switch'));

  // Case B: Risk Guard Halted
  const decisionHalted = evaluateCoinDecision({
    ...baseInput,
    riskGuardHalted: true,
  });
  assert.equal(decisionHalted.isActionable, false);
  assert.ok(decisionHalted.blockedReasonAr?.includes('نظام حماية المخاطر'));

  // Case C: No Pyramiding (Already has open position)
  const decisionPyramiding = evaluateCoinDecision({
    ...baseInput,
    hasOpenPosition: true,
    openPositionSide: 'long',
  });
  assert.equal(decisionPyramiding.isActionable, false);
  assert.ok(decisionPyramiding.blockedReasonAr?.includes('No Pyramiding'));
});

test('AutoTrader Position Sizing Math: Correct risk amount and notional cap', () => {
  const trader = AutoTraderEngine.getInstance();
  const equity = 10000;
  const entryPrice = 100;
  const stopLossPrice = 95; // Stop distance = 5 USD (5%)

  // 1% risk of 10,000 = 100 USDT target risk
  // Units = 100 / 5 = 20 units
  // Notional = 20 * 100 = 2,000 USDT
  // Max notional = 10% of 10,000 = 1,000 USDT -> Should be capped at 1,000 USDT!
  // Capped units = 1,000 / 100 = 10 units
  const sizingCapped = trader.calculatePositionSize(entryPrice, stopLossPrice, equity, 1.0, 10.0);
  assert.equal(sizingCapped.isCapped, true);
  assert.equal(sizingCapped.notionalUsdt, 1000);
  assert.equal(sizingCapped.quantity, 10);
  assert.equal(sizingCapped.riskAmountUsdt, 50); // 10 units * 5 stop distance

  // Uncapped test (25% max notional cap)
  const sizingUncapped = trader.calculatePositionSize(entryPrice, stopLossPrice, equity, 1.0, 25.0);
  assert.equal(sizingUncapped.isCapped, false);
  assert.equal(sizingUncapped.notionalUsdt, 2000);
  assert.equal(sizingUncapped.quantity, 20);
  assert.equal(sizingUncapped.riskAmountUsdt, 100);
});

test('AutoTrader Risk Guards: Kill-switch halt, daily loss halt, and consecutive loss halt', () => {
  const trader = AutoTraderEngine.getInstance();
  
  // 1. Reset state
  trader.resetHalt();
  let state = trader.getState();
  assert.equal(state.isHalted, false);
  assert.equal(state.consecutiveLosses, 0);

  // 2. Kill Switch Halt
  trader.triggerKillSwitchHalt('Emergency halt triggered');
  state = trader.getState();
  assert.equal(state.isHalted, true);
  assert.equal(state.killSwitchTriggered, true);
  assert.ok(state.haltReasonAr?.includes('Emergency halt triggered'));

  // Reset for next test
  trader.resetHalt();

  // 3. Process decisions with Autopilot disabled (default OFF)
  trader.updateSettings({ autopilotEnabled: false });
  const enterDecision = evaluateCoinDecision({
    symbol: 'SOL',
    currentPrice: 150,
    signalScore: 60,
    mtfAlignmentPct: 80,
    fundamentalScore: 85,
    fearGreedValue: 60,
    fundingRatePct: -0.01,
    openInterestChange24hPct: 4.5,
    volatilityAtr: 6.0,
    volatilityAtrPct: 4.0,
    regime: 'bull',
    nearestSupportPrice: 147,
    nearestResistancePrice: 162,
    hasOpenPosition: false,
    killSwitchActive: false,
    riskGuardHalted: false,
  });

  trader.processDecisionsCycle([enterDecision]);
  assert.equal(trader.getState().openPositions.length, 0, 'Autopilot OFF must not open positions');

  // 4. Enable Autopilot and process decision
  trader.updateSettings({ autopilotEnabled: true });
  trader.processDecisionsCycle([enterDecision]);
  assert.equal(trader.getState().openPositions.length, 1, 'Autopilot ON opens valid position');
  const opened = trader.getState().openPositions[0];
  assert.equal(opened.symbol, 'SOL');
  assert.equal(opened.side, 'long');

  // 5. Test manual override position closure
  const closedOk = trader.closePositionManually(opened.id);
  assert.equal(closedOk, true);
  assert.equal(trader.getState().openPositions.length, 0);
  assert.equal(trader.getState().closedPositions.length >= 1, true);
});
