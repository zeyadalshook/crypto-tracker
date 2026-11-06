import { FundamentalEvaluationReport } from '../types';

export interface CorrelationAuditResult {
  sampleSize: number;
  pearsonR: number;
  rSquared: number;
  isOverlyCorrelated: boolean; // r > 0.8 means score is just reflecting market cap
  verdictAr: string;
  dataPoints: { symbol: string; score: number; logMarketCap: number }[];
}

export function computeScoreMarketCapCorrelation(
  reportsWithCap: { report: FundamentalEvaluationReport; marketCapUsd: number }[]
): CorrelationAuditResult {
  const valid = reportsWithCap.filter((item) => item.marketCapUsd > 0 && !item.report.isOutOfScope);
  const n = valid.length;

  if (n < 3) {
    return {
      sampleSize: n,
      pearsonR: 0,
      rSquared: 0,
      isOverlyCorrelated: false,
      verdictAr: 'عينة غير كافية لحساب معامل الارتباط (< 3 عملات).',
      dataPoints: [],
    };
  }

  // Use log(MarketCap) because market caps are power-law distributed
  const points = valid.map((v) => ({
    symbol: v.report.symbol,
    score: v.report.finalScore,
    logMarketCap: Math.log10(v.marketCapUsd),
  }));

  const meanX = points.reduce((s, p) => s + p.score, 0) / n;
  const meanY = points.reduce((s, p) => s + p.logMarketCap, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (const p of points) {
    const dx = p.score - meanX;
    const dy = p.logMarketCap - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  const pearsonR = den > 0 ? Number((num / den).toFixed(4)) : 0;
  const rSquared = Number((pearsonR * pearsonR).toFixed(4));
  const isOverlyCorrelated = pearsonR > 0.8;

  let verdictAr = '';
  if (isOverlyCorrelated) {
    verdictAr = `ارتباط مفرط بالقيمة السوقية (r = ${pearsonR} > 0.8). الدرجة تعكس حجم المشروع أكثر من جودة الأساسيات.`;
  } else {
    verdictAr = `استقلالية صحية عن القيمة السوقية (r = ${pearsonR} ≤ 0.8). التقييم يضيف معلومات بنيوية مستقلة.`;
  }

  return {
    sampleSize: n,
    pearsonR,
    rSquared,
    isOverlyCorrelated,
    verdictAr,
    dataPoints: points,
  };
}
