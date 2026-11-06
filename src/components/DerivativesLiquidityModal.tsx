import React, { useState, useEffect } from 'react';
import {
  Zap,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  DollarSign,
  Percent,
  Compass,
} from 'lucide-react';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';

interface DerivativesLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
}

export const DerivativesLiquidityModal: React.FC<DerivativesLiquidityModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
}) => {
  if (!isOpen) return null;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDerivativesData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/derivatives-pro/${symbol}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load pro derivatives data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDerivativesData();
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#06110a] border border-emerald-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  محرك بيانات المشتقات والسيولة وعمق الأوامر لـ {symbol}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  BINANCE FUTURES FEED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                معدل التمويل (Funding Rate)، الفائدة المفتوحة (Open Interest)، عمق جدران الطلب والعرض، ومناطق التصفية.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {isLoading && !data ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span>جاري تحميل بيانات دفتر الأوامر والفائدة المفتوحة...</span>
            </div>
          ) : data ? (
            <>
              {/* 1. Interpretive Rule Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  قاعدة تفسير حركة السعر مقابل الفائدة المفتوحة (Price vs OI Rules):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-500/20">
                    <span className="font-bold text-emerald-400">سعر يرتفع + OI يرتفع:</span>
                    <span className="mr-1">
                      دخول سيولة جديدة وفتح مراكز شراء حقيقية تدعم استمرار الصعود بقوة.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-amber-500/20">
                    <span className="font-bold text-amber-400">سعر يرتفع + OI ينخفض:</span>
                    <span className="mr-1">
                      صعود ناتج عن إغلاق شورت إجباري (Short Squeeze) واحتمال ضعف الزخم قريباً.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-rose-500/20">
                    <span className="font-bold text-rose-400">سعر ينخفض + OI يرتفع:</span>
                    <span className="mr-1">
                      دخول بائعين بقوة وفتح مراكز بيع تؤكد استمرار الضغط الهابط.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-sky-500/20">
                    <span className="font-bold text-sky-400">سعر ينخفض + OI ينخفض:</span>
                    <span className="mr-1">
                      تصفية مراكز وإغلاق صفقات، وغالباً ما يشير لاقتراب نهاية موجة الهبوط.
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Key Metrics 4-Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">معدل التمويل (Funding Rate)</span>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                    +{(data.fundingRate * 100).toFixed(4)}%
                  </div>
                  <span className="text-[10px] text-slate-500">كل 8 ساعات</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">الفائدة المفتوحة (OI)</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    ${(data.openInterest / 1_000_000).toFixed(1)}M
                  </div>
                  <span className="text-[10px] text-slate-500">حجم عقود المشتقات النشطة</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">إجمالي طلبات الشراء (Bids)</span>
                  <div className="text-lg font-black font-mono text-emerald-300 mt-1">
                    ${(data.orderBook.bidTotal / 1000).toFixed(1)}K
                  </div>
                  <span className="text-[10px] text-slate-500">دعم سيولة الشراء في الدفتر</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">إجمالي عروض البيع (Asks)</span>
                  <div className="text-lg font-black font-mono text-rose-300 mt-1">
                    ${(data.orderBook.askTotal / 1000).toFixed(1)}K
                  </div>
                  <span className="text-[10px] text-slate-500">مقاومة عروض البيع في الدفتر</span>
                </div>
              </div>

              {/* 3. Order Book Depth Visualizer (Bids vs Asks) */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    عمق دفتر الأوامر الحي (Order Book Depth & Walls):
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    السعر الحالي: ${currentPrice}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Bids side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                      <span>سعر الشراء (Bid Price)</span>
                      <span>الكمية</span>
                      <span>القيمة</span>
                    </div>
                    {data.orderBook.bids?.slice(0, 6).map(([price, qty]: [number, number], idx: number) => {
                      const pct = Math.min(100, (qty * price) / 100);
                      return (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80 overflow-hidden"
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="text-emerald-400 font-bold z-10">${price.toFixed(4)}</span>
                          <span className="text-slate-300 z-10">{qty.toFixed(2)}</span>
                          <span className="text-slate-400 text-[10px] z-10">
                            ${(price * qty).toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Asks side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                      <span>سعر البيع (Ask Price)</span>
                      <span>الكمية</span>
                      <span>القيمة</span>
                    </div>
                    {data.orderBook.asks?.slice(0, 6).map(([price, qty]: [number, number], idx: number) => {
                      const pct = Math.min(100, (qty * price) / 100);
                      return (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800/80 overflow-hidden"
                        >
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="text-rose-400 font-bold z-10">${price.toFixed(4)}</span>
                          <span className="text-slate-300 z-10">{qty.toFixed(2)}</span>
                          <span className="text-slate-400 text-[10px] z-10">
                            ${(price * qty).toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Estimated Liquidation Heatmap Zones */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    تقدير مناطق التصفية الإجبارية للرافعة المالية (Liquidation Zones):
                  </span>
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    مناطق تجميع سيولة لصناع السوق
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {data.liquidationZones?.map((zone: any, i: number) => {
                    const estPrice = currentPrice * (1 + zone.pricePercent / 100);
                    const isLongLiq = zone.type === 'long';
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${
                          isLongLiq
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-emerald-950/20 border-emerald-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            {isLongLiq ? 'تصفية عقود الشراء (Long Liquidation)' : 'تصفية عقود البيع (Short Squeeze)'}
                          </span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              isLongLiq ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {zone.pricePercent > 0 ? '+' : ''}
                            {zone.pricePercent}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                          <span className="text-slate-400">السعر المقدر:</span>
                          <span className="font-bold text-white">${estPrice.toFixed(4)}</span>
                          <span className="text-slate-400">السيولة المعرضة:</span>
                          <span className="text-amber-300 font-bold">
                            ${(zone.estVolumeUsd / 1_000_000).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>بيانات المشتقات محدثة عبر Binance Futures API</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
