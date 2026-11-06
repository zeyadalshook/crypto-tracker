import { FundamentalEvaluationReport } from '../types';

export interface EvaluationSnapshot {
  id: string;
  symbol: string;
  timestamp: number;
  report: FundamentalEvaluationReport;
  reEvaluationRequired: boolean;
  reEvaluationReasons: string[];
}

export class SnapshotStore {
  private snapshots: Map<string, EvaluationSnapshot> = new Map();

  public saveSnapshot(report: FundamentalEvaluationReport): EvaluationSnapshot {
    const id = `snap-${report.symbol}-${report.evaluationTimestamp}`;
    const snap: EvaluationSnapshot = {
      id,
      symbol: report.symbol,
      timestamp: report.evaluationTimestamp,
      report,
      reEvaluationRequired: false,
      reEvaluationReasons: [],
    };
    this.snapshots.set(report.symbol, snap);
    return snap;
  }

  public getSnapshot(symbol: string): EvaluationSnapshot | null {
    return this.snapshots.get(symbol) || null;
  }

  public checkReEvaluationNeeds(
    saved: EvaluationSnapshot,
    currentReport: FundamentalEvaluationReport
  ): { needsReEvaluation: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const now = Date.now();
    const daysSince = (now - saved.timestamp) / (24 * 3600 * 1000);

    // 1. Age >= 90 days
    if (daysSince >= 90) {
      reasons.push(`مرور أكثر من 90 يوماً على التقييم الأخير (${daysSince.toFixed(0)} يوماً).`);
    }

    // 2. Score drop >= 10 points
    const scoreDiff = saved.report.finalScore - currentReport.finalScore;
    if (scoreDiff >= 10) {
      reasons.push(`انخفاض الدرجة بمقدار ${scoreDiff.toFixed(1)} نقطة (من ${saved.report.finalScore} إلى ${currentReport.finalScore}).`);
    }

    // 3. New exclusion triggered
    if (!saved.report.hasAnyExclusion && currentReport.hasAnyExclusion) {
      reasons.push('تفعيل قاعدة استبعاد حرجة جديدة لم تكن موجودة سابقاً.');
    }

    // 4. Protocol version or hash change
    if (saved.report.protocolHash !== currentReport.protocolHash) {
      reasons.push(`تحديث نسخة أو مواصفة بروتوكول التقييم (${saved.report.protocolVersion} -> ${currentReport.protocolVersion}).`);
    }

    return {
      needsReEvaluation: reasons.length > 0,
      reasons,
    };
  }
}

export const snapshotStore = new SnapshotStore();
