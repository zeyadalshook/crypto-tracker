// Candle-Close Scanner Engine (الماسح عند إغلاق الشمعة)
// Runs upon candle close for approved strategies only; enforces strict liquidity pre-filters

import { TradingIntent } from '../risk/riskTypes';

export interface ScannerCandidateCoin {
  symbol: string;
  currentPrice: number;
  volume24hUsd: number;
  spreadPct: number;
  rsiValue: number;
  ema9: number;
  ema21: number;
  atrValue: number;
  strategyId: string;
  strategyName: string;
  isGateApproved: boolean; // only approved or small_live eligible for real execution
}

export function scanCandleCloseSignals(
  coins: ScannerCandidateCoin[],
  candleTimestamp: number = Date.now()
): TradingIntent[] {
  const intents: TradingIntent[] = [];

  for (const c of coins) {
    // Liquidity pre-filters
    if (c.volume24hUsd < 20000000 || c.spreadPct > 0.2) {
      continue;
    }

    // Gatekeeper rule: Only generate active execution intents for approved strategies
    if (!c.isGateApproved) {
      continue;
    }

    // Deterministic signal rules (e.g., RSI reversal or EMA trend)
    let hasSignal = false;
    let signalReason = '';
    let stopLossPrice = 0;
    let targetPrice = 0;

    if (c.rsiValue <= 32) {
      hasSignal = true;
      signalReason = `ارتداد مؤشر RSI (${c.rsiValue.toFixed(1)} ≤ 32) في منطقة التشبع البيعي الحاد`;
      stopLossPrice = c.currentPrice - 2.0 * c.atrValue;
      targetPrice = c.currentPrice + 3.5 * c.atrValue;
    } else if (c.ema9 > c.ema21 && c.currentPrice > c.ema9) {
      hasSignal = true;
      signalReason = `تقاطع اتجاهي صاعد EMA9 (${c.ema9.toFixed(1)}) فوق EMA21 (${c.ema21.toFixed(1)}) مع دعم السعر`;
      stopLossPrice = c.currentPrice - 1.5 * c.atrValue;
      targetPrice = c.currentPrice + 3.0 * c.atrValue;
    }

    if (hasSignal && stopLossPrice > 0 && targetPrice > 0) {
      intents.push({
        id: `intent_${c.symbol}_${candleTimestamp}_${intents.length}`,
        strategyId: c.strategyId,
        strategyName: c.strategyName,
        params: { slAtr: 2.0, tpAtr: 3.5 },
        symbol: c.symbol,
        side: 'buy',
        type: 'entry',
        reason: signalReason,
        entryPriceRef: c.currentPrice,
        stopPrice: Number(stopLossPrice.toFixed(4)),
        targets: [{ price: Number(targetPrice.toFixed(4)), closePct: 100 }],
        signalCandleTime: candleTimestamp,
        createdAt: Date.now(),
      });
    }
  }

  return intents;
}
