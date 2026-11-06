import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAssetFundamentals,
  RawAssetFundamentalInput,
} from '../src/lib/fundamentals/scoringEngine';
import {
  createSourceMeta,
  reconcileNumericMetric,
  SEVEN_DAYS_MS,
} from '../src/lib/fundamentals/dataSources/sourcePriority';
import { screenerDataService } from '../src/lib/fundamentals/dataSources/screenerDataService';
import { runStageAFastScreening } from '../src/lib/fundamentals/funnel/stageA';
import { buildStageDTechnicalContext } from '../src/lib/fundamentals/funnel/stageD';
import { snapshotStore } from '../src/lib/fundamentals/storage/snapshotStore';

const dummySource = createSourceMeta('Test Source', 'https://example.com');

// Helper to construct a synthetic candidate with known expected score
function createPerfectScoreInput(): RawAssetFundamentalInput {
  return {
    symbol: 'PERFECT',
    coinId: 'perfect-defi',
    coinName: 'Perfect DeFi',
    sector: 'DeFi / DEXes',
    circulatingSupply: { value: 80000000, identifier: 'circ_supply', primarySource: dummySource, status: 'available' },
    maxSupply: { value: 100000000, identifier: 'max_supply', primarySource: dummySource, status: 'available' },
    circulatingToMaxPct: { value: 80.0, identifier: 'circ_to_max', primarySource: dummySource, status: 'available' },
    unlock12MonthsPctOfCirculating: { value: 5.0, identifier: 'unlock_12m', primarySource: dummySource, status: 'available' },
    annualInflationPct: { value: 2.0, identifier: 'inflation_rate', primarySource: dummySource, status: 'available' },
    top10HoldersConcentrationPct: { value: 20.0, identifier: 'top10_concentration', primarySource: dummySource, status: 'available' },
    annualProtocolFeesUsd: { value: 150000000, identifier: 'annual_fees', primarySource: dummySource, status: 'available' },
    feeGrowth90DaysPct: { value: 15.0, identifier: 'fee_growth_90d', primarySource: dummySource, status: 'available' },
    treasuryRevenueUsd: { value: 30000000, identifier: 'treasury_revenue', primarySource: dummySource, status: 'available' },
    fdvToRevenueMultiple: { value: 25.0, identifier: 'fdv_to_revenue', primarySource: dummySource, status: 'available' },
    tokenEmissionAnnualValueUsd: { value: 5000000, identifier: 'emission_val', primarySource: dummySource, status: 'available' },
    singleSourceRevenueConcentrationPct: { value: 35.0, identifier: 'rev_concentration', primarySource: dummySource, status: 'available' },
    revenueHistoryMonths: { value: 36, identifier: 'rev_history', primarySource: dummySource, status: 'available' },
    activeUsersGrowth90DaysPct: { value: 10.0, identifier: 'users_growth', primarySource: dummySource, status: 'available' },
    tvlGrowth12MonthsPct: { value: 25.0, identifier: 'tvl_growth', primarySource: dummySource, status: 'available' },
    tvlMaxDrawdownPct: { value: 30.0, identifier: 'tvl_max_dd', primarySource: dummySource, status: 'available' },
    organicFeeToIncentiveRatio: { value: 10.0, identifier: 'organic_ratio', primarySource: dummySource, status: 'available' },
    volume24hUsd: { value: 50000000, identifier: 'volume_24h', primarySource: dummySource, status: 'available' },
    reputableExchangesCount: { value: 6, identifier: 'exchanges_count', primarySource: dummySource, status: 'available' },
    sectorRankPct: { value: 5.0, identifier: 'sector_rank', primarySource: dummySource, status: 'available' },
    githubCommits90Days: { value: 80, identifier: 'github_commits_90d', primarySource: dummySource, status: 'available' },
    githubActiveContributors: { value: 10, identifier: 'github_contributors', primarySource: dummySource, status: 'available' },
    hasPublicReleaseWithin6Months: { value: true, identifier: 'public_release', primarySource: dummySource, status: 'available' },
    ecosystemApplicationsCount: { value: 40, identifier: 'ecosystem_apps', primarySource: dummySource, status: 'available' },
    hasComprehensiveDocs: { value: true, identifier: 'comprehensive_docs', primarySource: dummySource, status: 'available' },
    roadmapExecutionConfidence: { value: 'pass', identifier: 'roadmap_confidence', primarySource: dummySource, status: 'available' },
    securityAuditWithin24Months: { value: true, identifier: 'audit_recency', primarySource: dummySource, status: 'available' },
    hasCriticalPendingVulnerability: { value: false, identifier: 'critical_vuln', primarySource: dummySource, status: 'available' },
    unresolvedExploitLoss36MonthsUsd: { value: 0, identifier: 'unresolved_exploit', primarySource: dummySource, status: 'available' },
    hasMultiSigOrTimelock: { value: true, identifier: 'multisig_timelock', primarySource: dummySource, status: 'available' },
    validatorConcentrationSufficient: { value: true, identifier: 'validator_concentration', primarySource: dummySource, status: 'available' },
    activeRegulatoryEnforcementAction: { value: false, identifier: 'regulatory_status', primarySource: dummySource, status: 'available' },
    isPublicKnownTeam: { value: true, identifier: 'known_team', primarySource: dummySource, status: 'available' },
    hasInstitutionalBackers: { value: true, identifier: 'institutional_backers', primarySource: dummySource, status: 'available' },
    projectAgeMonths: { value: 48, identifier: 'project_age', primarySource: dummySource, status: 'available' },
    treasuryRunwayMonths: { value: 36, identifier: 'treasury_runway', primarySource: dummySource, status: 'available' },
    activeGovernanceVotes: { value: true, identifier: 'active_governance', primarySource: dummySource, status: 'available' },
  };
}

// ----------------------------------------------------------------------------
// TEST 1: Synthetic data with known score -> exact expected score (sum = 100)
// ----------------------------------------------------------------------------
test('Acceptance Test 1: Synthetic data with all passing criteria yields exact expected score of 100', () => {
  const input = createPerfectScoreInput();
  const report = evaluateAssetFundamentals(input);

  assert.equal(report.finalScore, 100, `Expected 100.0, got ${report.finalScore}`);
  assert.equal(report.coveragePct, 100, `Expected 100% coverage, got ${report.coveragePct}%`);
  assert.equal(report.hasPassed, true, 'Fully compliant asset must pass');
  assert.equal(report.hasAnyExclusion, false, 'No exclusion should be triggered');
  assert.equal(report.classification, 'high_quality');
});

// ----------------------------------------------------------------------------
// TEST 2: Deleting 50% of fields -> Coverage drops, score does not rise, insufficient is not pass
// ----------------------------------------------------------------------------
test('Acceptance Test 2: Deleting 50% of fields drops coverage, score does not rise, insufficient is 0 points', () => {
  const input = createPerfectScoreInput();

  // Delete 50% of fields across categories
  delete input.unlock12MonthsPctOfCirculating;
  delete input.annualInflationPct;
  delete input.top10HoldersConcentrationPct;
  delete input.fdvToRevenueMultiple;
  delete input.tokenEmissionAnnualValueUsd;
  delete input.singleSourceRevenueConcentrationPct;
  delete input.activeUsersGrowth90DaysPct;
  delete input.organicFeeToIncentiveRatio;
  delete input.sectorRankPct;
  delete input.hasPublicReleaseWithin6Months;
  delete input.ecosystemApplicationsCount;
  delete input.hasComprehensiveDocs;
  delete input.unresolvedExploitLoss36MonthsUsd;
  delete input.hasMultiSigOrTimelock;
  delete input.validatorConcentrationSufficient;
  delete input.hasInstitutionalBackers;
  delete input.treasuryRunwayMonths;
  delete input.activeGovernanceVotes;

  const report = evaluateAssetFundamentals(input);

  assert.ok(report.coveragePct < 60, `Coverage must drop below 60%, got ${report.coveragePct}%`);
  assert.ok(report.finalScore < 100, `Score must drop from 100, got ${report.finalScore}`);
  assert.equal(report.classification, 'indeterminate', 'Coverage < 60% must be indeterminate (غير قابل للحكم)');
  assert.equal(report.hasPassed, false, 'Insufficient coverage must strictly prevent passing');
  assert.ok(report.insufficientCount >= 10, 'Insufficient count must increase');
});

// ----------------------------------------------------------------------------
// TEST 3: Score 95 but anonymous team & unverified contracts -> "لم يجتز"
// ----------------------------------------------------------------------------
test('Acceptance Test 3: Project with score ~95 but anonymous team & unaudited contracts fails via exclusion', () => {
  const input = createPerfectScoreInput();
  // Trigger exclusion rule 1: Anon team AND no audit
  input.isPublicKnownTeam = { value: false, identifier: 'known_team', primarySource: dummySource, status: 'available' };
  input.securityAuditWithin24Months = { value: false, identifier: 'audit_recency', primarySource: dummySource, status: 'available' };

  const report = evaluateAssetFundamentals(input);

  assert.equal(report.hasAnyExclusion, true, 'Exclusion rule 1 must trigger');
  assert.equal(report.hasPassed, false, 'Project with active exclusion MUST NOT pass regardless of score');
  assert.ok(
    report.exclusions.some((e) => e.ruleId === 'excl_1_anon_team_no_audit' && e.isTriggered),
    'excl_1_anon_team_no_audit must be triggered'
  );
  assert.equal(report.classification, 'below_threshold', 'Excluded project must not receive high quality status');
});

// ----------------------------------------------------------------------------
// TEST 4: Discrepancy > 10% between two sources displays both numbers and selection rule
// ----------------------------------------------------------------------------
test('Acceptance Test 4: Discrepancy > 10% between sources records both numbers and selection rule', () => {
  const src1 = createSourceMeta('DefiLlama', 'https://defillama.com');
  const src2 = createSourceMeta('CoinGecko', 'https://coingecko.com');

  // DefiLlama = 55M, CoinGecko = 42M (diff = 26.8% > 10%)
  const metric = reconcileNumericMetric(
    'annual_fees',
    55000000,
    src1,
    42000000,
    src2,
    'اعتماد DefiLlama لتتبع الرسوم on-chain بدقة أعلى.'
  );

  assert.equal(metric.hasDiscrepancy, true, 'Discrepancy must be flagged when > 10%');
  assert.equal(metric.value, 55000000, 'Primary value must be retained');
  assert.equal(metric.secondaryValue, 42000000, 'Secondary value must be recorded');
  assert.ok(metric.discrepancyNote?.includes('تعارض بنسبة'), 'Discrepancy note must state percentage');
  assert.ok(metric.discrepancyNote?.includes('قاعدة الاختيار:'), 'Discrepancy note must state selection rule');
});

// ----------------------------------------------------------------------------
// TEST 5: Stale data (> 7 days) tagged "قديمة"
// ----------------------------------------------------------------------------
test('Acceptance Test 5: Data older than 7 days is tagged isStale = true', () => {
  const oldTimestamp = Date.now() - (SEVEN_DAYS_MS + 24 * 3600 * 1000); // 8 days ago
  const staleSource = createSourceMeta('Old Source', 'https://example.com', oldTimestamp);

  assert.equal(staleSource.isStale, true, 'Source older than 7 days must be marked isStale');

  const metric = reconcileNumericMetric('price', 100, staleSource, null);
  assert.equal(metric.status, 'stale', 'Metric status must be stale');
});

// ----------------------------------------------------------------------------
// TEST 6: Non-existent coin returns insufficient / not found without fabrication
// ----------------------------------------------------------------------------
test('Acceptance Test 6: Non-existent coin returns 0 score, insufficient data, and no fabricated data', () => {
  const emptyInput: RawAssetFundamentalInput = {
    symbol: 'NONEXISTENT',
    coinId: 'non-existent-token',
    coinName: 'Non Existent Token',
    sector: 'DeFi / DEXes',
  };

  const report = evaluateAssetFundamentals(emptyInput);

  assert.equal(report.finalScore, 0, 'Empty asset must have 0 score');
  assert.equal(report.coveragePct, 0, 'Empty asset must have 0% coverage');
  assert.equal(report.hasPassed, false);
  assert.equal(report.classification, 'indeterminate');
  assert.equal(report.compliantCount, 0, 'No criteria should pass on empty input');
  assert.equal(report.insufficientCount, report.totalCriteriaCount, 'All criteria must be insufficient');
});

// ----------------------------------------------------------------------------
// TEST 7: Bitcoin on default fee profile -> "خارج نطاق الملف", not a bad score
// ----------------------------------------------------------------------------
test('Acceptance Test 7: Bitcoin on default protocol returns out_of_scope without penalty score', () => {
  const btcInput: RawAssetFundamentalInput = {
    symbol: 'BTC',
    coinId: 'bitcoin',
    coinName: 'Bitcoin',
    sector: 'Store of Value / Payment',
    isStoreOfValueOrMeme: true,
  };

  const report = evaluateAssetFundamentals(btcInput);

  assert.equal(report.isOutOfScope, true, 'Bitcoin must be marked outOfScope');
  assert.equal(report.classification, 'out_of_scope');
  assert.ok(
    report.outOfScopeReasonAr?.includes('خارج نطاق الملف الحالي: مراجعة يدوية فقط'),
    'Must display out-of-scope manual review notice'
  );
  assert.equal(report.hasPassed, false);
  assert.equal(report.hasAnyExclusion, false, 'Must not be penalized with an exclusion');
});

// ----------------------------------------------------------------------------
// TEST 9: Stage A operates on 300 coins within rate limits using batching
// ----------------------------------------------------------------------------
test('Acceptance Test 9: Stage A on 300 coins operates within API limits using batched calls', async () => {
  screenerDataService.resetCallCount();
  const { coins, stats } = await screenerDataService.getUniverseData();

  const stageARes = runStageAFastScreening(coins);

  assert.ok(stats.apiCallCount <= 2, `API call count (${stats.apiCallCount}) must be <= 2 calls for universe`);
  assert.ok(stageARes.durationMs < 500, `Stage A screening took ${stageARes.durationMs}ms (< 500ms)`);
  assert.ok(stageARes.selectedTopCandidates.length <= 30, 'Stage A must select top 20-30 candidates');
});

// ----------------------------------------------------------------------------
// TEST 10: Saved snapshot reproduces identical score on replay
// ----------------------------------------------------------------------------
test('Acceptance Test 10: Saved evaluation snapshot reproduces identical score and breakdown on replay', () => {
  const input = createPerfectScoreInput();
  const report1 = evaluateAssetFundamentals(input);

  const snapshot = snapshotStore.saveSnapshot(report1);
  const reloaded = snapshotStore.getSnapshot(input.symbol);

  assert.ok(reloaded !== null, 'Snapshot must be retrievable');
  assert.equal(reloaded.report.finalScore, report1.finalScore, 'Replayed score must be identical');
  assert.equal(reloaded.report.coveragePct, report1.coveragePct, 'Replayed coverage must be identical');
  assert.equal(reloaded.report.protocolHash, report1.protocolHash, 'Protocol hash must match');
});

// ----------------------------------------------------------------------------
// TEST 11: Shortlist coin with < 3 years history tags Stage D unverified and blocks position sizing
// ----------------------------------------------------------------------------
test('Acceptance Test 11: Candidate with < 3 years history tags Stage D unverified and blocks position sizing', () => {
  const youngContext = buildStageDTechnicalContext({
    symbol: 'NEWDEFI',
    historyYears: 1.8, // < 3 years
    high24h: 12.0,
    low24h: 10.0,
    closePrice: 11.2,
    hasStatisticalGateApproval: true,
  });

  assert.equal(youngContext.isSupportedByStatisticalGate, false, 'History < 3 years must NOT be supported');
  assert.equal(youngContext.allowedPositionSizing, false, 'Position sizing must be strictly forbidden');
  assert.ok(youngContext.disclaimerAr.includes('غير مدعومة بالتحقق الإحصائي'));

  // Test coin with >= 3 years and approved gate
  const seasonedContext = buildStageDTechnicalContext({
    symbol: 'SEASONED',
    historyYears: 4.5,
    high24h: 12.0,
    low24h: 10.0,
    closePrice: 11.2,
    hasStatisticalGateApproval: true,
    gateStatus: 'approved',
  });

  assert.equal(seasonedContext.isSupportedByStatisticalGate, true, 'Seasoned coin with gate approval must be supported');
  assert.equal(seasonedContext.allowedPositionSizing, true, 'Position sizing is permitted for verified assets');
});
