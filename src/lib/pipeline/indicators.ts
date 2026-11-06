// Fast Vectorized Indicator Precalculation
// Computes all necessary indicator arrays once into Float64Array to share across all strategies & grids

export interface PrecalculatedIndicators {
  close: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  volume: Float64Array;
  length: number;
  dates?: string[];
  
  // EMAs
  ema9: Float64Array;
  ema21: Float64Array;
  ema50: Float64Array;
  ema100: Float64Array;
  ema200: Float64Array;

  // Oscillators
  rsi14: Float64Array;
  atr14: Float64Array;
  
  // MACD
  macdLine: Float64Array;
  macdSignal: Float64Array;
  macdHist: Float64Array;

  // Donchian High/Low (20 bars)
  highest20: Float64Array;
  lowest20: Float64Array;
}

export function computeIndicatorsOnce(candles: Array<[number, number, number, number, number, number]> | any[]): PrecalculatedIndicators {
  const n = candles.length;
  const open = new Float64Array(n);
  const high = new Float64Array(n);
  const low = new Float64Array(n);
  const close = new Float64Array(n);
  const volume = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    if (Array.isArray(c)) {
      open[i] = Number(c[1]);
      high[i] = Number(c[2]);
      low[i] = Number(c[3]);
      close[i] = Number(c[4]);
      volume[i] = Number(c[5]) || 0;
    } else {
      open[i] = Number(c.open);
      high[i] = Number(c.high);
      low[i] = Number(c.low);
      close[i] = Number(c.close);
      volume[i] = Number(c.volume) || 0;
    }
  }

  // Helper for EMA
  function computeEMA(period: number): Float64Array {
    const out = new Float64Array(n);
    if (n < period) return out;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += close[i];
    out[period - 1] = sum / period;
    for (let i = period; i < n; i++) {
      out[i] = close[i] * k + out[i - 1] * (1 - k);
    }
    return out;
  }

  const ema9 = computeEMA(9);
  const ema21 = computeEMA(21);
  const ema50 = computeEMA(50);
  const ema100 = computeEMA(100);
  const ema200 = computeEMA(200);

  // ATR 14
  const atr14 = new Float64Array(n);
  if (n >= 14) {
    let trSum = 0;
    for (let i = 1; i < 14; i++) {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );
      trSum += tr;
    }
    atr14[13] = trSum / 14;
    for (let i = 14; i < n; i++) {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );
      atr14[i] = (atr14[i - 1] * 13 + tr) / 14;
    }
  }

  // RSI 14
  const rsi14 = new Float64Array(n);
  if (n >= 15) {
    let gainSum = 0;
    let lossSum = 0;
    for (let i = 1; i <= 14; i++) {
      const diff = close[i] - close[i - 1];
      if (diff >= 0) gainSum += diff;
      else lossSum += -diff;
    }
    let avgGain = gainSum / 14;
    let avgLoss = lossSum / 14;
    rsi14[14] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = 15; i < n; i++) {
      const diff = close[i] - close[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      rsi14[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }

  // MACD (12, 26, 9)
  const ema12 = computeEMA(12);
  const ema26 = computeEMA(26);
  const macdLine = new Float64Array(n);
  for (let i = 25; i < n; i++) {
    macdLine[i] = ema12[i] - ema26[i];
  }
  const macdSignal = new Float64Array(n);
  const macdHist = new Float64Array(n);
  if (n >= 34) {
    const kSig = 2 / 10;
    let sigSum = 0;
    for (let i = 25; i < 34; i++) sigSum += macdLine[i];
    macdSignal[33] = sigSum / 9;
    macdHist[33] = macdLine[33] - macdSignal[33];
    for (let i = 34; i < n; i++) {
      macdSignal[i] = macdLine[i] * kSig + macdSignal[i - 1] * (1 - kSig);
      macdHist[i] = macdLine[i] - macdSignal[i];
    }
  }

  // Donchian Highest / Lowest 20
  const highest20 = new Float64Array(n);
  const lowest20 = new Float64Array(n);
  for (let i = 19; i < n; i++) {
    let maxH = -Infinity;
    let minL = Infinity;
    for (let j = i - 19; j <= i; j++) {
      if (high[j] > maxH) maxH = high[j];
      if (low[j] < minL) minL = low[j];
    }
    highest20[i] = maxH;
    lowest20[i] = minL;
  }

  return {
    close,
    open,
    high,
    low,
    volume,
    length: n,
    ema9,
    ema21,
    ema50,
    ema100,
    ema200,
    rsi14,
    atr14,
    macdLine,
    macdSignal,
    macdHist,
    highest20,
    lowest20,
  };
}
