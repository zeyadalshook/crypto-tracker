import React from 'react';
import { DollarSign, BarChart3, Layers, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult } from '../types/crypto';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';

interface QuickStatsRibbonProps {
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  currency: Currency;
}

export const QuickStatsRibbon: React.FC<QuickStatsRibbonProps> = ({
  coin,
  analysis,
  currency,
}) => {
  const isPositive24h = (coin.price_change_percentage_24h || 0) >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. السعر الحالي */}
      <div className="card-glow rounded-xl p-3.5 sm:p-4 border border-emerald-500/20 relative group overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">السعر الحالي ({currency})</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
              {coin.symbol}/USDT
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatCurrency(coin.current_price, currency)}
          </span>
          <span
            className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
              isPositive24h
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isPositive24h ? (
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 ml-0.5" />
            )}
            {formatPercentage(coin.price_change_percentage_24h)}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center justify-between gap-1">
          <span>أعلى 24س: {formatCurrency(coin.high_24h, currency)} | أدنى: {formatCurrency(coin.low_24h, currency)}</span>
          {currency !== 'USDT' && (
            <span className="text-emerald-400 font-mono">
              ({formatCurrency(coin.current_price, 'USDT')})
            </span>
          )}
        </div>
      </div>

      {/* 2. القيمة السوقية */}
      <div className="card-glow rounded-xl p-3.5 sm:p-4 border border-emerald-500/20 relative group overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">القيمة السوقية</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white font-mono">
          {formatCurrency(coin.market_cap, currency)}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          الترتيب العام: #{coin.market_cap_rank || '—'}
        </div>
      </div>

      {/* 3. القطاع */}
      <div className="card-glow rounded-xl p-3.5 sm:p-4 border border-emerald-500/20 relative group overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">القطاع والتصنيف</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-100 truncate mt-1">
          {coin.category || 'أصول بلوكتشين'}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {coin.sentiment_votes_up_percentage || 78}% تصويت إيجابي للمجتمع
        </div>
      </div>

      {/* 4. التوصية الفنية اليومية */}
      <div className="card-glow rounded-xl p-3.5 sm:p-4 border border-emerald-500/20 relative group overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">التوصية الفنية اليومية</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-lg sm:text-xl font-black ${
              analysis.recommendation.includes('شراء')
                ? 'text-emerald-400'
                : analysis.recommendation.includes('بيع')
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {analysis.recommendation}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
            {analysis.momentumScore}/100
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          الاتجاه: {analysis.trend} (RSI: {analysis.rsi14})
        </div>
      </div>
    </div>
  );
};
