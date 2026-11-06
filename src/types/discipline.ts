// Types for Trading Discipline Module: Journal, Pre-Trade Checklist, and Daily Loss Lockout

export interface DisciplineCustomRule {
  id: string;
  ruleText: string;
  category: string;
  reason?: string;
  enabled: boolean;
}

export interface DisciplineSettings {
  capital: number; // e.g. 10000
  maxRiskPerTradePct: number; // e.g. 1.0%
  dailyLossLimitPct: number; // e.g. 3.0%
  weeklyLossLimitPct: number; // e.g. 6.0%
  maxOpenPositions: number; // e.g. 3
  maxTradesPerDay: number; // e.g. 5
  minRiskReward: number; // e.g. 1.5 (1:1.5)
  consecutiveLossLimit: number; // e.g. 3
  coolOffHours: number; // e.g. 4
  timezone: 'local' | 'utc';

  // Anti-rage / Anti-tilt 24-hour delayed change for limits
  pendingSettingsChange?: {
    settings: Partial<DisciplineSettings>;
    requestTimestamp: number;
    effectiveAt: number; // 24 hours later
  } | null;

  // Active lock states
  lockoutActiveUntil?: number | null; // midnight timestamp
  lockoutReason?: 'daily_limit' | 'weekly_limit' | 'consecutive_losses' | null;
  lockoutReflection?: string | null;

  // Custom checklist rules derived from AI coach or user
  customRules: DisciplineCustomRule[];

  // Binance Read-Only Integration
  binanceReadOnlyKey?: string;
  binanceConnected?: boolean;
}

export interface ChecklistResponses {
  trendAligned1D: boolean;
  noUpcomingNews24h: boolean;
  partOfPrePlan: boolean;
  isRevengeTrade: boolean;
  customRuleChecks: Record<string, boolean>;
}

export interface JournalTradeExtended {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  positionValueUSDT: number;
  entryDate: string;
  exitDate?: string;

  // Discipline & Pre-trade fields
  stopLoss: number; // MANDATORY
  takeProfit1: number; // MANDATORY
  takeProfit2?: number;
  riskAmountUSDT: number;
  riskRewardRatio: number; // e.g. 2.1
  resultInR?: number; // e.g. +2.1R or -1.0R

  entryReason: string;
  emotionBeforeTrade: 'calm' | 'excited' | 'anxious' | 'revenge' | 'fatigued';
  followedPlan: boolean;
  notes?: string;
  exitNotes?: string;
  executionRating?: number; // 1 to 5 stars (execution quality, not result)
  tags: string[];

  checklistResponses: ChecklistResponses;
  chartScreenshotUrl?: string;
  exitScreenshotUrl?: string;

  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed';
}

export interface DailyDisciplineState {
  todayDateStr: string;
  todayRealizedPnL: number;
  todayUnrealizedPnL: number;
  todayTotalPnL: number;
  todayTradesCount: number;
  todayLossLimitDollars: number;
  dailyLossPercentReached: number; // 0 to 100%+
  isNearLimitWarning: boolean; // >= 70%
  isLockedOut: boolean; // >= 100%
  lockoutExpiresAt: number | null;
  lockoutType: 'daily' | 'weekly' | 'consecutive' | null;
  consecutiveLosses: number;
  openTradesCount: number;
}

export interface WeeklyReviewData {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalPnL: number;
  tradesCount: number;
  winRate: number;
  disciplineScore: number;
  bestTradeId?: string;
  bestTradeReason?: string;
  worstTradeId?: string;
  worstTradeReason?: string;
  nextWeekGoal: string;
  bestDecisionReflection: string;
  mistakeAvoidReflection: string;
  createdAt: string;
}

export interface AIJournalAnalysisResult {
  lossPatterns: { title: string; evidence: string; detail: string }[];
  bestConditions: { title: string; evidence: string; detail: string }[];
  executionFlaws: { flaw: string; occurrences: string }[];
  suggestedRules: { id: string; ruleText: string; category: string; reason: string }[];
  summary: string;
}
