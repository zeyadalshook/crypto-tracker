import { SourceMeta, MetricValue } from '../types';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function createSourceMeta(sourceName: string, sourceUrl: string, fetchedTimestamp = Date.now()): SourceMeta {
  const isStale = Date.now() - fetchedTimestamp > SEVEN_DAYS_MS;
  return {
    sourceName,
    sourceUrl,
    fetchedAt: new Date(fetchedTimestamp).toISOString(),
    timestamp: fetchedTimestamp,
    isStale,
  };
}

/**
 * Reconciles two numerical values from different sources.
 * If discrepancy > 10%, records both values and specifies the priority selection rule.
 */
export function reconcileNumericMetric(
  identifier: string,
  primaryVal: number | null | undefined,
  primarySource: SourceMeta,
  secondaryVal: number | null | undefined,
  secondarySource?: SourceMeta,
  priorityRuleAr?: string
): MetricValue<number> {
  if (primaryVal === null || primaryVal === undefined || isNaN(primaryVal)) {
    if (secondaryVal !== null && secondaryVal !== undefined && !isNaN(secondaryVal) && secondarySource) {
      return {
        value: secondaryVal,
        identifier,
        primarySource: secondarySource,
        status: secondarySource.isStale ? 'stale' : 'available',
      };
    }
    return {
      value: null,
      identifier,
      primarySource,
      status: 'insufficient',
    };
  }

  // If secondary is not provided, return primary
  if (secondaryVal === null || secondaryVal === undefined || isNaN(secondaryVal) || !secondarySource) {
    return {
      value: primaryVal,
      identifier,
      primarySource,
      status: primarySource.isStale ? 'stale' : 'available',
    };
  }

  // Calculate relative discrepancy percentage
  const avg = (Math.abs(primaryVal) + Math.abs(secondaryVal)) / 2;
  const diffPct = avg > 0 ? (Math.abs(primaryVal - secondaryVal) / avg) * 100 : 0;

  if (diffPct > 10) {
    const defaultRule = priorityRuleAr || `اعتماد المصدر الرئيسي (${primarySource.sourceName}) وفق مصفوفة أولوية البيانات المعتمدة.`;
    return {
      value: primaryVal,
      identifier,
      primarySource,
      secondarySource,
      secondaryValue: secondaryVal,
      hasDiscrepancy: true,
      discrepancyNote: `تعارض بنسبة ${diffPct.toFixed(1)}% بين المصدرين (${primarySource.sourceName}: ${primaryVal.toLocaleString()} مقابل ${secondarySource.sourceName}: ${secondaryVal.toLocaleString()}). قاعدة الاختيار: ${defaultRule}`,
      status: 'conflicting',
    };
  }

  return {
    value: primaryVal,
    identifier,
    primarySource,
    secondarySource,
    secondaryValue: secondaryVal,
    hasDiscrepancy: false,
    status: primarySource.isStale ? 'stale' : 'available',
  };
}
