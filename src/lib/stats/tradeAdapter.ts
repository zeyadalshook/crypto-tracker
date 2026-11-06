// Trade Adapter: Converts Backtest Trades or Journal Trades into EvidenceTrade format
import { TradeRecord } from '../../utils/backtestEngine';
import { EvidenceTrade, TradeRegime, TradeSampleType } from '../../types/evidence';

export function convertBacktestTradesToEvidence(
  trades: TradeRecord[],
  options: {
    assumedRiskPct?: number; // default: 2.0%
    initialCapital?: number; // default: 10,000
    stopLossPct?: number;    // default: 4.0%
    outOfSampleSplit?: number; // e.g. 0.70
  } = {}
): EvidenceTrade[] {
  const {
    assumedRiskPct = 2.0,
    initialCapital = 10000,
    stopLossPct = 4.0,
    outOfSampleSplit = 0.7,
  } = options;

  const total = trades.length;
  const splitIndex = Math.floor(total * outOfSampleSplit);

  return trades.map((t, index) => {
    // Risk amount per trade in USD
    const riskAmount = Math.max(10, (initialCapital * assumedRiskPct) / 100);

    // pnlR = Return in R units
    // If trade lost 4% with a 4% SL, pnlR = -1.0 R.
    // If trade won 8% with a 4% SL, pnlR = +2.0 R.
    const slSafe = stopLossPct > 0 ? stopLossPct : 4.0;
    const pnlR = Number((t.profitPercent / slSafe).toFixed(3));

    let regime: TradeRegime = 'chop';
    if (t.regime.includes('صاعد') || t.regime.toLowerCase().includes('bull')) {
      regime = 'bull';
    } else if (t.regime.includes('هابط') || t.regime.toLowerCase().includes('bear')) {
      regime = 'bear';
    }

    const sampleType: TradeSampleType =
      index < splitIndex ? 'inSample' : 'outOfSample';

    return {
      id: `trade_${t.id}_${index}`,
      entryTime: new Date(t.entryDate).getTime() || Date.now() - (total - index) * 3600000,
      exitTime: new Date(t.exitDate).getTime() || Date.now() - (total - index - 1) * 3600000,
      side: 'long',
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      riskAmount,
      pnlAmount: t.netProfitUSDT,
      pnlR,
      maeR: pnlR < 0 ? -1.0 : -0.3,
      mfeR: pnlR > 0 ? pnlR + 0.2 : 0.2,
      durationBars: t.durationBars || 5,
      fees: riskAmount * 0.05,
      slippage: riskAmount * 0.02,
      regime,
      sampleType,
    };
  });
}
