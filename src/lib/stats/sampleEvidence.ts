// Default sample evidence generator for previewing the Strategy Gatekeeper
import { calculateStatisticalEvidence } from './index';
import { EvidenceTrade, StatisticalEvidence } from '../../types/evidence';
import { Mulberry32 } from './random';

export function getSampleOrCalculatedEvidence(
  symbol: string = 'BTCUSDT',
  customTrades?: EvidenceTrade[]
): StatisticalEvidence {
  if (customTrades && customTrades.length >= 10) {
    return calculateStatisticalEvidence(customTrades, {
      strategyId: `strategy_${symbol.toLowerCase()}`,
      strategyName: `استراتيجية الزخم والانعكاس (${symbol})`,
      symbol,
      timeframe: '1h',
    });
  }

  // Generate a realistic sample dataset of 85 trades (representing typical algorithmic trading performance)
  const rng = new Mulberry32(1337);
  const now = Date.now();
  const sampleTrades: EvidenceTrade[] = [];

  for (let i = 0; i < 85; i++) {
    const isWin = rng.next() < 0.58; // 58% win rate
    const pnlR = isWin
      ? Number((rng.next() * 2.8 + 0.6).toFixed(2)) // +0.6R to +3.4R
      : Number((-1 * (rng.next() * 0.4 + 0.8)).toFixed(2)); // -0.8R to -1.2R

    const sampleType = i < 60 ? 'inSample' : 'outOfSample';
    const regimeVal = rng.next();
    const regime = regimeVal < 0.45 ? 'bull' : regimeVal < 0.75 ? 'chop' : 'bear';

    sampleTrades.push({
      id: `sample_${i}`,
      entryTime: now - (85 - i) * 86400000,
      exitTime: now - (85 - i) * 86400000 + 14400000,
      side: 'long',
      entryPrice: 60000 + rng.next() * 5000,
      exitPrice: 62000,
      riskAmount: 200,
      pnlAmount: pnlR * 200,
      pnlR,
      maeR: pnlR < 0 ? -1.0 : -0.2,
      mfeR: pnlR > 0 ? pnlR + 0.3 : 0.2,
      durationBars: rng.nextInt(3, 18),
      fees: 4,
      slippage: 2,
      regime,
      sampleType,
    });
  }

  return calculateStatisticalEvidence(sampleTrades, {
    strategyId: `strat_pro_${symbol.toLowerCase()}`,
    strategyName: `استراتيجية الزخم المعتمدة (${symbol})`,
    symbol,
    timeframe: '1h',
    maxDisciplineRiskPct: 1.0,
  });
}
