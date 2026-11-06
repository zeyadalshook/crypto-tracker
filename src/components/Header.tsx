import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Calculator,
  SlidersHorizontal,
  Briefcase,
  Bell,
  PlayCircle,
  HelpCircle,
  Activity,
  Layers,
  ChevronDown,
  Flame,
  Grid3X3,
  ArrowRightLeft,
  ShieldCheck,
  Printer,
  FileText,
  BookOpen,
  Wallet,
  Sparkles,
  Share2,
  Calendar,
  Zap,
  Power,
  Brain,
  Star,
  Users,
} from 'lucide-react';
import { Currency } from '../utils/formatters';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  currency: Currency;
  onChangeCurrency: (c: Currency) => void;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenDisclaimer: () => void;
  viewMode: 'pro' | 'simple';
  onToggleViewMode: () => void;
  favoritesCount?: number;
  onOpenWatchlist?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  currency,
  onChangeCurrency,
  lastUpdated,
  onRefresh,
  isRefreshing,
  activeTab,
  onChangeTab,
  onOpenDisclaimer,
  viewMode,
  onToggleViewMode,
  favoritesCount,
  onOpenWatchlist,
  onOpenCommandPalette,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const popularCoins = ['BTC', 'ETH', 'SOL', 'PYTH', 'BNB', 'XRP', 'AVAX', 'LINK', 'SUI', 'NEAR'];

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const list = await res.json();
          setSearchResults(list);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCoin = (symbol: string) => {
    onSelectSymbol(symbol.toUpperCase());
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectCoin(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/60 bg-[#050b08]/90 backdrop-blur-md">
      {/* Top Main Navigation Bar */}
      <div className="max-w-[1720px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>القراءة الفنية والأساسية</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                PRO TERMINAL
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              التحليل الفني والأساسي المتقدم للعملات الرقمية مع الذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Global Coin Search Bar */}
        <div className="relative flex-1 max-w-md min-w-[260px]" ref={dropdownRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالرمز أو الاسم (مثلاً: PYTH، BTC، SOL...)"
              className="w-full h-10 pr-10 pl-10 bg-slate-900/80 border border-emerald-500/25 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all shadow-inner"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-emerald-400 pointer-events-none" />
            {isSearching && (
              <RefreshCw className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-12 right-0 left-0 bg-[#07130c] border border-emerald-500/30 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              <div className="p-1 text-xs text-slate-400 border-b border-emerald-950 px-3 py-1.5 font-medium">
                نتائج البحث
              </div>
              {searchResults.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => handleSelectCoin(coin.symbol)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-500/15 transition-colors border-b border-slate-800/40 last:border-b-0 text-right group"
                >
                  <div className="flex items-center gap-2.5">
                    {coin.thumb && (
                      <img src={coin.thumb} alt={coin.name} className="w-5 h-5 rounded-full" />
                    )}
                    <div>
                      <span className="font-bold text-slate-100 group-hover:text-emerald-300">
                        {coin.symbol}
                      </span>
                      <span className="text-xs text-slate-400 mr-2">{coin.name}</span>
                    </div>
                  </div>
                  {coin.market_cap_rank && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      #{coin.market_cap_rank}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls & Preferences */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-emerald-500/25 rounded-lg p-0.5 text-xs">
            {(['USDT', 'USD', 'IQD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => onChangeCurrency(c)}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  currency === c
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'USDT' ? '₮ USDT' : c === 'USD' ? 'USD $' : c === 'IQD' ? 'د.ع IQD' : 'EUR €'}
              </button>
            ))}
          </div>

          {/* View Mode (Simple vs Pro) */}
          <button
            onClick={onToggleViewMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900/80 hover:border-emerald-500/40 text-slate-300 transition-colors"
            title="تبديل العرض بين المبتدئ والاحترافي"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {viewMode === 'pro' ? 'العرض: احترافي' : 'العرض: مبسط'}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors disabled:opacity-50"
            title="تحديث البيانات لحظياً"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">تحديث</span>
          </button>

          {/* Quick Command Palette Trigger (Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900/90 hover:border-emerald-500/40 text-slate-200 transition-colors whitespace-nowrap shrink-0"
              title="لوحة الأوامر والوصول الفوري (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">بحث الأوامر</span>
              <kbd className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                Ctrl+K
              </kbd>
            </button>
          )}

          {/* Watchlist / Favorites Button */}
          {onOpenWatchlist && (
            <button
              onClick={onOpenWatchlist}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all shadow-[0_0_10px_rgba(251,191,36,0.15)]"
              title="عرض قائمة المفضلات والرسوم البيانية المصغرة (24H Sparklines)"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="hidden sm:inline">المفضلات</span>
              {favoritesCount !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/25 text-amber-200 text-[10px] font-mono font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* Legal Notice Button */}
          <button
            onClick={onOpenDisclaimer}
            className="flex items-center gap-1 p-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-400/10 transition-colors border border-amber-500/20"
            title="إخلاء المسؤولية القانونية"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Bar: Popular Coins Bar & Navigation Tabs */}
      <div className="max-w-[1720px] mx-auto px-4 py-2 border-t border-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Popular Quick Coins */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-slate-500 text-[11px] font-medium ml-1 whitespace-nowrap">العملات الشائعة:</span>
          {popularCoins.map((sym) => (
            <button
              key={sym}
              onClick={() => handleSelectCoin(sym)}
              className={`px-2.5 py-1 rounded-md font-mono text-xs transition-all ${
                currentSymbol === sym
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {[
            { id: 'brain', label: 'العقل المدبر (Autopilot)', icon: Brain },
            { id: 'trading-agents', label: 'وكلاء التداول (TradingAgents)', icon: Users },
            { id: 'dashboard', label: 'اللوحة التحليلية', icon: Activity },
            { id: 'smart-dca', label: 'محاكي التراكم الذكي (Smart DCA)', icon: TrendingUp },
            { id: 'stress-test', label: 'اختبار ضغط المحفظة (Stress Test)', icon: ShieldAlert },
            { id: 'one-click-analysis', label: 'التحليل الشامل بضغطة واحدة', icon: Sparkles },
            { id: 'live-execution', label: 'محرك التنفيذ الآلي (Kill Switch)', icon: Power },
            { id: 'execution-liquidity', label: 'جودة التنفيذ والسيولة', icon: Zap },
            { id: 'evidence-gate', label: 'بوابة اعتماد الاستراتيجية', icon: ShieldCheck },
            { id: 'journal', label: 'دفتر التداول', icon: BookOpen },
            { id: 'paper-trading', label: 'التداول الورقي', icon: Wallet },
            { id: 'chart-vision', label: 'قارئ الشارت بالذكاء', icon: Sparkles },
            { id: 'derivatives-pro', label: 'المشتقات والسيولة', icon: Zap },
            { id: 'heatmap', label: 'خريطة السوق والقطاعات', icon: Grid3X3 },
            { id: 'whales-calendar', label: 'الحيتان والتقويم', icon: Calendar },
            { id: 'share-card', label: 'بطاقة النشر', icon: Share2 },
            { id: 'usdt-calc', label: 'حاسبة أسعار USDT', icon: ArrowRightLeft },
            { id: 'fear-greed', label: 'مؤشر الخوف والطمع', icon: Flame },
            { id: 'correlation', label: 'مصفوفة الارتباط', icon: Grid3X3 },
            { id: 'calculator', label: 'حاسبة الصفقات', icon: Calculator },
            { id: 'screener', label: 'ماسح السوق', icon: SlidersHorizontal },
            { id: 'fundamentals', label: 'تقييم الأساسيات', icon: SlidersHorizontal },
            { id: 'portfolio', label: 'المحفظة', icon: Briefcase },
            { id: 'alerts', label: 'التنبيهات', icon: Bell },
            { id: 'backtest', label: 'اختبار الاستراتيجية', icon: PlayCircle },
            { id: 'pdf-report', label: 'تصدير تقرير PDF', icon: Printer },
            { id: 'error-log', label: 'سجل الأخطاء ومصادر البيانات', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
