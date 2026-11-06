import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { simulateCore } from '../src/lib/sim/core';

function verifyCrossLanguage(symbol: string, tp: number, sl: number) {
  const candles = JSON.parse(fs.readFileSync(`data/${symbol}.json`, 'utf8'));
  const ind = computeIndicatorsOnce(candles);
  const n = candles.length;

  // 1. TypeScript Core Simulator
  const dates = candles.map((c: any) => c.date);
  const indWithDates = { ...ind, dates };
  const tsRes = simulateCore(indWithDates, {
    entryType: 'breakout_high',
    tpPct: tp,
    slPct: sl,
    feePct: 0.075,
    slippagePct: 0.05
  }, 35, n - 2, false);

  // 2. Python Independent Reference
  const pyCmd = `python3 scripts/independent_reference.py --breakout data/${symbol}.json ${tp} ${sl}`;
  const pyRaw = execSync(pyCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const pyRes = JSON.parse(pyRaw);

  console.log(`\n======================================================`);
  console.log(`CROSS-LANGUAGE BENCHMARK AUDIT: ${symbol} (TP=${tp}%, SL=${sl}%)`);
  console.log(`======================================================`);
  console.log(`Total Candles: ${n}`);
  console.log(`TypeScript Trades: ${tsRes.tradesCount} | Python Trades: ${pyRes.tradesCount}`);
  console.log(`TypeScript Wins: ${tsRes.winningTrades} | Python Wins: ${pyRes.winningTrades}`);
  console.log(`TypeScript WinRate: ${(tsRes.winRate * 100).toFixed(2)}% | Python WinRate: ${(pyRes.winRate * 100).toFixed(2)}%`);
  console.log(`TypeScript E[R]: ${tsRes.expectancyR.toFixed(4)} R | Python E[R]: ${pyRes.expectancyR.toFixed(4)} R`);

  let mismatches = 0;
  for (let i = 0; i < Math.max(tsRes.trades.length, pyRes.trades.length); i++) {
    const tTs = tsRes.trades[i];
    const tPy = pyRes.trades[i];

    if (!tTs || !tPy) {
      console.error(`Trade #${i + 1} exists in only one implementation!`);
      mismatches++;
      continue;
    }

    const dateMatch = tTs.entryDate === tPy.entryDate && tTs.exitDate === tPy.exitDate;
    const entryPriceDiff = Math.abs(tTs.entryPrice - tPy.entryPrice);
    const exitPriceDiff = Math.abs(tTs.exitPrice - tPy.exitPrice);
    const reasonMatch = tTs.reason === tPy.reason;
    const rUnitDiff = Math.abs(tTs.rUnit - tPy.rUnit);

    if (!dateMatch || entryPriceDiff > 0.01 || exitPriceDiff > 0.01 || !reasonMatch || rUnitDiff > 0.005) {
      console.error(`Mismatch at trade #${i + 1}:`);
      console.error(`  TS: [${tTs.entryDate} -> ${tTs.exitDate}] Entry=${tTs.entryPrice}, Exit=${tTs.exitPrice}, Reason=${tTs.reason}, R=${tTs.rUnit}`);
      console.error(`  PY: [${tPy.entryDate} -> ${tPy.exitDate}] Entry=${tPy.entryPrice}, Exit=${tPy.exitPrice}, Reason=${tPy.reason}, R=${tPy.rUnit}`);
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log(`✅ PERFECT MATCH: 0 discrepancies across all ${tsRes.tradesCount} trades!`);
    console.log(`Every entry date, exit date, entry price, exit price, reason, and R-multiple matches identically.`);
  } else {
    console.error(`❌ FOUND ${mismatches} DISCREPANCIES!`);
  }

  return mismatches;
}

const btcMismatches = verifyCrossLanguage('BTCUSDT', 12, 6);
const ethMismatches = verifyCrossLanguage('ETHUSDT', 12, 6);

if (btcMismatches > 0 || ethMismatches > 0) {
  process.exit(1);
}
