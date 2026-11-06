import fs from 'node:fs';
import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { simulateCore, CoreSimulationConfig } from '../src/lib/sim/core';

const btc = JSON.parse(fs.readFileSync('data/BTCUSDT.json', 'utf8'));
const ind = computeIndicatorsOnce(btc);
const n = btc.length;

console.log('=== SECTION 4: EXECUTION REALISM & LIMIT ORDER FILL MODELING ===\n');

// Custom simulator with Penetration Threshold
function simulateWithPenetration(ind: any, tpPct: number, slPct: number, tpPenetrationPct: number) {
  const len = ind.length;
  let inPos = false;
  let entryPrice = 0;
  let entryIndex = -1;
  let pendingBuy = false;

  const slippagePct = 0.05;
  const feePct = 0.075;

  let tradesCount = 0;
  let winningTrades = 0;
  let sumR = 0;
  let touchWithoutPenetrationCount = 0;
  const trades: any[] = [];
  const rValues: number[] = [];

  for (let i = 35; i <= len - 2; i++) {
    const curOpen = ind.open[i];
    const curHigh = ind.high[i];
    const curLow = ind.low[i];
    const curClose = ind.close[i];

    // Execute pending buy at open of bar i
    if (pendingBuy && !inPos) {
      inPos = true;
      entryPrice = curOpen * (1 + slippagePct / 100);
      entryIndex = i;
      pendingBuy = false;
    }

    // Intra-candle exit check
    if (inPos && i >= entryIndex) {
      const targetTPPrice = entryPrice * (1 + tpPct / 100);
      const requiredTPPrice = targetTPPrice * (1 + tpPenetrationPct / 100);
      const targetSLPrice = entryPrice * (1 - slPct / 100);

      // Check if price touched standard TP but failed required penetration
      if (curHigh >= targetTPPrice && curHigh < requiredTPPrice) {
        touchWithoutPenetrationCount++;
      }

      const hitSL = curLow <= targetSLPrice || curOpen <= targetSLPrice;
      const hitTP = curHigh >= requiredTPPrice || curOpen >= requiredTPPrice;

      let isExit = false;
      let exitPrice = curClose;
      let reason = 'Signal';

      if (hitSL && hitTP) {
        // Stop loss first always
        isExit = true;
        reason = 'SL';
        exitPrice = (curOpen <= targetSLPrice ? curOpen : targetSLPrice) * (1 - slippagePct / 100);
      } else if (hitSL) {
        isExit = true;
        reason = 'SL';
        exitPrice = (curOpen <= targetSLPrice ? curOpen : targetSLPrice) * (1 - slippagePct / 100);
      } else if (hitTP) {
        isExit = true;
        reason = 'TP';
        exitPrice = (curOpen >= targetTPPrice ? curOpen : targetTPPrice) * (1 - slippagePct / 100);
      } else if (i === len - 2) {
        isExit = true;
        reason = 'End_of_period';
        exitPrice = curClose * (1 - slippagePct / 100);
      }

      if (isExit) {
        const rawReturnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        const netReturnPct = rawReturnPct - (feePct * 2);
        const rUnit = Number((netReturnPct / slPct).toFixed(3));

        tradesCount++;
        sumR += rUnit;
        rValues.push(rUnit);
        if (rUnit > 0) winningTrades++;

        trades.push({
          id: tradesCount,
          entryIndex,
          exitIndex: i,
          entryPrice,
          exitPrice,
          reason,
          rUnit
        });
        inPos = false;
      }
    }

    // Signal check on closed bar i
    if (!inPos && !pendingBuy && i < len - 2) {
      if (curClose > ind.highest20[i - 1]) {
        pendingBuy = true;
      }
    }
  }

  const winRate = tradesCount > 0 ? winningTrades / tradesCount : 0;
  const expectancyR = tradesCount > 0 ? sumR / tradesCount : 0;

  return {
    tradesCount,
    winningTrades,
    winRate,
    expectancyR,
    touchWithoutPenetrationCount,
    trades,
    rValues
  };
}

// 1. Standard Touch (0.00% penetration required)
const standard = simulateWithPenetration(ind, 12, 6, 0.00);

// 2. Conservative Model 1 (+0.05% penetration required)
const cons05 = simulateWithPenetration(ind, 12, 6, 0.05);

// 3. Conservative Model 2 (+0.10% penetration required)
const cons10 = simulateWithPenetration(ind, 12, 6, 0.10);

console.log('| Model | TP Penetration Required | Trades (n) | Wins | Win Rate % | E[R] (Mean R) | Delta E[R] vs Standard | Sensitive Touches without Penetration |');
console.log('|---|---|---|---|---|---|---|---|');
console.log(`| Standard (Touch) | 0.00% | ${standard.tradesCount} | ${standard.winningTrades} | ${(standard.winRate * 100).toFixed(1)}% | ${standard.expectancyR.toFixed(3)} R | 0.000 R | 0 |`);
console.log(`| Conservative (+0.05%) | +0.05% | ${cons05.tradesCount} | ${cons05.winningTrades} | ${(cons05.winRate * 100).toFixed(1)}% | ${cons05.expectancyR.toFixed(3)} R | ${(cons05.expectancyR - standard.expectancyR).toFixed(3)} R | ${cons05.touchWithoutPenetrationCount} |`);
console.log(`| Conservative (+0.10%) | +0.10% | ${cons10.tradesCount} | ${cons10.winningTrades} | ${(cons10.winRate * 100).toFixed(1)}% | ${cons10.expectancyR.toFixed(3)} R | ${(cons10.expectancyR - standard.expectancyR).toFixed(3)} R | ${cons10.touchWithoutPenetrationCount} |`);

console.log('\nAudit of Sensitive Trades:');
console.log(`Number of times candle high touched [TP, TP + 0.05%): ${cons05.touchWithoutPenetrationCount}`);
if (standard.tradesCount !== cons05.tradesCount || standard.winningTrades !== cons05.winningTrades) {
  console.log('Trades affected by order queue delay:');
  for (let i = 0; i < Math.min(standard.trades.length, cons05.trades.length); i++) {
    const tStd = standard.trades[i];
    const t05 = cons05.trades[i];
    if (tStd.exitIndex !== t05.exitIndex || tStd.reason !== t05.reason) {
      console.log(`  Trade #${i + 1}: Standard exited at bar ${tStd.exitIndex} (${tStd.reason}) vs Conservative exited at bar ${t05.exitIndex} (${t05.reason})`);
    }
  }
} else {
  console.log('All trades that reached the TP target penetrated past +0.05% and +0.10% cleanly; zero trades failed to execute due to queue priority.');
}
