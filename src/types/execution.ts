// TypeScript interfaces and models for Execution & Liquidity Module
// (دفتر الأوامر، محاكي وحاسبة الانزلاق، بوابة الجدوى، تجزئة الأوامر، وتتبع الصفقات الكبيرة وCVD)

export interface OrderBookLevel {
  price: number;
  qty: number;
  totalUSDT: number;
  cumulativeUSDT: number;
  isWall?: boolean; // Over 5x nearby level average
}

export interface OrderBookData {
  symbol: string;
  timestamp: number;
  dataAgeSeconds: number;
  bestBid: number;
  bestAsk: number;
  spreadDollars: number;
  spreadPercent: number;
  imbalance1Percent: number; // Bid vol / (Bid vol + Ask vol) within 1% [0 to 1]
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  source: string;
  isStale: boolean;
}

export interface SlippageTierCalculation {
  dollarAmount: number;
  avgExecutionPrice: number;
  slippageDollars: number;
  slippagePercent: number;
  levelsConsumed: number;
  liquidityTier: 'عالية' | 'متوسطة' | 'ضعيفة';
  isInsufficientLiquidity: boolean;
}

export interface ExecutionQualityResult {
  symbol: string;
  currentPrice: number;
  inputAmountDollars: number;
  orderType: 'market' | 'limit';
  orderSide: 'buy' | 'sell';
  makerFeePercent: number;
  takerFeePercent: number;
  bnbDiscountActive: boolean;

  // Slippage Calculation
  avgExecutionPrice: number;
  slippagePercent: number;
  slippageDollars: number;
  levelsConsumed: number;
  liquidityClassification: 'عالية' | 'متوسطة' | 'ضعيفة';
  liquidityWarning?: string;
  isLiquidityInsufficient: boolean;

  // Round-trip Full Cost
  entryFeeDollars: number;
  exitFeeDollars: number;
  entrySlippageDollars: number;
  exitSlippageDollars: number;
  totalRoundTripCostDollars: number;
  totalRoundTripCostPercent: number;
  fundingRateCostEstimate?: number;

  // Breakeven Hurdle
  breakevenHurdlePercent: number; // e.g. 0.62% price move needed to break even
  breakevenPriceLevel: number;

  // Pre-configured Quick Tiers Table
  quickTiers: SlippageTierCalculation[];

  // Edge vs Cost Gate
  gatePassed: boolean;
  gateRatio: number; // Expected target reward / Round-trip cost
  gateWarning?: string;
  gateSuggestion?: string;
}

export interface OrderSlicingSlice {
  sliceNumber: number;
  amountDollars: number;
  targetPriceEstimate: number;
  recommendedOrderType: 'limit' | 'market';
  suggestedOffsetMinutes: number;
  timeLabel: string;
  note: string;
}

export interface OrderSlicingPlan {
  totalAmountDollars: number;
  slicesCount: number;
  timeframeMinutes: number;
  singleOrderSlippagePercent: number;
  singleOrderSlippageDollars: number;
  slicedEstimatedSlippagePercent: number;
  slicedEstimatedSlippageDollars: number;
  estimatedSlippageSavingsDollars: number;
  priceDriftRisk: 'منخفض' | 'متوسط' | 'مرتفع';
  priceDriftRiskExplanation: string;
  slices: OrderSlicingSlice[];
}

export interface LargeTradeItem {
  id: string;
  time: number;
  dateStr: string;
  price: number;
  qty: number;
  valueUSDT: number;
  side: 'buy' | 'sell';
  isBuyerMaker: boolean;
}

export interface AbnormalActivityData {
  symbol: string;
  currentPrice: number;
  candleVolumeVsAvg: number; // e.g. 3.4x
  isVolumeSurge3x: boolean;
  isVolumeSurge5x: boolean;
  surgeClassification: 'ارتفاع حجم مع اختراق صاعد' | 'ارتفاع حجم مع رفض سعري (ذيل طويل)' | 'ارتفاع حجم بلا حركة (امتصاص محتمل)' | 'نشاط حجم طبيعي';
  surgeDetails: string;

  // Large Trades Flow (>100k$ or dynamic)
  largeTrades: LargeTradeItem[];
  largeBuyVolumeUSDT: number;
  largeSellVolumeUSDT: number;
  largeTradeBalanceRatio: number; // buy / (buy + sell)
  largeTradeDominance: 'ضغط شراء مرتفع نسبياً' | 'ضغط بيع مرتفع نسبياً' | 'توازن نسبي';

  // Cumulative Volume Delta (CVD)
  cvdNetDelta: number;
  cvdTrend: 'مشترون نشطون' | 'بائعون نشطون' | 'حيادي';
  cvdPoints: { time: string; delta: number; price: number }[];

  hasAbnormalActivity: boolean;
  abnormalBadgeLabel: string;
  mandatoryNotice: string; // "إشارة للانتباه وليست دليلاً على نوايا طرف معين"
}

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  percentOfTotal: boolean;
  isValueArea: boolean; // 70% Value Area
}

export interface VolumeProfileResult {
  symbol: string;
  pocPrice: number; // Point of Control (Highest traded price volume)
  valueAreaHigh: number; // VAH
  valueAreaLow: number; // VAL
  vwapDaily: number;
  vwapWeekly: number;
  vwapMonthly: number;
  vwapStdUpper1: number;
  vwapStdLower1: number;
  vwapStdUpper2: number;
  vwapStdLower2: number;
  levels: VolumeProfileLevel[];
  interpretation: string;
}

export interface UserActualExecutionMetrics {
  totalAnalyzedTrades: number;
  averageActualSlippagePercent: number;
  averageActualSlippageDollars: number;
  worstTradeSlippage: {
    symbol: string;
    tradeDate: string;
    slippagePercent: number;
    plannedPrice: number;
    executedPrice: number;
    lossDollars: number;
  } | null;
  marketOrderAvgSlippagePercent: number;
  limitOrderAvgSlippagePercent: number;
  bestExecutionHours: string[];
  costShareOfGrossProfitPercent: number; // e.g. "أكلت الرسوم والانزلاق 27% من أرباحك"
  executionInsights: string[];
}
