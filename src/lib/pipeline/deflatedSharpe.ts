// Deflated Sharpe Ratio (DSR) & Probabilistic Sharpe Ratio (PSR)
// Implementation of Bailey and López de Prado (2014) to control for data snooping / multiple testing bias

function normalCdf(z: number): number {
  const p = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const x = Math.abs(z);
  const t = 1.0 / (1.0 + p * x);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const pdf = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  const ans = 1.0 - pdf * poly;
  return z >= 0 ? ans : 1.0 - ans;
}

// Inverse normal CDF (probit) approximation
function normalInv(p: number): number {
  if (p <= 0) return -5;
  if (p >= 1) return 5;
  if (p < 0.5) return -normalInv(1 - p);

  // Rational approximation by Beasley-Springer-Moro
  const a0 = 2.50662823884;
  const a1 = -18.61500062529;
  const a2 = 41.39119773534;
  const a3 = -25.44106049637;
  const b0 = -8.47351093090;
  const b1 = 23.08336743743;
  const b2 = -21.06224101826;
  const b3 = 3.13082909833;
  const c0 = 0.3374754822726147;
  const c1 = 0.9761690190917186;
  const c2 = 0.1607979714918209;
  const c3 = 0.0276438810333863;
  const c4 = 0.0038405729373609;
  const c5 = 0.0003951804142903;
  const c6 = 0.0000321767881768;
  const c7 = 0.0000002888167364;
  const c8 = 0.0000003960315187;

  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    return (y * (((a3 * r + a2) * r + a1) * r + a0)) / ((((b3 * r + b2) * r + b1) * r + b0) * r + 1.0);
  }
  const r = p;
  const s = Math.log(-Math.log(1.0 - r));
  const z = c0 + s * (c1 + s * (c2 + s * (c3 + s * (c4 + s * (c5 + s * (c6 + s * (c7 + s * c8)))))));
  return z;
}

export interface DSRComputationInputs {
  srPeriod: number;
  srAnnual: number;
  T: number;
  N: number;
  sr0Period: number;
  sr0Annual: number;
  skewness: number;
  kurtosis: number;
  denominator: number;
  z: number;
  dsr: number;
  varianceTrialsAnnual: number;
}

export interface DSRInput {
  estimatedSharpe: number;      // Annualized Sharpe ratio of the candidate
  totalTrials: number;          // Total candidate parameter sets tested on this series (excluding random walk)
  varianceOfTrialsSharpe: number; // Variance of annualized Sharpe across tested combinations
  sampleSizeBars: number;       // T: number of bars/periods in the test
  periodsPerYear?: number;      // Periods per year: 365 for daily crypto, 252 for stocks, etc. (default: 365)
  skewness?: number;            // Skewness of returns (default: 0)
  kurtosis?: number;            // Full kurtosis of returns (normal = 3, default: 3)
}

export interface DSRResult {
  dsr: number;
  expectedMaxSharpe: number;    // Annualized expected maximum Sharpe
  inputs: DSRComputationInputs;
}

/**
 * Calculates Deflated Sharpe Ratio (DSR) based on Bailey & López de Prado (2014)
 * Correctly scales Sharpe to per-period units (SR_period = SR_annual / sqrt(periodsPerYear))
 * to ensure consistency with sample size T (number of periods).
 */
export function calculateDeflatedSharpe(input: DSRInput): DSRResult {
  const {
    estimatedSharpe,
    totalTrials,
    varianceOfTrialsSharpe,
    sampleSizeBars,
    periodsPerYear = 365,
    skewness = 0,
    kurtosis = 3,
  } = input;

  const nTrials = Math.max(1, totalTrials);
  const periods = Math.max(1, periodsPerYear);
  const sqrtPeriods = Math.sqrt(periods);

  // 1. Convert annualized Sharpe to period Sharpe
  const srPeriod = estimatedSharpe / sqrtPeriods;

  // 2. Variance of trials: annual variance -> period variance
  const safeVarianceAnnual = Math.max(1e-6, varianceOfTrialsSharpe);
  const stdDevAnnual = Math.sqrt(safeVarianceAnnual);
  const stdDevPeriod = stdDevAnnual / sqrtPeriods;

  // 3. Expected maximum Sharpe ratio across N trials under the null
  const eulerGamma = 0.5772156649;
  const z1 = normalInv(1.0 - 1.0 / nTrials);
  const z2 = normalInv(1.0 - 1.0 / (nTrials * Math.E));
  const expectedMaxFactor = (1 - eulerGamma) * z1 + eulerGamma * z2;

  const expectedMaxSharpePeriod = stdDevPeriod * expectedMaxFactor;
  const expectedMaxSharpeAnnual = stdDevAnnual * expectedMaxFactor;

  // 4. Standard error of Sharpe ratio accounting for skewness & kurtosis (Mertens 2002)
  const T = Math.max(2, sampleSizeBars);
  const srVar =
    (1.0 - skewness * srPeriod + ((kurtosis - 1) / 4.0) * Math.pow(srPeriod, 2)) / (T - 1);
  const denominator = Math.sqrt(Math.max(1e-9, srVar));

  // 5. Compute z-score and DSR CDF
  const z = (srPeriod - expectedMaxSharpePeriod) / denominator;
  const dsr = normalCdf(z);

  const inputs: DSRComputationInputs = {
    srPeriod: Number(srPeriod.toFixed(6)),
    srAnnual: Number(estimatedSharpe.toFixed(4)),
    T,
    N: nTrials,
    sr0Period: Number(expectedMaxSharpePeriod.toFixed(6)),
    sr0Annual: Number(expectedMaxSharpeAnnual.toFixed(4)),
    skewness: Number(skewness.toFixed(4)),
    kurtosis: Number(kurtosis.toFixed(4)),
    denominator: Number(denominator.toFixed(6)),
    z: Number(z.toFixed(4)),
    dsr: Number(dsr.toFixed(4)),
    varianceTrialsAnnual: Number(safeVarianceAnnual.toFixed(6)),
  };

  return {
    dsr: Number(dsr.toFixed(4)),
    expectedMaxSharpe: Number(expectedMaxSharpeAnnual.toFixed(3)),
    inputs,
  };
}

