// Comprehensive Pure Unit Tests for Statistical Evidence & Strategy Gatekeeper
import { Mulberry32 } from '../src/lib/stats/random';
import {
  calculateWilsonScoreInterval,
  calculateMeanExpectancyCI,
  calculateProfitFactorCI,
} from '../src/lib/stats/confidenceIntervals';
import { performExpectancyTTest } from '../src/lib/stats/hypothesisTests';
import { runBootstrapResampling } from '../src/lib/stats/resampling';
import { runPermutationTest } from '../src/lib/stats/permutation';
import { evaluateStrategyDecay } from '../src/lib/stats/decayMonitor';
import { calculateKellyRisk } from '../src/lib/stats/kelly';
import { calculateStatisticalEvidence } from '../src/lib/stats';
import { evaluateStrategyGate } from '../src/lib/gate/gatekeeper';
import { convertBacktestTradesToEvidence } from '../src/lib/stats/tradeAdapter';
import { EvidenceTrade } from '../src/types/evidence';
import { TradeRecord } from '../src/utils/backtestEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

function runAllTests() {
  console.log('\n--- 1. Testing PRNG (mulberry32) ---');
  const rng1 = new Mulberry32(42);
  const val1 = rng1.next();
  const rng2 = new Mulberry32(42);
  const val2 = rng2.next();
  assert(val1 === val2, 'PRNG must be perfectly deterministic given the same seed');
  assert(val1 >= 0 && val1 < 1, 'PRNG output must be between 0 and 1');

  console.log('\n--- 2. Testing Wilson Score Interval ---');
  const winInterval = calculateWilsonScoreInterval(60, 100, 0.95);
  assert(winInterval.point === 0.6, 'Win rate point estimate must equal 0.60');
  assert(
    winInterval.ci95[0] > 0.49 && winInterval.ci95[1] < 0.70,
    `Wilson 95% CI for 60/100 should be ~ [0.50, 0.69], got [${winInterval.ci95[0]}, ${winInterval.ci95[1]}]`
  );

  // Boundary condition: 0/10 trades
  const zeroWin = calculateWilsonScoreInterval(0, 10, 0.95);
  assert(zeroWin.ci95[0] === 0, 'Lower bound of Wilson CI for 0 wins must not be negative');

  console.log('\n--- 3. Testing Student-t Mean Expectancy CI ---');
  const rValuesPositive = [1.5, 2.0, -1.0, 1.8, 2.2, -1.0, 1.4, 2.5, -1.0, 1.6];
  const meanCI = calculateMeanExpectancyCI(rValuesPositive, 0.95);
  assert(meanCI.mean > 0, `Mean expectancy must be positive (got ${meanCI.mean})`);
  assert(meanCI.ci95[1] > meanCI.mean && meanCI.ci95[0] < meanCI.mean, 'CI must enclose the point estimate');

  console.log('\n--- 4. Testing One-tailed Student-t Hypothesis Test ---');
  const tTestProfitable = performExpectancyTTest(rValuesPositive);
  assert(tTestProfitable.tStat > 0, 't-statistic for consistently profitable trades must be positive');
  assert(tTestProfitable.pValue < 0.05, `p-value must be < 0.05 (got ${tTestProfitable.pValue})`);
  assert(tTestProfitable.isSignificant95 === true, 'Test must reject null hypothesis at 95% confidence');

  // Negative trades should fail
  const rValuesNegative = [-1.0, -1.0, -0.8, -1.2, 0.2, -1.0, -1.5];
  const tTestLosing = performExpectancyTTest(rValuesNegative);
  assert(tTestLosing.isSignificant95 === false, 'Negative returns must not be marked significant');
  assert(tTestLosing.pValue >= 0.5, 'Negative returns p-value must be >= 0.5');

  console.log('\n--- 5. Testing Bootstrap Resampling ---');
  const bootstrapRes = runBootstrapResampling(rValuesPositive, {
    iterations: 500,
    seed: 999,
  });
  assert(bootstrapRes.iterations === 500, 'Iterations count must match config');
  assert(
    bootstrapRes.probPositiveExpectancy >= 95,
    `Positive strategy should have high P(E[R]>0), got ${bootstrapRes.probPositiveExpectancy}%`
  );
  assert(bootstrapRes.drawdown95thPercentileR > 0, 'CVaR 95% Max DD must be positive');
  assert(bootstrapRes.probLossStreak3 >= 0 && bootstrapRes.probLossStreak3 <= 100, 'Streak prob must be in [0, 100]');

  console.log('\n--- 6. Testing Permutation Reality Test ---');
  const permRes = runPermutationTest(rValuesPositive, 300, 777);
  assert(permRes.originalSharpe > 0, 'Original Sharpe must be positive');
  assert(permRes.pValPermutation <= 1.0, 'Permutation p-value must be <= 1.0');

  console.log('\n--- 7. Testing CUSUM & Edge Decay Detection ---');
  const healthyDecay = evaluateStrategyDecay({
    baselineExpectancyR: 1.0,
    baselineStdDevR: 1.0,
    recentTradesR: [1.2, 0.9, 1.5, -0.5, 1.1],
  });
  assert(healthyDecay.statusLevel === 'healthy', 'Performing trades must be classified as healthy');
  assert(healthyDecay.isDecayAlert === false, 'No alert should be fired for healthy performance');

  const collapsingDecay = evaluateStrategyDecay({
    baselineExpectancyR: 1.0,
    baselineStdDevR: 1.0,
    recentTradesR: [-1.0, -1.5, -1.2, -1.1, -1.8, -2.0, -1.0, -1.2],
  });
  assert(collapsingDecay.statusLevel === 'critical_decay', 'Severe deficit must trigger critical_decay');
  assert(collapsingDecay.isDecayAlert === true, 'CUSUM barrier must trigger alert');

  console.log('\n--- 8. Testing Kelly Criterion & CI Discounting ---');
  const kellyRes = calculateKellyRisk({
    winRate: 0.6,
    winRateCiLower: 0.5,
    avgWinR: 2.0,
    avgLossR: 1.0,
    maxDisciplineRiskPct: 1.5,
  });
  assert(kellyRes.fullKellyPct > kellyRes.halfKellyPct, 'Full Kelly must exceed Half Kelly');
  assert(
    kellyRes.conservativeKellyPct <= kellyRes.halfKellyPct,
    'Conservative Kelly discounted by CI lower bound must be <= Half Kelly'
  );
  assert(
    kellyRes.appliedCapPct <= 1.5,
    'Applied risk must never exceed user discipline setting'
  );

  console.log('\n--- 9. Testing Strategy Gatekeeper Rules ---');
  // Create 110 trades with proven positive edge (exceeding strict n>=100 requirement)
  const provenTrades: EvidenceTrade[] = [];
  for (let i = 0; i < 110; i++) {
    const isWin = i % 3 !== 0; // 66.7% win rate
    const pnlR = isWin ? 2.0 : -1.0;
    provenTrades.push({
      id: `tr_${i}`,
      entryTime: Date.now() - (110 - i) * 3600000,
      exitTime: Date.now() - (110 - i) * 3600000 + 1800000,
      side: 'long',
      entryPrice: 60000,
      exitPrice: isWin ? 61000 : 59500,
      riskAmount: 100,
      pnlAmount: pnlR * 100,
      pnlR,
      durationBars: 5,
      fees: 2,
      slippage: 1,
      regime: i % 2 === 0 ? 'bull' : 'chop',
      sampleType: i < 80 ? 'inSample' : 'outOfSample',
    });
  }

  const evidenceProven = calculateStatisticalEvidence(provenTrades);
  evidenceProven.deflatedSharpeRatio = 0.96;
  evidenceProven.neighborhoodRobustnessPct = 85;
  evidenceProven.randomEntryBaseline = { pValue: 0.015, medianExpectancyR: -0.05, passed: true };
  evidenceProven.economicHypothesis = {
    text: 'Structural premia in breakout expansion documented institutional flow',
    isDocumented: true,
    documentedDate: '2026-10-15',
  };
  const gateScorecard = evaluateStrategyGate(evidenceProven);
  assert(
    gateScorecard.status === 'approved',
    `Proven 110-trade strategy with t>=2.5, DSR>=0.95 and OOS should be approved, got: ${gateScorecard.status}`
  );
  assert(gateScorecard.incubationAllowed === true, 'Approved strategy must allow incubation');

  // Test failing strategy
  const failingTrades: EvidenceTrade[] = provenTrades.map((t, idx) => ({
    ...t,
    pnlR: idx % 4 === 0 ? 0.5 : -1.0, // largely losing
  }));
  const evidenceFailing = calculateStatisticalEvidence(failingTrades);
  const failScorecard = evaluateStrategyGate(evidenceFailing);
  assert(
    failScorecard.status === 'rejected',
    `Losing strategy must be rejected, got: ${failScorecard.status}`
  );

  console.log('\n--- 10. Testing Trade Adapter ---');
  const dummyBacktestRecords: TradeRecord[] = [
    {
      id: 1,
      entryDate: '2024-01-01',
      exitDate: '2024-01-02',
      entryPrice: 40000,
      exitPrice: 43200,
      profitPercent: 8.0,
      netProfitUSDT: 800,
      capitalAfter: 10800,
      reason: 'TP',
      durationBars: 8,
      regime: 'صاعد (Bullish)',
    },
    {
      id: 2,
      entryDate: '2024-01-03',
      exitDate: '2024-01-04',
      entryPrice: 43000,
      exitPrice: 41280,
      profitPercent: -4.0,
      netProfitUSDT: -400,
      capitalAfter: 10400,
      reason: 'SL',
      durationBars: 4,
      regime: 'عرضي (Ranging)',
    },
  ];

  const adaptedTrades = convertBacktestTradesToEvidence(dummyBacktestRecords, {
    stopLossPct: 4.0,
    initialCapital: 10000,
  });
  assert(adaptedTrades.length === 2, 'Adapter must convert all trades');
  assert(adaptedTrades[0].pnlR === 2.0, `8% profit with 4% SL should be +2.0 R, got ${adaptedTrades[0].pnlR}`);
  assert(adaptedTrades[1].pnlR === -1.0, `-4% loss with 4% SL should be -1.0 R, got ${adaptedTrades[1].pnlR}`);
  assert(adaptedTrades[0].regime === 'bull', 'Arabic bull regime should map to bull');
  assert(adaptedTrades[1].regime === 'chop', 'Arabic range regime should map to chop');

  console.log('\n========================================');
  console.log('🎉 ALL STATISTICAL EVIDENCE & GATEKEEPER TESTS PASSED SUCCESSFULLY!');
  console.log('========================================\n');
}

runAllTests();
