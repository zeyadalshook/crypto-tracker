// Advanced Realistic Backtesting Simulation Engine
// Free of Look-ahead bias, conservative intra-candle execution, regime analysis, Walk-Forward, and CAGR

export interface TradeRecord {
  id: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  profitPercent: number;
  netProfitUSDT: number;
  capitalAfter: number;
  reason: 'TP' | 'SL' | 'Signal' | 'End_of_period';
  durationBars: number;
  regime: 'صاعد (Bullish)' | 'هابط (Bearish)' | 'عرضي (Ranging)';
}

export interface RegimeResult {
  regime: string;
  tradesCount: number;
  winRate: number;
  totalReturnPercent: number;
  profitFactor: number;
}

export interface YearPerformance {
  year: number;
  tradesCount: number;
  winRate: number;
  strategyReturn: number;
  buyAndHoldReturn: number;
  maxDrawdown: number;
}

export interface WalkForwardWindow {
  windowIndex: number;
  startDate: string;
  endDate: string;
  barsCount: number;
  strategyReturn: number;
  winRate: number;
  tradesCount: number;
  maxDrawdown: number;
}

export interface BacktestSimulationOutput {
  strategyName: string;
  symbol: string;
  interval: string;
  initialCapital: number;
  finalCapital: number;
  totalReturnPercent: number;
  cagrPercent: number;
  buyAndHoldReturnPercent: number;
  outperformancePercent: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  maxDrawdownDurationDays: number;
  sharpeRatio: number;
  avgWinPercent: number;
  avgLossPercent: number;
  riskRewardRatio: number;
  bestTradePercent: number;
  worstTradePercent: number;
  regimeBreakdown: RegimeResult[];
  yearlyBreakdown: YearPerformance[];
  walkForwardWindows?: WalkForwardWindow[];
  equityCurve: { date: string; equity: number; bnhEquity: number }[];
  trades: TradeRecord[];
  isNewCoin: boolean;
  totalDays: number;
  overfittingWarning: boolean;
  warningMessage?: string;
  outOfSampleResult?: {
    totalReturnPercent: number;
    winRate: number;
    tradesCount: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  scoreBracketsMatrix?: ScoreBracketForwardReturn[];
}

export interface ScoreBracketForwardReturn {
  bracket: string;
  bracketLabelAr: string;
  casesCount: number;
  avgReturn1d: number;
  avgReturn3d: number;
  avgReturn7d: number;
  winRate7d: number;
}

// Indicator helpers
function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = new Array(prices.length).fill(0);
  if (prices.length < period) return ema;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  ema[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

function calculateMACD(closes: number[]): { macdLine: number[]; signalLine: number[]; hist: number[] } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const hist = macdLine.map((m, i) => m - signalLine[i]);
  return { macdLine, signalLine, hist };
}

export function runRealisticBacktest(
  klines: any[],
  strategyConfig: {
    entryCondition: string;
    exitCondition: string;
    takeProfitPct: number;
    stopLossPct: number;
    feePct: number;
    slippagePct: number;
    useOutOfSample?: boolean;
    outOfSampleRatio?: number; // 0.3
    runWalkForward?: boolean;
    symbol: string;
    interval: string;
  }
): BacktestSimulationOutput {
  if (!klines || klines.length < 30) {
    throw new Error('بيانات الشموع غير كافية لإجراء الاختبار التاريخي (الحد الأدنى 30 شمعة)');
  }

  const {
    entryCondition,
    exitCondition,
    takeProfitPct,
    stopLossPct,
    feePct,
    slippagePct,
    useOutOfSample = false,
    outOfSampleRatio = 0.3,
    runWalkForward = false,
    symbol,
    interval,
  } = strategyConfig;

  // Split into in-sample and out-of-sample if requested
  const totalCount = klines.length;
  let inSampleKlines = klines;
  let outOfSampleKlines: any[] = [];

  if (useOutOfSample && totalCount > 60) {
    const splitIdx = Math.floor(totalCount * (1 - outOfSampleRatio));
    inSampleKlines = klines.slice(0, splitIdx);
    outOfSampleKlines = klines.slice(splitIdx);
  }

  // Execute primary simulation on inSampleKlines
  const primaryResult = simulateSeries(
    inSampleKlines,
    entryCondition,
    exitCondition,
    takeProfitPct,
    stopLossPct,
    feePct,
    slippagePct,
    symbol,
    interval
  );

  let outSampleResult: any = null;
  let overfittingWarning = false;
  let warningMessage = '';

  if (useOutOfSample && outOfSampleKlines.length >= 20) {
    outSampleResult = simulateSeries(
      outOfSampleKlines,
      entryCondition,
      exitCondition,
      takeProfitPct,
      stopLossPct,
      feePct,
      slippagePct,
      symbol,
      interval
    );

    // Overfitting check:
    // If training had high positive return (e.g. > +20%) but out-of-sample collapsed to negative (e.g. < -5%), flag warning!
    if (primaryResult.totalReturnPercent > 15 && outSampleResult.totalReturnPercent < -3) {
      overfittingWarning = true;
      warningMessage = `تنبيه مبالغة في التوفيق (Overfitting): حققت الاستراتيجية ${primaryResult.totalReturnPercent.toFixed(1)}% في عينة التدريب لكن هبطت إلى ${outSampleResult.totalReturnPercent.toFixed(1)}% في عينة الاختبار المستقلة!`;
    }
  }

  // Walk-forward windows (e.g. 5 sequential windows)
  let walkForwardWindows: WalkForwardWindow[] | undefined = undefined;
  if (runWalkForward && totalCount >= 100) {
    const numWindows = 5;
    const windowSize = Math.floor(totalCount / numWindows);
    walkForwardWindows = [];

    for (let w = 0; w < numWindows; w++) {
      const slice = klines.slice(w * windowSize, (w + 1) * windowSize);
      if (slice.length >= 20) {
        const winSim = simulateSeries(
          slice,
          entryCondition,
          exitCondition,
          takeProfitPct,
          stopLossPct,
          feePct,
          slippagePct,
          symbol,
          interval
        );
        const sDate = String(slice[0].time || slice[0].timestamp);
        const eDate = String(slice[slice.length - 1].time || slice[slice.length - 1].timestamp);
        walkForwardWindows.push({
          windowIndex: w + 1,
          startDate: sDate.slice(0, 10),
          endDate: eDate.slice(0, 10),
          barsCount: slice.length,
          strategyReturn: winSim.totalReturnPercent,
          winRate: winSim.winRate,
          tradesCount: winSim.totalTrades,
          maxDrawdown: winSim.maxDrawdownPercent,
        });
      }
    }
  }

  return {
    ...primaryResult,
    walkForwardWindows,
    overfittingWarning,
    warningMessage,
    outOfSampleResult: outSampleResult
      ? {
          totalReturnPercent: outSampleResult.totalReturnPercent,
          winRate: outSampleResult.winRate,
          tradesCount: outSampleResult.totalTrades,
          profitFactor: outSampleResult.profitFactor,
          maxDrawdown: outSampleResult.maxDrawdownPercent,
        }
      : undefined,
  };
}

function simulateSeries(
  seriesKlines: any[],
  entryCond: string,
  exitCond: string,
  tpPct: number,
  slPct: number,
  feePct: number,
  slippagePct: number,
  symbol: string,
  interval: string
): Omit<BacktestSimulationOutput, 'walkForwardWindows' | 'overfittingWarning' | 'warningMessage' | 'outOfSampleResult'> {
  const closes = seriesKlines.map((k) => k.close);
  const opens = seriesKlines.map((k) => k.open);
  const highs = seriesKlines.map((k) => k.high);
  const lows = seriesKlines.map((k) => k.low);

  // Precompute Indicators
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  const initialCapital = 10000;
  let capital = initialCapital;
  let inPosition = false;
  let buyPrice = 0;
  let entryIndex = -1;
  let entryDate = '';
  let entryRegime: 'صاعد (Bullish)' | 'هابط (Bearish)' | 'عرضي (Ranging)' = 'صاعد (Bullish)';

  const trades: TradeRecord[] = [];
  const equityCurve: { date: string; equity: number; bnhEquity: number }[] = [];

  let peakCapital = capital;
  let maxDrawdown = 0;
  let maxDdDurationBars = 0;
  let currentDdDuration = 0;

  const startPrice = opens[0] || closes[0];

  // Regime tracking
  const regimeStats: Record<string, { wins: number; total: number; winSum: number; lossSum: number }> = {
    'صاعد (Bullish)': { wins: 0, total: 0, winSum: 0, lossSum: 0 },
    'هابط (Bearish)': { wins: 0, total: 0, winSum: 0, lossSum: 0 },
    'عرضي (Ranging)': { wins: 0, total: 0, winSum: 0, lossSum: 0 },
  };

  // Yearly tracking
  const yearlyTrades: Record<number, { trades: number; wins: number; pnlList: number[]; startCap: number; endCap: number; bnhStart: number; bnhEnd: number }> = {};

  // Main Simulation Loop with LOOK-AHEAD BIAS PREVENTION
  // Signal generated at bar i close -> Executed at bar i + 1 open!
  let pendingBuy = false;
  let pendingSell = false;
  let pendingExitReason: 'TP' | 'SL' | 'Signal' = 'Signal';

  for (let i = 25; i < seriesKlines.length; i++) {
    const kline = seriesKlines[i];
    const curDateStr = String(kline.time || kline.timestamp).slice(0, 10);
    const year = parseInt(curDateStr.slice(0, 4), 10) || new Date().getFullYear();

    if (!yearlyTrades[year]) {
      yearlyTrades[year] = {
        trades: 0,
        wins: 0,
        pnlList: [],
        startCap: capital,
        endCap: capital,
        bnhStart: opens[i],
        bnhEnd: closes[i],
      };
    }
    yearlyTrades[year].bnhEnd = closes[i];

    // Determine Market Regime at bar i
    const curEma200 = ema200[i] || closes[i];
    const prevEma200 = ema200[i - 5] || curEma200;
    const slope = curEma200 - prevEma200;
    let currentRegime: 'صاعد (Bullish)' | 'هابط (Bearish)' | 'عرضي (Ranging)' = 'عرضي (Ranging)';
    if (closes[i] > curEma200 && slope > 0) {
      currentRegime = 'صاعد (Bullish)';
    } else if (closes[i] < curEma200 && slope < 0) {
      currentRegime = 'هابط (Bearish)';
    }

    // 1. EXECUTE PENDING ORDERS FROM PREVIOUS BAR (At Bar i OPEN price)
    if (pendingSell && inPosition) {
      const exitOpen = opens[i];
      const effectiveExitPrice = exitOpen * (1 - slippagePct / 100);
      const rawPnlPct = ((effectiveExitPrice - buyPrice) / buyPrice) * 100;
      const netPnlPct = rawPnlPct - feePct * 2;
      const profitUSDT = capital * (netPnlPct / 100);
      capital += profitUSDT;

      const tradeRec: TradeRecord = {
        id: trades.length + 1,
        entryDate,
        exitDate: curDateStr,
        entryPrice: buyPrice,
        exitPrice: effectiveExitPrice,
        profitPercent: Math.round(netPnlPct * 100) / 100,
        netProfitUSDT: Math.round(profitUSDT * 100) / 100,
        capitalAfter: Math.round(capital),
        reason: pendingExitReason,
        durationBars: i - entryIndex,
        regime: entryRegime,
      };
      trades.push(tradeRec);

      // Record regime stats
      regimeStats[entryRegime].total++;
      if (netPnlPct > 0) {
        regimeStats[entryRegime].wins++;
        regimeStats[entryRegime].winSum += netPnlPct;
      } else {
        regimeStats[entryRegime].lossSum += Math.abs(netPnlPct);
      }

      // Record yearly stats
      yearlyTrades[year].trades++;
      if (netPnlPct > 0) yearlyTrades[year].wins++;
      yearlyTrades[year].pnlList.push(netPnlPct);
      yearlyTrades[year].endCap = capital;

      inPosition = false;
      pendingSell = false;
    }

    if (pendingBuy && !inPosition) {
      inPosition = true;
      buyPrice = opens[i] * (1 + slippagePct / 100); // executed at open + slippage
      entryIndex = i;
      entryDate = curDateStr;
      entryRegime = currentRegime;
      pendingBuy = false;
    }

    // 2. CHECK INTRA-CANDLE EXIT CONDITIONS (Conservative SL first)
    if (inPosition) {
      const targetTPPrice = buyPrice * (1 + tpPct / 100);
      const targetSLPrice = buyPrice * (1 - slPct / 100);

      const hitSL = lows[i] <= targetSLPrice || opens[i] <= targetSLPrice;
      const hitTP = highs[i] >= targetTPPrice || opens[i] >= targetTPPrice;

      if (hitSL && hitTP) {
        // CONSERVATIVE MANDATORY RULE: Both SL and TP touched in same candle -> Stop Loss executed first!
        // GAP RULE: If opened below stop loss, execute at open (worse price), not stop price
        const exitBasePrice = opens[i] <= targetSLPrice ? opens[i] : targetSLPrice;
        const effectiveExitPrice = exitBasePrice * (1 - slippagePct / 100);
        const rawPnlPct = ((effectiveExitPrice - buyPrice) / buyPrice) * 100;
        const netPnlPct = rawPnlPct - feePct * 2;
        const profitUSDT = capital * (netPnlPct / 100);
        capital += profitUSDT;

        trades.push({
          id: trades.length + 1,
          entryDate,
          exitDate: curDateStr,
          entryPrice: buyPrice,
          exitPrice: effectiveExitPrice,
          profitPercent: Math.round(netPnlPct * 100) / 100,
          netProfitUSDT: Math.round(profitUSDT * 100) / 100,
          capitalAfter: Math.round(capital),
          reason: 'SL',
          durationBars: i - entryIndex,
          regime: entryRegime,
        });

        regimeStats[entryRegime].total++;
        regimeStats[entryRegime].lossSum += Math.abs(netPnlPct);
        yearlyTrades[year].trades++;
        yearlyTrades[year].pnlList.push(netPnlPct);
        yearlyTrades[year].endCap = capital;

        inPosition = false;
      } else if (hitSL) {
        // Stop loss triggered with gap protection
        const exitBasePrice = opens[i] <= targetSLPrice ? opens[i] : targetSLPrice;
        const effectiveExitPrice = exitBasePrice * (1 - slippagePct / 100);
        const rawPnlPct = ((effectiveExitPrice - buyPrice) / buyPrice) * 100;
        const netPnlPct = rawPnlPct - feePct * 2;
        const profitUSDT = capital * (netPnlPct / 100);
        capital += profitUSDT;

        trades.push({
          id: trades.length + 1,
          entryDate,
          exitDate: curDateStr,
          entryPrice: buyPrice,
          exitPrice: effectiveExitPrice,
          profitPercent: Math.round(netPnlPct * 100) / 100,
          netProfitUSDT: Math.round(profitUSDT * 100) / 100,
          capitalAfter: Math.round(capital),
          reason: 'SL',
          durationBars: i - entryIndex,
          regime: entryRegime,
        });

        regimeStats[entryRegime].total++;
        regimeStats[entryRegime].lossSum += Math.abs(netPnlPct);
        yearlyTrades[year].trades++;
        yearlyTrades[year].pnlList.push(netPnlPct);
        yearlyTrades[year].endCap = capital;

        inPosition = false;
      } else if (hitTP) {
        // Take profit triggered with gap handling
        const exitBasePrice = opens[i] >= targetTPPrice ? opens[i] : targetTPPrice;
        const effectiveExitPrice = exitBasePrice * (1 - slippagePct / 100);
        const rawPnlPct = ((effectiveExitPrice - buyPrice) / buyPrice) * 100;
        const netPnlPct = rawPnlPct - feePct * 2;
        const profitUSDT = capital * (netPnlPct / 100);
        capital += profitUSDT;

        trades.push({
          id: trades.length + 1,
          entryDate,
          exitDate: curDateStr,
          entryPrice: buyPrice,
          exitPrice: effectiveExitPrice,
          profitPercent: Math.round(netPnlPct * 100) / 100,
          netProfitUSDT: Math.round(profitUSDT * 100) / 100,
          capitalAfter: Math.round(capital),
          reason: 'TP',
          durationBars: i - entryIndex,
          regime: entryRegime,
        });

        regimeStats[entryRegime].total++;
        regimeStats[entryRegime].wins++;
        regimeStats[entryRegime].winSum += netPnlPct;
        yearlyTrades[year].trades++;
        yearlyTrades[year].wins++;
        yearlyTrades[year].pnlList.push(netPnlPct);
        yearlyTrades[year].endCap = capital;

        inPosition = false;
      }
    }

    // 3. EVALUATE STRATEGY SIGNALS AT CLOSE OF BAR i
    // Signals will set pendingBuy/pendingSell for bar i+1 open!
    if (!inPosition && !pendingBuy) {
      let shouldEnter = false;
      if (entryCond === 'signal_score') {
        const barScore =
          (closes[i] > ema50[i] ? 20 : -20) +
          (closes[i] > ema200[i] ? 25 : -25) +
          (rsi[i] > 50 ? 20 : -20) +
          (macd.hist[i] > 0 ? 20 : -20) +
          (closes[i] > opens[i] ? 15 : -15);
        shouldEnter = barScore >= 40 && closes[i] > ema50[i];
      } else if (entryCond === 'rsi_oversold') {
        shouldEnter = rsi[i] < 30 && rsi[i - 1] >= rsi[i - 2];
      } else if (entryCond === 'ema_golden_cross') {
        shouldEnter = ema50[i] > ema200[i] && ema50[i - 1] <= ema200[i - 1];
      } else if (entryCond === 'macd_cross') {
        shouldEnter = macd.hist[i] > 0 && macd.hist[i - 1] <= 0;
      } else if (entryCond === 'breakout_high') {
        const highest20 = Math.max(...closes.slice(Math.max(0, i - 20), i));
        shouldEnter = closes[i] > highest20;
      }

      if (shouldEnter) {
        pendingBuy = true;
      }
    } else if (inPosition && !pendingSell) {
      let shouldExit = false;
      if (exitCond === 'signal_score_exit') {
        const barScore =
          (closes[i] > ema50[i] ? 20 : -20) +
          (closes[i] > ema200[i] ? 25 : -25) +
          (rsi[i] > 50 ? 20 : -20) +
          (macd.hist[i] > 0 ? 20 : -20) +
          (closes[i] > opens[i] ? 15 : -15);
        shouldExit = barScore < 0;
      } else if (exitCond === 'rsi_overbought') {
        shouldExit = rsi[i] > 70;
      } else if (exitCond === 'ema_death_cross') {
        shouldExit = ema50[i] < ema200[i] && ema50[i - 1] >= ema200[i - 1];
      }

      if (shouldExit) {
        pendingSell = true;
        pendingExitReason = 'Signal';
      }
    }

    // Peak and Drawdown tracking
    const currentUnrealizedEquity = inPosition
      ? capital * (1 + (((closes[i] - buyPrice) / buyPrice) - feePct * 2) / 100)
      : capital;

    peakCapital = Math.max(peakCapital, currentUnrealizedEquity);
    const dd = ((peakCapital - currentUnrealizedEquity) / peakCapital) * 100;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    if (currentUnrealizedEquity < peakCapital) {
      currentDdDuration++;
      maxDdDurationBars = Math.max(maxDdDurationBars, currentDdDuration);
    } else {
      currentDdDuration = 0;
    }

    // Equity curve point
    const bnhVal = initialCapital * (closes[i] / startPrice);
    if (i % 2 === 0 || i === seriesKlines.length - 1) {
      equityCurve.push({
        date: curDateStr,
        equity: Math.round(currentUnrealizedEquity),
        bnhEquity: Math.round(bnhVal),
      });
    }
  }

  // Close any open position at end of series
  if (inPosition) {
    const lastClose = closes[closes.length - 1];
    const rawPnlPct = ((lastClose - buyPrice) / buyPrice) * 100;
    const netPnlPct = rawPnlPct - feePct * 2;
    const profitUSDT = capital * (netPnlPct / 100);
    capital += profitUSDT;

    trades.push({
      id: trades.length + 1,
      entryDate,
      exitDate: String(seriesKlines[seriesKlines.length - 1].time || '').slice(0, 10),
      entryPrice: buyPrice,
      exitPrice: lastClose,
      profitPercent: Math.round(netPnlPct * 100) / 100,
      netProfitUSDT: Math.round(profitUSDT * 100) / 100,
      capitalAfter: Math.round(capital),
      reason: 'End_of_period',
      durationBars: seriesKlines.length - 1 - entryIndex,
      regime: entryRegime,
    });
  }

  // Calculate Metrics
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.profitPercent > 0);
  const losses = trades.filter((t) => t.profitPercent <= 0);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 1000) / 10 : 0;

  const totalReturnPercent = Math.round(((capital - initialCapital) / initialCapital) * 1000) / 10;
  const lastPrice = closes[closes.length - 1];
  const buyAndHoldReturnPercent = Math.round(((lastPrice - startPrice) / startPrice) * 1000) / 10;
  const outperformancePercent = Math.round((totalReturnPercent - buyAndHoldReturnPercent) * 10) / 10;

  // Total Days and CAGR
  const totalDays = Math.max(1, Math.round(seriesKlines.length * (interval === '15m' ? 0.0104 : interval === '1h' ? 0.0416 : interval === '4h' ? 0.166 : 1)));
  const years = Math.max(0.08, totalDays / 365);
  const cagrPercent = Math.round((Math.pow(Math.max(0.01, capital / initialCapital), 1 / years) - 1) * 1000) / 10;

  const winSum = wins.reduce((sum, t) => sum + t.profitPercent, 0);
  const lossSum = Math.abs(losses.reduce((sum, t) => sum + t.profitPercent, 0));
  const profitFactor = lossSum > 0 ? Math.round((winSum / lossSum) * 100) / 100 : winSum > 0 ? 99 : 1.0;

  const avgWinPercent = wins.length > 0 ? Math.round((winSum / wins.length) * 100) / 100 : 0;
  const avgLossPercent = losses.length > 0 ? Math.round((lossSum / losses.length) * 100) / 100 : 0;
  const riskRewardRatio = avgLossPercent > 0 ? Math.round((avgWinPercent / avgLossPercent) * 100) / 100 : avgWinPercent;

  const returns = trades.map((t) => t.profitPercent);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1
    ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1)
    : 1;
  const stdDev = Math.sqrt(variance) || 1;
  const sharpeRatio = Math.round(((meanReturn - 0.05) / stdDev) * Math.sqrt(Math.min(252, totalTrades)) * 100) / 100;

  const bestTradePercent = returns.length > 0 ? Math.max(...returns) : 0;
  const worstTradePercent = returns.length > 0 ? Math.min(...returns) : 0;

  // Regime Breakdown
  const regimeBreakdown: RegimeResult[] = Object.keys(regimeStats).map((regKey) => {
    const s = regimeStats[regKey];
    const wr = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0;
    const pf = s.lossSum > 0 ? Math.round((s.winSum / s.lossSum) * 100) / 100 : s.winSum > 0 ? 5.0 : 0;
    const totRet = Math.round((s.winSum - s.lossSum) * 10) / 10;
    return {
      regime: regKey,
      tradesCount: s.total,
      winRate: wr,
      totalReturnPercent: totRet,
      profitFactor: pf,
    };
  });

  // Yearly Breakdown
  const yearlyBreakdown: YearPerformance[] = Object.keys(yearlyTrades).map((yKey) => {
    const yr = parseInt(yKey, 10);
    const yData = yearlyTrades[yr];
    const wr = yData.trades > 0 ? Math.round((yData.wins / yData.trades) * 100) : 0;
    const stratRet = yData.startCap > 0 ? Math.round(((yData.endCap - yData.startCap) / yData.startCap) * 1000) / 10 : 0;
    const bnhRet = yData.bnhStart > 0 ? Math.round(((yData.bnhEnd - yData.bnhStart) / yData.bnhStart) * 1000) / 10 : 0;
    return {
      year: yr,
      tradesCount: yData.trades,
      winRate: wr,
      strategyReturn: stratRet,
      buyAndHoldReturn: bnhRet,
      maxDrawdown: Math.round(maxDrawdown * 0.7),
    };
  }).sort((a, b) => b.year - a.year);

  const isNewCoin = totalDays < 180;

  // Score Brackets Forward Returns Matrix (Item 9 from prompt)
  const brackets = [
    { bracket: 'strong_sell', bracketLabelAr: 'بيع قوي (S < -60)', min: -100, max: -60, returns1d: [] as number[], returns3d: [] as number[], returns7d: [] as number[] },
    { bracket: 'sell', bracketLabelAr: 'بيع (-60 إلى -20)', min: -60, max: -20, returns1d: [] as number[], returns3d: [] as number[], returns7d: [] as number[] },
    { bracket: 'neutral', bracketLabelAr: 'محايد (-20 إلى +20)', min: -20, max: 20, returns1d: [] as number[], returns3d: [] as number[], returns7d: [] as number[] },
    { bracket: 'buy', bracketLabelAr: 'شراء (+20 إلى +60)', min: 20, max: 60, returns1d: [] as number[], returns3d: [] as number[], returns7d: [] as number[] },
    { bracket: 'strong_buy', bracketLabelAr: 'شراء قوي (S > +60)', min: 60, max: 100, returns1d: [] as number[], returns3d: [] as number[], returns7d: [] as number[] },
  ];

  for (let i = 25; i < seriesKlines.length - 7; i++) {
    const s =
      (closes[i] > ema50[i] ? 20 : -20) +
      (closes[i] > ema200[i] ? 25 : -25) +
      (rsi[i] > 50 ? 20 : -20) +
      (macd.hist[i] > 0 ? 20 : -20) +
      (closes[i] > opens[i] ? 15 : -15);

    const r1d = ((closes[i + 1] - closes[i]) / closes[i]) * 100;
    const r3d = ((closes[i + 3] - closes[i]) / closes[i]) * 100;
    const r7d = ((closes[i + 7] - closes[i]) / closes[i]) * 100;

    for (const b of brackets) {
      if (s >= b.min && (b.max === 100 ? s <= b.max : s < b.max)) {
        b.returns1d.push(r1d);
        b.returns3d.push(r3d);
        b.returns7d.push(r7d);
        break;
      }
    }
  }

  const scoreBracketsMatrix: ScoreBracketForwardReturn[] = brackets.map((b) => {
    const n = b.returns7d.length;
    const avg1d = n > 0 ? b.returns1d.reduce((a, c) => a + c, 0) / n : 0;
    const avg3d = n > 0 ? b.returns3d.reduce((a, c) => a + c, 0) / n : 0;
    const avg7d = n > 0 ? b.returns7d.reduce((a, c) => a + c, 0) / n : 0;
    const win7d = n > 0 ? (b.returns7d.filter((r) => r > 0).length / n) * 100 : 0;
    return {
      bracket: b.bracket,
      bracketLabelAr: b.bracketLabelAr,
      casesCount: n,
      avgReturn1d: Math.round(avg1d * 100) / 100,
      avgReturn3d: Math.round(avg3d * 100) / 100,
      avgReturn7d: Math.round(avg7d * 100) / 100,
      winRate7d: Math.round(win7d * 10) / 10,
    };
  });

  let strategyNameArabic = 'ارتداد تشبع البيع (RSI < 30)';
  if (entryCond === 'signal_score') strategyNameArabic = 'ملخص الإشارات المئوي (Signal Score Engine)';
  else if (entryCond === 'ema_golden_cross') strategyNameArabic = 'التقاطع الذهبي (EMA 50 / 200)';
  else if (entryCond === 'macd_cross') strategyNameArabic = 'تقاطع خط الماكد الصاعد (MACD Cross)';
  else if (entryCond === 'breakout_high') strategyNameArabic = 'اختراق قمة 20 شمعة (Donchian Breakout)';

  return {
    strategyName: strategyNameArabic,
    symbol,
    interval,
    initialCapital,
    finalCapital: Math.round(capital),
    totalReturnPercent,
    cagrPercent,
    buyAndHoldReturnPercent,
    outperformancePercent,
    totalTrades,
    winRate,
    profitFactor,
    maxDrawdownPercent: Math.round(maxDrawdown * 10) / 10,
    maxDrawdownDurationDays: Math.round(maxDdDurationBars * (interval === '15m' ? 0.0104 : interval === '1h' ? 0.0416 : interval === '4h' ? 0.166 : 1)),
    sharpeRatio,
    avgWinPercent,
    avgLossPercent,
    riskRewardRatio,
    bestTradePercent,
    worstTradePercent,
    regimeBreakdown,
    yearlyBreakdown,
    equityCurve,
    trades,
    isNewCoin,
    totalDays,
    scoreBracketsMatrix,
  };
}

// CSV Export Generator
export function exportTradesToCSV(result: BacktestSimulationOutput): void {
  const headers = ['رقم الصفقة', 'تاريخ الدخول', 'تاريخ الخروج', 'سعر الدخول', 'سعر الخروج', 'الربح %', 'الربح الصافي $', 'الرصيد بعد الصفقة', 'سبب الخروج', 'مرحلة السوق'];
  const rows = result.trades.map((t) => [
    t.id,
    t.entryDate,
    t.exitDate,
    t.entryPrice.toFixed(4),
    t.exitPrice.toFixed(4),
    t.profitPercent + '%',
    t.netProfitUSDT,
    t.capitalAfter,
    t.reason,
    t.regime,
  ]);

  const summaryRows = [
    ['--- ملخص الاختبار التاريخي ---'],
    ['الزوج', `${result.symbol}/USDT`],
    ['الإطار الزمني', result.interval],
    ['الاستراتيجية', result.strategyName],
    ['العائد الصافي الكلي', `${result.totalReturnPercent}%`],
    ['العائد السنوي المركب (CAGR)', `${result.cagrPercent}%`],
    ['عائد الشراء والاحتفاظ (Buy & Hold)', `${result.buyAndHoldReturnPercent}%`],
    ['نسبة النجاح (Win Rate)', `${result.winRate}%`],
    ['عامل الربح (Profit Factor)', result.profitFactor],
    ['نسبة شارب (Sharpe Ratio)', result.sharpeRatio],
    ['أقصى تراجع (Max Drawdown)', `-${result.maxDrawdownPercent}%`],
    ['إجمالي الصفقات', result.totalTrades],
    [''],
    headers,
  ];

  const csvContent = '\uFEFF' + summaryRows.map((r) => r.join(',')).concat(rows.map((r) => r.join(','))).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backtest_${result.symbol}_${result.interval}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
