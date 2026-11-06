import {
  EvaluatedCriterion,
  CategoryScore,
  ExclusionRuleResult,
  FundamentalEvaluationReport,
  HiddenRiskItem,
  QualityClassification,
  ProtocolDefinition,
  SourceMeta,
  MetricValue,
} from './types';
import defaultProtocolJson from './profiles/defaultProtocol.json';
import { calculateProfileHash, isAssetInProfileSector } from './profiles/profileManager';

export interface RawAssetFundamentalInput {
  symbol: string;
  coinId: string;
  coinName: string;
  sector: string;
  isStoreOfValueOrMeme?: boolean; // BTC, DOGE, PEPE etc.

  // Quantitative Metrics
  circulatingSupply?: MetricValue<number>;
  maxSupply?: MetricValue<number>;
  circulatingToMaxPct?: MetricValue<number>; // % (0-100)
  unlock12MonthsPctOfCirculating?: MetricValue<number>; // %
  annualInflationPct?: MetricValue<number>; // %
  top10HoldersConcentrationPct?: MetricValue<number>; // % (after excluding exchanges/burn/contracts)
  
  annualProtocolFeesUsd?: MetricValue<number>;
  feeGrowth90DaysPct?: MetricValue<number>; // %
  treasuryRevenueUsd?: MetricValue<number>;
  fdvUsd?: MetricValue<number>;
  marketCapUsd?: MetricValue<number>;
  fdvToRevenueMultiple?: MetricValue<number>;
  tokenEmissionAnnualValueUsd?: MetricValue<number>; // For real yield
  singleSourceRevenueConcentrationPct?: MetricValue<number>; // %
  revenueHistoryMonths?: MetricValue<number>;

  activeUsersGrowth90DaysPct?: MetricValue<number>;
  tvlUsd?: MetricValue<number>;
  tvlGrowth12MonthsPct?: MetricValue<number>;
  tvlMaxDrawdownPct?: MetricValue<number>;
  organicFeeToIncentiveRatio?: MetricValue<number>;
  volume24hUsd?: MetricValue<number>;
  reputableExchangesCount?: MetricValue<number>;
  sectorRankPct?: MetricValue<number>; // e.g. 15 = top 15%

  githubCommits90Days?: MetricValue<number>;
  githubActiveContributors?: MetricValue<number>;
  hasPublicReleaseWithin6Months?: MetricValue<boolean>;
  ecosystemApplicationsCount?: MetricValue<number>;
  hasComprehensiveDocs?: MetricValue<boolean>;
  roadmapExecutionConfidence?: MetricValue<'pass' | 'partial' | 'fail' | 'insufficient'>;

  securityAuditWithin24Months?: MetricValue<boolean>;
  hasCriticalPendingVulnerability?: MetricValue<boolean>;
  unresolvedExploitLoss36MonthsUsd?: MetricValue<number>;
  hasMultiSigOrTimelock?: MetricValue<boolean>;
  validatorConcentrationSufficient?: MetricValue<boolean>;
  activeRegulatoryEnforcementAction?: MetricValue<boolean>;

  isPublicKnownTeam?: MetricValue<boolean>;
  hasInstitutionalBackers?: MetricValue<boolean>;
  projectAgeMonths?: MetricValue<number>;
  treasuryRunwayMonths?: MetricValue<number>;
  activeGovernanceVotes?: MetricValue<boolean>;

  // Qualitative user/analyst notes
  tokenomicsNotes?: string;
  revenueNotes?: string;
  securityNotes?: string;
}

export function evaluateAssetFundamentals(
  input: RawAssetFundamentalInput,
  protocol: ProtocolDefinition = {
    profileId: defaultProtocolJson.profileId,
    profileNameAr: defaultProtocolJson.profileNameAr,
    profileNameEn: defaultProtocolJson.profileNameEn,
    version: defaultProtocolJson.version,
    sha256Hash: calculateProfileHash(defaultProtocolJson),
    targetSector: defaultProtocolJson.targetSector,
    categories: defaultProtocolJson.categories.map((c) => ({ id: c.id as any, titleAr: c.titleAr, weight: c.weight })),
    passScoreThreshold: defaultProtocolJson.passScoreThreshold,
    minCoverageThreshold: defaultProtocolJson.minCoverageThreshold,
    disclaimerAr: defaultProtocolJson.disclaimerAr,
  }
): FundamentalEvaluationReport {
  const now = Date.now();
  const dateFormatted = new Date(now).toISOString().split('T')[0];

  // 1. Sector Scope Check
  // Store of value (BTC), payment coins, memecoins, or non-fee generating assets are OUT OF SCOPE
  const isOutOfScope =
    Boolean(input.isStoreOfValueOrMeme) ||
    input.symbol.toUpperCase() === 'BTC' ||
    input.symbol.toUpperCase() === 'DOGE' ||
    input.symbol.toUpperCase() === 'SHIB' ||
    input.symbol.toUpperCase() === 'PEPE' ||
    !isAssetInProfileSector(input.sector);

  if (isOutOfScope) {
    return {
      symbol: input.symbol,
      coinId: input.coinId,
      coinName: input.coinName,
      sector: input.sector || 'Store of Value / Non-fee Asset',
      isOutOfScope: true,
      outOfScopeReasonAr:
        'خارج نطاق الملف الحالي: مراجعة يدوية فقط (أصول تخزين القيمة، الميم، أو العملات التي لا تعتمد على إيرادات رسوم بروتوكولية لا تخضع لتقييم بروتوكول الرسوم الافتراضي ولا تُمنح درجة منخفضة).',
      evaluationTimestamp: now,
      evaluationDateStr: dateFormatted,
      protocolVersion: protocol.version,
      protocolHash: protocol.sha256Hash,
      finalScore: 0,
      coveragePct: 0,
      hasPassed: false,
      classification: 'out_of_scope',
      classificationLabelAr: 'خارج نطاق الملف الحالي: مراجعة يدوية فقط',
      categoryScores: [],
      exclusions: [],
      hasAnyExclusion: false,
      topStrengths: [],
      topWeaknesses: [],
      hiddenRisks: [],
      compliantCount: 0,
      partialCount: 0,
      nonCompliantCount: 0,
      insufficientCount: 0,
      totalCriteriaCount: 0,
      primaryStrengthAr: 'خارج نطاق التقييم',
      primaryWeaknessAr: 'خارج نطاق التقييم',
      topRiskToMonitorAr: 'مراجعة أطروحة القيمة كأصل تخزين قيمة أو سيولة نقدية بشكل يدوي منفصل.',
      mandatoryDisclaimerAr: protocol.disclaimerAr,
    };
  }

  // 2. Evaluate all 6 Categories Deterministically
  const evaluatedCategories: CategoryScore[] = [];
  const allCriteria: EvaluatedCriterion[] = [];

  // Helper to resolve criterion
  const registerCriterion = (
    catId: 'tokenomics' | 'revenue' | 'users' | 'development' | 'security' | 'team',
    id: string,
    nameAr: string,
    nameEn: string,
    weight: number,
    thresholdStr: string,
    result: 'pass' | 'partial' | 'fail' | 'insufficient',
    actualValueStr: string,
    notesAr: string,
    isQualitative: boolean,
    source?: SourceMeta,
    metric?: MetricValue<any>
  ) => {
    let earnedPoints = 0;
    if (result === 'pass') earnedPoints = weight;
    else if (result === 'partial') earnedPoints = weight / 2.0;
    else earnedPoints = 0; // 'fail' or 'insufficient' = 0

    const crit: EvaluatedCriterion = {
      id,
      category: catId,
      nameAr,
      nameEn,
      weight,
      earnedPoints: Number(earnedPoints.toFixed(3)),
      result,
      isQualitative,
      thresholdStr,
      actualValueStr,
      notesAr,
      source: source || metric?.primarySource,
      metric,
    };
    allCriteria.push(crit);
    return crit;
  };

  // --- CATEGORY 1: TOKENOMICS (20 Points) ---
  const cat1Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: Schedule published
  const tok1Res = input.circulatingSupply?.value && input.maxSupply?.value !== undefined ? 'pass' : 'insufficient';
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_1_schedule',
      'جدول العرض والإصدار منشور وواضح',
      'Emission Schedule Clarity',
      3.333,
      'جدول إصدار شفاف وموثق رسمياً',
      tok1Res,
      tok1Res === 'pass' ? 'موثق ومعلن' : 'بيانات غير كافية',
      tok1Res === 'pass' ? 'المعروض المتداول والأقصى موثق ومطابق للمستكشف.' : 'بيانات جدول الإصدار غير كافية.',
      true,
      input.circulatingSupply?.primarySource
    )
  );

  // Criterion 2: Circulating / Max Supply: >=50% pass, 25-50% partial, <25% fail
  let tok2Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let tok2ValStr = 'بيانات غير كافية';
  let tok2Notes = 'بيانات المعروض الأقصى غير متوفرة لحساب النسبة.';
  if (input.circulatingToMaxPct?.value !== null && input.circulatingToMaxPct?.value !== undefined) {
    const pct = input.circulatingToMaxPct.value;
    tok2ValStr = `${pct.toFixed(1)}%`;
    if (pct >= 50) {
      tok2Res = 'pass';
      tok2Notes = `المعروض المتداول (${pct.toFixed(1)}%) يتجاوز 50% من الأقصى؛ خطر الإغراق منخفض.`;
    } else if (pct >= 25) {
      tok2Res = 'partial';
      tok2Notes = `المعروض المتداول (${pct.toFixed(1)}%) بين 25% و50%؛ ضغط إصدار معتدل.`;
    } else {
      tok2Res = 'fail';
      tok2Notes = `المعروض المتداول (${pct.toFixed(1)}%) أقل من 25%؛ خطر إغراق كمي مرتفع.`;
    }
  }
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_2_circ_to_max',
      'نسبة المتداول إلى الأقصى (Circulating / Max)',
      'Circulating to Max Supply',
      3.333,
      '≥50% نجاح | 25-50% جزئي | <25% فشل',
      tok2Res,
      tok2ValStr,
      tok2Notes,
      false,
      input.circulatingToMaxPct?.primarySource,
      input.circulatingToMaxPct
    )
  );

  // Criterion 3: Unlock 12m / Circulating: <15% pass, 15-30% partial, >30% fail
  let tok3Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let tok3ValStr = 'بيانات غير كافية';
  let tok3Notes = 'جدول الفك للـ 12 شهراً القادمة غير متوفر بدقة.';
  if (input.unlock12MonthsPctOfCirculating?.value !== null && input.unlock12MonthsPctOfCirculating?.value !== undefined) {
    const uPct = input.unlock12MonthsPctOfCirculating.value;
    tok3ValStr = `${uPct.toFixed(1)}%`;
    if (uPct < 15) {
      tok3Res = 'pass';
      tok3Notes = `الفك السنوي (${uPct.toFixed(1)}%) منخفض ودون 15% من المتداول.`;
    } else if (uPct <= 30) {
      tok3Res = 'partial';
      tok3Notes = `الفك السنوي (${uPct.toFixed(1)}%) معتدل (15-30%).`;
    } else {
      tok3Res = 'fail';
      tok3Notes = `الفك السنوي (${uPct.toFixed(1)}%) يتجاوز 30% من المتداول؛ خطر تسييل مستثمرين.`;
    }
  }
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_3_unlock_12m',
      'الفك خلال 12 شهراً ÷ المتداول',
      '12-Month Unlock Ratio',
      3.333,
      '<15% نجاح | 15-30% جزئي | >30% فشل',
      tok3Res,
      tok3ValStr,
      tok3Notes,
      false,
      input.unlock12MonthsPctOfCirculating?.primarySource,
      input.unlock12MonthsPctOfCirculating
    )
  );

  // Criterion 4: Annual Inflation: <5% pass, 5-15% partial, >15% fail
  let tok4Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let tok4ValStr = 'بيانات غير كافية';
  let tok4Notes = 'معدل التضخم السنوي الفعلي غير متوفر.';
  if (input.annualInflationPct?.value !== null && input.annualInflationPct?.value !== undefined) {
    const inf = input.annualInflationPct.value;
    tok4ValStr = `${inf.toFixed(1)}%`;
    if (inf < 5) {
      tok4Res = 'pass';
      tok4Notes = `تضخم سنوي منخفض ومستقر (${inf.toFixed(1)}% < 5%).`;
    } else if (inf <= 15) {
      tok4Res = 'partial';
      tok4Notes = `تضخم سنوي متوسط (${inf.toFixed(1)}%).`;
    } else {
      tok4Res = 'fail';
      tok4Notes = `تضخم سنوي مرتفع (${inf.toFixed(1)}% > 15%)؛ يضعف القوة الشرائية للتوكن.`;
    }
  }
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_4_inflation',
      'معدل التضخم السنوي الفعلي',
      'Annual Inflation Rate',
      3.334,
      '<5% نجاح | 5-15% جزئي | >15% فشل',
      tok4Res,
      tok4ValStr,
      tok4Notes,
      false,
      input.annualInflationPct?.primarySource,
      input.annualInflationPct
    )
  );

  // Criterion 5: Top 10 Holders concentration: <30% pass, 30-50% partial, >50% fail
  let tok5Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let tok5ValStr = 'بيانات غير كافية';
  let tok5Notes = 'بيانات تركّز الحيازة غير متوفرة من المستكشف.';
  if (input.top10HoldersConcentrationPct?.value !== null && input.top10HoldersConcentrationPct?.value !== undefined) {
    const cPct = input.top10HoldersConcentrationPct.value;
    tok5ValStr = `${cPct.toFixed(1)}%`;
    if (cPct < 30) {
      tok5Res = 'pass';
      tok5Notes = `توزيع صحي للملكية (${cPct.toFixed(1)}% < 30%).`;
    } else if (cPct <= 50) {
      tok5Res = 'partial';
      tok5Notes = `تركز متوسط للملكية (${cPct.toFixed(1)}%).`;
    } else {
      tok5Res = 'fail';
      tok5Notes = `تركز حاد للملكية في أكبر 10 عناوين (${cPct.toFixed(1)}% > 50%).`;
    }
  }
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_5_top10_concentration',
      'حيازة أكبر 10 عناوين بعد الاستبعاد',
      'Top 10 Holder Concentration',
      3.333,
      '<30% نجاح | 30-50% جزئي | >50% فشل',
      tok5Res,
      tok5ValStr,
      tok5Notes,
      false,
      input.top10HoldersConcentrationPct?.primarySource,
      input.top10HoldersConcentrationPct
    )
  );

  // Criterion 6: Value Accrual mechanism documented
  let tok6Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let tok6ValStr = 'بيانات غير كافية';
  let tok6Notes = 'لم تُوثق آلية انتقال القيمة لحاملي التوكن أو لا تتوفر بيانات رسوم كافية.';
  if (input.tokenomicsNotes) {
    tok6Res = 'pass';
    tok6ValStr = 'موثقة ومفعلة';
    tok6Notes = input.tokenomicsNotes;
  } else if (input.annualProtocolFeesUsd?.value !== undefined && input.annualProtocolFeesUsd?.value !== null) {
    if (input.annualProtocolFeesUsd.value > 0 && (input.treasuryRevenueUsd?.value || 0) > 0) {
      tok6Res = 'pass';
      tok6ValStr = 'موثقة ومفعلة';
      tok6Notes = 'البروتوكول يحول رسوم التداول إلى الخزينة أو إعادة شراء وتوزيع عوائد.';
    } else {
      tok6Res = 'partial';
      tok6ValStr = 'جزئية / حوكمة فقط';
      tok6Notes = 'القيمة مقتصرة أساساً على حقوق التصويت مع آلية تحفيز غير مباشرة.';
    }
  }
  cat1Criteria.push(
    registerCriterion(
      'tokenomics',
      'tok_6_value_accrual',
      'آلية انتقال القيمة للتوكن موثقة',
      'Value Accrual Mechanism',
      3.334,
      'آلية واضحة لتحويل الرسوم إلى قيمة لحاملي التوكن',
      tok6Res,
      tok6ValStr,
      tok6Notes,
      true
    )
  );

  evaluatedCategories.push({
    category: 'tokenomics',
    titleAr: 'التوكنومكس والفك (20 نقطة)',
    maxPoints: 20,
    earnedPoints: Number(cat1Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat1Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat1Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 20) * 100).toFixed(1)),
    criteria: cat1Criteria,
  });

  // --- CATEGORY 2: REVENUE & PROFITABILITY (25 Points) ---
  const cat2Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: Annual Fees > 0 and 90d growth >= 0
  let rev1Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev1ValStr = 'بيانات غير كافية';
  let rev1Notes = 'بيانات الرسوم من DefiLlama غير متوفرة.';
  if (input.annualProtocolFeesUsd?.value !== null && input.annualProtocolFeesUsd?.value !== undefined) {
    const fees = input.annualProtocolFeesUsd.value;
    const growth = input.feeGrowth90DaysPct?.value ?? 0;
    rev1ValStr = `$${(fees / 1e6).toFixed(2)}M (نمو 90ي: ${growth.toFixed(1)}%)`;
    if (fees > 0 && growth >= 0) {
      rev1Res = 'pass';
      rev1Notes = `رسوم بروتوكول سنوية إيجابية مع نمو فصلي غير سالب (+${growth.toFixed(1)}%).`;
    } else if (fees > 0) {
      rev1Res = 'partial';
      rev1Notes = `الرسوم إيجابية ولكنها تعاني من انكماش فصلي (${growth.toFixed(1)}%).`;
    } else {
      rev1Res = 'fail';
      rev1Notes = 'البروتوكول لا يولد أي رسوم فعلية.';
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_1_annual_fees',
      'رسوم البروتوكول السنوية > 0 ونمو 90 يوماً ≥ 0',
      'Annual Protocol Fees & Growth',
      4.166,
      'رسوم > 0 ونمو 90 يوماً ≥ 0',
      rev1Res,
      rev1ValStr,
      rev1Notes,
      false,
      input.annualProtocolFeesUsd?.primarySource,
      input.annualProtocolFeesUsd
    )
  );

  // Criterion 2: Revenue to Protocol / Treasury > 0
  let rev2Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev2ValStr = 'بيانات غير كافية';
  let rev2Notes = 'بيانات إيرادات الخزينة غير متوفرة.';
  if (input.treasuryRevenueUsd?.value !== null && input.treasuryRevenueUsd?.value !== undefined) {
    const rev = input.treasuryRevenueUsd.value;
    rev2ValStr = `$${(rev / 1e6).toFixed(2)}M`;
    if (rev > 0) {
      rev2Res = 'pass';
      rev2Notes = 'تدفق إيرادات إيجابي للخزينة وحاملي التوكن.';
    } else {
      rev2Res = 'fail';
      rev2Notes = 'لا توجد إيرادات متبقية بعد دفع حوافز السيولة.';
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_2_treasury_revenue',
      'الإيرادات للبروتوكول / الخزينة > 0',
      'Treasury & Protocol Revenue',
      4.166,
      'إيرادات الخزينة > 0',
      rev2Res,
      rev2ValStr,
      rev2Notes,
      false,
      input.treasuryRevenueUsd?.primarySource,
      input.treasuryRevenueUsd
    )
  );

  // Criterion 3: FDV / Revenue Multiple: <=50 pass, 50-150 partial, >150 fail
  let rev3Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev3ValStr = 'بيانات غير كافية';
  let rev3Notes = 'مكرر التقييم غير قابل للحساب لنقص بيانات الإيرادات.';
  if (input.fdvToRevenueMultiple?.value !== null && input.fdvToRevenueMultiple?.value !== undefined) {
    const mult = input.fdvToRevenueMultiple.value;
    rev3ValStr = `${mult.toFixed(1)}x`;
    if (mult <= 50) {
      rev3Res = 'pass';
      rev3Notes = `تقييم جذاب (FDV/Revenue = ${mult.toFixed(1)}x ≤ 50x).`;
    } else if (mult <= 150) {
      rev3Res = 'partial';
      rev3Notes = `تقييم معتدل (FDV/Revenue = ${mult.toFixed(1)}x).`;
    } else {
      rev3Res = 'fail';
      rev3Notes = `تقييم مبالغ فيه مقارنة بالإيرادات الفعلية (${mult.toFixed(1)}x > 150x).`;
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_3_fdv_to_revenue',
      'FDV ÷ الإيرادات السنوية',
      'FDV to Annual Revenue Multiple',
      4.167,
      '≤50 نجاح | 50-150 جزئي | >150 فشل',
      rev3Res,
      rev3ValStr,
      rev3Notes,
      false,
      input.fdvToRevenueMultiple?.primarySource,
      input.fdvToRevenueMultiple
    )
  );

  // Criterion 4: Real Yield: Revenue - Token Emissions >= 0
  let rev4Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev4ValStr = 'بيانات غير كافية';
  let rev4Notes = 'بيانات قيمة الانبعاثات التضخمية غير متوفرة.';
  if (input.treasuryRevenueUsd?.value !== undefined && input.tokenEmissionAnnualValueUsd?.value !== undefined) {
    const rev = input.treasuryRevenueUsd.value || 0;
    const em = input.tokenEmissionAnnualValueUsd.value || 0;
    const realYield = rev - em;
    rev4ValStr = `${realYield >= 0 ? '+' : ''}${(realYield / 1e6).toFixed(2)}M`;
    if (realYield >= 0) {
      rev4Res = 'pass';
      rev4Notes = 'عائد حقيقي موجب: الإيرادات تفوق تكلفة الحوافز التضخمية.';
    } else {
      rev4Res = 'fail';
      rev4Notes = 'عائد حقيقي سالب: البروتوكول يوزع حوافز تفوق ما يجنيه من رسوم.';
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_4_real_yield',
      'العائد الحقيقي (الإيرادات - الانبعاثات)',
      'Real Yield',
      4.167,
      'الإيرادات - الانبعاثات ≥ 0',
      rev4Res,
      rev4ValStr,
      rev4Notes,
      false,
      input.treasuryRevenueUsd?.primarySource
    )
  );

  // Criterion 5: Revenue Concentration: no single source > 60%
  let rev5Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev5ValStr = 'بيانات غير كافية';
  let rev5Notes = 'تفصيل توزيع مصادر الإيراد غير متوفر.';
  if (input.singleSourceRevenueConcentrationPct?.value !== undefined && input.singleSourceRevenueConcentrationPct?.value !== null) {
    const conc = input.singleSourceRevenueConcentrationPct.value;
    rev5ValStr = `${conc.toFixed(1)}%`;
    if (conc <= 60) {
      rev5Res = 'pass';
      rev5Notes = `مصادر إيرادات متنوعة (أكبر مصدر يمثل ${conc.toFixed(1)}% ≤ 60%).`;
    } else {
      rev5Res = 'fail';
      rev5Notes = `تركز إيرادات مرتفع في مصدر وحيد (${conc.toFixed(1)}% > 60%).`;
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_5_revenue_diversity',
      'تنويع مصادر الإيراد: لا مصدر واحد > 60%',
      'Revenue Concentration',
      4.167,
      'لا مصدر وحيد > 60%',
      rev5Res,
      rev5ValStr,
      rev5Notes,
      false,
      input.singleSourceRevenueConcentrationPct?.primarySource
    )
  );

  // Criterion 6: Revenue Sustainability: history >= 12m
  let rev6Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let rev6ValStr = 'بيانات غير كافية';
  let rev6Notes = 'تاريخ تدفق الرسوم غير موثق بالكامل.';
  if (input.revenueHistoryMonths?.value !== undefined && input.revenueHistoryMonths?.value !== null) {
    const m = input.revenueHistoryMonths.value;
    rev6ValStr = `${m} شهراً`;
    if (m >= 12) {
      rev6Res = 'pass';
      rev6Notes = `استدامة ممتازة: سجل إيرادات يمتد لأكثر من 12 شهراً (${m} شهراً).`;
    } else if (m >= 6) {
      rev6Res = 'partial';
      rev6Notes = `سجل إيرادات متوسط (${m} شهراً).`;
    } else {
      rev6Res = 'fail';
      rev6Notes = `سجل إيرادات حديث وقصير (${m} شهراً < 6 أشهر).`;
    }
  }
  cat2Criteria.push(
    registerCriterion(
      'revenue',
      'rev_6_revenue_sustainability',
      'استمرار الإيراد ≥ 12 شهراً دون اعتماد على حوافز',
      'Revenue Sustainability',
      4.167,
      'تاريخ تدفق رسوم ≥ 12 شهراً',
      rev6Res,
      rev6ValStr,
      rev6Notes,
      false,
      input.revenueHistoryMonths?.primarySource
    )
  );

  evaluatedCategories.push({
    category: 'revenue',
    titleAr: 'الإيرادات والربحية (25 نقطة)',
    maxPoints: 25,
    earnedPoints: Number(cat2Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat2Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat2Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 25) * 100).toFixed(1)),
    criteria: cat2Criteria,
  });

  // --- CATEGORY 3: USERS, ADOPTION & LIQUIDITY (15 Points) ---
  const cat3Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: Active Users 30d Trend in 90d >= 0
  let usr1Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let usr1ValStr = 'بيانات غير كافية';
  let usr1Notes = 'بيانات المحافظ النشطة غير متوفرة.';
  if (input.activeUsersGrowth90DaysPct?.value !== undefined && input.activeUsersGrowth90DaysPct?.value !== null) {
    const g = input.activeUsersGrowth90DaysPct.value;
    usr1ValStr = `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
    usr1Res = g >= 0 ? 'pass' : 'fail';
    usr1Notes = g >= 0 ? 'نمو إيجابي في قاعدة المستخدمين النشطين.' : 'انخفاض في عدد المستخدمين النشطين خلال 90 يوماً.';
  }
  cat3Criteria.push(
    registerCriterion(
      'users',
      'usr_1_active_users_trend',
      'اتجاه المستخدمين النشطين 30 يوماً خلال 90 يوماً ≥ 0',
      'Active Users 90d Trend',
      3.0,
      'نمو مستخدمين ≥ 0%',
      usr1Res,
      usr1ValStr,
      usr1Notes,
      false,
      input.activeUsersGrowth90DaysPct?.primarySource
    )
  );

  // Criterion 2: TVL Growth >= 0 and Max DD < 60%
  let usr2Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let usr2ValStr = 'بيانات غير كافية';
  let usr2Notes = 'بيانات TVL التاريخية غير متوفرة.';
  if (input.tvlGrowth12MonthsPct?.value !== undefined && input.tvlMaxDrawdownPct?.value !== undefined) {
    const tg = input.tvlGrowth12MonthsPct.value ?? 0;
    const dd = input.tvlMaxDrawdownPct.value ?? 0;
    usr2ValStr = `نمو: ${tg >= 0 ? '+' : ''}${tg.toFixed(1)}% | هبوط: -${dd.toFixed(1)}%`;
    if (tg >= 0 && dd < 60) {
      usr2Res = 'pass';
      usr2Notes = 'صمود ممتاز في القيمة المقفلة دون انهيار سيولة.';
    } else if (dd < 60) {
      usr2Res = 'partial';
      usr2Notes = 'الهبوط الأقصى للقيمة المقفلة مقبول لكن النمو السنوي سلبي.';
    } else {
      usr2Res = 'fail';
      usr2Notes = `هبوط حاد في القيمة المقفلة (${dd.toFixed(1)}% ≥ 60%).`;
    }
  }
  cat3Criteria.push(
    registerCriterion(
      'users',
      'usr_2_tvl_growth_drawdown',
      'نمو TVL خلال 12 شهراً وتراجع TVL الأقصى < 60%',
      'TVL Growth & Max Drawdown',
      3.0,
      'نمو ≥ 0% وهبوط أقصى < 60%',
      usr2Res,
      usr2ValStr,
      usr2Notes,
      false,
      input.tvlGrowth12MonthsPct?.primarySource
    )
  );

  // Criterion 3: Organic usage (Fee / Incentives)
  let usr3Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let usr3ValStr = 'بيانات غير كافية';
  let usr3Notes = 'نسبة الرسوم إلى الحوافز غير متوفرة.';
  if (input.organicFeeToIncentiveRatio?.value !== undefined && input.organicFeeToIncentiveRatio?.value !== null) {
    const rat = input.organicFeeToIncentiveRatio.value;
    usr3ValStr = `${rat.toFixed(2)}x`;
    if (rat >= 1.0) {
      usr3Res = 'pass';
      usr3Notes = 'استخدام عضوي قوي: الرسوم المدفوعة تتجاوز مكافآت الحوافز.';
    } else if (rat >= 0.5) {
      usr3Res = 'partial';
      usr3Notes = 'استخدام شبه عضوي مع اعتماد معتدل على الحوافز.';
    } else {
      usr3Res = 'fail';
      usr3Notes = 'اعتماد مفرط على مكافآت الحوافز المصطنعة.';
    }
  }
  cat3Criteria.push(
    registerCriterion(
      'users',
      'usr_3_organic_usage',
      'الاستخدام العضوي (الرسوم ÷ الحوافز)',
      'Organic Usage Ratio',
      3.0,
      'نسبة رسوم/حوافز ≥ 1.0',
      usr3Res,
      usr3ValStr,
      usr3Notes,
      false,
      input.organicFeeToIncentiveRatio?.primarySource
    )
  );

  // Criterion 4: Liquidity: 24h Volume >= 5M$ and >= 3 top exchanges
  let usr4Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let usr4ValStr = 'بيانات غير كافية';
  let usr4Notes = 'بيانات السيولة والإدراج غير متوفرة.';
  if (input.volume24hUsd?.value !== undefined && input.volume24hUsd?.value !== null) {
    const vol = input.volume24hUsd.value;
    const exc = input.reputableExchangesCount?.value ?? 3;
    usr4ValStr = `$${(vol / 1e6).toFixed(1)}M (${exc} منصات)`;
    if (vol >= 5e6 && exc >= 3) {
      usr4Res = 'pass';
      usr4Notes = 'سيولة ممتازة وإدراج في بورصات رئيسية.';
    } else if (vol >= 1e6) {
      usr4Res = 'partial';
      usr4Notes = 'سيولة كافية للتداول العادي ولكنها حساسة لأوامر الحيتان.';
    } else {
      usr4Res = 'fail';
      usr4Notes = 'سيولة ضعيفة (< 1M$) تعرض لانزلاق سعري حاد.';
    }
  }
  cat3Criteria.push(
    registerCriterion(
      'users',
      'usr_4_liquidity_depth',
      'السيولة: حجم 24 ساعة ≥ الحد ومدرجة في 3 منصات كبرى',
      'Liquidity & Exchange Depth',
      3.0,
      'حجم 24س ≥ 5M$ و≥ 3 منصات',
      usr4Res,
      usr4ValStr,
      usr4Notes,
      false,
      input.volume24hUsd?.primarySource
    )
  );

  // Criterion 5: Sector Rank: top 30%
  let usr5Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let usr5ValStr = 'بيانات غير كافية';
  let usr5Notes = 'الترتيب القطاعي غير محدد.';
  if (input.sectorRankPct?.value !== undefined && input.sectorRankPct?.value !== null) {
    const rk = input.sectorRankPct.value;
    usr5ValStr = `أعلى ${rk.toFixed(0)}%`;
    if (rk <= 30) {
      usr5Res = 'pass';
      usr5Notes = `ضمن نخبة مشاريع القطاع (أعلى ${rk.toFixed(0)}%).`;
    } else if (rk <= 50) {
      usr5Res = 'partial';
      usr5Notes = `ضمن النصف الأعلى للقطاع (${rk.toFixed(0)}%).`;
    } else {
      usr5Res = 'fail';
      usr5Notes = `ترتيب قطاعي متأخر (${rk.toFixed(0)}%).`;
    }
  }
  cat3Criteria.push(
    registerCriterion(
      'users',
      'usr_5_sector_rank',
      'ترتيب المشروع ضمن قطاعه بالرسوم أو TVL',
      'Sector Rank',
      3.0,
      'أعلى 30% من القطاع',
      usr5Res,
      usr5ValStr,
      usr5Notes,
      false,
      input.sectorRankPct?.primarySource
    )
  );

  evaluatedCategories.push({
    category: 'users',
    titleAr: 'المستخدمون والتبني (15 نقطة)',
    maxPoints: 15,
    earnedPoints: Number(cat3Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat3Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat3Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 15) * 100).toFixed(1)),
    criteria: cat3Criteria,
  });

  // --- CATEGORY 4: DEVELOPMENT & ECOSYSTEM (15 Points) ---
  const cat4Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: GitHub commits >= 30 and contributors >= 5
  let dev1Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let dev1ValStr = 'بيانات غير كافية';
  let dev1Notes = 'بيانات GitHub API غير متوفرة.';
  if (input.githubCommits90Days?.value !== undefined && input.githubActiveContributors?.value !== undefined) {
    const c = input.githubCommits90Days.value ?? 0;
    const a = input.githubActiveContributors.value ?? 0;
    dev1ValStr = `${c} commits | ${a} مساهمين`;
    if (c >= 30 && a >= 5) {
      dev1Res = 'pass';
      dev1Notes = 'نشاط تطويري حيوي بمشاركة فريق عمل متكامل.';
    } else if (c >= 10 && a >= 2) {
      dev1Res = 'partial';
      dev1Notes = 'نشاط تطويري متوسط.';
    } else {
      dev1Res = 'fail';
      dev1Notes = 'نشاط تطويري ضعيف أو شبه متوقف في آخر 90 يوماً.';
    }
  }
  cat4Criteria.push(
    registerCriterion(
      'development',
      'dev_1_commits_contributors',
      'التزامات GitHub آخر 90 يوماً ≥ 30 و≥ 5 مساهمين',
      'GitHub Activity 90d',
      3.0,
      '≥30 commits و≥5 مساهمين',
      dev1Res,
      dev1ValStr,
      dev1Notes,
      false,
      input.githubCommits90Days?.primarySource
    )
  );

  // Criterion 2: Public repos and release in 6 months
  const dev2Val = input.hasPublicReleaseWithin6Months?.value;
  const dev2Res = dev2Val === true ? 'pass' : dev2Val === false ? 'fail' : 'insufficient';
  cat4Criteria.push(
    registerCriterion(
      'development',
      'dev_2_public_releases',
      'مستودعات عامة وإصدار رسمي خلال 6 أشهر',
      'Public Repos & Releases',
      3.0,
      'إصدار رسمي في آخر 6 أشهر',
      dev2Res,
      dev2Res === 'pass' ? 'مستودعات نشطة وإصدار حديث' : dev2Res === 'fail' ? 'لا يوجد إصدار حديث' : 'بيانات غير كافية',
      dev2Res === 'pass' ? 'إصدارات برمجية منتظمة ومفتوحة المصدر.' : 'لا توجد إصدارات رسمية حديثة.',
      false,
      input.hasPublicReleaseWithin6Months?.primarySource
    )
  );

  // Criterion 3: Ecosystem apps count (for chains/protocols)
  let dev3Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let dev3ValStr = 'بيانات غير كافية';
  let dev3Notes = 'عدد التطبيقات المبنية غير موثق.';
  if (input.ecosystemApplicationsCount?.value !== undefined && input.ecosystemApplicationsCount?.value !== null) {
    const apps = input.ecosystemApplicationsCount.value;
    dev3ValStr = `${apps} تطبيق`;
    if (apps >= 20) {
      dev3Res = 'pass';
      dev3Notes = 'نظام بيئي واسع وقوي يضم عشرات التطبيقات.';
    } else if (apps >= 5) {
      dev3Res = 'partial';
      dev3Notes = 'نظام بيئي متنامٍ.';
    } else {
      dev3Res = 'fail';
      dev3Notes = 'نظام بيئي محدود أو قيد النشأة.';
    }
  }
  cat4Criteria.push(
    registerCriterion(
      'development',
      'dev_3_built_applications',
      'عدد التطبيقات المبنية على البروتوكول',
      'Ecosystem Applications',
      3.0,
      'تطبيقات طرف ثالث ≥ 20',
      dev3Res,
      dev3ValStr,
      dev3Notes,
      false,
      input.ecosystemApplicationsCount?.primarySource
    )
  );

  // Criterion 4: Public Docs & Validators
  const dev4Val = input.hasComprehensiveDocs?.value;
  const dev4Res = dev4Val === true ? 'pass' : dev4Val === false ? 'partial' : 'insufficient';
  cat4Criteria.push(
    registerCriterion(
      'development',
      'dev_4_docs_validators',
      'توثيق فني عام ومدققون معلنون',
      'Public Documentation',
      3.0,
      'توثيق تقني ومواصفات واضحة',
      dev4Res,
      dev4Res === 'pass' ? 'شامل ومحدث' : dev4Res === 'partial' ? 'أساسي فقط' : 'بيانات غير كافية',
      dev4Res === 'pass' ? 'توثيق فني احترافي ومواصفات دقيقة للعقد.' : 'توثيق سطحي أو ناقص.',
      true
    )
  );

  // Criterion 5: Roadmap Execution (Qualitative, manual)
  const dev5Val = input.roadmapExecutionConfidence?.value;
  const dev5Res: 'pass' | 'partial' | 'fail' | 'insufficient' = dev5Val || 'insufficient';
  cat4Criteria.push(
    registerCriterion(
      'development',
      'dev_5_roadmap_execution',
      'تنفيذ خارطة الطريق والالتزام بالمواعيد',
      'Roadmap Execution',
      3.0,
      'إنجاز المعالم الرئيسية في أوقاتها',
      dev5Res,
      dev5Res === 'pass'
        ? 'ملتزم بنسبة عالية'
        : dev5Res === 'partial'
        ? 'تأخيرات معتدلة'
        : dev5Res === 'fail'
        ? 'تأخيرات حرجة'
        : 'بيانات غير كافية',
      dev5Res === 'insufficient'
        ? 'لا تتوفر مراجعة نوعية لخارطة الطريق بعد.'
        : 'مراجعة نوعية للمحطات الرئيسية في خارطة الطريق ومواعيد إطلاقها.',
      true
    )
  );

  evaluatedCategories.push({
    category: 'development',
    titleAr: 'التطوير والنظام البيئي (15 نقطة)',
    maxPoints: 15,
    earnedPoints: Number(cat4Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat4Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat4Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 15) * 100).toFixed(1)),
    criteria: cat4Criteria,
  });

  // --- CATEGORY 5: SECURITY, DECENTRALIZATION & REGULATORY (15 Points) ---
  const cat5Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: Audit in 24 months without critical pending
  const audVal = input.securityAuditWithin24Months?.value;
  const critVuln = input.hasCriticalPendingVulnerability?.value;
  let sec1Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let sec1ValStr = 'بيانات غير كافية';
  let sec1Notes = 'تقرير التدقيق الأمني غير متوفر.';
  if (audVal !== undefined && critVuln !== undefined) {
    if (audVal === true && critVuln === false) {
      sec1Res = 'pass';
      sec1ValStr = 'مدقق أمنياً دون ثغرات';
      sec1Notes = 'تقرير تدقيق معتمد خلال 24 شهراً وخلو العقود من ثغرات حرجة معلقة.';
    } else if (audVal === true) {
      sec1Res = 'fail';
      sec1ValStr = 'ثغرات حرجة معلقة';
      sec1Notes = 'وجود ثغرات أمنية حرجة غير معالجة في تقرير التدقيق الأخير.';
    } else {
      sec1Res = 'fail';
      sec1ValStr = 'غير مدقق أمنياً';
      sec1Notes = 'لا يوجد تقرير تدقيق أمني في آخر سنتين.';
    }
  }
  cat5Criteria.push(
    registerCriterion(
      'security',
      'sec_1_audit_recency',
      'تدقيق عقود من جهة موثوقة خلال 24 شهراً',
      'Security Audit Recency',
      3.0,
      'تدقيق حديث دون ثغرات معلقة',
      sec1Res,
      sec1ValStr,
      sec1Notes,
      true,
      input.securityAuditWithin24Months?.primarySource
    )
  );

  // Criterion 2: DefiLlama Hacks: no unresolved exploit in 36 months
  let sec2Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let sec2ValStr = 'بيانات غير كافية';
  let sec2Notes = 'بيانات سجل الاختراقات غير متوفرة.';
  if (input.unresolvedExploitLoss36MonthsUsd?.value !== undefined && input.unresolvedExploitLoss36MonthsUsd?.value !== null) {
    const loss = input.unresolvedExploitLoss36MonthsUsd.value;
    sec2ValStr = loss === 0 ? 'خالٍ من الاختراقات' : `خسارة: $${(loss / 1e6).toFixed(1)}M`;
    if (loss === 0) {
      sec2Res = 'pass';
      sec2Notes = 'سجل نظيف في DefiLlama Hacks دون أي خسارة غير معالجة في 36 شهراً.';
    } else {
      sec2Res = 'fail';
      sec2Notes = `سجل اختراق أمني غير معالج بقيمة $${(loss / 1e6).toFixed(1)}M.`;
    }
  }
  cat5Criteria.push(
    registerCriterion(
      'security',
      'sec_2_no_unresolved_exploit',
      'سجل الاختراقات (DefiLlama Hacks) في 36 شهراً',
      'Exploit History',
      3.0,
      'خلو من الاختراقات غير المعوضة',
      sec2Res,
      sec2ValStr,
      sec2Notes,
      false,
      input.unresolvedExploitLoss36MonthsUsd?.primarySource
    )
  );

  // Criterion 3: Admin Keys / Timelock / MultiSig
  const sec3Val = input.hasMultiSigOrTimelock?.value;
  const sec3Res = sec3Val === true ? 'pass' : sec3Val === false ? 'fail' : 'insufficient';
  cat5Criteria.push(
    registerCriterion(
      'security',
      'sec_3_admin_keys_timelock',
      'صلاحيات الإدارة: قفل زمني / متعدد توقيع Multi-Sig',
      'Admin Keys & Timelock',
      3.0,
      'Multi-Sig مع Timelock',
      sec3Res,
      sec3Res === 'pass' ? 'قفل زمني + متعدد التوقيع' : sec3Res === 'fail' ? 'مفتاح أحادي خطر' : 'بيانات غير كافية',
      sec3Res === 'pass' ? 'حماية من التعديل الفوري المفاجئ عبر قفل زمني ومحفظة مشتركة.' : 'صلاحيات الإدارة مركزية.',
      true
    )
  );

  // Criterion 4: Validator concentration
  const sec4Val = input.validatorConcentrationSufficient?.value;
  const sec4Res = sec4Val === true ? 'pass' : sec4Val === false ? 'partial' : 'insufficient';
  cat5Criteria.push(
    registerCriterion(
      'security',
      'sec_4_validator_concentration',
      'لامركزية المدققين والمشغلين',
      'Validator Concentration',
      3.0,
      'توزيع جغرافي وبرمجي صحي',
      sec4Res,
      sec4Res === 'pass' ? 'لامركزي وموزع' : sec4Res === 'partial' ? 'تركز متوسط' : 'بيانات غير كافية',
      sec4Res === 'pass' ? 'معامل ناكاموتو كافٍ وتنوع بين مشغلي العقد.' : 'تركز ملحوظ في السيطرة على العقد.',
      false
    )
  );

  // Criterion 5: Regulatory status
  const sec5Val = input.activeRegulatoryEnforcementAction?.value;
  const sec5Res = sec5Val === false ? 'pass' : sec5Val === true ? 'fail' : 'insufficient';
  cat5Criteria.push(
    registerCriterion(
      'security',
      'sec_5_regulatory_status',
      'السلامة التنظيمية: لا إجراء تنظيمي أو قضائي نشط',
      'Regulatory Standing',
      3.0,
      'لا إجراء قانوني نشط',
      sec5Res,
      sec5Res === 'pass' ? 'سليم تنظيمياً' : sec5Res === 'fail' ? 'دعوى / إجراء نشط' : 'بيانات غير كافية',
      sec5Res === 'pass' ? 'خلو السجلات الرسمية من قضايا تنظيمية معلقة.' : 'يواجه تدقيقاً أو إجراءات قانونية نشطة.',
      true
    )
  );

  evaluatedCategories.push({
    category: 'security',
    titleAr: 'الأمان والتنظيم (15 نقطة)',
    maxPoints: 15,
    earnedPoints: Number(cat5Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat5Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat5Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 15) * 100).toFixed(1)),
    criteria: cat5Criteria,
  });

  // --- CATEGORY 6: TEAM, INVESTORS & MATURITY (10 Points) ---
  const cat6Criteria: EvaluatedCriterion[] = [];
  // Criterion 1: Public known founders
  const t1Val = input.isPublicKnownTeam?.value;
  const t1Res = t1Val === true ? 'pass' : t1Val === false ? 'fail' : 'insufficient';
  cat6Criteria.push(
    registerCriterion(
      'team',
      'team_1_public_founders',
      'فريق أساسي معروف بسجل مهني قابل للتحقق',
      'Known Core Team',
      2.0,
      'مؤسسون بهوية معلنة وخبرة سابقة',
      t1Res,
      t1Res === 'pass' ? 'معروف ومعلن' : t1Res === 'fail' ? 'مجهول الهوية (Anon)' : 'بيانات غير كافية',
      t1Res === 'pass' ? 'هوية الفريق موثقة وتدعم المسؤولية القانونية والمهنية.' : 'فريق مجهول الهوية.',
      true
    )
  );

  // Criterion 2: Institutional backers
  const t2Val = input.hasInstitutionalBackers?.value;
  const t2Res = t2Val === true ? 'pass' : t2Val === false ? 'partial' : 'insufficient';
  cat6Criteria.push(
    registerCriterion(
      'team',
      'team_2_institutional_backers',
      'مستثمرون معلنون وجولات تمويل موثقة',
      'Institutional Backers',
      2.0,
      'صناديق رائدة وجولات معلنة',
      t2Res,
      t2Res === 'pass' ? 'صناديق معتبرة' : t2Res === 'partial' ? 'تمويل أولي / ذاتي' : 'بيانات غير كافية',
      t2Res === 'pass' ? 'دعم من صناديق استثمارية رائدة في القطاع.' : 'جولات تمويل غير معلنة.',
      true
    )
  );

  // Criterion 3: Project age >= 24m and survived bear market
  let t3Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let t3ValStr = 'بيانات غير كافية';
  let t3Notes = 'تاريخ إطلاق المشروع غير محدد.';
  if (input.projectAgeMonths?.value !== undefined && input.projectAgeMonths?.value !== null) {
    const age = input.projectAgeMonths.value;
    t3ValStr = `${age} شهراً`;
    if (age >= 24) {
      t3Res = 'pass';
      t3Notes = `عمر المشروع (${age} شهراً ≥ 24) واجتياز دورة هبوط كاملة بنجاح.`;
    } else if (age >= 12) {
      t3Res = 'partial';
      t3Notes = `المشروع يعمل منذ ${age} شهراً (بين سنة وسنتين).`;
    } else {
      t3Res = 'fail';
      t3Notes = `مشروع حديث جداً (${age} شهراً < 12 شهراً).`;
    }
  }
  cat6Criteria.push(
    registerCriterion(
      'team',
      'team_3_project_maturity',
      'عمر المشروع ≥ 24 شهراً واجتياز دورة هبوط',
      'Project Maturity',
      2.0,
      'العمر ≥ 24 شهراً',
      t3Res,
      t3ValStr,
      t3Notes,
      false,
      input.projectAgeMonths?.primarySource
    )
  );

  // Criterion 4: Treasury runway
  let t4Res: 'pass' | 'partial' | 'fail' | 'insufficient' = 'insufficient';
  let t4ValStr = 'بيانات غير كافية';
  let t4Notes = 'مدة تشغيل الخزينة غير معلنة.';
  if (input.treasuryRunwayMonths?.value !== undefined && input.treasuryRunwayMonths?.value !== null) {
    const rw = input.treasuryRunwayMonths.value;
    t4ValStr = `${rw} شهراً`;
    if (rw >= 24) {
      t4Res = 'pass';
      t4Notes = `سيولة في الخزينة تكفي لـ ${rw} شهراً من التطوير.`;
    } else if (rw >= 12) {
      t4Res = 'partial';
      t4Notes = `مدة تشغيل معتدلة (${rw} شهراً).`;
    } else {
      t4Res = 'fail';
      t4Notes = `خزينة ضعيفة تكفي لأقل من سنة (${rw} شهراً).`;
    }
  }
  cat6Criteria.push(
    registerCriterion(
      'team',
      'team_4_treasury_runway',
      'خزينة المشروع ومدة التشغيل المالية',
      'Treasury Runway',
      2.0,
      'مدة تشغيل ≥ 24 شهراً',
      t4Res,
      t4ValStr,
      t4Notes,
      true,
      input.treasuryRunwayMonths?.primarySource
    )
  );

  // Criterion 5: Active governance
  const t5Val = input.activeGovernanceVotes?.value;
  const t5Res = t5Val === true ? 'pass' : t5Val === false ? 'partial' : 'insufficient';
  cat6Criteria.push(
    registerCriterion(
      'team',
      'team_5_active_governance',
      'حوكمة مجتمعية نشطة وتصويت منتظم',
      'Active Governance',
      2.0,
      'مقترحات ومشاركة تصويت دورية',
      t5Res,
      t5Res === 'pass' ? 'نشطة ومستمرة' : t5Res === 'partial' ? 'مشاركة ضعيفة' : 'بيانات غير كافية',
      t5Res === 'pass' ? 'مشاركة فعالة للمجتمع في مقترحات التحسين والتصويت.' : 'حوكمة خاملة أو أحادية.',
      true
    )
  );

  evaluatedCategories.push({
    category: 'team',
    titleAr: 'الفريق والنضج والحوكمة (10 نقاط)',
    maxPoints: 10,
    earnedPoints: Number(cat6Criteria.reduce((s, c) => s + c.earnedPoints, 0).toFixed(2)),
    availableWeight: Number(cat6Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0).toFixed(2)),
    coveragePct: Number(((cat6Criteria.filter((c) => c.result !== 'insufficient').reduce((s, c) => s + c.weight, 0) / 10) * 100).toFixed(1)),
    criteria: cat6Criteria,
  });

  // 3. Evaluate Exclusion Rules (قواعد الاستبعاد)
  const exclusions: ExclusionRuleResult[] = [];

  // Excl 1: Anonymous team AND unverified/unaudited contracts
  const isAnon = input.isPublicKnownTeam?.value === false;
  const isNoAudit = input.securityAuditWithin24Months?.value === false;
  const excl1Triggered = isAnon && isNoAudit;
  exclusions.push({
    ruleId: 'excl_1_anon_team_no_audit',
    nameAr: 'فريق مجهول الهوية مع عقود غير مدققة',
    descriptionAr: 'اجتماع انعدام هوية الفريق مع غياب التدقيق الأمني المعتمد يمثل خطراً حرجاً فورياً.',
    isTriggered: excl1Triggered,
    valueStr: excl1Triggered ? 'فريق مجهول + بلا تدقيق أمني' : 'مستوفي الأمان',
    reasonAr: excl1Triggered ? 'المشروع يدار بواسطة فريق مجهول الهوية دون أي تدقيق أمني للعقود الذكية.' : undefined,
  });

  // Excl 2: Top 10 concentration > 60%
  const concVal = input.top10HoldersConcentrationPct?.value ?? 0;
  const excl2Triggered = concVal > 60;
  exclusions.push({
    ruleId: 'excl_2_whale_concentration_60',
    nameAr: 'تركز حيازة أكبر 10 عناوين يتجاوز 60%',
    descriptionAr: 'تركز حاد في المعروض يعرض السوق لخطر تسييل مفاجئ أو تلاعب.',
    isTriggered: excl2Triggered,
    valueStr: `${concVal.toFixed(1)}%`,
    reasonAr: excl2Triggered ? `أكبر 10 عناوين تستحوذ على ${concVal.toFixed(1)}% (> 60%) من المعروض المتداول.` : undefined,
  });

  // Excl 3: 12m unlock > 50% circulating
  const unlockVal = input.unlock12MonthsPctOfCirculating?.value ?? 0;
  const excl3Triggered = unlockVal > 50;
  exclusions.push({
    ruleId: 'excl_3_unlock_exceeds_50_pct',
    nameAr: 'الفك خلال 12 شهراً يتجاوز 50% من المتداول',
    descriptionAr: 'تضخم وإغراق كمي هائل يتجاوز قدرة السوق على الاستيعاب.',
    isTriggered: excl3Triggered,
    valueStr: `${unlockVal.toFixed(1)}%`,
    reasonAr: excl3Triggered ? `جدول الفك السنوي (${unlockVal.toFixed(1)}%) يتجاوز نصف المعروض المتداول الحالي.` : undefined,
  });

  // Excl 4: Active regulatory action
  const regVal = input.activeRegulatoryEnforcementAction?.value === true;
  exclusions.push({
    ruleId: 'excl_4_active_regulatory_action',
    nameAr: 'إجراء قضائي أو تنظيمي نشط',
    descriptionAr: 'ملاحقة قانونية أو قرارات حظر رسمية تهدد تشغيل البروتوكول.',
    isTriggered: regVal,
    valueStr: regVal ? 'إجراء تنظيمي نشط' : 'سليم',
    reasonAr: regVal ? 'وجود دعوى أو إجراء تنفيذي نشط من جهة تنظيمية رسمية ضد المشروع.' : undefined,
  });

  // Excl 5: Major unresolved exploit in 24m
  const exploitLoss = input.unresolvedExploitLoss36MonthsUsd?.value ?? 0;
  const excl5Triggered = exploitLoss > 1e6; // > 1M$ unresolved
  exclusions.push({
    ruleId: 'excl_5_major_unresolved_exploit',
    nameAr: 'اختراق أمني كبير غير معالج خلال 24 شهراً',
    descriptionAr: 'اختراق أدى لخسائر جسيمة دون تعويض أو ترقيع أمني جذري.',
    isTriggered: excl5Triggered,
    valueStr: excl5Triggered ? `$${(exploitLoss / 1e6).toFixed(1)}M غير معوضة` : 'خالٍ من الاختراقات',
    reasonAr: excl5Triggered ? `تعرض البروتوكول لاختراق أمني غير معالج بقيمة $${(exploitLoss / 1e6).toFixed(1)}M.` : undefined,
  });

  // Excl 6: Project age < 12m
  const ageVal = input.projectAgeMonths?.value ?? 24;
  const excl6Triggered = ageVal < 12;
  exclusions.push({
    ruleId: 'excl_6_project_age_under_12m',
    nameAr: 'عمر المشروع أقل من 12 شهراً',
    descriptionAr: 'حداثة مفرطة تجعل البيانات الإحصائية غير قابلة للتقييم الاستثماري الموثوق.',
    isTriggered: excl6Triggered,
    valueStr: `${ageVal} شهراً`,
    reasonAr: excl6Triggered ? `المشروع يعمل منذ ${ageVal} شهراً فقط (< 12 شهراً).` : undefined,
  });

  // Excl 7: Liquidity < 1M$
  const volVal = input.volume24hUsd?.value ?? 5e6;
  const excl7Triggered = volVal < 1e6;
  exclusions.push({
    ruleId: 'excl_7_liquidity_below_threshold',
    nameAr: 'حجم تداول 24 ساعة يقل عن 1M$',
    descriptionAr: 'انخفاض حاد في السيولة يمنع الدخول والخروج دون انزلاق سعري جسيم.',
    isTriggered: excl7Triggered,
    valueStr: `$${(volVal / 1e6).toFixed(2)}M`,
    reasonAr: excl7Triggered ? `حجم التداول اليومي ($${(volVal / 1e6).toFixed(2)}M) يقل عن الحد الأدنى للسيولة (1M$).` : undefined,
  });

  const hasAnyExclusion = exclusions.some((e) => e.isTriggered);

  // 4. Calculate Final Score & Coverage
  const totalEarnedPoints = evaluatedCategories.reduce((s, c) => s + c.earnedPoints, 0);
  const totalAvailableWeight = evaluatedCategories.reduce((s, c) => s + c.availableWeight, 0);

  const finalScore = Number(totalEarnedPoints.toFixed(1));
  const coveragePct = Number(totalAvailableWeight.toFixed(1));

  // Passing criteria: No exclusion AND Score >= 70 AND Coverage >= 60%
  const hasPassed = !hasAnyExclusion && finalScore >= protocol.passScoreThreshold && coveragePct >= protocol.minCoverageThreshold;

  // 5. Classification Label (Descriptive only - no recommendations)
  let classification: QualityClassification = 'below_threshold';
  let classificationLabelAr = 'دون حد الجودة للمدى الطويل وفق البروتوكول';

  if (coveragePct < protocol.minCoverageThreshold) {
    classification = 'indeterminate';
    classificationLabelAr = `غير قابل للحكم: التغطية (${coveragePct}%) أقل من الحد الأدنى (60%)`;
  } else if (hasAnyExclusion) {
    classification = 'below_threshold';
    classificationLabelAr = 'لم يجتز: تفعيل قاعدة استبعاد حرجة';
  } else if (finalScore >= 90) {
    classification = 'high_quality';
    classificationLabelAr = 'جودة عالية وفق البروتوكول (90 - 100)';
  } else if (finalScore >= 80) {
    classification = 'strong_watch';
    classificationLabelAr = 'قوية وتستحق المتابعة (80 - 89)';
  } else if (finalScore >= 70) {
    classification = 'good_with_risks';
    classificationLabelAr = 'جيدة مع مخاطر موثقة (70 - 79)';
  } else if (finalScore >= 60) {
    classification = 'speculative';
    classificationLabelAr = 'مضاربية أكثر منها استثمارية (60 - 69)';
  } else {
    classification = 'below_threshold';
    classificationLabelAr = 'دون حد الجودة للمدى الطويل وفق البروتوكول (< 60)';
  }

  // 6. Strengths & Weaknesses (Top 3 and Bottom 3 computed deterministically)
  const criteriaWithAvailableData = allCriteria.filter((c) => c.result !== 'insufficient');
  const sortedByPerformance = [...criteriaWithAvailableData].sort((a, b) => {
    const ratioA = a.earnedPoints / a.weight;
    const ratioB = b.earnedPoints / b.weight;
    return ratioB - ratioA;
  });

  const topStrengths = sortedByPerformance.slice(0, 3);
  const topWeaknesses = [...criteriaWithAvailableData]
    .sort((a, b) => {
      const ratioA = a.earnedPoints / a.weight;
      const ratioB = b.earnedPoints / b.weight;
      return ratioA - ratioB;
    })
    .slice(0, 3);

  // 7. Hidden Risks Block (المخاطر الخفية مبنية على حقول البيانات دون إنشاء حقائق)
  const hiddenRisks: HiddenRiskItem[] = [];
  if (unlockVal > 25) {
    hiddenRisks.push({
      category: 'unlocks',
      severity: unlockVal > 40 ? 'high' : 'medium',
      titleAr: 'ضغط فك التوكنات القادم',
      descriptionAr: `سيتم فك ما يقارب ${unlockVal.toFixed(1)}% من المعروض المتداول خلال الأشهر الـ 12 القادمة.`,
      evidence: `الفك السنوي: ${unlockVal.toFixed(1)}% من المتداول`,
    });
  }
  if (concVal > 45) {
    hiddenRisks.push({
      category: 'centralization',
      severity: concVal > 55 ? 'high' : 'medium',
      titleAr: 'تركز حيازة التوكنات في محافظ كبرى',
      descriptionAr: `أكبر 10 عناوين تسيطر على ${concVal.toFixed(1)}% من المعروض، مما يزيد من احتمالات تقلبات السيولة.`,
      evidence: `حيازة أكبر 10 عناوين: ${concVal.toFixed(1)}%`,
    });
  }
  if (regVal) {
    hiddenRisks.push({
      category: 'regulation',
      severity: 'high',
      titleAr: 'مخاطر قانونية وتنظيمية نشطة',
      descriptionAr: 'المشروع يخضع لإجراء تنظيمي رسمي قد يؤثر على استمرارية البروتوكول أو إدراجه.',
      evidence: 'إجراء تنظيمي نشط معلن',
    });
  }
  if ((input.singleSourceRevenueConcentrationPct?.value ?? 0) > 60) {
    const c = input.singleSourceRevenueConcentrationPct!.value!;
    hiddenRisks.push({
      category: 'dependency',
      severity: 'medium',
      titleAr: 'اعتماد مفرط على مصدر إيراد وحيد',
      descriptionAr: `أكثر من ${c.toFixed(1)}% من رسوم البروتوكول تأتي من حوض أو عقد واحد.`,
      evidence: `تركز الإيراد: ${c.toFixed(1)}%`,
    });
  }
  if ((input.fdvToRevenueMultiple?.value ?? 0) > 120) {
    const mult = input.fdvToRevenueMultiple!.value!;
    hiddenRisks.push({
      category: 'revenue',
      severity: 'medium',
      titleAr: 'تقييم مالي متضخم مقارنة بالرسوم',
      descriptionAr: `مكرر القيمة المخففة إلى الإيرادات يبلغ ${mult.toFixed(1)}x، مما يعني أن السوق يسعر نمواً مستقبلياً كبيراً.`,
      evidence: `FDV/Revenue: ${mult.toFixed(1)}x`,
    });
  }

  // Counts
  const compliantCount = allCriteria.filter((c) => c.result === 'pass').length;
  const partialCount = allCriteria.filter((c) => c.result === 'partial').length;
  const nonCompliantCount = allCriteria.filter((c) => c.result === 'fail').length;
  const insufficientCount = allCriteria.filter((c) => c.result === 'insufficient').length;

  return {
    symbol: input.symbol,
    coinId: input.coinId,
    coinName: input.coinName,
    sector: input.sector,
    isOutOfScope: false,
    evaluationTimestamp: now,
    evaluationDateStr: dateFormatted,
    protocolVersion: protocol.version,
    protocolHash: protocol.sha256Hash,
    finalScore,
    coveragePct,
    hasPassed,
    classification,
    classificationLabelAr,
    categoryScores: evaluatedCategories,
    exclusions,
    hasAnyExclusion,
    topStrengths,
    topWeaknesses,
    hiddenRisks,
    compliantCount,
    partialCount,
    nonCompliantCount,
    insufficientCount,
    totalCriteriaCount: allCriteria.length,
    primaryStrengthAr: topStrengths[0]?.nameAr || 'لا توجد بيانات كافية',
    primaryWeaknessAr: topWeaknesses[0]?.nameAr || 'لا توجد بيانات كافية',
    topRiskToMonitorAr: hiddenRisks[0]?.titleAr || 'لا توجد مخاطر استثنائية مرصودة',
    mandatoryDisclaimerAr: protocol.disclaimerAr,
  };
}
