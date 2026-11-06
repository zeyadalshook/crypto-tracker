// Strategy Edge Decay & Degradation Monitoring Engine
// Implements CUSUM (Cumulative Sum Control Chart) and Rolling Expectancy Z-scores

export interface DecayEvaluationInput {
  baselineExpectancyR: number; // E[R] from backtest / in-sample
  baselineStdDevR: number;     // σ[R] from backtest
  recentTradesR: number[];     // Recent paper or live trades in R
  cusumThreshold?: number;     // Detection barrier (default: 4.0 standard errors)
}

export interface DecayEvaluationResult {
  rollingExpectancyR: number;
  zScore: number;
  cusumScore: number;
  consecutiveLosses: number;
  isDecayAlert: boolean;
  statusLevel: 'healthy' | 'caution' | 'critical_decay';
  summaryAr: string;
  recommendedActionAr: string;
}

/**
 * Computes negative CUSUM to detect sudden downward shifts in trading expectancy.
 * CUSUM_t = max(0, CUSUM_{t-1} + (k - (R_t - baselineExpectancy) / σ))
 */
export function evaluateStrategyDecay(input: DecayEvaluationInput): DecayEvaluationResult {
  const {
    baselineExpectancyR,
    baselineStdDevR,
    recentTradesR,
    cusumThreshold = 4.0,
  } = input;

  const n = recentTradesR.length;
  if (n === 0) {
    return {
      rollingExpectancyR: 0,
      zScore: 0,
      cusumScore: 0,
      consecutiveLosses: 0,
      isDecayAlert: false,
      statusLevel: 'healthy',
      summaryAr: 'لا توجد صفقات حية أو ورقية حديثة للتقييم.',
      recommendedActionAr: 'متابعة تنفيذ الصفقات وفق الخطة.',
    };
  }

  const rollingMean = recentTradesR.reduce((s, v) => s + v, 0) / n;
  const safeStd = baselineStdDevR > 0.001 ? baselineStdDevR : 1.0;
  const se = safeStd / Math.sqrt(n);
  const zScore = (rollingMean - baselineExpectancyR) / se;

  // CUSUM algorithm for detecting downward drift
  const k = 0.5; // allowance / slack parameter (half standard deviation)
  let cusum = 0;
  let maxCusum = 0;

  for (const r of recentTradesR) {
    const standardizedDeficit = (baselineExpectancyR - r) / safeStd;
    cusum = Math.max(0, cusum + (standardizedDeficit - k));
    if (cusum > maxCusum) {
      maxCusum = cusum;
    }
  }

  // Count current trailing consecutive losses
  let trailingLosses = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (recentTradesR[i] < 0) {
      trailingLosses++;
    } else {
      break;
    }
  }

  const isDecayAlert = maxCusum >= cusumThreshold || zScore <= -2.0;

  let statusLevel: 'healthy' | 'caution' | 'critical_decay' = 'healthy';
  let summaryAr = '';
  let recommendedActionAr = '';

  if (isDecayAlert) {
    statusLevel = 'critical_decay';
    summaryAr = `تنبيه حرج لتآكل الحافة (Edge Decay): الأداء الحالي انحرف بمقدار ${Math.abs(zScore).toFixed(2)} انحراف معياري دون خط الأساس، وسجل مؤشر CUSUM القيمة ${maxCusum.toFixed(2)}.`;
    recommendedActionAr = 'إيقاف الصفقات فوراً، أو تقليص المخاطرة بنسبة 75%، وإعادة فحص شروط السوق والنموذج.';
  } else if (zScore <= -1.2 || maxCusum >= cusumThreshold * 0.65 || trailingLosses >= 4) {
    statusLevel = 'caution';
    summaryAr = `تحذير: هبوط طفيف في العائد التراكمي (E[R]=${rollingMean.toFixed(2)}R مقابل الأساس +${baselineExpectancyR.toFixed(2)}R)، وتتابع ${trailingLosses} خسائر.`;
    recommendedActionAr = 'خفض حجم الصفقات بنسبة 50% كإجراء وقائي واستمرار المراقبة اللصيقة.';
  } else {
    statusLevel = 'healthy';
    summaryAr = `أداء مستقر ومطابق لتوقعات الباك تست الإحصائية (Rolling E[R]=+${rollingMean.toFixed(2)}R، مؤشر CUSUM = ${maxCusum.toFixed(2)}).`;
    recommendedActionAr = 'الاستمرار في الحضانة أو التداول بالحجم المقرر دون تعديل.';
  }

  return {
    rollingExpectancyR: Number(rollingMean.toFixed(3)),
    zScore: Number(zScore.toFixed(2)),
    cusumScore: Number(maxCusum.toFixed(2)),
    consecutiveLosses: trailingLosses,
    isDecayAlert,
    statusLevel,
    summaryAr,
    recommendedActionAr,
  };
}
