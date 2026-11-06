import { StageDTechnicalContext } from '../types';

export interface TechnicalInputData {
  symbol: string;
  historyYears: number; // e.g. 5.5 years
  high24h: number;
  low24h: number;
  closePrice: number;
  atr14?: number;
  hasStatisticalGateApproval?: boolean; // Yellow (paper_only) or Green (approved)
  gateStatus?: 'none' | 'paper_only' | 'approved';
}

/**
 * Stage D: Technical Research Context
 * Generates research-only Pivot/ATR zones without price prediction.
 * Strictly checks statistical verification status.
 */
export function buildStageDTechnicalContext(data: TechnicalInputData): StageDTechnicalContext {
  const isHistoryUnder3Years = data.historyYears < 3.0;
  const isGateSupported =
    data.hasStatisticalGateApproval === true ||
    data.gateStatus === 'approved' ||
    data.gateStatus === 'paper_only';

  const isSupportedByStatisticalGate = !isHistoryUnder3Years && isGateSupported;

  // Pivot Point calculation (Standard Floor Pivot)
  const p = (data.high24h + data.low24h + data.closePrice) / 3;
  const r1 = 2 * p - data.low24h;
  const s1 = 2 * p - data.high24h;
  const r2 = p + (data.high24h - data.low24h);
  const s2 = p - (data.high24h - data.low24h);

  let disclaimerAr =
    'مناطق ارتكاز فنية (Pivot/ATR) لأغراض البحث فقط. لا تشكل توقعاً للسعر ولا أمراً تنفيذياً. أي دخول حقيقي يخضع حصراً للبوابة الإحصائية وإدارة المخاطر.';

  if (!isSupportedByStatisticalGate) {
    if (isHistoryUnder3Years) {
      disclaimerAr =
        'غير مدعومة بالتحقق الإحصائي (تاريخ العملة أقل من 3 سنوات). يُمنع اقتراح أحجام الصفقات أو إصدار أوامر تداول.';
    } else {
      disclaimerAr =
        'غير مدعومة بالتحقق الإحصائي (لا توجد استراتيجية معتمدة بصفة 🟢 أو 🟡 في البوابة الإحصائية لهذا الأصل). يُمنع اقتراح أحجام الصفقات أو إصدار أوامر تداول.';
    }
  }

  return {
    symbol: data.symbol,
    historyYears: Number(data.historyYears.toFixed(1)),
    isSupportedByStatisticalGate,
    gateStatus: data.gateStatus || 'none',
    isResearchOnly: true,
    disclaimerAr,
    allowedPositionSizing: isSupportedByStatisticalGate,
    pivotLevels: {
      pivot: Number(p.toFixed(2)),
      r1: Number(r1.toFixed(2)),
      r2: Number(r2.toFixed(2)),
      s1: Number(s1.toFixed(2)),
      s2: Number(s2.toFixed(2)),
      method: 'pivot_atr_standard',
    },
  };
}
