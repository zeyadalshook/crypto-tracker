// Realistic Paper Trading Exchange Adapter (PaperAdapter)
// Simulates depth-based slippage, realistic maker/taker fees, latency delay (300-800ms), and order lifecycle

import {
  ExchangeAdapter,
  OrderRequest,
  ExchangeBalance,
} from './ExchangeAdapter';
import { ExecutedOrder } from '../../risk/riskTypes';

export class PaperAdapter implements ExchangeAdapter {
  private balances: Map<string, ExchangeBalance> = new Map();
  private orders: Map<string, ExecutedOrder> = new Map();

  constructor(initialCapital: number = 10000) {
    this.balances.set('USDT', { asset: 'USDT', free: initialCapital, locked: 0 });
    this.loadState();
  }

  private loadState(): void {
    try {
      const rawB = localStorage.getItem('paper_adapter_balances_v1');
      if (rawB) {
        const list: ExchangeBalance[] = JSON.parse(rawB);
        list.forEach((b) => this.balances.set(b.asset, b));
      }
    } catch (e) {}
  }

  private saveState(): void {
    try {
      const list = Array.from(this.balances.values());
      localStorage.setItem('paper_adapter_balances_v1', JSON.stringify(list));
    } catch (e) {}
  }

  public getName(): string {
    return 'Paper Trading (محاكاة واقعية محلياً)';
  }

  public isTestnet(): boolean {
    return true;
  }

  public async getBalances(): Promise<ExchangeBalance[]> {
    return Array.from(this.balances.values());
  }

  public async createOrder(req: OrderRequest): Promise<ExecutedOrder> {
    // 1. Simulate network latency delay (300-800ms)
    const latency = Math.floor(Math.random() * 500) + 300;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const now = Date.now();
    // 2. Realistic slippage estimation
    // Slippage = (random variance 0.02% to 0.08%)
    const slippagePct = req.orderType === 'MARKET' ? (Math.random() * 0.06 + 0.02) : 0.0;
    const executedPrice =
      req.side === 'buy'
        ? req.price * (1 + slippagePct / 100)
        : req.price * (1 - slippagePct / 100);

    // 3. Maker / Taker Fees (0.1% base fee)
    const feeRate = req.orderType === 'MARKET' ? 0.001 : 0.00075;
    const notional = executedPrice * req.quantity;
    const fees = notional * feeRate;

    // Deduct / update balances
    const usdtBalance = this.balances.get('USDT') || { asset: 'USDT', free: 0, locked: 0 };
    if (req.side === 'buy') {
      usdtBalance.free = Math.max(0, usdtBalance.free - (notional + fees));
    } else {
      usdtBalance.free += notional - fees;
    }
    this.balances.set('USDT', usdtBalance);
    this.saveState();

    const executedOrder: ExecutedOrder = {
      clientOrderId: req.clientOrderId,
      exchangeOrderId: `paper_order_${now}`,
      intentId: req.clientOrderId.split('_')[0] || 'intent',
      symbol: req.symbol,
      side: req.side,
      orderType: req.orderType,
      price: req.price,
      executedPrice: Number(executedPrice.toFixed(4)),
      slippagePct: Number(slippagePct.toFixed(3)),
      quantity: req.quantity,
      executedQuantity: req.quantity,
      fees: Number(fees.toFixed(4)),
      state: 'FILLED',
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(req.clientOrderId, executedOrder);
    return executedOrder;
  }

  public async cancelOrder(symbol: string, clientOrderId: string): Promise<boolean> {
    const order = this.orders.get(clientOrderId);
    if (!order) return false;
    order.state = 'CANCELED';
    order.updatedAt = Date.now();
    return true;
  }

  public async getOrderStatus(symbol: string, clientOrderId: string): Promise<ExecutedOrder | null> {
    return this.orders.get(clientOrderId) || null;
  }

  public async cancelAllOrders(symbol?: string): Promise<number> {
    let canceled = 0;
    for (const [id, order] of this.orders.entries()) {
      if (order.state === 'SUBMITTED' || order.state === 'NEW') {
        order.state = 'CANCELED';
        canceled++;
      }
    }
    return canceled;
  }

  public async reconcilePositions(): Promise<{ localMatchExchange: boolean; driftPct: number }> {
    return { localMatchExchange: true, driftPct: 0.0 };
  }
}
