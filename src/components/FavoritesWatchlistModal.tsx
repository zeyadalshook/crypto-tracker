import React, { useEffect, useRef } from 'react';
import {
  Star,
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Layers,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { SparklineChart } from './common/SparklineChart';
import { FavoritePairData } from './FavoritesWatchlistBar';
import { Currency, formatCurrency } from '../utils/formatters';

interface FavoritesWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  currency: Currency;
}

export const FavoritesWatchlistModal: React.FC<FavoritesWatchlistModalProps> = ({
  isOpen,
  onClose,
  favorites,
  currentSymbol,
  onSelectSymbol,
  onToggleFavorite,
  currency,
}) => {
  const [dataMap, setDataMap] = React.useState<Record<string, FavoritePairData>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch sparklines data
  const loadData = React.useCallback(async () => {
    if (favorites.length === 0) {
      setDataMap({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/favorites/sparklines?symbols=${encodeURIComponent(favorites.join(','))}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.sparklines)) {
          const map: Record<string, FavoritePairData> = {};
          json.sparklines.forEach((item: FavoritePairData) => {
            map[item.symbol] = item;
          });
          setDataMap(map);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch favorites data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [favorites]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Escape to close & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatPrice = (p: number) => {
    if (!p) return '--';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl bg-[#06120b] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="watchlist-modal-title" className="text-lg sm:text-xl font-black text-white">
                  قائمة المفضلات والرسوم البيانية المصغرة (24H Sparklines)
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                  {favorites.length} أزواج
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                نظرة سريعة شاملة على سلوك أزواجك المفضلة خلال الـ 24 ساعة الماضية مع بيانات الأسعار والمدى السعري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-slate-800 transition-colors disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {favorites.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Star className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm">لا توجد أزواج في قائمة المفضلات حالياً.</p>
              <button
                onClick={() => {
                  ['BTC', 'ETH', 'SOL', 'PYTH'].forEach((s) => onToggleFavorite(s));
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
              >
                إضافة الأزواج القياسية (BTC, ETH, SOL, PYTH)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favorites.map((sym) => {
                const item = dataMap[sym];
                const isSelected = currentSymbol === sym;
                const change24 = item?.change24h ?? 0;
                const isPositive = item ? item.isPositive : change24 >= 0;
                const prices = item?.sparkline || [];
                const high24 = item?.high24h || (prices.length > 0 ? Math.max(...prices) : 0);
                const low24 = item?.low24h || (prices.length > 0 ? Math.min(...prices) : 0);

                return (
                  <div
                    key={sym}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Top row: Symbol, Price & Change */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-sm text-emerald-300">
                          {sym.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-base text-white font-mono">
                              {sym}/USDT
                            </span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                محدد حالياً
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            زوج تداول فوري Binance
                          </span>
                        </div>
                      </div>

                      {/* Live Price & Change */}
                      <div className="text-left font-mono">
                        <div className="text-base font-black text-slate-100">
                          ${formatPrice(item?.currentPrice || 0)}
                        </div>
                        <div
                          className={`flex items-center justify-end gap-1 text-xs font-bold ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {change24.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: 24-Hour Sparkline Chart (Large View) */}
                    <div className="bg-[#030905]/80 p-3 rounded-lg border border-slate-900 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>أداء الـ 24 ساعة الماضية (1H Closes):</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-rose-400">قاع: ${formatPrice(low24)}</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-emerald-400">قمة: ${formatPrice(high24)}</span>
                        </div>
                      </div>

                      <div className="w-full flex items-center justify-center py-1">
                        {isLoading && (!item || prices.length === 0) ? (
                          <div className="w-full h-12 bg-slate-900/60 rounded animate-pulse" />
                        ) : (
                          <SparklineChart
                            data={prices}
                            width={380}
                            height={48}
                            isPositive={isPositive}
                            strokeWidth={2}
                            showGradient={true}
                            showDot={true}
                            interactive={true}
                            className="w-full justify-center"
                          />
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                      <button
                        onClick={() => {
                          onSelectSymbol(sym);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>فتح التحليل الفني والأساسي</span>
                      </button>

                      <button
                        onClick={() => onToggleFavorite(sym)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-colors"
                        title="إزالة من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>الرسوم البيانية المصغرة مستقاة مباشرة من إغلاقات الشموع الساعية لـ 24 ساعة عبر Binance</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
