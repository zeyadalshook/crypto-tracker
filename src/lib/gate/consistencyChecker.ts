// Automated Report Consistency Checker (فاحص اتساق التقارير الآلي)
// Validates mathematical and statistical consistency across all reported metrics.
// If any check fails, report issuance is strictly blocked.

export interface StrategyReportRow {
  strategyName: string;
  symbol: string;
  n: number;
  nTrain: number;
  nVal: number;
  nOos: number;
  winRate: number;      // 0.0 to 1.0
  avgWinR: number;      // average winning trade in R
  avgLossR: number;     // average losing trade in R (positive number)
  expectancyR: number;  // point estimate of E[R]
  ci95: [number, number]; // [lower, upper]
  tStat: number;
  pValue: number;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  errors: string[];
  validatedCount: number;
}

/**
 * Validates report consistency against 4 strict mathematical rules:
 * 1. winRate * avgWin - (1 - winRate) * avgLoss = E[R] within tolerance ±0.005 R
 * 2. nTrain + nVal + nOos = total n
 * 3. p-value is directionally consistent with tStat
 * 4. 95% Confidence Interval strictly bounds E[R] (ciLower <= E[R] <= ciUpper)
 */
export function validateReportConsistency(rows: StrategyReportRow[]): ConsistencyCheckResult {
  const errors: string[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const prefix = `[${r.symbol} - ${r.strategyName}]:`;

    // Rule 1: Expectancy identity check
    const calculatedExpectancy = r.winRate * r.avgWinR - (1.0 - r.winRate) * Math.abs(r.avgLossR);
    const expDiff = Math.abs(calculatedExpectancy - r.expectancyR);
    if (expDiff > 0.005) {
      errors.push(
        `${prefix} عدم اتساق التوقع الرياضي: winRate*avgWin - (1-winRate)*avgLoss = ${calculatedExpectancy.toFixed(4)} R بينما E[R] المسجل = ${r.expectancyR.toFixed(4)} R (فرق: ${expDiff.toFixed(4)} > 0.005)`
      );
    }

    // Rule 2: Partition sample size sum
    const sumN = r.nTrain + r.nVal + r.nOos;
    if (sumN !== r.n) {
      errors.push(
        `${prefix} عدم اتساق مجموع الصفقات: n_train (${r.nTrain}) + n_val (${r.nVal}) + n_oos (${r.nOos}) = ${sumN} لا يساوي n الكلي (${r.n})`
      );
    }

    // Rule 3: Directional consistency of p-value and t-statistic
    // For H1: E[R] > 0, if t > 0 then p < 0.50; if t <= 0 then p >= 0.50
    if (r.tStat > 0 && r.pValue > 0.50) {
      errors.push(
        `${prefix} تناقض الدلالة: قيمة t موجبة (${r.tStat.toFixed(2)}) ولكن p-value (${r.pValue.toFixed(4)}) > 0.50`
      );
    }
    if (r.tStat < 0 && r.pValue < 0.50) {
      errors.push(
        `${prefix} تناقض الدلالة: قيمة t سالبة (${r.tStat.toFixed(2)}) ولكن p-value (${r.pValue.toFixed(4)}) < 0.50`
      );
    }

    // Rule 4: CI bounds E[R]
    if (r.ci95[0] > r.expectancyR || r.ci95[1] < r.expectancyR) {
      errors.push(
        `${prefix} مجال الثقة لا يحيط بمتوسط العائد: E[R]=${r.expectancyR} ليس ضمن [${r.ci95[0]}, ${r.ci95[1]}]`
      );
    }
  }

  return {
    isConsistent: errors.length === 0,
    errors,
    validatedCount: rows.length,
  };
}
