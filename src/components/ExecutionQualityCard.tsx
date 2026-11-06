import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  DollarSign,
  Clock,
  RefreshCw,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Scissors,
} from 'lucide-react';
import { OrderBookData, ExecutionQualityResult } from '../types/execution';
import {
  calculateOrderBookSlippage,
  computeExecutionQuality,
  planOrderSlicing,
} from '../utils/executionEngine';
import { Currency, formatCurrency } from '../utils/formatters';

interface ExecutionQualityCardProps {
  symbol: string;
  currentPrice: number;
  currency?: Currency;
  onOpenDetailedModal?: () => void;
  onOpenChecklistWithGate?: (amount: number, orderType: 'market' | 'limit') => void;
}

export const ExecutionQualityCard: React.FC<ExecutionQualityCardProps> = ({
  symbol,
  currentPrice,
  currency = 'USDT',
  onOpenDetailedModal,
  onOpenChecklistWithGate,
}) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inputAmount, setInputAmount] = useState<number>(5000);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [useBnbDiscount, setUseBnbDiscount] = useState<boolean>(true);
  const [targetRewardPrice, setTargetRewardPrice] = useState<number>(() => {
    return currentPrice ? (orderSide === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95) : 100;
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showQuickTiers, setShowQuickTiers] = useState<boolean>(false);
  const [showSlicingPreview, setShowSlicingPreview] = useState<boolean>(false);
  const [slicesCount, setSlicesCount] = useState<number>(4);

  // Fetch Live Order Book depth
  const fetchOrderBook = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/orderbook/${symbol}?limit=500`);
      if (res.ok) {
        const data = await res.json();
        setOrderBook(data);
      }
    } catch (err) {
      console.warn('Failed to fetch order book:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(() => {
      fetchOrderBook(true);
    }, 4000); // 4-second poll to respect rate limits
    return () => clearInterval(interval);
  }, [symbol]);

  // Update target reward price when current price or side changes
  useEffect(() => {
    if (currentPrice > 0) {
      setTargetRewardPrice(
        orderSide === 'buy'
          ? Math.round(currentPrice * 1.045 * 10000) / 10000
          : Math.round(currentPrice * 0.955 * 10000) / 10000
      );
    }
  }, [currentPrice, orderSide]);

  // Compute Live Execution Quality
  const executionMetrics = useMemo<ExecutionQualityResult | null>(() => {
    if (!orderBook) return null;
    return computeExecutionQuality(
      orderBook,
      inputAmount,
      orderType,
      orderSide,
      {
        useBnbDiscount,
        targetProfitPrice: targetRewardPrice,
      }
    );
  }, [orderBook, inputAmount, orderType, orderSide, useBnbDiscount, targetRewardPrice]);

  // Compute Order Slicing Plan Preview
  const slicingPlan = useMemo(() => {
    if (!orderBook) return null;
    return planOrderSlicing(orderBook, inputAmount, orderSide, slicesCount, 60);
  }, [orderBook, inputAmount, orderSide, slicesCount]);

  if (isLoading && !orderBook) {
    return (
      <div className="card-glow rounded-2xl bg-gradient-to-b from-[#06140b] via-[#05110a] to-slate-950 border border-emerald-500/30 p-4 sm:p-5 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-900 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!executionMetrics || !orderBook) return null;

  const isLiquidityPoor = executionMetrics.liquidityClassification === 'ضعيفة';
  const isLiquidityMed = executionMetrics.liquidityClassification === 'متوسطة';

  return (
    <div className="card-glow rounded-2xl bg-gradient-to-b from-[#06140b] via-[#05110a] to-slate-950 border border-emerald-500/35 p-4 sm:p-5 shadow-2xl relative overflow-hidden text-slate-100">
      {/* Background Glow */}
      <div
        className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none ${
          isLiquidityPoor
            ? 'bg-rose-500'
            : isLiquidityMed
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isLiquidityPoor
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isLiquidityMed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  بطاقة جودة التنفيذ والسيولة (Execution & Liquidity Quality)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold">
                  {symbol}/USDT
                </span>

                {/* Liquidity Tier Badge */}
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    isLiquidityPoor
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isLiquidityMed
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isLiquidityPoor ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  سيولة التنفيذ: {executionMetrics.liquidityClassification}
                </span>

                {/* Gate Status Badge */}
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    executionMetrics.gatePassed
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                  title="هل العائد المتوقع يتجاوز 3 أضعاف تكلفة الدورة؟"
                >
                  بوابة الجدوى:{' '}
                  {executionMetrics.gatePassed ? 'مجازة (3x+)' : 'تحذير: التكلفة مرتفعة'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                حساب التكلفة الفعلية والانزلاق وفحص عمق دفتر الأوامر (L2) قبل الضغط على زر الشراء أو البيع.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
              عمر الدفتر: {orderBook.dataAgeSeconds.toFixed(1)} ثانية
            </span>

            <button
              onClick={() => fetchOrderBook(false)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
              title="تحديث دفتر الأوامر لحظياً"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {onOpenDetailedModal && (
              <button
                onClick={onOpenDetailedModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
              >
                <span>شاشة السيولة المتقدمة</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Calculator Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
          {/* 1. Trade Amount $ */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-medium flex items-center justify-between">
              <span>حجم الصفقة (بالدولار):</span>
              <span className="font-mono text-emerald-400 font-bold">${inputAmount.toLocaleString()}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="100"
                max="1000000"
                step="500"
                value={inputAmount}
                onChange={(e) => setInputAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Side (Buy vs Sell) */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-medium">الاتجاه:</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setOrderSide('buy')}
                className={`py-1 rounded font-bold transition-all text-xs ${
                  orderSide === 'buy'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                شراء (Ask)
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`py-1 rounded font-bold transition-all text-xs ${
                  orderSide === 'sell'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                بيع (Bid)
              </button>
            </div>
          </div>

          {/* 3. Order Type (Market vs Limit) */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-medium">نوع الأمر المقترح:</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setOrderType('market')}
                className={`py-1 rounded font-bold transition-all text-xs ${
                  orderType === 'market'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                سوقي (Taker)
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`py-1 rounded font-bold transition-all text-xs ${
                  orderType === 'limit'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                محدد (Maker)
              </button>
            </div>
          </div>

          {/* 4. Target Price (For Edge Gate) */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-medium flex items-center justify-between">
              <span>الهدف الصاعد/الهابط:</span>
              <span className="font-mono text-slate-300 font-bold">${targetRewardPrice}</span>
            </label>
            <input
              type="number"
              step="any"
              value={targetRewardPrice}
              onChange={(e) => setTargetRewardPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* 5. BNB Fee Discount Checkbox */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer py-1.5 px-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={useBnbDiscount}
                onChange={(e) => setUseBnbDiscount(e.target.checked)}
                className="accent-emerald-500 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-slate-300">
                خصم رسوم BNB (0.075%)
              </span>
            </label>
          </div>
        </div>

        {/* 4 Primary Output Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Expected Slippage */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>الانزلاق المتوقع (Slippage):</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {executionMetrics.levelsConsumed} مستوى مستهلك
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`font-mono font-black text-xl ${
                  isLiquidityPoor
                    ? 'text-rose-400'
                    : isLiquidityMed
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {executionMetrics.slippagePercent.toFixed(3)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (~${executionMetrics.slippageDollars.toFixed(2)})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              متوسط السعر المنفذ: <strong className="text-slate-200 font-mono">${executionMetrics.avgExecutionPrice}</strong>
            </span>
          </div>

          {/* Card 2: Total Round-Trip Cost */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>التكلفة الكلية للدورة:</span>
              <span className="text-[10px] text-slate-500 font-mono">دخول + خروج</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono font-black text-xl text-amber-300">
                ${executionMetrics.totalRoundTripCostDollars.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({executionMetrics.totalRoundTripCostPercent.toFixed(2)}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              رسوم المنصة: ${(executionMetrics.entryFeeDollars + executionMetrics.exitFeeDollars).toFixed(2)} + انزلاق: ${(executionMetrics.entrySlippageDollars + executionMetrics.exitSlippageDollars).toFixed(2)}
            </span>
          </div>

          {/* Card 3: Breakeven Hurdle Rate */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>حد التعادل الأدنى:</span>
              <span className="text-[10px] text-emerald-400 font-mono">Breakeven</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono font-black text-xl text-sky-400">
                +{executionMetrics.breakevenHurdlePercent.toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              يجب تحرك السعر لـ <strong className="text-slate-200 font-mono">${executionMetrics.breakevenPriceLevel}</strong> قبل البدء بالربح
            </span>
          </div>

          {/* Card 4: Spread & Order Book Imbalance */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>الفارق واختلال الدفتر:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Spread {orderBook.spreadPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-slate-300 font-bold">
                ميزان الـ 1%: {(orderBook.imbalance1Percent * 100).toFixed(0)}% طلب
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">
                {(100 - orderBook.imbalance1Percent * 100).toFixed(0)}% عرض
              </span>
            </div>
            {/* Visual Balance Bar */}
            <div className="w-full h-2 rounded-full bg-rose-500/80 overflow-hidden flex mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${orderBook.imbalance1Percent * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              الفارق بين أفضل شراء وبيع: ${orderBook.spreadDollars}
            </span>
          </div>
        </div>

        {/* Warnings & Suggestions Banner */}
        {executionMetrics.liquidityWarning && (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-rose-200 font-bold mb-0.5">
                تحذير سيولة ضعيفة:
              </strong>
              <span>{executionMetrics.liquidityWarning}</span>
            </div>
          </div>
        )}

        {!executionMetrics.gatePassed && executionMetrics.gateWarning && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-amber-200 font-bold mb-0.5">
                تنبيه بوابة الجدوى (Edge vs Cost Gate):
              </strong>
              <span>{executionMetrics.gateWarning}</span>
              {executionMetrics.gateSuggestion && (
                <div className="mt-1 text-slate-300">
                  💡 <strong>اقتراح:</strong> {executionMetrics.gateSuggestion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons & Expandable Tiers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowQuickTiers(!showQuickTiers)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>جدول انزلاق المبالغ القياسية (1K$ - 100K$)</span>
              {showQuickTiers ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => setShowSlicingPreview(!showSlicingPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-teal-400" />
              <span>مخطط تقسيم الدخول (Order Slicing)</span>
              {showSlicingPreview ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChecklistWithGate && (
              <button
                onClick={() => onOpenChecklistWithGate(inputAmount, orderType)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-90 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إدراج في قائمة الفحص مع شرط الجدوى</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Section 1: Quick Slippage Tiers Table */}
        {showQuickTiers && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs animate-fadeIn">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <span>الانزلاق المتوقع للمبالغ المختلفة على دفتر الأوامر اللحظي:</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 pb-1">
                    <th className="py-1.5 px-2">مبلغ الصفقة</th>
                    <th className="py-1.5 px-2">متوسط السعر</th>
                    <th className="py-1.5 px-2">نسبة الانزلاق</th>
                    <th className="py-1.5 px-2">التكلفة بالدولار</th>
                    <th className="py-1.5 px-2">المستويات المستهلكة</th>
                    <th className="py-1.5 px-2">تصنيف السيولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {executionMetrics.quickTiers.map((tier) => (
                    <tr
                      key={tier.dollarAmount}
                      className={tier.dollarAmount === inputAmount ? 'bg-emerald-500/10' : ''}
                    >
                      <td className="py-1.5 px-2 font-bold text-slate-200">
                        ${tier.dollarAmount.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-slate-300">${tier.avgExecutionPrice}</td>
                      <td
                        className={`py-1.5 px-2 font-bold ${
                          tier.liquidityTier === 'ضعيفة'
                            ? 'text-rose-400'
                            : tier.liquidityTier === 'متوسطة'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {tier.slippagePercent.toFixed(3)}%
                      </td>
                      <td className="py-1.5 px-2 text-slate-300">
                        ~${tier.slippageDollars.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">{tier.levelsConsumed} مستوى</td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                            tier.liquidityTier === 'ضعيفة'
                              ? 'bg-rose-500/20 text-rose-300'
                              : tier.liquidityTier === 'متوسطة'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {tier.liquidityTier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expandable Section 2: Order Slicing Preview */}
        {showSlicingPreview && slicingPlan && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs animate-fadeIn space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-teal-400" />
                <h4 className="font-bold text-white">
                  خطة تجزئة الأمر لتفادي الانزلاق (TWAP Planner):
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">عدد الدفعات:</span>
                {[2, 3, 4, 6, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlicesCount(n)}
                    className={`px-2 py-0.5 rounded font-mono font-bold border ${
                      slicesCount === n
                        ? 'bg-teal-500 text-slate-950 border-teal-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-400 block text-[11px]">انزلاق الأمر كدفعة واحدة:</span>
                <span className="font-mono text-rose-400 font-bold text-sm">
                  {slicingPlan.singleOrderSlippagePercent.toFixed(3)}% (~${slicingPlan.singleOrderSlippageDollars.toFixed(2)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">انزلاق مقدر بعد التجزئة ({slicesCount} دفعات):</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {slicingPlan.slicedEstimatedSlippagePercent.toFixed(3)}% (~${slicingPlan.slicedEstimatedSlippageDollars.toFixed(2)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">التوفير المقدر بالانزلاق:</span>
                <span className="font-mono text-teal-300 font-bold text-sm">
                  +${slicingPlan.estimatedSlippageSavingsDollars.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-400 font-medium block">
                جدول الدفعات المقترحة للتنفيذ اليدوي (تنبيهات استشارية):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {slicingPlan.slices.map((slice) => (
                  <div
                    key={slice.sliceNumber}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col gap-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>الدفعة #{slice.sliceNumber}</span>
                      <span className="text-emerald-400 font-mono">${slice.amountDollars}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{slice.timeLabel}</span>
                    <span className="text-slate-500 text-[10px]">{slice.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>خطر تحرك السعر (Price Drift): {slicingPlan.priceDriftRiskExplanation}</span>
            </p>
          </div>
        )}

        {/* Mandatory Regulatory Notice (Item 11 & 2) */}
        <div className="pt-2 border-t border-slate-900 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
            <span>
              التقديرات مبنية على الدفتر العام لحظة العرض وقد تختلف عند التنفيذ. الدفتر لحظي ويمكن أن يتغير أو يُسحب (Spoofing). للتثقيف وليست توصية مالية.
            </span>
          </div>
          <span>المصدر: Binance L2 Depth Book 100ms</span>
        </div>
      </div>
    </div>
  );
};
