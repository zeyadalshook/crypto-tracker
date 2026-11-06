// Unified Exchange Adapter Interface
// Abstract contract implemented by PaperAdapter, TestnetAdapter, and LiveAdapter

import { ExecutedOrder, IntentSide, OrderLifecycleState } from '../../risk/riskTypes';

export interface OrderRequest {
  clientOrderId: string;
  symbol: string;
  side: IntentSide;
  orderType: 'LIMIT' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT';
  price: number;
  quantity: number;
  stopPrice?: number;
}

export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface ExchangeAdapter {
  getName(): string;
  isTestnet(): boolean;
  getBalances(): Promise<ExchangeBalance[]>;
  createOrder(request: OrderRequest): Promise<ExecutedOrder>;
  cancelOrder(symbol: string, clientOrderId: string): Promise<boolean>;
  getOrderStatus(symbol: string, clientOrderId: string): Promise<ExecutedOrder | null>;
  cancelAllOrders(symbol?: string): Promise<number>;
  reconcilePositions(): Promise<{ localMatchExchange: boolean; driftPct: number }>;
}
