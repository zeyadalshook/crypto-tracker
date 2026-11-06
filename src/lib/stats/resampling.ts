// Bootstrap Resampling Engine for Trading Returns (R-multiples)
// Pure computation with reproducible deterministic seed (mulberry32)

import { BootstrapResults } from '../../types/evidence';
import { Mulberry32 } from './random';

export interface BootstrapConfig {
  iterations?: number;
  seed?: number;
  ruinDrawdownR?: number; // Drawdown threshold in R considered "ruin" (default: 20R)
}

/**
 * Run Bootstrap Resampling on R-multiples:
 * Draws N trades with replacement over M iterations.
 * Computes empirical distribution of expectancy, drawdown risks, and streak probabilities.
 */
export function runBootstrapResampling(
  rValues: number[],
  config: BootstrapConfig = {}
): BootstrapResults {
  const {
    iterations = 1500,
    seed = 123456,
    ruinDrawdownR = 20,
  } = config;

  const n = rValues.length;
  if (n === 0) {
    return {
      iterations: 0,
      meanRDistribution: [],
      probPositiveExpectancy: 0,
      probLossStreak3: 0,
      probLossStreak5: 0,
      probLossStreak7: 0,
      expectedMaxDrawdownR: 0,
      drawdown95thPercentileR: 0,
      riskOfRuinPct: 0,
    };
  }

  const rng = new Mulberry32(seed);
  const meanRDist: number[] = new Array(iterations);
  const maxDrawdownsR: number[] = new Array(iterations);

  let positiveCount = 0;
  let streak3Count = 0;
  let streak5Count = 0;
  let streak7Count = 0;
  let ruinHits = 0;

  for (let it = 0; it < iterations; it++) {
    let sumR = 0;
    let peakR = 0;
    let currentR = 0;
    let maxDd = 0;

    let currentLossStreak = 0;
    let maxLossStreak = 0;

    for (let i = 0; i < n; i++) {
      const idx = rng.nextInt(0, n - 1);
      const r = rValues[idx];

      sumR += r;
      currentR += r;

      if (currentR > peakR) {
        peakR = currentR;
      }
      const dd = peakR - currentR;
      if (dd > maxDd) {
        maxDd = dd;
      }

      if (r < 0) {
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      } else {
        currentLossStreak = 0;
      }
    }

    const meanR = sumR / n;
    meanRDist[it] = Number(meanR.toFixed(4));
    maxDrawdownsR[it] = Number(maxDd.toFixed(2));

    if (meanR > 0) positiveCount++;
    if (maxLossStreak >= 3) streak3Count++;
    if (maxLossStreak >= 5) streak5Count++;
    if (maxLossStreak >= 7) streak7Count++;
    if (maxDd >= ruinDrawdownR) ruinHits++;
  }

  // Sort drawdowns to find 95th percentile worst-case
  maxDrawdownsR.sort((a, b) => a - b);
  const p95Idx = Math.min(
    maxDrawdownsR.length - 1,
    Math.floor(iterations * 0.95)
  );
  const drawdown95thPercentileR = maxDrawdownsR[p95Idx];
  const avgMaxDd =
    maxDrawdownsR.reduce((s, v) => s + v, 0) / iterations;

  // Compute Standard Errors (SE) of Monte Carlo / Bootstrap estimates
  const varDd =
    maxDrawdownsR.reduce((s, v) => s + Math.pow(v - avgMaxDd, 2), 0) / (iterations - 1);
  const seExpectedMaxDd = Math.sqrt(varDd / iterations);

  const pRuin = ruinHits / iterations;
  const seRiskOfRuinPct = Math.sqrt((pRuin * (1 - pRuin)) / iterations) * 100;

  const iLow = Math.max(0, Math.floor(iterations * (0.95 - 1.96 * Math.sqrt((0.95 * 0.05) / iterations))));
  const iHigh = Math.min(iterations - 1, Math.ceil(iterations * (0.95 + 1.96 * Math.sqrt((0.95 * 0.05) / iterations))));
  const seQuantile95 = Math.max(0.01, (maxDrawdownsR[iHigh] - maxDrawdownsR[iLow]) / (2 * 1.96));

  return {
    iterations,
    meanRDistribution: meanRDist,
    probPositiveExpectancy: Number(((positiveCount / iterations) * 100).toFixed(2)),
    probLossStreak3: Number(((streak3Count / iterations) * 100).toFixed(2)),
    probLossStreak5: Number(((streak5Count / iterations) * 100).toFixed(2)),
    probLossStreak7: Number(((streak7Count / iterations) * 100).toFixed(2)),
    expectedMaxDrawdownR: Number(avgMaxDd.toFixed(2)),
    drawdown95thPercentileR: Number(drawdown95thPercentileR.toFixed(2)),
    riskOfRuinPct: Number(((ruinHits / iterations) * 100).toFixed(2)),
    standardErrors: {
      riskOfRuinPctSE: Number(seRiskOfRuinPct.toFixed(3)),
      expectedMaxDrawdownRSE: Number(seExpectedMaxDd.toFixed(3)),
      drawdown95thPercentileRSE: Number(seQuantile95.toFixed(3)),
    },
  };
}
