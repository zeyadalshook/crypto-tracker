import React, { useMemo, useState } from 'react';
import { Layers, TrendingUp, TrendingDown, Target, ArrowUpDown } from 'lucide-react';
import { OHLCV } from '../types/crypto';
import { analyzeSmartMoneyConcepts } from '../utils/smcScanner';
import { Currency, formatCurrency } from '../utils/formatters';

interface SmcOrderBlockCardProps {
  symbol: string;
  klines: OHLCV[];
  currentPrice: number;
  currency?: Currency;
  onOpenDcaSimulator?: () => void;
  onOpenStressTest?: () => void;
}

export const SmcOrderBlockCard: React.FC<SmcOrderBlockCardProps> = ({
  symbol,
  klines,
  currentPrice,
  currency = 'USDT',
  onOpenDcaSimulator,
  onOpenStressTest,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'fvg' | 'ob' | 'liquidity'>('all');

  const smc = useMemo(() => {
    return analyzeSmartMoneyConcepts(klines, currentPrice);
  }, [klines, currentPrice]);

  const formatAdaptive = (price: number) => {
    if (!price || isNaN(price)) return '--';
    if (currency !== 'USDT' && currency !== 'USD') {
      return formatCurrency(price, currency);
    }
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(3)}`;
    if (price >= 0.01) return `$${price.toFixed(5)}`;
    return `$${price.toFixed(7)}`;
  };

  return (
    <section
      aria-label="رادار الأموال الذكية والفجوات السعرية"
      className="rounded-2xl bg-[#07130c] border border-emerald-950/80 p-5 text-slate-100 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>تحليل السيولة المؤسسية</span>
            <span aria-hidden="true">·</span>
            <span>Smart Money Concepts (SMC)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400">{symbol}/USDT</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            رادار الفجوات السعرية العادلة (FVG) وكتل الأوامر المؤسسية (Order Blocks)
          </h3>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDcaSimulator && (
            <button
              type="button"
              onClick={onOpenDcaSimulator}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              محاكي التراكم الذكي (Smart DCA)
            </button>
          )}
          {onOpenStressTest && (
            <button
              type="button"
              onClick={onOpenStressTest}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              اختبار ضغط المحفظة (Stress Test)
            </button>
          )}
        </div>
      </div>

      {/* Premium / Equilibrium / Discount Bar */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span>موقع السعر في النطاق الهيكلي (60 شمعة):</span>
            <span
              className={
                smc.currentZone === 'discount'
                  ? 'text-emerald-400 font-bold'
                  : smc.currentZone === 'premium'
                  ? 'text-rose-400 font-bold'
                  : 'text-amber-300 font-bold'
              }
            >
              {smc.currentZoneLabelAr}
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-300 font-bold">
            موقع النطاق: {smc.rangePositionPct}%
          </span>
        </div>

        {/* Range Meter */}
        <div className="relative h-3 w-full rounded-lg bg-gradient-to-l from-rose-950/80 via-slate-800 to-emerald-950/80 border border-slate-700 overflow-hidden">
          {/* 50% Equilibrium Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10"
            style={{ right: '50%' }}
            title="مستوى التوازن 50% (Equilibrium)"
          />
          {/* Current Price Pointer */}
          <div
            className="absolute top-0 bottom-0 w-2.5 rounded bg-white shadow-[0_0_8px_#fff] z-20 transition-transform duration-150"
            style={{
              right: `calc(${Math.min(98, Math.max(2, smc.rangePositionPct))}% - 5px)`,
            }}
          />
        </div>

        {/* Range Price Labels */}
        <div className="grid grid-cols-3 text-[11px] text-slate-400 font-mono tabular-nums pt-0.5">
          <div className="text-right">
            <span className="text-emerald-400 block">قاع السيولة (SSL · 0%)</span>
            <span className="text-slate-200 font-bold">{formatAdaptive(smc.sellSideLiquidityLevel)}</span>
          </div>
          <div className="text-center">
            <span className="text-amber-300 block">التوازن العادل (EQ · 50%)</span>
            <span className="text-slate-200 font-bold">{formatAdaptive(smc.equilibriumPrice)}</span>
          </div>
          <div className="text-left">
            <span className="text-rose-400 block">قمة السيولة (BSL · 100%)</span>
            <span className="text-slate-200 font-bold">{formatAdaptive(smc.buySideLiquidityLevel)}</span>
          </div>
        </div>
      </div>

      {/* Institutional Bias & Latest Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between gap-1">
          <span className="text-slate-400">الانحياز المؤسسي اللحظي:</span>
          <span className="text-slate-100 font-semibold leading-relaxed">{smc.institutionalBiasAr}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between gap-1">
          <span className="text-slate-400">آخر حدث في هيكل السوق (Market Structure):</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-100 font-semibold">
              {smc.latestStructure ? smc.latestStructure.labelAr : 'استقرار هيكلي'}
            </span>
            {smc.latestStructure && (
              <span className="font-mono tabular-nums text-emerald-400 font-bold shrink-0">
                {formatAdaptive(smc.latestStructure.levelPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Filter Segmented Control */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800/80 text-xs">
          {[
            { id: 'all', label: 'كل المناطق النشطة' },
            { id: 'fvg', label: `الفجوات السعرية FVG (${smc.unmitigatedFvgs.length})` },
            { id: 'ob', label: `كتل الأوامر OB (${smc.orderBlocks.length})` },
            { id: 'liquidity', label: 'تجمعات السيولة (BSL/SSL)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono tabular-nums">
          السعر الحالي: {formatAdaptive(currentPrice)}
        </span>
      </div>

      {/* Zones Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3">نوع المنطقة المؤسسية</th>
              <th className="py-2.5 px-3">النطاق السعري (من — إلى)</th>
              <th className="py-2.5 px-3">المنتصف (Midpoint)</th>
              <th className="py-2.5 px-3">قوة الزخم / الحجم</th>
              <th className="py-2.5 px-3 text-left">المسافة عن السعر الحالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
            {/* FVGs */}
            {(activeFilter === 'all' || activeFilter === 'fvg') &&
              smc.unmitigatedFvgs.map((fvg) => (
                <tr key={fvg.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      {fvg.type === 'bullish' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className={fvg.type === 'bullish' ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                        {fvg.type === 'bullish'
                          ? 'فجوة عادلة صاعدة (Bullish FVG)'
                          : 'فجوة عادلة هابطة (Bearish FVG)'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {formatAdaptive(fvg.bottomPrice)} — {formatAdaptive(fvg.topPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{formatAdaptive(fvg.midPrice)}</td>
                  <td className="py-2.5 px-3 text-slate-300">اتساع الفجوة {fvg.gapSizePct}%</td>
                  <td className="py-2.5 px-3 text-left">
                    <span className={fvg.distanceFromCurrentPct >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {fvg.distanceFromCurrentPct > 0 ? `+${fvg.distanceFromCurrentPct}% (أعلى)` : `${fvg.distanceFromCurrentPct}% (أدنى)`}
                    </span>
                  </td>
                </tr>
              ))}

            {/* Order Blocks */}
            {(activeFilter === 'all' || activeFilter === 'ob') &&
              smc.orderBlocks.map((ob) => (
                <tr key={ob.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${ob.type === 'demand' ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className={ob.type === 'demand' ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                        {ob.type === 'demand'
                          ? 'كتلة أوامر شرائية (Demand OB)'
                          : 'كتلة أوامر بيعية (Supply OB)'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {formatAdaptive(ob.bottomPrice)} — {formatAdaptive(ob.topPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{formatAdaptive(ob.midPrice)}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    اندفاع {ob.impulsePct}% · حجم {ob.volumeRatio}x
                  </td>
                  <td className="py-2.5 px-3 text-left">
                    <span className={ob.distanceFromCurrentPct >= 0 ? 'text-amber-300' : 'text-emerald-400'}>
                      {ob.distanceFromCurrentPct > 0 ? `+${ob.distanceFromCurrentPct}% (مقاومة)` : `${ob.distanceFromCurrentPct}% (دعم)`}
                    </span>
                  </td>
                </tr>
              ))}

            {/* Liquidity Pools */}
            {(activeFilter === 'all' || activeFilter === 'liquidity') && (
              <>
                <tr className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-rose-300 font-semibold">
                        سيولة القمم الشرائية (Buy-Side Liquidity - BSL)
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">فوق القمة الهيكلية</td>
                  <td className="py-2.5 px-3 text-white font-bold">{formatAdaptive(smc.buySideLiquidityLevel)}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">تمركز أوامر وقف البيع</td>
                  <td className="py-2.5 px-3 text-left text-rose-400">
                    +{(((smc.buySideLiquidityLevel - currentPrice) / currentPrice) * 100).toFixed(2)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-semibold">
                        سيولة القيعان البيعية (Sell-Side Liquidity - SSL)
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">تحت القاع الهيكلي</td>
                  <td className="py-2.5 px-3 text-white font-bold">{formatAdaptive(smc.sellSideLiquidityLevel)}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">تمركز أوامر وقف الشراء</td>
                  <td className="py-2.5 px-3 text-left text-emerald-400">
                    {(((smc.sellSideLiquidityLevel - currentPrice) / currentPrice) * 100).toFixed(2)}%
                  </td>
                </tr>
              </>
            )}

            {smc.unmitigatedFvgs.length === 0 && smc.orderBlocks.length === 0 && activeFilter !== 'liquidity' && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                  جميع الفجوات السعرية القريبة تم تغطيتها بالكامل (Mitigated) — السعر يتداول في توازن سعري.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
