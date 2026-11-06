import React, { useState, useEffect, useRef } from 'react';
import {
  PlayCircle,
  X,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Shuffle,
  ShieldCheck,
  HelpCircle,
  Calendar,
  Clock,
  Download,
  Database,
  Trash2,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { OHLCV } from '../types/crypto';
import { formatPercentage } from '../utils/formatters';
import {
  runRealisticBacktest,
  BacktestSimulationOutput,
  TradeRecord,
  exportTradesToCSV,
} from '../utils/backtestEngine';
import {
  getCachedKlines,
  saveCachedKlines,
  clearBacktestCache,
  getBacktestCacheStats,
} from '../utils/backtestDb';
import { calculateStatisticalEvidence } from '../lib/stats';
import { convertBacktestTradesToEvidence } from '../lib/stats/tradeAdapter';
import { StatisticalEvidence } from '../types/evidence';
import { EvidenceSummaryCard } from './evidence/EvidenceSummaryCard';
import { EvidenceGatekeeperModal } from './evidence/EvidenceGatekeeperModal';
import { OneClickAnalysisModal } from './pipeline/OneClickAnalysisModal';

interface BacktestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  klines: OHLCV[];
  symbol: string;
}

export const BacktestingModal: React.FC<BacktestingModalProps> = ({
  isOpen,
  onClose,
  klines: initialKlines,
  symbol,
}) => {
  if (!isOpen) return null;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'single' | 'regimes' | 'walk_forward' | 'compare' | 'monte_carlo' | 'trades_log' | 'evidence_gate'>('single');
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [isOneClickAnalysisOpen, setIsOneClickAnalysisOpen] = useState<boolean>(false);

  // Time Range & Historical Fetching Parameters
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '3y' | '5y' | 'all' | 'custom'>('1y');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h' | '1d'>('1d');
  const [customStartDate, setCustomStartDate] = useState<string>('2023-01-01');
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Strategy Builder Parameters
  const [entryCondition, setEntryCondition] = useState<'rsi_oversold' | 'ema_golden_cross' | 'macd_cross' | 'breakout_high'>('rsi_oversold');
  const [exitCondition, setExitCondition] = useState<'tp_sl' | 'rsi_overbought' | 'ema_death_cross'>('tp_sl');
  const [takeProfitPct, setTakeProfitPct] = useState<number>(8.0);
  const [stopLossPct, setStopLossPct] = useState<number>(4.0);
  const [feePct, setFeePct] = useState<number>(0.1); // 0.1% per trade
  const [slippagePct, setSlippagePct] = useState<number>(0.05); // 0.05% slippage
  const [useOutOfSample, setUseOutOfSample] = useState<boolean>(true); // Split 70% in-sample / 30% out-of-sample
  const [runWalkForward, setRunWalkForward] = useState<boolean>(true);

  // Historical Loading State & Progress
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<any[]>(initialKlines || []);
  const [dataSourceNotice, setDataSourceNotice] = useState<string>('بيانات الشارت الحالية');
  const [cacheStatus, setCacheStatus] = useState<string>('');
  const [firstCandleInfo, setFirstCandleInfo] = useState<{
    firstDateStr: string;
    totalDaysAvailable: number;
    pair: string;
  } | null>(null);

  // Execution & Results State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [result, setResult] = useState<BacktestSimulationOutput | null>(null);
  const [multiResults, setMultiResults] = useState<any[]>([]);
  const [monteCarloResult, setMonteCarloResult] = useState<any | null>(null);

  // Compute rigorous Statistical Evidence & Gatekeeper Scorecard from backtest trades
  const statisticalEvidence = React.useMemo<StatisticalEvidence | null>(() => {
    if (!result || !result.trades || result.trades.length === 0) return null;
    const evTrades = convertBacktestTradesToEvidence(result.trades, {
      stopLossPct,
      initialCapital: result.initialCapital,
      assumedRiskPct: 2.0,
      outOfSampleSplit: 0.7,
    });
    return calculateStatisticalEvidence(evTrades, {
      strategyName: result.strategyName || 'استراتيجية الاختبار',
      symbol,
      timeframe,
    });
  }, [result, stopLossPct, symbol, timeframe]);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch First Candle metadata when symbol changes or modal opens
  useEffect(() => {
    let isMounted = true;
    async function loadFirstCandle() {
      try {
        const res = await fetch(`/api/klines/first-candle/${symbol}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setFirstCandleInfo(data);
        }
      } catch (err) {
        console.warn('Failed to load first candle info:', err);
      }
    }
    loadFirstCandle();
    return () => {
      isMounted = false;
    };
  }, [symbol]);

  // Expected candles estimation
  const expectedCandlesCount = React.useMemo(() => {
    let days = 365;
    if (timeRange === '6m') days = 180;
    else if (timeRange === '1y') days = 365;
    else if (timeRange === '3y') days = 365 * 3;
    else if (timeRange === '5y') days = 365 * 5;
    else if (timeRange === 'all') days = firstCandleInfo?.totalDaysAvailable || 2500;
    else if (timeRange === 'custom') {
      const s = new Date(customStartDate).getTime();
      const e = new Date(customEndDate).getTime();
      days = Math.max(1, Math.round((e - s) / (86400 * 1000)));
    }

    const candlesPerDay = timeframe === '15m' ? 96 : timeframe === '1h' ? 24 : timeframe === '4h' ? 6 : 1;
    return days * candlesPerDay;
  }, [timeRange, timeframe, customStartDate, customEndDate, firstCandleInfo]);

  const isHugeCandlesWarning = expectedCandlesCount > 95000;

  // Handle Fetching Historical Klines with IndexedDB Caching and Server-Side Pagination
  const fetchHistoricalData = async () => {
    setIsLoadingHistory(true);
    setFetchProgress('جاري التحقق من التخزين المؤقت IndexedDB...');
    abortControllerRef.current = new AbortController();

    try {
      // 1. Check local IndexedDB cache
      const cachedRecord = await getCachedKlines(symbol, timeframe);
      let fetchedCandles: any[] = [];
      let sourceDescription = '';

      const startMs =
        timeRange === '6m'
          ? Date.now() - 180 * 86400 * 1000
          : timeRange === '1y'
          ? Date.now() - 365 * 86400 * 1000
          : timeRange === '3y'
          ? Date.now() - 3 * 365 * 86400 * 1000
          : timeRange === '5y'
          ? Date.now() - 5 * 365 * 86400 * 1000
          : timeRange === 'all'
          ? 0
          : new Date(customStartDate).getTime();

      const endMs =
        timeRange === 'custom'
          ? new Date(customEndDate).getTime()
          : Date.now();

      // If we already have cached candles that cover this range
      if (
        cachedRecord &&
        cachedRecord.candles.length > 50 &&
        cachedRecord.minTime <= (startMs || cachedRecord.minTime) &&
        Date.now() - cachedRecord.lastUpdated < 30 * 60 * 1000 // fresh within 30 min
      ) {
        setCacheStatus('تم التحميل من التخزين المؤقت المحلي (IndexedDB) ⚡');
        sourceDescription = 'تخزين محلي (IndexedDB)';
        fetchedCandles = cachedRecord.candles.filter((c: any) => {
          const t = c.timestamp || (typeof c.time === 'number' ? c.time * 1000 : new Date(c.time).getTime());
          return t >= startMs && t <= endMs;
        });
      } else {
        // Fetch from Server API Route
        setFetchProgress(`جاري جلب البيانات التاريخية لزوج ${symbol} عبر Binance Public API...`);
        const queryParams = new URLSearchParams({
          interval: timeframe,
          range: timeRange,
          startTime: String(startMs || 0),
          endTime: String(endMs),
          maxCandles: '100000',
        });

        const resp = await fetch(`/api/klines/historical/${symbol}?${queryParams.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!resp.ok) {
          throw new Error('فشل جلب البيانات التاريخية من الخادم');
        }

        const data = await resp.json();
        fetchedCandles = data.candles || [];
        sourceDescription = data.source || 'Binance Public API';
        setCacheStatus(data.wasCached ? 'تم التحميل من ذاكرة الخادم السريعة' : 'تم جلب البيانات وتحديث التخزين المؤقت');

        // Save into IndexedDB for subsequent zero-latency runs
        if (fetchedCandles.length > 0) {
          await saveCachedKlines(symbol, timeframe, fetchedCandles);
        }
      }

      setHistoricalData(fetchedCandles);
      setDataSourceNotice(`${sourceDescription} (${fetchedCandles.length.toLocaleString()} شمعة)`);
      setFetchProgress('');
      setIsLoadingHistory(false);
      return fetchedCandles;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setFetchProgress('تم إلغاء جلب البيانات');
      } else {
        console.error('Error fetching historical candles:', err);
        setFetchProgress('حدث خطأ أثناء جلب البيانات، يتم استخدام البيانات المتوفرة حالياً');
      }
      setIsLoadingHistory(false);
      return historicalData;
    }
  };

  // Run Backtest Simulation
  const handleExecuteBacktest = async () => {
    setIsRunning(true);
    setProgressPct(10);

    // 1. Ensure we have historical data loaded for the chosen period
    let candlesToTest = historicalData;
    if (!candlesToTest || candlesToTest.length < 50) {
      candlesToTest = await fetchHistoricalData();
    }

    setProgressPct(40);

    // Run in chunked async ticks to allow UI render & prevent freezing
    setTimeout(() => {
      try {
        if (!candlesToTest || candlesToTest.length < 30) {
          setIsRunning(false);
          return;
        }

        setProgressPct(60);

        // Run Realistic Simulation
        const simOutput = runRealisticBacktest(candlesToTest, {
          entryCondition,
          exitCondition,
          takeProfitPct,
          stopLossPct,
          feePct,
          slippagePct,
          useOutOfSample,
          outOfSampleRatio: 0.3,
          runWalkForward,
          symbol,
          interval: timeframe,
        });

        setProgressPct(80);

        // Run Multi-Strategy Comparison
        const strategiesToCompare = [
          { name: 'ارتداد RSI &lt; 30 (تشبع بيعي)', entry: 'rsi_oversold', exit: 'tp_sl' },
          { name: 'التقاطع الذهبي (EMA 50 / 200)', entry: 'ema_golden_cross', exit: 'tp_sl' },
          { name: 'اختراق أعلى قمة (20 Bars Breakout)', entry: 'breakout_high', exit: 'tp_sl' },
          { name: 'تقاطع خط الماكد الصاعد (MACD)', entry: 'macd_cross', exit: 'tp_sl' },
        ];

        const multi = strategiesToCompare.map((st) => {
          const res = runRealisticBacktest(candlesToTest, {
            entryCondition: st.entry,
            exitCondition: st.exit,
            takeProfitPct,
            stopLossPct,
            feePct,
            slippagePct,
            useOutOfSample: false,
            runWalkForward: false,
            symbol,
            interval: timeframe,
          });
          return {
            name: st.name,
            winRate: res.winRate,
            totalReturn: res.totalReturnPercent,
            cagr: res.cagrPercent,
            maxDrawdown: res.maxDrawdownPercent,
            tradesCount: res.totalTrades,
            profitFactor: res.profitFactor,
            sharpe: res.sharpeRatio,
          };
        });
        setMultiResults(multi);

        // Run Monte Carlo Simulation (500 resampled iterations)
        const closedTrades = simOutput.trades;
        if (closedTrades.length >= 3) {
          const returns = closedTrades.map((t) => t.profitPercent);
          const simFinalBalances: number[] = [];

          for (let run = 0; run < 500; run++) {
            let b = 10000;
            for (let step = 0; step < returns.length; step++) {
              const randomTradeReturn = returns[Math.floor(Math.random() * returns.length)];
              b *= 1 + randomTradeReturn / 100;
            }
            simFinalBalances.push(b);
          }

          simFinalBalances.sort((a, b) => a - b);
          const p5Worst = Math.round(simFinalBalances[Math.floor(simFinalBalances.length * 0.05)]);
          const median = Math.round(simFinalBalances[Math.floor(simFinalBalances.length * 0.5)]);
          const p95Best = Math.round(simFinalBalances[Math.floor(simFinalBalances.length * 0.95)]);
          const profitProbability = Math.round(
            (simFinalBalances.filter((b) => b >= 10000).length / simFinalBalances.length) * 100
          );

          setMonteCarloResult({
            runs: 500,
            p5Worst,
            median,
            p95Best,
            profitProbability,
          });
        }

        setResult(simOutput);
        setProgressPct(100);
      } catch (err: any) {
        console.error('Backtest calculation failed:', err);
      } finally {
        setIsRunning(false);
      }
    }, 150);
  };

  // Clear cache handler
  const handleClearCache = async () => {
    await clearBacktestCache();
    setCacheStatus('تم مسح التخزين المؤقت بنجاح');
    setTimeout(() => setCacheStatus(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/40 rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  مختبر الاستراتيجيات التاريخي المتقدم (Pro Long-Term Backtesting)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                  {symbol}/USDT
                </span>
                {result?.isNewCoin && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    عملة حديثة: البيانات محدودة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                اختبار على مدى تاريخي طويل، منع النظر للمستقبل (Look-Ahead Bias)، فحص خارج العينة (Out-of-Sample)، وتحليل مراحل السوق.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ONE-CLICK FULL ANALYSIS BIG BANNER & BUTTON */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-emerald-950/70 border border-indigo-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h4 className="font-extrabold text-white text-sm sm:text-base">
                التحليل الشامل بضغطة واحدة (One-Click Full Analysis)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                منسّق القمع الآلي (6 مراحل علمية)
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              فحص متكامل: فرز سريع على بيانات التدريب ← صقل المعاملات ← بوتستراب 5,000 ومونت كارلو 10,000 و DSR ← اختبار حاسم على عينة محجوبة OOS ← بوابة الاعتماد الإحصائية.
            </p>
          </div>

          <button
            onClick={() => setIsOneClickAnalysisOpen(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>حلّل هذا الزوج بالكامل الآن</span>
          </button>
        </div>

        {/* 1. Time Range & Interval Selection Bar (New Pro Feature) */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Calendar className="w-4 h-4" />
              <span>فترة الاختبار التاريخي والبيانات:</span>
            </div>
            {cacheStatus && (
              <span className="text-[11px] text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {cacheStatus}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Period select */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">فترة الاختبار:</label>
              <select
                value={timeRange}
                onChange={(e: any) => setTimeRange(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
              >
                <option value="6m">آخر 6 أشهر</option>
                <option value="1y">آخر سنة</option>
                <option value="3y">آخر 3 سنوات</option>
                <option value="5y">آخر 5 سنوات</option>
                <option value="all">كل التاريخ المتاح (من أول شمعة إدراج)</option>
                <option value="custom">نطاق مخصص (تحديد تواريخ)</option>
              </select>
            </div>

            {/* Timeframe select */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">الإطار الزمني للشموع:</label>
              <select
                value={timeframe}
                onChange={(e: any) => setTimeframe(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-mono"
              >
                <option value="15m">15 دقيقة (15m)</option>
                <option value="1h">1 ساعة (1h)</option>
                <option value="4h">4 ساعات (4h)</option>
                <option value="1d">1 يوم (1D - موصى به للفترات الطويلة)</option>
              </select>
            </div>

            {/* Custom dates if custom */}
            {timeRange === 'custom' ? (
              <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">من تاريخ:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="col-span-1 sm:col-span-2 flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-400 block">تقدير عدد الشموع:</span>
                  <span className="text-sm font-mono font-bold text-white">
                    ~{expectedCandlesCount.toLocaleString()} شمعة
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchHistoricalData}
                    disabled={isLoadingHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    <span>جلب وتحديث</span>
                  </button>
                  <button
                    onClick={handleClearCache}
                    title="مسح البيانات المخزنة محلياً في IndexedDB"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* First Candle Information when "all" is selected */}
          {timeRange === 'all' && firstCandleInfo && (
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  أول شمعة متوفرة للزوج <strong>{firstCandleInfo.pair}</strong>: {firstCandleInfo.firstDateStr} (إجمالي التاريخ المتاح: {firstCandleInfo.totalDaysAvailable.toLocaleString()} يوم)
                </span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px]">Binance Genesis Candle</span>
            </div>
          )}

          {/* Huge Candles Warning */}
          {isHugeCandlesWarning && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                تحذير: عدد الشموع المتوقع يتجاوز 100,000 شمعة. يُنصح باختيار إطار زمني أكبر مثل 1h أو 4h لتجنب البطء، أو تقليص المدى الزمني.
              </span>
            </div>
          )}

          {/* Loading progress bar */}
          {isLoadingHistory && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{fetchProgress}</span>
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="text-rose-400 hover:underline"
                >
                  إلغاء التحميل
                </button>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'single'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            نتائج الاستراتيجية ومنحنى رأس المال
          </button>
          <button
            onClick={() => setActiveTab('regimes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'regimes'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تحليل مراحل السوق والسنوات ({result?.yearlyBreakdown?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('walk_forward')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'walk_forward'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            فحص النوافذ المتتالية (Walk-Forward)
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'compare'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            مقارنة الاستراتيجيات ({multiResults.length})
          </button>
          <button
            onClick={() => setActiveTab('monte_carlo')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'monte_carlo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            محاكاة مونت كارلو (Monte Carlo 500x)
          </button>
          <button
            onClick={() => setActiveTab('evidence_gate')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'evidence_gate'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/50 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>بوابة الاعتماد والأدلة الإحصائية</span>
            {statisticalEvidence && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('trades_log')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'trades_log'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            سجل الصفقات ({result?.trades?.length || 0})
          </button>
        </div>

        {/* Tab 1: Single Strategy Builder & Results */}
        {activeTab === 'single' && (
          <div className="space-y-4">
            {/* Visual Strategy Builder Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              {/* Entry condition */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">شرط الدخول (Entry):</label>
                <select
                  value={entryCondition}
                  onChange={(e: any) => setEntryCondition(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                >
                  <option value="rsi_oversold">ارتداد RSI &lt; 30 (تشبع بيعي)</option>
                  <option value="ema_golden_cross">تقاطع EMA الذهبي (50/200)</option>
                  <option value="macd_cross">تقاطع خط الماكد الصاعد</option>
                  <option value="breakout_high">اختراق أعلى قمة (20 شمعة)</option>
                </select>
              </div>

              {/* Exit condition */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">شرط الخروج (Exit):</label>
                <select
                  value={exitCondition}
                  onChange={(e: any) => setExitCondition(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                >
                  <option value="tp_sl">أهداف رقمية (TP / SL)</option>
                  <option value="rsi_overbought">تشبع شرائي RSI &gt; 70</option>
                  <option value="ema_death_cross">تقاطع سلبي للمتوسطات</option>
                </select>
              </div>

              {/* Take profit % */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  جني الأرباح (TP %): <span className="text-emerald-400 font-mono font-bold">+{takeProfitPct}%</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="35"
                  step="0.5"
                  value={takeProfitPct}
                  onChange={(e) => setTakeProfitPct(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Stop loss % */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  وقف الخسارة (SL %): <span className="text-rose-400 font-mono font-bold">-{stopLossPct}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(parseFloat(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            {/* Realistic Execution Safeguards Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">العمولة (Fee):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={feePct}
                    onChange={(e) => setFeePct(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-center font-mono text-xs"
                  />
                  <span className="text-slate-500">%</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">الانزلاق السعري (Slippage):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={slippagePct}
                    onChange={(e) => setSlippagePct(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-center font-mono text-xs"
                  />
                  <span className="text-slate-500">%</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={useOutOfSample}
                    onChange={(e) => setUseOutOfSample(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>تقسيم العينة (70% تدريب / 30% فحص مستقل)</span>
                </label>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>منع Look-Ahead: التنفيذ بسعر فتح الشمعة التالية</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {result && (
                  <button
                    onClick={() => exportTradesToCSV(result)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير CSV</span>
                  </button>
                )}

                <button
                  onClick={handleExecuteBacktest}
                  disabled={isRunning || isLoadingHistory}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 text-xs"
                >
                  <PlayCircle className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'جاري الاختبار التاريخي...' : 'تشغيل الاختبار التاريخي'}</span>
                </button>
              </div>
            </div>

            {/* Overfitting Warning Notice if detected */}
            {result?.overfittingWarning && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 block text-sm">
                    تحذير مبالغة في الضبط (Overfitting Risk Alert):
                  </strong>
                  <p className="mt-0.5 leading-relaxed">
                    {result.warningMessage ||
                      'تفاوت كبير جداً بين أداء عينة التدريب وعينة الفحص المستقلة. هذا يشير إلى أن الاستراتيجية تم ضبطها بإفراط على الماضي ولن تكون صالحة في المستقبل.'}
                  </p>
                </div>
              </div>
            )}

            {/* Results Dashboard */}
            {result ? (
              <div className="space-y-4">
                {/* Statistical Evidence Summary Card (Gatekeeper) */}
                {statisticalEvidence && (
                  <EvidenceSummaryCard
                    evidence={statisticalEvidence}
                    onOpenGatekeeperModal={() => setIsEvidenceModalOpen(true)}
                  />
                )}

                {/* 6 Core Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Total Return */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">العائد الصافي الكلي</span>
                    <span
                      className={`text-lg font-black font-mono mt-1 block ${
                        result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.totalReturnPercent >= 0 ? '+' : ''}
                      {result.totalReturnPercent}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      رأس المال: ${result.finalCapital.toLocaleString()}
                    </span>
                  </div>

                  {/* CAGR */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">العائد السنوي (CAGR)</span>
                    <span
                      className={`text-lg font-black font-mono mt-1 block ${
                        result.cagrPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.cagrPercent >= 0 ? '+' : ''}
                      {result.cagrPercent}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      الفترة: {result.totalDays} يوم
                    </span>
                  </div>

                  {/* Buy & Hold Benchmark */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">الشراء والاحتفاظ (B&H)</span>
                    <span
                      className={`text-lg font-black font-mono mt-1 block ${
                        result.buyAndHoldReturnPercent >= 0 ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    >
                      {result.buyAndHoldReturnPercent >= 0 ? '+' : ''}
                      {result.buyAndHoldReturnPercent}%
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        result.outperformancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      الفارق: {result.outperformancePercent >= 0 ? '+' : ''}
                      {result.outperformancePercent}%
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">نسبة الفوز (Win Rate)</span>
                    <span className="text-lg font-black font-mono text-white mt-1 block">
                      {result.winRate}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {result.totalTrades} صفقة
                    </span>
                  </div>

                  {/* Max Drawdown */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">أقصى تراجع (Max DD)</span>
                    <span className="text-lg font-black font-mono text-rose-400 mt-1 block">
                      -{result.maxDrawdownPercent}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      أطول تراجع: ~{result.maxDrawdownDurationDays} يوم
                    </span>
                  </div>

                  {/* Profit Factor & Sharpe */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">عامل الربح وشارب</span>
                    <div className="flex items-center gap-1.5 mt-1 font-mono">
                      <span className="text-base font-bold text-emerald-300">
                        PF {result.profitFactor}
                      </span>
                      <span className="text-xs text-slate-400">| S {result.sharpeRatio}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      R:R {result.riskRewardRatio}:1
                    </span>
                  </div>
                </div>

                {/* Equity Curve SVG Chart */}
                {result.equityCurve && result.equityCurve.length > 5 && (
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white flex items-center gap-1">
                          <BarChart2 className="w-4 h-4 text-emerald-400" />
                          منحنى تطور رأس المال (Equity Curve):
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full inline-block" />
                            الاستراتيجية
                          </span>
                          <span className="flex items-center gap-1 text-sky-400">
                            <span className="w-2.5 h-0.5 bg-sky-400 rounded-full inline-block" />
                            الشراء والاحتفاظ
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        رأس المال المبدئي: $10,000
                      </span>
                    </div>

                    {/* Simple responsive SVG line visualization */}
                    <div className="h-44 w-full relative pt-2">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Grid lines */}
                        <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeDasharray="2" strokeWidth="0.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeDasharray="2" strokeWidth="0.5" />
                        <line x1="0" y1="75" x2="100" y2="75" stroke="#1e293b" strokeDasharray="2" strokeWidth="0.5" />

                        {(() => {
                          const equities = result.equityCurve.map((p) => p.equity);
                          const bnhEquities = result.equityCurve.map((p) => p.bnhEquity);
                          const allVals = [...equities, ...bnhEquities];
                          const minV = Math.min(...allVals) * 0.95;
                          const maxV = Math.max(...allVals) * 1.05;
                          const range = maxV - minV || 1;

                          const stratPoints = result.equityCurve.map((p, idx) => {
                            const x = (idx / (result.equityCurve.length - 1)) * 100;
                            const y = 100 - ((p.equity - minV) / range) * 100;
                            return `${x},${y}`;
                          }).join(' ');

                          const bnhPoints = result.equityCurve.map((p, idx) => {
                            const x = (idx / (result.equityCurve.length - 1)) * 100;
                            const y = 100 - ((p.bnhEquity - minV) / range) * 100;
                            return `${x},${y}`;
                          }).join(' ');

                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.2"
                                strokeDasharray="2"
                                points={bnhPoints}
                                opacity="0.8"
                              />
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.2"
                                points={stratPoints}
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>{result.equityCurve[0]?.date}</span>
                      <span>{result.equityCurve[Math.floor(result.equityCurve.length / 2)]?.date}</span>
                      <span>{result.equityCurve[result.equityCurve.length - 1]?.date}</span>
                    </div>
                  </div>
                )}

                {/* Out of Sample Verification Box */}
                {result.outOfSampleResult && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-300 block text-sm">
                          نتائج فحص البيانات خارج العينة (Out-of-Sample Test - آخر 30%):
                        </span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          حقق النموذج على الجزء المستقل غير المرئي عائداً قدره{' '}
                          <strong
                            className={
                              result.outOfSampleResult.totalReturnPercent >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {result.outOfSampleResult.totalReturnPercent}%
                          </strong>{' '}
                          مع نسبة نجاح {result.outOfSampleResult.winRate}% عبر {result.outOfSampleResult.tradesCount} صفقة، وعامل ربح {result.outOfSampleResult.profitFactor}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs flex flex-col items-center gap-2">
                <PlayCircle className="w-8 h-8 text-emerald-500/60 animate-pulse" />
                <span>اضغط على "تشغيل الاختبار التاريخي" لبدء المحاكاة واحتساب النتائج.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Market Regimes & Calendar Years */}
        {activeTab === 'regimes' && (
          <div className="space-y-4 text-xs">
            {/* Regime Explanation */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>تحليل مراحل السوق (Market Regime Segmentation):</strong> يقسم التاريخ تلقائياً إلى 3 مراحل (صاعد، هابط، عرضي) بناءً على موقع السعر وميل متوسط EMA200. لأن استراتيجية تربح فقط في السوق الصاعد وتخسر في الهابط ليست استراتيجية يمكن الاعتماد عليها.
              </div>
            </div>

            {/* Regimes Table */}
            {result?.regimeBreakdown ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right">
                  <thead className="bg-slate-900 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-3">مرحلة السوق</th>
                      <th className="p-3">عدد الصفقات</th>
                      <th className="p-3">نسبة الفوز %</th>
                      <th className="p-3">العائد الصافي %</th>
                      <th className="p-3">عامل الربح (PF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {result.regimeBreakdown.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 font-sans font-bold text-white">{reg.regime}</td>
                        <td className="p-3 text-slate-300">{reg.tradesCount}</td>
                        <td className="p-3 text-slate-200">{reg.winRate}%</td>
                        <td
                          className={`p-3 font-bold ${
                            reg.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {reg.totalReturnPercent >= 0 ? '+' : ''}
                          {reg.totalReturnPercent}%
                        </td>
                        <td className="p-3 text-emerald-300">{reg.profitFactor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">قم بتشغيل الاختبار أولاً.</div>
            )}

            {/* Calendar Years Breakdown Table */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                أداء الاستراتيجية لكل سنة تقويمية على حدة:
              </h4>

              {result?.yearlyBreakdown && result.yearlyBreakdown.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[11px] font-sans">
                      <tr>
                        <th className="p-3">السنة</th>
                        <th className="p-3">عائد الاستراتيجية</th>
                        <th className="p-3">عائد الشراء والاحتفاظ (B&H)</th>
                        <th className="p-3">نسبة الفوز</th>
                        <th className="p-3">الصفقات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.yearlyBreakdown.map((yr, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-3 font-bold text-white font-sans">{yr.year}</td>
                          <td
                            className={`p-3 font-bold ${
                              yr.strategyReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {yr.strategyReturn >= 0 ? '+' : ''}
                            {yr.strategyReturn}%
                          </td>
                          <td
                            className={`p-3 ${
                              yr.buyAndHoldReturn >= 0 ? 'text-sky-400' : 'text-slate-400'
                            }`}
                          >
                            {yr.buyAndHoldReturn >= 0 ? '+' : ''}
                            {yr.buyAndHoldReturn}%
                          </td>
                          <td className="p-3 text-slate-200">{yr.winRate}%</td>
                          <td className="p-3 text-slate-400">{yr.tradesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500">لا توجد بيانات سنوية مسجلة بعد.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Walk-Forward Analysis */}
        {activeTab === 'walk_forward' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
              <strong>فحص النوافذ المتتالية (Walk-Forward Analysis):</strong> يقسم كامل التاريخ إلى 5 نوافذ متتالية متساوية ويختبر الاستراتيجية على كل نافذة على حدة، للتأكد من ثبات وتناسق الاستراتيجية في دورات زمنية مختلفة.
            </div>

            {result?.walkForwardWindows && result.walkForwardWindows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] font-sans">
                    <tr>
                      <th className="p-3">النافذة</th>
                      <th className="p-3">من تاريخ</th>
                      <th className="p-3">إلى تاريخ</th>
                      <th className="p-3">العائد %</th>
                      <th className="p-3">نسبة الفوز</th>
                      <th className="p-3">أقصى تراجع</th>
                      <th className="p-3">الصفقات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.walkForwardWindows.map((win) => (
                      <tr key={win.windowIndex} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-white font-sans">نافذة #{win.windowIndex}</td>
                        <td className="p-3 text-slate-400">{win.startDate}</td>
                        <td className="p-3 text-slate-400">{win.endDate}</td>
                        <td
                          className={`p-3 font-bold ${
                            win.strategyReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {win.strategyReturn >= 0 ? '+' : ''}
                          {win.strategyReturn}%
                        </td>
                        <td className="p-3 text-slate-200">{win.winRate}%</td>
                        <td className="p-3 text-rose-400">-{win.maxDrawdown}%</td>
                        <td className="p-3 text-slate-300">{win.tradesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                قم بتشغيل الاختبار مع تفعيل خيار Walk-Forward.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Multi-Strategy Comparison Table */}
        {activeTab === 'compare' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              مقارنة أداء عدة استراتيجيات مختلفة على بيانات {symbol} التاريخية بنفس الإعدادات والرسوم:
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-3">اسم الاستراتيجية</th>
                    <th className="p-3">نسبة النجاح (Win Rate)</th>
                    <th className="p-3">العائد الصافي %</th>
                    <th className="p-3">العائد السنوي (CAGR)</th>
                    <th className="p-3">أقصى تراجع %</th>
                    <th className="p-3">عامل الربح (PF)</th>
                    <th className="p-3">الصفقات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {multiResults.length > 0 ? (
                    multiResults.map((st, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-3 font-sans font-bold text-white">{st.name}</td>
                        <td className="p-3 text-slate-200">{st.winRate}%</td>
                        <td
                          className={`p-3 font-bold ${
                            st.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {st.totalReturn >= 0 ? '+' : ''}
                          {st.totalReturn}%
                        </td>
                        <td className="p-3 text-emerald-300">{st.cagr}%</td>
                        <td className="p-3 text-rose-400">-{st.maxDrawdown}%</td>
                        <td className="p-3 text-emerald-300">{st.profitFactor}</td>
                        <td className="p-3 text-slate-400">{st.tradesCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                        اضغط على "تشغيل الاختبار التاريخي" لحساب مقارنة الاستراتيجيات.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Monte Carlo Simulation */}
        {activeTab === 'monte_carlo' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <strong>محاكاة مونت كارلو (Monte Carlo Simulation):</strong> تقوم بإعادة ترتيب الصفقات عشوائياً 500 مرة للتنبؤ بأسوأ وأفضل مسار محتمل لمحفظتك وتجنب خداع الترتيب المحظوظ.
            </div>

            {monteCarloResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <span className="text-[11px] text-slate-400 block">احتمالية الربحية</span>
                  <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                    {monteCarloResult.profitProbability}%
                  </span>
                  <span className="text-[10px] text-slate-500">بناءً على 500 تكرار</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/30">
                  <span className="text-[11px] text-slate-400 block">أسوأ سيناريو (95% ثقة)</span>
                  <span className="text-xl font-black font-mono text-rose-400 mt-1 block">
                    ${monteCarloResult.p5Worst.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">في أسوأ توزيع ممكن</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/30">
                  <span className="text-[11px] text-slate-400 block">الرصيد الوسيط المتوقع</span>
                  <span className="text-xl font-black font-mono text-sky-400 mt-1 block">
                    ${monteCarloResult.median.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">متوسط الأداء المتوقع</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <span className="text-[11px] text-slate-400 block">أفضل سيناريو (5% الأفضل)</span>
                  <span className="text-xl font-black font-mono text-emerald-300 mt-1 block">
                    ${monteCarloResult.p95Best.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">في أفضل توالي للصفقات</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                قم بتشغيل الاختبار من التبويب الأول لتوليد محاكاة مونت كارلو للمحفظة.
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Trades Log */}
        {activeTab === 'trades_log' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>سجل جميع الصفقات المنفذة حسب التسلسل الزمني ({result?.trades?.length || 0} صفقة):</span>
              {result && (
                <button
                  onClick={() => exportTradesToCSV(result)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير إلى CSV</span>
                </button>
              )}
            </div>

            {result?.trades && result.trades.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                <table className="w-full text-right text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] font-sans sticky top-0">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">تاريخ الدخول</th>
                      <th className="p-2.5">تاريخ الخروج</th>
                      <th className="p-2.5">سعر الدخول</th>
                      <th className="p-2.5">سعر الخروج</th>
                      <th className="p-2.5">الربح %</th>
                      <th className="p-2.5">الربح $</th>
                      <th className="p-2.5">سبب الخروج</th>
                      <th className="p-2.5">المرحلة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.trades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-slate-500 font-sans">{t.id}</td>
                        <td className="p-2.5 text-slate-300">{t.entryDate}</td>
                        <td className="p-2.5 text-slate-300">{t.exitDate}</td>
                        <td className="p-2.5 text-slate-200">${t.entryPrice.toFixed(2)}</td>
                        <td className="p-2.5 text-slate-200">${t.exitPrice.toFixed(2)}</td>
                        <td
                          className={`p-2.5 font-bold ${
                            t.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {t.profitPercent >= 0 ? '+' : ''}
                          {t.profitPercent}%
                        </td>
                        <td
                          className={`p-2.5 ${
                            t.netProfitUSDT >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          ${t.netProfitUSDT.toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                              t.reason === 'TP'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : t.reason === 'SL'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {t.reason === 'TP' ? 'جني أرباح' : t.reason === 'SL' ? 'وقف خسارة' : 'إشارة خروج'}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] font-sans text-slate-400">{t.regime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد صفقات منفذة بعد.
              </div>
            )}
          </div>
        )}

        {/* Tab: Evidence Gate & Scorecard */}
        {activeTab === 'evidence_gate' && (
          <div className="space-y-4">
            {statisticalEvidence ? (
              <div className="space-y-4">
                <EvidenceSummaryCard
                  evidence={statisticalEvidence}
                  onOpenGatekeeperModal={() => setIsEvidenceModalOpen(true)}
                />
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-200">الأدلة الإحصائية المحسوبة من صفقات هذا الاختبار:</span>
                    <button
                      onClick={() => setIsEvidenceModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                    >
                      فتح بوابة الاعتماد التفاعلية الكاملة
                    </button>
                  </div>
                  <p className="text-slate-400">
                    تم فحص {statisticalEvidence.sampleSize} صفقة باستخدام اختبارات التباديل وبوتستراب (1,200 تكرار) مع احتساب مجالات الثقة 95% ونصف كيلي للانضباط.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-indigo-400/60 animate-pulse" />
                <span>يرجى تشغيل الاختبار التاريخي أولاً لاستخراج الأدلة الإحصائية وتقييم بوابة الاعتماد.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>مصدر البيانات: {dataSourceNotice}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Evidence Gatekeeper Interactive Modal */}
      <EvidenceGatekeeperModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        evidence={statisticalEvidence}
      />

      {/* One-Click Full Analysis Modal */}
      <OneClickAnalysisModal
        isOpen={isOneClickAnalysisOpen}
        onClose={() => setIsOneClickAnalysisOpen(false)}
        symbol={symbol}
        klines={historicalData && historicalData.length > 50 ? historicalData : initialKlines}
        onOpenGateModal={() => setIsEvidenceModalOpen(true)}
      />
    </div>
  );
};
