import { OHLCV, TechnicalAnalysisResult, IndicatorConsensus, CandlestickPattern, ChartPattern } from '../types/crypto';

// Basic calculations
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
      continue;
    }
    if (prevEma === null) {
      // First EMA is SMA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      prevEma = sum / period;
      ema.push(prevEma);
    } else {
      const currentEma: number = data[i] * k + (prevEma as number) * (1 - k);
      ema.push(currentEma);
      prevEma = currentEma;
    }
  }
  return ema;
}

export function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [];
  if (closes.length <= period) return closes.map(() => 50);

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }

  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + initialRs)));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);
  const macdLine: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }

  // Filter valid MACD values for signal line EMA
  const validMacdIndices = macdLine.map((v, idx) => (!isNaN(v) ? idx : -1)).filter((idx) => idx !== -1);
  const validMacdValues = validMacdIndices.map((idx) => macdLine[idx]);
  const signalValues = calculateEMA(validMacdValues, signalPeriod);

  const signalLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < validMacdIndices.length; i++) {
    signalLine[validMacdIndices[i]] = signalValues[i];
  }

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(sma[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(closes[i - j] - sma[i], 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper.push(sma[i] + multiplier * stdDev);
    lower.push(sma[i] - multiplier * stdDev);
  }

  return { upper, middle: sma, lower };
}

export function calculateATR(klines: OHLCV[], period = 14): number[] {
  const tr: number[] = [klines[0].high - klines[0].low];
  for (let i = 1; i < klines.length; i++) {
    const highLow = klines[i].high - klines[i].low;
    const highClose = Math.abs(klines[i].high - klines[i - 1].close);
    const lowClose = Math.abs(klines[i].low - klines[i - 1].close);
    tr.push(Math.max(highLow, highClose, lowClose));
  }
  return calculateSMA(tr, period);
}

export function calculateStochastic(klines: OHLCV[], kPeriod = 14, dPeriod = 3) {
  const kList: number[] = [];
  for (let i = 0; i < klines.length; i++) {
    if (i < kPeriod - 1) {
      kList.push(NaN);
      continue;
    }
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, klines[i - j].high);
      lowestLow = Math.min(lowestLow, klines[i - j].low);
    }
    const currentClose = klines[i].close;
    const k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kList.push(k);
  }

  const validKIndices = kList.map((v, idx) => (!isNaN(v) ? idx : -1)).filter((idx) => idx !== -1);
  const validK = validKIndices.map((idx) => kList[idx]);
  const dValid = calculateSMA(validK, dPeriod);
  const dList: number[] = new Array(klines.length).fill(NaN);
  for (let i = 0; i < validKIndices.length; i++) {
    dList[validKIndices[i]] = dValid[i];
  }

  return { k: kList, d: dList };
}

export function calculateWilliamsR(klines: OHLCV[], period = 14): number[] {
  const rList: number[] = [];
  for (let i = 0; i < klines.length; i++) {
    if (i < period - 1) {
      rList.push(NaN);
      continue;
    }
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < period; j++) {
      highestHigh = Math.max(highestHigh, klines[i - j].high);
      lowestLow = Math.min(lowestLow, klines[i - j].low);
    }
    const currentClose = klines[i].close;
    const wr = highestHigh === lowestLow ? -50 : ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    rList.push(wr);
  }
  return rList;
}

export function calculateCCI(klines: OHLCV[], period = 20): number[] {
  const tp: number[] = klines.map((k) => (k.high + k.low + k.close) / 3);
  const smaTp = calculateSMA(tp, period);
  const cci: number[] = [];

  for (let i = 0; i < klines.length; i++) {
    if (isNaN(smaTp[i])) {
      cci.push(NaN);
      continue;
    }
    let meanDev = 0;
    for (let j = 0; j < period; j++) {
      meanDev += Math.abs(tp[i - j] - smaTp[i]);
    }
    meanDev /= period;
    const val = meanDev === 0 ? 0 : (tp[i] - smaTp[i]) / (0.015 * meanDev);
    cci.push(val);
  }
  return cci;
}

export function calculateMomentum(closes: number[], period = 10): number[] {
  const mom: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      mom.push(NaN);
    } else {
      mom.push(closes[i] - closes[i - period]);
    }
  }
  return mom;
}

export function calculateADX(klines: OHLCV[], period = 14): number[] {
  if (klines.length < period * 2) {
    return new Array(klines.length).fill(25);
  }

  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [klines[0].high - klines[0].low];

  for (let i = 1; i < klines.length; i++) {
    const upMove = klines[i].high - klines[i - 1].high;
    const downMove = klines[i - 1].low - klines[i].low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const highLow = klines[i].high - klines[i].low;
    const highClose = Math.abs(klines[i].high - klines[i - 1].close);
    const lowClose = Math.abs(klines[i].low - klines[i - 1].close);
    tr.push(Math.max(highLow, highClose, lowClose));
  }

  const smoothedTR = calculateSMA(tr, period);
  const smoothedPlusDM = calculateSMA(plusDM, period);
  const smoothedMinusDM = calculateSMA(minusDM, period);

  const dx: number[] = [];
  for (let i = 0; i < klines.length; i++) {
    if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
      dx.push(NaN);
      continue;
    }
    const plusDI = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const minusDI = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    const sumDI = plusDI + minusDI;
    const val = sumDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / sumDI) * 100;
    dx.push(val);
  }

  const validDx = dx.filter((v) => !isNaN(v));
  const adxValues = calculateSMA(validDx, period);
  const adxResult = new Array(klines.length).fill(NaN);
  let dxIdx = 0;
  for (let i = 0; i < klines.length; i++) {
    if (!isNaN(dx[i])) {
      adxResult[i] = adxValues[dxIdx] || 25;
      dxIdx++;
    }
  }

  return adxResult;
}

export function calculateSupertrend(klines: OHLCV[], period = 10, multiplier = 3) {
  const atr = calculateATR(klines, period);
  let trend: 'صاعد' | 'هابط' = 'صاعد';
  let upperBand = 0;
  let lowerBand = 0;
  let finalSupertrend = 0;

  for (let i = period; i < klines.length; i++) {
    const curATR = atr[i] || (klines[i].high - klines[i].low);
    const hl2 = (klines[i].high + klines[i].low) / 2;
    const basicUpper = hl2 + multiplier * curATR;
    const basicLower = hl2 - multiplier * curATR;

    if (basicUpper < upperBand || klines[i - 1].close > upperBand) {
      upperBand = basicUpper;
    }
    if (basicLower > lowerBand || klines[i - 1].close < lowerBand) {
      lowerBand = basicLower;
    }

    if (klines[i].close > upperBand) {
      trend = 'صاعد';
    } else if (klines[i].close < lowerBand) {
      trend = 'هابط';
    }

    finalSupertrend = trend === 'صاعد' ? lowerBand : upperBand;
  }

  return { trend, value: finalSupertrend };
}

// Annualized Volatility = stdDev(daily returns) * sqrt(365) * 100
export function calculateAnnualizedVolatility(closes: number[]): number {
  if (closes.length < 2) return 50;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  return Math.round(stdDev * Math.sqrt(365) * 100 * 10) / 10;
}

// Candlestick pattern detection
export function detectCandlestickPatterns(klines: OHLCV[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = [];
  if (klines.length < 5) return patterns;

  const len = klines.length;
  const curr = klines[len - 1];
  const prev = klines[len - 2];
  const pprev = klines[len - 3];

  const currBody = Math.abs(curr.close - curr.open);
  const currRange = curr.high - curr.low;
  const prevBody = Math.abs(prev.close - prev.open);

  // Bullish Engulfing
  if (prev.close < prev.open && curr.close > curr.open && curr.open <= prev.close && curr.close >= prev.open && currBody > prevBody) {
    patterns.push({
      name: 'Bullish Engulfing',
      arabicName: 'شمعة ابتلاعية صاعدة',
      type: 'bullish',
      time: curr.time,
      description: 'إشارة انعكاس صاعد قوية بعد سيطرة المشترين بالكامل على الشمعة السابقة.',
    });
  }

  // Bearish Engulfing
  if (prev.close > prev.open && curr.close < curr.open && curr.open >= prev.close && curr.close <= prev.open && currBody > prevBody) {
    patterns.push({
      name: 'Bearish Engulfing',
      arabicName: 'شمعة ابتلاعية هابطة',
      type: 'bearish',
      time: curr.time,
      description: 'إشارة انعكاس هابط تدل على هجوم البائعين وتغطية نطاق الشمعة السابقة.',
    });
  }

  // Hammer (مطرقة)
  const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
  const upperShadow = curr.high - Math.max(curr.open, curr.close);
  if (currRange > 0 && lowerShadow >= 2 * currBody && upperShadow <= 0.2 * currBody && prev.close < prev.open) {
    patterns.push({
      name: 'Hammer',
      arabicName: 'شمعة المطرقة (Hammer)',
      type: 'bullish',
      time: curr.time,
      description: 'شمعة ذات ظل سفلي طويل تدل على رفض الأسعار المنخفضة وارتداد صعودي محتمل.',
    });
  }

  // Doji
  if (currRange > 0 && currBody / currRange < 0.1) {
    patterns.push({
      name: 'Doji',
      arabicName: 'شمعة دوجي (Doji)',
      type: 'neutral',
      time: curr.time,
      description: 'تساوي تقريبي بين سعر الافتتاح والإغلاق يعكس حالة تردد بين المشترين والبائعين.',
    });
  }

  // Morning Star (نجمة الصباح)
  if (pprev.close < pprev.open && Math.abs(prev.close - prev.open) < pprev.high - pprev.low * 0.3 && curr.close > curr.open && curr.close > (pprev.open + pprev.close) / 2) {
    patterns.push({
      name: 'Morning Star',
      arabicName: 'نجمة الصباح (Morning Star)',
      type: 'bullish',
      time: curr.time,
      description: 'نموذج انعكاسي ثلاثي صاعد يعلن انتهاء الضغط البيعي وبدء موجة صعود جديدة.',
    });
  }

  return patterns;
}

// Chart patterns detection
export function detectChartPatterns(klines: OHLCV[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  if (klines.length < 30) return patterns;

  const closes = klines.map((k) => k.close);
  const recentCloses = closes.slice(-30);
  const minPrice = Math.min(...recentCloses);
  const maxPrice = Math.max(...recentCloses);
  const currentPrice = closes[closes.length - 1];

  // Double Bottom check
  const lows = recentCloses.map((c, i) => (c <= minPrice * 1.02 ? i : -1)).filter((i) => i !== -1);
  if (lows.length >= 2 && Math.abs(lows[lows.length - 1] - lows[0]) >= 8) {
    patterns.push({
      name: 'Double Bottom',
      arabicName: 'نموذج القاع المزدوج (W)',
      type: 'bullish',
      description: 'اختبار مستوى الدعم مرتين بنجاح، ما يدعم صعود السعر نحو مستويات المقاومة.',
    });
  }

  // Double Top check
  const highs = recentCloses.map((c, i) => (c >= maxPrice * 0.98 ? i : -1)).filter((i) => i !== -1);
  if (highs.length >= 2 && Math.abs(highs[highs.length - 1] - highs[0]) >= 8) {
    patterns.push({
      name: 'Double Top',
      arabicName: 'نموذج القمة المزدوجة (M)',
      type: 'bearish',
      description: 'فشل اختراق القمة مرتين متتاليتين، مما يشير إلى مقاومة قوية واحتمال تراجع.',
    });
  }

  // Ascending Consolidation
  if (currentPrice > maxPrice * 0.95 && lows.length >= 1) {
    patterns.push({
      name: 'Ascending Consolidation',
      arabicName: 'تجمع صاعد واختناق سعري',
      type: 'bullish',
      description: 'قيعان صاعدة تدريجياً تضغط على المقاومة استعداداً لاختراق إيجابي.',
    });
  }

  return patterns;
}

// Main Technical Analysis Engine Function
export function runCompleteTechnicalAnalysis(
  klines: OHLCV[],
  currentPrice: number,
  sentimentVotesUp = 75,
  priceChange7d = 0,
  priceChange1y = 0
): TechnicalAnalysisResult {
  if (!klines || klines.length === 0) {
    throw new Error('No klines data provided for technical analysis');
  }

  const closes = klines.map((k) => k.close);
  const len = closes.length;
  const lastIndex = len - 1;

  // Moving Averages
  const sma10 = calculateSMA(closes, 10)[lastIndex] || currentPrice;
  const sma20 = calculateSMA(closes, 20)[lastIndex] || currentPrice;
  const sma30 = calculateSMA(closes, 30)[lastIndex] || currentPrice;
  const sma50 = calculateSMA(closes, 50)[lastIndex] || currentPrice;
  const sma100 = calculateSMA(closes, 100)[lastIndex] || currentPrice;
  const sma200 = calculateSMA(closes, 200)[lastIndex] || currentPrice;

  const ema10 = calculateEMA(closes, 10)[lastIndex] || currentPrice;
  const ema20 = calculateEMA(closes, 20)[lastIndex] || currentPrice;
  const ema30 = calculateEMA(closes, 30)[lastIndex] || currentPrice;
  const ema50 = calculateEMA(closes, 50)[lastIndex] || currentPrice;
  const ema100 = calculateEMA(closes, 100)[lastIndex] || currentPrice;
  const ema200 = calculateEMA(closes, 200)[lastIndex] || currentPrice;

  // Oscillators
  const rsiSeries = calculateRSI(closes, 14);
  const rsi14 = Math.round((rsiSeries[lastIndex] || 50) * 10) / 10;

  const macdObj = calculateMACD(closes, 12, 26, 9);
  const macdVal = macdObj.macd[lastIndex] || 0;
  const signalVal = macdObj.signal[lastIndex] || 0;
  const histVal = macdObj.histogram[lastIndex] || 0;

  const adxSeries = calculateADX(klines, 14);
  const adx14 = Math.round((adxSeries[lastIndex] || 25) * 10) / 10;

  const stochObj = calculateStochastic(klines, 14, 3);
  const stochK = Math.round((stochObj.k[lastIndex] || 50) * 10) / 10;
  const stochD = Math.round((stochObj.d[lastIndex] || 50) * 10) / 10;

  const cciSeries = calculateCCI(klines, 20);
  const cci20 = Math.round((cciSeries[lastIndex] || 0) * 10) / 10;

  const wrSeries = calculateWilliamsR(klines, 14);
  const williamsR = Math.round((wrSeries[lastIndex] || -50) * 10) / 10;

  const momSeries = calculateMomentum(closes, 10);
  const momentum10 = Math.round((momSeries[lastIndex] || 0) * 100) / 100;

  const bb = calculateBollingerBands(closes, 20, 2);
  const bbUpper = bb.upper[lastIndex] || currentPrice * 1.05;
  const bbMiddle = bb.middle[lastIndex] || currentPrice;
  const bbLower = bb.lower[lastIndex] || currentPrice * 0.95;

  const atrSeries = calculateATR(klines, 14);
  const atr14 = atrSeries[lastIndex] || (klines[lastIndex].high - klines[lastIndex].low);

  const supertrend = calculateSupertrend(klines, 10, 3);
  const annualizedVolatility = calculateAnnualizedVolatility(closes);

  // Moving Averages Consensus (12 items)
  const maList = [
    { name: 'SMA (10)', val: sma10 },
    { name: 'SMA (20)', val: sma20 },
    { name: 'SMA (30)', val: sma30 },
    { name: 'SMA (50)', val: sma50 },
    { name: 'SMA (100)', val: sma100 },
    { name: 'SMA (200)', val: sma200 },
    { name: 'EMA (10)', val: ema10 },
    { name: 'EMA (20)', val: ema20 },
    { name: 'EMA (30)', val: ema30 },
    { name: 'EMA (50)', val: ema50 },
    { name: 'EMA (100)', val: ema100 },
    { name: 'EMA (200)', val: ema200 },
  ];

  let maBuy = 0;
  let maSell = 0;
  let maNeutral = 0;
  const maItems = maList.map((item) => {
    let action: 'شراء' | 'محايد' | 'بيع' = 'محايد';
    const diffPercent = ((currentPrice - item.val) / item.val) * 100;
    if (diffPercent > 0.5) {
      action = 'شراء';
      maBuy++;
    } else if (diffPercent < -0.5) {
      action = 'بيع';
      maSell++;
    } else {
      maNeutral++;
    }
    return { name: item.name, value: item.val, action };
  });

  const maOverall: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي' =
    maBuy >= 9 ? 'شراء قوي' : maBuy >= 6 ? 'شراء' : maSell >= 9 ? 'بيع قوي' : maSell >= 6 ? 'بيع' : 'محايد';

  const maConsensus: IndicatorConsensus = {
    buyCount: maBuy,
    neutralCount: maNeutral,
    sellCount: maSell,
    overall: maOverall,
    items: maItems,
  };

  // Oscillators Consensus (6 items)
  let oscBuy = 0;
  let oscSell = 0;
  let oscNeutral = 0;
  const oscItems: { name: string; value: number | string; action: 'شراء' | 'محايد' | 'بيع' }[] = [];

  // RSI
  const rsiAction: 'شراء' | 'محايد' | 'بيع' = rsi14 < 30 ? 'شراء' : rsi14 > 70 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'RSI (14)', value: rsi14, action: rsiAction });
  if (rsiAction === 'شراء') oscBuy++; else if (rsiAction === 'بيع') oscSell++; else oscNeutral++;

  // MACD
  const macdAction: 'شراء' | 'محايد' | 'بيع' = histVal > 0 ? 'شراء' : histVal < 0 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'MACD (12,26,9)', value: histVal.toFixed(4), action: macdAction });
  if (macdAction === 'شراء') oscBuy++; else if (macdAction === 'بيع') oscSell++; else oscNeutral++;

  // Stochastic
  const stochAction: 'شراء' | 'محايد' | 'بيع' = stochK < 20 ? 'شراء' : stochK > 80 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'Stochastic (14,3,3)', value: `${stochK} / ${stochD}`, action: stochAction });
  if (stochAction === 'شراء') oscBuy++; else if (stochAction === 'بيع') oscSell++; else oscNeutral++;

  // CCI
  const cciAction: 'شراء' | 'محايد' | 'بيع' = cci20 < -100 ? 'شراء' : cci20 > 100 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'CCI (20)', value: cci20, action: cciAction });
  if (cciAction === 'شراء') oscBuy++; else if (cciAction === 'بيع') oscSell++; else oscNeutral++;

  // Williams %R
  const wrAction: 'شراء' | 'محايد' | 'بيع' = williamsR < -80 ? 'شراء' : williamsR > -20 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'Williams %R', value: williamsR, action: wrAction });
  if (wrAction === 'شراء') oscBuy++; else if (wrAction === 'بيع') oscSell++; else oscNeutral++;

  // Momentum
  const momAction: 'شراء' | 'محايد' | 'بيع' = momentum10 > 0 ? 'شراء' : momentum10 < 0 ? 'بيع' : 'محايد';
  oscItems.push({ name: 'Momentum (10)', value: momentum10, action: momAction });
  if (momAction === 'شراء') oscBuy++; else if (momAction === 'بيع') oscSell++; else oscNeutral++;

  const oscOverall: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي' =
    oscBuy >= 4 ? 'شراء قوي' : oscBuy >= 3 ? 'شراء' : oscSell >= 4 ? 'بيع قوي' : oscSell >= 3 ? 'بيع' : 'محايد';

  const oscillatorsConsensus: IndicatorConsensus = {
    buyCount: oscBuy,
    neutralCount: oscNeutral,
    sellCount: oscSell,
    overall: oscOverall,
    items: oscItems,
  };

  // Trend determination:
  let trend: 'صاعد' | 'هابط' | 'عرضي' = 'عرضي';
  if (currentPrice > ema50 && ema50 > ema200) {
    trend = 'صاعد';
  } else if (currentPrice < ema50 && ema50 < ema200) {
    trend = 'هابط';
  } else {
    trend = 'عرضي';
  }

  // Pivot Points from last 7 daily candles
  const last7 = klines.slice(-7);
  const highWeek = Math.max(...last7.map((k) => k.high));
  const lowWeek = Math.min(...last7.map((k) => k.low));
  const closeWeek = last7[last7.length - 1].close;

  const pp = (highWeek + lowWeek + closeWeek) / 3;
  let r1 = 2 * pp - lowWeek;
  let s1 = 2 * pp - highWeek;
  let r2 = pp + (highWeek - lowWeek);
  let s2 = pp - (highWeek - lowWeek);

  const localHighs = klines.slice(-60).map((k) => k.high).filter((h) => h > currentPrice);
  if (localHighs.length > 0) {
    const nearestHigh = Math.min(...localHighs);
    if (r1 <= currentPrice) r1 = nearestHigh;
    if (r2 <= r1) r2 = Math.max(...localHighs);
  } else if (r1 <= currentPrice) {
    r1 = currentPrice * 1.06;
    r2 = currentPrice * 1.15;
  }

  const localLows = klines.slice(-60).map((k) => k.low).filter((l) => l < currentPrice);
  if (localLows.length > 0) {
    const nearestLow = Math.max(...localLows);
    if (s1 >= currentPrice) s1 = nearestLow;
    if (s2 >= s1) s2 = Math.min(...localLows);
  } else if (s1 >= currentPrice) {
    s1 = currentPrice * 0.94;
    s2 = currentPrice * 0.88;
  }

  const swingLow = Math.min(...klines.slice(-30).map((k) => k.low));
  const swingHigh = Math.max(...klines.slice(-30).map((k) => k.high));
  const fibTarget = swingHigh + 0.618 * (swingHigh - swingLow);
  const target = Math.max(r1 * 1.05, fibTarget);

  const distanceToR1Percent = Math.round(((r1 - currentPrice) / currentPrice) * 1000) / 10;
  const distanceToS1Percent = Math.round(((currentPrice - s1) / currentPrice) * 1000) / 10;
  const distanceToTargetPercent = Math.round(((target - currentPrice) / currentPrice) * 1000) / 10;

  // Weighted Momentum Score (0-100)
  const maScore = (maBuy / 12) * 100;
  const oscScore = ((oscBuy + oscNeutral * 0.5) / 6) * 100;
  const macdScore = histVal > 0 ? (macdVal > signalVal ? 90 : 65) : (macdVal < signalVal ? 15 : 40);
  const trendScore = trend === 'صاعد' ? (adx14 > 25 ? 90 : 70) : trend === 'هابط' ? (adx14 > 25 ? 15 : 30) : 50;
  const commScore = sentimentVotesUp || 50;

  const momentumScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        maScore * 0.3 +
        oscScore * 0.3 +
        macdScore * 0.15 +
        trendScore * 0.1 +
        commScore * 0.15
      )
    )
  );

  let recommendation: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي' = 'محايد';
  if (momentumScore >= 80) recommendation = 'شراء قوي';
  else if (momentumScore >= 60) recommendation = 'شراء';
  else if (momentumScore >= 40) recommendation = 'محايد';
  else if (momentumScore >= 20) recommendation = 'بيع';
  else recommendation = 'بيع قوي';

  // Volume trend analysis
  const monthlyVolumes: { month: string; volume: number; isCurrentMonth: boolean }[] = [];
  const monthMap: Record<string, number> = {};

  for (let i = 0; i < klines.length; i++) {
    const d = new Date(typeof klines[i].time === 'number' ? (klines[i].time as number) * 1000 : klines[i].time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + klines[i].volume;
  }

  const sortedMonthKeys = Object.keys(monthMap).sort().slice(-8);
  const arabicMonthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  sortedMonthKeys.forEach((key, idx) => {
    const parts = key.split('-');
    const mNum = parseInt(parts[1], 10) - 1;
    monthlyVolumes.push({
      month: arabicMonthNames[mNum] || key,
      volume: monthMap[key],
      isCurrentMonth: idx === sortedMonthKeys.length - 1,
    });
  });

  const prevMonths = monthlyVolumes.slice(0, -1);
  const avgPrevVol = prevMonths.length > 0 ? prevMonths.reduce((a, b) => a + b.volume, 0) / prevMonths.length : 1;
  const currentMonthVol = monthlyVolumes[monthlyVolumes.length - 1]?.volume || 0;
  const currentVsAvgPercent = Math.round(((currentMonthVol - avgPrevVol) / avgPrevVol) * 100);
  const isDeclining = currentVsAvgPercent < -25;
  const isSurging = currentVsAvgPercent > 40;

  // Mixed Picture
  let isMixedPicture = false;
  let mixedPictureReason = '';
  if ((priceChange7d > 5 && priceChange1y < -30) || (priceChange7d < -5 && priceChange1y > 40)) {
    isMixedPicture = true;
    mixedPictureReason = 'تعارض زمني: أداء الأسبوع القصير المدى يعاكس الاتجاه السنوي العام للعملة.';
  } else if ((maOverall === 'شراء' || maOverall === 'شراء قوي') && (oscOverall === 'بيع' || oscOverall === 'بيع قوي')) {
    isMixedPicture = true;
    mixedPictureReason = 'تعارض المؤشرات: المتوسطات المتحركة تظهر اتجاهاً صاعداً بينما المذبذبات في مناطق تشبع شرائي تدعو للتحفظ.';
  } else if ((maOverall === 'بيع' || maOverall === 'بيع قوي') && (oscOverall === 'شراء' || oscOverall === 'شراء قوي')) {
    isMixedPicture = true;
    mixedPictureReason = 'تعارض المؤشرات: الاتجاه العام هابط لكن المذبذبات وصلت لمناطق تشبع بيعي حاد تنبئ بارتداد محتمل.';
  }

  const positivePoints: string[] = [];
  const cautionPoints: string[] = [];

  if (currentPrice > ema200) {
    positivePoints.push(`السعر يتداول فوق متوسط 200 يوم (${ema200.toFixed(4)}) مما يؤكد استقرار الاتجاه الإيجابي.`);
  } else {
    cautionPoints.push(`السعر يتداول تحت متوسط 200 يوم (${ema200.toFixed(4)}) وهو ما يُبقي الضغط السلبي قائماً.`);
  }

  if (currentPrice > ema50 && ema50 > ema200) {
    positivePoints.push(`ترتيب المتوسطات المتحركة (Golden Alignment) صاعد بين EMA50 وEMA200.`);
  }

  if (rsi14 >= 45 && rsi14 <= 65) {
    positivePoints.push(`مؤشر القوة النسبية RSI عند ${rsi14} يتحرك في منطقة صحية ومتوازنة دون تشبع مفرط.`);
  } else if (rsi14 > 70) {
    cautionPoints.push(`مؤشر RSI وصل إلى ${rsi14} (منطقة تشبع شرائي Overbought) مما يرفع احتمالية جني أرباح وتصحيح مؤقت.`);
  } else if (rsi14 < 30) {
    positivePoints.push(`مؤشر RSI عند ${rsi14} يقع في منطقة تشبع بيعي (Oversold) قد توفر فرصة ارتداد شرائي.`);
  }

  if (histVal > 0) {
    positivePoints.push(`تقاطع إيجابي في مؤشر MACD واستمرار زخم الهيستوجرام الأخضر.`);
  } else {
    cautionPoints.push(`مؤشر MACD في المنطقة السلبية يعكس استمرار السيطرة البيعية اللحظية.`);
  }

  if (sentimentVotesUp >= 75) {
    positivePoints.push(`أغلبية ساحقة من مجتمع المتداولين (${sentimentVotesUp}%) متفائلون بمستقبل العملة.`);
  } else if (sentimentVotesUp <= 45) {
    cautionPoints.push(`معنويات المجتمع منخفضة (${sentimentVotesUp}% فقط متفائلون) مما يقلل السيولة الدافعة.`);
  }

  if (isDeclining) {
    cautionPoints.push(`أحجام التداول في تراجع ملحوظ بنسبة (${currentVsAvgPercent}%) مقارنة بمتوسط الأشهر السابقة.`);
  } else if (isSurging) {
    positivePoints.push(`ارتفاع غير مسبوق في أحجام التداول (+${currentVsAvgPercent}%) يرجح دخول سيولة مؤسسية.`);
  }

  if (annualizedVolatility > 65) {
    cautionPoints.push(`مستوى تقلبات سنوية مرتفع (${annualizedVolatility}%) يتطلب إدارة صارمة لحجم الصفقة ووقف الخسارة.`);
  }

  positivePoints.push(`اختراق المقاومة R1 (${r1.toFixed(4)}) قد يفتح الباب لاستهداف القمة المستهدفة (${target.toFixed(4)}).`);
  cautionPoints.push(`كسر الدعم S1 (${s1.toFixed(4)}) قد يسرع وتيرة الهبوط نحو الدعم الثاني (${s2.toFixed(4)}).`);

  const candlestickPatterns = detectCandlestickPatterns(klines);
  const chartPatterns = detectChartPatterns(klines);

  let divergence: TechnicalAnalysisResult['divergence'] = undefined;
  if (klines.length >= 20) {
    const p1 = klines[klines.length - 15].close;
    const p2 = klines[klines.length - 1].close;
    const r1 = rsiSeries[rsiSeries.length - 15] || 50;
    const r2 = rsiSeries[rsiSeries.length - 1] || 50;

    if (p2 < p1 && r2 > r1 + 4) {
      divergence = {
        type: 'صاعد',
        indicator: 'RSI',
        description: 'دايفرجنس إيجابي (صاعد): السعر يسجل قاعاً أدنى بينما مؤشر RSI يسجل قاعاً أعلى، إشارة لقرب الانعكاس صعوداً.',
      };
      positivePoints.unshift(divergence.description);
    } else if (p2 > p1 && r2 < r1 - 4) {
      divergence = {
        type: 'هابط',
        indicator: 'RSI',
        description: 'دايفرجنس سلبي (هابط): السعر يسجل قمة أعلى بينما مؤشر RSI يسجل قمة أدنى، تحذير من ضعف قوة الاندفاع.',
      };
      cautionPoints.unshift(divergence.description);
    }
  }

  return {
    trend,
    recommendation,
    momentumScore,
    pivots: {
      pp,
      r1,
      r2,
      s1,
      s2,
      target,
      ema200,
      ema50,
      sma20,
    },
    distanceToR1Percent,
    distanceToS1Percent,
    distanceToTargetPercent,
    rsi14,
    macd: {
      macd: macdVal,
      signal: signalVal,
      histogram: histVal,
    },
    adx14,
    stochastic: {
      k: stochK,
      d: stochD,
    },
    cci20,
    williamsR,
    momentum10,
    annualizedVolatility,
    bollingerBands: {
      upper: bbUpper,
      middle: bbMiddle,
      lower: bbLower,
    },
    atr14,
    supertrend,
    maConsensus,
    oscillatorsConsensus,
    positivePoints,
    cautionPoints,
    isMixedPicture,
    mixedPictureReason,
    volumeTrend: {
      currentVsAvgPercent,
      isDeclining,
      isSurging,
    },
    candlestickPatterns,
    chartPatterns,
    divergence,
    monthlyVolumes,
  };
}
