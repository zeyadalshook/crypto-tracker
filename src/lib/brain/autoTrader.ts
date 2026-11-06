// Autonomous Paper Trader Engine (المتداول الآلي المحاكى للعقل المدبر)
// Executes and manages simulated paper positions based on deterministic BrainDecisions
// Strictly adheres to risk guards: daily loss limit, consecutive losses, and Kill Switch halt

import { BrainDecision } from './decisionTypes';
import {
  BrainAutopilotSettings,
  loadBrainSettings,
  saveBrainSettings,
  appendBrainActivity,
  addBrainAlert,
  getBrainActivityLog,
  getLocalDateString,
} from './brainStorage';

export interface BrainPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  initialQuantity: number;
  stopLossPrice: number;
  initialStopLossPrice: number;
  takeProfit1Price: number;
  takeProfit2Price: number;
  riskAmountUsdt: number;
  riskDistanceUsdt: number; // |entry - SL|
  isBreakevenMoved: boolean;
  isTp1Hit: boolean;
  unrealizedPnlUsdt: number;
  unrealizedPnlR: number;
  realizedPnlUsdt: number;
  realizedPnlR: number;
  feeUsdt?: number;
  roundTripFeePct?: number;
  openedAt: number;
  updatedAt: number;
  reasoningAr: string;
  status: 'OPEN' | 'CLOSED';
  closeReason?: string;
  closedAt?: number;
}

export interface AutoTraderState {
  settings: BrainAutopilotSettings;
  equity: number;
  initialDailyEquity: number;
  dailyRealizedPnlUsdt: number;
  dailyLossConsumedPct: number;
  consecutiveLosses: number;
  isHalted: boolean;
  haltReasonAr: string | null;
  openPositions: BrainPosition[];
  closedPositions: BrainPosition[];
  lastEvaluationTimestamp: number;
  killSwitchTriggered: boolean;
}

const STORAGE_KEYS = {
  POSITIONS: 'brain_paper_positions_v1',
  TRADER_STATE: 'brain_trader_state_v1',
  PAPER_BALANCE: 'ctr_paper_balance',
  PAPER_ORDERS: 'ctr_paper_orders',
};

export class AutoTraderEngine {
  private static instance: AutoTraderEngine;
  private state: AutoTraderState;

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): AutoTraderEngine {
    if (!AutoTraderEngine.instance) {
      AutoTraderEngine.instance = new AutoTraderEngine();
    }
    return AutoTraderEngine.instance;
  }

  private loadState(): AutoTraderState {
    const settings = loadBrainSettings();
    let equity = 10000;
    try {
      const savedBal = localStorage.getItem(STORAGE_KEYS.PAPER_BALANCE);
      if (savedBal && !isNaN(parseFloat(savedBal))) {
        equity = parseFloat(savedBal);
      }
    } catch {}

    let positions: BrainPosition[] = [];
    try {
      const rawPos = localStorage.getItem(STORAGE_KEYS.POSITIONS);
      if (rawPos) {
        positions = JSON.parse(rawPos);
      }
    } catch {}

    const openPositions = positions.filter((p) => p.status === 'OPEN');
    const closedPositions = positions.filter((p) => p.status === 'CLOSED');

    let savedStatePartial: any = {};
    try {
      const rawS = localStorage.getItem(STORAGE_KEYS.TRADER_STATE);
      if (rawS) savedStatePartial = JSON.parse(rawS);
    } catch {}

    // Reset daily loss if date changed (using user local timezone date)
    const todayStr = getLocalDateString(new Date());
    const lastDateStr = savedStatePartial.lastDateStr || todayStr;
    const isNewDay = todayStr !== lastDateStr;

    return {
      settings,
      equity,
      initialDailyEquity: isNewDay ? equity : savedStatePartial.initialDailyEquity || equity,
      dailyRealizedPnlUsdt: isNewDay ? 0 : savedStatePartial.dailyRealizedPnlUsdt || 0,
      dailyLossConsumedPct: isNewDay ? 0 : savedStatePartial.dailyLossConsumedPct || 0,
      consecutiveLosses: isNewDay ? 0 : savedStatePartial.consecutiveLosses || 0,
      isHalted: isNewDay ? false : Boolean(savedStatePartial.isHalted),
      haltReasonAr: isNewDay ? null : savedStatePartial.haltReasonAr || null,
      openPositions,
      closedPositions: closedPositions.slice(-100),
      lastEvaluationTimestamp: Date.now(),
      killSwitchTriggered: false,
    };
  }

  private saveState(): void {
    try {
      const allPos = [...this.state.openPositions, ...this.state.closedPositions];
      localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(allPos));

      const todayStr = getLocalDateString(new Date());
      localStorage.setItem(
        STORAGE_KEYS.TRADER_STATE,
        JSON.stringify({
          lastDateStr: todayStr,
          initialDailyEquity: this.state.initialDailyEquity,
          dailyRealizedPnlUsdt: this.state.dailyRealizedPnlUsdt,
          dailyLossConsumedPct: this.state.dailyLossConsumedPct,
          consecutiveLosses: this.state.consecutiveLosses,
          isHalted: this.state.isHalted,
          haltReasonAr: this.state.haltReasonAr,
        })
      );

      // Sync paper balance
      localStorage.setItem(STORAGE_KEYS.PAPER_BALANCE, this.state.equity.toString());
    } catch {}
  }

  public getState(): AutoTraderState {
    return { ...this.state };
  }

  public updateSettings(newSettings: Partial<BrainAutopilotSettings>): void {
    this.state.settings = { ...this.state.settings, ...newSettings };
    saveBrainSettings(this.state.settings);
    this.saveState();
  }

  public toggleAutopilot(enabled: boolean): void {
    this.updateSettings({ autopilotEnabled: enabled });
    addBrainAlert({
      coin: 'ALL',
      type: 'RISK_HALT',
      titleAr: enabled ? 'تفعيل التداول الآلي (Autopilot ON)' : 'إيقاف التداول الآلي (Autopilot OFF)',
      messageAr: enabled
        ? 'تم تشغيل العقل المدبر للتداول الورقي الآلي وفق قواعد المخاطر المعتمدة.'
        : 'تم إيقاف التداول الآلي؛ المراكز المفتوحة ستبقى محمية بأوامر الوقف.',
      severity: enabled ? 'success' : 'info',
    });
  }

  public triggerKillSwitchHalt(
    reasonAr: string = 'تم تفعيل زر الإيقاف الطارئ (Kill Switch)',
    currentPrices?: Record<string, number>
  ): void {
    this.state.isHalted = true;
    this.state.haltReasonAr = reasonAr;
    this.state.killSwitchTriggered = true;

    // Flatten ALL open positions immediately at the current live price
    const positionsToFlatten = [...this.state.openPositions];
    for (const pos of positionsToFlatten) {
      const exitPrice =
        currentPrices && currentPrices[pos.symbol] && currentPrices[pos.symbol] > 0
          ? currentPrices[pos.symbol]
          : pos.currentPrice;
      this.closePositionRecord(pos, exitPrice, 'kill_switch_flatten');
    }
    this.state.openPositions = [];

    this.saveState();

    appendBrainActivity({
      coin: 'ALL',
      decision: 'STAY_OUT',
      confidence: 100,
      action: 'HALT',
      reasoningAr: `تفعيل الإيقاف الطارئ وتصفية كافة المراكز المفتوحة (Kill Switch Flatten): ${reasonAr}`,
    });

    addBrainAlert({
      coin: 'ALL',
      type: 'KILL_SWITCH',
      titleAr: 'تفعيل مفتاح الإيقاف الطارئ (Kill Switch) وتصفية المراكز',
      messageAr: `تم تصفية وإغلاق كافة المراكز الورقية المفتوحة فورياً (${positionsToFlatten.length} مراكز) وحظر الأنشطة الآلية: ${reasonAr}`,
      severity: 'danger',
    });
  }

  public resetHalt(): void {
    this.state.isHalted = false;
    this.state.haltReasonAr = null;
    this.state.consecutiveLosses = 0;
    this.state.killSwitchTriggered = false;
    this.saveState();

    addBrainAlert({
      coin: 'ALL',
      type: 'RISK_HALT',
      titleAr: 'استئناف النظام بعد الإيقاف',
      messageAr: 'تمت إعادة ضبط موانع المخاطر واستئناف جاهزية التداول الآلي الورقي.',
      severity: 'info',
    });
  }

  /**
   * Position Sizing Math:
   * Risk Amount = Equity * (riskPerTradePct / 100)
   * Units = Risk Amount / |entryPrice - stopLossPrice|
   * Capped by Max Notional (e.g. 10% of equity)
   */
  public calculatePositionSize(
    entryPrice: number,
    stopLossPrice: number,
    equity: number,
    riskPct: number = this.state.settings.riskPerTradePct,
    maxNotionalPct: number = this.state.settings.maxNotionalEquityPct
  ): { quantity: number; riskAmountUsdt: number; notionalUsdt: number; isCapped: boolean } {
    const stopDistance = Math.abs(entryPrice - stopLossPrice);
    if (stopDistance <= 0 || entryPrice <= 0 || equity <= 0) {
      return { quantity: 0, riskAmountUsdt: 0, notionalUsdt: 0, isCapped: false };
    }

    const targetRiskUsdt = equity * (riskPct / 100);
    let units = targetRiskUsdt / stopDistance;
    let notional = units * entryPrice;

    const maxNotional = equity * (maxNotionalPct / 100);
    let isCapped = false;

    if (notional > maxNotional) {
      units = maxNotional / entryPrice;
      notional = maxNotional;
      isCapped = true;
    }

    const actualRiskUsdt = units * stopDistance;
    return {
      quantity: Number(units.toFixed(6)),
      riskAmountUsdt: Number(actualRiskUsdt.toFixed(2)),
      notionalUsdt: Number(notional.toFixed(2)),
      isCapped,
    };
  }

  /**
   * Run full evaluation cycle over an array of decisions
   */
  public processDecisionsCycle(decisions: BrainDecision[]): void {
    this.state.lastEvaluationTimestamp = Date.now();

    // 1. Manage Existing Open Positions
    this.manageOpenPositions(decisions);

    // 2. Check Risk Guards before entering new positions
    if (!this.state.settings.autopilotEnabled) {
      return;
    }

    if (this.state.killSwitchTriggered) {
      return;
    }

    // Check Daily Loss Limit (default 3%)
    if (this.state.dailyLossConsumedPct >= this.state.settings.maxDailyLossPct) {
      if (!this.state.isHalted) {
        this.state.isHalted = true;
        this.state.haltReasonAr = `تجاوز سقف الخسارة اليومية المسموح (${this.state.dailyLossConsumedPct.toFixed(1)}% ≥ ${this.state.settings.maxDailyLossPct}%). حظر الدخول حتى نهاية اليوم.`;
        this.saveState();

        appendBrainActivity({
          coin: 'ALL',
          decision: 'STAY_OUT',
          confidence: 100,
          action: 'HALT',
          reasoningAr: this.state.haltReasonAr,
        });

        addBrainAlert({
          coin: 'ALL',
          type: 'RISK_HALT',
          titleAr: 'إيقاف التداول: سقف الخسارة اليومي',
          messageAr: this.state.haltReasonAr,
          severity: 'danger',
        });
      }
      return;
    }

    // Check Consecutive Losses Limit (default 3)
    if (this.state.consecutiveLosses >= this.state.settings.maxConsecutiveLosses) {
      if (!this.state.isHalted) {
        this.state.isHalted = true;
        this.state.haltReasonAr = `تتابع ${this.state.consecutiveLosses} صفقات خاسرة متتالية (الحد: ${this.state.settings.maxConsecutiveLosses}). إيقاف الدخول لفترة تهدئة وانضباط.`;
        this.saveState();

        appendBrainActivity({
          coin: 'ALL',
          decision: 'STAY_OUT',
          confidence: 100,
          action: 'HALT',
          reasoningAr: this.state.haltReasonAr,
        });

        addBrainAlert({
          coin: 'ALL',
          type: 'RISK_HALT',
          titleAr: 'إيقاف التداول: تتابع الخسائر',
          messageAr: this.state.haltReasonAr,
          severity: 'warning',
        });
      }
      return;
    }

    // 3. Process New Actionable Entries
    for (const d of decisions) {
      if (!d.isActionable) continue;
      if (d.type !== 'ENTER_LONG' && d.type !== 'ENTER_SHORT') continue;

      // Prevent duplicate position on same coin (No Pyramiding rule)
      const existing = this.state.openPositions.find((p) => p.symbol === d.coin);
      if (existing) continue;

      // Execute Open Position
      this.executeNewPaperPosition(d);
    }

    this.saveState();
  }

  private executeNewPaperPosition(decision: BrainDecision): void {
    const entryPrice = decision.entryPrice || decision.currentPrice;
    const stopLossPrice = decision.stopLossPrice || entryPrice * 0.96;
    const tp1 = decision.takeProfit1Price || entryPrice * 1.06;
    const tp2 = decision.takeProfit2Price || entryPrice * 1.10;

    const sizing = this.calculatePositionSize(entryPrice, stopLossPrice, this.state.equity);
    if (sizing.quantity <= 0) return;

    const side = decision.type === 'ENTER_LONG' ? 'long' : 'short';
    const posId = `pos_brain_${decision.coin}_${Date.now()}`;

    const newPos: BrainPosition = {
      id: posId,
      symbol: decision.coin,
      side,
      entryPrice,
      currentPrice: entryPrice,
      quantity: sizing.quantity,
      initialQuantity: sizing.quantity,
      stopLossPrice,
      initialStopLossPrice: stopLossPrice,
      takeProfit1Price: tp1,
      takeProfit2Price: tp2,
      riskAmountUsdt: sizing.riskAmountUsdt,
      riskDistanceUsdt: Math.abs(entryPrice - stopLossPrice),
      isBreakevenMoved: false,
      isTp1Hit: false,
      unrealizedPnlUsdt: 0,
      unrealizedPnlR: 0,
      realizedPnlUsdt: 0,
      realizedPnlR: 0,
      openedAt: Date.now(),
      updatedAt: Date.now(),
      reasoningAr: decision.reasoningAr,
      status: 'OPEN',
    };

    this.state.openPositions.push(newPos);

    // Sync to paper trading storage
    this.syncToPaperOrders(newPos, 'OPEN');

    // Append to append-only log
    appendBrainActivity({
      coin: decision.coin,
      decision: decision.type,
      confidence: decision.confidence,
      action: decision.type === 'ENTER_LONG' ? 'ENTER_LONG' : 'ENTER_SHORT',
      reasoningAr: decision.reasoningAr,
      entryPrice,
      confluenceCount: decision.confluenceCount,
      confluenceGroups: decision.confluenceGroups,
    });

    // Fire Alert
    addBrainAlert({
      coin: decision.coin,
      type: 'TRADE_OPENED',
      titleAr: `فتح صفقة ورقية جديدة: ${decision.coin} (${side === 'long' ? 'شراء 🟢' : 'بيع 🔴'})`,
      messageAr: `تم فتح مركز ${side === 'long' ? 'شراء' : 'بيع'} بحجم ${sizing.quantity} بسعر $${entryPrice} ووقف $${stopLossPrice} (مخاطرة $${sizing.riskAmountUsdt} USDT).`,
      severity: 'success',
    });
  }

  private manageOpenPositions(decisions: BrainDecision[]): void {
    const decisionMap = new Map(decisions.map((d) => [d.coin, d]));
    const updatedPositions: BrainPosition[] = [];

    for (const pos of this.state.openPositions) {
      const decision = decisionMap.get(pos.symbol);
      const curPrice = decision ? decision.currentPrice : pos.currentPrice;
      pos.currentPrice = curPrice;
      pos.updatedAt = Date.now();

      // Calculate Current PnL (net of round-trip trading costs / slippage)
      const feeRate = (this.state.settings.roundTripFeePct !== undefined ? this.state.settings.roundTripFeePct : 0.25) / 100;
      const priceDiff = pos.side === 'long' ? curPrice - pos.entryPrice : pos.entryPrice - curPrice;
      const grossUnrealizedUsdt = priceDiff * pos.quantity;
      const estUnrealizedFee = (pos.quantity * pos.entryPrice + pos.quantity * curPrice) * (feeRate / 2);
      const unrealizedUsdt = grossUnrealizedUsdt - estUnrealizedFee;
      const initialRiskPerUnit = pos.riskDistanceUsdt;
      const unrealizedR = pos.riskAmountUsdt > 0 ? (unrealizedUsdt / pos.riskAmountUsdt) : 0;

      pos.unrealizedPnlUsdt = Number(unrealizedUsdt.toFixed(2));
      pos.unrealizedPnlR = Number(unrealizedR.toFixed(2));

      // 1. Move SL to Breakeven at +1R
      if (
        !pos.isBreakevenMoved &&
        unrealizedR >= this.state.settings.moveSlToBreakevenAtR
      ) {
        pos.isBreakevenMoved = true;
        pos.stopLossPrice = pos.entryPrice;

        appendBrainActivity({
          coin: pos.symbol,
          decision: 'STAY_OUT',
          confidence: 90,
          action: 'MOVE_SL_BREAKEVEN',
          reasoningAr: `تأمين الصفقة: تم تحريك وقف الخسارة إلى نقطة الدخول ($${pos.entryPrice}) بعد بلوغ ربح +1.0R.`,
          entryPrice: pos.entryPrice,
          pnlR: pos.unrealizedPnlR,
        });

        addBrainAlert({
          coin: pos.symbol,
          type: 'SL_BREAKEVEN',
          titleAr: `تأمين الصفقة (${pos.symbol}): وقف الخسارة عند الدخول`,
          messageAr: `بلغت الصفقة أرباح +${unrealizedR.toFixed(1)}R؛ تم تحريك الوقف إلى نقطة الدخول لحماية رأس المال.`,
          severity: 'info',
        });
      }

      // 2. Partial Take Profit at TP1 (50% position)
      if (
        this.state.settings.takePartialProfitAtTp1 &&
        !pos.isTp1Hit &&
        ((pos.side === 'long' && curPrice >= pos.takeProfit1Price) ||
          (pos.side === 'short' && curPrice <= pos.takeProfit1Price))
      ) {
        pos.isTp1Hit = true;
        const closeQty = pos.quantity * 0.5;
        const grossPartialUsdt = (pos.side === 'long' ? pos.takeProfit1Price - pos.entryPrice : pos.entryPrice - pos.takeProfit1Price) * closeQty;
        const partialFee = (closeQty * pos.entryPrice + closeQty * pos.takeProfit1Price) * (feeRate / 2);
        const netPartialUsdt = grossPartialUsdt - partialFee;
        const halfRisk = pos.riskAmountUsdt * 0.5;
        const partialPnlR = halfRisk > 0 ? (netPartialUsdt / halfRisk) : 0;

        pos.quantity -= closeQty;
        pos.feeUsdt = (pos.feeUsdt || 0) + partialFee;
        pos.realizedPnlUsdt += netPartialUsdt;
        pos.realizedPnlR += partialPnlR * 0.5;
        this.state.equity += netPartialUsdt;
        this.state.dailyRealizedPnlUsdt += netPartialUsdt;

        appendBrainActivity({
          coin: pos.symbol,
          decision: 'STAY_OUT',
          confidence: 85,
          action: 'PARTIAL_TP',
          reasoningAr: `جني أرباح جزئي (TP1) لـ ${pos.symbol}: تم إغلاق 50% من المركز عند $${pos.takeProfit1Price} بربح صافٍ +$${netPartialUsdt.toFixed(2)} USDT (+${partialPnlR.toFixed(2)}R بعد خصم الرسوم).`,
          exitPrice: pos.takeProfit1Price,
          pnlR: partialPnlR,
          pnlUsdt: netPartialUsdt,
          feeUsdt: partialFee,
          netPnlUsdt: netPartialUsdt,
        });

        addBrainAlert({
          coin: pos.symbol,
          type: 'TRADE_CLOSED',
          titleAr: `جني أرباح جزئي (${pos.symbol}): TP1 محقق`,
          messageAr: `تم جني أرباح 50% من المركز عند $${pos.takeProfit1Price} بربح صافٍ +$${netPartialUsdt.toFixed(2)} USDT (شامل الرسوم).`,
          severity: 'success',
        });
      }

      // 3. Check Full SL Hit
      const isSlHit =
        pos.side === 'long' ? curPrice <= pos.stopLossPrice : curPrice >= pos.stopLossPrice;

      // 4. Check Full TP2 Hit
      const isTp2Hit =
        pos.side === 'long' ? curPrice >= pos.takeProfit2Price : curPrice <= pos.takeProfit2Price;

      // 5. Check Explicit EXIT Decision from Brain
      const isExitDecision = decision && decision.type === 'EXIT';

      if (isSlHit || isTp2Hit || isExitDecision) {
        let closeReason = 'manual';
        let exitPrice = curPrice;

        if (isSlHit) {
          closeReason = pos.isBreakevenMoved ? 'breakeven_sl' : 'stop_loss';
          exitPrice = pos.stopLossPrice;
        } else if (isTp2Hit) {
          closeReason = 'take_profit_2';
          exitPrice = pos.takeProfit2Price;
        } else if (isExitDecision) {
          closeReason = 'brain_signal_exit';
          exitPrice = curPrice;
        }

        this.closePositionRecord(pos, exitPrice, closeReason);
      } else {
        updatedPositions.push(pos);
      }
    }

    this.state.openPositions = updatedPositions;
  }

  public closePositionManually(positionId: string): boolean {
    const pos = this.state.openPositions.find((p) => p.id === positionId);
    if (!pos) return false;

    this.closePositionRecord(pos, pos.currentPrice, 'manual_override');
    this.state.openPositions = this.state.openPositions.filter((p) => p.id !== positionId);
    this.saveState();
    return true;
  }

  private closePositionRecord(pos: BrainPosition, exitPrice: number, reason: string): void {
    pos.status = 'CLOSED';
    pos.closedAt = Date.now();
    pos.closeReason = reason;

    const feeRate = (this.state.settings.roundTripFeePct !== undefined ? this.state.settings.roundTripFeePct : 0.25) / 100;
    const remainingQty = pos.quantity;
    const priceDiff = pos.side === 'long' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
    const remainingGrossPnlUsdt = priceDiff * remainingQty;
    const entryFee = (remainingQty * pos.entryPrice) * (feeRate / 2);
    const exitFee = (remainingQty * exitPrice) * (feeRate / 2);
    const remainingFeeUsdt = entryFee + exitFee;
    const totalFeeUsdt = (pos.feeUsdt || 0) + remainingFeeUsdt;

    const netRemainingUsdt = remainingGrossPnlUsdt - remainingFeeUsdt;
    const finalNetPnlUsdt = (pos.realizedPnlUsdt || 0) + netRemainingUsdt;
    const finalPnlR = pos.riskAmountUsdt > 0 ? (finalNetPnlUsdt / pos.riskAmountUsdt) : 0;

    pos.feeUsdt = Number(totalFeeUsdt.toFixed(2));
    pos.realizedPnlUsdt = Number(finalNetPnlUsdt.toFixed(2));
    pos.realizedPnlR = Number(finalPnlR.toFixed(2));
    pos.unrealizedPnlUsdt = 0;
    pos.unrealizedPnlR = 0;

    // Update account equity net of fees
    this.state.equity += netRemainingUsdt;
    this.state.dailyRealizedPnlUsdt += netRemainingUsdt;

    // Update consecutive losses & daily loss consumed %
    if (finalNetPnlUsdt < 0) {
      this.state.consecutiveLosses++;
      const lossUsdt = Math.abs(finalNetPnlUsdt);
      const lossPct = (lossUsdt / Math.max(100, this.state.initialDailyEquity)) * 100;
      this.state.dailyLossConsumedPct += lossPct;
    } else if (finalNetPnlUsdt > 0) {
      this.state.consecutiveLosses = 0;
    }

    this.state.closedPositions.push(pos);

    // Sync to paper orders
    this.syncToPaperOrders(pos, 'CLOSED', exitPrice, reason, finalNetPnlUsdt);

    appendBrainActivity({
      coin: pos.symbol,
      decision: 'EXIT',
      confidence: 100,
      action: reason === 'manual_override' ? 'MANUAL_CLOSE' : 'EXIT',
      reasoningAr: `إغلاق صفقة ${pos.symbol} (${reason}) بسعر $${exitPrice} بنتيجة صافية: ${finalPnlR >= 0 ? '+' : ''}${finalPnlR.toFixed(2)}R (${finalNetPnlUsdt >= 0 ? '+' : ''}$${finalNetPnlUsdt.toFixed(2)} USDT شامل رسوم وانزلاق $${totalFeeUsdt.toFixed(2)}).`,
      exitPrice,
      pnlR: pos.realizedPnlR,
      pnlUsdt: pos.realizedPnlUsdt,
      feeUsdt: pos.feeUsdt,
      netPnlUsdt: pos.realizedPnlUsdt,
    });

    addBrainAlert({
      coin: pos.symbol,
      type: 'TRADE_CLOSED',
      titleAr: `إغلاق الصفقة (${pos.symbol}): ${finalNetPnlUsdt >= 0 ? 'ربح 🟢' : 'خسارة 🔴'}`,
      messageAr: `تم إغلاق المركز (${reason}) بنتيجة صافية: ${finalPnlR >= 0 ? '+' : ''}${finalPnlR.toFixed(2)}R (${finalNetPnlUsdt >= 0 ? '+' : ''}$${finalNetPnlUsdt.toFixed(2)} USDT شامل الرسوم).`,
      severity: finalNetPnlUsdt >= 0 ? 'success' : 'warning',
    });
  }

  private syncToPaperOrders(
    pos: BrainPosition,
    action: 'OPEN' | 'CLOSED',
    exitPrice?: number,
    reason?: string,
    pnlUsdt?: number
  ): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PAPER_ORDERS);
      let list: any[] = raw ? JSON.parse(raw) : [];

      if (action === 'OPEN') {
        list.push({
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side === 'long' ? 'buy' : 'sell',
          type: 'market',
          orderPrice: pos.entryPrice,
          stopLoss: pos.stopLossPrice,
          takeProfit: pos.takeProfit1Price,
          amountCoins: pos.quantity,
          totalUsdt: pos.quantity * pos.entryPrice,
          createdAt: new Date().toISOString(),
          timestamp: pos.openedAt,
          status: 'filled',
          isDemo: false,
        });
      } else {
        list = list.map((o) => {
          if (o.id === pos.id) {
            return {
              ...o,
              status: 'closed',
              closePrice: exitPrice,
              closedAt: new Date().toISOString(),
              closedTimestamp: Date.now(),
              closeReason: reason || 'manual',
              pnlUsdt,
              pnlPercent: pos.entryPrice > 0 && exitPrice ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0,
            };
          }
          return o;
        });
      }

      localStorage.setItem(STORAGE_KEYS.PAPER_ORDERS, JSON.stringify(list));
    } catch {}
  }
}
