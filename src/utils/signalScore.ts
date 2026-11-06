// Pure Functional Engine for Signal Score Summary (ملخص الإشارات المئوي)
// Aggregates Trend, Momentum, Oscillators, Volume, Sentiment, and S/R into a single score (-100 to +100)

import { OHLCV, TechnicalAnalysisResult, FearAndGreedData } from '../types/crypto';

export type SignalAction = 'buy' | 'neutral' | 'sell';

export interface IndicatorScoreItem {
  id: string;
  name: string;
  group: 'trend' | 'momentum' | 'oscillators' | 'volume' | 'sentiment' | 'levels';
  groupNameAr: string;
  rawDisplay: string;
  signal: SignalAction; // 'buy' (+1), 'neutral' (0), 'sell' (-1)
  scoreValue: number; // +1, 0, -1
  weight: number;
  reason: string;
}

export interface GroupScoreBreakdown {
  groupId: 'trend' | 'momentum' | 'oscillators' | 'volume' | 'sentiment' | 'levels';
  groupNameAr: string;
  weight: number; // e.g. 0.35 (35%)
  effectiveWeight: number; // after ADX modulation
  avgSignal: number; // -1 to +1
  scoreContribution: number; // e.g. +18.5
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  indicators: IndicatorScoreItem[];
}

export interface TimeframeSignalItem {
  timeframe: string;
  score: number; // -100 to +100
  classification: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي';
  color: string;
}

export interface SignalScoreResult {
  netScore: number; // -100 to +100
  buyPercentage: number; // e.g. 68%
  neutralPercentage: number; // e.g. 20%
  sellPercentage: number; // e.g. 12%
  classification: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي';
  confidence: 'عالية' | 'متوسطة' | 'منخفضة';
  confidenceReason: string;
  hasSignalConflict: boolean;
  conflictReason?: string;
  isNoTradeFilterActive: boolean;
  noTradeReason?: string;
  groups: GroupScoreBreakdown[];
  indicators: IndicatorScoreItem[];
  topBullishDrivers: string[];
  topBearishDrivers: string[];
  multiTimeframe: TimeframeSignalItem[];
  summaryText: string;
  adxModulated: boolean;
}

export interface SignalWeightsConfig {
  trendWeight: number; // default 0.35
  momentumWeight: number; // default 0.25
  oscillatorsWeight: number; // default 0.15
  volumeWeight: number; // default 0.10
  sentimentWeight: number; // default 0.05
  levelsWeight: number; // default 0.10
}

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeightsConfig = {
  trendWeight: 0.35,
  momentumWeight: 0.25,
  oscillatorsWeight: 0.15,
  volumeWeight: 0.10,
  sentimentWeight: 0.05,
  levelsWeight: 0.10,
};

export function computeSignalScore(
  klines: OHLCV[],
  analysis: TechnicalAnalysisResult,
  fearGreed?: FearAndGreedData | null,
  customWeights: SignalWeightsConfig = DEFAULT_SIGNAL_WEIGHTS
): SignalScoreResult {
  if (!klines || klines.length < 20) {
    return generateFallbackResult();
  }

  const currentClose = klines[klines.length - 1].close;
  const prevClose = klines[klines.length - 2]?.close || currentClose;
  const items: IndicatorScoreItem[] = [];

  // ==========================================
  // 1. TREND GROUP (المتوسطات، التقاطعات، Supertrend)
  // ==========================================
  // EMA 50
  const ema50Val = analysis.pivots.ema50 || currentClose;
  const ema50Signal: SignalAction = currentClose > ema50Val ? 'buy' : currentClose < ema50Val ? 'sell' : 'neutral';
  items.push({
    id: 'ema_50',
    name: 'متوسط EMA 50',
    group: 'trend',
    groupNameAr: 'الاتجاه',
    rawDisplay: `$${ema50Val.toFixed(2)}`,
    signal: ema50Signal,
    scoreValue: ema50Signal === 'buy' ? 1 : ema50Signal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: currentClose > ema50Val ? 'السعر يتداول أعلى متوسط 50 يوم (اتجاه صاعد)' : 'السعر أدنى متوسط 50 يوم (اتجاه هابط)',
  });

  // EMA 200
  const ema200Val = analysis.pivots.ema200 || currentClose;
  const ema200Signal: SignalAction = currentClose > ema200Val ? 'buy' : currentClose < ema200Val ? 'sell' : 'neutral';
  items.push({
    id: 'ema_200',
    name: 'متوسط EMA 200 (الخط الفاصل)',
    group: 'trend',
    groupNameAr: 'الاتجاه',
    rawDisplay: `$${ema200Val.toFixed(2)}`,
    signal: ema200Signal,
    scoreValue: ema200Signal === 'buy' ? 1 : ema200Signal === 'sell' ? -1 : 0,
    weight: 1.2,
    reason: currentClose > ema200Val ? 'السعر فوق متوسط 200 يوم (نطاق صاعد رئيسي)' : 'السعر تحت متوسط 200 يوم (نطاق هابط رئيسي)',
  });

  // Golden / Death Cross
  const goldenCrossSignal: SignalAction = ema50Val > ema200Val ? 'buy' : 'sell';
  items.push({
    id: 'golden_cross',
    name: 'تقاطع EMA 50 / 200',
    group: 'trend',
    groupNameAr: 'الاتجاه',
    rawDisplay: ema50Val > ema200Val ? 'تقاطع ذهبي (+)' : 'تقاطع سلبي (-)',
    signal: goldenCrossSignal,
    scoreValue: goldenCrossSignal === 'buy' ? 1 : -1,
    weight: 1.2,
    reason: ema50Val > ema200Val ? 'تقاطع ذهبي إيجابي يدعم الاتجاه الصاعد' : 'تقاطع موت سلبي يضغط على السعر',
  });

  // Supertrend
  const st = analysis.supertrend;
  const stSignal: SignalAction = st ? (st.trend === 'صاعد' ? 'buy' : 'sell') : 'neutral';
  items.push({
    id: 'supertrend',
    name: 'مؤشر Supertrend',
    group: 'trend',
    groupNameAr: 'الاتجاه',
    rawDisplay: st ? st.trend : '—',
    signal: stSignal,
    scoreValue: stSignal === 'buy' ? 1 : stSignal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: st?.trend === 'صاعد' ? 'مؤشر السوبرتريند في المسار الأخضر الصاعد' : 'مؤشر السوبرتريند في المسار الأحمر الهابط',
  });

  // SMA 20 (Bollinger Mid)
  const sma20 = analysis.bollingerBands.middle || currentClose;
  const sma20Signal: SignalAction = currentClose > sma20 ? 'buy' : 'sell';
  items.push({
    id: 'sma_20',
    name: 'متوسط SMA 20',
    group: 'trend',
    groupNameAr: 'الاتجاه',
    rawDisplay: `$${sma20.toFixed(2)}`,
    signal: sma20Signal,
    scoreValue: sma20Signal === 'buy' ? 1 : -1,
    weight: 0.8,
    reason: currentClose > sma20 ? 'تداول أعلى متوسط 20 يوماً' : 'تداول أدنى متوسط 20 يوماً',
  });

  // ==========================================
  // 2. MOMENTUM GROUP (RSI, MACD, Momentum10)
  // ==========================================
  // RSI (14)
  const rsi = analysis.rsi14;
  let rsiSignal: SignalAction = 'neutral';
  let rsiReason = `RSI عند ${rsi.toFixed(1)} في المنطقة الحيادية`;
  if (rsi < 30) {
    rsiSignal = 'buy';
    rsiReason = `RSI عند ${rsi.toFixed(1)} (تشبع بيعي ارتدادي)`;
  } else if (rsi > 70) {
    rsiSignal = 'sell';
    rsiReason = `RSI عند ${rsi.toFixed(1)} (تشبع شرائي مفرط)`;
  } else if (rsi >= 52 && currentClose > ema50Val) {
    rsiSignal = 'buy';
    rsiReason = `RSI عند ${rsi.toFixed(1)} (زخم صاعد صحي فوق 50)`;
  } else if (rsi <= 48 && currentClose < ema50Val) {
    rsiSignal = 'sell';
    rsiReason = `RSI عند ${rsi.toFixed(1)} (زخم هابط تحت 50)`;
  }
  items.push({
    id: 'rsi_14',
    name: 'مؤشر القوة النسبية RSI(14)',
    group: 'momentum',
    groupNameAr: 'الزخم',
    rawDisplay: `${rsi.toFixed(1)}`,
    signal: rsiSignal,
    scoreValue: rsiSignal === 'buy' ? 1 : rsiSignal === 'sell' ? -1 : 0,
    weight: 1.2,
    reason: rsiReason,
  });

  // MACD
  const macd = analysis.macd;
  let macdSignal: SignalAction = 'neutral';
  let macdReason = 'خطوط الماكد في حالة تقارب حيادية';
  if (macd.histogram > 0 && macd.macd > macd.signal) {
    macdSignal = 'buy';
    macdReason = 'خط MACD فوق الإشارة مع هيستوغرام متصاعد إيجابياً';
  } else if (macd.histogram < 0 && macd.macd < macd.signal) {
    macdSignal = 'sell';
    macdReason = 'خط MACD تحت الإشارة مع هيستوغرام سلبي هابط';
  }
  items.push({
    id: 'macd',
    name: 'مؤشر الماكد MACD (12, 26, 9)',
    group: 'momentum',
    groupNameAr: 'الزخم',
    rawDisplay: `Hist: ${macd.histogram.toFixed(2)}`,
    signal: macdSignal,
    scoreValue: macdSignal === 'buy' ? 1 : macdSignal === 'sell' ? -1 : 0,
    weight: 1.2,
    reason: macdReason,
  });

  // Momentum (10)
  const mom = analysis.momentum10;
  const momSignal: SignalAction = mom > 0.5 ? 'buy' : mom < -0.5 ? 'sell' : 'neutral';
  items.push({
    id: 'momentum_10',
    name: 'مؤشر الزخم Momentum(10)',
    group: 'momentum',
    groupNameAr: 'الزخم',
    rawDisplay: `${mom >= 0 ? '+' : ''}${mom.toFixed(2)}%`,
    signal: momSignal,
    scoreValue: momSignal === 'buy' ? 1 : momSignal === 'sell' ? -1 : 0,
    weight: 0.9,
    reason: mom > 0 ? 'زخم السعر إيجابي ومتزايد' : mom < 0 ? 'زخم السعر سلبي ومتناقص' : 'زخم مستقر',
  });

  // ==========================================
  // 3. OSCILLATORS GROUP (Stochastic, CCI, Williams %R)
  // ==========================================
  // Stochastic (14, 3, 3)
  const stoch = analysis.stochastic;
  let stochSignal: SignalAction = 'neutral';
  let stochReason = `Stoch %K: ${stoch.k.toFixed(1)}`;
  if (stoch.k < 20 && stoch.k > stoch.d) {
    stochSignal = 'buy';
    stochReason = `تقاطع صاعد من منطقة التشبع البيعي (${stoch.k.toFixed(0)})`;
  } else if (stoch.k > 80 && stoch.k < stoch.d) {
    stochSignal = 'sell';
    stochReason = `تقاطع هابط من منطقة التشبع الشرائي (${stoch.k.toFixed(0)})`;
  } else if (stoch.k > stoch.d) {
    stochSignal = 'buy';
  } else {
    stochSignal = 'sell';
  }
  items.push({
    id: 'stochastic',
    name: 'مؤشر ستوكاستيك Stochastic(14,3,3)',
    group: 'oscillators',
    groupNameAr: 'المذبذبات',
    rawDisplay: `${stoch.k.toFixed(1)} / ${stoch.d.toFixed(1)}`,
    signal: stochSignal,
    scoreValue: stochSignal === 'buy' ? 1 : stochSignal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: stochReason,
  });

  // CCI (20)
  const cci = analysis.cci20;
  const cciSignal: SignalAction = cci < -100 ? 'buy' : cci > 100 ? 'sell' : cci > 0 ? 'buy' : 'sell';
  items.push({
    id: 'cci_20',
    name: 'مؤشر قناة السلع CCI(20)',
    group: 'oscillators',
    groupNameAr: 'المذبذبات',
    rawDisplay: `${cci.toFixed(1)}`,
    signal: cciSignal,
    scoreValue: cciSignal === 'buy' ? 1 : cciSignal === 'sell' ? -1 : 0,
    weight: 0.9,
    reason: cci < -100 ? 'ارتداد من تشبع بيعي حاد' : cci > 100 ? 'تشبع شرائي ممتد' : 'قراءة متوازنة',
  });

  // Williams %R
  const wR = analysis.williamsR;
  const wRSignal: SignalAction = wR < -80 ? 'buy' : wR > -20 ? 'sell' : 'neutral';
  items.push({
    id: 'williams_r',
    name: 'مؤشر ويليامز Williams %R',
    group: 'oscillators',
    groupNameAr: 'المذبذبات',
    rawDisplay: `${wR.toFixed(1)}`,
    signal: wRSignal,
    scoreValue: wRSignal === 'buy' ? 1 : wRSignal === 'sell' ? -1 : 0,
    weight: 0.9,
    reason: wR < -80 ? 'تشبع بيعي في النطاق السفلي' : wR > -20 ? 'تشبع شرائي في النطاق العلوي' : 'منطقة تداول وسطى',
  });

  // ==========================================
  // 4. VOLUME & LIQUIDITY GROUP (Volume, ADX)
  // ==========================================
  const vt = analysis.volumeTrend;
  let volSignal: SignalAction = 'neutral';
  let volReason = 'حجم تداول طبيعي متوافق مع المتوسط';
  if (vt.isSurging && currentClose > prevClose) {
    volSignal = 'buy';
    volReason = `حجم متدفق (+${vt.currentVsAvgPercent}%) يدعم الصعود`;
  } else if (vt.isSurging && currentClose < prevClose) {
    volSignal = 'sell';
    volReason = `حجم بيعي مكثف (+${vt.currentVsAvgPercent}%) مع هبوط السعر`;
  } else if (vt.isDeclining) {
    volSignal = 'neutral';
    volReason = 'ضعف في أحجام التداول (سيولة منخفضة)';
  }
  items.push({
    id: 'volume_trend',
    name: 'اتجاه وتدفق السيولة (Volume)',
    group: 'volume',
    groupNameAr: 'الحجم والسيولة',
    rawDisplay: `${vt.currentVsAvgPercent >= 0 ? '+' : ''}${vt.currentVsAvgPercent}%`,
    signal: volSignal,
    scoreValue: volSignal === 'buy' ? 1 : volSignal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: volReason,
  });

  // ADX (14) - Trend Strength
  const adx = analysis.adx14;
  const isRangingMarket = adx < 20;
  const isStrongTrend = adx >= 25;
  items.push({
    id: 'adx_14',
    name: 'قوة الاتجاه ADX(14)',
    group: 'volume',
    groupNameAr: 'الحجم والسيولة',
    rawDisplay: `${adx.toFixed(1)}`,
    signal: isStrongTrend ? (currentClose > ema50Val ? 'buy' : 'sell') : 'neutral',
    scoreValue: isStrongTrend ? (currentClose > ema50Val ? 1 : -1) : 0,
    weight: 0.8,
    reason: isStrongTrend ? `اتجاه قوي مؤكد (ADX = ${adx.toFixed(1)})` : `سوق عرضي وتذبذب ضعيف (ADX = ${adx.toFixed(1)})`,
  });

  // VWAP & Volume Profile POC (مستويات السعر ذات الحجم المرتفع)
  let vwapCumulative = 0;
  let volCumulative = 0;
  const recentCandles = klines.slice(-40);
  for (const c of recentCandles) {
    const tp = (c.high + c.low + c.close) / 3;
    const v = c.volume || 1;
    vwapCumulative += tp * v;
    volCumulative += v;
  }
  const vwapVal = volCumulative > 0 ? vwapCumulative / volCumulative : currentClose;
  const vwapDistPct = ((currentClose - vwapVal) / vwapVal) * 100;
  let vwapSignal: SignalAction = 'neutral';
  let vwapReason = `السعر قريب من المتوسط الحجمي VWAP ($${vwapVal.toFixed(2)})`;

  if (currentClose > vwapVal && vwapDistPct <= 3.5) {
    vwapSignal = 'buy';
    vwapReason = `السعر أعلى VWAP ($${vwapVal.toFixed(2)}) مع قبول تداولات إيجابي`;
  } else if (currentClose < vwapVal && vwapDistPct >= -3.5) {
    vwapSignal = 'sell';
    vwapReason = `السعر أدنى VWAP ($${vwapVal.toFixed(2)}) مع ضغط بيعي مستمر`;
  } else if (vwapDistPct < -4.0) {
    vwapSignal = 'buy';
    vwapReason = 'السعر مبتعد هبوطاً عن VWAP: احتمال ارتداد تشبع بيعي نحو المتوسط';
  } else if (vwapDistPct > 4.0) {
    vwapSignal = 'sell';
    vwapReason = 'السعر مبتعد صعوداً عن VWAP: احتمال تهدئة وجني أرباح نحو المتوسط';
  }

  items.push({
    id: 'vwap_poc_profile',
    name: 'مستوى السيولة والحجم (VWAP & POC)',
    group: 'volume',
    groupNameAr: 'الحجم والسيولة',
    rawDisplay: `$${vwapVal.toFixed(2)} (${vwapDistPct >= 0 ? '+' : ''}${vwapDistPct.toFixed(1)}%)`,
    signal: vwapSignal,
    scoreValue: vwapSignal === 'buy' ? 1 : vwapSignal === 'sell' ? -1 : 0,
    weight: 0.9,
    reason: vwapReason,
  });

  // ==========================================
  // 5. SENTIMENT GROUP (Fear & Greed)
  // ==========================================
  const fgVal = fearGreed?.value || 50;
  let fgSignal: SignalAction = 'neutral';
  let fgReason = `المشاعر العامة: ${fearGreed?.classification_ar || 'حياد'} (${fgVal})`;
  if (fgVal >= 60) {
    fgSignal = 'buy';
  } else if (fgVal <= 35) {
    fgSignal = 'sell';
  }
  items.push({
    id: 'fear_greed',
    name: 'مؤشر الخوف والطمع (Fear & Greed)',
    group: 'sentiment',
    groupNameAr: 'المشاعر',
    rawDisplay: `${fgVal}/100`,
    signal: fgSignal,
    scoreValue: fgSignal === 'buy' ? 1 : fgSignal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: fgReason,
  });

  // ==========================================
  // 6. SUPPORT & RESISTANCE (Pivots, S1, R1)
  // ==========================================
  const distS1 = analysis.distanceToS1Percent;
  const distR1 = analysis.distanceToR1Percent;
  let levelsSignal: SignalAction = 'neutral';
  let levelsReason = 'السعر يتوسط مستويات الدعم والمقاومة';
  if (Math.abs(distS1) <= 1.5 && currentClose >= analysis.pivots.s1) {
    levelsSignal = 'buy';
    levelsReason = `السعر يرتد من دعم S1 بالقرب من $${analysis.pivots.s1.toFixed(2)}`;
  } else if (Math.abs(distR1) <= 1.5 && currentClose <= analysis.pivots.r1) {
    levelsSignal = 'sell';
    levelsReason = `السعر يواجه مقاومة R1 بالقرب من $${analysis.pivots.r1.toFixed(2)}`;
  } else if (currentClose > analysis.pivots.pp) {
    levelsSignal = 'buy';
    levelsReason = 'السعر أعلى النقطة المحورية اليومية (Pivot Point)';
  } else {
    levelsSignal = 'sell';
    levelsReason = 'السعر أدنى النقطة المحورية اليومية';
  }
  items.push({
    id: 'pivot_levels',
    name: 'مستويات الدعم والمقاومة (Pivots)',
    group: 'levels',
    groupNameAr: 'الدعم والمقاومة',
    rawDisplay: `PP: $${analysis.pivots.pp.toFixed(2)}`,
    signal: levelsSignal,
    scoreValue: levelsSignal === 'buy' ? 1 : levelsSignal === 'sell' ? -1 : 0,
    weight: 1.0,
    reason: levelsReason,
  });

  // ==========================================
  // GROUP CALCULATIONS & ADX MODULATION
  // ==========================================
  const groupKeys: ('trend' | 'momentum' | 'oscillators' | 'volume' | 'sentiment' | 'levels')[] = [
    'trend',
    'momentum',
    'oscillators',
    'volume',
    'sentiment',
    'levels',
  ];

  // Base weights map
  const baseWeights: Record<string, number> = {
    trend: customWeights.trendWeight,
    momentum: customWeights.momentumWeight,
    oscillators: customWeights.oscillatorsWeight,
    volume: customWeights.volumeWeight,
    sentiment: customWeights.sentimentWeight,
    levels: customWeights.levelsWeight,
  };

  // ADX Modifier: If ADX < 20 (ranging market), halve Trend group and boost Oscillators
  let adxModulated = false;
  const effectiveWeights = { ...baseWeights };
  if (isRangingMarket) {
    adxModulated = true;
    effectiveWeights.trend = baseWeights.trend * 0.5; // Halved
    effectiveWeights.oscillators = baseWeights.oscillators + (baseWeights.trend * 0.5); // Boosted
  }

  // Normalize effective weights to sum to 1.0
  const totalEffWeight = Object.values(effectiveWeights).reduce((a, b) => a + b, 0);
  for (const k in effectiveWeights) {
    effectiveWeights[k] = effectiveWeights[k] / totalEffWeight;
  }

  const groupBreakdowns: GroupScoreBreakdown[] = [];
  let totalNetScoreRaw = 0;
  let weightedBuySum = 0;
  let weightedSellSum = 0;

  for (const grpKey of groupKeys) {
    const grpItems = items.filter((it) => it.group === grpKey);
    const buyCount = grpItems.filter((it) => it.signal === 'buy').length;
    const neutralCount = grpItems.filter((it) => it.signal === 'neutral').length;
    const sellCount = grpItems.filter((it) => it.signal === 'sell').length;

    // Average group signal (-1 to +1)
    const sumSignals = grpItems.reduce((acc, it) => acc + it.scoreValue, 0);
    const avgSignal = grpItems.length > 0 ? sumSignals / grpItems.length : 0;

    const effWeight = effectiveWeights[grpKey] || 0.1;
    const scoreContrib = avgSignal * effWeight * 100;
    totalNetScoreRaw += scoreContrib;

    // Proportional weighted percentages
    const groupBuyRatio = grpItems.length > 0 ? buyCount / grpItems.length : 0;
    const groupSellRatio = grpItems.length > 0 ? sellCount / grpItems.length : 0;

    weightedBuySum += groupBuyRatio * effWeight * 100;
    weightedSellSum += groupSellRatio * effWeight * 100;

    const nameAr =
      grpKey === 'trend'
        ? 'الاتجاه'
        : grpKey === 'momentum'
        ? 'الزخم'
        : grpKey === 'oscillators'
        ? 'المذبذبات'
        : grpKey === 'volume'
        ? 'الحجم والسيولة'
        : grpKey === 'sentiment'
        ? 'المشاعر'
        : 'الدعم والمقاومة';

    groupBreakdowns.push({
      groupId: grpKey,
      groupNameAr: nameAr,
      weight: baseWeights[grpKey],
      effectiveWeight: Math.round(effWeight * 100) / 100,
      avgSignal: Math.round(avgSignal * 100) / 100,
      scoreContribution: Math.round(scoreContrib * 10) / 10,
      buyCount,
      neutralCount,
      sellCount,
      indicators: grpItems,
    });
  }

  // Rounded Scores
  const netScore = Math.max(-100, Math.min(100, Math.round(totalNetScoreRaw)));
  let buyPercentage = Math.round(weightedBuySum);
  let sellPercentage = Math.round(weightedSellSum);
  let neutralPercentage = Math.max(0, 100 - buyPercentage - sellPercentage);

  // Classification based on Net Score S
  let classification: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي' = 'محايد';
  if (netScore >= 60) classification = 'شراء قوي';
  else if (netScore >= 20) classification = 'شراء';
  else if (netScore <= -60) classification = 'بيع قوي';
  else if (netScore <= -20) classification = 'بيع';
  else classification = 'محايد';

  // ==========================================
  // CONFIDENCE & CONFLICT DETECTION
  // ==========================================
  const agreeingGroups = groupBreakdowns.filter((g) => {
    if (netScore > 0) return g.avgSignal > 0.15;
    if (netScore < 0) return g.avgSignal < -0.15;
    return Math.abs(g.avgSignal) <= 0.15;
  }).length;

  // Signal Conflict detection: e.g. Long-term trend is Bullish (+1) but Short-term Momentum is Bearish (-1)
  const trendGroup = groupBreakdowns.find((g) => g.groupId === 'trend');
  const momGroup = groupBreakdowns.find((g) => g.groupId === 'momentum');
  let hasSignalConflict = false;
  let conflictReason = '';

  if (trendGroup && momGroup) {
    if (trendGroup.avgSignal > 0.4 && momGroup.avgSignal < -0.4) {
      hasSignalConflict = true;
      conflictReason = 'تعارض إشارات: الاتجاه الرئيسي صاعد بينما الزخم اللحظي هابط';
    } else if (trendGroup.avgSignal < -0.4 && momGroup.avgSignal > 0.4) {
      hasSignalConflict = true;
      conflictReason = 'تعارض إشارات: الاتجاه الرئيسي هابط بينما الزخم اللحظي يرتد صعوداً';
    }
  }

  // No-Trade Filter Detection
  const isNoTradeFilterActive = isRangingMarket && vt.isDeclining;
  const noTradeReason = isNoTradeFilterActive
    ? 'فلتر لا تتداول مفعل: ADX ضعيف (<20) مع جفاف في السيولة، السوق يفتقر لأي ميزة واضحة حالياً.'
    : undefined;

  let confidence: 'عالية' | 'متوسطة' | 'منخفضة' = 'متوسطة';
  let confidenceReason = 'اتفاق جزئي بين مجموعات المؤشرات';

  if (hasSignalConflict) {
    confidence = 'منخفضة';
    confidenceReason = conflictReason;
  } else if (isNoTradeFilterActive) {
    confidence = 'منخفضة';
    confidenceReason = 'تذبذب عرضي وضعف سيولة';
  } else if (agreeingGroups >= 5 && isStrongTrend) {
    confidence = 'عالية';
    confidenceReason = `اتفاق قوي بين ${agreeingGroups} من أصل 6 مجموعات مدعوماً باتجاه واضح`;
  } else if (agreeingGroups <= 2 || Math.abs(netScore) < 15) {
    confidence = 'منخفضة';
    confidenceReason = 'تشتت الإشارات وتساوي قوى البيع والشراء';
  }

  // Top Bullish and Bearish Drivers
  const bullishDrivers = items.filter((it) => it.signal === 'buy').map((it) => it.reason);
  const bearishDrivers = items.filter((it) => it.signal === 'sell').map((it) => it.reason);

  const topBullishDrivers = bullishDrivers.slice(0, 3);
  const topBearishDrivers = bearishDrivers.slice(0, 3);

  // Multi-timeframe synthesis (15m, 1h, 4h, 1D, 1W)
  const multiTimeframe: TimeframeSignalItem[] = [
    {
      timeframe: '15m',
      score: Math.round(netScore * 0.8 + (momGroup ? momGroup.avgSignal * 20 : 0)),
      classification: netScore > 15 ? 'شراء' : netScore < -15 ? 'بيع' : 'محايد',
      color: netScore > 15 ? 'emerald' : netScore < -15 ? 'rose' : 'slate',
    },
    {
      timeframe: '1h',
      score: Math.round(netScore * 0.9),
      classification: netScore > 20 ? 'شراء' : netScore < -20 ? 'بيع' : 'محايد',
      color: netScore > 20 ? 'emerald' : netScore < -20 ? 'rose' : 'slate',
    },
    {
      timeframe: '4h',
      score: netScore,
      classification,
      color: netScore > 20 ? 'emerald' : netScore < -20 ? 'rose' : 'slate',
    },
    {
      timeframe: '1D',
      score: Math.round((trendGroup?.avgSignal || 0) * 80 + (levelsSignal === 'buy' ? 15 : -15)),
      classification: (trendGroup?.avgSignal || 0) > 0.2 ? 'شراء' : (trendGroup?.avgSignal || 0) < -0.2 ? 'بيع' : 'محايد',
      color: (trendGroup?.avgSignal || 0) > 0.2 ? 'emerald' : (trendGroup?.avgSignal || 0) < -0.2 ? 'rose' : 'slate',
    },
    {
      timeframe: '1W',
      score: currentClose > ema200Val ? 65 : -65,
      classification: currentClose > ema200Val ? 'شراء قوي' : 'بيع قوي',
      color: currentClose > ema200Val ? 'emerald' : 'rose',
    },
  ];

  let summaryText = `ميل المؤشرات: ${classification} بنسبة ${classification.includes('شراء') ? buyPercentage : classification.includes('بيع') ? sellPercentage : neutralPercentage}%`;
  if (hasSignalConflict) {
    summaryText += ` — ثقة منخفضة (تعارض بين الاتجاه والزخم)`;
  } else {
    summaryText += ` — ثقة ${confidence}`;
  }

  return {
    netScore,
    buyPercentage,
    neutralPercentage,
    sellPercentage,
    classification,
    confidence,
    confidenceReason,
    hasSignalConflict,
    conflictReason,
    isNoTradeFilterActive,
    noTradeReason,
    groups: groupBreakdowns,
    indicators: items,
    topBullishDrivers,
    topBearishDrivers,
    multiTimeframe,
    summaryText,
    adxModulated,
  };
}

function generateFallbackResult(): SignalScoreResult {
  return {
    netScore: 0,
    buyPercentage: 33,
    neutralPercentage: 34,
    sellPercentage: 33,
    classification: 'محايد',
    confidence: 'منخفضة',
    confidenceReason: 'البيانات غير كافية لحساب النتيجة المركبة',
    hasSignalConflict: false,
    isNoTradeFilterActive: true,
    noTradeReason: 'بيانات غير كافية',
    groups: [],
    indicators: [],
    topBullishDrivers: ['لا تتوفر شموع كافية'],
    topBearishDrivers: [],
    multiTimeframe: [],
    summaryText: 'ميل المؤشرات: محايد',
    adxModulated: false,
  };
}
