export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  orderPrice: number;
  triggerPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  amountCoins: number;
  totalUsdt: number;
  createdAt: string;
  timestamp: number;
  status: 'filled' | 'pending' | 'closed';
  closePrice?: number;
  closedAt?: string;
  closedTimestamp?: number;
  closeReason?: 'manual' | 'take_profit' | 'stop_loss' | 'limit_filled';
  pnlUsdt?: number;
  pnlPercent?: number; // ROI % on this trade
  holdingDurationMinutes?: number;
  feeUsdt?: number;
  isDemo?: boolean;
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: number;
  dateStr: string;
  equity: number;         // Total Portfolio Value (Cash + Mark-to-market open positions)
  cashBalance: number;    // Available liquid cash
  investedAmount: number; // Value locked in active trades
  realizedPnl: number;    // Cumulative realized PnL in USDT
  unrealizedPnl: number;  // Mark-to-market open PnL in USDT
  roiPct: number;         // Cumulative Return on Investment % ((equity - initial) / initial) * 100
  eventNote?: string;     // Context of this snapshot (e.g. trade execution, price update)
  tradeId?: string;
  isDemo?: boolean;
}

export interface PaperPortfolioStats {
  initialBalance: number;
  currentCash: number;
  totalPortfolioValue: number;
  totalROI: number;
  realizedPnl: number;
  realizedROI: number;
  unrealizedPnl: number;
  unrealizedROI: number;
  highWaterMark: number;
  maxDrawdownPct: number;
  totalTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRatePct: number;
  profitFactor: number;
  avgWinUsdt: number;
  avgLossUsdt: number;
  grossProfitUsdt: number;
  grossLossUsdt: number;
}
