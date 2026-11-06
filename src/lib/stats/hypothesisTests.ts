// Hypothesis Testing Module: One-tailed Student's t-test for positive expectancy
// H0: E[R] <= 0 (No edge / random coin flip)
// H1: E[R] > 0  (Statistically significant positive trading edge)

import { HypothesisTestResult } from '../../types/evidence';

/**
 * Standard Normal Cumulative Distribution Function (Φ(z))
 * Rational approximation by Abramowitz and Stegun (precision ~ 1.5e-7)
 */
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

function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) {
    x += p[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function incBetaSimpson(a: number, b: number, x: number): number {
  if (x <= 0) return 0.0;
  if (x >= 1) return 1.0;
  const N = 1000;
  const h = x / N;
  let s = 0.0;
  for (let i = 0; i <= N; i++) {
    const ti = i * h;
    if (ti <= 0 || ti >= 1) continue;
    const w = Math.exp((a - 1) * Math.log(ti) + (b - 1) * Math.log(1 - ti));
    const weight = i === 0 || i === N ? 1 : i % 2 === 1 ? 4 : 2;
    s += weight * w;
  }
  const integral = (h / 3) * s;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  return Math.min(1.0, Math.max(0.0, integral / Math.exp(lbeta)));
}

/**
 * Exact Student's t-distribution CDF using regularized incomplete beta function.
 */
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) return normalCdf(t);
  const x = df / (df + t * t);
  const ib = incBetaSimpson(df / 2.0, 0.5, x);
  if (t >= 0) {
    return 1.0 - 0.5 * ib;
  } else {
    return 0.5 * ib;
  }
}

/**
 * One-tailed upper p-value for H1: E[R] > 0
 * P(T >= tStat) = 1 - CDF(tStat)
 */
export function studentTUpperPValue(t: number, df: number): number {
  return 1.0 - studentTCdf(t, df);
}

/**
 * Perform One-tailed Student's t-test:
 * Tests whether mean(R) is significantly greater than 0.
 */
export function performExpectancyTTest(rValues: number[]): HypothesisTestResult {
  const n = rValues.length;

  if (n < 5) {
    return {
      tStat: 0,
      degreesOfFreedom: Math.max(0, n - 1),
      pValue: 1.0,
      isSignificant95: false,
      isSignificant99: false,
      nullHypothesis: 'H₀: متوسط العائد E[R] ≤ 0 (حجم العينة غير كافٍ للاختبار)',
      verdictAr: 'بيانات غير كافية (< 5 صفقات)؛ لا يمكن إثبات الحافة الإحصائية.',
    };
  }

  const mean = rValues.reduce((s, v) => s + v, 0) / n;
  const variance =
    rValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    const isPos = mean > 0;
    return {
      tStat: isPos ? 99.9 : -99.9,
      degreesOfFreedom: n - 1,
      pValue: isPos ? 0.0001 : 1.0,
      isSignificant95: isPos,
      isSignificant99: isPos,
      nullHypothesis: 'H₀: متوسط العائد E[R] ≤ 0 (التباين صفري)',
      verdictAr: isPos ? 'جميع الصفقات رابحة بالتساوي.' : 'جميع الصفقات خاسرة أو صفرية.',
    };
  }

  const se = stdDev / Math.sqrt(n);
  const tStat = mean / se;
  const df = n - 1;

  // One-tailed p-value for H1: mean > 0
  // P(T >= tStat) = 1 - CDF(tStat)
  let pValue: number;
  if (tStat <= 0) {
    pValue = Math.min(1.0, 1.0 - studentTCdf(tStat, df));
  } else {
    pValue = Math.max(0.00001, 1.0 - studentTCdf(tStat, df));
  }

  const isSignificant95 = pValue < 0.05 && mean > 0;
  const isSignificant99 = pValue < 0.01 && mean > 0;

  let verdictAr = '';
  if (isSignificant99) {
    verdictAr = `دلالة إحصائية فائقة القوة (p = ${pValue.toFixed(4)} < 0.01). فرضية العدم مرفوضة بيقين 99%. الحافة حقيقية وليست وليدة الصدفة.`;
  } else if (isSignificant95) {
    verdictAr = `دلالة إحصائية كافية (p = ${pValue.toFixed(4)} < 0.05). فرضية العدم مرفوضة بيقين 95%.`;
  } else if (mean > 0) {
    verdictAr = `العائد إيجابي ظاهرياً (E[R]=+${mean.toFixed(2)}) لكنه غير دال إحصائياً (p = ${pValue.toFixed(4)} ≥ 0.05). قد تكون النتيجة صدفة عشوائية وتحتاج لمزيد من الصفقات.`;
  } else {
    verdictAr = `متوسط العائد سالب أو صفري (E[R]=${mean.toFixed(2)}). لا توجد أي حافة إيجابية في هذه الاستراتيجية.`;
  }

  return {
    tStat: Number(tStat.toFixed(3)),
    degreesOfFreedom: df,
    pValue: Number(pValue.toFixed(5)),
    isSignificant95,
    isSignificant99,
    nullHypothesis: 'H₀: متوسط العائد الإضافي E[R] ≤ 0 مقابل البديل H₁: E[R] > 0',
    verdictAr,
  };
}
