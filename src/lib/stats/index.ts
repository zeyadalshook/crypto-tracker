// Master Statistical Evidence Aggregator
// Converts trades into rigorous statistical evidence with confidence intervals and hypothesis tests

import {
  EvidenceTrade,
  StatisticalEvidence,
  RegimeRobustnessResult,
  OutOfSampleDegradation,
  YearlyPerformanceResult,
} from '../../types/evidence';
import {
  calculateWilsonScoreInterval,
  calculateMeanExpectancyCI,
  calculateProfitFactorCI,
} from './confidenceIntervals';
import { performExpectancyTTest } from './hypothesisTests';
import { runBootstrapResampling } from './resampling';
import { runPermutationTest } from './permutation';
import { calculateKellyRisk } from './kelly';

export interface EvidenceCalculationOptions {
  strategyId?: string;
  strategyName?: string;
  symbol?: string;
  timeframe?: string;
  maxDisciplineRiskPct?: number;
  bootstrapSeed?: number;
  bootstrapIterations?: number;
}

export function calculateStatisticalEvidence(
  trades: EvidenceTrade[],
  options: EvidenceCalculationOptions = {}
): StatisticalEvidence {
  const {
    strategyId = 'strat_1',
    strategyName = 'استراتيجية التداول',
    symbol = 'BTCUSDT',
    timeframe = '1h',
    maxDisciplineRiskPct = 1.0,
    bootstrapSeed = 4242,
    bootstrapIterations = 1200,
  } = options;

  const n = trades.length;
  const rValues = trades.map((t) => t.pnlR);

  // 1. Win Rate with Wilson Score CI
  const winningTrades = trades.filter((t) => t.pnlR > 0);
  const losingTrades = trades.filter((t) => t.pnlR < 0);
  const winRateMetric = calculateWilsonScoreInterval(winningTrades.length, n, 0.95);

  // 2. Expectancy (Mean R) with Student-t CI
  const expectancyMetric = calculateMeanExpectancyCI(rValues, 0.95);

  // 3. Profit Factor with CI
  const grossProfitR = winningTrades.reduce((s, t) => s + t.pnlR, 0);
  const grossLossR = Math.abs(losingTrades.reduce((s, t) => s + t.pnlR, 0));
  const profitFactorMetric = calculateProfitFactorCI(
    grossProfitR,
    grossLossR,
    winningTrades.length,
    losingTrades.length
  );

  // 4. Sharpe, Sortino & Calmar
  let sharpePoint = 0;
  let sortinoPoint = 0;
  if (expectancyMetric.stdDev > 0) {
    sharpePoint = expectancyMetric.mean / expectancyMetric.stdDev;
  }
  // Downside deviation for Sortino
  const downsideVariance =
    rValues.reduce((s, v) => (v < 0 ? s + Math.pow(v, 2) : s), 0) / Math.max(1, losingTrades.length);
  const downsideDev = Math.sqrt(downsideVariance);
  if (downsideDev > 0) {
    sortinoPoint = expectancyMetric.mean / downsideDev;
  }

  // 5. Max Drawdown in R & Percentage
  let peakR = 0;
  let currentR = 0;
  let maxDrawdownR = 0;
  let currentDdDuration = 0;
  let maxDdDuration = 0;

  for (const r of rValues) {
    currentR += r;
    if (currentR > peakR) {
      peakR = currentR;
      currentDdDuration = 0;
    } else {
      currentDdDuration++;
      if (currentDdDuration > maxDdDuration) {
        maxDdDuration = currentDdDuration;
      }
    }
    const dd = peakR - currentR;
    if (dd > maxDrawdownR) {
      maxDrawdownR = dd;
    }
  }

  const maxDrawdownPct = n > 0 ? (maxDrawdownR / Math.max(1, n * 0.5)) * 10 : 0;
  const calmarRatio =
    maxDrawdownR > 0
      ? Number(((expectancyMetric.mean * n) / maxDrawdownR).toFixed(2))
      : 0;

  // 6. One-Tailed Student's t-test
  const tTest = performExpectancyTTest(rValues);

  // 7. Bootstrap Resampling
  const bootstrap = runBootstrapResampling(rValues, {
    iterations: bootstrapIterations,
    seed: bootstrapSeed,
    ruinDrawdownR: 20,
  });

  // 8. Permutation Test
  const permutationTest = runPermutationTest(rValues, 800, bootstrapSeed + 100);

  // 9. In-Sample vs Out-of-Sample Degradation
  let outOfSampleDegradation: OutOfSampleDegradation | undefined = undefined;
  const inSampleTrades = trades.filter(
    (t) => t.sampleType === 'inSample' || !t.sampleType
  );
  const outOfSampleTrades = trades.filter(
    (t) => t.sampleType === 'outOfSample' || t.sampleType === 'walkForward'
  );

  if (inSampleTrades.length >= 10 && outOfSampleTrades.length >= 5) {
    const isR = inSampleTrades.map((t) => t.pnlR);
    const oosR = outOfSampleTrades.map((t) => t.pnlR);

    const isMean = isR.reduce((s, v) => s + v, 0) / isR.length;
    const oosMean = oosR.reduce((s, v) => s + v, 0) / oosR.length;

    const isWinRate = inSampleTrades.filter((t) => t.pnlR > 0).length / isR.length;
    const oosWinRate = outOfSampleTrades.filter((t) => t.pnlR > 0).length / oosR.length;

    const degradationPct =
      isMean > 0 ? ((isMean - oosMean) / isMean) * 100 : 0;

    outOfSampleDegradation = {
      inSampleTradesCount: inSampleTrades.length,
      outOfSampleTradesCount: outOfSampleTrades.length,
      inSampleExpectancyR: Number(isMean.toFixed(3)),
      outOfSampleExpectancyR: Number(oosMean.toFixed(3)),
      inSampleWinRate: Number(isWinRate.toFixed(3)),
      outOfSampleWinRate: Number(oosWinRate.toFixed(3)),
      degradationPct: Number(degradationPct.toFixed(1)),
      passedDegradationTest: degradationPct <= 35 && oosMean > 0,
    };
  }

  // 10. Regime Robustness
  const regimeMap: Record<string, EvidenceTrade[]> = {
    bull: [],
    bear: [],
    chop: [],
    highVol: [],
    lowVol: [],
  };

  for (const t of trades) {
    if (regimeMap[t.regime]) {
      regimeMap[t.regime].push(t);
    } else {
      regimeMap.chop.push(t);
    }
  }

  const regimeNamesAr: Record<string, string> = {
    bull: 'صاعد (Bullish)',
    bear: 'هابط (Bearish)',
    chop: 'عرضي / تذبذب (Chop/Range)',
    highVol: 'تقلب حاد (High Vol)',
    lowVol: 'هدوء سعري (Low Vol)',
  };

  const coreRegimes = ['bull', 'bear', 'chop'] as const;
  const allRegimeKeys = Array.from(new Set([...coreRegimes, ...Object.keys(regimeMap)]));

  const regimeRobustness: RegimeRobustnessResult[] = allRegimeKeys.map((regimeKey) => {
    const rTrades = regimeMap[regimeKey] || [];
    const count = rTrades.length;
    const isSufficient = count >= 10;
    const sampleNote = isSufficient ? undefined : `عينة غير كافية (${count} < 10)`;

    if (count === 0) {
      return {
        regime: regimeKey as any,
        regimeNameAr: regimeNamesAr[regimeKey] || regimeKey,
        tradesCount: 0,
        winRate: 0,
        winRateCi95: [0, 0] as [number, number],
        expectancyR: 0,
        expectancyCi95: [0, 0] as [number, number],
        profitFactor: 0,
        isProfitable: false,
        isSufficientSample: false,
        sampleNoteAr: 'عينة غير كافية (0 < 10)',
      };
    }

    const rVals = rTrades.map((t) => t.pnlR);
    const wins = rTrades.filter((t) => t.pnlR > 0).length;
    const winCi = calculateWilsonScoreInterval(wins, count);
    const expCi = calculateMeanExpectancyCI(rVals);

    const gp = rTrades.filter((t) => t.pnlR > 0).reduce((s, t) => s + t.pnlR, 0);
    const gl = Math.abs(rTrades.filter((t) => t.pnlR < 0).reduce((s, t) => s + t.pnlR, 0));
    const pf = gl > 0 ? gp / gl : gp > 0 ? 5.0 : 1.0;

    return {
      regime: regimeKey as any,
      regimeNameAr: regimeNamesAr[regimeKey] || regimeKey,
      tradesCount: count,
      winRate: winCi.point,
      winRateCi95: winCi.ci95,
      expectancyR: expCi.mean,
      expectancyCi95: expCi.ci95,
      profitFactor: Number(pf.toFixed(2)),
      isProfitable: expCi.mean > 0,
      isSufficientSample: isSufficient,
      sampleNoteAr: sampleNote,
    };
  });

  // 10-B. Yearly Performance Breakdown (جدول السنوات)
  const yearlyMap: Record<number, { count: number; sumR: number; wins: number; gp: number; gl: number }> = {};
  for (const t of trades) {
    const yr = new Date(t.entryTime || t.exitTime || Date.now()).getUTCFullYear();
    if (!yearlyMap[yr]) yearlyMap[yr] = { count: 0, sumR: 0, wins: 0, gp: 0, gl: 0 };
    yearlyMap[yr].count++;
    yearlyMap[yr].sumR += t.pnlR;
    if (t.pnlR > 0) {
      yearlyMap[yr].wins++;
      yearlyMap[yr].gp += t.pnlR;
    } else {
      yearlyMap[yr].gl += Math.abs(t.pnlR);
    }
  }

  let runningCumulative = 0;
  const yearlyPerformance: YearlyPerformanceResult[] = Object.keys(yearlyMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((yr) => {
      const d = yearlyMap[yr];
      runningCumulative += d.count;
      const wr = d.count > 0 ? d.wins / d.count : 0;
      const expR = d.count > 0 ? d.sumR / d.count : 0;
      const pf = d.gl > 0 ? d.gp / d.gl : d.gp > 0 ? 5.0 : 1.0;
      return {
        year: yr,
        tradesCount: d.count,
        cumulativeTradesCount: runningCumulative,
        expectancyR: Number(expR.toFixed(3)),
        winRate: Number(wr.toFixed(3)),
        profitFactor: Number(pf.toFixed(2)),
        pnlTotalR: Number(d.sumR.toFixed(2)),
      };
    });

  // 11. Kelly Risk Recommendation
  const avgWinR =
    winningTrades.length > 0
      ? grossProfitR / winningTrades.length
      : 1.0;
  const avgLossR =
    losingTrades.length > 0
      ? grossLossR / losingTrades.length
      : 1.0;

  const kellySuggested = calculateKellyRisk({
    winRate: winRateMetric.point,
    winRateCiLower: winRateMetric.ci95[0],
    avgWinR,
    avgLossR,
    maxDisciplineRiskPct,
  });

  // 12. Composite Stability Score (0 - 100)
  let stabilityScore = 50;
  if (n >= 100) stabilityScore += 20;
  else if (n >= 50) stabilityScore += 10;
  else if (n < 25) stabilityScore -= 20;

  if (tTest.isSignificant99) stabilityScore += 20;
  else if (tTest.isSignificant95) stabilityScore += 10;
  else stabilityScore -= 15;

  if (bootstrap.probPositiveExpectancy >= 95) stabilityScore += 10;
  else if (bootstrap.probPositiveExpectancy < 80) stabilityScore -= 15;

  if (outOfSampleDegradation) {
    if (outOfSampleDegradation.passedDegradationTest) stabilityScore += 10;
    else stabilityScore -= 20;
  }

  if (maxDrawdownR < 8) stabilityScore += 10;
  else if (maxDrawdownR > 18) stabilityScore -= 15;

  stabilityScore = Math.max(0, Math.min(100, stabilityScore));

  return {
    strategyId,
    strategyName,
    symbol,
    timeframe,
    calculatedAt: Date.now(),
    sampleSize: n,
    degreesOfFreedom: Math.max(0, n - 1),
    winRate: {
      point: winRateMetric.point,
      ci95: winRateMetric.ci95,
      sampleSize: n,
      standardError: winRateMetric.standardError,
    },
    profitFactor: {
      point: profitFactorMetric.point,
      ci95: profitFactorMetric.ci95,
      sampleSize: n,
    },
    expectancyR: {
      point: expectancyMetric.mean,
      ci95: expectancyMetric.ci95,
      sampleSize: n,
      standardError: expectancyMetric.standardError,
    },
    sharpeRatio: {
      point: Number(sharpePoint.toFixed(2)),
      annualized: Number((sharpePoint * Math.sqrt(252)).toFixed(2)),
      standardError: expectancyMetric.standardError,
    },
    sortinoRatio: {
      point: Number(sortinoPoint.toFixed(2)),
      annualized: Number((sortinoPoint * Math.sqrt(252)).toFixed(2)),
    },
    calmarRatio,
    maxDrawdown: {
      r: Number(maxDrawdownR.toFixed(2)),
      pct: Number(maxDrawdownPct.toFixed(1)),
      durationBars: maxDdDuration,
      ci95R: [
        Number(maxDrawdownR.toFixed(2)),
        Number(bootstrap.drawdown95thPercentileR.toFixed(2)),
      ],
    },
    tTest,
    bootstrap,
    permutationTest,
    outOfSampleDegradation,
    regimeRobustness,
    yearlyPerformance,
    kellySuggestedRiskPct: kellySuggested,
    stabilityScore,
  };
}
