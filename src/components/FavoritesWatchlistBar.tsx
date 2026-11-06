import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { SparklineChart } from './common/SparklineChart';

export interface FavoritePairData {
  symbol: string;
  pair: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h?: number;
  sparkline: number[];
  isPositive: boolean;
  source?: string;
}

interface FavoritesWatchlistBarProps {
  favorites: string[];
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  onOpenFullWatchlist?: () => void;
  className?: string;
}

export const FavoritesWatchlistBar: React.FC<FavoritesWatchlistBarProps> = ({
  favorites,
  currentSymbol,
  onSelectSymbol,
  onToggleFavorite,
  onOpenFullWatchlist,
  className = '',
}) => {
  const [pairsData, setPairsData] = useState<Record<string, FavoritePairData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const popularCoinsToAdd = ['BTC', 'ETH', 'SOL', 'PYTH', 'BNB', 'XRP', 'AVAX', 'LINK', 'SUI', 'NEAR', 'DOGE', 'ADA'];

  // Fetch 24h sparklines for all favorites
  const fetchSparklines = useCallback(async (silent = false) => {
    if (favorites.length === 0) {
      setPairsData({});
      setIsLoading(false);
      return;
    }

    if (!silent) setIsRefreshing(true);

    try {
      const res = await fetch(`/api/favorites/sparklines?symbols=${encodeURIComponent(favorites.join(','))}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.sparklines)) {
          const map: Record<string, FavoritePairData> = {};
          json.sparklines.forEach((item: FavoritePairData) => {
            map[item.symbol] = item;
          });
          setPairsData(map);
        }
      }
    } catch (err) {
      console.warn('Failed to load favorites sparklines:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [favorites]);

  useEffect(() => {
    fetchSparklines(false);
    const interval = setInterval(() => {
      fetchSparklines(true);
    }, 45000); // 45 seconds refresh
    return () => clearInterval(interval);
  }, [fetchSparklines]);

  // Click outside add menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const formatPrice = (p: number) => {
    if (!p) return '--';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(6);
  };

  const handleAddSymbol = (sym: string) => {
    const cleaned = sym.trim().toUpperCase().replace(/USDT$/, '');
    if (cleaned && !favorites.includes(cleaned)) {
      onToggleFavorite(cleaned);
    }
    setAddSearchQuery('');
    setShowAddMenu(false);
  };

  return (
    <section
      aria-label="قائمة المفضلات"
      className={`relative w-full rounded-2xl bg-gradient-to-r from-[#06120a] via-[#050f09] to-[#040b07] border border-emerald-500/25 shadow-lg overflow-hidden ${className}`}
    >
      {/* Top Bar Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-950/60 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
              <span>قائمة المفضلات</span>
              <span className="text-[10px] text-emerald-400 font-mono font-normal">
                (Watchlist · 24H Sparkline)
              </span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/25">
              {favorites.length} {favorites.length === 1 ? 'زوج' : 'أزواج'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:inline border-r border-slate-800 pr-2.5">
            رسم بياني مصغر لحظي لأداء كل زوج خلال الـ 24 ساعة الماضية
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Scroll Arrows for horizontal list */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-0.5">
            <button
              onClick={() => handleScroll('right')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="التمرير لليمين"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('left')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="التمرير لليسار"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Sparklines */}
          <button
            onClick={() => fetchSparklines(false)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-slate-800 transition-colors disabled:opacity-50"
            title="تحديث الرسوم البيانية للـ 24 ساعة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Add Coin Popover Toggle */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition-all shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              title="إضافة زوج جديد للمفضلة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة زوج</span>
            </button>

            {/* Dropdown Menu */}
            {showAddMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-9 w-64 p-3 bg-[#07140d] border border-emerald-500/40 rounded-xl shadow-2xl z-50 text-slate-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-950">
                  <span className="text-xs font-bold text-white">إضافة عملة للمفضلة</span>
                  <button
                    onClick={() => setShowAddMenu(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (addSearchQuery.trim()) {
                      handleAddSymbol(addSearchQuery);
                    }
                  }}
                  className="mb-2"
                >
                  <input
                    type="text"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    placeholder="اكتب الرمز (مثل ADA, NEAR)..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-500/30 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                    autoFocus
                  />
                </form>

                <div className="text-[11px] text-slate-400 mb-1.5 font-medium">عملات سريعة:</div>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                  {popularCoinsToAdd
                    .filter((s) => !favorites.includes(s))
                    .map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => handleAddSymbol(sym)}
                        className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-800 text-[11px] font-mono transition-colors"
                      >
                        +{sym}/USDT
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Watchlist Modal Button */}
          {onOpenFullWatchlist && (
            <button
              onClick={onOpenFullWatchlist}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="عرض موسع لكافة المفضلات"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">عرض موسع</span>
            </button>
          )}
        </div>
      </div>

      {/* Favorites Carousel / Horizontal Strip */}
      <div
        ref={scrollContainerRef}
        className="px-3 py-2.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {favorites.length === 0 ? (
          <div className="w-full py-4 px-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-slate-600" />
              <span>قائمة المفضلات فارغة حالياً. أضف العملات التي تتابعها للحصول على شارت 24 ساعة لحظي.</span>
            </div>
            <button
              onClick={() => {
                ['BTC', 'ETH', 'SOL', 'PYTH'].forEach((s) => {
                  if (!favorites.includes(s)) onToggleFavorite(s);
                });
              }}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-all"
            >
              إضافة الأزواج القياسية (BTC, ETH, SOL, PYTH)
            </button>
          </div>
        ) : (
          favorites.map((sym) => {
            const data = pairsData[sym];
            const isSelected = currentSymbol === sym;
            const change24 = data?.change24h ?? 0;
            const isPositive = data ? data.isPositive : change24 >= 0;
            const prices = data?.sparkline || [];

            return (
              <div
                key={sym}
                onClick={() => onSelectSymbol(sym)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSymbol(sym);
                  }
                }}
                className={`group relative flex-shrink-0 flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/70 hover:bg-slate-900/90 border-emerald-950/70 hover:border-emerald-500/35 hover:shadow-md'
                }`}
              >
                {/* Active Indicator Dot */}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                )}

                {/* Left side: Symbol & Live Price */}
                <div className="flex flex-col min-w-[76px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors font-mono tracking-tight">
                      {sym}
                      <span className="text-[10px] text-slate-500 font-normal">/USDT</span>
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-xs font-mono font-extrabold text-slate-200 mt-0.5">
                    {isLoading && !data ? (
                      <span className="inline-block w-12 h-3.5 bg-slate-800 rounded animate-pulse" />
                    ) : (
                      `$${formatPrice(data?.currentPrice || 0)}`
                    )}
                  </div>
                </div>

                {/* Center: The 24h Sparkline (الرسم البياني المصغر) */}
                <div className="flex flex-col items-center justify-center px-1">
                  {isLoading && (!data || prices.length === 0) ? (
                    <div className="w-[84px] h-[30px] bg-slate-900/80 rounded border border-slate-800/80 animate-pulse flex items-center justify-center">
                      <span className="text-[9px] text-slate-600 font-mono">24H</span>
                    </div>
                  ) : (
                    <div className="relative" title={`أداء ${sym}/USDT خلال 24 ساعة: ${change24 > 0 ? '+' : ''}${change24}%`}>
                      <SparklineChart
                        data={prices}
                        width={84}
                        height={30}
                        isPositive={isPositive}
                        strokeWidth={1.8}
                        showGradient={true}
                        showDot={true}
                        interactive={true}
                      />
                    </div>
                  )}
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">24 ساعة</span>
                </div>

                {/* Right side: 24h Change Badge & Unfavorite Button */}
                <div className="flex flex-col items-end gap-1">
                  {/* 24h Percentage */}
                  <div
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isPositive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}
                      {change24.toFixed(2)}%
                    </span>
                  </div>

                  {/* Unfavorite / Star Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(sym);
                    }}
                    className="opacity-40 group-hover:opacity-100 hover:text-amber-400 text-slate-400 transition-all p-0.5"
                    title={`إزالة ${sym} من قائمة المفضلات`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
