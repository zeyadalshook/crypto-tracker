import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRightLeft,
  Scale,
  LineChart,
  Percent,
  Download,
  Sparkles,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { Currency, formatPercentage } from '../utils/formatters';
import { PaperOrder, PortfolioSnapshot } from './paper/paperTypes';
import { generateSamplePaperData, INITIAL_PAPER_BALANCE } from './paper/paperSampleData';
import { PaperTradingChart } from './paper/PaperTradingChart';
import { PaperTradeHistory } from './paper/PaperTradeHistory';

export type { PaperOrder, PortfolioSnapshot } from './paper/paperTypes';

interface PaperTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  currency: Currency;
}

export const PaperTradingModal: React.FC<PaperTradingModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  currency,
}) => {
  if (!isOpen) return null;

  // Demo Mode state: completely isolated and ephemeral
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Initialize Balance, Orders, and Portfolio Snapshots from localStorage or clean $10,000 USDT baseline
  const [balance, setBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ctr_paper_balance');
      if (saved) return parseFloat(saved);
    } catch {
      // fallback
    }
    return INITIAL_PAPER_BALANCE;
  });

  const [orders, setOrders] = useState<PaperOrder[]>(() => {
    try {
      const saved = localStorage.getItem('ctr_paper_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('ctr_paper_snapshots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: `snap-genesis`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        equity: INITIAL_PAPER_BALANCE,
        cashBalance: INITIAL_PAPER_BALANCE,
        investedAmount: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
        roiPct: 0.0,
        eventNote: 'رصيد الحساب الافتراضي الأولي',
      },
    ];
  });

  // Form State for new order terminal
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<number>(currentPrice || 65000);
  const [orderAmountUsdt, setOrderAmountUsdt] = useState<number>(1000);
  const [stopLoss, setStopLoss] = useState<number>(() => (currentPrice > 0 ? currentPrice * 0.95 : 61750));
  const [takeProfit, setTakeProfit] = useState<number>(() => (currentPrice > 0 ? currentPrice * 1.08 : 70200));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to localStorage ONLY for non-demo genuine paper sessions
  useEffect(() => {
    if (!isDemoMode && !orders.some((o) => o.isDemo)) {
      try {
        localStorage.setItem('ctr_paper_balance', balance.toString());
        localStorage.setItem('ctr_paper_orders', JSON.stringify(orders));
        localStorage.setItem('ctr_paper_snapshots', JSON.stringify(snapshots));
      } catch {
        // ignore
      }
    }
  }, [balance, orders, snapshots, isDemoMode]);

  // Update default SL/TP when currentPrice shifts if user hasn't heavily modified them
  useEffect(() => {
    if (currentPrice > 0) {
      if (orderSide === 'buy') {
        setLimitPrice((prev) => (orderType === 'market' ? currentPrice : prev));
        setStopLoss(Number((currentPrice * 0.95).toFixed(2)));
        setTakeProfit(Number((currentPrice * 1.08).toFixed(2)));
      } else {
        setLimitPrice((prev) => (orderType === 'market' ? currentPrice : prev));
        setStopLoss(Number((currentPrice * 1.05).toFixed(2)));
        setTakeProfit(Number((currentPrice * 0.92).toFixed(2)));
      }
    }
  }, [currentPrice, orderSide, orderType]);

  // Derived positions and metrics
  const openPositions = useMemo(() => orders.filter((o) => o.status === 'filled'), [orders]);
  const closedOrders = useMemo(() => orders.filter((o) => o.status === 'closed'), [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);

  // Total unrealized PnL from active positions
  const totalUnrealizedPnL = useMemo(() => {
    let pnl = 0;
    openPositions.forEach((pos) => {
      // If position symbol matches current symbol, use live price; otherwise use order price
      const price = pos.symbol === currentSymbol && currentPrice > 0 ? currentPrice : pos.orderPrice;
      const diff = pos.side === 'buy' ? price - pos.orderPrice : pos.orderPrice - price;
      pnl += pos.amountCoins * diff;
    });
    return Number(pnl.toFixed(2));
  }, [openPositions, currentPrice, currentSymbol]);

  // Total invested capital in active positions
  const totalInvestedInPositions = useMemo(() => {
    return openPositions.reduce((sum, p) => sum + p.totalUsdt, 0);
  }, [openPositions]);

  // Total realized PnL
  const totalRealizedPnL = useMemo(() => {
    return Number(closedOrders.reduce((sum, o) => sum + (o.pnlUsdt || 0), 0).toFixed(2));
  }, [closedOrders]);

  // Total portfolio value = Liquid Cash + Total Invested in Open Positions + Mark-to-market Unrealized PnL
  const totalPortfolioValue = useMemo(() => {
    return Number((balance + totalInvestedInPositions + totalUnrealizedPnL).toFixed(2));
  }, [balance, totalInvestedInPositions, totalUnrealizedPnL]);

  // Cumulative Return on Investment (ROI %)
  const totalRoiPct = useMemo(() => {
    return Number((((totalPortfolioValue - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE) * 100).toFixed(2));
  }, [totalPortfolioValue]);

  const realizedRoiPct = useMemo(() => {
    return Number(((totalRealizedPnL / INITIAL_PAPER_BALANCE) * 100).toFixed(2));
  }, [totalRealizedPnL]);

  // Automated SL / TP / Limit Trigger Checker
  useEffect(() => {
    if (currentPrice <= 0 || orders.length === 0) return;

    let orderListChanged = false;
    let balanceDelta = 0;
    const now = Date.now();
    const newSnapshotsToAdd: PortfolioSnapshot[] = [];

    const updatedOrders = orders.map((o) => {
      // 1. Check Pending Limit Orders
      if (o.status === 'pending' && o.type === 'limit' && o.symbol === currentSymbol) {
        const canFillBuy = o.side === 'buy' && currentPrice <= o.orderPrice;
        const canFillSell = o.side === 'sell' && currentPrice >= o.orderPrice;
        if (canFillBuy || canFillSell) {
          orderListChanged = true;
          return {
            ...o,
            status: 'filled' as const,
            orderPrice: currentPrice,
          };
        }
      }

      // 2. Check Open Positions for TP or SL hit
      if (o.status === 'filled' && o.symbol === currentSymbol) {
        let isTpHit = false;
        let isSlHit = false;

        if (o.side === 'buy') {
          if (o.takeProfit && currentPrice >= o.takeProfit) isTpHit = true;
          if (o.stopLoss && currentPrice <= o.stopLoss) isSlHit = true;
        } else {
          if (o.takeProfit && currentPrice <= o.takeProfit) isTpHit = true;
          if (o.stopLoss && currentPrice >= o.stopLoss) isSlHit = true;
        }

        if (isTpHit || isSlHit) {
          orderListChanged = true;
          const diff = o.side === 'buy' ? currentPrice - o.orderPrice : o.orderPrice - currentPrice;
          const pnlUsdt = Number((o.amountCoins * diff).toFixed(2));
          const pnlPercent = Number(((diff / o.orderPrice) * 100).toFixed(2));
          const returnedCapital = o.totalUsdt + pnlUsdt;

          balanceDelta += returnedCapital;

          const exitReason = isTpHit ? ('take_profit' as const) : ('stop_loss' as const);

          newSnapshotsToAdd.push({
            id: `snap-auto-${now}-${o.id}`,
            timestamp: now,
            dateStr: new Date(now).toLocaleDateString('ar-EG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            equity: Number((totalPortfolioValue + pnlUsdt).toFixed(2)),
            cashBalance: Number((balance + balanceDelta).toFixed(2)),
            investedAmount: Math.max(0, totalInvestedInPositions - o.totalUsdt),
            realizedPnl: Number((totalRealizedPnL + pnlUsdt).toFixed(2)),
            unrealizedPnl: 0,
            roiPct: Number(
              (((totalPortfolioValue + pnlUsdt - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE) * 100).toFixed(2)
            ),
            eventNote: `تنفيذ آلي (${isTpHit ? 'هدف الربح' : 'وقف الخسارة'}): صفقة ${o.symbol} (${pnlUsdt >= 0 ? '+' : ''}$${pnlUsdt} USDT)`,
            tradeId: o.id,
          });

          return {
            ...o,
            status: 'closed' as const,
            closePrice: currentPrice,
            closedAt: new Date(now).toLocaleDateString('ar-EG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            closedTimestamp: now,
            closeReason: exitReason,
            pnlUsdt,
            pnlPercent,
          };
        }
      }

      return o;
    });

    if (orderListChanged) {
      if (balanceDelta !== 0) {
        setBalance((prev) => Math.max(0, prev + balanceDelta));
      }
      setOrders(updatedOrders);
      if (newSnapshotsToAdd.length > 0) {
        setSnapshots((prev) => [...prev, ...newSnapshotsToAdd]);
      }
    }
  }, [currentPrice, currentSymbol, orders, balance, totalPortfolioValue, totalInvestedInPositions, totalRealizedPnL]);

  // Place New Order
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderAmountUsdt <= 0 || orderAmountUsdt > balance) {
      setToastMessage('رصيد المحفظة الافتراضية غير كافٍ لتنفيذ هذا الأمر.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const execPrice = orderType === 'market' ? currentPrice : limitPrice;
    if (execPrice <= 0) {
      setToastMessage('يرجى التأكد من سعر التنفيذ.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const amountCoins = Number((orderAmountUsdt / execPrice).toFixed(4));
    const now = Date.now();
    const dateFormatted = new Date(now).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isMarket = orderType === 'market';

    const newOrder: PaperOrder = {
      id: `paper-${now}`,
      symbol: currentSymbol.toUpperCase(),
      side: orderSide,
      type: orderType,
      orderPrice: execPrice,
      stopLoss,
      takeProfit,
      amountCoins,
      totalUsdt: orderAmountUsdt,
      createdAt: dateFormatted,
      timestamp: now,
      status: isMarket ? 'filled' : 'pending',
      feeUsdt: Number((orderAmountUsdt * 0.00075).toFixed(2)), // 0.075% fee
    };

    const newCash = balance - orderAmountUsdt;
    setBalance(newCash);
    setOrders([newOrder, ...orders]);

    // Record snapshot
    const newSnapshot: PortfolioSnapshot = {
      id: `snap-${now}`,
      timestamp: now,
      dateStr: dateFormatted,
      equity: totalPortfolioValue,
      cashBalance: newCash,
      investedAmount: totalInvestedInPositions + (isMarket ? orderAmountUsdt : 0),
      realizedPnl: totalRealizedPnL,
      unrealizedPnl: totalUnrealizedPnL,
      roiPct: totalRoiPct,
      eventNote: `فتح أمر ${orderSide === 'buy' ? 'شراء' : 'بيع'} (${orderType.toUpperCase()}) لـ ${currentSymbol} بقيمة $${orderAmountUsdt}`,
      tradeId: newOrder.id,
    };
    setSnapshots((prev) => [...prev, newSnapshot]);

    setToastMessage(`تم وضع أمر ${orderSide === 'buy' ? 'شراء' : 'بيع'} (${orderType.toUpperCase()}) بنجاح!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close Open Position Manually
  const handleClosePosition = (id: string) => {
    const pos = orders.find((o) => o.id === id);
    if (!pos) return;

    const effectivePrice = pos.symbol === currentSymbol && currentPrice > 0 ? currentPrice : pos.orderPrice;
    const diff = pos.side === 'buy' ? effectivePrice - pos.orderPrice : pos.orderPrice - effectivePrice;
    const pnlUsdt = Number((pos.amountCoins * diff).toFixed(2));
    const pnlPercent = Number(((diff / pos.orderPrice) * 100).toFixed(2));
    const returnedBalance = pos.totalUsdt + pnlUsdt;

    const now = Date.now();
    const dateFormatted = new Date(now).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newCash = Math.max(0, balance + returnedBalance);
    setBalance(newCash);

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          return {
            ...o,
            status: 'closed' as const,
            closePrice: effectivePrice,
            closedAt: dateFormatted,
            closedTimestamp: now,
            closeReason: 'manual' as const,
            pnlUsdt,
            pnlPercent,
          };
        }
        return o;
      })
    );

    // Record close snapshot
    const newSnap: PortfolioSnapshot = {
      id: `snap-close-${now}`,
      timestamp: now,
      dateStr: dateFormatted,
      equity: Number((newCash + (totalInvestedInPositions - pos.totalUsdt)).toFixed(2)),
      cashBalance: newCash,
      investedAmount: Math.max(0, totalInvestedInPositions - pos.totalUsdt),
      realizedPnl: Number((totalRealizedPnL + pnlUsdt).toFixed(2)),
      unrealizedPnl: 0,
      roiPct: Number(
        (((newCash + (totalInvestedInPositions - pos.totalUsdt) - INITIAL_PAPER_BALANCE) / INITIAL_PAPER_BALANCE) * 100).toFixed(2)
      ),
      eventNote: `إغلاق يدوي لصفقة ${pos.symbol}: ${pnlUsdt >= 0 ? '+' : ''}$${pnlUsdt} USDT (${formatPercentage(pnlPercent)})`,
      tradeId: id,
    };
    setSnapshots((prev) => [...prev, newSnap]);

    setToastMessage(`تم إغلاق صفقة ${pos.symbol} بنجاح (${pnlUsdt >= 0 ? 'ربح' : 'خسارة'}: $${pnlUsdt})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cancel Pending Limit Order
  const handleCancelPendingOrder = (id: string) => {
    const ord = orders.find((o) => o.id === id);
    if (!ord) return;

    // Refund capital
    setBalance((prev) => prev + ord.totalUsdt);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setToastMessage(`تم إلغاء أمر الحد واستعادة $${ord.totalUsdt} USDT إلى الرصيد.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reset to Initial $10,000 USDT
  const handleReset = () => {
    if (
      window.confirm(
        'هل أنت متأكد من رغبتك في إعادة تعيين الحساب الورقي؟ سيتم إعادة الرصيد إلى 10,000 USDT ومسح جميع الصفقات.'
      )
    ) {
      setBalance(INITIAL_PAPER_BALANCE);
      setOrders([]);
      const genesisSnap: PortfolioSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        equity: INITIAL_PAPER_BALANCE,
        cashBalance: INITIAL_PAPER_BALANCE,
        investedAmount: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
        roiPct: 0.0,
        eventNote: 'إعادة ضبط المحفظة الافتراضية إلى 10,000 USDT',
      };
      setSnapshots([genesisSnap]);
      setToastMessage('تمت إعادة ضبط الحساب الورقي بالكامل إلى 10,000 USDT.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Load Sample Realistic Simulation History
  const handleLoadSample = () => {
    const sample = generateSamplePaperData();
    setBalance(sample.balance);
    setOrders(sample.orders);
    setSnapshots(sample.snapshots);
    setToastMessage('تم تحميل صفقات المحاكاة النموذجية وتاريخ الأداء بنجاح!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Export Trade History CSV
  const handleExportCsv = () => {
    if (orders.length === 0) {
      setToastMessage('لا توجد صفقات للتصدير.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const headers = [
      'Trade ID',
      'Symbol',
      'Side',
      'Type',
      'Status',
      'Created At',
      'Closed At',
      'Entry Price',
      'Exit Price',
      'Amount Coins',
      'Total USDT',
      'Stop Loss',
      'Take Profit',
      'Exit Reason',
      'PnL USDT',
      'ROI Percent',
      'Fee USDT',
    ];

    const rows = orders.map((o) => [
      o.id,
      o.symbol,
      o.side,
      o.type,
      o.status,
      o.createdAt,
      o.closedAt || '—',
      o.orderPrice,
      o.closePrice || '—',
      o.amountCoins,
      o.totalUsdt,
      o.stopLoss || '—',
      o.takeProfit || '—',
      o.closeReason || '—',
      o.pnlUsdt !== undefined ? o.pnlUsdt : '—',
      o.pnlPercent !== undefined ? `${o.pnlPercent}%` : '—',
      o.feeUsdt || '0',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      '# DEMO DATA - بيانات تجريبية محاكاة معزولة تماماً عن سجل الحساب الحقيقي والبوابة\n' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `simulated-trades-demo-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('تم تحميل ملف سجل الصفقات المحاكية CSV بنجاح.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const calculatedCoins =
    currentPrice > 0 ? orderAmountUsdt / (orderType === 'market' ? currentPrice : limitPrice) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="card-glow bg-[#050f09] border border-emerald-500/40 rounded-2xl w-full max-w-6xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">التداول الافتراضي والمحاكاة (Paper Trading)</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  محفظة افتراضية بأسعار حية
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع تاريخ الصفقات المحاكية، ورسم بياني تفاعلي لأداء المحفظة ونسبة العائد على الاستثمار (ROI)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
              title="إعادة ضبط الرصيد وسجل الصفقات"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط المحفظة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1) Core Metrics Ribbon: Cash, Total Portfolio Value, Unrealized PnL, Total ROI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Liquid Cash Balance */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">الرصيد المتاح للتداول (Cash)</span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
            </div>
            <span className="text-[10px] text-slate-500">سيولة غير محجوزة في صفقات</span>
          </div>

          {/* Total Portfolio Equity */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">القيمة الإجمالية للمحفظة (Equity)</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              ${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
            </div>
            <span className="text-[10px] text-slate-500">
              رأس المال + صفقات نشطة (${totalInvestedInPositions}) + أرباح غير محققة
            </span>
          </div>

          {/* Unrealized PnL */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">أرباح المراكز المفتوحة (Unrealized)</span>
            <div
              className={`text-2xl font-black font-mono mt-1 ${
                totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)} USDT
            </div>
            <span className="text-[10px] text-slate-500">{openPositions.length} صفقات نشطة بالأسعار الحية</span>
          </div>

          {/* Cumulative Total ROI */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 to-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 block font-medium">نسبة العائد على الاستثمار (ROI)</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div
              className={`text-2xl font-black font-mono mt-1 flex items-center gap-1.5 ${
                totalRoiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{formatPercentage(totalRoiPct)}</span>
              {totalRoiPct >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              صافي الربح: {totalPortfolioValue >= INITIAL_PAPER_BALANCE ? '+' : ''}$
              {(totalPortfolioValue - INITIAL_PAPER_BALANCE).toFixed(2)} USDT من $10,000
            </span>
          </div>
        </div>

        {/* 2) Interactive Portfolio Performance Chart Over Time (الرسم البياني لأداء المحفظة الافتراضية بمرور الوقت وROI) */}
        <PaperTradingChart
          snapshots={snapshots}
          initialBalance={INITIAL_PAPER_BALANCE}
          currentEquity={totalPortfolioValue}
          currentRoiPct={totalRoiPct}
          unrealizedPnl={totalUnrealizedPnL}
          realizedPnl={totalRealizedPnL}
        />

        {/* 3) Order Placement Terminal */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900 text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>
                تنفيذ صفقة محاكاة جديدة لـ {currentSymbol} (السعر اللحظي: ${currentPrice.toLocaleString()})
              </span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              الرصيد المتاح: ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Buy / Sell */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">الاتجاه</label>
                <div className="flex gap-1 h-9">
                  <button
                    type="button"
                    onClick={() => setOrderSide('buy')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      orderSide === 'buy'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    شراء (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('sell')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      orderSide === 'sell'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    بيع (Short)
                  </button>
                </div>
              </div>

              {/* Order Type */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">نوع الأمر</label>
                <div className="flex gap-1 h-9">
                  <button
                    type="button"
                    onClick={() => setOrderType('market')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      orderType === 'market'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    سوق (Market)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      orderType === 'limit'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    حد (Limit)
                  </button>
                </div>
              </div>

              {/* Order Amount USDT */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">المبلغ (USDT)</label>
                <input
                  type="number"
                  step="any"
                  value={orderAmountUsdt}
                  onChange={(e) => setOrderAmountUsdt(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>

              {/* Execution / Limit Price */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">سعر التنفيذ ($)</label>
                <input
                  type="number"
                  step="any"
                  value={orderType === 'market' ? currentPrice : limitPrice}
                  onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                  disabled={orderType === 'market'}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Stop Loss ($) */}
              <div>
                <label className="text-[11px] text-rose-400/90 block mb-1">وقف الخسارة SL ($)</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-slate-900 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500/60"
                />
              </div>

              {/* Take Profit ($) */}
              <div>
                <label className="text-[11px] text-emerald-400/90 block mb-1">هدف الربح TP ($)</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-slate-900 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Quick Amount Presets & Sizing */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 ml-1">مبالغ جاهزة:</span>
                {[250, 500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOrderAmountUsdt(amt)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 font-mono text-[11px] transition-colors"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOrderAmountUsdt(Math.floor(balance * 0.25))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 font-mono text-[11px] transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setOrderAmountUsdt(Math.floor(balance * 0.5))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 font-mono text-[11px] transition-colors"
                >
                  50%
                </button>
              </div>

              <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>
                  الكمية المقدرة: ≈{' '}
                  <span className="text-emerald-400 font-bold">
                    {calculatedCoins < 1 ? calculatedCoins.toFixed(4) : calculatedCoins.toFixed(2)}{' '}
                    {currentSymbol.replace('USDT', '')}
                  </span>
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-colors ${
                orderSide === 'buy'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              تنفيذ أمر {orderSide === 'buy' ? 'شراء' : 'بيع'} بقيمة ${orderAmountUsdt.toLocaleString()} USDT لـ{' '}
              {currentSymbol}
            </button>
          </form>
        </div>

        {/* 4) Simulated Trade History Component (سجل الصفقات المحاكية) */}
        <PaperTradeHistory
          orders={orders}
          currentPrice={currentPrice}
          currentSymbol={currentSymbol}
          onClosePosition={handleClosePosition}
          onCancelPendingOrder={handleCancelPendingOrder}
          onLoadSampleData={handleLoadSample}
          onExportHistory={handleExportCsv}
        />
      </div>
    </div>
  );
};
