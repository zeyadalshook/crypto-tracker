import React, { useState, useMemo } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  Filter,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Percent,
  Layers,
  Award,
} from 'lucide-react';
import { PaperOrder } from './paperTypes';
import { formatPercentage } from '../../utils/formatters';

interface PaperTradeHistoryProps {
  orders: PaperOrder[];
  currentPrice: number;
  currentSymbol: string;
  onClosePosition: (id: string) => void;
  onCancelPendingOrder: (id: string) => void;
  onLoadSampleData: () => void;
  onExportHistory: () => void;
  isDemo?: boolean;
}

type TabType = 'all' | 'closed' | 'open' | 'pending';
type OutcomeFilter = 'all' | 'profitable' | 'losing';
type SortKey = 'date_desc' | 'pnl_desc' | 'roi_desc';

export const PaperTradeHistory: React.FC<PaperTradeHistoryProps> = ({
  orders,
  currentPrice,
  currentSymbol,
  onClosePosition,
  onCancelPendingOrder,
  onLoadSampleData,
  onExportHistory,
  isDemo,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('closed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');

  // Compute Aggregate History Stats
  const closedOrders = useMemo(() => orders.filter((o) => o.status === 'closed'), [orders]);
  const openOrders = useMemo(() => orders.filter((o) => o.status === 'filled'), [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);

  const historyMetrics = useMemo(() => {
    const total = closedOrders.length;
    if (total === 0) {
      return {
        totalClosed: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        totalRealizedPnl: 0,
        avgWinUsdt: 0,
        avgLossUsdt: 0,
        profitFactor: 0,
        avgTradeRoi: 0,
      };
    }

    let winCount = 0;
    let lossCount = 0;
    let grossWin = 0;
    let grossLoss = 0;
    let totalPnl = 0;
    let totalRoiSum = 0;

    closedOrders.forEach((o) => {
      const pnl = o.pnlUsdt || 0;
      const roi = o.pnlPercent || 0;
      totalPnl += pnl;
      totalRoiSum += roi;

      if (pnl > 0) {
        winCount++;
        grossWin += pnl;
      } else if (pnl < 0) {
        lossCount++;
        grossLoss += Math.abs(pnl);
      }
    });

    const winRate = (winCount / total) * 100;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99.9 : 0;
    const avgWinUsdt = winCount > 0 ? grossWin / winCount : 0;
    const avgLossUsdt = lossCount > 0 ? grossLoss / lossCount : 0;
    const avgTradeRoi = totalRoiSum / total;

    return {
      totalClosed: total,
      winCount,
      lossCount,
      winRate,
      totalRealizedPnl: totalPnl,
      avgWinUsdt,
      avgLossUsdt,
      profitFactor,
      avgTradeRoi,
    };
  }, [closedOrders]);

  // Filtered & Sorted orders
  const displayedOrders = useMemo(() => {
    let list = orders;

    // Filter by tab
    if (activeTab === 'closed') list = list.filter((o) => o.status === 'closed');
    else if (activeTab === 'open') list = list.filter((o) => o.status === 'filled');
    else if (activeTab === 'pending') list = list.filter((o) => o.status === 'pending');

    // Filter by symbol query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((o) => o.symbol.toUpperCase().includes(q));
    }

    // Filter by outcome (for closed trades)
    if (outcomeFilter === 'profitable') {
      list = list.filter((o) => (o.pnlUsdt || 0) > 0);
    } else if (outcomeFilter === 'losing') {
      list = list.filter((o) => (o.pnlUsdt || 0) < 0);
    }

    // Sort
    const sorted = [...list];
    if (sortBy === 'date_desc') {
      sorted.sort((a, b) => (b.closedTimestamp || b.timestamp) - (a.closedTimestamp || a.timestamp));
    } else if (sortBy === 'pnl_desc') {
      sorted.sort((a, b) => (b.pnlUsdt || 0) - (a.pnlUsdt || 0));
    } else if (sortBy === 'roi_desc') {
      sorted.sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));
    }

    return sorted;
  }, [orders, activeTab, searchQuery, outcomeFilter, sortBy]);

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-4 sm:p-5 space-y-4">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <History className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>تاريخ الصفقات المحاكية (Simulated Trade History)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                {orders.length} إجمالي الصفقات
              </span>
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  بيانات تجريبية (DEMO DATA)
                </span>
              )}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            سجل تدقيقي كامل لجميع عمليات التداول الافتراضي مع تفاصيل الدخول والخروج ونسبة ROI لكل صفقة
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLoadSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
            title="تحميل صفقات محاكاة نموذجية لتجربة الرسم البياني والتحليلات"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تحميل صفقات نموذجية</span>
          </button>

          <button
            type="button"
            onClick={onExportHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors"
            title="تصدير سجل الصفقات بصيغة CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">الصفقات المنتهية</span>
          <div className="text-sm font-bold font-mono text-white mt-0.5">
            {historyMetrics.totalClosed} صفقة
          </div>
          <span className="text-[9px] text-slate-500">
            {historyMetrics.winCount} رابحة / {historyMetrics.lossCount} خاسرة
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">نسبة الفوز (Win Rate)</span>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            {historyMetrics.winRate.toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-500">نسبة الصفقات المحققة للربح</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">عامل الربح (Profit Factor)</span>
          <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
            {historyMetrics.profitFactor >= 99 ? '∞' : historyMetrics.profitFactor.toFixed(2)}
          </div>
          <span className="text-[9px] text-slate-500">إجمالي الأرباح ÷ الخسائر</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">صافي الأرباح المحققة</span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              historyMetrics.totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {historyMetrics.totalRealizedPnl >= 0 ? '+' : ''}$
            {historyMetrics.totalRealizedPnl.toFixed(2)} USDT
          </div>
          <span className="text-[9px] text-slate-500">من الصفقات المغلقة فقط</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">متوسط عائد الصفقة (ROI)</span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              historyMetrics.avgTradeRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercentage(historyMetrics.avgTradeRoi)}
          </div>
          <span className="text-[9px] text-slate-500">متوسط عائد رأس مال كل صفقة</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">متوسط الربح / الخسارة</span>
          <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
            +${historyMetrics.avgWinUsdt.toFixed(0)} / -${historyMetrics.avgLossUsdt.toFixed(0)}
          </div>
          <span className="text-[9px] text-slate-500">متوسط القيمة بالدولار</span>
        </div>
      </div>

      {/* Tabs and Search / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'closed'
                ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المغلقة ({closedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'open'
                ? 'bg-slate-800 text-sky-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المراكز النشطة ({openOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-800 text-amber-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            أوامر الحد ({pendingOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({orders.length})
          </button>
        </div>

        {/* Search, Outcome Filter & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[130px] flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Outcome Filter */}
          {activeTab === 'closed' && (
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">كل النتائج</option>
              <option value="profitable">الصفقات الرابحة 🟢</option>
              <option value="losing">الصفقات الخاسرة 🔴</option>
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="date_desc">الأحدث أولاً</option>
            <option value="pnl_desc">الأعلى ربحاً ($)</option>
            <option value="roi_desc">الأعلى عائداً (%)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {isDemo && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>علامة مائية:</strong> صفقات تجريبية محاكية (Demo) — معزولة ومؤقتة تنتهي عند الخروج ولا تؤثر على إحصاءات البوابة أو الدفتر.</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            DEMO
          </span>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-96 overflow-y-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="p-3">التاريخ والرمز</th>
              <th className="p-3">الاتجاه والنوع</th>
              <th className="p-3">سعر الدخول</th>
              <th className="p-3">سعر الخروج / اللحظي</th>
              <th className="p-3">حجم وقيمة الصفقة</th>
              <th className="p-3">سبب الخروج</th>
              <th className="p-3">الربح المحقق / اللحظي</th>
              <th className="p-3">نسبة العائد (ROI)</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                  لا توجد صفقات تطابق معايير الفلترة الحالية. يمكنك فتح صفقات جديدة أو الضغط على "تحميل صفقات نموذجية".
                </td>
              </tr>
            ) : (
              displayedOrders.map((ord) => {
                const isOpen = ord.status === 'filled';
                const isPending = ord.status === 'pending';
                const isClosed = ord.status === 'closed';

                // For open trades, compute mark-to-market live PnL if matching symbol
                let livePnl = ord.pnlUsdt || 0;
                let liveRoi = ord.pnlPercent || 0;
                let liveClosePrice = ord.closePrice || currentPrice;

                if (isOpen) {
                  const effectivePrice = ord.symbol === currentSymbol ? currentPrice : ord.orderPrice;
                  liveClosePrice = effectivePrice;
                  const diff = ord.side === 'buy' ? effectivePrice - ord.orderPrice : ord.orderPrice - effectivePrice;
                  livePnl = ord.amountCoins * diff;
                  liveRoi = (diff / ord.orderPrice) * 100;
                }

                const isProfitableTrade = livePnl >= 0;

                return (
                  <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Date & Symbol */}
                    <td className="p-3">
                      <div className="font-bold font-mono text-white flex items-center gap-1.5">
                        <span>{ord.symbol}</span>
                        {isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {ord.closedAt || ord.createdAt}
                      </span>
                    </td>

                    {/* Direction & Order Type */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            ord.side === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {ord.side === 'buy' ? 'شراء (Long)' : 'بيع (Short)'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {ord.type}
                        </span>
                      </div>
                    </td>

                    {/* Entry Price */}
                    <td className="p-3 font-mono text-slate-300">
                      ${ord.orderPrice.toLocaleString()}
                    </td>

                    {/* Exit / Current Price */}
                    <td className="p-3 font-mono text-white">
                      ${liveClosePrice.toLocaleString()}
                    </td>

                    {/* Size in Coins & USDT */}
                    <td className="p-3 font-mono">
                      <div className="text-slate-200 font-bold">${ord.totalUsdt.toLocaleString()} USDT</div>
                      <div className="text-[10px] text-slate-500">
                        ≈ {ord.amountCoins} {ord.symbol.replace('USDT', '')}
                      </div>
                    </td>

                    {/* Exit Reason / Status */}
                    <td className="p-3">
                      {isClosed ? (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                            ord.closeReason === 'take_profit'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : ord.closeReason === 'stop_loss'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {ord.closeReason === 'take_profit'
                            ? 'هدف الربح (TP)'
                            : ord.closeReason === 'stop_loss'
                            ? 'وقف الخسارة (SL)'
                            : 'إغلاق يدوي'}
                        </span>
                      ) : isOpen ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          مركز مفتوح
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          أمر معلق
                        </span>
                      )}
                    </td>

                    {/* Net PnL in USDT */}
                    <td className="p-3 font-mono font-bold">
                      <span className={isProfitableTrade ? 'text-emerald-400' : 'text-rose-400'}>
                        {isProfitableTrade ? '+' : ''}${livePnl.toFixed(2)} USDT
                      </span>
                    </td>

                    {/* Trade ROI % */}
                    <td className="p-3 font-mono font-bold">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                          isProfitableTrade
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {formatPercentage(liveRoi)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => onClosePosition(ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-[11px] transition-colors"
                        >
                          إغلاق المركز
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() => onCancelPendingOrder(ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                        >
                          إلغاء الأمر
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px] font-mono">مكتمل</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
