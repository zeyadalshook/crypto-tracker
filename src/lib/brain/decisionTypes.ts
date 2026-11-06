// Types for Autonomous Trading Brain Decision Engine (محرك اتخاذ القرار للعقل المدبر)

export type BrainDecisionType = 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT' | 'STAY_OUT';

export interface IndicatorGroupConfluence {
  nameAr: string;
  nameEn: string;
  agreed: boolean;
  scoreContribution: number; // positive for bullish, negative for bearish
  detailsAr: string;
}

export interface CoinAnalysisInput {
  symbol: string;
  currentPrice: number;
  signalScore: number;                // -100 to +100
  mtfAlignmentPct: number;            // 0% to 100% (alignment of 15m, 1h, 4h, 1d)
  fundamentalScore: number;           // 0 to 100
  fearGreedValue: number;             // 0 to 100
  fundingRatePct: number;             // e.g. 0.01% (per 8h)
  openInterestChange24hPct: number;   // e.g. +4.5%
  volatilityAtr: number;              // ATR in USD
  volatilityAtrPct: number;           // ATR as % of current price
  regime: 'bull' | 'bear' | 'chop' | 'highVol' | 'lowVol';
  nearestSupportPrice: number;
  nearestResistancePrice: number;
  rsiValue?: number;
  macdHistogram?: number;
  ema20?: number;
  ema50?: number;
  hasOpenPosition?: boolean;
  openPositionSide?: 'long' | 'short';
  openPositionEntryPrice?: number;
  openPositionSlPrice?: number;
  openPositionPnlR?: number;
  killSwitchActive?: boolean;
  riskGuardHalted?: boolean;
  bidAskSpreadPct?: number;           // Bid-ask spread as % of mid price
  newsSentimentScore?: number;        // -100 to +100
  hasSevereNegativeNews?: boolean;    // Strong negative breaking news veto
  newsHeadlineAr?: string;            // Relevant news headline in Arabic
  isDataUnavailable?: boolean;        // True if live market data could not be retrieved
}

export interface DecisionEngineConfig {
  minConfidence: number;              // Default: 60 (out of 100)
  minConfluenceGroups: number;        // Default: 3 independent groups
  defaultAtrSlMultiplier: number;     // Default: 2.0 * ATR
  defaultAtrTp1Multiplier: number;    // Default: 3.0 * ATR (1.5R)
  defaultAtrTp2Multiplier: number;    // Default: 5.0 * ATR (2.5R)
  maxSpreadAllowedPct: number;        // Default: 0.25%
}

export interface BrainDecision {
  coin: string;
  type: BrainDecisionType;
  confidence: number;                 // 0 to 100
  currentPrice: number;
  entryPrice?: number;
  stopLossPrice?: number;
  takeProfit1Price?: number;
  takeProfit2Price?: number;
  riskRewardRatio?: number;
  riskDistancePct?: number;
  target1DistancePct?: number;
  confluenceGroups: string[];         // Names of agreeing groups in Arabic
  confluenceCount: number;
  indicatorGroups: IndicatorGroupConfluence[];
  reasoningAr: string;                // Coherent, detailed Arabic reasoning paragraph
  timestamp: number;
  factors: {
    signalScore: number;
    mtfAlignmentPct: number;
    fundamentalScore: number;
    fearGreedValue: number;
    fundingRatePct: number;
    regime: string;
    atrUsd: number;
    distToSupportPct: number;
    distToResistancePct: number;
    bidAskSpreadPct?: number;
  };
  blockedReasonAr?: string;           // Populated if decision would have been ENTER but was blocked
  isActionable: boolean;              // True only if valid ENTER/EXIT and not blocked
  isDataUnavailable?: boolean;
}
