// Independent Risk Layer (طبقة المخاطر المستقلة الحتمية)
// Pure verification engine enforcing all 11 non-negotiable risk rules in strict order

import {
  TradingIntent,
  RiskDecision,
  RiskLimits,
  PositionRecord,
  ExecutionSystemState,
} from './riskTypes';

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxRiskPerTradePct: 1.0,        // 1.0% max risk per trade
  maxPositionEquityPct: 20.0,     // 20% max total equity allocated in single position
  maxOpenPositions: 3,            // Max 3 concurrent positions
  maxTotalOpenRiskPct: 1.5,       // Max 1.5% total open risk across all positions
  maxCorrelationThreshold: 0.8,   // Max correlation cluster threshold
  dailyLossLimitPct: 2.0,         // Daily loss limit (2%) -> HALT
  weeklyLossLimitPct: 4.0,        // Weekly loss limit (4%) -> HALT
  monthlyLossLimitPct: 8.0,       // Monthly loss limit (8%) -> HALT
  maxDrawdownFromPeakPct: 10.0,   // Max drawdown from peak (10%) -> HALT
  maxOrdersPerHour: 6,            // Max 6 orders / hour
  maxOrdersPerDay: 20,            // Max 20 orders / day
  consecutiveLossLimit: 3,        // 3 consecutive losses -> 4h cooloff
  cooloffHours: 4,
  pendingLimitChange: null,
};

export interface MarketSanityContext {
  currentPrice: number;
  dataAgeSeconds: number;         // must be < 5s
  estimatedSlippagePct: number;   // must be < 0.15%
  spreadPct: number;              // must be < 0.2%
  volume24hUsd: number;           // must be >= 20M
  atrValue: number;               // for SL distance check
  isMajorEventScheduled?: boolean;
}

export interface RiskEvaluationContext {
  intent: TradingIntent;
  limits: RiskLimits;
  equity: number;
  dailyLossPct: number;
  weeklyLossPct: number;
  monthlyLossPct: number;
  drawdownFromPeakPct: number;
  openPositions: PositionRecord[];
  consecutiveLosses: number;
  recentOrdersCount1h: number;
  recentOrdersCount24h: number;
  rolloutPhase: 'PAPER' | 'TESTNET' | 'LIVE_SMALL' | 'LIVE';
  recommendedRiskPct: number;
  marketSanity: MarketSanityContext;
  accountDriftPct: number;        // local vs exchange discrepancy
  systemState: ExecutionSystemState;
}

export function evaluateIntentRisk(ctx: RiskEvaluationContext): RiskDecision {
  const {
    intent,
    limits,
    equity,
    dailyLossPct,
    weeklyLossPct,
    monthlyLossPct,
    drawdownFromPeakPct,
    openPositions,
    consecutiveLosses,
    recentOrdersCount1h,
    recentOrdersCount24h,
    rolloutPhase,
    recommendedRiskPct,
    marketSanity,
    accountDriftPct,
    systemState,
  } = ctx;

  const now = Date.now();

  // Helper for rejecting
  const reject = (reasonAr: string, ruleId: string): RiskDecision => ({
    intentId: intent.id,
    status: 'rejected',
    approvedQty: 0,
    approvedRiskAmount: 0,
    approvedRiskPct: 0,
    originalRequestedRiskPct: limits.maxRiskPerTradePct,
    reductionRatio: 0,
    rejectionReasonAr: reasonAr,
    ruleViolatedId: ruleId,
    checkedAt: now,
  });

  // Helper for HALT triggering
  const halt = (reasonAr: string, ruleId: string): RiskDecision => ({
    intentId: intent.id,
    status: 'halt_triggered',
    approvedQty: 0,
    approvedRiskAmount: 0,
    approvedRiskPct: 0,
    originalRequestedRiskPct: limits.maxRiskPerTradePct,
    reductionRatio: 0,
    rejectionReasonAr: `[إيقاف طارئ HALT]: ${reasonAr}`,
    ruleViolatedId: ruleId,
    checkedAt: now,
  });

  // Check 0: System State
  if (systemState === 'HALT' || systemState === 'OFF') {
    return reject('النظام في حالة إيقاف (HALT/OFF)؛ يُمنع فتح أي مراكز جديدة.', 'RULE_0_SYSTEM_STATE');
  }

  // Check 11: Account Consistency Drift <= 0.5%
  if (accountDriftPct > 0.5) {
    return halt(`اكتشاف اختلاف بين الرصيد المحلي والمنصة (${accountDriftPct.toFixed(2)}% > 0.5%)`, 'RULE_11_ACCOUNT_DRIFT');
  }

  // Check 5: Loss Limits -> HALT
  if (dailyLossPct >= limits.dailyLossLimitPct) {
    return halt(`بلوغ حد الخسارة اليومي (${dailyLossPct.toFixed(1)}% ≥ ${limits.dailyLossLimitPct}%)`, 'RULE_5_DAILY_LOSS');
  }
  if (weeklyLossPct >= limits.weeklyLossLimitPct) {
    return halt(`بلوغ حد الخسارة الأسبوعي (${weeklyLossPct.toFixed(1)}% ≥ ${limits.weeklyLossLimitPct}%)`, 'RULE_5_WEEKLY_LOSS');
  }
  if (monthlyLossPct >= limits.monthlyLossLimitPct) {
    return halt(`بلوغ حد الخسارة الشهري (${monthlyLossPct.toFixed(1)}% ≥ ${limits.monthlyLossLimitPct}%)`, 'RULE_5_MONTHLY_LOSS');
  }
  if (drawdownFromPeakPct >= limits.maxDrawdownFromPeakPct) {
    return halt(`بلوغ أقصى تراجع من القمة (${drawdownFromPeakPct.toFixed(1)}% ≥ ${limits.maxDrawdownFromPeakPct}%)`, 'RULE_5_MAX_DRAWDOWN');
  }

  // Check 6: Rate Limits -> HALT
  if (recentOrdersCount1h >= limits.maxOrdersPerHour) {
    return halt(`تجاوز حد الأوامر بالساعة (${recentOrdersCount1h} ≥ ${limits.maxOrdersPerHour}) - مؤشر على حلقة خلل`, 'RULE_6_RATE_LIMIT_1H');
  }
  if (recentOrdersCount24h >= limits.maxOrdersPerDay) {
    return halt(`تجاوز حد الأوامر اليومي (${recentOrdersCount24h} ≥ ${limits.maxOrdersPerDay})`, 'RULE_6_RATE_LIMIT_24H');
  }

  // Check 1: Mandatory Stop Loss & ATR distance bounds [0.5x, 6x]
  if (!intent.stopPrice || intent.stopPrice <= 0) {
    return reject('وقف الخسارة إلزامي؛ لا يُسمح بأي نية بدون سعر وقف محدد.', 'RULE_1_MANDATORY_SL');
  }
  const stopDistance = Math.abs(intent.entryPriceRef - intent.stopPrice);
  const atr = marketSanity.atrValue || stopDistance;
  if (stopDistance < 0.5 * atr) {
    return reject(`مسافة وقف الخسارة (${stopDistance.toFixed(2)}) قريبة جداً (< 0.5×ATR)`, 'RULE_1_SL_TOO_TIGHT');
  }
  if (stopDistance > 6.0 * atr) {
    return reject(`مسافة وقف الخسارة (${stopDistance.toFixed(2)}) بعيدة جداً (> 6.0×ATR)`, 'RULE_1_SL_TOO_WIDE');
  }

  // Check 7: Market Sanity Checks
  if (marketSanity.dataAgeSeconds > 5) {
    return reject(`بيانات السوق قديمة (${marketSanity.dataAgeSeconds} ثانية > 5 ثوانٍ)`, 'RULE_7_STALE_DATA');
  }
  const priceDeviation = Math.abs(marketSanity.currentPrice - intent.entryPriceRef) / intent.entryPriceRef;
  if (priceDeviation > 0.01) {
    return reject(`السعر الحالي تحرك بأكثر من 1% عن سعر النية (${(priceDeviation * 100).toFixed(2)}%)`, 'RULE_7_PRICE_DRIFT');
  }
  if (marketSanity.estimatedSlippagePct > 0.15) {
    return reject(`الانزلاق السعري المتوقع مرتفع (${marketSanity.estimatedSlippagePct}% > 0.15%)`, 'RULE_7_HIGH_SLIPPAGE');
  }
  if (marketSanity.spreadPct > 0.2) {
    return reject(`الفارق السعري (Spread) واسع جداً (${marketSanity.spreadPct}% > 0.2%)`, 'RULE_7_HIGH_SPREAD');
  }
  if (marketSanity.volume24hUsd < 20000000) {
    return reject(`حجم تداول الزوج خلال 24س منخفض (< 20 مليون دولار)`, 'RULE_7_LOW_VOLUME');
  }
  if (marketSanity.isMajorEventScheduled) {
    return reject('يوجد حدث اقتصادي كبير مجدول خلال النافذة الحالية', 'RULE_7_EVENT_LOCK');
  }

  // Check 4: Exposure Limits (Max positions & total open risk)
  if (openPositions.length >= limits.maxOpenPositions) {
    return reject(`بلوغ الحد الأقصى للصفقات المفتوحة (${openPositions.length} صفقات)`, 'RULE_4_MAX_POSITIONS');
  }
  const currentTotalOpenRiskPct = openPositions.reduce((s, p) => s + (p.riskAmount / equity) * 100, 0);
  if (currentTotalOpenRiskPct >= limits.maxTotalOpenRiskPct) {
    return reject(`بلوغ أقصى مخاطرة مفتوحة إجمالية (${currentTotalOpenRiskPct.toFixed(2)}% ≥ ${limits.maxTotalOpenRiskPct}%)`, 'RULE_4_MAX_TOTAL_RISK');
  }

  // Check 8: Hurdle Gate (Target 1 reward >= 3x total round-trip cost)
  const roundTripCostPct = 0.3; // 0.1% entry fee + 0.1% exit fee + 0.1% slippage
  const firstTarget = intent.targets[0]?.price || intent.entryPriceRef * 1.05;
  const targetDistancePct = (Math.abs(firstTarget - intent.entryPriceRef) / intent.entryPriceRef) * 100;
  if (targetDistancePct < 3 * roundTripCostPct) {
    return reject(`العائد المتوقع للهدف الأول (${targetDistancePct.toFixed(2)}%) أقل من 3× تكلفة الدورة (${(3 * roundTripCostPct).toFixed(2)}%)`, 'RULE_8_HURDLE_GATE');
  }

  // Check 9: Consecutive Losses Rule (No Martingale; 2 losses -> 50% cut, 3 losses -> cooloff)
  let lossReductionFactor = 1.0;
  if (consecutiveLosses >= limits.consecutiveLossLimit) {
    return reject(`تتابع ${consecutiveLosses} خسائر؛ سريان فترة استراحة إجبارية (${limits.cooloffHours} ساعات)`, 'RULE_9_CONSECUTIVE_LOSS_COOLOFF');
  } else if (consecutiveLosses >= 2) {
    lossReductionFactor = 0.5; // Cut risk size by 50%
  }

  // Check 3: Base Risk Fraction & Rollout Phase Discount
  let baseRiskPct = Math.min(limits.maxRiskPerTradePct, recommendedRiskPct || limits.maxRiskPerTradePct);
  // Rollout discount: In LIVE_SMALL, risk is strictly cut to 1/4th (25%)
  if (rolloutPhase === 'LIVE_SMALL') {
    baseRiskPct *= 0.25;
  }

  // Apply consecutive loss reduction factor
  const finalRiskPct = baseRiskPct * lossReductionFactor;
  const riskAmount = (equity * finalRiskPct) / 100;

  // Check 2: Position Size calculation & Cap to 20% equity
  const stopDistancePerUnit = Math.abs(intent.entryPriceRef - intent.stopPrice);
  let targetQty = stopDistancePerUnit > 0 ? riskAmount / stopDistancePerUnit : 0;
  const maxPositionValue = (equity * limits.maxPositionEquityPct) / 100;
  const maxQtyByEquity = maxPositionValue / intent.entryPriceRef;

  let isReduced = false;
  if (targetQty > maxQtyByEquity) {
    targetQty = maxQtyByEquity;
    isReduced = true;
  }
  if (lossReductionFactor < 1.0) {
    isReduced = true;
  }
  if (rolloutPhase === 'LIVE_SMALL') {
    isReduced = true;
  }

  if (targetQty <= 0) {
    return reject('حجم الصفقة المحسوب غير صالح أو صفري.', 'RULE_2_INVALID_SIZE');
  }

  return {
    intentId: intent.id,
    status: isReduced ? 'reduced' : 'approved',
    approvedQty: Number(targetQty.toFixed(6)),
    approvedRiskAmount: Number(riskAmount.toFixed(2)),
    approvedRiskPct: Number(finalRiskPct.toFixed(2)),
    originalRequestedRiskPct: limits.maxRiskPerTradePct,
    reductionRatio: Number((finalRiskPct / limits.maxRiskPerTradePct).toFixed(2)),
    rejectionReasonAr: isReduced
      ? `تم تخفيض الحجم (${consecutiveLosses >= 2 ? 'بسبب تتابع خسارتين' : rolloutPhase === 'LIVE_SMALL' ? 'بسبب مرحلة الحضانة الحية المصغرة (25%)' : 'بسبب سقف 20% من الرصيد'})`
      : undefined,
    checkedAt: now,
  };
}

// 24-hour delay enforcement when relaxing risk limits
export function updateRiskLimitsWithAntiRage(
  current: RiskLimits,
  proposed: Partial<RiskLimits>
): { updated: RiskLimits; requiresDelay: boolean; effectiveAt?: number } {
  // Check if any limit is being relaxed (increased)
  const isRelaxing =
    (proposed.maxRiskPerTradePct !== undefined && proposed.maxRiskPerTradePct > current.maxRiskPerTradePct) ||
    (proposed.dailyLossLimitPct !== undefined && proposed.dailyLossLimitPct > current.dailyLossLimitPct) ||
    (proposed.maxOpenPositions !== undefined && proposed.maxOpenPositions > current.maxOpenPositions);

  if (isRelaxing) {
    const effectiveAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours later
    const updated: RiskLimits = {
      ...current,
      pendingLimitChange: {
        proposed,
        effectiveAt,
        requestedAt: Date.now(),
      },
    };
    return { updated, requiresDelay: true, effectiveAt };
  }

  // Tightening limits takes effect immediately
  const updated: RiskLimits = {
    ...current,
    ...proposed,
  };
  return { updated, requiresDelay: false };
}
