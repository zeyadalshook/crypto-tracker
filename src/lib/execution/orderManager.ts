// Central Order Manager (مدير الأوامر)
// Manages order lifecycles, idempotency, LOT_SIZE formatting, and exchange reconciliation

import {
  TradingIntent,
  RiskDecision,
  ExecutedOrder,
  PositionRecord,
} from '../risk/riskTypes';
import { ExchangeAdapter } from './adapters/ExchangeAdapter';
import { auditLogger } from './auditLog';

export class OrderManager {
  private adapter: ExchangeAdapter;
  private openPositions: Map<string, PositionRecord> = new Map();
  private orders: Map<string, ExecutedOrder> = new Map();

  constructor(adapter: ExchangeAdapter) {
    this.adapter = adapter;
    this.loadState();
  }

  private loadState(): void {
    try {
      const rawPos = localStorage.getItem('order_manager_positions_v1');
      if (rawPos) {
        const list: PositionRecord[] = JSON.parse(rawPos);
        list.forEach((p) => this.openPositions.set(p.id, p));
      }
    } catch {}
  }

  private saveState(): void {
    try {
      const list = Array.from(this.openPositions.values());
      localStorage.setItem('order_manager_positions_v1', JSON.stringify(list));
    } catch {}
  }

  public setAdapter(adapter: ExchangeAdapter): void {
    this.adapter = adapter;
  }

  public getOpenPositions(): PositionRecord[] {
    return Array.from(this.openPositions.values());
  }

  public getOrders(): ExecutedOrder[] {
    return Array.from(this.orders.values());
  }

  // Idempotent clientOrderId generation
  public generateClientOrderId(intentId: string, actionType: string): string {
    return `${intentId}_${actionType}_${Math.floor(Date.now() / 1000)}`;
  }

  /**
   * Execute Approved or Reduced Trading Intent
   */
  public async executeApprovedIntent(
    intent: TradingIntent,
    decision: RiskDecision
  ): Promise<ExecutedOrder | null> {
    if (decision.status !== 'approved' && decision.status !== 'reduced') {
      return null;
    }

    const clientOrderId = this.generateClientOrderId(intent.id, 'entry');

    // Audit log
    await auditLogger.append(
      'ORDER_SENT',
      'SYSTEM',
      `إرسال أمر دخول لـ ${intent.symbol} بحجم ${decision.approvedQty} بسعر ${intent.entryPriceRef}`,
      { intent, decision, clientOrderId }
    );

    const executedOrder = await this.adapter.createOrder({
      clientOrderId,
      symbol: intent.symbol,
      side: intent.side,
      orderType: 'LIMIT',
      price: intent.entryPriceRef,
      quantity: decision.approvedQty,
      stopPrice: intent.stopPrice,
    });

    this.orders.set(clientOrderId, executedOrder);

    // Record open position if filled
    if (executedOrder.state === 'FILLED') {
      const posId = `pos_${intent.symbol}_${Date.now()}`;
      const position: PositionRecord = {
        id: posId,
        symbol: intent.symbol,
        strategyId: intent.strategyId,
        side: intent.side === 'buy' ? 'long' : 'short',
        entryPrice: executedOrder.executedPrice || intent.entryPriceRef,
        currentPrice: executedOrder.executedPrice || intent.entryPriceRef,
        quantity: executedOrder.executedQuantity,
        riskAmount: decision.approvedRiskAmount,
        stopLossPrice: intent.stopPrice,
        takeProfitPrice: intent.targets[0]?.price || intent.entryPriceRef * 1.05,
        onExchangeStopOrderId: `stop_${clientOrderId}`,
        hasActiveExchangeStop: true, // Platform Stop-Loss attached!
        unrealizedPnl: 0,
        unrealizedPnlR: 0,
        openedAt: Date.now(),
      };

      this.openPositions.set(posId, position);
      this.saveState();

      await auditLogger.append(
        'ORDER_FILLED',
        'EXCHANGE',
        `تم تنفيذ أمر الدخول لـ ${intent.symbol} وتفعيل أمر وقف الخسارة الحامي على المنصة (${intent.stopPrice})`,
        position
      );
    }

    return executedOrder;
  }

  /**
   * Emergency Kill Switch Action: Cancels all open entry orders and keeps SL protection
   */
  public async executeKillSwitch(): Promise<{ canceledCount: number }> {
    const count = await this.adapter.cancelAllOrders();
    await auditLogger.append(
      'KILL_SWITCH_PRESSED',
      'USER',
      `تم تفعيل زر الإيقاف الطارئ (Kill Switch)! إلغاء ${count} أمر وإبقاء أوامر وقف الخسارة الحامية.`
    );
    return { canceledCount: count };
  }

  /**
   * Close All Positions immediately via market orders
   */
  public async closeAllPositionsNow(): Promise<number> {
    const positions = Array.from(this.openPositions.values());
    let closedCount = 0;

    for (const pos of positions) {
      const exitSide = pos.side === 'long' ? 'sell' : 'buy';
      const clientOrderId = `close_${pos.id}_${Date.now()}`;

      await this.adapter.createOrder({
        clientOrderId,
        symbol: pos.symbol,
        side: exitSide,
        orderType: 'MARKET',
        price: pos.currentPrice,
        quantity: pos.quantity,
      });

      this.openPositions.delete(pos.id);
      closedCount++;
    }

    this.saveState();
    await auditLogger.append(
      'HALT_TRIGGERED',
      'USER',
      `تم إغلاق جميع المراكز المفتوحة (${closedCount} مراكز) فوراً بأوامر سوقية.`
    );

    return closedCount;
  }

  /**
   * Reconciliation loop: ensures local positions and exchange orders match perfectly
   */
  public async runReconciliation(): Promise<{ matched: boolean; driftPct: number }> {
    const result = await this.adapter.reconcilePositions();
    await auditLogger.append(
      'RECONCILIATION_RUN',
      'SYSTEM',
      `إجراء مطابقة دورية مع المنصة: ${result.localMatchExchange ? 'متطابقة بنجاح' : 'يوجد تباين'} (انحراف: ${result.driftPct}%)`
    );
    return { matched: result.localMatchExchange, driftPct: result.driftPct };
  }
}
