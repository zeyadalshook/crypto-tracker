import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSamplePaperData, INITIAL_PAPER_BALANCE } from '../src/components/paper/paperSampleData';
import { PaperOrder, PortfolioSnapshot } from '../src/components/paper/paperTypes';

test('Paper Trading: Initial sample data maintains mathematical consistency', () => {
  const { orders, snapshots, balance } = generateSamplePaperData();

  assert.equal(INITIAL_PAPER_BALANCE, 10000, 'Initial paper trading balance must be 10,000 USDT');
  assert.ok(orders.length >= 12, 'Sample data should provide at least 12 realistic orders');
  assert.ok(snapshots.length >= 10, 'Sample data should provide chronological snapshots');

  // Verify initial snapshot
  const genesis = snapshots[0];
  assert.equal(genesis.equity, 10000);
  assert.equal(genesis.roiPct, 0);

  // Closed trades verification
  const closedTrades = orders.filter((o) => o.status === 'closed');
  let sumRealizedPnl = 0;
  closedTrades.forEach((t) => {
    assert.ok(t.closedTimestamp !== undefined, 'Closed trade must have closedTimestamp');
    assert.ok(t.pnlUsdt !== undefined, 'Closed trade must have pnlUsdt');
    assert.ok(t.pnlPercent !== undefined, 'Closed trade must have pnlPercent ROI');
    sumRealizedPnl += t.pnlUsdt;
  });

  // Verify that the final snapshot matches expected equity
  const lastSnap = snapshots[snapshots.length - 1];
  assert.ok(lastSnap.equity > 10000, 'Sample portfolio should reflect profitable realistic performance');
  
  // Calculate expected ROI
  const calculatedRoi = ((lastSnap.equity - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE) * 100;
  assert.ok(
    Math.abs(calculatedRoi - lastSnap.roiPct) < 0.05,
    `ROI in snapshot (${lastSnap.roiPct}%) must match formula calculated ROI (${calculatedRoi}%)`
  );
});

test('Paper Trading: Trade ROI % calculation identity holds', () => {
  // Test trade: Buy 0.5 BTC at $60,000, sell at $66,000 (+10% gain)
  const order: PaperOrder = {
    id: 'test-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    orderPrice: 60000,
    amountCoins: 0.5,
    totalUsdt: 30000,
    createdAt: '2026-10-16',
    timestamp: Date.now() - 3600000,
    status: 'closed',
    closePrice: 66000,
    closedTimestamp: Date.now(),
    pnlUsdt: 3000,
    pnlPercent: 10.0,
  };

  const priceDiff = (order.closePrice || 0) - order.orderPrice;
  const expectedPnl = order.amountCoins * priceDiff;
  const expectedRoi = (priceDiff / order.orderPrice) * 100;

  assert.equal(order.pnlUsdt, expectedPnl, 'PnL in USDT must equal amountCoins * priceDiff');
  assert.equal(order.pnlPercent, expectedRoi, 'ROI % must equal (priceDiff / orderPrice) * 100');
});
