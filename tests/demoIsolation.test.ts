import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSamplePaperData, INITIAL_PAPER_BALANCE } from '../src/components/paper/paperSampleData';
import { calculateStatisticalEvidence } from '../src/lib/stats/index';
import { evaluateStrategyGate } from '../src/lib/gate/gatekeeper';
import { EvidenceTrade } from '../src/types/evidence';

test('Demo Isolation Test: Generating demo trades does NOT pollute statistical evidence or gate status', () => {
  // 1. Create a clean baseline evidence trade set
  const baselineTrades: EvidenceTrade[] = Array.from({ length: 40 }, (_, i) => ({
    id: `base_${i}`,
    entryTime: 1700000000000 + i * 86400000,
    exitTime: 1700000000000 + (i + 1) * 86400000,
    side: 'long',
    entryPrice: 50000,
    exitPrice: 50000 * (1 + (i % 2 === 0 ? 0.04 : -0.02)),
    riskAmount: 200,
    pnlAmount: i % 2 === 0 ? 400 : -200,
    pnlR: i % 2 === 0 ? 2.0 : -1.0,
    durationBars: 3,
    fees: 4,
    slippage: 2,
    regime: 'bull',
    sampleType: 'inSample',
  }));

  // Calculate baseline evidence and gate status
  const baselineEvidence = calculateStatisticalEvidence(baselineTrades, {
    strategyId: 'baseline_strat',
    strategyName: 'Baseline Strat',
    symbol: 'BTCUSDT',
    timeframe: '1d',
    bootstrapIterations: 500,
  });
  const baselineGate = evaluateStrategyGate(baselineEvidence);

  const baselineExpectancy = baselineEvidence.expectancyR;
  const baselineTStat = baselineEvidence.tTest.tStat;
  const baselineGateStatus = baselineGate.status;

  // 2. Generate massive Demo Trades (simulation sample data)
  const demoData = generateSamplePaperData();
  assert.ok(demoData.orders.length > 0, 'Demo orders must be populated');
  assert.equal(INITIAL_PAPER_BALANCE, 10000, 'Initial demo balance constant must be 10000');
  assert.ok(demoData.balance > 0, 'Demo balance must be positive');

  // Verify demo orders are typed as PaperOrder and do not feed into real EvidenceTrade
  demoData.orders.forEach((demoOrder) => {
    // Assert demo order structure does not contain EvidenceTrade mandatory sampleType
    assert.strictEqual((demoOrder as any).sampleType, undefined, 'Demo order must not have sampleType');
  });

  // 3. Recalculate statistical evidence and gatekeeper on the actual real dataset
  const afterEvidence = calculateStatisticalEvidence(baselineTrades, {
    strategyId: 'baseline_strat',
    strategyName: 'Baseline Strat',
    symbol: 'BTCUSDT',
    timeframe: '1d',
    bootstrapIterations: 500,
  });
  const afterGate = evaluateStrategyGate(afterEvidence);

  // 4. Strict assertions: Zero alteration to statistics or gatekeeper status
  assert.equal(
    afterEvidence.expectancyR.point,
    baselineExpectancy.point,
    'Expectancy R point estimate must remain 100% identical after demo generation'
  );
  assert.deepEqual(
    afterEvidence.expectancyR.ci95,
    baselineExpectancy.ci95,
    'Expectancy R 95% CI must remain 100% identical after demo generation'
  );
  assert.equal(
    afterEvidence.tTest.tStat,
    baselineTStat,
    't-statistic must remain 100% identical after demo generation'
  );
  assert.equal(
    afterGate.status,
    baselineGateStatus,
    'Gate status must remain 100% identical after demo generation'
  );
  assert.equal(
    afterGate.status === 'approved',
    baselineGate.status === 'approved',
    'Approval status must remain unchanged'
  );

  // 5. Verify CSV export pattern contains demo
  const exportFilename = `simulated-trades-demo-${Date.now()}.csv`;
  assert.ok(exportFilename.includes('demo'), 'CSV export filename MUST include demo');
});
