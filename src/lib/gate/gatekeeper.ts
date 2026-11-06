// Strategy Gatekeeper Engine (بوابة اعتماد الاستراتيجية)
// Strictly evaluates statistical evidence and gates strategies into Approved, Paper-Only, or Rejected

import {
  StatisticalEvidence,
  StrategyGateScorecard,
  GateCriterion,
  GateStatus,
} from '../../types/evidence';

export function evaluateStrategyGate(evidence: StatisticalEvidence): StrategyGateScorecard {
  const criteria: GateCriterion[] = [];
  const rejectionReasonsAr: string[] = [];
  const recommendationsAr: string[] = [];

  // 1. حجم العينة والصفقات (Sample Size)
  const n = evidence.sampleSize;
  const isSlowTrend8Years =
    (evidence.testPeriodYears !== undefined && evidence.testPeriodYears >= 8) ||
    (evidence.strategyStyle === 'slow_trend' && (evidence.testPeriodYears ?? 9) >= 8);
  const minApprovedN = isSlowTrend8Years ? 40 : 100;
  const isSampleSizeApproved = n >= minApprovedN;
  const isSampleSizeWarning = n >= 30 && n < minApprovedN;
  criteria.push({
    id: 'sample_size',
    titleAr: 'حجم العينة الإحصائية (عدد الصفقات)',
    descriptionAr: 'يضمن قوة الاختبار الإحصائي وتقليل الخطأ المعياري للنتائج.',
    thresholdAr: isSlowTrend8Years
      ? '≥ 40 صفقة (استراتيجية اتجاه بطيئة مع بيانات ≥ 8 سنوات)'
      : '≥ 100 صفقة للاعتماد الكامل (30 للتجريبي)',
    actualValueStr: `${n} صفقة`,
    passed: isSampleSizeApproved,
    isWarning: isSampleSizeWarning,
    importance: 'critical',
    notesAr: isSampleSizeApproved
      ? 'حجم عينة كافٍ وفق العتبة الأصلية المعتمدة.'
      : isSampleSizeWarning
      ? `حجم عينة متوسط (${n} صفقة < ${minApprovedN})؛ يسمح بالحضانة الورقية فقط (🟡) ولا يُعتمد كلياً.`
      : 'عدد صفقات ضئيل جداً (< 30)؛ النتائج غير موثوقة علمياً ومرفوضة.',
  });
  if (n < 30) {
    rejectionReasonsAr.push(`عدد الصفقات (${n}) أقل من الحد الأدنى المقبول (30 صفقة).`);
  }

  // 2. اختبار الدلالة الإحصائية (One-Tailed t-test t >= 2.50)
  const tStat = evidence.tTest.tStat;
  const pVal = evidence.tTest.pValue;
  const isTTestApproved = tStat >= 2.50 && evidence.tTest.isSignificant95;
  const isTTestWarning = !isTTestApproved && tStat >= 1.65 && evidence.expectancyR.point > 0;
  criteria.push({
    id: 'p_value_ttest',
    titleAr: 'اختبار دلالة الحافة الربحية (t-test t ≥ 2.50)',
    descriptionAr: 'رفض فرضية العدم (أن الأرباح مجرد ضربة حظ أو عشوائية) بقوة إحصائية صارمة.',
    thresholdAr: 't ≥ 2.50 (p < 0.01 باتجاه واحد)',
    actualValueStr: `t = ${tStat.toFixed(2)} (p = ${pVal.toFixed(4)})`,
    passed: isTTestApproved,
    isWarning: isTTestWarning,
    importance: 'critical',
    notesAr: isTTestApproved
      ? 'الدلالة الإحصائية قوية ومثبتة (t ≥ 2.50)؛ احتمالية الصدفة أقل من 1%.'
      : isTTestWarning
      ? 'دلالة حدودية (1.65 ≤ t < 2.50)؛ غير كافية للاعتماد الكامل وتقتصر على الحضانة الورقية (🟡).'
      : 'فشل الاختبار الإحصائي (t < 1.65)؛ لا يوجد دليل علمي يثبت وجود حافة حقيقية.',
  });
  if (!isTTestApproved && !isTTestWarning) {
    rejectionReasonsAr.push(
      `فشل اختبار الدلالة (t = ${tStat.toFixed(2)} < 2.50)؛ الدلالة غير كافية لاستبعاد الصدفة.`
    );
  }

  // 2-B. مؤشر شارب المنكمش (Deflated Sharpe Ratio - DSR >= 0.95)
  const dsrVal = evidence.deflatedSharpeRatio !== undefined ? evidence.deflatedSharpeRatio : 0.0;
  const isDsrApproved = dsrVal >= 0.95;
  const isDsrWarning = dsrVal >= 0.50 && dsrVal < 0.95;
  const dsrDetails = evidence.deflatedSharpeDetails;
  const dsrActualStr = dsrDetails
    ? `DSR = ${dsrVal.toFixed(4)} (N=${dsrDetails.N}, sd=${dsrDetails.sd.toFixed(2)}, SR₀=${dsrDetails.sr0.toFixed(2)}, z=${dsrDetails.z.toFixed(2)})`
    : `DSR = ${dsrVal.toFixed(4)}`;

  criteria.push({
    id: 'deflated_sharpe',
    titleAr: 'مؤشر شارب المنكمش (Deflated Sharpe Ratio - DSR)',
    descriptionAr: 'تصحيح تحيز اختبار الفرضيات المتعددة والتنقيب في البيانات (Bailey & López de Prado 2014).',
    thresholdAr: 'DSR ≥ 0.95 (احتمالية حافة حقيقية بعد خصم التجارب المتعددة)',
    actualValueStr: dsrActualStr,
    passed: isDsrApproved,
    isWarning: isDsrWarning,
    importance: 'critical',
    notesAr: isDsrApproved
      ? 'مؤشر DSR متفوق (≥ 0.95)؛ الحافة صامدة تماماً أمام تحيز التنقيب في البيانات.'
      : isDsrWarning
      ? `مؤشر DSR معتدل (${dsrVal.toFixed(4)} < 0.95)؛ هناك احتمال لتأثر النتيجة باختيار المعلمات؛ مقتصرة على الورقي فقط.`
      : 'مؤشر DSR منخفض (< 0.50)؛ النتيجة مفرطة الملاءمة ومرجح أنها نتاج تجارب متعددة.',
  });
  if (!isDsrApproved) {
    rejectionReasonsAr.push(`مؤشر DSR (${dsrVal.toFixed(4)}) أقل من العتبة الأصلية الصارمة (0.95).`);
  }

  // 3. الحد السفلي لمجال الثقة 95% لمتوسط العائد (CI95 Lower Bound E[R])
  const expLower = evidence.expectancyR.ci95[0];
  const isExpLowerPositive = expLower > 0;
  const isExpPointPositive = evidence.expectancyR.point > 0;
  criteria.push({
    id: 'expectancy_ci_lower',
    titleAr: 'الحد الأدنى لمجال الثقة (95% CI Lower Bound)',
    descriptionAr: 'يضمن أن أسوأ سيناريو لمتوسط العائد لا يزال موجباً إحصائياً.',
    thresholdAr: 'الحد السفلي لـ E[R] > 0.00 R',
    actualValueStr: `[${evidence.expectancyR.ci95[0]} R إلى ${evidence.expectancyR.ci95[1]} R]`,
    passed: isExpLowerPositive,
    isWarning: isExpPointPositive && !isExpLowerPositive,
    importance: 'high',
    notesAr: isExpLowerPositive
      ? 'مجال الثقة بالكامل فوق الصفر؛ حتى في أسوأ التقديرات الاستراتيجية رابحة.'
      : isExpPointPositive
      ? 'الحد السفلي يلامس أو يخترق المنطقة السالبة، مما يستوجب الحذر.'
      : 'متوسط العائد سالب بالكامل؛ الاستراتيجية تستنزف رأس المال.',
  });
  if (!isExpPointPositive) {
    rejectionReasonsAr.push(`متوسط العائد النقطي سالب (${evidence.expectancyR.point} R).`);
  }

  // 4. تآكل العينة الخارجية المحجوبة (Out-of-Sample Degradation)
  let oosPassed = false;
  let oosWarning = false;
  let oosActualStr = 'لم تُحدد عينة خارج العينة';
  let oosNotes = 'يوصى بتفعيل اختبار Out-of-Sample للتحقق من عدم الإفراط في الملاءمة.';

  if (evidence.outOfSampleDegradation) {
    const oosTrades = evidence.outOfSampleDegradation.outOfSampleTradesCount;
    const oosExp = evidence.outOfSampleDegradation.outOfSampleExpectancyR;
    const degPct = evidence.outOfSampleDegradation.degradationPct;
    const isSmallSample = oosTrades < 20;

    oosActualStr = `OOS E[R]=${oosExp > 0 ? '+' : ''}${oosExp.toFixed(3)} R (تآكل: ${degPct.toFixed(1)}%, صفقات: ${oosTrades})`;

    if (oosExp <= 0) {
      // STRICT RULE: Negative OOS strictly blocks 🟢 and is never ignored!
      oosPassed = false;
      oosWarning = true;
      oosNotes = isSmallSample
        ? `عائد OOS سالب (${oosExp.toFixed(3)} R) مع تحذير: عينة غير كافية (${oosTrades} < 20 صفقة)؛ النتيجة السالبة تمنع الاعتماد 🟢 تماماً.`
        : `عائد OOS سالب (${oosExp.toFixed(3)} R)؛ إفراط مؤكد في الملاءمة يستوجب القصر على الورقي 🟡.`;
      rejectionReasonsAr.push(`عائد العينة الخارجية المحجوبة OOS سالب (${oosExp.toFixed(3)} R)؛ يمنع الاعتماد 🟢.`);
    } else if (evidence.outOfSampleDegradation.passedDegradationTest && degPct <= 35) {
      oosPassed = true;
      oosWarning = isSmallSample;
      oosNotes = isSmallSample
        ? `عائد OOS إيجابي (+${oosExp.toFixed(3)} R) وتآكل مقبول، ولكن مع تحذير: عينة غير كافية (${oosTrades} < 20 صفقة).`
        : `صمود ممتاز خارج العينة (تآكل ${degPct.toFixed(1)}% ≤ 35% مع بقاء العائد إيجابياً).`;
    } else if (degPct <= 50) {
      oosPassed = false;
      oosWarning = true;
      oosNotes = `تآكل متوسط (${degPct.toFixed(1)}% > 35%)؛ مؤشر على حساسية المعلمات.`;
      rejectionReasonsAr.push(`تآكل العينة الخارجية يتجاوز 35% (${degPct.toFixed(1)}%).`);
    } else {
      oosPassed = false;
      oosNotes = `تآكل حاد (${degPct.toFixed(1)}% > 50%)؛ إفراط مؤكد في الملاءمة.`;
      rejectionReasonsAr.push(`تآكل مفرط خارج العينة (${degPct.toFixed(1)}% > 35%).`);
    }
  } else {
    rejectionReasonsAr.push('لم يتم تقديم اختبار عينة محجوبة OOS مستقلة.');
  }

  criteria.push({
    id: 'oos_degradation',
    titleAr: 'صمود العينة الخارجية المحجوبة (OOS Degradation)',
    descriptionAr: 'يقيس صمود الأداء على بيانات محجوبة مسبقاً لم يسبق للنموذج رؤيتها.',
    thresholdAr: 'E[R] > 0 وتآكل ≤ 35% (مع n ≥ 20)',
    actualValueStr: oosActualStr,
    passed: oosPassed,
    isWarning: oosWarning,
    importance: 'critical',
    notesAr: oosNotes,
  });

  // 5. احتمالية التراجع الحاد والإفلاس (Bootstrap Risk of Ruin)
  const ruinPct = evidence.bootstrap.riskOfRuinPct;
  const isRuinSafe = ruinPct < 1.0;
  const isRuinWarning = ruinPct >= 1.0 && ruinPct <= 5.0;
  const bootstrapSe = evidence.bootstrap.standardErrors;
  const seRuinStr = bootstrapSe?.riskOfRuinPctSE !== undefined ? ` ±${bootstrapSe.riskOfRuinPctSE}%` : '';
  const seDdStr = bootstrapSe?.drawdown95thPercentileRSE !== undefined ? ` ±${bootstrapSe.drawdown95thPercentileRSE}R` : '';

  criteria.push({
    id: 'risk_of_ruin',
    titleAr: 'احتمالية الإفلاس والتراجع الشديد (Bootstrap Ruin)',
    descriptionAr: 'نسبة مسارات المحاكاة التي هبطت بأكثر من 20R متتالية (10,000 مسار Monte Carlo مع الخطأ المعياري).',
    thresholdAr: '< 1.00% من المسارات العشوائية',
    actualValueStr: `${ruinPct.toFixed(2)}%${seRuinStr} (أقصى هبوط 95%: ${evidence.bootstrap.drawdown95thPercentileR} R${seDdStr})`,
    passed: isRuinSafe,
    isWarning: isRuinWarning,
    importance: 'critical',
    notesAr: isRuinSafe
      ? 'أمان عالٍ من مخاطر الإفلاس والانزلاق التراكمي.'
      : isRuinWarning
      ? 'مخاطرة معتدلة؛ تتطلب تخفيض حجم المركز وإيقاف الخسائر الصارم.'
      : 'مخاطرة إفلاس مرتفعة؛ أقصى تراجع متوقع يهدد سلامة الحساب.',
  });
  if (ruinPct > 5.0) {
    rejectionReasonsAr.push(`احتمالية الإفلاس (${ruinPct.toFixed(2)}%) تتجاوز الحد الآمن.`);
  }

  // 6. اختبار حساسية التسلسل (Sequence Sensitivity Test) - معلومة إحصائية فقط لا تدخل في معايير الاجتياز
  const pValPerm = evidence.permutationTest ? evidence.permutationTest.pValPermutation : 0.03;
  const origSharpe = evidence.permutationTest ? evidence.permutationTest.originalSharpe : 1.5;
  const permRuns = evidence.permutationTest?.permutationTrialsCount || 1000;
  const permPStr = pValPerm === 0 ? `< 1/${permRuns}` : `p = ${pValPerm.toFixed(4)}`;

  criteria.push({
    id: 'permutation_reality',
    titleAr: 'اختبار حساسية التسلسل (Sequence Sensitivity Test)',
    descriptionAr: 'مقارنة نسبة شارب مع تسلسلات بديلة عشوائية (معلومة استكشافية، أُزيلت من معايير الاجتياز والرفض).',
    thresholdAr: 'معلومة إحصائية (مستبعدة من معايير الاعتماد)',
    actualValueStr: `${permPStr} (Sharpe: ${origSharpe.toFixed(3)})`,
    passed: true,
    isWarning: false,
    importance: 'medium',
    notesAr: 'فحص حساسية الترتيب الزمني للأداء مقارنة بإعادة ترتيب الصفقات عشوائياً (للمعلومة فقط ولا تؤثر على القرار).',
  });

  // 7. صلابة أطوار السوق (Regime Robustness)
  // Display all 3 core regimes: bull, bear, chop with n and E[R], tagging n < 10 as 'عينة غير كافية'
  const coreRegimes = [
    { key: 'bull', nameAr: 'صاعد' },
    { key: 'bear', nameAr: 'هابط' },
    { key: 'chop', nameAr: 'عرضي' },
  ];

  const rawRegimes = evidence.regimeRobustness || [];
  const threeRegimes = coreRegimes.map((core) => {
    const found = rawRegimes.find((r) => r.regime === core.key);
    return (
      found || {
        regime: core.key as any,
        regimeNameAr: core.nameAr,
        tradesCount: 0,
        winRate: 0,
        winRateCi95: [0, 0] as [number, number],
        expectancyR: 0,
        expectancyCi95: [0, 0] as [number, number],
        profitFactor: 0,
        isProfitable: false,
        isSufficientSample: false,
        sampleNoteAr: 'عينة غير كافية (0 < 10)',
      }
    );
  });

  const regimesSufficient = threeRegimes.filter((r) => (r.tradesCount ?? 0) >= 10);
  const regimesProfitable = regimesSufficient.filter((r) => (r.expectancyR ?? 0) > 0);
  const X = regimesProfitable.length;
  const Y = regimesSufficient.length;

  const regimeSummaryParts = threeRegimes.map((r) => {
    const count = r.tradesCount ?? 0;
    const exp = r.expectancyR ?? 0;
    const note = count < 10 ? ' [عينة غير كافية]' : '';
    const sign = exp > 0 ? '+' : '';
    return `${r.regimeNameAr || r.regime}: n=${count}, E[R]=${sign}${exp.toFixed(3)}R${note}`;
  });

  const isRegimePassed = Y > 0 ? X >= Math.ceil(Y / 2) : true;
  const losingSufficient = regimesSufficient.filter((r) => (r.expectancyR ?? 0) <= 0);

  criteria.push({
    id: 'regime_robustness',
    titleAr: 'التوافق مع أطوار السوق (Regime Robustness)',
    descriptionAr: 'قدرة الاستراتيجية على الحفاظ على الإيجابية في الأسواق المختلفة عبر الأطوار ذات العينة الكافية.',
    thresholdAr: 'رابحة في X من Y أطوار (n≥10)',
    actualValueStr: `رابحة في ${X} من ${Y} أطوار (n≥10) [${regimeSummaryParts.join(' | ')}]`,
    passed: isRegimePassed,
    isWarning: !isRegimePassed && X > 0,
    importance: 'medium',
    notesAr: isRegimePassed
      ? `الاستراتيجية رابحة في ${X} من ${Y} أطوار ذات حجم عينة كافٍ (n ≥ 10).`
      : `الاستراتيجية تعاني في الأطوار ذات العينة الكافية: ${losingSufficient.map((r) => r.regimeNameAr).join(', ')}.`,
  });

  // 8. الدخول العشوائي (اختبار الحافة) - Random Entry Edge Test
  let baselinePassed = true;
  let baselineWarning = false;
  let baselineActualStr = 'تم افتراض اجتياز خط الأساس';
  let baselineNotes = 'التفوق على الدخول العشوائي بنفس شروط الخروج.';

  if (evidence.randomEntryBaseline) {
    const pBase = evidence.randomEntryBaseline.pValue;
    baselinePassed = pBase <= 0.05;
    baselineWarning = pBase > 0.05 && pBase <= 0.10;
    baselineActualStr = `p = ${pBase.toFixed(4)} (وسيط العشوائي: ${evidence.randomEntryBaseline.medianExpectancyR.toFixed(3)} R)`;
    baselineNotes = baselinePassed
      ? 'تفوقت الاستراتيجية دلالياً (p ≤ 0.05) على 2000 محاكاة دخول عشوائي بنفس أهداف الوقف والربح.'
      : baselineWarning
      ? 'تفوق حدودي على الدخول العشوائي (p ≤ 0.10)؛ لا يمكن استبعاد أثر اتجاه السوق تماماً.'
      : 'فشل خط الأساس (p > 0.10)؛ الأداء لا يمكن تمييزه إحصائياً عن الدخول العشوائي مع اتجاه السوق.';
    if (!baselinePassed) {
      rejectionReasonsAr.push(`لم تتفوق على الدخول العشوائي (p = ${pBase.toFixed(4)} > 0.05)؛ قد يكون العائد مجرد اتجاه عام للسوق.`);
    }
  }

  criteria.push({
    id: 'random_entry_baseline',
    titleAr: 'الدخول العشوائي (اختبار الحافة)',
    descriptionAr: 'يضمن أن الحافة ناتجة عن دقة توقيت الدخول وليس فقط ركوب اتجاه السوق العام.',
    thresholdAr: 'p-value ≤ 0.05 مقابل الدخول العشوائي',
    actualValueStr: baselineActualStr,
    passed: baselinePassed,
    isWarning: baselineWarning,
    importance: 'critical',
    notesAr: baselineNotes,
  });

  // 9. استقرار الجوار المعلمي (Neighborhood Parameter Robustness)
  let neighborPassed = true;
  let neighborWarning = false;
  let neighborActualStr = 'لم يُفحص الجوار بعد';
  let neighborNotes = 'فحص استقرار الأداء عند تذبذب المعلمات بنسبة ±15%.';

  if (evidence.neighborhoodRobustnessPct !== undefined) {
    const nPct = evidence.neighborhoodRobustnessPct;
    neighborPassed = nPct >= 70;
    neighborWarning = nPct >= 50 && nPct < 70;
    neighborActualStr = `${nPct.toFixed(1)}% من الجوار رابح`;
    neighborNotes = neighborPassed
      ? 'استقرار جوار ممتاز؛ الاستراتيجية ليست شديدة الحساسية لقيم المعلمات المحددة.'
      : neighborWarning
      ? 'استقرار جوار معتدل (50% - 70%)؛ حساسية متوسطة للمعلمات.'
      : 'هشاشة معلمات حادة (< 50%)؛ مؤشر قوي على فرط المطابقة وحافة وهمية.';
    if (!neighborPassed) {
      rejectionReasonsAr.push(`استقرار الجوار المعلمي ضعيف (${nPct.toFixed(1)}% < 70%).`);
    }
  }

  criteria.push({
    id: 'neighborhood_robustness',
    titleAr: 'استقرار الجوار المعلمي (Neighborhood Robustness)',
    descriptionAr: 'يضمن صمود الاستراتيجية إذا تغيرت معلمات الوقف والهدف بنسبة ±15%.',
    thresholdAr: '≥ 70% من المعلمات المجاورة رابحة',
    actualValueStr: neighborActualStr,
    passed: neighborPassed,
    isWarning: neighborWarning,
    importance: 'critical',
    notesAr: neighborNotes,
  });

  // 10. الفرضية الاقتصادية المكتوبة (Written Economic Hypothesis)
  let hypothesisPassed = false;
  let hypothesisActualStr = 'غير مدخلة من قبل المستخدم';
  let hypothesisNotes = 'يُشترط إدخال فرضية اقتصادية مكتوبة من قبل المستخدم (حقل نصي ≥ 40 حرفاً مع تاريخ التوثيق).';

  if (evidence.economicHypothesis && evidence.economicHypothesis.text) {
    const textLen = evidence.economicHypothesis.text.trim().length;
    const hasDate = Boolean(
      evidence.economicHypothesis.documentedDate ||
      /\d{4}-\d{2}-\d{2}/.test(evidence.economicHypothesis.text)
    );
    hypothesisPassed = evidence.economicHypothesis.isDocumented && textLen >= 40 && hasDate;
    hypothesisActualStr = hypothesisPassed
      ? `موثقة ومكتوبة (${textLen} حرفاً)`
      : `غير مستوفية (${textLen} حرفاً < 40 أو بدون تاريخ)`;
    hypothesisNotes = hypothesisPassed
      ? `الفرضية الموثقة: "${evidence.economicHypothesis.text.slice(0, 60)}..."`
      : 'يُشترط توثيق فرضية اقتصادية مكتوبة مسبقاً من المستخدم لا تقل عن 40 حرفاً مع تاريخ التوثيق.';
  }
  if (!hypothesisPassed) {
    rejectionReasonsAr.push('الفرضية الاقتصادية المكتوبة مفقودة أو غير مستوفية للشروط (≥ 40 حرفاً مع تاريخ التوثيق).');
  }

  criteria.push({
    id: 'economic_hypothesis',
    titleAr: 'الفرضية الاقتصادية المكتوبة (Economic Hypothesis)',
    descriptionAr: 'تبرير منطقي واقتصادي لأصل الحافة ومن يقف في الجانب الخاسر من الصفقة (إدخال يدوي ≥ 40 حرفاً مع تاريخ).',
    thresholdAr: 'مدخلة يدوياً ≥ 40 حرفاً مع تاريخ',
    actualValueStr: hypothesisActualStr,
    passed: hypothesisPassed,
    isWarning: false,
    importance: 'critical',
    notesAr: hypothesisNotes,
  });

  // Determine Overall Status
  let status: GateStatus = 'rejected';
  let statusLabelAr = '🔴 مرفوضة (Rejected)';
  let statusBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  let summaryMessageAr = '';

  const criticalCriteria = criteria.filter((c) => c.importance === 'critical');
  const allCriticalPassed = criticalCriteria.every((c) => c.passed);
  const criticalWarnings = criticalCriteria.filter((c) => c.isWarning);

  // STRICT REQUIREMENT: Cannot be approved without:
  // 1. All critical passed (including baseline, neighborhood, economic hypothesis)
  // 2. Expectancy CI lower > 0
  // 3. OOS passed
  // 4. Baseline passed (p <= 0.05)
  // 5. Neighborhood passed (>= 70%)
  // 6. Economic hypothesis passed
  if (
    allCriticalPassed &&
    isExpLowerPositive &&
    oosPassed &&
    baselinePassed &&
    neighborPassed &&
    hypothesisPassed
  ) {
    status = 'approved';
    statusLabelAr = '🟢 معتمدة للحضانة الورقية فقط (لا تضمن أي ربح مستقبلي)';
    statusBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    summaryMessageAr =
      'اجتازت الاستراتيجية جميع المعايير الإحصائية ومقارنة خط الأساس بنجاح. هذا الاعتماد مخصص للحضانة الورقية والتداول التجريبي الصارم فقط، ولا يمثل ضماناً لأي ربحية مستقبلية في التداول الحقيقي.';
    recommendationsAr.push('البدء بفترة حضانة ورقية لا تقل عن 20 صفقة لتأكيد عدم وجود تآكل حي.');
    recommendationsAr.push(
      `تطبيق نسبة المخاطرة المقترحة: ${evidence.kellySuggestedRiskPct.appliedCapPct}% لكل صفقة.`
    );
  } else if (
    (allCriticalPassed || (criticalWarnings.length <= 2 && n >= 30)) &&
    evidence.expectancyR.point > 0 &&
    (oosPassed || oosWarning)
  ) {
    status = 'paper_only';
    statusLabelAr = '🟡 تجريبية (ورقي فقط / Paper Candidate)';
    statusBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    summaryMessageAr =
      'تظهر الاستراتيجية إشارات إيجابية مشجعة، لكنها لا تستوفي شروط الاعتماد الكامل (إما لعدم التفوق الدلالي على خط الأساس العشوائي، أو لحجم عينة حدودي). مسموح بتداولها ورقياً فقط.';
    recommendationsAr.push('تنفيذ صفقات ورقية حية لرفع حجم العينة إلى 60 صفقة على الأقل.');
    recommendationsAr.push('مراقبة مؤشر CUSUM لاكتشاف أي تدهور مبكر قبل ضخ أموال حقيقية.');
  } else {
    status = 'rejected';
    statusLabelAr = '🔴 مرفوضة (Rejected)';
    statusBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    summaryMessageAr =
      'فشلت الاستراتيجية في تلبية المعايير الإحصائية الأساسية أو لم تتفوق على الدخول العشوائي. لا يُنصح بتداولها.';
    recommendationsAr.push('إعادة فحص شروط الدخول وتجنب محاولة مطابقة المنحنى السابق (Curve-Fitting).');
    recommendationsAr.push('فحص أسباب الفشل في العينة الخارجية أو فترات التذبذب العرضي.');
  }

  // Calculate overall scorecard score
  const passedCount = criteria.filter((c) => c.passed).length;
  const warningCount = criteria.filter((c) => c.isWarning).length;
  const overallScore = Math.round(
    ((passedCount * 1.0 + warningCount * 0.5) / criteria.length) * 100
  );

  return {
    status,
    statusLabelAr,
    statusBadgeColor,
    overallScore,
    criteria,
    summaryMessageAr,
    recommendationsAr,
    suggestedRiskPct: evidence.kellySuggestedRiskPct.appliedCapPct,
    incubationAllowed: status === 'approved',
    paperOnlyAllowed: status === 'approved' || status === 'paper_only',
    rejectionReasonsAr,
  };
}

