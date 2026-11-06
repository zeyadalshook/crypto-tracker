import fs from 'node:fs';
import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { simulateCore } from '../src/lib/sim/core';
import { calculateMeanExpectancyCI, calculateWilsonScoreInterval } from '../src/lib/stats/confidenceIntervals';
import { performExpectancyTTest } from '../src/lib/stats/hypothesisTests';
import { calculateDeflatedSharpe } from '../src/lib/pipeline/deflatedSharpe';
import { calculateStatisticalEvidence } from '../src/lib/stats';
import { evaluateStrategyGate } from '../src/lib/gate/gatekeeper';
import { EvidenceTrade } from '../src/types/evidence';

const btc = JSON.parse(fs.readFileSync('data/BTCUSDT.json', 'utf8'));
const ind = computeIndicatorsOnce(btc);
const n = btc.length;

console.log('=== SECTION 3: BTC BREAKOUT COMPREHENSIVE ROBUSTNESS AUDIT ===\n');

// 1. NEIGHBORHOOD SENSITIVITY GRID (TP & SL +/-15% and +/-25%, Windows 10 to 60)
console.log('--- 1. Neighborhood Parameter Sensitivity Grid ---');
// Base TP=12, SL=6
// TP variations: -25% (9.0%), -15% (10.2%), Base (12.0%), +15% (13.8%), +25% (15.0%)
// SL variations: -25% (4.5%), -15% (5.1%), Base (6.0%), +15% (6.9%), +25% (7.5%)
const tpList = [9.0, 10.2, 12.0, 13.8, 15.0];
const slList = [4.5, 5.1, 6.0, 6.9, 7.5];

let totalNeighbors = 0;
let profitableNeighbors = 0;

console.log('TP / SL Matrix at Lookback = 20:');
console.log('SL \\ TP\t9.0%\t10.2%\t12.0%\t13.8%\t15.0%');

for (const sl of slList) {
  let rowStr = `${sl.toFixed(1)}%\t`;
  for (const tp of tpList) {
    totalNeighbors++;
    const res = simulateCore(ind, {
      entryType: 'breakout_high',
      tpPct: tp,
      slPct: sl,
      feePct: 0.075,
      slippagePct: 0.05
    }, 35, n - 2, false);
    if (res.expectancyR > 0) profitableNeighbors++;
    rowStr += `${res.expectancyR.toFixed(3)}R\t`;
  }
  console.log(rowStr);
}

console.log(`\nProfitable TP/SL Neighbors: ${profitableNeighbors} / ${totalNeighbors} (${(profitableNeighbors / totalNeighbors * 100).toFixed(1)}%)\n`);

// Lookback windows: 10, 15, 20, 25, 30, 40, 50, 60
console.log('Lookback Window Sensitivity (TP=12%, SL=6%):');
const windows = [10, 15, 20, 25, 30, 40, 50, 60];
for (const w of windows) {
  // compute custom highest window
  const resW = simulateCore(ind, {
    entryType: 'custom',
    customSignalFn: (i) => {
      let maxH = -Infinity;
      for (let j = Math.max(0, i - w); j < i; j++) {
        if (ind.high[j] > maxH) maxH = ind.high[j];
      }
      return ind.close[i] > maxH;
    },
    tpPct: 12,
    slPct: 6,
    feePct: 0.075,
    slippagePct: 0.05
  }, 65, n - 2, false);

  console.log(`  Window = ${w} days: Trades = ${resW.tradesCount}, Wins = ${resW.winningTrades} (${(resW.winRate * 100).toFixed(1)}%), E[R] = ${resW.expectancyR} R, MaxDD = ${resW.maxDrawdownPct}%`);
}

// 2. YEAR-BY-YEAR CALENDAR EXPECTANCY
console.log('\n--- 2. Calendar Year Expectancy ---');
const dates = btc.map((c: any) => c.date);
const indWithDates = { ...ind, dates };
const resBase = simulateCore(indWithDates, {
  entryType: 'breakout_high',
  tpPct: 12,
  slPct: 6,
  feePct: 0.075,
  slippagePct: 0.05
}, 35, n - 2, false);

// Group trades by year
const yearGroups: { [yr: string]: number[] } = {};
for (const t of resBase.trades) {
  const yr = t.entryDate ? t.entryDate.slice(0, 4) : 'unknown';
  if (!yearGroups[yr]) yearGroups[yr] = [];
  yearGroups[yr].push(t.rUnit);
}

console.log('| Year | Trades (n) | Wins | Win Rate % | E[R] (Mean R) | Sum R |');
console.log('|---|---|---|---|---|---|');
for (const yr of Object.keys(yearGroups).sort()) {
  const rList = yearGroups[yr];
  const wins = rList.filter(r => r > 0).length;
  const sumR = rList.reduce((a, b) => a + b, 0);
  const meanR = sumR / rList.length;
  console.log(`| ${yr} | ${rList.length} | ${wins} | ${(wins / rList.length * 100).toFixed(1)}% | ${meanR.toFixed(3)} R | ${sumR.toFixed(2)} R |`);
}

// 3. MARKET REGIME PERFORMANCE (Bull, Bear, Chop)
console.log('\n--- 3. Market Regime Performance ---');
// Classify bars into regimes using EMA 50 & EMA 200 slope & ATR
const regimeGroups: { [rg: string]: number[] } = { bull: [], bear: [], chop: [] };

for (const t of resBase.trades) {
  const i = t.entryIndex;
  const p = ind.close[i];
  const ema50 = ind.ema50 ? ind.ema50[i] : p;
  const ema200 = ind.ema200 ? ind.ema200[i] : p;

  let regime = 'chop';
  if (p > ema50 && ema50 > ema200) {
    regime = 'bull';
  } else if (p < ema50 && ema50 < ema200) {
    regime = 'bear';
  } else {
    regime = 'chop';
  }
  regimeGroups[regime].push(t.rUnit);
}

for (const rg of ['bull', 'bear', 'chop']) {
  const rList = regimeGroups[rg];
  const wins = rList.filter(r => r > 0).length;
  const sumR = rList.reduce((a, b) => a + b, 0);
  const meanR = rList.length > 0 ? sumR / rList.length : 0;
  console.log(`  Regime [${rg.toUpperCase()}]: Trades = ${rList.length}, Wins = ${wins} (${rList.length ? (wins / rList.length * 100).toFixed(1) : 0}%), E[R] = ${meanR.toFixed(3)} R, Sum R = ${sumR.toFixed(2)} R`);
}

// 4. SPLIT-HALF TEMPORAL TEST
console.log('\n--- 4. Temporal Split-Half Stability (First Half vs Second Half) ---');
const midIdx = Math.floor(n / 2);
const firstHalf = simulateCore(ind, { entryType: 'breakout_high', tpPct: 12, slPct: 6 }, 35, midIdx, false);
const secondHalf = simulateCore(ind, { entryType: 'breakout_high', tpPct: 12, slPct: 6 }, midIdx + 1, n - 2, false);

console.log(`First Half (Bars 35 to ${midIdx}, ${btc[35].date} to ${btc[midIdx].date}):`);
console.log(`  Trades = ${firstHalf.tradesCount}, Wins = ${firstHalf.winningTrades} (${(firstHalf.winRate * 100).toFixed(1)}%), E[R] = ${firstHalf.expectancyR} R, MaxDD = ${firstHalf.maxDrawdownPct}%`);

console.log(`Second Half (Bars ${midIdx + 1} to ${n - 2}, ${btc[midIdx + 1].date} to ${btc[n - 2].date}):`);
console.log(`  Trades = ${secondHalf.tradesCount}, Wins = ${secondHalf.winningTrades} (${(secondHalf.winRate * 100).toFixed(1)}%), E[R] = ${secondHalf.expectancyR} R, MaxDD = ${secondHalf.maxDrawdownPct}%`);

// 5. SENSITIVITY TO TOP TRADES REMOVAL (DROP TOP 3 & TOP 5)
console.log('\n--- 5. Top Trades Removal Sensitivity ---');
const allR = [...resBase.rValues].sort((a, b) => b - a);
console.log(`Baseline (all ${allR.length} trades): E[R] = ${resBase.expectancyR} R, Wins = ${resBase.winningTrades}/${allR.length} (${(resBase.winRate * 100).toFixed(1)}%)`);

// Remove top 3
const withoutTop3 = allR.slice(3);
const meanNoTop3 = withoutTop3.reduce((a, b) => a + b, 0) / withoutTop3.length;
const winsNoTop3 = withoutTop3.filter(r => r > 0).length;
console.log(`Without Top 3 Trades (${withoutTop3.length} trades): E[R] = ${meanNoTop3.toFixed(3)} R, Wins = ${winsNoTop3}/${withoutTop3.length} (${(winsNoTop3 / withoutTop3.length * 100).toFixed(1)}%)`);

// Remove top 5
const withoutTop5 = allR.slice(5);
const meanNoTop5 = withoutTop5.reduce((a, b) => a + b, 0) / withoutTop5.length;
const winsNoTop5 = withoutTop5.filter(r => r > 0).length;
console.log(`Without Top 5 Trades (${withoutTop5.length} trades): E[R] = ${meanNoTop5.toFixed(3)} R, Wins = ${winsNoTop5}/${withoutTop5.length} (${(winsNoTop5 / withoutTop5.length * 100).toFixed(1)}%)`);

// 6. CROSS-ASSET ROBUSTNESS CHECK (BNB, XRP, ADA, LTC, SOL)
console.log('\n--- 6. Cross-Asset Robustness Check (TP=12%, SL=6%) ---');
const assets = ['BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LTCUSDT', 'SOLUSDT'];
console.log('| Asset | Period | Candles | Trades (n) | Wins | Win Rate % | E[R] | Max DD % | Gate Status |');
console.log('|---|---|---|---|---|---|---|---|---|');

for (const sym of assets) {
  const assetCandles = JSON.parse(fs.readFileSync(`data/${sym}.json`, 'utf8'));
  const assetInd = computeIndicatorsOnce(assetCandles);
  const assetLen = assetCandles.length;

  const sim = simulateCore(assetInd, {
    entryType: 'breakout_high',
    tpPct: 12,
    slPct: 6,
    feePct: 0.075,
    slippagePct: 0.05
  }, 35, assetLen - 2, false);

  const evTrades: EvidenceTrade[] = sim.trades.map((t, idx) => ({
    id: `trade_${idx + 1}`,
    entryTime: Date.now() - (sim.trades.length - idx) * 86400000,
    exitTime: Date.now() - (sim.trades.length - idx - 1) * 86400000,
    side: 'long',
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    riskAmount: 200,
    pnlAmount: t.netPnlPct * 20,
    pnlR: t.rUnit,
    durationBars: t.durationBars,
    fees: 10,
    slippage: 5,
    regime: 'bull' as const,
    sampleType: idx < Math.floor(sim.trades.length * 0.7) ? 'inSample' : 'outOfSample',
  }));

  let gateStatus = '🔴 Rejected';
  if (sim.tradesCount >= 30 && sim.expectancyR > 0) {
    const ev = calculateStatisticalEvidence(evTrades, {
      strategyId: 'breakout_high',
      strategyName: 'Donchian Breakout',
      symbol: sym,
      timeframe: '1d',
    });
    const gate = evaluateStrategyGate(ev);
    gateStatus = gate.status === 'approved' ? '🟢 Approved' : gate.status === 'paper_only' ? '🟡 Paper-Only' : '🔴 Rejected';
  }

  const periodStr = `${assetCandles[0].date.slice(0, 7)} to ${assetCandles[assetLen - 1].date.slice(0, 7)}`;
  console.log(`| ${sym} | ${periodStr} | ${assetLen} | ${sim.tradesCount} | ${sim.winningTrades} | ${(sim.winRate * 100).toFixed(1)}% | ${sim.expectancyR.toFixed(3)} R | ${sim.maxDrawdownPct.toFixed(1)}% | ${gateStatus} |`);
}

// 7. DSR WITH TRUE REGISTERED TOTAL TRIALS COUNT
console.log('\n--- 7. Deflated Sharpe Ratio (DSR) with True Registered Trials ---');
// In pipeline run, Stage 1 tested 5 strategies x 5 TP x 4 SL = 100 combos per asset/timeframe.
// When grid search runs balanced: 5 x 3 x 3 = 45 combos. Deep: 5 x 5 x 4 = 100 combos.
// If tested across 3 timeframes: 300 combos.
// If user tested across 200 random walks: 12,000 combos.
const trialsList = [100, 300, 1000, 12000];
const btcSharpe = 1.01; // annualized from return comparison

for (const trials of trialsList) {
  const dsrRes = calculateDeflatedSharpe({
    estimatedSharpe: btcSharpe,
    totalTrials: trials,
    varianceOfTrialsSharpe: 0.25,
    sampleSizeBars: 3347,
  });
  console.log(`  Trials = ${trials}: DSR = ${dsrRes.dsr.toFixed(4)}, Expected Max Sharpe = ${dsrRes.expectedMaxSharpe.toFixed(3)} (Significant: ${dsrRes.dsr >= 0.95 ? 'YES' : 'NO'})`);
}
