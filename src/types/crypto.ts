export interface OHLCV {
  time: number | string; // unix timestamp in seconds or 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d?: number;
  price_change_percentage_14d?: number;
  price_change_percentage_30d?: number;
  price_change_percentage_1y?: number;
  price_change_percentage_ytd?: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  category?: string;
  sentiment_votes_up_percentage?: number;
  sentiment_votes_down_percentage?: number;
  data_sources?: string[];
  last_updated: string;
}

export interface FearAndGreedHistoricalItem {
  value: number;
  classification_ar: string;
  date: string;
  timestamp: string;
}

export interface FearAndGreedData {
  value: number; // 0 - 100
  classification: string;
  classification_ar: string; // "خوف شديد", "خوف", "حياد", "طمع", "طمع شديد"
  timestamp: string;
  time_until_update?: number | string;
  cached_at?: string;
  cache_expires_at?: string;
  cache_ttl_seconds?: number;
  history?: {
    yesterday?: { value: number; classification_ar: string };
    last_week?: { value: number; classification_ar: string };
    last_month?: { value: number; classification_ar: string };
    series?: FearAndGreedHistoricalItem[];
  };
}

export interface CorrelationData {
  symbols: string[];
  names: Record<string, string>;
  matrix: number[][]; // correlation values -1.0 to 1.0
  betaAgainstBtc: number;
  timeframeDays: number;
  strongestPositive: { symbol: string; value: number };
  weakestOrNegative: { symbol: string; value: number };
  cachedAt: string;
}

export interface DerivativesData {
  fundingRate: number; // e.g. 0.0001 = 0.01%
  openInterest: number; // in USD
  longShortRatio: number; // e.g. 1.25
  btcDominance: number; // e.g. 56.4%
  altseasonIndex: number; // e.g. 42
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  arabic_summary: string;
}

export interface PivotPoints {
  pp: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  target: number;
  ema200: number;
  ema50: number;
  sma20: number;
}

export interface IndicatorConsensus {
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  overall: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي';
  items: {
    name: string;
    value: number | string;
    action: 'شراء' | 'محايد' | 'بيع';
  }[];
}

export interface CandlestickPattern {
  name: string;
  arabicName: string;
  type: 'bullish' | 'bearish' | 'neutral';
  time: number | string;
  description: string;
}

export interface ChartPattern {
  name: string;
  arabicName: string;
  type: 'bullish' | 'bearish';
  description: string;
}

export interface TechnicalAnalysisResult {
  trend: 'صاعد' | 'هابط' | 'عرضي';
  recommendation: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي';
  momentumScore: number; // 0 to 100
  pivots: PivotPoints;
  distanceToR1Percent: number;
  distanceToS1Percent: number;
  distanceToTargetPercent: number;
  rsi14: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  adx14: number;
  stochastic: {
    k: number;
    d: number;
  };
  cci20: number;
  williamsR: number;
  momentum10: number;
  annualizedVolatility: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr14: number;
  supertrend: {
    trend: 'صاعد' | 'هابط';
    value: number;
  };
  maConsensus: IndicatorConsensus;
  oscillatorsConsensus: IndicatorConsensus;
  positivePoints: string[];
  cautionPoints: string[];
  isMixedPicture: boolean;
  mixedPictureReason?: string;
  volumeTrend: {
    currentVsAvgPercent: number;
    isDeclining: boolean;
    isSurging: boolean;
  };
  candlestickPatterns: CandlestickPattern[];
  chartPatterns: ChartPattern[];
  divergence?: {
    type: 'صاعد' | 'هابط';
    indicator: 'RSI' | 'MACD';
    description: string;
  };
  monthlyVolumes: {
    month: string;
    volume: number;
    isCurrentMonth: boolean;
  }[];
}

export interface MultiTimeframeItem {
  timeframe: '15m' | '1h' | '4h' | '1D' | '1W';
  trend: 'صاعد' | 'هابط' | 'عرضي';
  signal: 'شراء' | 'محايد' | 'بيع';
  rsi: number;
  status: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  createdAt: string;
  closedAt?: string;
  isOpen: boolean;
  notes?: string;
}

export interface SmartAlert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'rsi_overbought' | 'rsi_oversold' | 'macd_cross_bullish' | 'macd_cross_bearish';
  targetValue?: number;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  message: string;
  note?: string;
  channels?: {
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
    telegram?: boolean;
  };
  email?: string;
  phone?: string;
  deliveryStatus?: {
    emailSent?: boolean;
    smsSent?: boolean;
    timestamp?: string;
    details?: string;
  };
}

export interface BacktestResult {
  strategyName: string;
  totalTrades: number;
  winRate: number;
  totalReturnPercent: number;
  buyAndHoldReturnPercent: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  trades: {
    type: 'buy' | 'sell';
    date: string;
    price: number;
    profitPercent?: number;
  }[];
}
