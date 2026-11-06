// ============================================================================
// Single Source of Truth Simulation Core Engine (/lib/sim/core.ts)
// ============================================================================
// Enforces mandatory quantitative backtesting rules:
// 1. Strict Signal/Execution Separation: Signal evaluated on closed candle i,
//    execution strictly at open of candle i+1 (plus slippage & fee).
// 2. Intra-candle Priority: If both SL and TP hit in same bar -> STOP LOSS FIRST ALWAYS.
// 3. Gap Execution: If bar opens below SL, execution is at open (adverse price), not SL.
// 4. Single Open Position: Exactly 1 position open per symbol/strategy at any time.
// 5. Explicit Fees and Slippage: Charged on both entry and exit legs.
// 6. Exclusion of Incomplete Candle: The last unclosed candle never enters simulation.
// ============================================================================

import { PrecalculatedIndicators } from '../pipeline/indicators';

export interface HistoricalWindowView {
  length: number;
  currentIndex: number;
  open: ArrayLike<number>;
  high: ArrayLike<number>;
  low: ArrayLike<number>;
  close: ArrayLike<number>;
}

export function createRestrictedWindow(data: any, currentClosedBarIndex: number): HistoricalWindowView {
  const i = currentClosedBarIndex;
  const createProxy = (arr: any) => {
    return new Proxy(arr, {
      get(target, prop) {
        if (prop === 'length') return i + 1;
        if (typeof prop === 'string') {
          const idx = Number(prop);
          if (!Number.isNaN(idx)) {
            if (idx > i) {
              throw new RangeError(`LOOKAHEAD_VIOLATION: Attempted to access future bar [${idx}] beyond current closed bar [${i}].`);
            }
            if (idx < 0) {
              throw new RangeError(`LOOKAHEAD_VIOLATION: Negative index access [${idx}].`);
            }
            return target[idx];
          }
        }
        return (target as any)[prop];
      }
    });
  };

  return {
    length: i + 1,
    currentIndex: i,
    open: createProxy(data.open),
    high: createProxy(data.high),
    low: createProxy(data.low),
    close: createProxy(data.close),
  };
}

export interface CoreSimulationConfig {
  entryType: 'rsi_oversold' | 'ema_cross' | 'macd_cross' | 'breakout_high' | 'supertrend' | 'signal_score' | 'custom';
  exitType?: 'tp_sl' | 'rsi_overbought' | 'ema_cross' | 'signal_score_exit';
  tpPct: number;
  slPct: number;
  feePct?: number;      // default: 0.075% (maker/taker Binance standard)
  slippagePct?: number; // default: 0.05%
  maxDrawdownLimitPct?: number; // default: 30%
  initialCapital?: number; // default: 10000
  riskPerTradePct?: number; // default: 2%
  customSignalFn?: (index: number, window?: HistoricalWindowView) => boolean;
  customExitFn?: (index: number, window?: HistoricalWindowView) => boolean;
}

export interface CoreTradeRecord {
  id: number;
  entryIndex: number;
  exitIndex: number;
  entryDate?: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice: number;
  rawPnlPct: number;
  netPnlPct: number;
  profitUSDT: number;
  capitalAfter: number;
  rUnit: number;
  reason: 'TP' | 'SL' | 'Signal' | 'End_of_period';
  durationBars: number;
  gapped: boolean;
  bothHit: boolean;
}

export interface CoreSimulationResult {
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownPct: number;
  finalCapital: number;
  totalReturnPct: number;
  rValues: number[];
  trades: CoreTradeRecord[];
  stoppedEarly: boolean;
  bothHitCount: number;
  gapCount: number;
}

/**
 * Universal Simulation Core function used across:
 * - One-Click Pipeline Orchestrator
 * - Backtesting Studio
 * - Parameter Grid Search / Optimizer
 * - Paper Trading / Replay Engine
 */
export function simulateCore(
  data: PrecalculatedIndicators | {
    length: number;
    open: Float64Array | number[];
    high: Float64Array | number[];
    low: Float64Array | number[];
    close: Float64Array | number[];
    dates?: string[];
    [key: string]: any;
  },
  config: CoreSimulationConfig,
  startIndex: number = 0,
  endIndex?: number,
  excludeLastUnclosedCandle: boolean = true
): CoreSimulationResult {
  const {
    entryType,
    exitType = 'tp_sl',
    tpPct,
    slPct,
    feePct = 0.075,
    slippagePct = 0.05,
    maxDrawdownLimitPct = 30,
    initialCapital = 10000,
    riskPerTradePct = 2,
    customSignalFn,
    customExitFn,
  } = config;

  const len = data.length;
  // RULE 6: Exclude last unclosed candle if requested (default true)
  const maxEnd = excludeLastUnclosedCandle ? Math.max(0, len - 2) : len - 1;
  const effectiveEnd = endIndex !== undefined ? Math.min(endIndex, maxEnd) : maxEnd;
  const start = Math.max(35, Math.min(startIndex, effectiveEnd));

  let inPosition = false;
  let entryPrice = 0;
  let entryIndex = -1;
  let entryDate = '';
  let pendingBuy = false;
  let pendingSignalBar = -1;

  let capital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdownPct = 0;
  let stoppedEarly = false;
  const earlyStopDrawdownLimit = maxDrawdownLimitPct * 2;

  let tradesCount = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let sumR = 0;
  let bothHitCount = 0;
  let gapCount = 0;

  const trades: CoreTradeRecord[] = [];
  const rValues: number[] = [];

  const roundTripCostPct = (feePct * 2) + (slippagePct * 2);

  // Main chronological bar loop
  for (let i = start; i <= effectiveEnd; i++) {
    const curOpen = data.open[i];
    const curHigh = data.high[i];
    const curLow = data.low[i];
    const curClose = data.close[i];
    const curDateStr = data.dates ? data.dates[i] : `bar_${i}`;

    // -------------------------------------------------------------
    // 1. EXECUTE PENDING BUY ORDER AT OPEN OF BAR i (RULE 1)
    // -------------------------------------------------------------
    // INVARIANT RULE 4: Exactly one open position per strategy/symbol at any time
    if (pendingBuy && !inPosition) {
      inPosition = true;
      // Entry executed on open of bar i with entry slippage
      entryPrice = curOpen * (1 + slippagePct / 100);
      entryIndex = i;
      entryDate = curDateStr;
      pendingBuy = false;
    }

    // -------------------------------------------------------------
    // 2. CHECK INTRA-CANDLE EXIT CONDITIONS (RULES 2 & 3)
    // -------------------------------------------------------------
    if (inPosition && i >= entryIndex) {
      const targetTPPrice = entryPrice * (1 + tpPct / 100);
      const targetSLPrice = entryPrice * (1 - slPct / 100);

      const hitSL = curLow <= targetSLPrice || curOpen <= targetSLPrice;
      const hitTP = curHigh >= targetTPPrice || curOpen >= targetTPPrice;

      let isExit = false;
      let exitPrice = curClose;
      let exitReason: 'TP' | 'SL' | 'Signal' | 'End_of_period' = 'Signal';
      let isBothHit = false;
      let isGapped = false;

      // RULE 2: If both SL and TP are touched in the same candle -> STOP LOSS FIRST ALWAYS!
      if (hitSL && hitTP) {
        bothHitCount++;
        isBothHit = true;
        isExit = true;
        exitReason = 'SL';

        // RULE 3: Gap Check on SL
        if (curOpen <= targetSLPrice) {
          isGapped = true;
          gapCount++;
          // Opened below SL (adverse gap) -> execution at curOpen (worse price) minus slippage
          exitPrice = curOpen * (1 - slippagePct / 100);
        } else {
          exitPrice = targetSLPrice * (1 - slippagePct / 100);
        }
      } else if (hitSL) {
        isExit = true;
        exitReason = 'SL';

        // RULE 3: Gap Check on SL
        if (curOpen <= targetSLPrice) {
          isGapped = true;
          gapCount++;
          // Adverse gap down below stop
          exitPrice = curOpen * (1 - slippagePct / 100);
        } else {
          exitPrice = targetSLPrice * (1 - slippagePct / 100);
        }
      } else if (hitTP) {
        isExit = true;
        exitReason = 'TP';

        // Gap check on TP: if opened above TP without hitting SL
        if (curOpen >= targetTPPrice) {
          isGapped = true;
          gapCount++;
          exitPrice = curOpen * (1 - slippagePct / 100);
        } else {
          exitPrice = targetTPPrice * (1 - slippagePct / 100);
        }
      } else if (exitType === 'rsi_overbought' && (data as any).rsi14 && (data as any).rsi14[i] >= 70) {
        isExit = true;
        exitReason = 'Signal';
        exitPrice = curClose * (1 - slippagePct / 100);
      } else if (exitType === 'ema_cross' && (data as any).ema9 && (data as any).ema21 && (data as any).ema9[i] < (data as any).ema21[i]) {
        isExit = true;
        exitReason = 'Signal';
        exitPrice = curClose * (1 - slippagePct / 100);
      } else if (customExitFn && customExitFn(i, createRestrictedWindow(data, i))) {
        isExit = true;
        exitReason = 'Signal';
        exitPrice = curClose * (1 - slippagePct / 100);
      } else if (i === effectiveEnd) {
        // End of simulation period liquidation
        isExit = true;
        exitReason = 'End_of_period';
        exitPrice = curClose * (1 - slippagePct / 100);
      }

      if (isExit) {
        // Calculate Returns with explicit fees and slippage on both legs (RULE 5)
        const rawReturnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        const netReturnPct = rawReturnPct - (feePct * 2); // fees on entry & exit (slippage already inside entryPrice & exitPrice)

        // R-unit calculation normalized by SL risk %
        const effectiveRiskPct = slPct > 0 ? slPct : 2.0;
        const rUnit = Number(((netReturnPct / effectiveRiskPct)).toFixed(3));

        tradesCount++;
        sumR += rUnit;
        rValues.push(rUnit);

        const tradeProfitAmount = capital * (riskPerTradePct / 100) * rUnit;
        capital += tradeProfitAmount;

        if (rUnit > 0) {
          winningTrades++;
          grossProfit += tradeProfitAmount;
        } else {
          losingTrades++;
          grossLoss += Math.abs(tradeProfitAmount);
        }

        const tradeRecord: CoreTradeRecord = {
          id: tradesCount,
          entryIndex,
          exitIndex: i,
          entryDate,
          exitDate: curDateStr,
          entryPrice: Number(entryPrice.toFixed(4)),
          exitPrice: Number(exitPrice.toFixed(4)),
          rawPnlPct: Number(rawReturnPct.toFixed(3)),
          netPnlPct: Number(netReturnPct.toFixed(3)),
          profitUSDT: Number(tradeProfitAmount.toFixed(2)),
          capitalAfter: Number(capital.toFixed(2)),
          rUnit,
          reason: exitReason,
          durationBars: i - entryIndex,
          gapped: isGapped,
          bothHit: isBothHit,
        };
        trades.push(tradeRecord);

        // Drawdown Tracking
        if (capital > peakCapital) {
          peakCapital = capital;
        }
        const currentDd = ((peakCapital - capital) / peakCapital) * 100;
        if (currentDd > maxDrawdownPct) {
          maxDrawdownPct = currentDd;
        }

        // Early stopping prune
        if (maxDrawdownPct >= earlyStopDrawdownLimit) {
          stoppedEarly = true;
          inPosition = false;
          break;
        }

        inPosition = false;
      }
    }

    // -------------------------------------------------------------
    // 3. EVALUATE STRATEGY SIGNALS AT CLOSE OF BAR i (RULE 1)
    // -------------------------------------------------------------
    // Lookahead prevention: signal evaluated on closed bar i,
    // order placed for execution at open of bar i + 1.
    if (!inPosition && !pendingBuy && i < effectiveEnd) {
      let shouldEnter = false;

      if (customSignalFn) {
        const windowView = createRestrictedWindow(data, i);
        shouldEnter = customSignalFn(i, windowView);
      } else if (entryType === 'rsi_oversold') {
        const rsi = (data as any).rsi14;
        if (rsi && i >= 1) {
          shouldEnter = rsi[i - 1] < 30 && rsi[i] >= 30;
        }
      } else if (entryType === 'ema_cross') {
        const ema9 = (data as any).ema9;
        const ema21 = (data as any).ema21;
        if (ema9 && ema21 && i >= 1) {
          shouldEnter = ema9[i - 1] <= ema21[i - 1] && ema9[i] > ema21[i];
        }
      } else if (entryType === 'macd_cross') {
        const hist = (data as any).macdHist;
        if (hist && i >= 1) {
          shouldEnter = hist[i - 1] <= 0 && hist[i] > 0;
        }
      } else if (entryType === 'breakout_high') {
        const highest20 = (data as any).highest20;
        if (highest20 && i >= 1) {
          shouldEnter = curClose > highest20[i - 1];
        }
      } else if (entryType === 'supertrend') {
        const ema50 = (data as any).ema50;
        const rsi = (data as any).rsi14;
        if (ema50 && rsi) {
          shouldEnter = curClose > ema50[i] && rsi[i] > 50;
        }
      }

      if (shouldEnter) {
        // Set pending buy to execute at bar i + 1 open
        pendingBuy = true;
        pendingSignalBar = i;
      }
    }
  }

  const winRate = tradesCount > 0 ? winningTrades / tradesCount : 0;
  const expectancyR = tradesCount > 0 ? sumR / tradesCount : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 5.0 : 1.0;
  const totalReturnPct = ((capital - initialCapital) / initialCapital) * 100;

  return {
    tradesCount,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(4)),
    expectancyR: Number(expectancyR.toFixed(3)),
    profitFactor: Number(profitFactor.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    finalCapital: Number(capital.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    rValues,
    trades,
    stoppedEarly,
    bothHitCount,
    gapCount,
  };
}
