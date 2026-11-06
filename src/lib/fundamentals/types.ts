// Fundamental Screener: Core Type Definitions
// Isolated research module types.

export type DataAvailability = 'available' | 'stale' | 'insufficient' | 'conflicting';

export interface SourceMeta {
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string; // ISO 8601
  timestamp: number;
  isStale: boolean; // > 7 days old
}

export interface MetricValue<T = number | string | boolean> {
  value: T | null;
  identifier: string;
  primarySource: SourceMeta;
  secondarySource?: SourceMeta;
  secondaryValue?: T | null;
  hasDiscrepancy?: boolean; // > 10% discrepancy between sources
  discrepancyNote?: string;
  status: DataAvailability;
}

export type CriterionResult = 'pass' | 'partial' | 'fail' | 'insufficient';

export interface EvaluatedCriterion {
  id: string;
  category: 'tokenomics' | 'revenue' | 'users' | 'development' | 'security' | 'team';
  nameAr: string;
  nameEn: string;
  weight: number; // Max points allocated to this criterion
  earnedPoints: number; // 0, weight/2, or weight
  result: CriterionResult;
  isQualitative: boolean;
  thresholdStr: string;
  actualValueStr: string;
  metric?: MetricValue<any>;
  notesAr: string;
  source?: SourceMeta;
}

export interface CategoryScore {
  category: 'tokenomics' | 'revenue' | 'users' | 'development' | 'security' | 'team';
  titleAr: string;
  maxPoints: number;
  earnedPoints: number;
  availableWeight: number; // Sum of weights with available data
  coveragePct: number;
  criteria: EvaluatedCriterion[];
}

export interface ExclusionRuleResult {
  ruleId: string;
  nameAr: string;
  descriptionAr: string;
  isTriggered: boolean;
  valueStr: string;
  reasonAr?: string;
  source?: SourceMeta;
}

export type QualityClassification =
  | 'high_quality' // 90-100: جودة عالية وفق البروتوكول
  | 'strong_watch' // 80-89: قوية وتستحق المتابعة
  | 'good_with_risks' // 70-79: جيدة مع مخاطر
  | 'speculative' // 60-69: مضاربية أكثر منها استثمارية
  | 'below_threshold' // <60: دون حد الجودة للمدى الطويل
  | 'indeterminate' // Coverage < 60%: غير قابل للحكم
  | 'out_of_scope'; // خارج نطاق الملف الحالي

export interface HiddenRiskItem {
  category: 'unlocks' | 'centralization' | 'regulation' | 'competition' | 'revenue' | 'dependency';
  severity: 'high' | 'medium' | 'low';
  titleAr: string;
  descriptionAr: string;
  evidence: string;
  sourceUrl?: string;
}

export interface ProtocolDefinition {
  profileId: string;
  profileNameAr: string;
  profileNameEn: string;
  version: string;
  sha256Hash: string;
  targetSector: string;
  categories: {
    id: 'tokenomics' | 'revenue' | 'users' | 'development' | 'security' | 'team';
    titleAr: string;
    weight: number;
  }[];
  passScoreThreshold: number; // default: 70
  minCoverageThreshold: number; // default: 60%
  disclaimerAr: string;
}

export interface FundamentalEvaluationReport {
  symbol: string;
  coinId: string;
  coinName: string;
  sector: string;
  isOutOfScope: boolean;
  outOfScopeReasonAr?: string;
  evaluationTimestamp: number;
  evaluationDateStr: string;
  protocolVersion: string;
  protocolHash: string;

  // Final deterministic outcomes
  finalScore: number; // 0 to 100
  coveragePct: number; // 0% to 100%
  hasPassed: boolean; // No exclusion AND Score >= 70 AND Coverage >= 60%
  classification: QualityClassification;
  classificationLabelAr: string;

  // Breakdowns
  categoryScores: CategoryScore[];
  exclusions: ExclusionRuleResult[];
  hasAnyExclusion: boolean;

  // Highlights computed deterministically
  topStrengths: EvaluatedCriterion[]; // Top 3 by earnedPoints / weight
  topWeaknesses: EvaluatedCriterion[]; // Bottom 3 by earnedPoints / weight
  hiddenRisks: HiddenRiskItem[];

  // Counts
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  insufficientCount: number;
  totalCriteriaCount: number;

  // Top items summary
  primaryStrengthAr: string;
  primaryWeaknessAr: string;
  topRiskToMonitorAr: string;

  // Mandatory disclaimer
  mandatoryDisclaimerAr: string;
}

// Stage C: Mandatory Manual Review Checklist
export interface StageCChecklist {
  coinId: string;
  symbol: string;
  reviewedAt: string;
  reviewerNotes: string;
  decision: 'follow' | 'drop' | 'recheck_later';
  recheckDays?: number;
  isComplete: boolean;

  // 5 verified items
  top5NumbersVerified: boolean;
  unlockScheduleVerifiedFromDocs: boolean;
  latestGovernanceProposalsChecked: boolean;
  recentSecurityIncidentsAudited: boolean;
  holderConcentrationVerifiedOnExplorer: boolean;
}

// Stage D: Technical Context (Research Only)
export interface StageDTechnicalContext {
  symbol: string;
  historyYears: number;
  isSupportedByStatisticalGate: boolean; // Has yellow or green status in Gatekeeper
  gateStatus: 'none' | 'paper_only' | 'approved';
  isResearchOnly: boolean;
  disclaimerAr: string;
  pivotLevels?: {
    pivot: number;
    r1: number;
    r2: number;
    s1: number;
    s2: number;
    method: 'pivot_atr_standard';
  };
  allowedPositionSizing: boolean; // Strictly false if < 3 years or not supported by Gate
}
