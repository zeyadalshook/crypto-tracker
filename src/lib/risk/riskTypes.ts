// TypeScript types for Automated Execution Engine & Risk Layer
// (محرك التنفيذ الآلي وطبقة المخاطر المستقلة)

export type ExecutionSystemState = 'OFF' | 'PAPER' | 'TESTNET' | 'LIVE_SMALL' | 'LIVE' | 'HALT';

export type IntentType = 'entry' | 'exit' | 'adjust';
export type IntentSide = 'buy' | 'sell';

export interface TradingIntent {
  id: string;
  strategyId: string;
  strategyName: string;
  params: Record<string, number | string>;
  symbol: string;
  side: IntentSide;
  type: IntentType;
  reason: string;                    // Deterministic rule text that fired
  entryPriceRef: number;
  stopPrice: number;
  targets: { price: number; closePct: number }[];
  signalCandleTime: number;          // Candle close timestamp ms
  createdAt: number;
}

export type RiskDecisionStatus = 'approved' | 'reduced' | 'rejected' | 'halt_triggered';

export interface RiskDecision {
  intentId: string;
  status: RiskDecisionStatus;
  approvedQty: number;
  approvedRiskAmount: number;
  approvedRiskPct: number;
  originalRequestedRiskPct: number;
  reductionRatio: number;            // 1.0 = no reduction, 0.5 = 50% cut
  rejectionReasonAr?: string;
  ruleViolatedId?: string;
  checkedAt: number;
}

export interface RiskLimits {
  maxRiskPerTradePct: number;        // default: 1.0%
  maxPositionEquityPct: number;      // default: 20%
  maxOpenPositions: number;          // default: 3
  maxTotalOpenRiskPct: number;       // default: 1.5%
  maxCorrelationThreshold: number;   // default: 0.8
  dailyLossLimitPct: number;         // default: 2.0% -> HALT
  weeklyLossLimitPct: number;        // default: 4.0% -> HALT
  monthlyLossLimitPct: number;       // default: 8.0% -> HALT
  maxDrawdownFromPeakPct: number;    // default: 10.0% -> HALT
  maxOrdersPerHour: number;          // default: 6
  maxOrdersPerDay: number;           // default: 20
  consecutiveLossLimit: number;      // default: 3 -> cooloff
  cooloffHours: number;              // default: 4
  pendingLimitChange?: {
    proposed: Partial<RiskLimits>;
    effectiveAt: number;             // 24 hours anti-rage lock
    requestedAt: number;
  } | null;
}

export interface PositionRecord {
  id: string;
  symbol: string;
  strategyId: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  riskAmount: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  onExchangeStopOrderId?: string;
  hasActiveExchangeStop: boolean;
  unrealizedPnl: number;
  unrealizedPnlR: number;
  openedAt: number;
}

export type OrderLifecycleState =
  | 'NEW'
  | 'SUBMITTED'
  | 'ACKED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface ExecutedOrder {
  clientOrderId: string;
  exchangeOrderId?: string;
  intentId: string;
  symbol: string;
  side: IntentSide;
  orderType: 'LIMIT' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT';
  price: number;
  executedPrice?: number;
  slippagePct?: number;
  quantity: number;
  executedQuantity: number;
  fees: number;
  state: OrderLifecycleState;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType:
    | 'STATE_CHANGE'
    | 'INTENT_CREATED'
    | 'RISK_DECISION'
    | 'ORDER_SENT'
    | 'ORDER_FILLED'
    | 'HALT_TRIGGERED'
    | 'KILL_SWITCH_PRESSED'
    | 'LIMITS_CHANGED'
    | 'RECONCILIATION_RUN'
    | 'HEARTBEAT_ACKED';
  actor: 'SYSTEM' | 'USER' | 'RISK_LAYER' | 'EXCHANGE' | 'TELEGRAM';
  details: string;
  payload?: any;
  previousHash: string;
  hash: string;                       // SHA-256 (previousHash + timestamp + eventType + details)
}

export interface ExecutionDashboardData {
  systemState: ExecutionSystemState;
  activeRolloutPhase: 'PAPER' | 'TESTNET' | 'LIVE_SMALL' | 'LIVE';
  lastHeartbeatTime: number;
  lastReconciliationTime: number;
  equity: number;
  capital: number;
  dailyPnlAmount: number;
  dailyPnlR: number;
  dailyLossConsumedPct: number;
  weeklyLossConsumedPct: number;
  openPositionsCount: number;
  openRiskAmount: number;
  openRiskPct: number;
  openPositions: PositionRecord[];
  recentIntents: { intent: TradingIntent; decision: RiskDecision }[];
  recentOrders: ExecutedOrder[];
  consecutiveLosses: number;
  haltReasonAr?: string;
  limits: RiskLimits;
}
