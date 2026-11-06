import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSmartMoneyConcepts } from '../src/utils/smcScanner';
import { runSmartDcaSimulation } from '../src/utils/dcaSimulator';
import { OHLCV } from '../src/types/crypto';

describe('Smart Money Concepts (SMC) & Smart DCA Simulators', () => {
  it('detects unmitigated Bullish Fair Value Gap (FVG) and Premium/Discount zones accurately', () => {
    const candles: OHLCV[] = [];
    // Create 15 baseline candles around 100
    for (let i = 0; i < 15; i++) {
      candles.push({
        time: `2026-01-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 102,
        low: 98,
        close: 100,
        volume: 1000,
      });
    }

    // Inject a 3-candle Bullish FVG:
    // candle A: high = 102
    // candle B: big impulse from 102 to 112
    // candle C: low = 106 (> 102 -> gap between 102 and 106)
    candles.push({
      time: '2026-01-16',
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 1500,
    });
    candles.push({
      time: '2026-01-17',
      open: 101,
      high: 112,
      low: 101,
      close: 111,
      volume: 4500,
    });
    candles.push({
      time: '2026-01-18',
      open: 111,
      high: 115,
      low: 106,
      close: 114,
      volume: 2000,
    });

    const report = analyzeSmartMoneyConcepts(candles, 114);
    assert.equal(report.swingLow, 98);
    assert.equal(report.swingHigh, 115);
    assert.equal(report.currentZone, 'premium');
    assert.ok(report.unmitigatedFvgs.length >= 1, 'Expected at least 1 unmitigated FVG');

    const bullFvg = report.unmitigatedFvgs.find((f) => f.type === 'bullish');
    assert.ok(bullFvg, 'Bullish FVG should be detected');
    assert.equal(bullFvg.bottomPrice, 102);
    assert.equal(bullFvg.topPrice, 106);
  });

  it('simulates Smart RSI-Weighted DCA vs Regular DCA and calculates lower average cost during dips', () => {
    const candles: OHLCV[] = [];
    // Construct 60 days: price starts at 100, dips sharply to 60 (oversold RSI < 30), then recovers to 110
    for (let i = 0; i < 60; i++) {
      let price = 100;
      if (i >= 15 && i <= 35) {
        price = 100 - (i - 15) * 2; // Drops down to 60
      } else if (i > 35) {
        price = 60 + (i - 35) * 2.1; // Recovers to ~110
      }
      candles.push({
        time: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: 10000,
      });
    }

    const sim = runSmartDcaSimulation('SOL', candles, {
      baseAmountUsdt: 100,
      intervalDays: 3,
      lookbackDays: 60,
      oversoldRsiThreshold: 38,
      overboughtRsiThreshold: 68,
    });

    assert.ok(sim.purchasesCount > 10);
    assert.ok(sim.regularDca.totalInvestedUsdt > 0);
    assert.ok(sim.smartRsiDca.totalCoinsAccumulated > 0);
    // Because Smart DCA buys 1.5x-2.0x during the oversold dip around $60-$75, its average buy price should be lower than Regular DCA
    assert.ok(
      sim.smartRsiDca.averageBuyPrice <= sim.regularDca.averageBuyPrice,
      `Expected Smart DCA avg price (${sim.smartRsiDca.averageBuyPrice}) <= Regular DCA (${sim.regularDca.averageBuyPrice})`
    );
  });
});
