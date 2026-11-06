import { OHLCV } from '../types/crypto';
import { calculateRSI } from './technicalIndicators';

export interface DcaPurchaseEntry {
  date: string;
  price: number;
  rsi: number;
  regularAmountUsdt: number;
  regularCoinsBought: number;
  smartMultiplier: number;
  smartReasonAr: string;
  smartAmountUsdt: number;
  smartCoinsBought: number;
  regularAvgPrice: number;
  smartAvgPrice: number;
  regularPortfolioValue: number;
  smartPortfolioValue: number;
}

export interface StrategySummary {
  nameAr: string;
  totalInvestedUsdt: number;
  totalCoinsAccumulated: number;
  averageBuyPrice: number;
  finalValueUsdt: number;
  netProfitUsdt: number;
  roiPct: number;
  maxDrawdownPct: number;
}

export interface DcaSimulationResult {
  symbol: string;
  periodDays: number;
  purchasesCount: number;
  startPrice: number;
  endPrice: number;
  regularDca: StrategySummary;
  smartRsiDca: StrategySummary;
  lumpSum: StrategySummary;
  smartAlphaRoiDiffPct: number;
  smartPriceDiscountPct: number;
  ledger: DcaPurchaseEntry[];
}

export interface DcaConfig {
  baseAmountUsdt: number;
  intervalDays: number;
  lookbackDays: number;
  oversoldRsiThreshold: number;
  overboughtRsiThreshold: number;
}

export function runSmartDcaSimulation(
  symbol: string,
  klines: OHLCV[],
  config: DcaConfig
): DcaSimulationResult {
  const safeKlines = klines && klines.length >= 15 ? klines : [];
  const sliceCount = Math.min(safeKlines.length, Math.max(20, config.lookbackDays));
  const windowCandles = safeKlines.slice(-sliceCount);

  if (windowCandles.length < 5) {
    const emptyStrat: StrategySummary = {
      nameAr: '-',
      totalInvestedUsdt: 0,
      totalCoinsAccumulated: 0,
      averageBuyPrice: 0,
      finalValueUsdt: 0,
      netProfitUsdt: 0,
      roiPct: 0,
      maxDrawdownPct: 0,
    };
    return {
      symbol,
      periodDays: 0,
      purchasesCount: 0,
      startPrice: 0,
      endPrice: 0,
      regularDca: { ...emptyStrat, nameAr: 'الشراء الدوري المنتظم (Regular DCA)' },
      smartRsiDca: { ...emptyStrat, nameAr: 'التراكم الذكي الموزون بـ RSI (Smart DCA)' },
      lumpSum: { ...emptyStrat, nameAr: 'الشراء بدفعة واحدة (Lump Sum)' },
      smartAlphaRoiDiffPct: 0,
      smartPriceDiscountPct: 0,
      ledger: [],
    };
  }

  // Compute RSI array across all available klines so the slice has accurate RSI14
  const allCloses = safeKlines.map((c) => c.close);
  const fullRsiSeries = calculateRSI(allCloses, 14);
  const offset = safeKlines.length - windowCandles.length;

  const step = Math.max(1, Math.round(config.intervalDays));
  const baseUsdt = Math.max(10, config.baseAmountUsdt);

  let regInvested = 0;
  let regCoins = 0;
  let regPeakRatio = 1;
  let regMaxDd = 0;

  let smartInvested = 0;
  let smartCoins = 0;
  let smartPeakRatio = 1;
  let smartMaxDd = 0;

  const ledger: DcaPurchaseEntry[] = [];

  for (let i = 0; i < windowCandles.length; i += step) {
    const candle = windowCandles[i];
    const price = candle.close;
    if (!price || price <= 0) continue;

    const rsiVal = fullRsiSeries[offset + i] ?? 50;
    const roundedRsi = Math.round(rsiVal * 10) / 10;

    // Determine Smart DCA multiplier based on RSI regime
    let multiplier = 1.0;
    let reasonAr = 'منطقة توازن (شراء اعتيادي 1.0x)';

    if (roundedRsi <= config.oversoldRsiThreshold - 8) {
      multiplier = 2.0;
      reasonAr = `تشبع بيعي حاد (RSI=${roundedRsi}) — مضاعفة التجميع 2.0x`;
    } else if (roundedRsi <= config.oversoldRsiThreshold) {
      multiplier = 1.5;
      reasonAr = `خصم سعري وتشبع بيعي (RSI=${roundedRsi}) — تعزيز الشراء 1.5x`;
    } else if (roundedRsi >= config.overboughtRsiThreshold + 8) {
      multiplier = 0.25;
      reasonAr = `تضخم سعري مفرط (RSI=${roundedRsi}) — تقليص الشراء إلى 0.25x`;
    } else if (roundedRsi >= config.overboughtRsiThreshold) {
      multiplier = 0.5;
      reasonAr = `تشبع شرائي (RSI=${roundedRsi}) — تهدئة الشراء إلى 0.5x`;
    }

    const regAmt = baseUsdt;
    const regBought = regAmt / price;
    regInvested += regAmt;
    regCoins += regBought;

    const smartAmt = Math.round(baseUsdt * multiplier * 100) / 100;
    const smartBought = smartAmt / price;
    smartInvested += smartAmt;
    smartCoins += smartBought;

    const regVal = regCoins * price;
    const smartVal = smartCoins * price;

    const regRatio = regInvested > 0 ? regVal / regInvested : 1;
    if (regRatio > regPeakRatio) regPeakRatio = regRatio;
    const regDd = ((regPeakRatio - regRatio) / regPeakRatio) * 100;
    if (regDd > regMaxDd) regMaxDd = regDd;

    const smartRatio = smartInvested > 0 ? smartVal / smartInvested : 1;
    if (smartRatio > smartPeakRatio) smartPeakRatio = smartRatio;
    const smartDd = ((smartPeakRatio - smartRatio) / smartPeakRatio) * 100;
    if (smartDd > smartMaxDd) smartMaxDd = smartDd;

    const dateStr =
      typeof candle.time === 'number'
        ? new Date(candle.time * 1000).toISOString().slice(0, 10)
        : String(candle.time);

    ledger.push({
      date: dateStr,
      price,
      rsi: roundedRsi,
      regularAmountUsdt: regAmt,
      regularCoinsBought: regBought,
      smartMultiplier: multiplier,
      smartReasonAr: reasonAr,
      smartAmountUsdt: smartAmt,
      smartCoinsBought: smartBought,
      regularAvgPrice: regInvested / regCoins,
      smartAvgPrice: smartInvested / smartCoins,
      regularPortfolioValue: Math.round(regVal * 100) / 100,
      smartPortfolioValue: Math.round(smartVal * 100) / 100,
    });
  }

  const startPrice = windowCandles[0].close;
  const endPrice = windowCandles[windowCandles.length - 1].close;

  const regFinalVal = regCoins * endPrice;
  const regNetProfit = regFinalVal - regInvested;
  const regRoi = regInvested > 0 ? (regNetProfit / regInvested) * 100 : 0;
  const regAvgPrice = regCoins > 0 ? regInvested / regCoins : 0;

  const smartFinalVal = smartCoins * endPrice;
  const smartNetProfit = smartFinalVal - smartInvested;
  const smartRoi = smartInvested > 0 ? (smartNetProfit / smartInvested) * 100 : 0;
  const smartAvgPrice = smartCoins > 0 ? smartInvested / smartCoins : 0;

  // Lump sum invests the exact same total capital as Regular DCA on Day 1
  const lumpInvested = regInvested;
  const lumpCoins = startPrice > 0 ? lumpInvested / startPrice : 0;
  const lumpFinalVal = lumpCoins * endPrice;
  const lumpNetProfit = lumpFinalVal - lumpInvested;
  const lumpRoi = lumpInvested > 0 ? (lumpNetProfit / lumpInvested) * 100 : 0;

  let lumpPeak = startPrice;
  let lumpMaxDd = 0;
  for (const c of windowCandles) {
    if (c.close > lumpPeak) lumpPeak = c.close;
    const dd = ((lumpPeak - c.close) / lumpPeak) * 100;
    if (dd > lumpMaxDd) lumpMaxDd = dd;
  }

  const smartPriceDiscountPct =
    regAvgPrice > 0 ? Math.round(((regAvgPrice - smartAvgPrice) / regAvgPrice) * 10000) / 100 : 0;

  return {
    symbol,
    periodDays: windowCandles.length,
    purchasesCount: ledger.length,
    startPrice,
    endPrice,
    regularDca: {
      nameAr: 'الشراء الدوري المنتظم (Regular DCA)',
      totalInvestedUsdt: Math.round(regInvested * 100) / 100,
      totalCoinsAccumulated: regCoins,
      averageBuyPrice: regAvgPrice,
      finalValueUsdt: Math.round(regFinalVal * 100) / 100,
      netProfitUsdt: Math.round(regNetProfit * 100) / 100,
      roiPct: Math.round(regRoi * 100) / 100,
      maxDrawdownPct: Math.round(regMaxDd * 100) / 100,
    },
    smartRsiDca: {
      nameAr: 'التراكم الذكي الموزون بـ RSI (Smart DCA)',
      totalInvestedUsdt: Math.round(smartInvested * 100) / 100,
      totalCoinsAccumulated: smartCoins,
      averageBuyPrice: smartAvgPrice,
      finalValueUsdt: Math.round(smartFinalVal * 100) / 100,
      netProfitUsdt: Math.round(smartNetProfit * 100) / 100,
      roiPct: Math.round(smartRoi * 100) / 100,
      maxDrawdownPct: Math.round(smartMaxDd * 100) / 100,
    },
    lumpSum: {
      nameAr: 'الشراء بدفعة واحدة بالبداية (Lump Sum)',
      totalInvestedUsdt: Math.round(lumpInvested * 100) / 100,
      totalCoinsAccumulated: lumpCoins,
      averageBuyPrice: startPrice,
      finalValueUsdt: Math.round(lumpFinalVal * 100) / 100,
      netProfitUsdt: Math.round(lumpNetProfit * 100) / 100,
      roiPct: Math.round(lumpRoi * 100) / 100,
      maxDrawdownPct: Math.round(lumpMaxDd * 100) / 100,
    },
    smartAlphaRoiDiffPct: Math.round((smartRoi - regRoi) * 100) / 100,
    smartPriceDiscountPct,
    ledger,
  };
}
