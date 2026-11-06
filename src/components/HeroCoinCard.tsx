import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Share2,
  Check,
  Award,
  Sparkles,
  Calculator,
  Printer,
  Copy,
  Bell,
  Users,
} from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult } from '../types/crypto';
import { Currency, formatUsdtPrice } from '../utils/formatters';

interface HeroCoinCardProps {
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  currency?: Currency;
  onOpenUsdtCalc?: () => void;
  onOpenPdfReport?: () => void;
  onOpenShareCard?: () => void;
  onOpenAlerts?: () => void;
  onOpenTradingAgents?: () => void;
}

type PriceFlashDirection = 'up' | 'down' | 'none';

/**
 * Smooth numeric interpolator for same-coin price ticks.
 * Resets immediately on coin symbol switch to avoid counting across different coins.
 */
function useAnimatedCoinPrice(
  symbol: string,
  targetPrice: number,
  prefersReducedMotion: boolean | null
): {
  displayPrice: number;
  flashDirection: PriceFlashDirection;
} {
  const [displayPrice, setDisplayPrice] = useState<number>(targetPrice);
  const [flashDirection, setFlashDirection] = useState<PriceFlashDirection>('none');

  const prevSymbolRef = useRef<string>(symbol);
  const prevPriceRef = useRef<number>(targetPrice);
  const rafRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Coin switched -> snap immediately to new coin's live price without cross-coin counting
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      prevPriceRef.current = targetPrice;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      setFlashDirection('none');
      setDisplayPrice(targetPrice);
      return;
    }

    // 2. Same coin price tick -> trigger emerald/rose flash and smooth rAF interpolation
    const startPrice = prevPriceRef.current;
    if (startPrice === targetPrice || !Number.isFinite(targetPrice)) {
      return;
    }

    const direction: PriceFlashDirection = targetPrice > startPrice ? 'up' : 'down';
    prevPriceRef.current = targetPrice;
    setFlashDirection(direction);

    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashDirection('none');
    }, 650);

    if (prefersReducedMotion) {
      setDisplayPrice(targetPrice);
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const durationMs = 260;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = startPrice + (targetPrice - startPrice) * eased;
      setDisplayPrice(currentVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayPrice(targetPrice);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [symbol, targetPrice, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return { displayPrice, flashDirection };
}

export const HeroCoinCard: React.FC<HeroCoinCardProps> = ({
  coin,
  analysis,
  isFavorite,
  onToggleFavorite,
  onOpenUsdtCalc,
  onOpenPdfReport,
  onOpenShareCard,
  onOpenAlerts,
  onOpenTradingAgents,
}) => {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { displayPrice, flashDirection } = useAnimatedCoinPrice(
    coin.symbol,
    coin.current_price,
    prefersReducedMotion
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trendIcon =
    analysis.trend === 'صاعد' ? (
      <TrendingUp className="w-4 h-4 text-emerald-400" />
    ) : analysis.trend === 'هابط' ? (
      <TrendingDown className="w-4 h-4 text-rose-400" />
    ) : (
      <Minus className="w-4 h-4 text-amber-400" />
    );

  const trendBadgeStyle =
    analysis.trend === 'صاعد'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
      : analysis.trend === 'هابط'
      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
      : 'bg-amber-500/15 border-amber-500/40 text-amber-300';

  const ambientGlowColor =
    analysis.trend === 'صاعد'
      ? 'bg-emerald-500/12'
      : analysis.trend === 'هابط'
      ? 'bg-rose-500/12'
      : 'bg-amber-500/10';

  const recommendationColor =
    analysis.recommendation.includes('شراء')
      ? 'from-emerald-500/30 to-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
      : analysis.recommendation.includes('بيع')
      ? 'from-rose-500/30 to-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
      : 'from-amber-500/30 to-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]';

  const priceFlashStyle =
    flashDirection === 'up'
      ? 'bg-emerald-500/35 border-emerald-400 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.55)] scale-[1.02]'
      : flashDirection === 'down'
      ? 'bg-rose-500/35 border-rose-400 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.55)] scale-[1.02]'
      : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] scale-100';

  const smoothTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300">
      {/* Dynamic Ambient Trend Flare */}
      <div
        className={`absolute top-0 right-0 w-72 h-36 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${ambientGlowColor}`}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        {/* Coin Identification with Smooth Fade + Slide & Icon Scale on Coin Switch */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={coin.symbol}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={smoothTransition}
            className="flex items-center gap-3.5"
          >
            {/* Coin Avatar with Subtle Scale-In */}
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={smoothTransition}
              className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-emerald-500/30 p-2 flex items-center justify-center shadow-lg"
            >
              {coin.image ? (
                <img
                  src={coin.image}
                  alt={coin.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg font-mono">
                  {coin.symbol.slice(0, 2)}
                </div>
              )}
              <span className="absolute -bottom-1 -left-1 text-[10px] bg-slate-950 border border-slate-700 px-1.5 py-0.2 rounded font-mono tabular-nums text-slate-300">
                #{coin.market_cap_rank || '—'}
              </span>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-wide font-mono">
                  {coin.symbol}
                </h2>
                <span className="text-sm text-slate-300 font-medium">({coin.name})</span>

                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="p-1 rounded-md hover:bg-slate-800 transition-transform active:scale-90 text-slate-400 hover:text-amber-400"
                  title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                >
                  <Star
                    className={`w-4 h-4 transition-colors duration-200 ${
                      isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Category */}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900/90 text-slate-400 border border-slate-800">
                  {coin.category || 'أصول رقمية'}
                </span>

                {/* Animated Trend Badge */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={`${coin.symbol}-${analysis.trend}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.16 }}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-semibold transition-colors duration-300 ${trendBadgeStyle}`}
                  >
                    {trendIcon}
                    <span>اتجاه {analysis.trend}</span>
                  </motion.span>
                </AnimatePresence>

                {/* Rank */}
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono tabular-nums">
                  <Award className="w-3 h-3 text-emerald-400" />
                  الترتيب #{coin.market_cap_rank}
                </span>

                {/* Pair & Live USDT Price with Instant Emerald/Rose Flash & Smooth Counter */}
                <span
                  data-testid="hero-live-price-badge"
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-mono tabular-nums font-bold transition-all duration-200 ${priceFlashStyle}`}
                >
                  <span>{coin.symbol}/USDT:</span>
                  <span className="text-white font-mono tabular-nums">
                    {formatUsdtPrice(displayPrice)}
                  </span>
                  {flashDirection === 'up' && (
                    <span className="text-[10px] text-emerald-300 font-bold" aria-label="ارتفاع لحظي">
                      ▲
                    </span>
                  )}
                  {flashDirection === 'down' && (
                    <span className="text-[10px] text-rose-300 font-bold" aria-label="انخفاض لحظي">
                      ▼
                    </span>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right side: Recommendation, TradingAgents Trigger, USDT Calc Button & Share */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* TauricResearch TradingAgents Multi-Agent Button */}
          {onOpenTradingAgents && (
            <button
              type="button"
              onClick={onOpenTradingAgents}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 hover:border-emerald-400 hover:bg-emerald-500/25 text-emerald-200 transition-all font-bold text-xs shadow-md whitespace-nowrap shrink-0"
              title="فتح غرفة عمليات وكلاء التداول المتعددين (TauricResearch TradingAgents)"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>وكلاء التداول (TradingAgents)</span>
            </button>
          )}

          {/* Quick USDT Calculator Button */}
          {onOpenUsdtCalc && (
            <button
              type="button"
              onClick={onOpenUsdtCalc}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-300 transition-all font-semibold text-xs shadow-md whitespace-nowrap shrink-0"
              title="فتح حاسبة أسعار العملات بـ USDT"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>حاسبة USDT</span>
            </button>
          )}

          {/* PDF Report Export Button */}
          {onOpenPdfReport && (
            <button
              type="button"
              onClick={onOpenPdfReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-slate-200 hover:text-white transition-all font-semibold text-xs shadow-md whitespace-nowrap shrink-0"
              title="تصدير تقرير تحليل شامل للعملة بصيغة PDF"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>تصدير PDF</span>
            </button>
          )}

          {/* Animated Technical Recommendation Badge */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${coin.symbol}-${analysis.recommendation}`}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94, y: -4 }}
              transition={smoothTransition}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r border text-center transition-colors duration-300 ${recommendationColor}`}
            >
              <div className="text-[11px] text-slate-300/90 font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>التوصية الفنية</span>
              </div>
              <div className="text-base sm:text-lg font-black tracking-wide">
                {analysis.recommendation}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Custom Price Alert Button */}
          {onOpenAlerts && (
            <button
              type="button"
              onClick={onOpenAlerts}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/15 text-amber-300 transition-all font-semibold text-xs shadow-md whitespace-nowrap shrink-0"
              title="ضبط تنبيه سعري مخصص للعملة (SMS أو بريد إلكتروني)"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>تنبيه سعري</span>
            </button>
          )}

          {/* Share Card Modal Trigger */}
          {onOpenShareCard && (
            <button
              type="button"
              onClick={onOpenShareCard}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-300 transition-all font-semibold text-xs shadow-md whitespace-nowrap shrink-0"
              title="تصدير بطاقة التحليل كصورة للنشر على إنستغرام وتيليجرام"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>مشاركة البطاقة</span>
            </button>
          )}

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 transition-colors relative"
            title="نسخ رابط العملة للمشاركة"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                تم النسخ!
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
