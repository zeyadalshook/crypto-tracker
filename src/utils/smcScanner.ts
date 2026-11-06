import { OHLCV } from '../types/crypto';

export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  topPrice: number;
  bottomPrice: number;
  midPrice: number;
  gapSizePct: number;
  candleTime: string | number;
  candleIndex: number;
  mitigated: boolean;
  distanceFromCurrentPct: number;
}

export interface OrderBlockZone {
  id: string;
  type: 'demand' | 'supply';
  topPrice: number;
  bottomPrice: number;
  midPrice: number;
  volumeRatio: number;
  impulsePct: number;
  candleTime: string | number;
  mitigated: boolean;
  distanceFromCurrentPct: number;
}

export interface StructureEvent {
  type: 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH';
  labelAr: string;
  levelPrice: number;
  candleTime: string | number;
}

export interface SmcAnalysisReport {
  swingHigh: number;
  swingLow: number;
  equilibriumPrice: number;
  currentZone: 'discount' | 'equilibrium' | 'premium';
  currentZoneLabelAr: string;
  rangePositionPct: number; // 0% = at swing low, 100% = at swing high
  unmitigatedFvgs: FairValueGap[];
  orderBlocks: OrderBlockZone[];
  latestStructure: StructureEvent | null;
  buySideLiquidityLevel: number;
  sellSideLiquidityLevel: number;
  institutionalBiasAr: string;
}

/**
 * Analyzes OHLCV candles to extract Smart Money Concepts (SMC):
 * - Fair Value Gaps (FVG - Bullish & Bearish unmitigated imbalances)
 * - Institutional Order Blocks (Supply & Demand displacement zones)
 * - Premium / Equilibrium / Discount pricing zones (50% Fibonacci of active range)
 * - Buy-Side & Sell-Side Liquidity pools (Swing High/Low stop clusters)
 */
export function analyzeSmartMoneyConcepts(
  klines: OHLCV[],
  currentPrice: number
): SmcAnalysisReport {
  if (!klines || klines.length < 10 || currentPrice <= 0) {
    return {
      swingHigh: currentPrice * 1.05,
      swingLow: currentPrice * 0.95,
      equilibriumPrice: currentPrice,
      currentZone: 'equilibrium',
      currentZoneLabelAr: 'منطقة التوازن السعري (Equilibrium 50%)',
      rangePositionPct: 50,
      unmitigatedFvgs: [],
      orderBlocks: [],
      latestStructure: null,
      buySideLiquidityLevel: currentPrice * 1.05,
      sellSideLiquidityLevel: currentPrice * 0.95,
      institutionalBiasAr: 'محايد — بيانات الشموع غير كافية',
    };
  }

  // Use last 60 candles for active institutional range
  const lookback = klines.slice(-60);
  const n = lookback.length;

  let swingHigh = -Infinity;
  let swingLow = Infinity;
  let totalVolume = 0;

  for (const c of lookback) {
    if (c.high > swingHigh) swingHigh = c.high;
    if (c.low < swingLow) swingLow = c.low;
    totalVolume += c.volume || 0;
  }

  const avgVolume = totalVolume / n || 1;
  const rangeSpan = Math.max(swingHigh - swingLow, currentPrice * 0.0001);
  const equilibriumPrice = swingLow + rangeSpan * 0.5;
  const rawPosPct = ((currentPrice - swingLow) / rangeSpan) * 100;
  const rangePositionPct = Math.max(0, Math.min(100, Math.round(rawPosPct * 10) / 10));

  let currentZone: 'discount' | 'equilibrium' | 'premium' = 'equilibrium';
  let currentZoneLabelAr = 'منطقة التوازن العادل (Equilibrium 45%-55%)';

  if (rangePositionPct < 45) {
    currentZone = 'discount';
    currentZoneLabelAr = 'منطقة خصم شرائية (Discount Zone < 45%) — مفضلة لتجميع المؤسسات';
  } else if (rangePositionPct > 55) {
    currentZone = 'premium';
    currentZoneLabelAr = 'منطقة تسعير مرتفع (Premium Zone > 55%) — مفضلة لجني الأرباح أو البيع';
  }

  // 1. Detect Fair Value Gaps (3-candle imbalances)
  const allFvgs: FairValueGap[] = [];
  for (let i = 2; i < n; i++) {
    const c0 = lookback[i - 2];
    const c1 = lookback[i - 1];
    const c2 = lookback[i];

    // Bullish FVG: candle[i-2].high < candle[i].low with strong middle candle
    if (c0.high < c2.low) {
      const bottomPrice = c0.high;
      const topPrice = c2.low;
      const gapSizePct = ((topPrice - bottomPrice) / bottomPrice) * 100;

      if (gapSizePct >= 0.15) {
        // Check if subsequent candles mitigated (traded back through) the gap
        let mitigated = false;
        for (let j = i + 1; j < n; j++) {
          if (lookback[j].low <= bottomPrice) {
            mitigated = true;
            break;
          }
        }
        const midPrice = (topPrice + bottomPrice) / 2;
        allFvgs.push({
          id: `fvg-bull-${i}`,
          type: 'bullish',
          topPrice,
          bottomPrice,
          midPrice,
          gapSizePct: Math.round(gapSizePct * 100) / 100,
          candleTime: c1.time,
          candleIndex: i - 1,
          mitigated,
          distanceFromCurrentPct: Math.round(((midPrice - currentPrice) / currentPrice) * 10000) / 100,
        });
      }
    }

    // Bearish FVG: candle[i-2].low > candle[i].high
    if (c0.low > c2.high) {
      const topPrice = c0.low;
      const bottomPrice = c2.high;
      const gapSizePct = ((topPrice - bottomPrice) / bottomPrice) * 100;

      if (gapSizePct >= 0.15) {
        let mitigated = false;
        for (let j = i + 1; j < n; j++) {
          if (lookback[j].high >= topPrice) {
            mitigated = true;
            break;
          }
        }
        const midPrice = (topPrice + bottomPrice) / 2;
        allFvgs.push({
          id: `fvg-bear-${i}`,
          type: 'bearish',
          topPrice,
          bottomPrice,
          midPrice,
          gapSizePct: Math.round(gapSizePct * 100) / 100,
          candleTime: c1.time,
          candleIndex: i - 1,
          mitigated,
          distanceFromCurrentPct: Math.round(((midPrice - currentPrice) / currentPrice) * 10000) / 100,
        });
      }
    }
  }

  // Keep unmitigated FVGs first (or recent ones if all mitigated), sorted by closeness to current price
  const unmitigatedFvgs = allFvgs
    .filter((f) => !f.mitigated)
    .sort((a, b) => Math.abs(a.distanceFromCurrentPct) - Math.abs(b.distanceFromCurrentPct))
    .slice(0, 6);

  // 2. Detect Institutional Order Blocks (Supply & Demand Zones)
  const orderBlocks: OrderBlockZone[] = [];
  for (let i = 1; i < n - 2; i++) {
    const baseCandle = lookback[i];
    const next1 = lookback[i + 1];
    const next2 = lookback[i + 2];

    const move2CandlesPct = ((next2.close - baseCandle.close) / baseCandle.close) * 100;
    const volRatio = Math.max(next1.volume || 0, baseCandle.volume || 0) / avgVolume;

    // Demand Order Block: last bearish/consolidation candle before strong bullish impulse (> 1.5%)
    if (baseCandle.close <= baseCandle.open && move2CandlesPct >= 1.2) {
      const topPrice = Math.max(baseCandle.open, baseCandle.close);
      const bottomPrice = baseCandle.low;
      let mitigated = false;
      for (let j = i + 3; j < n; j++) {
        if (lookback[j].close < bottomPrice) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated && bottomPrice > 0) {
        const midPrice = (topPrice + bottomPrice) / 2;
        orderBlocks.push({
          id: `ob-demand-${i}`,
          type: 'demand',
          topPrice,
          bottomPrice,
          midPrice,
          volumeRatio: Math.round(volRatio * 100) / 100,
          impulsePct: Math.round(move2CandlesPct * 100) / 100,
          candleTime: baseCandle.time,
          mitigated,
          distanceFromCurrentPct: Math.round(((midPrice - currentPrice) / currentPrice) * 10000) / 100,
        });
      }
    }

    // Supply Order Block: last bullish candle before strong bearish impulse (< -1.2%)
    if (baseCandle.close >= baseCandle.open && move2CandlesPct <= -1.2) {
      const topPrice = baseCandle.high;
      const bottomPrice = Math.min(baseCandle.open, baseCandle.close);
      let mitigated = false;
      for (let j = i + 3; j < n; j++) {
        if (lookback[j].close > topPrice) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated && bottomPrice > 0) {
        const midPrice = (topPrice + bottomPrice) / 2;
        orderBlocks.push({
          id: `ob-supply-${i}`,
          type: 'supply',
          topPrice,
          bottomPrice,
          midPrice,
          volumeRatio: Math.round(volRatio * 100) / 100,
          impulsePct: Math.round(Math.abs(move2CandlesPct) * 100) / 100,
          candleTime: baseCandle.time,
          mitigated,
          distanceFromCurrentPct: Math.round(((midPrice - currentPrice) / currentPrice) * 10000) / 100,
        });
      }
    }
  }

  const sortedOrderBlocks = orderBlocks
    .sort((a, b) => Math.abs(a.distanceFromCurrentPct) - Math.abs(b.distanceFromCurrentPct))
    .slice(0, 6);

  // 3. Detect Latest Market Structure Break (BOS / CHoCH)
  let latestStructure: StructureEvent | null = null;
  const recentWindow = lookback.slice(-20);
  if (recentWindow.length >= 10) {
    const firstHalf = recentWindow.slice(0, 10);
    const secondHalf = recentWindow.slice(10);
    const prevHigh = Math.max(...firstHalf.map((c) => c.high));
    const prevLow = Math.min(...firstHalf.map((c) => c.low));
    const lastCandle = secondHalf[secondHalf.length - 1];

    if (lastCandle.close > prevHigh) {
      latestStructure = {
        type: 'BOS_BULLISH',
        labelAr: 'كسر هيكل صاعد (Bullish BOS) — استمرار تدفق السيولة الشرائية',
        levelPrice: prevHigh,
        candleTime: lastCandle.time,
      };
    } else if (lastCandle.close < prevLow) {
      latestStructure = {
        type: 'BOS_BEARISH',
        labelAr: 'كسر هيكل هابط (Bearish BOS) — سيطرة القوى البيعية',
        levelPrice: prevLow,
        candleTime: lastCandle.time,
      };
    } else if (currentPrice > equilibriumPrice && firstHalf[0].close > prevHigh * 0.98) {
      latestStructure = {
        type: 'CHOCH_BULLISH',
        labelAr: 'تغير طابع السوق لصاعد (Bullish CHoCH) — ارتداد من مناطق الطلب',
        levelPrice: equilibriumPrice,
        candleTime: lastCandle.time,
      };
    } else {
      latestStructure = {
        type: 'CHOCH_BEARISH',
        labelAr: 'تداول داخل النطاق الهيكلي بانتظار كسر القمة أو القاع الفرعي',
        levelPrice: equilibriumPrice,
        candleTime: lastCandle.time,
      };
    }
  }

  const bullFvgCount = unmitigatedFvgs.filter((f) => f.type === 'bullish').length;
  const bearFvgCount = unmitigatedFvgs.filter((f) => f.type === 'bearish').length;
  const demandCount = sortedOrderBlocks.filter((o) => o.type === 'demand').length;
  const supplyCount = sortedOrderBlocks.filter((o) => o.type === 'supply').length;

  let institutionalBiasAr = 'توازن مؤسسي بين قوى العرض والطلب';
  if (currentZone === 'discount' && demandCount >= supplyCount) {
    institutionalBiasAr = `إيجابي تجميعي — السعر في منطقة الخصم (${rangePositionPct}%) مع تمركز ${demandCount} كتل طلب شرائية`;
  } else if (currentZone === 'premium' && supplyCount > demandCount) {
    institutionalBiasAr = `حذر تصريفي — السعر في منطقة التسعير المرتفع (${rangePositionPct}%) قرب ${supplyCount} كتل عرض بيعية`;
  } else if (bullFvgCount > bearFvgCount) {
    institutionalBiasAr = `ميل صعودي مدعوم بـ ${bullFvgCount} فجوات سعرية عادلة (FVG) صاعدة غير مغطاة`;
  } else if (bearFvgCount > bullFvgCount) {
    institutionalBiasAr = `ضغط بيعي مع وجود ${bearFvgCount} فجوات سعرية هابطة (FVG) تعمل كمقاومات جذب`;
  }

  return {
    swingHigh,
    swingLow,
    equilibriumPrice,
    currentZone,
    currentZoneLabelAr,
    rangePositionPct,
    unmitigatedFvgs,
    orderBlocks: sortedOrderBlocks,
    latestStructure,
    buySideLiquidityLevel: swingHigh,
    sellSideLiquidityLevel: swingLow,
    institutionalBiasAr,
  };
}
