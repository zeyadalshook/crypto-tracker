import React, { useState, useMemo, useEffect } from 'react';
import { X, Download, TrendingUp, Sliders, Calendar, DollarSign } from 'lucide-react';
import { OHLCV } from '../types/crypto';
import { runSmartDcaSimulation, DcaConfig } from '../utils/dcaSimulator';
import { Currency, formatCurrency } from '../utils/formatters';

interface SmartDcaSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  klines: OHLCV[];
  currentPrice: number;
  currency?: Currency;
}

export const SmartDcaSimulatorModal: React.FC<SmartDcaSimulatorModalProps> = ({
  isOpen,
  onClose,
  symbol,
  klines,
  currentPrice,
  currency = 'USDT',
}) => {
  const [baseAmountUsdt, setBaseAmountUsdt] = useState<number>(100);
  const [intervalDays, setIntervalDays] = useState<number>(7);
  const [lookbackDays, setLookbackDays] = useState<number>(180);
  const [oversoldRsi, setOversoldRsi] = useState<number>(38);
  const [overboughtRsi, setOverboughtRsi] = useState<number>(68);
  const [activeView, setActiveView] = useState<'overview' | 'ledger'>('overview');

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

  const config: DcaConfig = useMemo(
    () => ({
      baseAmountUsdt,
      intervalDays,
      lookbackDays,
      oversoldRsiThreshold: oversoldRsi,
      overboughtRsiThreshold: overboughtRsi,
    }),
    [baseAmountUsdt, intervalDays, lookbackDays, oversoldRsi, overboughtRsi]
  );

  const simResult = useMemo(() => {
    return runSmartDcaSimulation(symbol, klines, config);
  }, [symbol, klines, config]);

  if (!isOpen) return null;

  const formatPrice = (p: number) => {
    if (!p || isNaN(p)) return '--';
    if (currency !== 'USDT' && currency !== 'USD') {
      return formatCurrency(p, currency);
    }
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(3)}`;
    if (p >= 0.01) return `$${p.toFixed(5)}`;
    return `$${p.toFixed(7)}`;
  };

  const handleExportCsv = () => {
    if (!simResult.ledger.length) return;
    const headers = [
      'Date',
      'Symbol',
      'Market_Price_USDT',
      'RSI_14',
      'Regular_DCA_USDT',
      'Regular_Avg_Price',
      'Smart_Multiplier',
      'Smart_DCA_USDT',
      'Smart_Avg_Price',
      'Smart_Portfolio_Value_USDT',
    ];
    const rows = simResult.ledger.map((row) => [
      row.date,
      symbol,
      row.price,
      row.rsi,
      row.regularAmountUsdt,
      row.regularAvgPrice.toFixed(6),
      row.smartMultiplier,
      row.smartAmountUsdt,
      row.smartAvgPrice.toFixed(6),
      row.smartPortfolioValue,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart_dca_${symbol}_${lookbackDays}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Build SVG Chart Paths for Smart vs Regular Portfolio Value
  const chartWidth = 760;
  const chartHeight = 200;
  const padX = 24;
  const padY = 20;

  const maxPortfolioVal = Math.max(
    1,
    ...simResult.ledger.map((d) => Math.max(d.smartPortfolioValue, d.regularPortfolioValue))
  );

  const buildPolyline = (values: number[]) => {
    if (values.length < 2) return '';
    return values
      .map((val, idx) => {
        const x = padX + (idx / (values.length - 1)) * (chartWidth - padX * 2);
        const y = chartHeight - padY - (val / maxPortfolioVal) * (chartHeight - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const smartPoints = buildPolyline(simResult.ledger.map((d) => d.smartPortfolioValue));
  const regularPoints = buildPolyline(simResult.ledger.map((d) => d.regularPortfolioValue));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-dca-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-[#06120b] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>محاكاة التجميع المؤسسي</span>
              <span aria-hidden="true">·</span>
              <span>Smart Dynamic DCA vs Regular DCA</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-400">
                {symbol}/USDT ({formatPrice(currentPrice)})
              </span>
            </div>
            <h2 id="smart-dca-modal-title" className="text-xl font-bold text-white">
              محاكي التراكم الذكي الموزون بمؤشر القوة النسبية (Smart RSI-Weighted DCA)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحميل السجل CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Simulation Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
          {/* Base Purchase Amount */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>مبلغ الدفعة الدورية الأساسي (USDT):</span>
            </label>
            <input
              type="number"
              min={10}
              max={100000}
              step={10}
              value={baseAmountUsdt}
              onChange={(e) => setBaseAmountUsdt(Math.max(10, Number(e.target.value) || 100))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Purchase Frequency */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>تكرار الشراء الدوري:</span>
            </label>
            <select
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-400"
            >
              <option value={1}>يومياً (كل شمعة يومية)</option>
              <option value={3}>كل 3 أيام</option>
              <option value={7}>أسبوعياً (كل 7 أيام)</option>
              <option value={14}>نصف شهري (كل 14 يوماً)</option>
              <option value={30}>شهرياً (كل 30 يوماً)</option>
            </select>
          </div>

          {/* Historical Lookback */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>فترة الاختبار التاريخي:</span>
            </label>
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-400"
            >
              <option value={60}>آخر 60 شمعة</option>
              <option value={90}>آخر 90 شمعة</option>
              <option value={180}>آخر 180 شمعة</option>
              <option value={365}>آخر 365 شمعة (سنة كاملة)</option>
            </select>
          </div>

          {/* RSI Thresholds */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>عتبات RSI للتعزيز والتهدئة:</span>
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
                <span className="text-[10px] text-emerald-400">شراء مضاعف≤</span>
                <input
                  type="number"
                  min={20}
                  max={48}
                  value={oversoldRsi}
                  onChange={(e) => setOversoldRsi(Number(e.target.value) || 35)}
                  className="w-10 bg-transparent text-left text-white font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
                <span className="text-[10px] text-rose-400">تهدئة≥</span>
                <input
                  type="number"
                  min={55}
                  max={85}
                  value={overboughtRsi}
                  onChange={(e) => setOverboughtRsi(Number(e.target.value) || 70)}
                  className="w-10 bg-transparent text-left text-white font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'overview'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مقارنة الأداء ومنحنى التراكم
            </button>
            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'ledger'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              جدول الدفعات التفصيلي ({simResult.purchasesCount} دفعة)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
            <span>
              أفضلية العائد الذكي (Smart Alpha):{' '}
              <strong className={simResult.smartAlphaRoiDiffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {simResult.smartAlphaRoiDiffPct >= 0 ? `+${simResult.smartAlphaRoiDiffPct}%` : `${simResult.smartAlphaRoiDiffPct}%`}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              خصم متوسط سعر الشراء:{' '}
              <strong className={simResult.smartPriceDiscountPct >= 0 ? 'text-emerald-400' : 'text-amber-300'}>
                {simResult.smartPriceDiscountPct}%
              </strong>
            </span>
          </div>
        </div>

        {activeView === 'overview' ? (
          <div className="space-y-5">
            {/* 3 Strategy Comparison Matrix */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="py-3 px-4">الاستراتيجية</th>
                    <th className="py-3 px-4">إجمالي المبلغ المستثمر</th>
                    <th className="py-3 px-4">الكمية المتراكمة ({symbol})</th>
                    <th className="py-3 px-4">متوسط سعر الشراء</th>
                    <th className="py-3 px-4">القيمة النهائية للمحفظة</th>
                    <th className="py-3 px-4">صافي الربح / الخسارة</th>
                    <th className="py-3 px-4">العائد المئوي (ROI)</th>
                    <th className="py-3 px-4 text-left">أقصى تراجع (Max DD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                  {[simResult.smartRsiDca, simResult.regularDca, simResult.lumpSum].map((strat, idx) => (
                    <tr
                      key={strat.nameAr}
                      className={idx === 0 ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'hover:bg-slate-900/40'}
                    >
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {strat.nameAr}
                        {idx === 0 && (
                          <span className="block text-[10px] text-emerald-400 font-normal mt-0.5">
                            يضاعف الشراء في الخوف ويقلصه في الطمع
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">${strat.totalInvestedUsdt.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-slate-200">{strat.totalCoinsAccumulated.toFixed(4)}</td>
                      <td className="py-3.5 px-4 text-emerald-300 font-bold">{formatPrice(strat.averageBuyPrice)}</td>
                      <td className="py-3.5 px-4 text-white font-bold">${strat.finalValueUsdt.toLocaleString()}</td>
                      <td
                        className={`py-3.5 px-4 font-bold ${
                          strat.netProfitUsdt >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {strat.netProfitUsdt >= 0 ? `+$${strat.netProfitUsdt.toLocaleString()}` : `-$${Math.abs(strat.netProfitUsdt).toLocaleString()}`}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-bold ${
                          strat.roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {strat.roiPct >= 0 ? `+${strat.roiPct}%` : `${strat.roiPct}%`}
                      </td>
                      <td className="py-3.5 px-4 text-left text-rose-400">-{strat.maxDrawdownPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SVG Growth Comparison Chart */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>منحنى نمو المحفظة التراكمي عبر الزمن ({simResult.purchasesCount} نقطة شراء):</span>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-semibold">— التراكم الذكي (Smart RSI DCA)</span>
                  <span className="text-sky-400 font-semibold">- - الشراء المنتظم (Regular DCA)</span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-48 select-none overflow-visible"
                >
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75].map((ratio) => (
                    <line
                      key={ratio}
                      x1={padX}
                      y1={chartHeight * ratio}
                      x2={chartWidth - padX}
                      y2={chartHeight * ratio}
                      stroke="rgba(148, 163, 184, 0.1)"
                      strokeDasharray="4,4"
                    />
                  ))}
                  {/* Regular DCA Line */}
                  {regularPoints && (
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="5,4"
                      points={regularPoints}
                    />
                  )}
                  {/* Smart DCA Line */}
                  {smartPoints && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={smartPoints}
                    />
                  )}
                </svg>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed Purchase Ledger Table */
          <div className="overflow-x-auto max-h-80 rounded-xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">سعر السوق</th>
                  <th className="py-2.5 px-3">قراءة RSI(14)</th>
                  <th className="py-2.5 px-3">الدفعة المنتظمة</th>
                  <th className="py-2.5 px-3">معامل التراكم الذكي</th>
                  <th className="py-2.5 px-3">الدفعة الذكية</th>
                  <th className="py-2.5 px-3">متوسط السعر الذكي</th>
                  <th className="py-2.5 px-3 text-left">قرار المحرك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {simResult.ledger.map((item, idx) => (
                  <tr key={`${item.date}-${idx}`} className="hover:bg-slate-900/50">
                    <td className="py-2 px-3 text-slate-300">{item.date}</td>
                    <td className="py-2 px-3 text-white">{formatPrice(item.price)}</td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        item.rsi <= oversoldRsi
                          ? 'text-emerald-400'
                          : item.rsi >= overboughtRsi
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.rsi}
                    </td>
                    <td className="py-2 px-3 text-slate-400">${item.regularAmountUsdt}</td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        item.smartMultiplier > 1
                          ? 'text-emerald-400'
                          : item.smartMultiplier < 1
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.smartMultiplier}x
                    </td>
                    <td className="py-2 px-3 text-white font-bold">${item.smartAmountUsdt}</td>
                    <td className="py-2 px-3 text-emerald-300">{formatPrice(item.smartAvgPrice)}</td>
                    <td className="py-2 px-3 text-left font-sans text-[11px] text-slate-300">
                      {item.smartReasonAr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
