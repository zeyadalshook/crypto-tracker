import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  PieChart,
  CheckCircle2,
  DollarSign,
  X,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PortfolioPosition } from '../types/crypto';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';

interface PortfolioTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  currency: Currency;
}

const PALETTE = [
  '#10b981',
  '#38bdf8',
  '#f59e0b',
  '#a855f7',
  '#f43f5e',
  '#14b8a6',
  '#6366f1',
  '#ec4899',
];

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  currency,
}) => {
  if (!isOpen) return null;

  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_portfolio_positions');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const curSym = currentSymbol.toUpperCase();
    return [
      {
        id: 'pos-1',
        symbol: curSym,
        name: curSym,
        amount: curSym === 'BTC' ? 0.08 : curSym === 'ETH' ? 1.2 : curSym === 'SOL' ? 22 : 4500,
        buyPrice: currentPrice * 0.92,
        currentPrice: currentPrice,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        isOpen: true,
      },
      {
        id: 'pos-2',
        symbol: curSym === 'BTC' ? 'SOL' : 'BTC',
        name: curSym === 'BTC' ? 'Solana' : 'Bitcoin',
        amount: curSym === 'BTC' ? 35 : 0.075,
        buyPrice: curSym === 'BTC' ? 175 : 88000,
        currentPrice: curSym === 'BTC' ? 195 : 92500,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        isOpen: true,
      },
      {
        id: 'pos-3',
        symbol: curSym === 'ETH' ? 'AVAX' : 'ETH',
        name: curSym === 'ETH' ? 'Avalanche' : 'Ethereum',
        amount: curSym === 'ETH' ? 120 : 1.1,
        buyPrice: curSym === 'ETH' ? 28 : 3100,
        currentPrice: curSym === 'ETH' ? 32 : 3400,
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        isOpen: true,
      },
      {
        id: 'pos-4',
        symbol: 'SOL',
        name: 'Solana',
        amount: 18,
        buyPrice: 165,
        currentPrice: 195,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        isOpen: true,
      },
    ].filter((p, i, self) => self.findIndex((t) => t.symbol === p.symbol) === i);
  });

  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const [newSymbol, setNewSymbol] = useState(currentSymbol);
  const [newAmount, setNewAmount] = useState<number>(100);
  const [newBuyPrice, setNewBuyPrice] = useState<number>(currentPrice);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    localStorage.setItem('crypto_portfolio_positions', JSON.stringify(positions));
  }, [positions]);

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || newAmount <= 0 || newBuyPrice <= 0) return;

    const symClean = newSymbol.toUpperCase();
    const newPos: PortfolioPosition = {
      id: `pos-${Date.now()}`,
      symbol: symClean,
      name: symClean,
      amount: newAmount,
      buyPrice: newBuyPrice,
      currentPrice: symClean === currentSymbol ? currentPrice : newBuyPrice,
      createdAt: new Date().toISOString(),
      isOpen: true,
    };

    setPositions([newPos, ...positions]);
    setShowAddForm(false);
  };

  const handleRemovePosition = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  const handleToggleClosePosition = (id: string) => {
    setPositions(
      positions.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            isOpen: !p.isOpen,
            closedAt: !p.isOpen ? undefined : new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const portfolioStats = useMemo(() => {
    let invested = 0;
    let currentVal = 0;
    const valueMap: Record<string, { value: number; cost: number; amount: number }> = {};

    positions.forEach((p) => {
      if (p.isOpen) {
        const livePrice = p.symbol === currentSymbol ? currentPrice : p.currentPrice;
        const cost = p.amount * p.buyPrice;
        const cur = p.amount * livePrice;
        invested += cost;
        currentVal += cur;

        if (!valueMap[p.symbol]) {
          valueMap[p.symbol] = { value: 0, cost: 0, amount: 0 };
        }
        valueMap[p.symbol].value += cur;
        valueMap[p.symbol].cost += cost;
        valueMap[p.symbol].amount += p.amount;
      }
    });

    const pnl = currentVal - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    const distribution = Object.entries(valueMap)
      .map(([sym, item], idx) => {
        const share = currentVal > 0 ? (item.value / currentVal) * 100 : 0;
        return {
          symbol: sym,
          value: item.value,
          cost: item.cost,
          amount: item.amount,
          share,
          color: PALETTE[idx % PALETTE.length],
          isOverThreshold: share > 40,
        };
      })
      .sort((a, b) => b.value - a.value);

    const hhi = distribution.reduce((sum, d) => sum + Math.pow(d.share, 2), 0);
    const overconcentratedAssets = distribution.filter((d) => d.share > 40);
    const hasConcentrationRisk = overconcentratedAssets.length > 0;
    const highestAsset = distribution[0] || { symbol: '—', share: 0, value: 0 };

    return {
      totalInvested: invested,
      totalCurrentValue: currentVal,
      totalPnL: pnl,
      totalPnLPercent: pnlPercent,
      distribution,
      hhi,
      hasConcentrationRisk,
      overconcentratedAssets,
      highestAsset,
    };
  }, [positions, currentSymbol, currentPrice]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const handleExportCSV = () => {
    const headers = ['Symbol', 'Amount', 'Buy Price', 'Current Price', 'Total Cost', 'Current Value', 'PnL ($)', 'PnL (%)', 'Status'];
    const rows = positions.map((p) => {
      const liveP = p.symbol === currentSymbol ? currentPrice : p.currentPrice;
      const cost = p.amount * p.buyPrice;
      const curVal = p.amount * liveP;
      const pnl = curVal - cost;
      const pnlP = cost > 0 ? (pnl / cost) * 100 : 0;
      return [
        p.symbol,
        p.amount,
        p.buyPrice,
        liveP,
        cost.toFixed(2),
        curVal.toFixed(2),
        pnl.toFixed(2),
        `${pnlP.toFixed(2)}%`,
        p.isOpen ? 'Open' : 'Closed',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crypto_portfolio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let accumulatedPercent = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="card-glow bg-[#07130c] border border-emerald-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>المحفظة الاستثمارية وتحليل تركّز المخاطر</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono">
                  {portfolioStats.distribution.length} أصول
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                متابعة الأرباح اللحظية، رسم دائري لتوزيع الأصول، وكشف تركز المخاطر فوق 40%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/10 transition-colors"
              title="تصدير بيانات الصفقات بصيغة CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1) Top KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">القيمة الإجمالية للمحفظة</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {formatCurrency(portfolioStats.totalCurrentValue, currency)}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              التكلفة الأولية: {formatCurrency(portfolioStats.totalInvested, currency)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">الربح / الخسارة اللحظية (PnL)</span>
            <div
              className={`text-2xl font-black font-mono mt-1 ${
                portfolioStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {portfolioStats.totalPnL >= 0 ? '+' : ''}
              {formatCurrency(portfolioStats.totalPnL, currency)} ({formatPercentage(portfolioStats.totalPnLPercent)})
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {portfolioStats.totalPnL >= 0 ? 'صافي عائد إيجابي' : 'تراجع عن متوسط سعر الشراء'}
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border transition-all ${
              portfolioStats.hasConcentrationRisk
                ? 'bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">مؤشر تركّز المخاطر (الحد الأقصى 40%)</span>
              {portfolioStats.hasConcentrationRisk ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  خطر تركز
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  توزيع متوازن
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  portfolioStats.hasConcentrationRisk ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {portfolioStats.highestAsset.share.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-300 font-bold font-mono">
                ({portfolioStats.highestAsset.symbol})
              </span>
            </div>

            <span className="text-[11px] text-slate-400 block mt-0.5">
              {portfolioStats.hasConcentrationRisk
                ? `تجاوز الحد الآمن (40%) بـ +${(portfolioStats.highestAsset.share - 40).toFixed(1)}%`
                : 'جميع العملات أقل من 40% (تنوع صحي)'}
            </span>
          </div>
        </div>

        {/* 2) Risk Concentration Alert Banner */}
        {portfolioStats.hasConcentrationRisk ? (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-rose-300 text-sm font-black mb-0.5">
                  تنبيه عالي الأهمية: تركّز مفرط للمخاطر (Risk Concentration &gt; 40%)
                </strong>
                <p className="leading-relaxed">
                  تستحوذ العملة <strong>{portfolioStats.highestAsset.symbol}</strong> على{' '}
                  <span className="font-mono font-bold text-rose-300 text-sm">
                    {portfolioStats.highestAsset.share.toFixed(1)}%
                  </span>{' '}
                  من إجمالي محفظتك. أي هبوط مفاجئ في هذه العملة سيعرّض رأس المال بالكامل لخسائر فادحة غير محمية.
                </p>
              </div>
            </div>

            <div className="sm:text-left text-right bg-slate-950/70 p-2.5 rounded-lg border border-rose-500/30 shrink-0">
              <span className="text-[10px] text-slate-400 block">إعادة التوازن المقترحة (Rebalance)</span>
              <span className="text-xs font-mono font-bold text-rose-300">
                تسييل أو نقل{' '}
                {formatCurrency(
                  portfolioStats.highestAsset.value - portfolioStats.totalCurrentValue * 0.4,
                  currency
                )}
              </span>
              <span className="text-[10px] text-slate-400 block">للعودة إلى نسبة 40%</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>المحفظة متوازنة وصحية:</strong> لا توجد أي عملة تتجاوز نسبة 40%. يتمتع رأس المال بحماية جيدة ضد تقلبات الأصول الفردية.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 hidden sm:inline">
              مؤشر التركز HHI: {Math.round(portfolioStats.hhi)} (آمن)
            </span>
          </div>
        )}

        {/* 3) Visual Asset Allocation Tool */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-xl bg-slate-950/70 border border-slate-900 items-center">
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>الرسم الدائري لتوزيع أصول المحفظة</span>
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg viewBox="0 0 140 140" className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#1e293b"
                  strokeWidth="16"
                  fill="transparent"
                />

                {portfolioStats.distribution.map((item) => {
                  const strokeDasharray = (item.share / 100) * circumference;
                  const strokeDashoffset = circumference - (accumulatedPercent / 100) * circumference;
                  accumulatedPercent += item.share;

                  const isHovered = hoveredSymbol === item.symbol;

                  return (
                    <circle
                      key={item.symbol}
                      cx="70"
                      cy="70"
                      r={radius}
                      stroke={item.color}
                      strokeWidth={isHovered ? '20' : '16'}
                      strokeDasharray={`${strokeDasharray} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      fill="transparent"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: item.isOverThreshold
                          ? 'drop-shadow(0 0 4px #f43f5e)'
                          : isHovered
                          ? 'drop-shadow(0 0 6px currentColor)'
                          : 'none',
                      }}
                      onMouseEnter={() => setHoveredSymbol(item.symbol)}
                      onMouseLeave={() => setHoveredSymbol(null)}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                {hoveredSymbol ? (
                  (() => {
                    const hoveredItem = portfolioStats.distribution.find((d) => d.symbol === hoveredSymbol);
                    return hoveredItem ? (
                      <>
                        <span className="text-xs font-mono font-bold text-slate-400">{hoveredItem.symbol}</span>
                        <span className="text-xl font-black font-mono text-white">
                          {hoveredItem.share.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {formatCurrency(hoveredItem.value, currency)}
                        </span>
                      </>
                    ) : null;
                  })()
                ) : (
                  <>
                    <span className="text-[11px] text-slate-400 font-medium">إجمالي الأصول</span>
                    <span className="text-base font-black font-mono text-white">
                      {portfolioStats.distribution.length} عملات
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      100%
                    </span>
                  </>
                )}
              </div>
            </div>

            <span className="text-[11px] text-slate-400 mt-2">
              مرر الفأرة فوق أي جزء من الدائرة لتفاصيل النسبة
            </span>
          </div>

          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold pb-1 border-b border-slate-900">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>تحليل الحصص ومقارنتها بالحد الآمن (40%)</span>
              </span>
              <span className="text-[11px] text-rose-400 font-mono">
                خط الأمان: 40%
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {portfolioStats.distribution.map((item) => (
                <div
                  key={item.symbol}
                  onMouseEnter={() => setHoveredSymbol(item.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    hoveredSymbol === item.symbol
                      ? 'bg-slate-900 border-emerald-500/50 shadow-md'
                      : item.isOverThreshold
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-white font-mono">{item.symbol}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({formatCurrency(item.value, currency)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold ${
                          item.isOverThreshold ? 'text-rose-400 font-black' : 'text-slate-200'
                        }`}
                      >
                        {item.share.toFixed(1)}%
                      </span>

                      {item.isOverThreshold ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                          ⚠️ تجاوز 40%
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          ✓ آمن
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 opacity-75"
                      style={{ right: '40%' }}
                      title="الحد الأقصى الموصى به: 40%"
                    />
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, item.share))}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4) Add Position Trigger / Form */}
        <div className="border border-slate-900 rounded-xl p-3 bg-slate-950/60">
          {!showAddForm ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">
                إدارة الصفقات والمراكز ({positions.length} مركز مفتوح)
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صفقة جديدة</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddPosition} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-900 text-xs font-bold text-emerald-400">
                <span>إدخال بيانات الصفقة</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">رمز العملة</label>
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="مثال: BTC"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">الكمية</label>
                  <input
                    type="number"
                    step="any"
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">سعر الشراء ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-colors"
              >
                حفظ وإضافة للمحفظة
              </button>
            </form>
          )}
        </div>

        {/* 5) Positions Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-900">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">الرمز</th>
                <th className="p-3">الكمية</th>
                <th className="p-3">سعر الشراء</th>
                <th className="p-3">السعر الحالي</th>
                <th className="p-3">القيمة الكلية</th>
                <th className="p-3">الحصة %</th>
                <th className="p-3">الربح / الخسارة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {positions.map((pos) => {
                const livePrice = pos.symbol === currentSymbol ? currentPrice : pos.currentPrice;
                const cost = pos.amount * pos.buyPrice;
                const curVal = pos.amount * livePrice;
                const pnl = curVal - cost;
                const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                const sharePercent = portfolioStats.totalCurrentValue > 0
                  ? (curVal / portfolioStats.totalCurrentValue) * 100
                  : 0;

                return (
                  <tr key={pos.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-bold font-mono text-white flex items-center gap-1.5">
                      <span>{pos.symbol}</span>
                      {sharePercent > 40 && (
                        <span className="text-[10px] text-rose-400" title="يتجاوز 40%">⚠️</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-200">{pos.amount}</td>
                    <td className="p-3 font-mono text-slate-300">
                      {formatCurrency(pos.buyPrice, currency)}
                    </td>
                    <td className="p-3 font-mono text-white">
                      {formatCurrency(livePrice, currency)}
                    </td>
                    <td className="p-3 font-mono text-white font-bold">
                      {formatCurrency(curVal, currency)}
                    </td>
                    <td className="p-3 font-mono">
                      <span
                        className={`font-bold ${
                          sharePercent > 40 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {sharePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      <span className={pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {pnl >= 0 ? '+' : ''}
                        {formatCurrency(pnl, currency)} ({formatPercentage(pnlPercent)})
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          pos.isOpen
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pos.isOpen ? 'مفتوحة' : 'مغلقة'}
                      </span>
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleClosePosition(pos.id)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:text-white text-slate-400"
                        title={pos.isOpen ? 'إغلاق الصفقة' : 'إعادة فتح الصفقة'}
                      >
                        {pos.isOpen ? 'إغلاق' : 'فتح'}
                      </button>
                      <button
                        onClick={() => handleRemovePosition(pos.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="حذف المركز"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
