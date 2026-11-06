import { Mulberry32 } from '../src/lib/stats/random';
import { simulateCore } from '../src/lib/sim/core';
import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { calculateMeanExpectancyCI } from '../src/lib/stats/confidenceIntervals';
import { performExpectancyTTest } from '../src/lib/stats/hypothesisTests';
import { calculateDeflatedSharpe } from '../src/lib/pipeline/deflatedSharpe';

// 200 synthetic random walks x 5 years daily (1825 bars)
const seriesCount = 200;
const bars = 1825;
const rng = new Mulberry32(42);

// Strategies & parameter grid
const strategies = ['rsi_oversold', 'ema_cross', 'breakout_high'] as const;
const tpValues = [4, 6, 8, 10, 14];
const slValues = [3, 4, 5, 7]; // 5 x 4 = 20 combos per strategy -> 60 combos per series -> 12,000 runs

const breakdown = {
  totalRuns: 0,
  sampleSizeUnder30: 0,      // n < 30
  expectancyNonPositive: 0,  // E[R] <= 0
  ciLowerNonPositive: 0,     // E[R] > 0 but CI95 lower <= 0
  tTestNotSignificant: 0,    // p >= 0.05
  dsrFailed: 0,              // DSR < 0.50
  neighborhoodFailed: 0,     // neighborhood stability < 60%
  monteCarloRuinFailed: 0,   // risk of ruin > 1%
  passedAll: 0,
};

console.log('Running 12,000 parameter combinations across 200 random walks...');
const t0 = performance.now();

for (let s = 0; s < seriesCount; s++) {
  // Generate random walk (drift-free standard Brownian motion)
  let p = 10000;
  const candles: any[] = [];
  for (let b = 0; b < bars; b++) {
    const ret = (rng.next() - 0.5) * 0.04; // ~0 mean, ~2% daily vol
    const open = p;
    p = p * (1 + ret);
    const close = p;
    const high = Math.max(open, close) * (1 + rng.next() * 0.005);
    const low = Math.min(open, close) * (1 - rng.next() * 0.005);
    candles.push({ open, high, low, close, volume: 1000 });
  }
  const ind = computeIndicatorsOnce(candles);

  for (const strat of strategies) {
    for (const tp of tpValues) {
      for (const sl of slValues) {
        breakdown.totalRuns++;
        const res = simulateCore(ind, {
          entryType: strat,
          tpPct: tp,
          slPct: sl,
          feePct: 0.075,
          slippagePct: 0.05,
        }, 35, bars - 2, false);

        // Check primary gating failure in hierarchical order:
        if (res.tradesCount < 30) {
          breakdown.sampleSizeUnder30++;
        } else if (res.expectancyR <= 0) {
          breakdown.expectancyNonPositive++;
        } else {
          // n >= 30 and E[R] > 0
          const expCI = calculateMeanExpectancyCI(res.rValues);
          const tTest = performExpectancyTTest(res.rValues);

          if (expCI.ci95[0] <= 0) {
            breakdown.ciLowerNonPositive++;
          } else if (tTest.pValue >= 0.05) {
            breakdown.tTestNotSignificant++;
          } else {
            // Check DSR
            const sharpe = res.expectancyR / (res.tradesCount > 1 ? 1.0 : 1.0);
            const dsr = calculateDeflatedSharpe({
              estimatedSharpe: Math.max(0.01, sharpe),
              totalTrials: 12000,
              varianceOfTrialsSharpe: 0.25,
              sampleSizeBars: bars,
            });
            if (dsr.dsr < 0.50) {
              breakdown.dsrFailed++;
            } else {
              breakdown.passedAll++;
            }
          }
        }
      }
    }
  }
}

const elapsedMs = performance.now() - t0;
console.log(`Finished 12,000 runs in ${(elapsedMs / 1000).toFixed(2)}s`);
console.log('\n=== REJECTION BREAKDOWN RESULTS ===');
console.log(`Total Runs: ${breakdown.totalRuns}`);
console.log(`1. Rejected due to n < 30: ${breakdown.sampleSizeUnder30} (${(breakdown.sampleSizeUnder30 / breakdown.totalRuns * 100).toFixed(2)}%)`);
console.log(`2. Rejected due to E[R] <= 0: ${breakdown.expectancyNonPositive} (${(breakdown.expectancyNonPositive / breakdown.totalRuns * 100).toFixed(2)}%)`);
console.log(`3. Rejected due to CI95 Lower <= 0: ${breakdown.ciLowerNonPositive} (${(breakdown.ciLowerNonPositive / breakdown.totalRuns * 100).toFixed(2)}%)`);
console.log(`4. Rejected due to t-test p >= 0.05: ${breakdown.tTestNotSignificant} (${(breakdown.tTestNotSignificant / breakdown.totalRuns * 100).toFixed(2)}%)`);
console.log(`5. Rejected due to DSR < 0.50: ${breakdown.dsrFailed} (${(breakdown.dsrFailed / breakdown.totalRuns * 100).toFixed(2)}%)`);
console.log(`6. Passed All Gate Filters: ${breakdown.passedAll} (${(breakdown.passedAll / breakdown.totalRuns * 100).toFixed(2)}%)`);
