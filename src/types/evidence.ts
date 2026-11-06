// Statistical Evidence and Strategy Gatekeeper Data Models
// نظام الأدلة الإحصائية وبوابة اعتماد الاستراتيجية

export type TradeRegime = 'bull' | 'bear' | 'chop' | 'highVol' | 'lowVol';
export type TradeSampleType = 'inSample' | 'outOfSample' | 'walkForward' | 'paper' | 'live';

export interface EvidenceTrade {
  id: string;
  entryTime: number; // timestamp ms
  exitTime: number;  // timestamp ms
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  riskAmount: number; // المبلغ المخاطر به بالدولار ($)
  pnlAmount: number;  // الربح / الخسارة الصافية بالدولار ($)
  pnlR: number;       // الربح/الخسارة بوحدات R = pnlAmount / riskAmount
  maeR?: number;      // Maximum Adverse Excursion in R units
  mfeR?: number;      // Maximum Favorable Excursion in R units
  durationBars: number;
  fees: number;
  slippage: number;
  regime: TradeRegime;
  sampleType: TradeSampleType;
}

export interface MetricWithCI {
  point: number;                  // التقدير النقطي
  ci95: [number, number];         // مجال الثقة 95% [الحد الأدنى, الحد الأقصى]
  sampleSize: number;             // حجم العينة
  standardError?: number;         // الخطأ المعياري
}

export interface BootstrapResults {
  iterations: number;
  meanRDistribution: number[];    // توزيع متوسط R بعد إعادة أخذ العينات
  probPositiveExpectancy: number; // احتمالية أن يكون متوسط العائد موجباً P(E[R] > 0)
  probLossStreak3: number;        // احتمالية 3 خسائر متتالية
  probLossStreak5: number;        // احتمالية 5 خسائر متتالية
  probLossStreak7: number;        // احتمالية 7 خسائر متتالية
  expectedMaxDrawdownR: number;   // متوسط أقصى تراجع بوحدات R
  drawdown95thPercentileR: number;// أسوأ تراجع عند الشريحة المئوية 95% (CVaR / 95% DD)
  riskOfRuinPct: number;          // احتمالية خسارة 25% من رأس المال
  standardErrors?: {
    riskOfRuinPctSE: number;
    expectedMaxDrawdownRSE: number;
    drawdown95thPercentileRSE: number;
  };
}

export interface PermutationTestResult {
  originalSharpe: number;
  simulatedSharpeDistribution: number[];
  pValPermutation: number;        // القيمة الاحتمالية لاختبار التباديل
  isSignificant: boolean;         // هل النتيجة دالة إحصائياً مقارنة بالعشوائية
  permutationTrialsCount?: number;
}

export interface RegimeRobustnessResult {
  regime: TradeRegime;
  regimeNameAr: string;
  tradesCount: number;
  winRate: number;
  winRateCi95: [number, number];
  expectancyR: number;
  expectancyCi95: [number, number];
  profitFactor: number;
  isProfitable: boolean;
  isSufficientSample?: boolean;   // true if tradesCount >= 10
  sampleNoteAr?: string;          // e.g. "عينة غير كافية (n < 10)"
}

export interface YearlyPerformanceResult {
  year: number;
  tradesCount: number;
  cumulativeTradesCount: number;
  expectancyR: number;
  winRate: number;
  profitFactor: number;
  pnlTotalR: number;
}

export interface OutOfSampleDegradation {
  inSampleTradesCount: number;
  outOfSampleTradesCount: number;
  inSampleExpectancyR: number;
  outOfSampleExpectancyR: number;
  inSampleWinRate: number;
  outOfSampleWinRate: number;
  degradationPct: number;          // نسبة تآكل العائد (IS - OOS) / IS
  passedDegradationTest: boolean;  // هل التآكل ضمن الحد المقبول (<= 35%)
}

export interface HypothesisTestResult {
  tStat: number;
  degreesOfFreedom: number;
  pValue: number;                  // اختباره باتجاه واحد H1: E[R] > 0
  isSignificant95: boolean;        // p < 0.05
  isSignificant99: boolean;        // p < 0.01
  nullHypothesis: string;
  verdictAr: string;
}

export interface StatisticalEvidence {
  strategyId: string;
  strategyName: string;
  symbol: string;
  timeframe: string;
  calculatedAt: number;
  sampleSize: number;
  degreesOfFreedom: number;
  winRate: MetricWithCI;
  profitFactor: MetricWithCI;
  expectancyR: MetricWithCI;
  sharpeRatio: { point: number; annualized: number; standardError: number };
  sortinoRatio: { point: number; annualized: number };
  calmarRatio: number;
  maxDrawdown: {
    r: number;
    pct: number;
    durationBars: number;
    ci95R: [number, number];
  };
  tTest: HypothesisTestResult;
  bootstrap: BootstrapResults;
  permutationTest: PermutationTestResult;
  outOfSampleDegradation?: OutOfSampleDegradation;
  regimeRobustness: RegimeRobustnessResult[];
  kellySuggestedRiskPct: {
    fullKellyPct: number;
    halfKellyPct: number;
    conservativeKellyPct: number; // مخفض حسب مجال الثقة السفلي
    appliedCapPct: number;        // بعد تطبيق سقف إعدادات الانضباط
    formulaNotesAr: string;
  };
  stabilityScore: number;         // 0 - 100
  neighborhoodRobustnessPct?: number; // استقرار الجوار
  randomEntryBaseline?: {
    pValue: number;
    medianExpectancyR: number;
    passed: boolean;
  };
  economicHypothesis?: {
    text: string;
    isDocumented: boolean;
    documentedDate?: string;
  };
  deflatedSharpeRatio?: number;   // DSR (0.0 to 1.0)
  deflatedSharpeDetails?: {
    N: number;
    sd: number;
    sr0: number;
    z: number;
    srAnnual: number;
  };
  testPeriodYears?: number;       // Duration of test data in years (e.g. 9.17 years)
  strategyStyle?: 'slow_trend' | 'fast_momentum' | 'mean_reversion';
  yearlyPerformance?: YearlyPerformanceResult[];
}

export type GateStatus = 'approved' | 'paper_only' | 'rejected';

export interface GateCriterion {
  id: string;
  titleAr: string;
  descriptionAr: string;
  thresholdAr: string;
  actualValueStr: string;
  passed: boolean;
  isWarning: boolean;
  importance: 'critical' | 'high' | 'medium';
  notesAr: string;
}

export interface StrategyGateScorecard {
  status: GateStatus;
  statusLabelAr: string;
  statusBadgeColor: string;
  overallScore: number; // 0 - 100
  criteria: GateCriterion[];
  summaryMessageAr: string;
  recommendationsAr: string[];
  suggestedRiskPct: number;
  incubationAllowed: boolean;
  paperOnlyAllowed: boolean;
  rejectionReasonsAr: string[];
}

export interface IncubationSession {
  strategyId: string;
  strategyName: string;
  symbol: string;
  timeframe: string;
  startDate: number;
  currentPhase: 'paper' | 'micro_live' | 'full_live' | 'suspended';
  trades: EvidenceTrade[];
  expectedBaselineExpectancyR: number;
  expectedBaselineWinRate: number;
  maxAllowedDrawdownR: number;
  rollingExpectancyR: number;
  rollingWinRate: number;
  cusumScore: number;
  cusumAlertTriggered: boolean;
  edgeDecayWarning: boolean;
  decayMessageAr?: string;
  consecutiveLosses: number;
}
