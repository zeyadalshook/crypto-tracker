import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  X,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  BarChart2,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Scissors,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  OrderBookData,
  OrderBookLevel,
  ExecutionQualityResult,
  LargeTradeItem,
  AbnormalActivityData,
  VolumeProfileResult,
  UserActualExecutionMetrics,
} from '../types/execution';
import {
  calculateOrderBookSlippage,
  computeExecutionQuality,
  planOrderSlicing,
  calculateVolumeProfileAndVWAP,
  analyzeAbnormalActivity,
  analyzeUserActualExecution,
} from '../utils/executionEngine';
import { OHLCV } from '../types/crypto';
import { getJournalTrades } from '../utils/disciplineStorage';
import { Currency, formatCurrency } from '../utils/formatters';

interface ExecutionLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  klines: OHLCV[];
  currency?: Currency;
}

export const ExecutionLiquidityModal: React.FC<ExecutionLiquidityModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  klines,
  currency = 'USDT',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'depth_chart' | 'calculator' | 'abnormal' | 'volume_profile' | 'my_execution'>('depth_chart');

  // Order Book state
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState<boolean>(true);
  const [bookError, setBookError] = useState<string | null>(null);

  // Large trades state
  const [largeTrades, setLargeTrades] = useState<LargeTradeItem[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(false);

  // Interactive inputs for calculator
  const [calcAmount, setCalcAmount] = useState<number>(10000);
  const [calcSide, setCalcSide] = useState<'buy' | 'sell'>('buy');
  const [calcOrderType, setCalcOrderType] = useState<'market' | 'limit'>('market');
  const [calcUseBnb, setCalcUseBnb] = useState<boolean>(true);
  const [targetRewardPrice, setTargetRewardPrice] = useState<number>(() => {
    return currentPrice ? (calcSide === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95) : 100;
  });

  // Order Slicing State
  const [slicesCount, setSlicesCount] = useState<number>(4);
  const [slicingTimeframeMinutes, setSlicingTimeframeMinutes] = useState<number>(60);

  // Fetch Order Book
  const fetchOrderBook = async () => {
    setIsLoadingBook(true);
    try {
      const res = await fetch(`/api/orderbook/${symbol}?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setOrderBook(data);
      } else {
        setBookError('تعذر جلب دفتر الأوامر');
      }
    } catch (err: any) {
      setBookError(err?.message || 'خطأ في الشبكة');
    } finally {
      setIsLoadingBook(false);
    }
  };

  // Fetch Large Trades
  const fetchLargeTrades = async () => {
    setIsLoadingTrades(true);
    try {
      const res = await fetch(`/api/trades/large/${symbol}?minDollar=40000`);
      if (res.ok) {
        const data = await res.json();
        setLargeTrades(data.trades || []);
      }
    } catch (err) {
      console.warn('Failed to fetch large trades:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    fetchLargeTrades();
    const interval = setInterval(() => {
      fetchOrderBook();
      fetchLargeTrades();
    }, 4000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Calculations
  const executionMetrics = useMemo(() => {
    if (!orderBook) return null;
    return computeExecutionQuality(orderBook, calcAmount, calcOrderType, calcSide, {
      useBnbDiscount: calcUseBnb,
      targetProfitPrice: targetRewardPrice,
    });
  }, [orderBook, calcAmount, calcOrderType, calcSide, calcUseBnb, targetRewardPrice]);

  const slicingPlan = useMemo(() => {
    if (!orderBook) return null;
    return planOrderSlicing(orderBook, calcAmount, calcSide, slicesCount, slicingTimeframeMinutes);
  }, [orderBook, calcAmount, calcSide, slicesCount, slicingTimeframeMinutes]);

  const volumeProfile = useMemo(() => {
    return calculateVolumeProfileAndVWAP(klines, 32);
  }, [klines]);

  const abnormalData = useMemo(() => {
    return analyzeAbnormalActivity(klines, largeTrades);
  }, [klines, largeTrades]);

  // Actual User Execution stats from trading journal
  const userExecutionStats = useMemo(() => {
    const journalTrades = getJournalTrades();
    return analyzeUserActualExecution(journalTrades);
  }, []);

  // Depth chart points (cumulative curve)
  const depthChartData = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [] };
    const maxBids = orderBook.bids.slice(0, 50);
    const maxAsks = orderBook.asks.slice(0, 50);
    const maxCumUSDT = Math.max(
      maxBids[maxBids.length - 1]?.cumulativeUSDT || 1,
      maxAsks[maxAsks.length - 1]?.cumulativeUSDT || 1
    );

    return {
      bids: maxBids,
      asks: maxAsks,
      maxCumUSDT,
    };
  }, [orderBook]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="card-glow bg-[#050e09] border border-emerald-500/40 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header Ribbon */}
        <div className="p-4 sm:p-5 border-b border-emerald-950/80 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  وحدة التنفيذ والسيولة (Execution & Liquidity Terminal)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold">
                  {symbol}/USDT
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  السعر: ${currentPrice}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                دفتر أوامر L2، حاسبة الانزلاق، كاشف الصفقات غير الطبيعية، مؤشر CVD، وحجم التداول على مستويات السعر (Volume Profile).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchOrderBook();
                fetchLargeTrades();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 border-b border-emerald-950/80 bg-slate-950/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'depth_chart', label: 'منحنى عمق الدفتر والجدران', icon: Layers },
            { id: 'calculator', label: 'حاسبة الانزلاق والتكلفة الكاملة', icon: DollarSign },
            { id: 'abnormal', label: 'كاشف النشاط غير الطبيعي و CVD', icon: Flame },
            { id: 'volume_profile', label: 'مستويات السعر (Volume Profile & VWAP)', icon: BarChart2 },
            { id: 'my_execution', label: 'تحليل جودة تنفيذك الفعلي', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-slate-100">
          {/* TAB 1: DEPTH CHART & WALLS */}
          {activeTab === 'depth_chart' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">فارق السبريد (Spread):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-white">
                      ${orderBook?.spreadDollars || '—'}
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      ({orderBook?.spreadPercent.toFixed(3) || '0'}%)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    أفضل طلب: ${orderBook?.bestBid} | أفضل عرض: ${orderBook?.bestAsk}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">ميزان الاختلال ضمن 1% (Order Imbalance):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-emerald-300">
                      {orderBook ? `${(orderBook.imbalance1Percent * 100).toFixed(0)}%` : '—'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      مقابل {orderBook ? `${(100 - orderBook.imbalance1Percent * 100).toFixed(0)}%` : '—'} بيع
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-rose-500/80 overflow-hidden flex mt-1">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(orderBook?.imbalance1Percent || 0.5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">جدران الشراء والبيع المرصودة:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                      {orderBook?.bids.filter((b) => b.isWall).length || 0} جدار شراء
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
                      {orderBook?.asks.filter((a) => a.isWall).length || 0} جدار بيع
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    أوامر تتجاوز 4.5× إلى 5× متوسط حجم الأوامر القريبة
                  </span>
                </div>
              </div>

              {/* Depth Chart Cumulative Visualizer */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>منحنى عمق دفتر الأوامر التراكمي (Market Depth Chart):</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    أخضر: طلبات الشراء التراكمية (Bids) | أحمر: طلبات البيع التراكمية (Asks)
                  </span>
                </div>

                {/* SVG Visual Representation of Market Depth */}
                <div className="h-48 w-full bg-slate-900/60 rounded-xl relative overflow-hidden flex items-end px-2 pt-2 border border-slate-800">
                  {/* Left Side: Bids (Green descending from center to left) */}
                  <div className="w-1/2 h-full flex items-end justify-end gap-1 pr-1 border-l border-slate-700">
                    {depthChartData.bids.slice(0, 30).reverse().map((b, idx) => {
                      const maxVal = depthChartData.maxCumUSDT || 1;
                      const heightPercent = Math.min(100, Math.max(8, (b.cumulativeUSDT / maxVal) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex-1 rounded-t flex flex-col justify-end group relative transition-all"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div
                            className={`w-full h-full rounded-t ${
                              b.isWall
                                ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                                : 'bg-emerald-600/70 hover:bg-emerald-500'
                            }`}
                          />
                          {b.isWall && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-emerald-950 border border-emerald-400 text-emerald-300 px-1 py-0.5 rounded font-mono font-bold whitespace-nowrap z-20">
                              جدار ${b.price}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Side: Asks (Red ascending from center to right) */}
                  <div className="w-1/2 h-full flex items-end justify-start gap-1 pl-1">
                    {depthChartData.asks.slice(0, 30).map((a, idx) => {
                      const maxVal = depthChartData.maxCumUSDT || 1;
                      const heightPercent = Math.min(100, Math.max(8, (a.cumulativeUSDT / maxVal) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex-1 rounded-t flex flex-col justify-end group relative transition-all"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div
                            className={`w-full h-full rounded-t ${
                              a.isWall
                                ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                                : 'bg-rose-600/70 hover:bg-rose-500'
                            }`}
                          />
                          {a.isWall && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-rose-950 border border-rose-400 text-rose-300 px-1 py-0.5 rounded font-mono font-bold whitespace-nowrap z-20">
                              جدار ${a.price}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
                  <span>أعمق مستويات الشراء (${depthChartData.bids[depthChartData.bids.length - 1]?.price || '—'})</span>
                  <span className="text-white font-bold">سعر المنتصف: ${currentPrice}</span>
                  <span>أعمق مستويات البيع (${depthChartData.asks[depthChartData.asks.length - 1]?.price || '—'})</span>
                </div>
              </div>

              {/* Order Book Two Columns Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bids Column */}
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-950 text-xs font-bold text-emerald-400">
                    <span>طلبات الشراء (Bids)</span>
                    <span>الكمية / التراكمي (USDT)</span>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
                    {orderBook?.bids.slice(0, 15).map((b, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-2 py-1 rounded ${
                          b.isWall ? 'bg-emerald-500/20 border border-emerald-500/40' : 'hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-emerald-400 font-bold">${b.price}</span>
                        <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                          <span>{b.qty.toFixed(2)}</span>
                          <span className="text-slate-400">${b.cumulativeUSDT.toLocaleString()}</span>
                          {b.isWall && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 font-sans font-bold">
                              جدار
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asks Column */}
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-950 text-xs font-bold text-rose-400">
                    <span>عروض البيع (Asks)</span>
                    <span>الكمية / التراكمي (USDT)</span>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
                    {orderBook?.asks.slice(0, 15).map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-2 py-1 rounded ${
                          a.isWall ? 'bg-rose-500/20 border border-rose-500/40' : 'hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-rose-400 font-bold">${a.price}</span>
                        <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                          <span>{a.qty.toFixed(2)}</span>
                          <span className="text-slate-400">${a.cumulativeUSDT.toLocaleString()}</span>
                          {a.isWall && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-400 text-slate-950 font-sans font-bold">
                              جدار
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE EXECUTION COST & SLIPPAGE CALCULATOR */}
          {activeTab === 'calculator' && executionMetrics && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-sm">
                  إعدادات محاكاة الصفقة لحساب الانزلاق والتكلفة الكلية للدورة:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">المبلغ المطلوب تنفيذه ($):</label>
                    <input
                      type="number"
                      step="500"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">نوع الأمر:</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setCalcOrderType('market')}
                        className={`py-1.5 rounded font-bold transition-all ${
                          calcOrderType === 'market'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        سوقي (Taker)
                      </button>
                      <button
                        onClick={() => setCalcOrderType('limit')}
                        className={`py-1.5 rounded font-bold transition-all ${
                          calcOrderType === 'limit'
                            ? 'bg-teal-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        محدد (Maker)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">الاتجاه:</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setCalcSide('buy')}
                        className={`py-1.5 rounded font-bold transition-all ${
                          calcSide === 'buy'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        شراء (Long)
                      </button>
                      <button
                        onClick={() => setCalcSide('sell')}
                        className={`py-1.5 rounded font-bold transition-all ${
                          calcSide === 'sell'
                            ? 'bg-rose-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        بيع (Short)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">الهدف المتوقع ($) لفحص الجدوى:</label>
                    <input
                      type="number"
                      step="any"
                      value={targetRewardPrice}
                      onChange={(e) => setTargetRewardPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block">انزلاق الدخول المتوقع:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-amber-400">
                      {executionMetrics.slippagePercent.toFixed(3)}%
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (${executionMetrics.slippageDollars.toFixed(2)})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    متوسط سعر التنفيذ: <strong className="text-white font-mono">${executionMetrics.avgExecutionPrice}</strong> مقابل أفضل سعر دفتر ${executionMetrics.currentPrice}. سيتم استهلاك {executionMetrics.levelsConsumed} مستوى في الدفتر.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block">التكلفة الكلية للدورة (Round-Trip):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-rose-400">
                      ${executionMetrics.totalRoundTripCostDollars.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({executionMetrics.totalRoundTripCostPercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>رسوم الدخول:</span>
                      <span className="font-mono">${executionMetrics.entryFeeDollars}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسوم الخروج (المقدرة):</span>
                      <span className="font-mono">${executionMetrics.exitFeeDollars}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>انزلاق الدخول + الخروج:</span>
                      <span className="font-mono">${(executionMetrics.entrySlippageDollars + executionMetrics.exitSlippageDollars).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block">الحد الأدنى للهدف (التعادل):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-emerald-400">
                      +{executionMetrics.breakevenHurdlePercent.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يجب أن يتحرك السعر بمقدار <strong>{executionMetrics.breakevenHurdlePercent.toFixed(2)}%</strong> على الأقل في صالحك (إلى مستوى ${executionMetrics.breakevenPriceLevel}) لتتعادل فقط قبل احتساب أي ربح.
                  </p>
                </div>
              </div>

              {/* Edge vs Cost Gate Detailed Panel */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  executionMetrics.gatePassed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/25 border-rose-500/40 text-rose-200'
                }`}
              >
                {executionMetrics.gatePassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm mb-1">
                    بوابة الجدوى (Edge vs Cost Gate):{' '}
                    {executionMetrics.gatePassed ? 'تم اجتياز الشرط بنجاح' : 'تحذير: تكلفة التنفيذ مرتفعة مقارنة بالهدف'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    نسبة العائد المتوقع إلى تكلفة الدورة هي <strong>{executionMetrics.gateRatio.toFixed(1)}x</strong> (الحد الأدنى المطلوب 3.0x).
                    {!executionMetrics.gatePassed && (
                      <span className="block mt-1 font-bold text-rose-300">
                        {executionMetrics.gateSuggestion}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Slippage Tiers Reference Table */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-2">
                  جدول قياسي لانزلاق المبالغ المختلفة على الدفتر الحالي:
                </h4>
                <div className="overflow-x-auto font-mono text-xs">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 px-2">مبلغ الصفقة</th>
                        <th className="py-1 px-2">متوسط التنفيذ</th>
                        <th className="py-1 px-2">الانزلاق %</th>
                        <th className="py-1 px-2">التكلفة $</th>
                        <th className="py-1 px-2">المستويات</th>
                        <th className="py-1 px-2">التصنيف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {executionMetrics.quickTiers.map((t) => (
                        <tr key={t.dollarAmount}>
                          <td className="py-1.5 px-2 font-bold text-slate-200">${t.dollarAmount.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-slate-300">${t.avgExecutionPrice}</td>
                          <td className="py-1.5 px-2 text-amber-400 font-bold">{t.slippagePercent.toFixed(3)}%</td>
                          <td className="py-1.5 px-2 text-slate-300">~${t.slippageDollars.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-slate-400">{t.levelsConsumed}</td>
                          <td className="py-1.5 px-2 font-sans font-bold">{t.liquidityTier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ABNORMAL ACTIVITY & CVD */}
          {activeTab === 'abnormal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">حجم الشمعة الحالية vs متوسط 20 شمعة:</span>
                  <span className={`text-2xl font-mono font-black ${abnormalData.isVolumeSurge3x ? 'text-amber-400' : 'text-slate-200'}`}>
                    {abnormalData.candleVolumeVsAvg.toFixed(1)}x
                  </span>
                  <span className="text-xs text-slate-300 block mt-1">
                    التصنيف: <strong>{abnormalData.surgeClassification}</strong>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">ميزان الصفقات الكبيرة (&gt;$40K):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-emerald-400">
                      ${abnormalData.largeBuyVolumeUSDT.toLocaleString()} شراء
                    </span>
                  </div>
                  <span className="text-xs text-rose-400 font-mono block mt-0.5">
                    ${abnormalData.largeSellVolumeUSDT.toLocaleString()} بيع
                  </span>
                  <span className="text-xs text-slate-300 block mt-1 font-bold">
                    الهيمنة: {abnormalData.largeTradeDominance}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">دلتا الحجم التراكمية (CVD Trend):</span>
                  <span className="text-2xl font-mono font-black text-sky-400">
                    {abnormalData.cvdTrend}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    صافي الدلتا: {abnormalData.cvdNetDelta > 0 ? '+' : ''}{abnormalData.cvdNetDelta.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Mandatory Notice Banner (Item 6) */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>تنبيه فني موضوعي:</strong> "{abnormalData.mandatoryNotice}" — هذا الرصد يعكس ضغط الشراء/البيع النسبي اللحظي في السوق وليس دليلاً على نوايا أي جهة.
                </span>
              </div>

              {/* Large Trades Stream Feed */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-3 flex items-center justify-between">
                  <span>أحدث الصفقات الكبيرة المنفذة على المنصة (Aggregated Trades Flow):</span>
                  <span className="text-xs text-slate-400 font-mono">تحديث لحظي</span>
                </h4>

                <div className="space-y-1.5 max-h-72 overflow-y-auto font-mono text-xs">
                  {largeTrades.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        t.side === 'buy'
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-200">
                          {t.side === 'buy' ? 'شراء Taker' : 'بيع Taker'}
                        </span>
                        <span className="font-bold">${t.price}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-300">{t.qty.toFixed(2)} {symbol}</span>
                        <strong className="text-white">${t.valueUSDT.toLocaleString()}</strong>
                        <span className="text-[10px] text-slate-500">{t.dateStr}</span>
                      </div>
                    </div>
                  ))}
                  {largeTrades.length === 0 && (
                    <div className="text-center py-6 text-slate-500">
                      لا توجد صفقات منفردة تتجاوز $40,000 في الدقائق الأخيرة.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VOLUME PROFILE & VWAP */}
          {activeTab === 'volume_profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">نقطة التحكم الحجمي (POC):</span>
                  <span className="text-2xl font-mono font-black text-amber-400">
                    ${volumeProfile.pocPrice}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    مستوى السعر الذي شهد أكبر حجم تداول تراكمي
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">منطقة القيمة (Value Area 70%):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-teal-300">
                      ${volumeProfile.valueAreaLow} - ${volumeProfile.valueAreaHigh}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-1">
                    النطاق الذي استوعب 70% من إجمالي سيولة التداول
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">المتوسط المرجح بالحجم (VWAP):</span>
                  <span className="text-2xl font-mono font-black text-sky-400">
                    ${volumeProfile.vwapDaily}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    الانحراف الأول: ${volumeProfile.vwapStdLower1} / ${volumeProfile.vwapStdUpper1}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>التفسير الفني:</strong> {volumeProfile.interpretation}</span>
              </div>

              {/* Volume Profile Bins Visualizer */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs">توزيع الحجم على مستويات السعر (Volume Profile Horizontal Bars):</h4>
                <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-xs pr-1">
                  {volumeProfile.levels.slice().reverse().map((lvl, idx) => {
                    const isPoc = Math.abs(lvl.price - volumeProfile.pocPrice) < 0.0001;
                    return (
                      <div key={idx} className="flex items-center gap-2 py-0.5">
                        <span className={`w-20 text-right ${isPoc ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          ${lvl.price}
                        </span>
                        <div className="flex-1 h-3.5 bg-slate-900 rounded overflow-hidden flex relative">
                          <div
                            className={`h-full ${
                              isPoc
                                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                                : lvl.isValueArea
                                ? 'bg-teal-500/80'
                                : 'bg-slate-700/60'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, (lvl.volume / (volumeProfile.levels[0]?.volume * 2 || 1)) * 100))}%` }}
                          />
                          {isPoc && (
                            <span className="absolute inset-y-0 right-2 text-[9px] text-slate-950 font-bold font-sans flex items-center">
                              ★ POC
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 w-16 text-left">
                          {lvl.volume.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTUAL USER EXECUTION QUALITY FROM JOURNAL */}
          {activeTab === 'my_execution' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">متوسط انزلاقك الفعلي:</span>
                  <span className="text-2xl font-mono font-black text-amber-400">
                    {userExecutionStats.averageActualSlippagePercent.toFixed(3)}%
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    تكلفة متوسطة: ${userExecutionStats.averageActualSlippageDollars.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">حصة التكاليف من الأرباح الإجمالية:</span>
                  <span className="text-2xl font-mono font-black text-rose-400">
                    {userExecutionStats.costShareOfGrossProfitPercent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    أكلت الرسوم والانزلاق هذه النسبة من ربحك الإجمالي
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">أوامر السوق vs الأوامر المحددة:</span>
                  <div className="flex flex-col gap-0.5 text-xs font-mono mt-1">
                    <span className="text-amber-300">سوقي: {userExecutionStats.marketOrderAvgSlippagePercent.toFixed(3)}%</span>
                    <span className="text-emerald-300">محدد: {userExecutionStats.limitOrderAvgSlippagePercent.toFixed(3)}%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">أفضل أوقات التنفيذ لديك:</span>
                  <span className="text-xs text-emerald-400 font-bold block mt-1">
                    {userExecutionStats.bestExecutionHours[0]}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {userExecutionStats.bestExecutionHours[1]}
                  </span>
                </div>
              </div>

              {/* Actionable Insights */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs">ملاحظات تحسين التنفيذ المستخلصة من صفقاتك:</h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {userExecutionStats.executionInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-emerald-950/80 bg-slate-950 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <span>التقديرات مبنية على الدفتر العام لحظة العرض وقد تختلف عند التنفيذ. للتثقيف وليست توصية مالية.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
