// Kelly Criterion and Half-Kelly Risk Sizing with Confidence Interval Discounting
// صيغة نصف كيلي المعدلة إحصائياً للحد من الإفراط في المخاطرة

export interface KellyCalculationInput {
  winRate: number;              // 0.0 - 1.0
  winRateCiLower: number;       // Lower bound of 95% CI
  avgWinR: number;              // Average win in R (> 0)
  avgLossR: number;             // Average loss in R (> 0)
  maxDisciplineRiskPct?: number;// Maximum allowed risk from discipline settings (e.g. 1% or 2%)
}

export interface KellyCalculationResult {
  fullKellyPct: number;
  halfKellyPct: number;
  conservativeKellyPct: number;
  appliedCapPct: number;
  formulaNotesAr: string;
}

export function calculateKellyRisk(input: KellyCalculationInput): KellyCalculationResult {
  const {
    winRate,
    winRateCiLower,
    avgWinR,
    avgLossR,
    maxDisciplineRiskPct = 1.0,
  } = input;

  if (avgLossR <= 0 || avgWinR <= 0 || winRate <= 0) {
    return {
      fullKellyPct: 0,
      halfKellyPct: 0,
      conservativeKellyPct: 0,
      appliedCapPct: 0,
      formulaNotesAr: 'بيانات غير كافية لحساب كيلي (متوسط الربح أو الخسارة غير صالح).',
    };
  }

  const b = avgWinR / avgLossR; // Win-loss payoff ratio
  const p = Math.max(0, Math.min(1, winRate));
  const q = 1 - p;

  // Standard Kelly: f* = (p*b - q) / b
  const fullKellyFraction = (p * b - q) / b;
  const fullKellyPct = Math.max(0, fullKellyFraction * 100);

  // Half Kelly: 0.5 * f*
  const halfKellyPct = fullKellyPct * 0.5;

  // Conservative Kelly using Wilson 95% Lower Bound for win rate
  const pLower = Math.max(0, Math.min(1, winRateCiLower));
  const qLower = 1 - pLower;
  const conservativeFraction = (pLower * b - qLower) / b;
  const conservativeKellyPct = Math.max(0, conservativeFraction * 100 * 0.5);

  // Apply discipline settings cap
  let appliedCapPct = Math.min(conservativeKellyPct, maxDisciplineRiskPct);
  // Round to 2 decimals, minimum 0.1% if positive edge
  if (appliedCapPct > 0) {
    appliedCapPct = Math.max(0.1, Number(appliedCapPct.toFixed(2)));
  } else {
    appliedCapPct = 0;
  }

  const formulaNotesAr =
    fullKellyPct <= 0
      ? 'معادلة كيلي تشير إلى انعدام الحافة؛ يُنصح بعدم المخاطرة بأي رأس مال.'
      : `نصف كيلي = ${(halfKellyPct).toFixed(2)}%، بعد كبح مجال الثقة 95% = ${(conservativeKellyPct).toFixed(2)}%، ومحدد بسقف الانضباط عند ${appliedCapPct}%.`;

  return {
    fullKellyPct: Number(fullKellyPct.toFixed(6)),
    halfKellyPct: Number(halfKellyPct.toFixed(6)),
    conservativeKellyPct: Number(conservativeKellyPct.toFixed(6)),
    appliedCapPct,
    formulaNotesAr,
  };
}
