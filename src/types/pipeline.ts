// TypeScript interfaces for One-Click Full Analysis Pipeline (خط إنتاج التحليل الشامل بضغطة واحدة)

import { StatisticalEvidence, StrategyGateScorecard } from './evidence';
import { TradeRecord, BacktestSimulationOutput } from '../utils/backtestEngine';

export type PipelineAnalysisLevel = 'quick' | 'balanced' | 'deep';
export type PipelineTimeRange = '1y' | '3y' | '5y' | 'all';
export type PipelineTimeframe = '1h' | '4h' | '1d';

export interface PipelineConfig {
  symbol: string;
  level: PipelineAnalysisLevel;
  range: PipelineTimeRange;
  timeframes: PipelineTimeframe[];
  maxDrawdownLimitPct: number; // default: 30%
  ruinTargetPct: number;       // default: 1%
  seed: number;                // mulberry32 seed (saved with report)
}

export type PipelineStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface PipelineProgress {
  currentStage: PipelineStage;
  stageNameAr: string;
  stageProgressPct: number;     // 0 - 100
  overallProgressPct: number;   // 0 - 100
  survivorsCount: number;
  testedCombinationsCount: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  statusMessageAr: string;
  isPaused: boolean;
  isCancelled: boolean;
  completedStages: boolean[];
}

export interface SplitData {
  trainCandles: any[];      // 60%
  validationCandles: any[]; // 20%
  finalHoldoutCandles: any[]; // 20% (strictly protected until Stage 4)
  totalCandlesCount: number;
  startDate: string;
  endDate: string;
  isShortHistoryWarning: boolean; // < 2 years
  isLowLiquidityWarning: boolean;
}

export interface ParameterGridTrial {
  trialId: string;
  strategyId: string;
  strategyName: string;
  timeframe: PipelineTimeframe;
  params: Record<string, number | string>;
  trainTradesCount: number;
  trainExpectancyR: number;
  trainProfitFactor: number;
  trainMaxDrawdownPct: number;
  isSurvivor: boolean;
  pruneReasonAr?: string;
}

export interface RefinedCandidate {
  candidateId: string;
  strategyId: string;
  strategyName: string;
  timeframe: PipelineTimeframe;
  params: Record<string, number | string>;
  trainExpectancyR: number;
  validationExpectancyR: number;
  trainWinRate: number;
  validationWinRate: number;
  trainMaxDrawdownPct: number;
  validationMaxDrawdownPct: number;
  degradationPct: number; // (Train - Val) / Train
  passedValidation: boolean;
}

export interface HeavyCheckCandidate extends RefinedCandidate {
  neighborhoodRobustnessPct: number; // +/- 15% parameter perturbation stability
  bootstrapProbPositivePct: number;  // 5,000 resamples P(E[R] > 0)
  bootstrapExpectedMaxDdR: number;
  monteCarloRuinProbabilityPct: number; // 10,000 paths ruin risk
  bestThreeRemovedExpectancyR: number;  // Expectancy after deleting top 3 windfall trades
  yearlyConsistencyPct: number;         // % of profitable calendar years
  regimesWinRate: Record<string, number>;
  deflatedSharpeRatio: number;          // DSR correcting for multiple trials bias
}

export interface FinalEvaluatedCandidate extends HeavyCheckCandidate {
  finalHoldoutExpectancyR: number;
  finalHoldoutTradesCount: number;
  finalHoldoutWinRate: number;
  finalHoldoutMaxDrawdownPct: number;
  oosFinalUsedCount: number;            // strictly 1 for single tested candidate, 0 for others
  testedOnHoldout?: boolean;            // true only for single pre-selected candidate
  oosStatusLabelAr?: string;            // 'تم الاختبار (مرة واحدة)' or 'لم تُختبر على العينة المحجوبة'
  gateStatus: 'approved' | 'paper_only' | 'rejected';
  gateScore: number;
  gateReasonsAr: string[];
  recommendedRiskPct: number;
  robustnessRankScore: number;          // composite stability ranking
  annualizedReturnPct: number;
  tStat: number;
  pValue: number;
}

export interface BenchmarkComparison {
  strategyFinalCapital: number;
  strategyReturnPct: number;
  strategyMaxDrawdownPct: number;
  buyAndHoldReturnPct: number;
  buyAndHoldMaxDrawdownPct: number;
  dcaReturnPct: number;
  dcaMaxDrawdownPct: number;
}

export interface FunnelStageStats {
  stageNumber: number;
  stageNameAr: string;
  testedCount: number;
  survivorsCount: number;
  primaryPruneReasonAr: string;
}

export interface FullAnalysisReport {
  reportId: string;
  generatedAt: number;
  config: PipelineConfig;
  symbol: string;
  timeframe: string;
  seed: number;
  totalDurationSeconds: number;
  stageDurationsMs: Record<string, number>;
  holdoutDataAccessCount?: number;
  
  // 1. Executive Summary Sentence
  executiveSummaryAr: string;
  verdictType: 'approved_found' | 'paper_candidate_only' | 'all_rejected' | 'exploratory_only';

  // 2. Proposed Setup Card
  proposedSetup: {
    hasApprovedSetup: boolean;
    strategyName: string;
    params: Record<string, number | string>;
    timeframe: string;
    recommendedRiskPct: number;
    riskRationaleAr: string;
    stopLossDescAr: string;
    takeProfitDescAr: string;
    gateStatusLabelAr: string;
    gateBadgeColor: string;
  } | null;

  // 3. Top Candidates Table
  topCandidates: FinalEvaluatedCandidate[];

  // 4. Benchmark & Curves
  benchmark: BenchmarkComparison;
  equityCurve: {
    date: string;
    strategyEquity: number;
    bnhEquity: number;
    dcaEquity: number;
    phase: 'train' | 'validation' | 'final_test';
  }[];
  monteCarloFan: {
    percentile95: number[];
    percentile75: number[];
    median: number[];
    percentile25: number[];
    percentile5: number[];
  };

  // 5. Funnel Pruning Stats
  funnelPruning: FunnelStageStats[];
  totalTrialsLogged: number;

  // 6. Year & Regime Breakdowns
  yearlyBreakdown: {
    year: number;
    strategyReturn: number;
    bnhReturn: number;
    winRate: number;
  }[];
  regimeBreakdown: {
    regimeName: string;
    tradesCount: number;
    expectancyR: number;
    winRate: number;
  }[];

  // 7. Automatic Warnings
  warningsAr: string[];

  // Legal Notice
  legalDisclaimerAr: string;
}
