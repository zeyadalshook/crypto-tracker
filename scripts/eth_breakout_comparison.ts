import fs from 'node:fs';
import { computeIndicatorsOnce } from '../src/lib/pipeline/indicators';
import { simulateCore } from '../src/lib/sim/core';

const eth = JSON.parse(fs.readFileSync('data/ETHUSDT.json', 'utf8')).slice(-1000);
const ind = computeIndicatorsOnce(eth);

// 1. Candidate A: TP=14, SL=6 (28 trades, 8 wins = 28.6%, E[R] = -0.111)
const res14 = simulateCore(ind, { entryType: 'breakout_high', tpPct: 14, slPct: 6 }, 35, ind.length - 2, true);

// 2. Candidate B: TP=12, SL=6 (29 trades, 13 wins = 44.8%, E[R] = +0.311)
const res12 = simulateCore(ind, { entryType: 'breakout_high', tpPct: 12, slPct: 6 }, 35, ind.length - 2, true);

console.log('=== ETH BREAKOUT TRADE-BY-TRADE AUDIT ===\n');
console.log('Parameters: TP=14%/SL=6% (28 trades, 8 wins, 28.6%) VS TP=12%/SL=6% (29 trades, 13 wins, 44.8%)\n');

console.log('| # | Date Entry | Entry Price | TP=14 Exit (Reason, R) | TP=12 Exit (Reason, R) | Status Change & Rationale |');
console.log('|---|---|---|---|---|---|');

let i14 = 0;
let i12 = 0;

for (let idx = 0; idx < Math.max(res14.trades.length, res12.trades.length); idx++) {
  const t14 = res14.trades[i14];
  const t12 = res12.trades[i12];

  if (t14 && t12 && t14.entryDate === t12.entryDate) {
    let note = 'Identical outcome';
    if (t14.reason !== t12.reason) {
      note = `Flipped: TP14 hit ${t14.reason} (${t14.rUnit}R) while TP12 reached TP (${t12.rUnit}R) before reversal`;
    }
    console.log(`| ${idx + 1} | ${t12.entryDate} | ${t12.entryPrice} | ${t14.exitDate} (${t14.reason}, ${t14.rUnit}R) | ${t12.exitDate} (${t12.reason}, ${t12.rUnit}R) | ${note} |`);
    i14++;
    i12++;
  } else if (t12) {
    console.log(`| ${idx + 1} | ${t12.entryDate} | ${t12.entryPrice} | [No trade in TP14 due to open pos] | ${t12.exitDate} (${t12.reason}, ${t12.rUnit}R) | New trade unblocked because TP12 exited earlier |`);
    i12++;
  } else if (t14) {
    console.log(`| ${idx + 1} | ${t14.entryDate} | ${t14.entryPrice} | ${t14.exitDate} (${t14.reason}, ${t14.rUnit}R) | [No trade in TP12] | Trade held longer in TP14 |`);
    i14++;
  }
}

console.log('\nSummary Analysis:');
console.log(`TP=14/SL=6: Trades=${res14.tradesCount}, Wins=${res14.winningTrades}, WinRate=${(res14.winRate*100).toFixed(1)}%, E[R]=${res14.expectancyR} R, MaxDD=${res14.maxDrawdownPct}%`);
console.log(`TP=12/SL=6: Trades=${res12.tradesCount}, Wins=${res12.winningTrades}, WinRate=${(res12.winRate*100).toFixed(1)}%, E[R]=${res12.expectancyR} R, MaxDD=${res12.maxDrawdownPct}%`);
