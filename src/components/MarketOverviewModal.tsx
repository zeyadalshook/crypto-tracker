import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Flame,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';

interface MarketOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
  currency: Currency;
}

export const MarketOverviewModal: React.FC<MarketOverviewModalProps> = ({
  isOpen,
  onClose,
  onSelectCoin,
  currency,
}) => {
  if (!isOpen) return null;

  const [marketData, setMarketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d'>('24h');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const fetchMarketOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/market-heatmap');
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch (err) {
      console.error('Failed to fetch market overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketOverview();
  }, []);

  // Collect all coins from sectors
  const allCoins = React.useMemo(() => {
    if (!marketData?.sectors) return [];
    const list: any[] = [];
    marketData.sectors.forEach((sec: any) => {
      sec.coins.forEach((c: any) => {
        list.push({ ...c, sectorId: sec.id, sectorName: sec.nameAr });
      });
    });
    return list;
  }, [marketData]);

  const filteredCoins = React.useMemo(() => {
    if (selectedSector === 'all') return allCoins;
    return allCoins.filter((c) => c.sectorId === selectedSector);
  }, [allCoins, selectedSector]);

  // Color generator based on percentage change
  const getHeatmapColor = (change: number) => {
    if (change >= 10) return 'bg-emerald-500/80 text-slate-950 font-black border-emerald-400';
    if (change >= 5) return 'bg-emerald-600/60 text-white font-bold border-emerald-500/60';
    if (change > 0) return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50';
    if (change === 0) return 'bg-slate-900 text-slate-400 border-slate-800';
    if (change > -5) return 'bg-rose-950/50 text-rose-300 border-rose-800/50';
    if (change > -10) return 'bg-rose-600/60 text-white font-bold border-rose-500/60';
    return 'bg-rose-500/80 text-slate-950 font-black border-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#06110a] border border-emerald-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  خريطة السوق الحرارية وأداء القطاعات (Crypto Heatmap)
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  TOP 100 ASSETS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفح حجم التداول، هيمنة البيتكوين، مؤشر موسم العملات البديلة، ومقارنة أداء القطاعات اللحظية.
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
          {isLoading && !marketData ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span>جاري تحميل بيانات خريطة السوق المباشرة...</span>
            </div>
          ) : (
            marketData && (
              <>
                {/* 1. Macro Market Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* BTC Dominance */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">هيمنة البيتكوين (BTC.D)</span>
                    <span className="text-lg font-black font-mono text-amber-400 mt-1 block">
                      {marketData.btcDominance}%
                    </span>
                    <span className="text-[10px] text-slate-500">حصة القيمة السوقية</span>
                  </div>

                  {/* ETH Dominance */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">هيمنة الإيثيريوم (ETH.D)</span>
                    <span className="text-lg font-black font-mono text-sky-400 mt-1 block">
                      {marketData.ethDominance}%
                    </span>
                    <span className="text-[10px] text-slate-500">العقود الذكية</span>
                  </div>

                  {/* Altseason Index */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">مؤشر موسم البديلات</span>
                    <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
                      {marketData.altseasonIndex}/100
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {marketData.altseasonIndex >= 75 ? 'موسم بديلات قوي' : 'أداء متوازن مع BTC'}
                    </span>
                  </div>

                  {/* Total Market Cap */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">إجمالي القيمة السوقية</span>
                    <span className="text-lg font-black font-mono text-white mt-1 block">
                      ${marketData.totalMarketCapTrillion}T
                    </span>
                    <span className="text-[10px] text-slate-500">تريليون دولار</span>
                  </div>

                  {/* 24h Volume */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">حجم التداول اليومي</span>
                    <span className="text-lg font-black font-mono text-emerald-300 mt-1 block">
                      ${marketData.totalVolumeBillion}B
                    </span>
                    <span className="text-[10px] text-slate-500">مليار دولار / 24س</span>
                  </div>
                </div>

                {/* 2. Top Gainers & Losers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Gainers */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>أكبر الرابحين في السوق (Top Gainers)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {marketData.topGainers?.map((g: any) => (
                        <button
                          key={g.symbol}
                          onClick={() => {
                            onSelectCoin(g.symbol);
                            onClose();
                          }}
                          className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-400 transition-all text-right"
                        >
                          <div className="font-mono font-bold text-white text-xs">{g.symbol}</div>
                          <div className="text-xs font-mono font-black text-emerald-400 mt-0.5">
                            +{g.change24h}%
                          </div>
                          <div className="text-[10px] text-slate-400">${g.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                      <TrendingDown className="w-4 h-4" />
                      <span>الأكثر تراجعاً للتصحيح (Top Losers)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {marketData.topLosers?.map((l: any) => (
                        <button
                          key={l.symbol}
                          onClick={() => {
                            onSelectCoin(l.symbol);
                            onClose();
                          }}
                          className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 hover:border-rose-400 transition-all text-right"
                        >
                          <div className="font-mono font-bold text-white text-xs">{l.symbol}</div>
                          <div className="text-xs font-mono font-black text-rose-400 mt-0.5">
                            {l.change24h}%
                          </div>
                          <div className="text-[10px] text-slate-400">${l.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Sectors Performance Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      أداء قطاعات الكريبتو (Sectors Breakdown):
                    </span>
                    {/* Timeframe toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setSelectedTimeframe('24h')}
                        className={`px-2.5 py-0.5 rounded ${
                          selectedTimeframe === '24h' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                        }`}
                      >
                        تغير 24 ساعة
                      </button>
                      <button
                        onClick={() => setSelectedTimeframe('7d')}
                        className={`px-2.5 py-0.5 rounded ${
                          selectedTimeframe === '7d' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                        }`}
                      >
                        تغير 7 أيام
                      </button>
                    </div>
                  </div>

                  {/* Sector Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setSelectedSector('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedSector === 'all'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      جميع القطاعات
                    </button>
                    {marketData.sectors?.map((sec: any) => (
                      <button
                        key={sec.id}
                        onClick={() => setSelectedSector(sec.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          selectedSector === sec.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        <span>{sec.nameAr}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            sec.avgChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          ({sec.avgChange24h >= 0 ? '+' : ''}
                          {sec.avgChange24h}%)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Interactive Treemap / Heatmap Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>اضغط على أي عملة لفتح لوحة التحليل الكاملة الخاصة بها فوراً:</span>
                    <span className="text-[11px] text-slate-500">حجم البطاقة يتناسب مع القيمة السوقية</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {filteredCoins.map((coin: any) => {
                      const changeVal =
                        selectedTimeframe === '24h' ? coin.change24h : coin.change7d;
                      const colorClass = getHeatmapColor(changeVal);

                      return (
                        <button
                          key={coin.symbol}
                          onClick={() => {
                            onSelectCoin(coin.symbol);
                            onClose();
                          }}
                          className={`p-3 rounded-xl border text-right transition-all transform hover:scale-[1.03] shadow-md flex flex-col justify-between min-h-[90px] ${colorClass}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-sm font-black tracking-wide">
                              {coin.symbol}
                            </span>
                            <span className="text-[10px] opacity-80 font-mono">
                              ${coin.mcapB}B
                            </span>
                          </div>

                          <div className="text-xs truncate opacity-90">{coin.name}</div>

                          <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-black/10">
                            <span className="text-xs font-mono font-black">
                              {changeVal >= 0 ? '+' : ''}
                              {changeVal}%
                            </span>
                            <span className="text-[10px] opacity-75">{selectedTimeframe}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>بيانات مباشرة محدثة من بورصة بينانس وكوين جيكو</span>
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
