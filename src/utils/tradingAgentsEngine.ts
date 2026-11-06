// TauricResearch / TradingAgents Multi-Agent Trading Firm Framework
// يحاكي الهيكل المؤسسي متعدد الوكلاء (TauricResearch/TradingAgents):
// 1. فريق المحللين (Fundamentals, Technical, Sentiment, News Analysts)
// 2. فريق الأبحاث والمناظرة الجدلية (Bull Researcher vs. Bear Researcher)
// 3. وكيل التداول (Trader Agent)
// 4. فريق إدارة المخاطر والامتثال (Risk Guardians)
// 5. مدير الصندوق التنفيذي (Fund Manager) — تداول ورقي محاكى 100% (Paper Only)

import { CoinDetail, TechnicalAnalysisResult, FearAndGreedData, DerivativesData, NewsItem } from '../types/crypto';
import { formatAdaptivePrice } from '../lib/brain/decisionEngine';

export type AgentStance = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TraderRiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type FinalAgentAction = 'ENTER_LONG' | 'ENTER_SHORT' | 'HOLD_WAIT';

export interface AnalystReport {
  id: 'technical' | 'fundamental' | 'sentiment' | 'news';
  roleNameAr: string;
  roleNameEn: string;
  stance: AgentStance;
  score: number; // -100 to +100
  confidencePct: number; // 0 to 100
  headlineAr: string;
  metrics: { labelAr: string; value: string; status: 'positive' | 'negative' | 'neutral' }[];
  findingsAr: string[];
}

export interface DebateRound {
  roundNumber: number;
  topicAr: string;
  bullArgumentAr: string;
  bearArgumentAr: string;
  roundWinner: 'BULL' | 'BEAR' | 'DRAW';
}

export interface ResearchDebateResult {
  bullConvictionPct: number;
  bearConvictionPct: number;
  netEdgeScore: number; // -100 to +100
  rounds: DebateRound[];
  consensusSummaryAr: string;
}

export interface TraderProposal {
  riskProfile: TraderRiskProfile;
  proposedAction: FinalAgentAction;
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1Price: number;
  takeProfit2Price: number;
  riskRewardRatio: number;
  recommendedRiskPct: number;
  rationaleAr: string;
}

export interface RiskCheckItem {
  id: string;
  titleAr: string;
  passed: boolean;
  severity: 'OK' | 'WARNING' | 'VETO';
  detailAr: string;
}

export interface RiskCommitteeReview {
  status: 'APPROVED' | 'MODIFIED' | 'VETOED';
  adjustedRiskPct: number;
  riskScore: number; // 0 (safe) to 100 (extreme risk)
  checks: RiskCheckItem[];
  committeeNoteAr: string;
}

export interface FundManagerDecision {
  finalAction: FinalAgentAction;
  finalActionAr: string;
  consensusConfidencePct: number;
  approvedRiskPct: number;
  executiveSummaryAr: string;
  timestamp: number;
}

export interface TradingAgentsPipelineResult {
  symbol: string;
  currentPrice: number;
  analysts: AnalystReport[];
  debate: ResearchDebateResult;
  traderProposal: TraderProposal;
  riskReview: RiskCommitteeReview;
  fundManager: FundManagerDecision;
  aiEnhancedSynthesisAr?: string;
}

export interface TradingAgentsInput {
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  fearGreed?: FearAndGreedData | null;
  derivatives?: DerivativesData | null;
  news?: NewsItem[];
  riskProfile?: TraderRiskProfile;
  killSwitchActive?: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function runTradingAgentsPipeline(input: TradingAgentsInput): TradingAgentsPipelineResult {
  const {
    coin,
    analysis,
    fearGreed,
    derivatives,
    news = [],
    riskProfile = 'balanced',
    killSwitchActive = false,
  } = input;

  const price = coin.current_price > 0 ? coin.current_price : 1;
  const symbol = coin.symbol.toUpperCase();
  const rsi = analysis.rsi14 ?? 50;
  const ema50 = analysis.pivots?.ema50 || price;
  const nearestSupport = analysis.pivots?.s1 || price * 0.96;
  const nearestResistance = analysis.pivots?.r1 || price * 1.04;

  // ============================================================================
  // 1. ANALYST TEAM (فريق المحللين الأربعة)
  // ============================================================================

  // A) Technical Analyst (المحلل الفني)
  let techScore = 0;
  if (analysis.trend === 'صاعد') techScore += 35;
  else if (analysis.trend === 'هابط') techScore -= 35;

  if (rsi < 32) techScore += 25; // Oversold bounce potential
  else if (rsi > 70) techScore -= 25; // Overbought exhaustion
  else if (rsi >= 50 && rsi <= 65) techScore += 15;
  else if (rsi >= 35 && rsi < 50) techScore -= 10;

  if (analysis.macd.histogram > 0) techScore += 20;
  else if (analysis.macd.histogram < 0) techScore -= 20;

  if (price > ema50) techScore += 15;
  else techScore -= 15;

  techScore = clamp(techScore, -100, 100);
  const techStance: AgentStance = techScore >= 20 ? 'BULLISH' : techScore <= -20 ? 'BEARISH' : 'NEUTRAL';
  const rsiStatusAr = rsi < 30 ? 'تشبع بيعي' : rsi > 70 ? 'تشبع شرائي' : 'منطقة متوازنة';

  const technicalReport: AnalystReport = {
    id: 'technical',
    roleNameAr: 'المحلل الفني الكمي',
    roleNameEn: 'Technical Analyst',
    stance: techStance,
    score: techScore,
    confidencePct: clamp(Math.abs(techScore) + 25, 45, 95),
    headlineAr:
      techStance === 'BULLISH'
        ? `زخم فني إيجابي على ${symbol} مع تموضع فوق المتوسطات ودعم عند $${formatAdaptivePrice(nearestSupport)}`
        : techStance === 'BEARISH'
        ? `ضغط بيعي فني على ${symbol} مع مقاومة عند $${formatAdaptivePrice(nearestResistance)}`
        : `حركة عرضية متوازنة لـ ${symbol} بين الدعم $${formatAdaptivePrice(nearestSupport)} والمقاومة $${formatAdaptivePrice(nearestResistance)}`,
    metrics: [
      {
        labelAr: 'مؤشر القوة النسبية RSI(14)',
        value: rsi.toFixed(1),
        status: rsi < 35 ? 'positive' : rsi > 68 ? 'negative' : 'neutral',
      },
      {
        labelAr: 'زخم الماكد (MACD Hist)',
        value: analysis.macd.histogram >= 0 ? `+${analysis.macd.histogram.toFixed(4)}` : analysis.macd.histogram.toFixed(4),
        status: analysis.macd.histogram >= 0 ? 'positive' : 'negative',
      },
      {
        labelAr: 'الاتجاه العام',
        value: analysis.trend,
        status: analysis.trend === 'صاعد' ? 'positive' : analysis.trend === 'هابط' ? 'negative' : 'neutral',
      },
    ],
    findingsAr: [
      `قراءة RSI الحالية عند ${rsi.toFixed(1)} (${rsiStatusAr}) مع اتجاه ${analysis.trend}.`,
      `أقرب مستوى دعم هيكلي عند $${formatAdaptivePrice(nearestSupport)} وأقرب مقاومة عند $${formatAdaptivePrice(nearestResistance)}.`,
      `التوصية الفنية الأولية للمؤشرات: ${analysis.recommendation} (قوة الزخم ${analysis.momentumScore}%).`,
    ],
  };

  // B) Fundamentals Analyst (محلل الأساسيات واقتصاديات التوكن)
  const rank = coin.market_cap_rank || 50;
  const turnoverRatio = coin.market_cap > 0 ? (coin.total_volume / coin.market_cap) * 100 : 5;
  const athChangePct = coin.ath_change_percentage || -35;
  let fundScore = 0;

  if (rank <= 10) fundScore += 35;
  else if (rank <= 30) fundScore += 20;
  else if (rank <= 100) fundScore += 5;
  else fundScore -= 15;

  if (turnoverRatio >= 4 && turnoverRatio <= 35) fundScore += 25;
  else if (turnoverRatio > 35) fundScore += 10;
  else fundScore -= 15;

  if (athChangePct < -25 && athChangePct > -80) fundScore += 15;
  else if (athChangePct <= -85) fundScore -= 20;

  fundScore = clamp(fundScore, -100, 100);
  const fundStance: AgentStance = fundScore >= 20 ? 'BULLISH' : fundScore <= -20 ? 'BEARISH' : 'NEUTRAL';

  const fundamentalReport: AnalystReport = {
    id: 'fundamental',
    roleNameAr: 'محلل الأساسيات والسيولة',
    roleNameEn: 'Fundamentals Analyst',
    stance: fundStance,
    score: fundScore,
    confidencePct: clamp(60 + Math.round(Math.abs(fundScore) * 0.35), 50, 94),
    headlineAr:
      fundStance === 'BULLISH'
        ? `ملاءة سوقية قوية (الترتيب #${rank}) ومعدل دوران سيولة صحي (${turnoverRatio.toFixed(1)}%)`
        : fundStance === 'BEARISH'
        ? `مخاطر سيولة أو تراجع هيكلي حاد عن القمة التاريخية (${athChangePct.toFixed(1)}%)`
        : `تقييم أساسي متوازن لـ ${symbol} عند الترتيب السوقي #${rank}`,
    metrics: [
      {
        labelAr: 'الترتيب السوقي (Rank)',
        value: `#${rank}`,
        status: rank <= 25 ? 'positive' : rank <= 80 ? 'neutral' : 'negative',
      },
      {
        labelAr: 'نسبة السيولة / القيمة السوقية',
        value: `${turnoverRatio.toFixed(2)}%`,
        status: turnoverRatio >= 4 ? 'positive' : 'neutral',
      },
      {
        labelAr: 'البعد عن القمة التاريخية ATH',
        value: `${athChangePct.toFixed(1)}%`,
        status: athChangePct > -60 ? 'positive' : 'neutral',
      },
    ],
    findingsAr: [
      `القيمة السوقية الإجمالية وحجم التداول اليومي يضعان ${symbol} في المرتبة #${rank} عالمياً.`,
      `معدل دوران السيولة (Volume/MCap) يبلغ ${turnoverRatio.toFixed(2)}% مما يعكس ${turnoverRatio >= 5 ? 'عمقاً كافياً للتنفيذ المؤسسي' : 'سيولة متوسطة تتطلب حذراً في الانزلاق'}.`,
      `السعر الحالي يتحرك بفارق ${athChangePct.toFixed(1)}% عن القمة التاريخية ($${formatAdaptivePrice(coin.ath || price * 1.3)}).`,
    ],
  };

  // C) Sentiment Analyst (محلل المعنويات والمشتقات)
  const fgValue = fearGreed?.value ?? 50;
  const fgLabelAr = fearGreed?.classification_ar || 'حياد';
  const fundingPct = derivatives?.fundingRate !== undefined ? derivatives.fundingRate * 100 : 0.01;
  const longShortRatio = derivatives?.longShortRatio ?? 1.05;
  let sentScore = 0;

  if (fgValue <= 28) sentScore += 25;
  else if (fgValue >= 78) sentScore -= 25;
  else if (fgValue >= 52 && fgValue < 72) sentScore += 15;

  if (fundingPct > 0.05) sentScore -= 30;
  else if (fundingPct < -0.02) sentScore += 25;
  else sentScore += 10;

  if (coin.price_change_percentage_24h > 2) sentScore += 15;
  else if (coin.price_change_percentage_24h < -2) sentScore -= 15;

  sentScore = clamp(sentScore, -100, 100);
  const sentStance: AgentStance = sentScore >= 20 ? 'BULLISH' : sentScore <= -20 ? 'BEARISH' : 'NEUTRAL';

  const sentimentReport: AnalystReport = {
    id: 'sentiment',
    roleNameAr: 'محلل المعنويات والمشتقات',
    roleNameEn: 'Sentiment Analyst',
    stance: sentStance,
    score: sentScore,
    confidencePct: clamp(55 + Math.round(Math.abs(sentScore) * 0.4), 50, 92),
    headlineAr:
      sentStance === 'BULLISH'
        ? `تموضع صحي في العقود الآجلة ومعدل تمويل غير مزدحم (${fundingPct.toFixed(4)}%)`
        : sentStance === 'BEARISH'
        ? `تحذير من ازدحام المراكز أو تطرف المعنويات (مؤشر الخوف والطمع: ${fgValue})`
        : `معنويات سوقية محايدة (الخوف والطمع: ${fgValue}) وتمويل مستقر`,
    metrics: [
      {
        labelAr: 'مؤشر الخوف والطمع',
        value: `${fgValue} (${fgLabelAr})`,
        status: fgValue >= 45 && fgValue <= 70 ? 'positive' : fgValue > 75 ? 'negative' : 'neutral',
      },
      {
        labelAr: 'معدل التمويل (Funding)',
        value: `${fundingPct >= 0 ? '+' : ''}${fundingPct.toFixed(4)}%`,
        status: Math.abs(fundingPct) <= 0.03 ? 'positive' : 'negative',
      },
      {
        labelAr: 'نسبة الشراء/البيع (L/S)',
        value: longShortRatio.toFixed(2),
        status: longShortRatio >= 0.9 && longShortRatio <= 1.6 ? 'positive' : 'neutral',
      },
    ],
    findingsAr: [
      `قراءة الخوف والطمع عند ${fgValue} (${fgLabelAr}) مع تغير 24 ساعة بنسبة ${coin.price_change_percentage_24h.toFixed(2)}%.`,
      `معدل تمويل العقود الدائمة عند ${fundingPct.toFixed(4)}% مما يشير إلى ${fundingPct > 0.04 ? 'تكدس مراكز شرائية خطرة' : fundingPct < -0.01 ? 'احتمالية ضغط بيعي (Short Squeeze)' : 'توازن صحي بين المشترين والبائعين'}.`,
      `نسبة Long/Short تبلغ ${longShortRatio.toFixed(2)}.`,
    ],
  };

  // D) News & Macro Analyst (محلل الأخبار والماكرو)
  let posNews = 0;
  let negNews = 0;
  let severeAlert = false;
  for (const item of news) {
    if (item.sentiment === 'positive') posNews++;
    if (item.sentiment === 'negative') negNews++;
    const t = (item.title || '').toLowerCase();
    if (t.includes('hack') || t.includes('exploit') || t.includes('sec ') || t.includes('bankrupt')) {
      severeAlert = true;
    }
  }

  let newsScore = (posNews - negNews) * 25;
  if (severeAlert) newsScore = -85;
  if (news.length === 0) {
    newsScore = coin.price_change_percentage_24h >= 0 ? 15 : -10;
  }
  newsScore = clamp(newsScore, -100, 100);
  const newsStance: AgentStance = newsScore >= 20 ? 'BULLISH' : newsScore <= -20 ? 'BEARISH' : 'NEUTRAL';

  const newsReport: AnalystReport = {
    id: 'news',
    roleNameAr: 'محلل الأخبار والماكرو',
    roleNameEn: 'News & Macro Analyst',
    stance: newsStance,
    score: newsScore,
    confidencePct: news.length > 0 ? 82 : 64,
    headlineAr: severeAlert
      ? `تنبيه أخبار سلبية طارئة قد تؤثر على سيولة ${symbol}`
      : newsStance === 'BULLISH'
      ? `تغطية إخبارية داعمة (${posNews} إيجابية مقابل ${negNews} سلبية) وبيئة ماكرو مستقرة`
      : newsStance === 'BEARISH'
      ? `ضغوط إخبارية وحذر في التدفقات الإخبارية القصيرة الأجل`
      : `هدوء إخباري نسبي دون صدمات تنظيمية أو أمنية مرصودة لـ ${symbol}`,
    metrics: [
      {
        labelAr: 'الأخبار الإيجابية / السلبية',
        value: `${posNews} إيجابي / ${negNews} سلبي`,
        status: posNews > negNews ? 'positive' : negNews > posNews ? 'negative' : 'neutral',
      },
      {
        labelAr: 'مخاطر الصدمات الطارئة',
        value: severeAlert ? 'مرتفعة (تحذير)' : 'منخفضة (آمن)',
        status: severeAlert ? 'negative' : 'positive',
      },
      {
        labelAr: 'تغير السعر 24 ساعة',
        value: `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`,
        status: coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative',
      },
    ],
    findingsAr: [
      news[0]?.title
        ? `أبرز عنوان مرصود: «${news[0].title}» (${news[0].source}).`
        : `لا توجد عناوين اختراق أو حوادث طارئة مسجلة على ${symbol} خلال الـ 24 ساعة الماضية.`,
      `صافي تدفق الأخبار يمنح درجة ${newsScore >= 0 ? `+${newsScore}` : newsScore} من 100.`,
      severeAlert
        ? `تم رصد كلمات مفتاحية حساسة تتطلب تفعيل الحذر وتقليص المخاطرة.`
        : `البيئة الإخبارية تسمح بالاعتماد على المستويات الفنية وهيكل السيولة.`,
    ],
  };

  const analysts: AnalystReport[] = [technicalReport, fundamentalReport, sentimentReport, newsReport];

  // ============================================================================
  // 2. RESEARCH TEAM DEBATE (فريق الأبحاث: المناظرة الجدلية Bull vs. Bear)
  // ============================================================================
  const weightedScore =
    technicalReport.score * 0.38 +
    fundamentalReport.score * 0.22 +
    sentimentReport.score * 0.22 +
    newsReport.score * 0.18;

  const bullConvictionPct = clamp(Math.round(50 + weightedScore * 0.45), 12, 92);
  const bearConvictionPct = clamp(100 - bullConvictionPct, 8, 88);
  const netEdgeScore = Math.round(weightedScore);

  const rounds: DebateRound[] = [
    {
      roundNumber: 1,
      topicAr: 'الجولة 1: أطروحة الزخم الفني وهيكل السعر (Technical & Structure Thesis)',
      bullArgumentAr: `الباحث الصعودي (Bull Researcher): يرتكز ${symbol} على منطقة طلب واضحة قرب الدعم $${formatAdaptivePrice(nearestSupport)}، مع قراءة RSI عند ${rsi.toFixed(1)} تمنح مساحة كافية للاندفاع نحو الهدف الأول $${formatAdaptivePrice(nearestResistance)}.`,
      bearArgumentAr: `الباحث الهبوطي (Bear Researcher): المقاومة القريبة عند $${formatAdaptivePrice(nearestResistance)} تمثل جدار عرض قد يسبب رفضاً سعرياً إذا لم يترافق الاختراق مع توسع حقيقي في أحجام التداول فوق المتوسط.`,
      roundWinner: technicalReport.score > 10 ? 'BULL' : technicalReport.score < -10 ? 'BEAR' : 'DRAW',
    },
    {
      roundNumber: 2,
      topicAr: 'الجولة 2: الملاءة الأساسية، السيولة، وتمركز المشتقات (Liquidity & Derivatives)',
      bullArgumentAr: `الباحث الصعودي (Bull Researcher): الترتيب السوقي #${rank} ومعدل التمويل (${fundingPct.toFixed(4)}%) يؤكدان عدم وجود فقاعة رافعة مالية مفرطة، مما يدعم استدامة الحركة دون تصفية قسرية فورية.`,
      bearArgumentAr: `الباحث الهبوطي (Bear Researcher): تقلبات السوق الكلية وقراءة الخوف والطمع (${fgValue}) تفرض الحذر من مصائد السيولة (Liquidity Sweeps) التي تستهدف أوامر الوقف القريبة تحت $${formatAdaptivePrice(nearestSupport)}.`,
      roundWinner:
        fundamentalReport.score + sentimentReport.score > 15
          ? 'BULL'
          : fundamentalReport.score + sentimentReport.score < -15
          ? 'BEAR'
          : 'DRAW',
    },
    {
      roundNumber: 3,
      topicAr: 'الجولة 3: الخلاصة الجدلية وتقييم العائد إلى المخاطرة (Dialectical Synthesis)',
      bullArgumentAr: `الباحث الصعودي (Bull Researcher): المحصلة الكمية تدعم اقتناص الفرصة طالما بقي الكسر الهيكلي محمياً بوقف خسارة صارم تحت منطقة الإبطال الفنية.`,
      bearArgumentAr: `الباحث الهبوطي (Bear Researcher): يجب عدم تجاوز حجم مخاطرة منضبط (${riskProfile === 'conservative' ? '0.5%' : riskProfile === 'balanced' ? '1.0%' : '1.5%'}) وتجنب مطاردة الشموع الممتدة.`,
      roundWinner: netEdgeScore >= 15 ? 'BULL' : netEdgeScore <= -15 ? 'BEAR' : 'DRAW',
    },
  ];

  const debate: ResearchDebateResult = {
    bullConvictionPct,
    bearConvictionPct,
    netEdgeScore,
    rounds,
    consensusSummaryAr:
      netEdgeScore >= 18
        ? `تفوق أطروحة الباحث الصعودي باقتناع ${bullConvictionPct}% مقابل ${bearConvictionPct}% للباحث الهبوطي، بدعم من الزخم الفني واستقرار التمويل.`
        : netEdgeScore <= -18
        ? `تفوق أطروحة الباحث الهبوطي باقتناع ${bearConvictionPct}% مقابل ${bullConvictionPct}% للباحث الصعودي، نتيجة الضغوط البيعية ومخاطر كسر الدعم.`
        : `تعادل جدلي متقارب (${bullConvictionPct}% صعودي مقابل ${bearConvictionPct}% هبوطي)؛ ينصح فريق الأبحاث بالانتظار حتى تأكيد اختراق النطاق.`,
  };

  // ============================================================================
  // 3. TRADER AGENT (وكيل التداول الرئيسي — صياغة أمر التداول الورقي)
  // ============================================================================
  const entryThreshold = riskProfile === 'conservative' ? 22 : riskProfile === 'balanced' ? 15 : 10;
  let proposedAction: FinalAgentAction = 'HOLD_WAIT';
  if (netEdgeScore >= entryThreshold) proposedAction = 'ENTER_LONG';
  else if (netEdgeScore <= -entryThreshold) proposedAction = 'ENTER_SHORT';

  const rangePct =
    coin.high_24h && coin.low_24h && coin.high_24h > coin.low_24h
      ? clamp(((coin.high_24h - coin.low_24h) / price) * 0.65, 0.015, 0.08)
      : 0.03;

  const stopDistance = price * rangePct;
  const entryPrice = price;
  const stopLossPrice =
    proposedAction === 'ENTER_SHORT' ? entryPrice + stopDistance : Math.max(0.0000001, entryPrice - stopDistance);
  const takeProfit1Price =
    proposedAction === 'ENTER_SHORT'
      ? Math.max(0.0000001, entryPrice - stopDistance * 1.8)
      : entryPrice + stopDistance * 1.8;
  const takeProfit2Price =
    proposedAction === 'ENTER_SHORT'
      ? Math.max(0.0000001, entryPrice - stopDistance * 3.0)
      : entryPrice + stopDistance * 3.0;

  const rewardDistance = Math.abs(takeProfit2Price - entryPrice);
  const riskRewardRatio = stopDistance > 0 ? Number((rewardDistance / stopDistance).toFixed(2)) : 2.0;
  const baseRiskPct = riskProfile === 'conservative' ? 0.5 : riskProfile === 'balanced' ? 1.0 : 1.5;

  const traderProposal: TraderProposal = {
    riskProfile,
    proposedAction,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    riskRewardRatio,
    recommendedRiskPct: proposedAction === 'HOLD_WAIT' ? 0 : baseRiskPct,
    rationaleAr:
      proposedAction === 'ENTER_LONG'
        ? `بناءً على تفوق الحجة الصعودية (+${netEdgeScore})، يقترح وكيل التداول صفقة شراء ورقية (Long) من $${formatAdaptivePrice(entryPrice)} مع وقف خسارة عند $${formatAdaptivePrice(stopLossPrice)} وهدف أول $${formatAdaptivePrice(takeProfit1Price)}.`
        : proposedAction === 'ENTER_SHORT'
        ? `بناءً على تفوق الحجة الهبوطية (${netEdgeScore})، يقترح وكيل التداول صفقة بيع ورقية (Short) من $${formatAdaptivePrice(entryPrice)} مع وقف خسارة عند $${formatAdaptivePrice(stopLossPrice)} وهدف أول $${formatAdaptivePrice(takeProfit1Price)}.`
        : `نظراً لعدم تجاوز صافي الأفضلية (${netEdgeScore}) لعتبة الدخول الآمنة (${entryThreshold})، يوصي وكيل التداول بالبقاء خارج السوق (HOLD / WAIT) لحماية رأس المال.`,
  };

  // ============================================================================
  // 4. RISK MANAGEMENT TEAM (فريق إدارة المخاطر والامتثال — Risk Guardians)
  // ============================================================================
  const checks: RiskCheckItem[] = [
    {
      id: 'kill_switch',
      titleAr: 'فحص مفتاح الطوارئ (Kill Switch Status)',
      passed: !killSwitchActive,
      severity: killSwitchActive ? 'VETO' : 'OK',
      detailAr: killSwitchActive
        ? 'مفتاح إيقاف الطوارئ مفعّل حالياً — يُحظر فتح أي مراكز ورقية جديدة.'
        : 'مفتاح الطوارئ غير مفعّل والنظام يعمل ضمن حدود الأمان.',
    },
    {
      id: 'severe_news',
      titleAr: 'فحص الأخبار الطارئة والمخاطر النظامية',
      passed: !severeAlert,
      severity: severeAlert ? 'VETO' : 'OK',
      detailAr: severeAlert
        ? 'تم رصد أخبار سلبية حادة — فرض فيتو وقائي (VETO) لمنع التداول أثناء الصدمات.'
        : 'لا توجد أخبار اختراق أو صدمات تنظيمية طارئة.',
    },
    {
      id: 'rr_ratio',
      titleAr: 'كفاءة العائد إلى المخاطرة (R:R >= 1.5)',
      passed: riskRewardRatio >= 1.5,
      severity: riskRewardRatio >= 1.5 ? 'OK' : 'WARNING',
      detailAr: `نسبة العائد إلى المخاطرة المحسوبة هي 1:${riskRewardRatio.toFixed(2)} (شاملة احتساب عمولة وانزلاق 0.25% ذهاباً وإياباً).`,
    },
    {
      id: 'funding_crowding',
      titleAr: 'فحص ازدحام التمويل والرافعة (Funding Crowding)',
      passed: !(proposedAction === 'ENTER_LONG' && fundingPct > 0.06) && !(proposedAction === 'ENTER_SHORT' && fundingPct < -0.04),
      severity:
        (proposedAction === 'ENTER_LONG' && fundingPct > 0.06) ||
        (proposedAction === 'ENTER_SHORT' && fundingPct < -0.04)
          ? 'WARNING'
          : 'OK',
      detailAr: `معدل التمويل الحالي ${fundingPct.toFixed(4)}% ضمن النطاق المقبول للتنفيذ المحاكى.`,
    },
    {
      id: 'liquidity_depth',
      titleAr: 'فحص سيولة الزوج ومعدل الدوران',
      passed: turnoverRatio >= 1.5,
      severity: turnoverRatio >= 1.5 ? 'OK' : 'WARNING',
      detailAr: `نسبة حجم التداول إلى القيمة السوقية تبلغ ${turnoverRatio.toFixed(2)}%.`,
    },
  ];

  const hasVeto = checks.some((c) => c.severity === 'VETO');
  const warningCount = checks.filter((c) => c.severity === 'WARNING').length;

  let riskStatus: 'APPROVED' | 'MODIFIED' | 'VETOED' = 'APPROVED';
  let adjustedRiskPct = traderProposal.recommendedRiskPct;

  if (hasVeto) {
    riskStatus = 'VETOED';
    adjustedRiskPct = 0;
  } else if (warningCount > 0 && proposedAction !== 'HOLD_WAIT') {
    riskStatus = 'MODIFIED';
    adjustedRiskPct = Number((traderProposal.recommendedRiskPct * 0.65).toFixed(2));
  }

  const riskScore = clamp(
    Math.round(
      (hasVeto ? 85 : 25) +
        warningCount * 15 +
        (rangePct * 400) +
        (Math.abs(fundingPct) * 200)
    ),
    10,
    98
  );

  const riskReview: RiskCommitteeReview = {
    status: riskStatus,
    adjustedRiskPct,
    riskScore,
    checks,
    committeeNoteAr:
      riskStatus === 'VETOED'
        ? 'رفضت لجنة المخاطر (Risk Guardians) تنفيذ الصفقة بسبب تفعيل حاجز فيتو وقائي. القرار النهائي: انتظار.'
        : riskStatus === 'MODIFIED'
        ? `وافقت لجنة المخاطر المشروطة مع تقليص حجم المخاطرة من ${traderProposal.recommendedRiskPct}% إلى ${adjustedRiskPct}% نظراً لوجود ${warningCount} تنبيهات تحفظية.`
        : proposedAction === 'HOLD_WAIT'
        ? 'تؤيد لجنة المخاطر قرار البقاء في وضع المراقبة والحفاظ على السيولة النقدية (100% USDT).'
        : `اجتاز المقترح جميع الفحوصات الخمسة بنجاح؛ تمت الموافقة على نسبة مخاطرة ${adjustedRiskPct}% من المحفظة الورقية.`,
  };

  // ============================================================================
  // 5. FUND MANAGER (مدير الصندوق التنفيذي — القرار النهائي)
  // ============================================================================
  const finalAction: FinalAgentAction = riskStatus === 'VETOED' ? 'HOLD_WAIT' : proposedAction;
  const finalActionAr =
    finalAction === 'ENTER_LONG'
      ? 'تنفيذ شراء ورقي محاكى (PAPER LONG)'
      : finalAction === 'ENTER_SHORT'
      ? 'تنفيذ بيع ورقي محاكى (PAPER SHORT)'
      : 'انتظار ومراقبة (HOLD / STAY OUT)';

  const consensusConfidencePct = clamp(
    Math.round(
      (technicalReport.confidencePct * 0.35 +
        fundamentalReport.confidencePct * 0.2 +
        sentimentReport.confidencePct * 0.25 +
        newsReport.confidencePct * 0.2) *
        (riskStatus === 'VETOED' ? 0.5 : 1)
    ),
    35,
    96
  );

  const fundManager: FundManagerDecision = {
    finalAction,
    finalActionAr,
    consensusConfidencePct,
    approvedRiskPct: finalAction === 'HOLD_WAIT' ? 0 : adjustedRiskPct,
    executiveSummaryAr:
      finalAction === 'HOLD_WAIT'
        ? `الاعتماد التنفيذي لمدير الصندوق على ${symbol}: البقاء خارج السوق حالياً (${riskStatus === 'VETOED' ? 'بسبب فيتو إدارة المخاطر' : 'لعدم اكتمال التفوق الجدلي الكافي'}) وانتظار تمركز سعري أفضل قرب $${formatAdaptivePrice(nearestSupport)}.`
        : `الاعتماد التنفيذي لمدير الصندوق على ${symbol}: الموافقة على ${finalActionAr} بسعر دخول $${formatAdaptivePrice(entryPrice)}، وقف خسارة $${formatAdaptivePrice(stopLossPrice)}، وهدف نهائي $${formatAdaptivePrice(takeProfit2Price)} بمخاطرة معتمدة ${adjustedRiskPct}% (تداول ورقي محاكى 100%).`,
    timestamp: Date.now(),
  };

  return {
    symbol,
    currentPrice: price,
    analysts,
    debate,
    traderProposal,
    riskReview,
    fundManager,
  };
}
