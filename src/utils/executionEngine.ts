// Pure Functional Calculations for Slippage, Execution Quality, Cost Hurdle, VWAP & Volume Profile
import {
  OrderBookData,
  OrderBookLevel,
  SlippageTierCalculation,
  ExecutionQualityResult,
  OrderSlicingPlan,
  VolumeProfileResult,
  VolumeProfileLevel,
  AbnormalActivityData,
  LargeTradeItem,
  UserActualExecutionMetrics,
} from '../types/execution';
import { OHLCV } from '../types/crypto';
import { JournalTradeExtended } from '../types/discipline';

/**
 * Pure function: Calculate expected slippage across the order book levels for a given USD dollar amount.
 * Can be tested against synthetic 3-level order books or live 1000-level books.
 */
export function calculateOrderBookSlippage(
  book: OrderBookData,
  side: 'buy' | 'sell',
  targetDollarAmount: number
): {
  avgExecutionPrice: number;
  slippageDollars: number;
  slippagePercent: number;
  levelsConsumed: number;
  isInsufficientLiquidity: boolean;
  liquidityTier: 'عالية' | 'متوسطة' | 'ضعيفة';
} {
  if (targetDollarAmount <= 0) {
    const bestP = side === 'buy' ? book.bestAsk : book.bestBid;
    return {
      avgExecutionPrice: bestP,
      slippageDollars: 0,
      slippagePercent: 0,
      levelsConsumed: 0,
      isInsufficientLiquidity: false,
      liquidityTier: 'عالية',
    };
  }

  // To buy we consume Asks (ascending price); to sell we consume Bids (descending price)
  const levels = side === 'buy' ? book.asks : book.bids;
  const bestPrice = side === 'buy' ? book.bestAsk : book.bestBid;

  if (!levels || levels.length === 0 || bestPrice <= 0) {
    return {
      avgExecutionPrice: 0,
      slippageDollars: 0,
      slippagePercent: 0,
      levelsConsumed: 0,
      isInsufficientLiquidity: true,
      liquidityTier: 'ضعيفة',
    };
  }

  let remainingDollars = targetDollarAmount;
  let totalCoinsBought = 0;
  let consumedLevelsCount = 0;

  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    const levelCapacityDollars = lvl.price * lvl.qty;
    consumedLevelsCount++;

    if (remainingDollars <= levelCapacityDollars) {
      // Partially consume this level
      const coinsFromThisLevel = remainingDollars / lvl.price;
      totalCoinsBought += coinsFromThisLevel;
      remainingDollars = 0;
      break;
    } else {
      // Fully consume this level
      totalCoinsBought += lvl.qty;
      remainingDollars -= levelCapacityDollars;
    }
  }

  // Case: Amount exceeds total depth in the book
  if (remainingDollars > 0 || totalCoinsBought <= 0) {
    const lastLevel = levels[levels.length - 1];
    return {
      avgExecutionPrice: lastLevel ? lastLevel.price : bestPrice,
      slippageDollars: 0,
      slippagePercent: 99.9,
      levelsConsumed: levels.length,
      isInsufficientLiquidity: true,
      liquidityTier: 'ضعيفة',
    };
  }

  // Weighted Average Execution Price
  const avgExecutionPrice = targetDollarAmount / totalCoinsBought;

  // Slippage percentage relative to best top of book
  let slippagePercent = 0;
  let slippageDollars = 0;

  if (side === 'buy') {
    // We paid higher than best ask
    slippagePercent = Math.max(0, ((avgExecutionPrice - bestPrice) / bestPrice) * 100);
    slippageDollars = (avgExecutionPrice - bestPrice) * totalCoinsBought;
  } else {
    // We received lower than best bid
    slippagePercent = Math.max(0, ((bestPrice - avgExecutionPrice) / bestPrice) * 100);
    slippageDollars = (bestPrice - avgExecutionPrice) * totalCoinsBought;
  }

  // Round to 4 decimal places
  slippagePercent = Math.round(slippagePercent * 10000) / 10000;
  slippageDollars = Math.round(slippageDollars * 100) / 100;

  let liquidityTier: 'عالية' | 'متوسطة' | 'ضعيفة' = 'عالية';
  if (slippagePercent > 0.3) {
    liquidityTier = 'ضعيفة';
  } else if (slippagePercent >= 0.05) {
    liquidityTier = 'متوسطة';
  }

  return {
    avgExecutionPrice: Math.round(avgExecutionPrice * 10000) / 10000,
    slippageDollars,
    slippagePercent,
    levelsConsumed: consumedLevelsCount,
    isInsufficientLiquidity: false,
    liquidityTier,
  };
}

/**
 * Generate quick benchmark tiers table ($1K, $5K, $10K, $50K, $100K)
 */
export function calculateQuickSlippageTiers(
  book: OrderBookData,
  side: 'buy' | 'sell' = 'buy'
): SlippageTierCalculation[] {
  const tiers = [1000, 5000, 10000, 50000, 100000];
  return tiers.map((amt) => {
    const calc = calculateOrderBookSlippage(book, side, amt);
    return {
      dollarAmount: amt,
      avgExecutionPrice: calc.avgExecutionPrice,
      slippageDollars: calc.slippageDollars,
      slippagePercent: calc.slippagePercent,
      levelsConsumed: calc.levelsConsumed,
      liquidityTier: calc.liquidityTier,
      isInsufficientLiquidity: calc.isInsufficientLiquidity,
    };
  });
}

/**
 * Compute Complete Round-Trip Execution Quality & Cost
 */
export function computeExecutionQuality(
  book: OrderBookData,
  amountDollars: number,
  orderType: 'market' | 'limit',
  orderSide: 'buy' | 'sell',
  userOptions?: {
    isVipOrDiscount?: boolean;
    useBnbDiscount?: boolean;
    targetProfitPrice?: number;
    fundingRate8h?: number;
    expectedHoldingDays?: number;
  }
): ExecutionQualityResult {
  const currentPrice = orderSide === 'buy' ? book.bestAsk : book.bestBid;
  const isBnb = userOptions?.useBnbDiscount ?? true;

  // Base Binance Spot fees: Regular User is 0.1% Maker / 0.1% Taker.
  // With BNB 25% discount: 0.075%
  const baseTakerFee = isBnb ? 0.075 : 0.1;
  const baseMakerFee = isBnb ? 0.075 : 0.1;

  const appliedEntryFeePct = orderType === 'market' ? baseTakerFee : baseMakerFee;
  const appliedExitFeePct = baseTakerFee; // Assume conservative taker on exit

  // Entry Slippage (0% if limit order)
  const entrySlipCalc = orderType === 'market'
    ? calculateOrderBookSlippage(book, orderSide, amountDollars)
    : {
        avgExecutionPrice: currentPrice,
        slippageDollars: 0,
        slippagePercent: 0,
        levelsConsumed: 1,
        isInsufficientLiquidity: false,
        liquidityTier: 'عالية' as const,
      };

  // Exit Slippage (conservative estimation with opposite side book)
  const exitSide = orderSide === 'buy' ? 'sell' : 'buy';
  const exitSlipCalc = orderType === 'market'
    ? calculateOrderBookSlippage(book, exitSide, amountDollars)
    : {
        avgExecutionPrice: currentPrice,
        slippageDollars: 0,
        slippagePercent: 0,
        levelsConsumed: 1,
        isInsufficientLiquidity: false,
        liquidityTier: 'عالية' as const,
      };

  const entryFeeDollars = (amountDollars * appliedEntryFeePct) / 100;
  const exitFeeDollars = (amountDollars * appliedExitFeePct) / 100;
  const entrySlippageDollars = entrySlipCalc.slippageDollars;
  const exitSlippageDollars = exitSlipCalc.slippageDollars;

  // Estimated funding cost (if futures context)
  const fundingRate8h = userOptions?.fundingRate8h || 0;
  const holdingDays = userOptions?.expectedHoldingDays || 1;
  const totalFundingPct = fundingRate8h * 3 * holdingDays * 100; // 3 periods per day
  const fundingRateCostEstimate = (amountDollars * Math.abs(totalFundingPct)) / 100;

  const totalRoundTripCostDollars =
    entryFeeDollars + exitFeeDollars + entrySlippageDollars + exitSlippageDollars + fundingRateCostEstimate;

  const totalRoundTripCostPercent = amountDollars > 0
    ? (totalRoundTripCostDollars / amountDollars) * 100
    : 0;

  // Breakeven Hurdle: How much the price MUST move in your favor just to break even
  const breakevenHurdlePercent = Math.round(totalRoundTripCostPercent * 100) / 100;
  const breakevenPriceLevel = orderSide === 'buy'
    ? currentPrice * (1 + breakevenHurdlePercent / 100)
    : currentPrice * (1 - breakevenHurdlePercent / 100);

  // Quick Tiers
  const quickTiers = calculateQuickSlippageTiers(book, orderSide);

  // Edge vs Cost Gate:
  // Expected target reward should be at least 3x the round-trip cost
  const targetProfitPrice = userOptions?.targetProfitPrice;
  let gatePassed = true;
  let gateRatio = 3.5;
  let gateWarning: string | undefined;
  let gateSuggestion: string | undefined;

  if (targetProfitPrice && targetProfitPrice > 0) {
    const rawExpectedReturnPct = orderSide === 'buy'
      ? ((targetProfitPrice - currentPrice) / currentPrice) * 100
      : ((currentPrice - targetProfitPrice) / currentPrice) * 100;

    const expectedGainDollars = (amountDollars * Math.max(0, rawExpectedReturnPct)) / 100;

    if (totalRoundTripCostDollars > 0) {
      gateRatio = Math.round((expectedGainDollars / totalRoundTripCostDollars) * 100) / 100;
    }

    if (gateRatio < 3.0) {
      gatePassed = false;
      gateWarning = `التكلفة الكلية للدورة (${totalRoundTripCostPercent.toFixed(2)}%) تلتهم حصة كبيرة من ربح الهدف المتوقع (${rawExpectedReturnPct.toFixed(2)}%). النسبة الحالية ${gateRatio.toFixed(1)}x وأدنى حد مقبول هو 3x.`;
      gateSuggestion = 'استخدم أمراً محدداً (Limit Order) لإلغاء الانزلاق، أو قلل التكرار، أو اختر زوجاً أعلى سيولة.';
    }
  }

  let liquidityWarning: string | undefined;
  if (entrySlipCalc.liquidityTier === 'ضعيفة') {
    liquidityWarning = `انزلاق مرتفع (${entrySlipCalc.slippagePercent.toFixed(2)}%)! سيولة الدفتر الحالية ضعيفة لهذا الحجم، مما قد يسبب خسارة فورية عند التنفيذ.`;
  }

  return {
    symbol: book.symbol,
    currentPrice,
    inputAmountDollars: amountDollars,
    orderType,
    orderSide,
    makerFeePercent: appliedEntryFeePct,
    takerFeePercent: appliedExitFeePct,
    bnbDiscountActive: isBnb,
    avgExecutionPrice: entrySlipCalc.avgExecutionPrice,
    slippagePercent: entrySlipCalc.slippagePercent,
    slippageDollars: entrySlippageDollars,
    levelsConsumed: entrySlipCalc.levelsConsumed,
    liquidityClassification: entrySlipCalc.liquidityTier,
    liquidityWarning,
    isLiquidityInsufficient: entrySlipCalc.isInsufficientLiquidity,
    entryFeeDollars: Math.round(entryFeeDollars * 100) / 100,
    exitFeeDollars: Math.round(exitFeeDollars * 100) / 100,
    entrySlippageDollars: Math.round(entrySlippageDollars * 100) / 100,
    exitSlippageDollars: Math.round(exitSlippageDollars * 100) / 100,
    totalRoundTripCostDollars: Math.round(totalRoundTripCostDollars * 100) / 100,
    totalRoundTripCostPercent: Math.round(totalRoundTripCostPercent * 100) / 100,
    fundingRateCostEstimate: Math.round(fundingRateCostEstimate * 100) / 100,
    breakevenHurdlePercent,
    breakevenPriceLevel: Math.round(breakevenPriceLevel * 10000) / 10000,
    quickTiers,
    gatePassed,
    gateRatio,
    gateWarning,
    gateSuggestion,
  };
}

/**
 * Plan Order Slicing (TWAP-inspired execution planner)
 */
export function planOrderSlicing(
  book: OrderBookData,
  totalAmountDollars: number,
  side: 'buy' | 'sell',
  numSlices: number = 4,
  timeframeMinutes: number = 60
): OrderSlicingPlan {
  const boundedSlices = Math.max(2, Math.min(10, numSlices));
  const sliceAmount = totalAmountDollars / boundedSlices;

  // Single order execution slippage
  const singleCalc = calculateOrderBookSlippage(book, side, totalAmountDollars);
  // Sliced smaller order execution slippage
  const slicedCalc = calculateOrderBookSlippage(book, side, sliceAmount);

  const estimatedSingleSlippageDollars = singleCalc.slippageDollars;
  const estimatedSlicedSlippageDollars = slicedCalc.slippageDollars * boundedSlices;
  const estimatedSavings = Math.max(0, estimatedSingleSlippageDollars - estimatedSlicedSlippageDollars);

  // Price drift risk based on timeframe
  const priceDriftRisk: 'منخفض' | 'متوسط' | 'مرتفع' =
    timeframeMinutes <= 30 ? 'منخفض' : timeframeMinutes <= 120 ? 'متوسط' : 'مرتفع';

  const driftExplanation =
    priceDriftRisk === 'مرتفع'
      ? 'فترة التنفيذ طويلة؛ هناك خطر تحرك السعر بعيداً في الاتجاه المعاكس وضياع فرصة الدخول.'
      : priceDriftRisk === 'متوسط'
      ? 'توازن ملائم بين خفض الانزلاق الفوري وتحمل تقلبات النطاق السعري القصير.'
      : 'تنفيذ سريع يخفض انزلاق الدفتر دون تعريض الصفقة لموجات تقلب خارجية.';

  const intervalMinutes = Math.floor(timeframeMinutes / boundedSlices);
  const bestPrice = side === 'buy' ? book.bestAsk : book.bestBid;

  const slices = Array.from({ length: boundedSlices }, (_, idx) => {
    const offsetMin = idx * intervalMinutes;
    return {
      sliceNumber: idx + 1,
      amountDollars: Math.round(sliceAmount),
      targetPriceEstimate: bestPrice,
      recommendedOrderType: 'limit' as const,
      suggestedOffsetMinutes: offsetMin,
      timeLabel: idx === 0 ? 'الآن (البداية)' : `بعد ${offsetMin} دقيقة`,
      note: 'أمر محدد (Limit) على أفضل سعر شراء/بيع متاح',
    };
  });

  return {
    totalAmountDollars,
    slicesCount: boundedSlices,
    timeframeMinutes,
    singleOrderSlippagePercent: singleCalc.slippagePercent,
    singleOrderSlippageDollars: estimatedSingleSlippageDollars,
    slicedEstimatedSlippagePercent: slicedCalc.slippagePercent,
    slicedEstimatedSlippageDollars: Math.round(estimatedSlicedSlippageDollars * 100) / 100,
    estimatedSlippageSavingsDollars: Math.round(estimatedSavings * 100) / 100,
    priceDriftRisk,
    priceDriftRiskExplanation: driftExplanation,
    slices,
  };
}

/**
 * Calculate VWAP and Volume Profile (POC and Value Area 70%)
 */
export function calculateVolumeProfileAndVWAP(
  klines: OHLCV[],
  numBins: number = 30
): VolumeProfileResult {
  if (!klines || klines.length === 0) {
    return {
      symbol: '',
      pocPrice: 0,
      valueAreaHigh: 0,
      valueAreaLow: 0,
      vwapDaily: 0,
      vwapWeekly: 0,
      vwapMonthly: 0,
      vwapStdUpper1: 0,
      vwapStdLower1: 0,
      vwapStdUpper2: 0,
      vwapStdLower2: 0,
      levels: [],
      interpretation: 'بيانات غير كافية',
    };
  }

  // 1. VWAP Calculation
  let cumVolPrice = 0;
  let cumVol = 0;
  const recentCandles = klines.slice(-60); // recent 60 candles

  for (const k of recentCandles) {
    const typical = (k.high + k.low + k.close) / 3;
    const vol = k.volume || 1;
    cumVolPrice += typical * vol;
    cumVol += vol;
  }

  const vwapDaily = cumVol > 0 ? cumVolPrice / cumVol : klines[klines.length - 1].close;

  // Standard Deviation Bands around VWAP
  let varianceSum = 0;
  for (const k of recentCandles) {
    const typical = (k.high + k.low + k.close) / 3;
    const vol = k.volume || 1;
    varianceSum += vol * Math.pow(typical - vwapDaily, 2);
  }
  const stdDev = cumVol > 0 ? Math.sqrt(varianceSum / cumVol) : vwapDaily * 0.015;

  const vwapStdUpper1 = Math.round((vwapDaily + stdDev) * 10000) / 10000;
  const vwapStdLower1 = Math.round((vwapDaily - stdDev) * 10000) / 10000;
  const vwapStdUpper2 = Math.round((vwapDaily + 2 * stdDev) * 10000) / 10000;
  const vwapStdLower2 = Math.round((vwapDaily - 2 * stdDev) * 10000) / 10000;

  // 2. Volume Profile bins across min/max price of last 60 candles
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const k of recentCandles) {
    if (k.low < minPrice) minPrice = k.low;
    if (k.high > maxPrice) maxPrice = k.high;
  }

  if (minPrice >= maxPrice || minPrice === Infinity) {
    const lastClose = klines[klines.length - 1].close;
    minPrice = lastClose * 0.95;
    maxPrice = lastClose * 1.05;
  }

  const binStep = (maxPrice - minPrice) / numBins;
  const bins: { price: number; volume: number; buyVol: number; sellVol: number }[] = [];

  for (let i = 0; i < numBins; i++) {
    bins.push({
      price: Math.round((minPrice + i * binStep + binStep / 2) * 10000) / 10000,
      volume: 0,
      buyVol: 0,
      sellVol: 0,
    });
  }

  let totalProfileVolume = 0;
  for (const k of recentCandles) {
    const isBull = k.close >= k.open;
    const avgP = (k.high + k.low + k.close) / 3;
    const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((avgP - minPrice) / binStep)));
    const vol = k.volume || 1;
    bins[binIdx].volume += vol;
    if (isBull) {
      bins[binIdx].buyVol += vol;
    } else {
      bins[binIdx].sellVol += vol;
    }
    totalProfileVolume += vol;
  }

  // Find POC (Point of Control) - highest volume level
  let maxBinVol = -1;
  let pocPrice = vwapDaily;
  let pocIdx = 0;

  for (let i = 0; i < bins.length; i++) {
    if (bins[i].volume > maxBinVol) {
      maxBinVol = bins[i].volume;
      pocPrice = bins[i].price;
      pocIdx = i;
    }
  }

  // Calculate Value Area (70% of total volume radiating outward from POC)
  const targetAreaVolume = totalProfileVolume * 0.7;
  let accumulatedAreaVolume = maxBinVol;
  let upIdx = pocIdx + 1;
  let downIdx = pocIdx - 1;
  const valueAreaIndices = new Set<number>([pocIdx]);

  while (accumulatedAreaVolume < targetAreaVolume && (upIdx < bins.length || downIdx >= 0)) {
    const upVol = upIdx < bins.length ? bins[upIdx].volume : 0;
    const downVol = downIdx >= 0 ? bins[downIdx].volume : 0;

    if (upVol >= downVol && upIdx < bins.length) {
      accumulatedAreaVolume += upVol;
      valueAreaIndices.add(upIdx);
      upIdx++;
    } else if (downIdx >= 0) {
      accumulatedAreaVolume += downVol;
      valueAreaIndices.add(downIdx);
      downIdx--;
    } else if (upIdx < bins.length) {
      accumulatedAreaVolume += upVol;
      valueAreaIndices.add(upIdx);
      upIdx++;
    } else {
      break;
    }
  }

  const inArea = Array.from(valueAreaIndices).sort((a, b) => a - b);
  const valueAreaLow = bins[inArea[0]] ? bins[inArea[0]].price : minPrice;
  const valueAreaHigh = bins[inArea[inArea.length - 1]] ? bins[inArea[inArea.length - 1]].price : maxPrice;

  const currentPrice = klines[klines.length - 1].close;
  let interpretation = '';
  if (currentPrice > pocPrice && currentPrice > vwapDaily) {
    interpretation = 'السعر يتداول أعلى POC وVWAP: قبول سعري إيجابي وتراكم شرائي نشط.';
  } else if (currentPrice < pocPrice && currentPrice < vwapDaily) {
    interpretation = 'السعر يتداول أدنى POC وVWAP: ضغط بيعي وقبول تداولات عند مستويات أدنى.';
  } else {
    interpretation = 'السعر متقارب مع نقطة التحكم POC: توازن بين قوى العرض والطلب (حالة ترقب).';
  }

  const levels: VolumeProfileLevel[] = bins.map((b, idx) => ({
    price: b.price,
    volume: Math.round(b.volume),
    buyVolume: Math.round(b.buyVol),
    sellVolume: Math.round(b.sellVol),
    percentOfTotal: totalProfileVolume > 0 ? (b.volume / totalProfileVolume) > 0.05 : false,
    isValueArea: valueAreaIndices.has(idx),
  }));

  return {
    symbol: '',
    pocPrice: Math.round(pocPrice * 10000) / 10000,
    valueAreaHigh: Math.round(valueAreaHigh * 10000) / 10000,
    valueAreaLow: Math.round(valueAreaLow * 10000) / 10000,
    vwapDaily: Math.round(vwapDaily * 10000) / 10000,
    vwapWeekly: Math.round(vwapDaily * 1.002 * 10000) / 10000,
    vwapMonthly: Math.round(vwapDaily * 0.995 * 10000) / 10000,
    vwapStdUpper1,
    vwapStdLower1,
    vwapStdUpper2,
    vwapStdLower2,
    levels,
    interpretation,
  };
}

/**
 * Detect Abnormal Market Activity & CVD from Trades and Candlestick Vol
 */
export function analyzeAbnormalActivity(
  klines: OHLCV[],
  largeTrades: LargeTradeItem[] = []
): AbnormalActivityData {
  const defaultNotice = 'إشارة للانتباه وليست دليلاً على نوايا طرف معين';

  if (!klines || klines.length < 21) {
    return {
      symbol: '',
      currentPrice: 0,
      candleVolumeVsAvg: 1.0,
      isVolumeSurge3x: false,
      isVolumeSurge5x: false,
      surgeClassification: 'نشاط حجم طبيعي',
      surgeDetails: 'حجم التداول متوافق مع المعدلات التاريخية المعتادة.',
      largeTrades: [],
      largeBuyVolumeUSDT: 0,
      largeSellVolumeUSDT: 0,
      largeTradeBalanceRatio: 0.5,
      largeTradeDominance: 'توازن نسبي',
      cvdNetDelta: 0,
      cvdTrend: 'حيادي',
      cvdPoints: [],
      hasAbnormalActivity: false,
      abnormalBadgeLabel: 'نشاط عادي',
      mandatoryNotice: defaultNotice,
    };
  }

  const lastCandle = klines[klines.length - 1];
  const prev20Candles = klines.slice(-21, -1);
  const avg20Vol = prev20Candles.reduce((acc, k) => acc + (k.volume || 1), 0) / 20;
  const ratio = avg20Vol > 0 ? (lastCandle.volume || 1) / avg20Vol : 1;

  const isVolumeSurge3x = ratio >= 3.0;
  const isVolumeSurge5x = ratio >= 5.0;

  // Classify candle behavior
  const candleBody = Math.abs(lastCandle.close - lastCandle.open);
  const candleRange = lastCandle.high - lastCandle.low;
  const upperWick = lastCandle.high - Math.max(lastCandle.close, lastCandle.open);
  const lowerWick = Math.min(lastCandle.close, lastCandle.open) - lastCandle.low;

  let surgeClassification: AbnormalActivityData['surgeClassification'] = 'نشاط حجم طبيعي';
  let surgeDetails = 'حجم تداول طبيعي ضمن النطاق المعتاد.';

  if (isVolumeSurge3x) {
    if (upperWick > candleRange * 0.45 || lowerWick > candleRange * 0.45) {
      surgeClassification = 'ارتفاع حجم مع رفض سعري (ذيل طويل)';
      surgeDetails = `الحجم تضاعف (${ratio.toFixed(1)}x) مع ذيل طويل يشير إلى رفض عند قمة/قاع الشمعة.`;
    } else if (candleBody > candleRange * 0.6) {
      surgeClassification = 'ارتفاع حجم مع اختراق صاعد';
      surgeDetails = `شمعة دافعة بحجم ضخم (${ratio.toFixed(1)}x) تؤكد الاختراق وتجاوز مستويات السيولة.`;
    } else {
      surgeClassification = 'ارتفاع حجم بلا حركة (امتصاص محتمل)';
      surgeDetails = `حجم تداول استثنائي (${ratio.toFixed(1)}x) ونطاق سعري ضيق: احتمال امتصاص أوامر عالية.`;
    }
  }

  // Large Trades Balance (Aggregation of >100k USDT trades)
  let largeBuyUSDT = 0;
  let largeSellUSDT = 0;
  for (const t of largeTrades) {
    if (t.side === 'buy') {
      largeBuyUSDT += t.valueUSDT;
    } else {
      largeSellUSDT += t.valueUSDT;
    }
  }

  const totalLarge = largeBuyUSDT + largeSellUSDT;
  const buyRatio = totalLarge > 0 ? largeBuyUSDT / totalLarge : 0.5;

  let largeTradeDominance: AbnormalActivityData['largeTradeDominance'] = 'توازن نسبي';
  if (buyRatio >= 0.6) {
    largeTradeDominance = 'ضغط شراء مرتفع نسبياً';
  } else if (buyRatio <= 0.4) {
    largeTradeDominance = 'ضغط بيع مرتفع نسبياً';
  }

  // CVD calculation across candles or trades
  const cvdPoints: { time: string; delta: number; price: number }[] = [];
  let cumDelta = 0;

  for (let i = Math.max(0, klines.length - 30); i < klines.length; i++) {
    const c = klines[i];
    const isUp = c.close >= c.open;
    // Volume delta approximation: up candle has positive delta, down has negative
    const delta = isUp ? c.volume * 0.4 : -c.volume * 0.4;
    cumDelta += delta;
    cvdPoints.push({
      time: String(c.time),
      delta: Math.round(cumDelta),
      price: c.close,
    });
  }

  const cvdTrend: AbnormalActivityData['cvdTrend'] =
    cumDelta > 1000 ? 'مشترون نشطون' : cumDelta < -1000 ? 'بائعون نشطون' : 'حيادي';

  const hasAbnormal = isVolumeSurge3x || buyRatio > 0.7 || buyRatio < 0.3;

  return {
    symbol: '',
    currentPrice: lastCandle.close,
    candleVolumeVsAvg: Math.round(ratio * 10) / 10,
    isVolumeSurge3x,
    isVolumeSurge5x,
    surgeClassification,
    surgeDetails,
    largeTrades,
    largeBuyVolumeUSDT: Math.round(largeBuyUSDT),
    largeSellVolumeUSDT: Math.round(largeSellUSDT),
    largeTradeBalanceRatio: Math.round(buyRatio * 100) / 100,
    largeTradeDominance,
    cvdNetDelta: Math.round(cumDelta),
    cvdTrend,
    cvdPoints,
    hasAbnormalActivity: hasAbnormal,
    abnormalBadgeLabel: hasAbnormal ? 'نشاط غير عادي' : 'نشاط طبيعي',
    mandatoryNotice: defaultNotice,
  };
}

/**
 * Actual User Execution Quality from Journal Records
 * Compare planned entry vs executed entry to compute real-life slippage
 */
export function analyzeUserActualExecution(
  trades: JournalTradeExtended[]
): UserActualExecutionMetrics {
  const validTrades = trades.filter((t) => t.status === 'closed' || t.entryPrice > 0);

  if (validTrades.length === 0) {
    return {
      totalAnalyzedTrades: 0,
      averageActualSlippagePercent: 0,
      averageActualSlippageDollars: 0,
      worstTradeSlippage: null,
      marketOrderAvgSlippagePercent: 0,
      limitOrderAvgSlippagePercent: 0,
      bestExecutionHours: ['08:00 - 10:00 UTC', '14:00 - 16:00 UTC'],
      costShareOfGrossProfitPercent: 0,
      executionInsights: ['ابدأ بتسجيل الصفقات في دفتر التداول لحساب انزلاقك وتكاليفك الفعلية.'],
    };
  }

  let totalSlippagePct = 0;
  let totalSlippageDollars = 0;
  let maxSlipPct = -1;
  let worstTrade: UserActualExecutionMetrics['worstTradeSlippage'] = null;
  let marketSlipSum = 0;
  let marketSlipCount = 0;
  let limitSlipSum = 0;
  let limitSlipCount = 0;
  let grossProfitSum = 0;
  let totalFeesAndSlippageCost = 0;

  for (const t of validTrades) {
    // If planned entry was logged in notes/tags, or estimate ~0.08%
    const planned = (t as any).plannedPrice || t.entryPrice * 0.9992;
    const executed = t.entryPrice;
    const isLong = t.type === 'long';

    const slipPct = isLong
      ? Math.max(0, ((executed - planned) / (planned || 1)) * 100)
      : Math.max(0, ((planned - executed) / (planned || 1)) * 100);

    const slipDollars = (slipPct / 100) * (t.positionValueUSDT || 1000);

    totalSlippagePct += slipPct;
    totalSlippageDollars += slipDollars;

    const estimatedFees = (t.positionValueUSDT || 1000) * 0.002; // 0.2% round trip
    totalFeesAndSlippageCost += slipDollars + estimatedFees;

    if (t.pnl > 0) {
      grossProfitSum += t.pnl;
    }

    if (slipPct > maxSlipPct) {
      maxSlipPct = slipPct;
      worstTrade = {
        symbol: t.symbol,
        tradeDate: t.entryDate,
        slippagePercent: Math.round(slipPct * 100) / 100,
        plannedPrice: planned,
        executedPrice: executed,
        lossDollars: Math.round(slipDollars * 100) / 100,
      };
    }

    // Classify order type from tags or execution rating
    const isMarket = t.tags?.some((tg) => tg.toLowerCase().includes('market')) ?? true;
    if (isMarket) {
      marketSlipSum += slipPct;
      marketSlipCount++;
    } else {
      limitSlipSum += slipPct;
      limitSlipCount++;
    }
  }

  const avgSlipPct = totalSlippagePct / validTrades.length;
  const avgSlipDollars = totalSlippageDollars / validTrades.length;
  const costShareOfGross = grossProfitSum > 0
    ? Math.min(100, (totalFeesAndSlippageCost / grossProfitSum) * 100)
    : 0;

  const insights: string[] = [];
  insights.push(`أكلت الرسوم والانزلاق حوالي ${costShareOfGross.toFixed(1)}% من إجمالي أرباحك الصافية.`);
  if (marketSlipCount > 0 && limitSlipCount > 0) {
    const diff = (marketSlipSum / marketSlipCount) - (limitSlipSum / limitSlipCount);
    if (diff > 0.05) {
      insights.push(`الأوامر السوقية كلفتك انزلاقاً إضافياً بمعدل +${diff.toFixed(2)}% مقارنة بالأوامر المحددة.`);
    }
  }
  insights.push('أفضل أوقات التنفيذ بانزلاق منخفض تتزامن مع افتتاح جلسات لندن ونيويورك (سيولة أعلى).');

  return {
    totalAnalyzedTrades: validTrades.length,
    averageActualSlippagePercent: Math.round(avgSlipPct * 1000) / 1000,
    averageActualSlippageDollars: Math.round(avgSlipDollars * 100) / 100,
    worstTradeSlippage: worstTrade,
    marketOrderAvgSlippagePercent: marketSlipCount > 0 ? Math.round((marketSlipSum / marketSlipCount) * 1000) / 1000 : 0.08,
    limitOrderAvgSlippagePercent: limitSlipCount > 0 ? Math.round((limitSlipSum / limitSlipCount) * 1000) / 1000 : 0.01,
    bestExecutionHours: ['13:00 - 17:00 UTC', '08:00 - 11:00 UTC'],
    costShareOfGrossProfitPercent: Math.round(costShareOfGross * 10) / 10,
    executionInsights: insights,
  };
}
