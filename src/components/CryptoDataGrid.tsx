import React from 'react';
import {
  AlertTriangle,
  Globe,
  Database,
  Calendar,
  Layers,
  Flame,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { CoinDetail, FearAndGreedData, TechnicalAnalysisResult } from '../types/crypto';
import {
  Currency,
  formatCurrency,
  formatNumberCompact,
  formatPercentage,
  formatDateArabic,
  getFearGreedArabicClassification,
} from '../utils/formatters';

interface CryptoDataGridProps {
  coin: CoinDetail;
  fearGreed: FearAndGreedData;
  analysis: TechnicalAnalysisResult;
  currency: Currency;
}

export const CryptoDataGrid: React.FC<CryptoDataGridProps> = ({
  coin,
  fearGreed,
  analysis,
  currency,
}) => {
  const volToMcapRatio =
    coin.market_cap > 0 ? ((coin.total_volume / coin.market_cap) * 100).toFixed(2) : '—';

  const circPercentOfMax =
    coin.max_supply && coin.max_supply > 0
      ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1)
      : coin.total_supply && coin.total_supply > 0
      ? ((coin.circulating_supply / coin.total_supply) * 100).toFixed(1)
      : '100';

  const fgInfo = getFearGreedArabicClassification(fearGreed.value);

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25">
      {/* Top Header: Section Title + Data Sources Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            بيانات العملة الرقمية
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (مؤشرات أساسية ومقاييس السيولة)
          </span>
        </div>

        {/* Data Sources Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 ml-1">المصادر المستخدمة:</span>
          {(coin.data_sources && coin.data_sources.length > 0
            ? coin.data_sources
            : ['CoinGecko', 'Binance Public API', 'alternative.me']
          ).map((src) => (
            <span
              key={src}
              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono"
            >
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* 4x3 Grid (12 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. السعر */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium flex items-center justify-between">
            <span>السعر الحالي ({currency})</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold">
              {coin.symbol}/USDT
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.current_price, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>
              24س تغير:{' '}
              <span
                className={
                  coin.price_change_percentage_24h >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                }
              >
                {formatPercentage(coin.price_change_percentage_24h)}
              </span>
            </span>
            {currency !== 'USDT' && (
              <span className="text-[10px] font-mono text-emerald-400">
                {formatCurrency(coin.current_price, 'USDT')}
              </span>
            )}
          </div>
        </div>

        {/* 2. القيمة السوقية */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">القيمة السوقية</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.market_cap, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            الترتيب العالمي: #{coin.market_cap_rank || '—'}
          </div>
        </div>

        {/* 3. القيمة المخففة بالكامل FDV */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">القيمة المخففة (FDV)</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.fully_diluted_valuation || coin.market_cap, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            نسبة المتداول:{' '}
            <span className="text-emerald-400 font-bold font-mono">{circPercentOfMax}%</span>
          </div>
        </div>

        {/* 4. حجم التداول 24 ساعة */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">حجم التداول (24س)</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.total_volume, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            نسبة الحجم/القيمة:{' '}
            <span className="text-emerald-400 font-bold font-mono">{volToMcapRatio}%</span>
          </div>
        </div>

        {/* 5. العرض المتداول */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">العرض المتداول</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatNumberCompact(coin.circulating_supply)}{' '}
            <span className="text-xs font-normal text-slate-400">{coin.symbol}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            الحد الأقصى: {coin.max_supply ? formatNumberCompact(coin.max_supply) : 'غير محدود (∞)'}
          </div>
        </div>

        {/* 6. أعلى سعر تاريخي ATH */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">أعلى سعر تاريخي (ATH)</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.ath, currency)}
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-1">
            انخفاض {formatPercentage(coin.ath_change_percentage)} ({formatDateArabic(coin.ath_date)})
          </div>
        </div>

        {/* 7. أقل سعر تاريخي ATL */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">أدنى سعر تاريخي (ATL)</div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {formatCurrency(coin.atl, currency)}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            ارتفاع {formatPercentage(coin.atl_change_percentage)} ({formatDateArabic(coin.atl_date)})
          </div>
        </div>

        {/* 8. مؤشر الخوف والطمع */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium flex items-center justify-between">
            <span>مؤشر الخوف والطمع</span>
            <span className={`text-[11px] font-bold ${fgInfo.colorClass}`}>{fgInfo.text}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              {fearGreed.value}/100
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fearGreed.value <= 25
                  ? 'bg-rose-500'
                  : fearGreed.value <= 48
                  ? 'bg-orange-500'
                  : fearGreed.value <= 55
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, fearGreed.value))}%` }}
            />
          </div>
        </div>

        {/* 9. التغير خلال 7 أيام */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">أداء 7 أيام</div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              (coin.price_change_percentage_7d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(coin.price_change_percentage_7d)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">المدى الأسبوعي القريب</div>
        </div>

        {/* 10. التغير خلال 14/10 يوماً */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">أداء 14 يوماً</div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              (coin.price_change_percentage_14d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(coin.price_change_percentage_14d)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">المدى نصف الشهري</div>
        </div>

        {/* 11. التغير خلال 30 يوماً */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">أداء 30 يوماً (شهر)</div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              (coin.price_change_percentage_30d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(coin.price_change_percentage_30d)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">الزخم الشهري التراكمي</div>
        </div>

        {/* 12. التغير منذ بداية العام وسنة */}
        <div className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
          <div className="text-slate-400 text-xs mb-1 font-medium">سنة كاملة (1Y / YTD)</div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              (coin.price_change_percentage_1y || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(coin.price_change_percentage_1y)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            YTD: {formatPercentage(coin.price_change_percentage_ytd)}
          </div>
        </div>
      </div>

      {/* Auto Warning: Mixed Picture Bar (صورة مختلطة للعملة) */}
      {analysis.isMixedPicture && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-amber-300">
              تنبيه فني تلقائي: صورة مختلطة للعملة (Mixed Signals)
            </div>
            <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
              {analysis.mixedPictureReason ||
                'تتعارض المؤشرات اللحظية قصيرة المدى مع الاتجاه الكلي العام أو تتضارب إشارات المتوسطات مع المذبذبات، مما يستدعي التريث وانتظار تأكيد اختراق واضح قبل اتخاذ قرارات تداول كبيرة.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
