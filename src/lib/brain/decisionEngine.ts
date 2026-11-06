// Autonomous Trading Brain Decision Engine (محرك اتخاذ القرار للعقل المدبر)
// Evaluates per-coin market signals, checks multi-group confluence, and produces deterministic actionable decisions

import {
  BrainDecision,
  BrainDecisionType,
  CoinAnalysisInput,
  DecisionEngineConfig,
  IndicatorGroupConfluence,
} from './decisionTypes';

export const DEFAULT_DECISION_CONFIG: DecisionEngineConfig = {
  minConfidence: 60,
  minConfluenceGroups: 3,
  defaultAtrSlMultiplier: 2.0,
  defaultAtrTp1Multiplier: 3.0,
  defaultAtrTp2Multiplier: 5.0,
  maxSpreadAllowedPct: 0.25,
};

/**
 * Adaptive rounding based on price magnitude to avoid collapsing small altcoins to 0.0000
 */
export function roundAdaptivePrice(price: number): number {
  if (!price || price <= 0 || !isFinite(price)) return 0;
  if (price >= 1000) return Number(price.toFixed(2));
  if (price >= 1) return Number(price.toFixed(4));
  if (price >= 0.01) return Number(price.toFixed(6));
  if (price >= 0.0001) return Number(price.toFixed(8));
  return Number(price.toFixed(10));
}

/**
 * Adaptive string formatting based on price magnitude
 */
export function formatAdaptivePrice(price: number): string {
  if (!price || price <= 0 || !isFinite(price)) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  if (price >= 0.0001) return price.toFixed(8);
  return price.toFixed(10);
}

/**
 * Evaluates market factors for a single coin and produces ONE deterministic decision
 */
export function evaluateCoinDecision(
  input: CoinAnalysisInput,
  config: Partial<DecisionEngineConfig> = {}
): BrainDecision {
  const cfg: DecisionEngineConfig = { ...DEFAULT_DECISION_CONFIG, ...config };
  const now = Date.now();
  const price = input.currentPrice;

  // Check if live data is unavailable
  if (input.isDataUnavailable || !price || price <= 0) {
    const unavailReason = `البيانات الحية لعملة ${input.symbol} غير متوفرة حالياً من مزود الأسعار.`;
    return {
      coin: input.symbol,
      type: 'STAY_OUT',
      confidence: 0,
      currentPrice: 0,
      confluenceGroups: [],
      confluenceCount: 0,
      indicatorGroups: [],
      reasoningAr: `تعذر الحصول على البيانات الحية اللحظية لعملة ${input.symbol}. لن يتخذ العقل المدبر أي قرار أو صفقة دون بيانات حية مؤكدة لحماية رأس المال.`,
      timestamp: now,
      factors: {
        signalScore: 0,
        mtfAlignmentPct: 0,
        fundamentalScore: 0,
        fearGreedValue: 50,
        fundingRatePct: 0,
        regime: 'chop',
        atrUsd: 0,
        distToSupportPct: 0,
        distToResistancePct: 0,
        bidAskSpreadPct: input.bidAskSpreadPct,
      },
      blockedReasonAr: unavailReason,
      isActionable: false,
      isDataUnavailable: true,
    };
  }

  // 1. Calculate Distances to Support and Resistance
  const distToSuppPct =
    input.nearestSupportPrice > 0
      ? ((price - input.nearestSupportPrice) / price) * 100
      : 999;
  const distToResPct =
    input.nearestResistancePrice > 0
      ? ((input.nearestResistancePrice - price) / price) * 100
      : 999;

  // 2. Evaluate Independent Indicator Groups (مجموعات المؤشرات المستقلة)
  const indicatorGroups: IndicatorGroupConfluence[] = [];

  // Group A: Trend & Technical Momentum (الاتجاه والزخم الفني)
  let trendBullish = false;
  let trendBearish = false;
  let trendDetails = '';
  if (input.signalScore >= 35) {
    trendBullish = true;
    trendDetails = `نقاط الإشارة الفنية إيجابية بقوة (+${input.signalScore.toFixed(0)})`;
  } else if (input.signalScore <= -35) {
    trendBearish = true;
    trendDetails = `نقاط الإشارة الفنية سلبية بقوة (${input.signalScore.toFixed(0)})`;
  } else {
    trendDetails = `نقاط الإشارة في نطاق محايد (${input.signalScore.toFixed(0)})`;
  }

  // Refine with RSI / MACD if available
  if (input.rsiValue !== undefined) {
    if (input.rsiValue <= 35) {
      trendBullish = true;
      trendDetails += ` مع تشبع بيعي حاد لمؤشر RSI (${input.rsiValue.toFixed(1)})`;
    } else if (input.rsiValue >= 65) {
      trendBearish = true;
      trendDetails += ` مع تشبع شرائي حاد لمؤشر RSI (${input.rsiValue.toFixed(1)})`;
    }
  }

  indicatorGroups.push({
    nameAr: 'الاتجاه والزخم الفني',
    nameEn: 'Trend & Momentum',
    agreed: trendBullish || trendBearish,
    scoreContribution: input.signalScore,
    detailsAr: trendDetails,
  });

  // Group B: Multi-Timeframe Alignment (توافق الأطر الزمنية MTF)
  let mtfBullish = false;
  let mtfBearish = false;
  let mtfDetails = '';
  if (input.mtfAlignmentPct >= 65 && input.signalScore >= 0) {
    mtfBullish = true;
    mtfDetails = `توافق إيجابي قوي عبر الأطر الزمنية (${input.mtfAlignmentPct.toFixed(0)}%)`;
  } else if (input.mtfAlignmentPct >= 65 && input.signalScore < 0) {
    mtfBearish = true;
    mtfDetails = `توافق سلبي هابط عبر الأطر الزمنية (${input.mtfAlignmentPct.toFixed(0)}%)`;
  } else {
    mtfDetails = `تضارب أو ضعف في التوافق الزمني (${input.mtfAlignmentPct.toFixed(0)}%)`;
  }

  indicatorGroups.push({
    nameAr: 'توافق الأطر الزمنية (MTF)',
    nameEn: 'Multi-Timeframe Alignment',
    agreed: mtfBullish || mtfBearish,
    scoreContribution: mtfBullish ? input.mtfAlignmentPct : mtfBearish ? -input.mtfAlignmentPct : 0,
    detailsAr: mtfDetails,
  });

  // Group C: Derivatives & Orderbook Dynamics (المشتقات والسيولة)
  let derivBullish = false;
  let derivBearish = false;
  let derivDetails = '';
  // Negative funding rate indicates shorts paying longs (bullish squeeze potential)
  // Reasonable positive funding with rising OI confirms trend
  if (input.fundingRatePct < -0.005) {
    derivBullish = true;
    derivDetails = `معدل التمويل سلبي (${input.fundingRatePct.toFixed(4)}%) مما يعزز احتمالية صعود ارتدادي`;
  } else if (input.fundingRatePct > 0.05) {
    derivBearish = true;
    derivDetails = `معدل التمويل مفرط الارتفاع (${input.fundingRatePct.toFixed(4)}%) مما ينذر بتصحيح هابط لتصفية المراكز الطويلة`;
  } else if (input.openInterestChange24hPct > 3 && input.signalScore > 20) {
    derivBullish = true;
    derivDetails = `ارتفاع الفائدة المفتوحة (+${input.openInterestChange24hPct.toFixed(1)}%) بالتزامن مع زخم شرائي`;
  } else if (input.openInterestChange24hPct > 3 && input.signalScore < -20) {
    derivBearish = true;
    derivDetails = `ارتفاع الفائدة المفتوحة (+${input.openInterestChange24hPct.toFixed(1)}%) بالتزامن مع ضغط بيعي`;
  } else {
    derivDetails = `المشتقات متوازنة: تمويل (${input.fundingRatePct.toFixed(4)}%) وفائدة مفتوحة (${input.openInterestChange24hPct >= 0 ? '+' : ''}${input.openInterestChange24hPct.toFixed(1)}%)`;
  }

  indicatorGroups.push({
    nameAr: 'المشتقات والسيولة',
    nameEn: 'Derivatives & Funding',
    agreed: derivBullish || derivBearish,
    scoreContribution: derivBullish ? 50 : derivBearish ? -50 : 0,
    detailsAr: derivDetails,
  });

  // Group D: Fundamental & Ecosystem Score (التقييم الأساسي والصحي)
  let fundBullish = false;
  let fundBearish = false;
  let fundDetails = '';
  if (input.fundamentalScore >= 65) {
    fundBullish = true;
    fundDetails = `نقاط الأساسيات متفوقة (${input.fundamentalScore.toFixed(0)}/100) تدعم الاستثمار والاحتفاظ`;
  } else if (input.fundamentalScore <= 35) {
    fundBearish = true;
    fundDetails = `نقاط الأساسيات ضعيفة (${input.fundamentalScore.toFixed(0)}/100) تشير لمخاطر هيكلية`;
  } else {
    fundDetails = `أساسيات المشروع مستقرة ومعتدلة (${input.fundamentalScore.toFixed(0)}/100)`;
  }

  indicatorGroups.push({
    nameAr: 'التقييم الأساسي للمشروع',
    nameEn: 'Fundamentals & Ecosystem',
    agreed: fundBullish || fundBearish,
    scoreContribution: fundBullish ? 40 : fundBearish ? -40 : 0,
    detailsAr: fundDetails,
  });

  // Group E: Market Sentiment (معنويات السوق الشاملة Fear & Greed)
  let sentBullish = false;
  let sentBearish = false;
  let sentDetails = '';
  // Contrarian fear bounce or trend continuation
  if (input.fearGreedValue <= 25) {
    sentBullish = true;
    sentDetails = `خوف شديد (${input.fearGreedValue}/100) يفتح نافذة تجميع صاعد عكسي`;
  } else if (input.fearGreedValue >= 78) {
    sentBearish = true;
    sentDetails = `طمع مفرط (${input.fearGreedValue}/100) يرفع مخاطر الهبوط المفاجئ`;
  } else if (input.fearGreedValue >= 45 && input.fearGreedValue <= 65 && input.signalScore > 10) {
    sentBullish = true;
    sentDetails = `معنويات معتدلة إيجابية (${input.fearGreedValue}/100) تدعم استمرار الصعود`;
  } else {
    sentDetails = `مؤشر الخوف والطمع في منطقة حيادية (${input.fearGreedValue}/100)`;
  }

  indicatorGroups.push({
    nameAr: 'معنويات السوق (Fear & Greed)',
    nameEn: 'Market Sentiment',
    agreed: sentBullish || sentBearish,
    scoreContribution: sentBullish ? 30 : sentBearish ? -30 : 0,
    detailsAr: sentDetails,
  });

  // Group F: Market Structure & Support/Resistance (بنية السوق والدعوم)
  let structBullish = false;
  let structBearish = false;
  let structDetails = '';
  if (distToSuppPct <= 2.5 && distToResPct >= 4.0) {
    structBullish = true;
    structDetails = `السعر قريب من الدعم (${distToSuppPct.toFixed(1)}%) مع مساحة كافية للمقاومة (${distToResPct.toFixed(1)}%)؛ نسبة عائد لمخاطرة ممتازة`;
  } else if (distToResPct <= 2.5 && distToSuppPct >= 4.0) {
    structBearish = true;
    structDetails = `السعر يلامس المقاومة (${distToResPct.toFixed(1)}%) مع مساحة هبوط للدعم (${distToSuppPct.toFixed(1)}%)`;
  } else {
    structDetails = `السعر بين الدعم (-${distToSuppPct.toFixed(1)}%) والمقاومة (+${distToResPct.toFixed(1)}%)`;
  }

  indicatorGroups.push({
    nameAr: 'بنية السوق والدعوم والمقاومات',
    nameEn: 'Market Structure & S/R',
    agreed: structBullish || structBearish,
    scoreContribution: structBullish ? 45 : structBearish ? -45 : 0,
    detailsAr: structDetails,
  });

  // Group G: News & Breaking Sentiment (الأخبار والمعنويات الفورية)
  let newsBullish = false;
  let newsBearish = false;
  let newsDetails = '';
  if (input.newsSentimentScore !== undefined) {
    if (input.newsSentimentScore >= 40) {
      newsBullish = true;
      newsDetails = `أخبار إيجابية وتدفقات سيولة داعمة (+${input.newsSentimentScore})`;
    } else if (input.newsSentimentScore <= -40) {
      newsBearish = true;
      newsDetails = `أخبار وضغوط بيعية سلبية (${input.newsSentimentScore})`;
    } else {
      newsDetails = `معنويات الأخبار مستقرة (${input.newsSentimentScore > 0 ? '+' : ''}${input.newsSentimentScore})`;
    }
  } else {
    newsDetails = 'معنويات الأخبار طبيعية ومستقرة';
  }

  indicatorGroups.push({
    nameAr: 'الأخبار والمعنويات الفورية',
    nameEn: 'News & Sentiment',
    agreed: newsBullish || newsBearish,
    scoreContribution: newsBullish ? 35 : newsBearish ? -35 : 0,
    detailsAr: newsDetails,
  });

  // 3. Count Confluence for Long vs Short
  const bullishGroups = indicatorGroups.filter((g) => {
    if (g.nameEn === 'Trend & Momentum') return trendBullish;
    if (g.nameEn === 'Multi-Timeframe Alignment') return mtfBullish;
    if (g.nameEn === 'Derivatives & Funding') return derivBullish;
    if (g.nameEn === 'Fundamentals & Ecosystem') return fundBullish;
    if (g.nameEn === 'Market Sentiment') return sentBullish;
    if (g.nameEn === 'Market Structure & S/R') return structBullish;
    if (g.nameEn === 'News & Sentiment') return newsBullish;
    return false;
  });

  const bearishGroups = indicatorGroups.filter((g) => {
    if (g.nameEn === 'Trend & Momentum') return trendBearish;
    if (g.nameEn === 'Multi-Timeframe Alignment') return mtfBearish;
    if (g.nameEn === 'Derivatives & Funding') return derivBearish;
    if (g.nameEn === 'Fundamentals & Ecosystem') return fundBearish;
    if (g.nameEn === 'Market Sentiment') return sentBearish;
    if (g.nameEn === 'Market Structure & S/R') return structBearish;
    if (g.nameEn === 'News & Sentiment') return newsBearish;
    return false;
  });

  // 4. Calculate Confidence (0 - 100)
  // Confidence depends on:
  // - Number of agreeing groups (base: 20 per group up to 5 = 100)
  // - Absolute signal score magnitude
  // - MTF alignment
  // - Regime suitability
  const calcConfidence = (groupsCount: number, signalScoreMag: number, mtf: number, isGoodRegime: boolean): number => {
    let conf = groupsCount * 18 + (signalScoreMag / 100) * 20 + (mtf / 100) * 15;
    if (isGoodRegime) conf += 10;
    return Math.min(98, Math.max(10, Math.round(conf)));
  };

  const isBullRegime = input.regime === 'bull' || input.regime === 'chop';
  const isBearRegime = input.regime === 'bear' || input.regime === 'highVol';

  const longConfidence = calcConfidence(
    bullishGroups.length,
    Math.max(0, input.signalScore),
    input.mtfAlignmentPct,
    isBullRegime
  );

  const shortConfidence = calcConfidence(
    bearishGroups.length,
    Math.max(0, -input.signalScore),
    input.mtfAlignmentPct,
    isBearRegime
  );

  // 5. Evaluate Positions & Exit Rules (تقييم الخروج للمراكز المفتوحة)
  if (input.hasOpenPosition) {
    const isLongPos = input.openPositionSide === 'long';
    let shouldExit = false;
    let exitReason = '';

    if (isLongPos) {
      if (bearishGroups.length >= cfg.minConfluenceGroups && shortConfidence >= 65) {
        shouldExit = true;
        exitReason = `إشارة انعكاس هابطة قوية بتوافق ${bearishGroups.length} مجموعات مؤشرات (ثقة ${shortConfidence}%) تناقض المركز الطويل المفتوح.`;
      } else if (input.signalScore <= -45) {
        shouldExit = true;
        exitReason = `تدهور حاد في نقاط الإشارة (${input.signalScore.toFixed(0)}) يستوجب تسييل المركز لحماية الأرباح أو تقليص الخسارة.`;
      } else if (input.regime === 'bear' && input.openPositionPnlR !== undefined && input.openPositionPnlR < -0.5) {
        shouldExit = true;
        exitReason = `تحول نظام السوق إلى هابط صريح (Bear Regime) مع تسجيل خسارة تفوق 0.5R.`;
      }
    } else {
      // Short position
      if (bullishGroups.length >= cfg.minConfluenceGroups && longConfidence >= 65) {
        shouldExit = true;
        exitReason = `إشارة صعود ارتدادي قوي بتوافق ${bullishGroups.length} مجموعات مؤشرات تناقض المركز القصير المفتوح.`;
      } else if (input.signalScore >= 45) {
        shouldExit = true;
        exitReason = `تحول الإشارة إلى موجبة قوية (+${input.signalScore.toFixed(0)}) يستوجب إغلاق المركز البيعي.`;
      }
    }

    if (shouldExit) {
      return {
        coin: input.symbol,
        type: 'EXIT',
        confidence: isLongPos ? shortConfidence : longConfidence,
        currentPrice: price,
        confluenceGroups: (isLongPos ? bearishGroups : bullishGroups).map((g) => g.nameAr),
        confluenceCount: isLongPos ? bearishGroups.length : bullishGroups.length,
        indicatorGroups,
        reasoningAr: `قرار إغلاق المركز (${input.symbol}): ${exitReason}`,
        timestamp: now,
        factors: {
          signalScore: input.signalScore,
          mtfAlignmentPct: input.mtfAlignmentPct,
          fundamentalScore: input.fundamentalScore,
          fearGreedValue: input.fearGreedValue,
          fundingRatePct: input.fundingRatePct,
          regime: input.regime,
          atrUsd: input.volatilityAtr,
          distToSupportPct: distToSuppPct,
          distToResistancePct: distToResPct,
        },
        isActionable: true,
      };
    }
  }

  // 6. Evaluate New Entries (تقييم صفقات الدخول الجديدة)
  // Hard Gating Rule: Confluence >= minConfluenceGroups AND confidence >= minConfidence
  const canEnterLong =
    bullishGroups.length >= cfg.minConfluenceGroups &&
    longConfidence >= cfg.minConfidence &&
    input.signalScore > 15;

  const canEnterShort =
    bearishGroups.length >= cfg.minConfluenceGroups &&
    shortConfidence >= cfg.minConfidence &&
    input.signalScore < -15;

  let decisionType: BrainDecisionType = 'STAY_OUT';
  let activeConfidence = Math.max(longConfidence, shortConfidence);
  let activeGroups = bullishGroups;
  let blockedReason: string | undefined = undefined;

  if (canEnterLong && (!canEnterShort || longConfidence >= shortConfidence)) {
    decisionType = 'ENTER_LONG';
    activeConfidence = longConfidence;
    activeGroups = bullishGroups;
  } else if (canEnterShort) {
    decisionType = 'ENTER_SHORT';
    activeConfidence = shortConfidence;
    activeGroups = bearishGroups;
  }

  // 7. Check Gating / Safety Blocks (موانع الأمان الإجبارية)
  if (decisionType === 'ENTER_LONG' || decisionType === 'ENTER_SHORT') {
    if (input.killSwitchActive) {
      blockedReason = 'تم حظر الدخول فورياً: مفتاح الإيقاف الطارئ (Kill Switch) مفعّل في النظام.';
    } else if (input.riskGuardHalted) {
      blockedReason = 'تم حظر الدخول: نظام حماية المخاطر في وضع الإيقاف (Daily Loss Limit أو تتابع الخسائر).';
    } else if (input.hasOpenPosition) {
      blockedReason = `يوجد مركز مفتوح مسبقاً على ${input.symbol}؛ القاعدة تمنع المضاعفة أو الهرمية (No Pyramiding) حفاظاً على انضباط المحفظة.`;
    } else if (input.bidAskSpreadPct !== undefined && input.bidAskSpreadPct > cfg.maxSpreadAllowedPct) {
      blockedReason = `تم حظر الدخول (Spread Cap): الفارق السعري بين العرض والطلب (${input.bidAskSpreadPct.toFixed(3)}%) يتجاوز السقف الأقصى المسموح (${cfg.maxSpreadAllowedPct}%). انزلاق السيولة مرتفع.`;
    } else if (decisionType === 'ENTER_LONG' && (input.hasSevereNegativeNews || (input.newsSentimentScore !== undefined && input.newsSentimentScore <= -60))) {
      blockedReason = `تم حظر دخول الشراء فورياً (News Veto): رصد أخبار سلبية حادة أو تحذيرات هيكلية للعملة${input.newsHeadlineAr ? ` («${input.newsHeadlineAr}»)` : ''}.`;
    }

    if (blockedReason) {
      decisionType = 'STAY_OUT';
    }
  }

  // If STAY_OUT, ensure blockedReason is explicitly and clearly populated
  if (decisionType === 'STAY_OUT' && !blockedReason) {
    if (input.killSwitchActive) {
      blockedReason = 'تم حظر التداول: مفتاح الإيقاف الطارئ (Kill Switch) مفعّل في النظام.';
    } else if (input.riskGuardHalted) {
      blockedReason = 'تم حظر التداول: نظام حماية المخاطر في وضع الإيقاف (سقف الخسارة اليومي أو تتابع الخسائر).';
    } else if (input.hasOpenPosition) {
      blockedReason = `يوجد مركز مفتوح مسبقاً على ${input.symbol}؛ القاعدة تمنع فتح مراكز مكررة (No Pyramiding).`;
    } else if (input.bidAskSpreadPct !== undefined && input.bidAskSpreadPct > cfg.maxSpreadAllowedPct) {
      blockedReason = `حظر الدخول (سقف السبريد): فارق السعر (${input.bidAskSpreadPct.toFixed(3)}%) يفوق السقف المسموح (${cfg.maxSpreadAllowedPct}%).`;
    } else if (input.hasSevereNegativeNews || (input.newsSentimentScore !== undefined && input.newsSentimentScore <= -60)) {
      blockedReason = `حظر دخول الشراء (فيتو الأخبار): رصد أخبار سلبية حادة أو تحذيرات هيكلية${input.newsHeadlineAr ? ` («${input.newsHeadlineAr}»)` : ''}.`;
    } else if (bullishGroups.length < cfg.minConfluenceGroups && bearishGroups.length < cfg.minConfluenceGroups) {
      const maxCount = Math.max(bullishGroups.length, bearishGroups.length);
      blockedReason = `عدم اكتمال شرط التوافق: توافر ${maxCount} مجموعات مؤشرات فقط من أصل ${cfg.minConfluenceGroups} مطلوبة لاتخاذ قرار الدخول.`;
    } else if (activeConfidence < cfg.minConfidence) {
      blockedReason = `مستوى الثقة الحسابي (${activeConfidence}%) أدنى من الحد الأدنى المشروط (${cfg.minConfidence}%).`;
    } else {
      blockedReason = `الإشارة الفنية في المنطقة الحيادية (${input.signalScore > 0 ? '+' : ''}${input.signalScore.toFixed(0)}) دون اتجاه حاسم كافٍ للدخول.`;
    }
  }

  // 8. Calculate Entry, Stop Loss, and Take Profit Levels based on ATR & Structure
  let entryPrice: number | undefined;
  let stopLossPrice: number | undefined;
  let takeProfit1Price: number | undefined;
  let takeProfit2Price: number | undefined;
  let riskRewardRatio: number | undefined;
  let riskDistancePct: number | undefined;
  let target1DistancePct: number | undefined;

  const safeAtr = input.volatilityAtr > 0 ? input.volatilityAtr : price * 0.03;

  if (decisionType === 'ENTER_LONG') {
    entryPrice = price;
    // Stop Loss: 2 * ATR below entry, or slightly below support
    const slDist = cfg.defaultAtrSlMultiplier * safeAtr;
    stopLossPrice = roundAdaptivePrice(Math.max(0.00000001, price - slDist));
    takeProfit1Price = roundAdaptivePrice(price + cfg.defaultAtrTp1Multiplier * safeAtr);
    takeProfit2Price = roundAdaptivePrice(price + cfg.defaultAtrTp2Multiplier * safeAtr);
    riskDistancePct = Number(((price - stopLossPrice) / price * 100).toFixed(2));
    target1DistancePct = Number(((takeProfit1Price - price) / price * 100).toFixed(2));
    riskRewardRatio = Number((cfg.defaultAtrTp1Multiplier / cfg.defaultAtrSlMultiplier).toFixed(2));
  } else if (decisionType === 'ENTER_SHORT') {
    entryPrice = price;
    const slDist = cfg.defaultAtrSlMultiplier * safeAtr;
    stopLossPrice = roundAdaptivePrice(price + slDist);
    takeProfit1Price = roundAdaptivePrice(Math.max(0.00000001, price - cfg.defaultAtrTp1Multiplier * safeAtr));
    takeProfit2Price = roundAdaptivePrice(Math.max(0.00000001, price - cfg.defaultAtrTp2Multiplier * safeAtr));
    riskDistancePct = Number(((stopLossPrice - price) / price * 100).toFixed(2));
    target1DistancePct = Number(((price - takeProfit1Price) / price * 100).toFixed(2));
    riskRewardRatio = Number((cfg.defaultAtrTp1Multiplier / cfg.defaultAtrSlMultiplier).toFixed(2));
  }

  // 9. Synthesize Coherent Written Arabic Reasoning Paragraph (الصياغة التفسيرية بالعربية)
  let reasoningAr = '';
  const groupNamesList = activeGroups.map((g) => g.nameAr).join('، ');

  if (decisionType === 'ENTER_LONG') {
    reasoningAr =
      `قرار دخول شراء (ENTER_LONG) لعملة ${input.symbol} بدرجة ثقة ${activeConfidence}% بناءً على توافق حاسم لـ ${activeGroups.length} مجموعات مؤشرات رئيسية: (${groupNamesList}). ` +
      `الأدلة الفنية: نقاط الإشارة بلغت (+${input.signalScore.toFixed(0)}) مع توافق زمني بنسبة ${input.mtfAlignmentPct.toFixed(0)}%، ومعدل تمويل ${input.fundingRatePct.toFixed(4)}% وبيئة سوق (${input.regime}). ` +
      `إدارة الصفقة: تم تحديد وقف الخسارة عند $${formatAdaptivePrice(stopLossPrice || 0)} (مسافة مخاطرة ${riskDistancePct}%) والهدف الأول عند $${formatAdaptivePrice(takeProfit1Price || 0)} بنسبة عائد لمخاطرة 1:${riskRewardRatio}.`;
  } else if (decisionType === 'ENTER_SHORT') {
    reasoningAr =
      `قرار دخول بيع (ENTER_SHORT) لعملة ${input.symbol} بدرجة ثقة ${activeConfidence}% بتوافق ${activeGroups.length} مجموعات مؤشرات سلبية: (${groupNamesList}). ` +
      `الأدلة الفنية: نقاط الإشارة بلغت (${input.signalScore.toFixed(0)}) مع توافق هابط عبر الأطر الزمنية بنسبة ${input.mtfAlignmentPct.toFixed(0)}%. ` +
      `إدارة الصفقة: تم تحديد وقف الخسارة عند $${formatAdaptivePrice(stopLossPrice || 0)} (مسافة مخاطرة ${riskDistancePct}%) والهدف الأول عند $${formatAdaptivePrice(takeProfit1Price || 0)} بنسبة عائد لمخاطرة 1:${riskRewardRatio}.`;
  } else {
    // STAY_OUT
    reasoningAr =
      `قرار البقاء خارج السوق ومراقبة ${input.symbol} (STAY_OUT) بدرجة ثقة ${activeConfidence}%. ` +
      `الأسباب المنهجية: ${blockedReason}، حيث تسجل الإشارة الفنية (${input.signalScore > 0 ? '+' : ''}${input.signalScore.toFixed(0)}) في طور سوق (${input.regime}) مع تمويل ${input.fundingRatePct.toFixed(4)}%${input.bidAskSpreadPct !== undefined ? ` وفارق سعري (Spread) بنسبة ${input.bidAskSpreadPct.toFixed(3)}%` : ''}. ` +
      `حماية رأس المال تقتضي الامتناع عن التداول عند غياب الأدلة القطعية المتوافقة أو وجود موانع أمان.`;
  }

  const isActionable = (decisionType === 'ENTER_LONG' || decisionType === 'ENTER_SHORT') && !blockedReason;

  return {
    coin: input.symbol,
    type: decisionType,
    confidence: activeConfidence,
    currentPrice: price,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    riskRewardRatio,
    riskDistancePct,
    target1DistancePct,
    confluenceGroups: activeGroups.map((g) => g.nameAr),
    confluenceCount: activeGroups.length,
    indicatorGroups,
    reasoningAr,
    timestamp: now,
    factors: {
      signalScore: input.signalScore,
      mtfAlignmentPct: input.mtfAlignmentPct,
      fundamentalScore: input.fundamentalScore,
      fearGreedValue: input.fearGreedValue,
      fundingRatePct: input.fundingRatePct,
      regime: input.regime,
      atrUsd: safeAtr,
      distToSupportPct: distToSuppPct,
      distToResistancePct: distToResPct,
      bidAskSpreadPct: input.bidAskSpreadPct,
    },
    blockedReasonAr: blockedReason,
    isActionable,
  };
}
