import { PaperOrder, PortfolioSnapshot } from './paperTypes';

export const INITIAL_PAPER_BALANCE = 10000;

export function generateSamplePaperData(): {
  orders: PaperOrder[];
  snapshots: PortfolioSnapshot[];
  balance: number;
} {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 12 Closed Trades over the past 28 days + 2 Open Positions
  const orders: PaperOrder[] = [
    // Active Open Positions
    {
      id: 'paper-open-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 66800,
      stopLoss: 64128,
      takeProfit: 72144,
      amountCoins: 0.0299,
      totalUsdt: 2000,
      createdAt: new Date(now - 1.2 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 1.2 * dayMs,
      status: 'filled',
      feeUsdt: 1.5,
    },
    {
      id: 'paper-open-2',
      symbol: 'ETHUSDT',
      side: 'buy',
      type: 'limit',
      orderPrice: 2580,
      stopLoss: 2451,
      takeProfit: 2838,
      amountCoins: 0.5813,
      totalUsdt: 1500,
      createdAt: new Date(now - 0.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 0.5 * dayMs,
      status: 'filled',
      feeUsdt: 1.12,
    },

    // Closed Trades (Chronological reverse for display: newest closed first)
    {
      id: 'paper-closed-12',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 64500,
      closePrice: 67080,
      stopLoss: 62565,
      takeProfit: 67080,
      amountCoins: 0.0387,
      totalUsdt: 2500,
      createdAt: new Date(now - 3 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 3 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 1.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 1.5 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 100.0,
      pnlPercent: 4.0,
      holdingDurationMinutes: 2160,
      feeUsdt: 3.75,
    },
    {
      id: 'paper-closed-11',
      symbol: 'SOLUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 145.0,
      closePrice: 159.5,
      stopLoss: 139.2,
      takeProfit: 159.5,
      amountCoins: 11.034,
      totalUsdt: 1600,
      createdAt: new Date(now - 5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 5 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 3.2 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 3.2 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 160.0,
      pnlPercent: 10.0,
      holdingDurationMinutes: 2590,
      feeUsdt: 2.4,
    },
    {
      id: 'paper-closed-10',
      symbol: 'ETHUSDT',
      side: 'sell',
      type: 'limit',
      orderPrice: 2680,
      closePrice: 2787,
      stopLoss: 2787,
      takeProfit: 2546,
      amountCoins: 0.5597,
      totalUsdt: 1500,
      createdAt: new Date(now - 7 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 7 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 5.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 5.5 * dayMs,
      closeReason: 'stop_loss',
      pnlUsdt: -60.0,
      pnlPercent: -4.0,
      holdingDurationMinutes: 2160,
      feeUsdt: 2.25,
    },
    {
      id: 'paper-closed-9',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 62100,
      closePrice: 65826,
      stopLoss: 60237,
      takeProfit: 65826,
      amountCoins: 0.0483,
      totalUsdt: 3000,
      createdAt: new Date(now - 10 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 10 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 7.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 7.5 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 180.0,
      pnlPercent: 6.0,
      holdingDurationMinutes: 3600,
      feeUsdt: 4.5,
    },
    {
      id: 'paper-closed-8',
      symbol: 'BNBUSDT',
      side: 'buy',
      type: 'limit',
      orderPrice: 540.0,
      closePrice: 567.0,
      stopLoss: 518.4,
      takeProfit: 567.0,
      amountCoins: 2.222,
      totalUsdt: 1200,
      createdAt: new Date(now - 12 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 12 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 10.2 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 10.2 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 60.0,
      pnlPercent: 5.0,
      holdingDurationMinutes: 2590,
      feeUsdt: 1.8,
    },
    {
      id: 'paper-closed-7',
      symbol: 'SOLUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 138.0,
      closePrice: 151.8,
      stopLoss: 131.1,
      takeProfit: 151.8,
      amountCoins: 10.144,
      totalUsdt: 1400,
      createdAt: new Date(now - 15 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 15 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 12.8 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 12.8 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 140.0,
      pnlPercent: 10.0,
      holdingDurationMinutes: 3160,
      feeUsdt: 2.1,
    },
    {
      id: 'paper-closed-6',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 63800,
      closePrice: 61886,
      stopLoss: 61886,
      takeProfit: 67628,
      amountCoins: 0.0391,
      totalUsdt: 2500,
      createdAt: new Date(now - 18 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 18 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 16.0 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 16.0 * dayMs,
      closeReason: 'stop_loss',
      pnlUsdt: -75.0,
      pnlPercent: -3.0,
      holdingDurationMinutes: 2880,
      feeUsdt: 3.75,
    },
    {
      id: 'paper-closed-5',
      symbol: 'ETHUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 2420,
      closePrice: 2589.4,
      stopLoss: 2323.2,
      takeProfit: 2589.4,
      amountCoins: 0.7438,
      totalUsdt: 1800,
      createdAt: new Date(now - 20 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 20 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 18.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 18.5 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 126.0,
      pnlPercent: 7.0,
      holdingDurationMinutes: 2160,
      feeUsdt: 2.7,
    },
    {
      id: 'paper-closed-4',
      symbol: 'BTCUSDT',
      side: 'sell',
      type: 'limit',
      orderPrice: 64200,
      closePrice: 62916,
      stopLoss: 65484,
      takeProfit: 61632,
      amountCoins: 0.0311,
      totalUsdt: 2000,
      createdAt: new Date(now - 22 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 22 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 20.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 20.5 * dayMs,
      closeReason: 'manual',
      pnlUsdt: 40.0,
      pnlPercent: 2.0,
      holdingDurationMinutes: 2160,
      feeUsdt: 3.0,
    },
    {
      id: 'paper-closed-3',
      symbol: 'SOLUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 132.0,
      closePrice: 145.2,
      stopLoss: 125.4,
      takeProfit: 145.2,
      amountCoins: 7.575,
      totalUsdt: 1000,
      createdAt: new Date(now - 24 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 24 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 22.3 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 22.3 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 100.0,
      pnlPercent: 10.0,
      holdingDurationMinutes: 2440,
      feeUsdt: 1.5,
    },
    {
      id: 'paper-closed-2',
      symbol: 'ETHUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 2360,
      closePrice: 2265.6,
      stopLoss: 2265.6,
      takeProfit: 2525.2,
      amountCoins: 0.5084,
      totalUsdt: 1200,
      createdAt: new Date(now - 26 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 26 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 24.5 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 24.5 * dayMs,
      closeReason: 'stop_loss',
      pnlUsdt: -48.0,
      pnlPercent: -4.0,
      holdingDurationMinutes: 2160,
      feeUsdt: 1.8,
    },
    {
      id: 'paper-closed-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      orderPrice: 58400,
      closePrice: 61320,
      stopLoss: 56064,
      takeProfit: 61320,
      amountCoins: 0.0256,
      totalUsdt: 1500,
      createdAt: new Date(now - 28 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: now - 28 * dayMs,
      status: 'closed',
      closedAt: new Date(now - 26.2 * dayMs).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedTimestamp: now - 26.2 * dayMs,
      closeReason: 'take_profit',
      pnlUsdt: 75.0,
      pnlPercent: 5.0,
      holdingDurationMinutes: 2590,
      feeUsdt: 2.25,
    },
  ];

  // Construct Chronological Snapshots over 28 days
  // Starting Balance: $10,000 USDT (ROI = 0%)
  const snapshots: PortfolioSnapshot[] = [];
  
  let currentCash = INITIAL_PAPER_BALANCE;
  let cumRealizedPnl = 0;

  // Initial Genesis Snapshot
  const genesisTime = now - 29 * dayMs;
  snapshots.push({
    id: 'snap-0',
    timestamp: genesisTime,
    dateStr: new Date(genesisTime).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    equity: INITIAL_PAPER_BALANCE,
    cashBalance: INITIAL_PAPER_BALANCE,
    investedAmount: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    roiPct: 0.0,
    eventNote: 'بدء الحساب التجريبي برصيد 10,000 USDT',
  });

  // Chronologically order the closed trades (oldest to newest)
  const chronoTrades = [...orders.filter(o => o.status === 'closed')].sort((a, b) => (a.closedTimestamp || 0) - (b.closedTimestamp || 0));

  chronoTrades.forEach((trade, idx) => {
    // Open position event snapshot
    const openTime = trade.timestamp;
    currentCash -= trade.totalUsdt;
    snapshots.push({
      id: `snap-open-${idx + 1}`,
      timestamp: openTime,
      dateStr: new Date(openTime).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      equity: Number((INITIAL_PAPER_BALANCE + cumRealizedPnl).toFixed(2)),
      cashBalance: Number(currentCash.toFixed(2)),
      investedAmount: trade.totalUsdt,
      realizedPnl: Number(cumRealizedPnl.toFixed(2)),
      unrealizedPnl: 0,
      roiPct: Number(((cumRealizedPnl / INITIAL_PAPER_BALANCE) * 100).toFixed(2)),
      eventNote: `فتح أمر ${trade.side === 'buy' ? 'شراء' : 'بيع'} لـ ${trade.symbol} بقيمة $${trade.totalUsdt}`,
      tradeId: trade.id,
    });

    // Close trade event snapshot
    const closeTime = trade.closedTimestamp || openTime + 1000;
    const pnl = trade.pnlUsdt || 0;
    cumRealizedPnl += pnl;
    currentCash += trade.totalUsdt + pnl;

    const currentEquity = Number((INITIAL_PAPER_BALANCE + cumRealizedPnl).toFixed(2));
    const currentRoi = Number(((currentEquity - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE * 100).toFixed(2));

    snapshots.push({
      id: `snap-close-${idx + 1}`,
      timestamp: closeTime,
      dateStr: new Date(closeTime).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      equity: currentEquity,
      cashBalance: Number(currentCash.toFixed(2)),
      investedAmount: 0,
      realizedPnl: Number(cumRealizedPnl.toFixed(2)),
      unrealizedPnl: 0,
      roiPct: currentRoi,
      eventNote: `إغلاق صفقة ${trade.symbol} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} USDT / ${trade.pnlPercent}%)`,
      tradeId: trade.id,
    });
  });

  // Add the 2 open positions to active balance
  const openInvested = 2000 + 1500;
  currentCash -= openInvested;

  // Open positions mark-to-market unrealized PnL (approx +$46.40 USDT)
  const currentUnrealized = 46.40;
  const finalEquity = Number((currentCash + openInvested + currentUnrealized).toFixed(2));
  const finalRoi = Number(((finalEquity - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE * 100).toFixed(2));

  snapshots.push({
    id: `snap-now`,
    timestamp: now,
    dateStr: new Date(now).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    equity: finalEquity,
    cashBalance: Number(currentCash.toFixed(2)),
    investedAmount: openInvested,
    realizedPnl: Number(cumRealizedPnl.toFixed(2)),
    unrealizedPnl: currentUnrealized,
    roiPct: finalRoi,
    eventNote: 'تحديث الأسعار اللحظية وقيمة المحفظة الحالية',
  });

  return {
    orders,
    snapshots,
    balance: currentCash,
  };
}
