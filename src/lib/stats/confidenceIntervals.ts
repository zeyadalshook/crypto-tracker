// Pure statistical functions for calculating Confidence Intervals (Wilson, Student-t, Log-normal)

/**
 * Approximate Student's t critical value for a given alpha and degrees of freedom.
 * For df >= 30, t is very close to standard normal z (1.95996 for 95% two-tailed).
 * For small df, Cornish-Fisher expansion gives high accuracy.
 */
export function getStudentTCritical(df: number, twoTailedAlpha: number = 0.05): number {
  if (df <= 0) return 1.96;
  if (twoTailedAlpha === 0.05) {
    if (df === 1) return 12.706;
    if (df === 2) return 4.303;
    if (df === 3) return 3.182;
    if (df === 4) return 2.776;
    if (df === 5) return 2.571;
    if (df === 10) return 2.228;
    if (df === 15) return 2.131;
    if (df === 20) return 2.086;
    if (df === 30) return 2.042;
    if (df === 60) return 2.000;
    if (df === 120) return 1.980;
    // Approximation for df > 30: z + (z^3 + z) / (4*df)
    const z = 1.95996;
    return z + (Math.pow(z, 3) + z) / (4 * df);
  }
  return 1.96;
}

/**
 * Wilson Score Interval for binomial proportion (Win Rate).
 * Far superior to normal approximation for small N or extreme probabilities, never exceeds [0, 1].
 */
export function calculateWilsonScoreInterval(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95
): { point: number; ci95: [number, number]; standardError: number } {
  if (total <= 0) {
    return { point: 0, ci95: [0, 0], standardError: 0 };
  }

  const p = Math.max(0, Math.min(1, successes / total));
  const z = confidenceLevel === 0.99 ? 2.576 : 1.96;
  const z2 = z * z;

  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denominator;

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);
  const standardError = Math.sqrt((p * (1 - p)) / total);

  return {
    point: p,
    ci95: [Number(lower.toFixed(4)), Number(upper.toFixed(4))],
    standardError: Number(standardError.toFixed(4)),
  };
}

/**
 * Confidence Interval for Mean (Expectancy in R-multiples) using Student's t distribution.
 */
export function calculateMeanExpectancyCI(
  rValues: number[],
  confidenceLevel: number = 0.95
): {
  mean: number;
  ci95: [number, number];
  standardError: number;
  stdDev: number;
} {
  const n = rValues.length;
  if (n === 0) {
    return { mean: 0, ci95: [0, 0], standardError: 0, stdDev: 0 };
  }
  if (n === 1) {
    return { mean: rValues[0], ci95: [rValues[0], rValues[0]], standardError: 0, stdDev: 0 };
  }

  const mean = rValues.reduce((sum, v) => sum + v, 0) / n;
  const variance =
    rValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const se = stdDev / Math.sqrt(n);

  const df = n - 1;
  const tCrit = getStudentTCritical(df, 1 - confidenceLevel);
  const margin = tCrit * se;

  const lower = mean - margin;
  const upper = mean + margin;

  return {
    mean: Number(mean.toFixed(4)),
    ci95: [Number(lower.toFixed(4)), Number(upper.toFixed(4))],
    standardError: Number(se.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
  };
}

/**
 * Profit Factor Confidence Interval (using Log-Normal approximation on win/loss ratios).
 */
export function calculateProfitFactorCI(
  grossProfits: number,
  grossLosses: number,
  winningTradesCount: number,
  losingTradesCount: number
): { point: number; ci95: [number, number] } {
  if (grossLosses <= 0) {
    const pf = grossProfits > 0 ? 10.0 : 1.0;
    return { point: pf, ci95: [pf * 0.8, pf * 1.2] };
  }

  const point = grossProfits / grossLosses;
  const n1 = Math.max(1, winningTradesCount);
  const n2 = Math.max(1, losingTradesCount);

  // Log-normal standard error approximation for ratio of sums
  const logPf = Math.log(point);
  const seLog = Math.sqrt(1 / n1 + 1 / n2);
  const z = 1.96;

  const lower = Math.exp(logPf - z * seLog);
  const upper = Math.exp(logPf + z * seLog);

  return {
    point: Number(point.toFixed(2)),
    ci95: [Number(Math.max(0.01, lower).toFixed(2)), Number(upper.toFixed(2))],
  };
}
