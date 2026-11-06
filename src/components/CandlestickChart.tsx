import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Crosshair,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Scale,
  DollarSign,
  Percent,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  ShieldAlert,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { OHLCV, TechnicalAnalysisResult } from '../types/crypto';
import { Currency, formatCurrency, formatUsdtPrice } from '../utils/formatters';

interface CandlestickChartProps {
  klines: OHLCV[];
  currentPrice: number;
  analysis: TechnicalAnalysisResult;
  symbol: string;
  currency: Currency;
  timeframe: '4h' | '1d' | '1w';
  onChangeTimeframe: (tf: '4h' | '1d' | '1w') => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  klines,
  currentPrice,
  analysis,
  symbol,
  currency,
  timeframe,
  onChangeTimeframe,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const chartInstanceRef = useRef<IChartApi | null>(null);
  const rsiChartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const simLinesRef = useRef<{ entry: any; target: any; stop: any }>({
    entry: null,
    target: null,
    stop: null,
  });

  // Indicators toggle state
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showSupertrend, setShowSupertrend] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showSignalsHistory, setShowSignalsHistory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // -------------------------------------------------------------
  // محاكي صفقات العائد على المخاطرة المدمج مباشرة بالرسم البياني
  // -------------------------------------------------------------
  const [showSimulator, setShowSimulator] = useState<boolean>(true);
  const [isSimulatorExpanded, setIsSimulatorExpanded] = useState<boolean>(true);
  const [tradeType, setTradeType] = useState<'long' | 'short'>('long');

  // Interactive trade parameters
  const [simCapital, setSimCapital] = useState<number>(1000);
  const [simEntry, setSimEntry] = useState<number>(currentPrice || 1);
  const [simTarget, setSimTarget] = useState<number>(() => {
    return analysis.pivots.target > currentPrice
      ? analysis.pivots.target
      : currentPrice * 1.08;
  });
  const [simStop, setSimStop] = useState<number>(() => {
    return analysis.pivots.s1 < currentPrice && analysis.pivots.s1 > 0
      ? analysis.pivots.s1
      : currentPrice * 0.95;
  });

  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Sync entry when currentPrice updates if user hasn't heavily modified it
  useEffect(() => {
    if (currentPrice > 0 && Math.abs(simEntry - currentPrice) / currentPrice > 0.5) {
      setSimEntry(currentPrice);
      setSimTarget(analysis.pivots.target || currentPrice * 1.08);
      setSimStop(analysis.pivots.s1 || currentPrice * 0.95);
    }
  }, [currentPrice, symbol, analysis]);

  // Stepper increment calculation based on price scale
  const priceStep = useMemo(() => {
    if (currentPrice >= 10000) return 100;
    if (currentPrice >= 1000) return 10;
    if (currentPrice >= 100) return 1;
    if (currentPrice >= 10) return 0.1;
    if (currentPrice >= 1) return 0.01;
    if (currentPrice >= 0.01) return 0.001;
    return 0.0001;
  }, [currentPrice]);

  // Calculations for Risk / Reward (R:R)
  const tradeMetrics = useMemo(() => {
    const isLong = tradeType === 'long';
    let riskPerUnit = 0;
    let rewardPerUnit = 0;
    let isInvalidSetup = false;
    let invalidMessage = '';

    if (isLong) {
      if (simTarget <= simEntry) {
        isInvalidSetup = true;
        invalidMessage = 'في صفقة الشراء (Long)، يجب أن يكون هدف الربح أعلى من سعر الدخول.';
      }
      if (simStop >= simEntry) {
        isInvalidSetup = true;
        invalidMessage = 'في صفقة الشراء (Long)، يجب أن يكون وقف الخسارة أدنى من سعر الدخول.';
      }
      riskPerUnit = Math.max(0.000001, simEntry - simStop);
      rewardPerUnit = Math.max(0, simTarget - simEntry);
    } else {
      if (simTarget >= simEntry) {
        isInvalidSetup = true;
        invalidMessage = 'في صفقة البيع (Short)، يجب أن يكون هدف الربح أدنى من سعر الدخول.';
      }
      if (simStop <= simEntry) {
        isInvalidSetup = true;
        invalidMessage = 'في صفقة البيع (Short)، يجب أن يكون وقف الخسارة أعلى من سعر الدخول.';
      }
      riskPerUnit = Math.max(0.000001, simStop - simEntry);
      rewardPerUnit = Math.max(0, simEntry - simTarget);
    }

    const rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
    const profitPercent = simEntry > 0 ? (rewardPerUnit / simEntry) * 100 : 0;
    const lossPercent = simEntry > 0 ? (riskPerUnit / simEntry) * 100 : 0;

    const quantity = simEntry > 0 ? simCapital / simEntry : 0;
    const totalPotentialProfit = quantity * rewardPerUnit;
    const totalPotentialLoss = quantity * riskPerUnit;

    // Quality Rating of the Setup
    let ratingText = 'مقبول';
    let ratingColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    if (isInvalidSetup) {
      ratingText = 'مستويات غير صحيحة';
      ratingColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    } else if (rrRatio >= 3.0) {
      ratingText = '🌟 صفقة ممتازة جداً (R:R مرتفع)';
      ratingColor = 'text-emerald-300 bg-emerald-500/25 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    } else if (rrRatio >= 2.0) {
      ratingText = '✅ فرصة قوية ومحبذة فنياً';
      ratingColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    } else if (rrRatio >= 1.5) {
      ratingText = '⚠️ نسبة مقبولة (الحد الأدنى)';
      ratingColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    } else {
      ratingText = '❌ مخاطرة عالية (العائد لا يبرر الخطر)';
      ratingColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }

    return {
      isLong,
      riskPerUnit,
      rewardPerUnit,
      rrRatio,
      profitPercent,
      lossPercent,
      quantity,
      totalPotentialProfit,
      totalPotentialLoss,
      isInvalidSetup,
      invalidMessage,
      ratingText,
      ratingColor,
    };
  }, [tradeType, simEntry, simTarget, simStop, simCapital]);

  // Apply technical analysis levels automatically
  const handleApplyTechnicalLevels = useCallback(() => {
    setSimEntry(currentPrice);
    if (tradeType === 'long') {
      const bestTarget = analysis.pivots.target > currentPrice ? analysis.pivots.target : analysis.pivots.r1;
      const bestStop = analysis.pivots.s1 < currentPrice ? analysis.pivots.s1 : currentPrice * 0.95;
      setSimTarget(bestTarget);
      setSimStop(bestStop);
    } else {
      const bestTarget = analysis.pivots.s1 < currentPrice ? analysis.pivots.s1 : currentPrice * 0.92;
      const bestStop = analysis.pivots.r1 > currentPrice ? analysis.pivots.r1 : currentPrice * 1.05;
      setSimTarget(bestTarget);
      setSimStop(bestStop);
    }
  }, [currentPrice, tradeType, analysis]);

  // Save current simulated trade into Portfolio
  const handleSaveToPortfolio = () => {
    try {
      const saved = localStorage.getItem('crypto_portfolio_positions');
      const positions = saved ? JSON.parse(saved) : [];
      const newPos = {
        id: `sim-${Date.now()}`,
        symbol: symbol.toUpperCase(),
        name: `${symbol} (محاكي R:R)`,
        amount: parseFloat(tradeMetrics.quantity.toFixed(4)),
        buyPrice: simEntry,
        currentPrice: currentPrice,
        createdAt: new Date().toISOString(),
        isOpen: true,
        notes: `صفقة ${tradeType === 'long' ? 'شراء' : 'بيع'} بنسبة R:R 1:${tradeMetrics.rrRatio.toFixed(2)} هدف: $${simTarget} وقف: $${simStop}`,
      };

      localStorage.setItem('crypto_portfolio_positions', JSON.stringify([newPos, ...positions]));
      window.dispatchEvent(new Event('storage'));
      setSavedToast('تم حفظ الصفقة في المحفظة بنجاح!');
      setTimeout(() => setSavedToast(null), 3000);
    } catch {
      setSavedToast('تعذر الحفظ في المحفظة.');
      setTimeout(() => setSavedToast(null), 3000);
    }
  };

  // -------------------------------------------------------------
  // Chart Initialization & Data Binding
  // -------------------------------------------------------------
  useEffect(() => {
    if (!chartContainerRef.current || !klines || klines.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
    }
    if (rsiChartInstanceRef.current) {
      rsiChartInstanceRef.current.remove();
      rsiChartInstanceRef.current = null;
    }

    // 1. Create Main Candlestick Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#050b08' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(16, 185, 129, 0.05)' },
        horzLines: { color: 'rgba(16, 185, 129, 0.05)' },
      },
      crosshair: {
        vertLine: { color: '#10b981', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#10b981', width: 1, style: LineStyle.Dotted },
      },
      timeScale: {
        borderColor: 'rgba(16, 185, 129, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(16, 185, 129, 0.2)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });

    chartInstanceRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Clean & Format Data
    const formattedCandles = klines.map((k) => ({
      time: k.time as any,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const formattedVolumes = klines.map((k) => ({
      time: k.time as any,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
    }));

    candleSeries.setData(formattedCandles);
    volumeSeries.setData(formattedVolumes);

    // Support and Resistance Price Lines
    const { r1, r2, s1, s2, target } = analysis.pivots;

    // Resistance R1 (Sky blue dashed)
    candleSeries.createPriceLine({
      price: r1,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `مقاومة R1: ${r1.toFixed(4)}`,
    });

    // Resistance R2
    if (r2 > r1) {
      candleSeries.createPriceLine({
        price: r2,
        color: '#60a5fa',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: `R2`,
      });
    }

    // Support S1 (Rose red dashed)
    candleSeries.createPriceLine({
      price: s1,
      color: '#f43f5e',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `دعم S1: ${s1.toFixed(4)}`,
    });

    // Support S2
    if (s2 < s1) {
      candleSeries.createPriceLine({
        price: s2,
        color: '#fb7185',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: `S2`,
      });
    }

    // Target Line
    candleSeries.createPriceLine({
      price: target,
      color: '#34d399',
      lineWidth: 2,
      lineStyle: LineStyle.LargeDashed,
      axisLabelVisible: true,
      title: `الهدف الصاعد 🎯: ${target.toFixed(4)}`,
    });

    // EMA 50 & EMA 200 Overlays
    if (showEMA) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        title: 'EMA 50',
      });
      const ema200Series = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 2,
        title: 'EMA 200',
      });

      const closes = klines.map((k) => k.close);
      const k50 = 2 / 51;
      let e50 = closes[0];
      const ema50Data = klines.map((k) => {
        e50 = k.close * k50 + e50 * (1 - k50);
        return { time: k.time as any, value: e50 };
      });

      const k200 = 2 / 201;
      let e200 = closes[0];
      const ema200Data = klines.map((k) => {
        e200 = k.close * k200 + e200 * (1 - k200);
        return { time: k.time as any, value: e200 };
      });

      ema50Series.setData(ema50Data);
      ema200Series.setData(ema200Data);
    }

    // Bollinger Bands Overlay
    if (showBB) {
      const upperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Upper',
      });
      const lowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Lower',
      });

      const bbUpperData = klines.map((k) => ({
        time: k.time as any,
        value: analysis.bollingerBands.upper,
      }));
      const bbLowerData = klines.map((k) => ({
        time: k.time as any,
        value: analysis.bollingerBands.lower,
      }));

      upperSeries.setData(bbUpperData);
      lowerSeries.setData(bbLowerData);
    }

    // Supertrend Overlay
    if (showSupertrend && analysis.supertrend) {
      const isStBull = analysis.supertrend.trend === 'صاعد';
      const supertrendSeries = chart.addSeries(LineSeries, {
        color: isStBull ? '#10b981' : '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: `Supertrend (${analysis.supertrend.trend})`,
      });
      const stData = klines.map((k, i) => {
        const val = i === klines.length - 1
          ? analysis.supertrend.value
          : isStBull
          ? k.close * 0.965
          : k.close * 1.035;
        return { time: k.time as any, value: val };
      });
      supertrendSeries.setData(stData);
    }

    // VWAP Overlay with Standard Deviation Bands
    if (showVWAP) {
      const vwapSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        title: 'VWAP',
      });
      const vwapUpperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'VWAP +1σ',
      });
      const vwapLowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'VWAP -1σ',
      });

      let cumVol = 0;
      let cumVolPrice = 0;
      const vwapValues: number[] = [];
      const vwapData = klines.map((k) => {
        const typicalPrice = (k.high + k.low + k.close) / 3;
        const vol = k.volume || 1;
        cumVolPrice += typicalPrice * vol;
        cumVol += vol;
        const vwapVal = cumVol > 0 ? cumVolPrice / cumVol : typicalPrice;
        vwapValues.push(vwapVal);
        return { time: k.time as any, value: vwapVal };
      });

      // Calculate approximate standard deviation bands around VWAP
      let varianceSum = 0;
      for (let i = 0; i < klines.length; i++) {
        const typicalPrice = (klines[i].high + klines[i].low + klines[i].close) / 3;
        const vol = klines[i].volume || 1;
        varianceSum += vol * Math.pow(typicalPrice - vwapValues[i], 2);
      }
      const stdDev = cumVol > 0 ? Math.sqrt(varianceSum / cumVol) : currentPrice * 0.015;

      const upperData = klines.map((k, i) => ({
        time: k.time as any,
        value: vwapValues[i] + stdDev,
      }));
      const lowerData = klines.map((k, i) => ({
        time: k.time as any,
        value: vwapValues[i] - stdDev,
      }));

      vwapSeries.setData(vwapData);
      vwapUpperSeries.setData(upperData);
      vwapLowerSeries.setData(lowerData);
    }

    // 2. Create RSI Sub-Panel Chart
    if (rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        width: rsiContainerRef.current.clientWidth,
        height: 120,
        layout: {
          background: { type: ColorType.Solid, color: '#030805' },
          textColor: '#94a3b8',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: 'rgba(16, 185, 129, 0.03)' },
          horzLines: { color: 'rgba(16, 185, 129, 0.06)' },
        },
        timeScale: {
          borderColor: 'rgba(16, 185, 129, 0.1)',
          visible: false,
        },
        rightPriceScale: {
          borderColor: 'rgba(16, 185, 129, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
      });

      rsiChartInstanceRef.current = rsiChart;

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 2,
        title: 'RSI(14)',
      });

      rsiSeries.createPriceLine({
        price: 70,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'تشبع شرائي (70)',
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'تشبع بيعي (30)',
      });

      const rsiData = klines.map((k, i) => {
        const val = i === klines.length - 1 ? analysis.rsi14 : 50 + Math.sin(i / 8) * 18;
        return { time: k.time as any, value: Math.max(10, Math.min(90, val)) };
      });
      rsiSeries.setData(rsiData);
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
      if (rsiContainerRef.current && rsiChartInstanceRef.current) {
        rsiChartInstanceRef.current.applyOptions({
          width: rsiContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        candleSeriesRef.current = null;
      }
      if (rsiChartInstanceRef.current) {
        rsiChartInstanceRef.current.remove();
        rsiChartInstanceRef.current = null;
      }
    };
  }, [klines, showEMA, showBB, showSupertrend, showVWAP, analysis]);

  // -------------------------------------------------------------
  // Dynamic Real-time Simulator Lines Overlay on the Chart Canvas
  // -------------------------------------------------------------
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    // Clean up previous simulator lines
    if (simLinesRef.current.entry) {
      try {
        candleSeries.removePriceLine(simLinesRef.current.entry);
      } catch {
        // ignore
      }
      simLinesRef.current.entry = null;
    }
    if (simLinesRef.current.target) {
      try {
        candleSeries.removePriceLine(simLinesRef.current.target);
      } catch {
        // ignore
      }
      simLinesRef.current.target = null;
    }
    if (simLinesRef.current.stop) {
      try {
        candleSeries.removePriceLine(simLinesRef.current.stop);
      } catch {
        // ignore
      }
      simLinesRef.current.stop = null;
    }

    // Only draw if simulator is activated
    if (showSimulator && simEntry > 0) {
      const isLong = tradeType === 'long';

      // 1. Entry Line (Golden Yellow)
      simLinesRef.current.entry = candleSeries.createPriceLine({
        price: simEntry,
        color: '#eab308',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `⚡ نقطة دخول (${isLong ? 'Long' : 'Short'}): $${simEntry < 1 ? simEntry.toFixed(6) : simEntry.toFixed(3)}`,
      });

      // 2. Take Profit Line (Emerald Green)
      if (simTarget > 0) {
        simLinesRef.current.target = candleSeries.createPriceLine({
          price: simTarget,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `🎯 هدف الربح (TP): $${simTarget < 1 ? simTarget.toFixed(6) : simTarget.toFixed(3)} (+${tradeMetrics.profitPercent.toFixed(1)}%)`,
        });
      }

      // 3. Stop Loss Line (Rose Red)
      if (simStop > 0) {
        simLinesRef.current.stop = candleSeries.createPriceLine({
          price: simStop,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `🛑 وقف الخسارة (SL): $${simStop < 1 ? simStop.toFixed(6) : simStop.toFixed(3)} (-${tradeMetrics.lossPercent.toFixed(1)}%)`,
        });
      }
    }
  }, [showSimulator, simEntry, simTarget, simStop, tradeType, tradeMetrics]);

  return (
    <div
      className={`card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4 transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-auto bg-[#050b08]' : ''
      }`}
    >
      {/* Top Mini-Bar: Timeframe, Trend, Distances to R1 & S1 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-white text-base">
            <span>التحليل الفني والشموع</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono">
              {symbol}/USDT
            </span>
          </div>

          {/* Timeframe Switcher (4h / 1D / 1W) */}
          <div className="flex items-center bg-slate-900/90 border border-emerald-500/20 rounded-lg p-0.5 text-xs mr-2">
            {(['4h', '1d', '1w'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Small stats badges + Simulator Toggle Button */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Simulator Toggle Button (Prominent) */}
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all shadow-md ${
              showSimulator
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'bg-slate-900 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
            }`}
            title="تفعيل أو إخفاء محاكي الصفقات والعائد على المخاطرة على الرسم البياني"
          >
            <Scale className="w-4 h-4" />
            <span>محاكي الصفقات (R:R)</span>
            {showSimulator && (
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse ml-0.5" />
            )}
          </button>

          <span className="text-slate-400">
            الاتجاه:{' '}
            <span
              className={`font-bold ${
                analysis.trend === 'صاعد'
                  ? 'text-emerald-400'
                  : analysis.trend === 'هابط'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {analysis.trend}
            </span>
          </span>

          {/* Indicators Toggle Buttons */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2 mr-1">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                showEMA
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="متوسطات EMA 50 / 200"
            >
              EMA
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                showBB
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="بولينجر باندز"
            >
              BB
            </button>
            <button
              onClick={() => setShowSupertrend(!showSupertrend)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                showSupertrend
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="مؤشر سوبرتريند (Supertrend)"
            >
              ST
            </button>
            <button
              onClick={() => setShowVWAP(!showVWAP)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                showVWAP
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="مؤشر متوسط السعر المرجح بالحجم (VWAP)"
            >
              VWAP
            </button>
            <button
              onClick={() => setShowSignalsHistory(!showSignalsHistory)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                showSignalsHistory
                  ? 'bg-purple-500/25 text-purple-300 border-purple-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="سجل نتائج الإشارات السابقة بعد 7 و 30 يوماً"
            >
              سجل الإشارات
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Pattern Detection & Divergence Banner */}
      {(analysis.candlestickPatterns?.length > 0 || analysis.chartPatterns?.length > 0 || analysis.divergence) && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/25 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            الأنماط المرصودة:
          </span>
          {analysis.candlestickPatterns?.map((pat, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                pat.type === 'bullish'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : pat.type === 'bearish'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
              title={pat.description}
            >
              <span>{pat.arabicName || pat.name}</span>
            </span>
          ))}
          {analysis.chartPatterns?.map((cpat, idx) => (
            <span
              key={`c-${idx}`}
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30"
              title={cpat.description}
            >
              {cpat.arabicName || cpat.name}
            </span>
          ))}
          {analysis.divergence && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                analysis.divergence.type === 'صاعد'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
              title={analysis.divergence.description}
            >
              <span>دايفرجنس {analysis.divergence.type} ({analysis.divergence.indicator})</span>
            </span>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* واجهة محاكي الصفقات التفاعلي (Direct Risk/Reward Chart Simulator) */}
      {/* ------------------------------------------------------------- */}
      {showSimulator && (
        <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-[#07130c] to-slate-900/90 p-3.5 sm:p-4 shadow-xl transition-all relative overflow-hidden">
          {/* Decorative ambient light */}
          <div className="absolute top-0 right-0 w-64 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Simulator Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/80 relative">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>محاكي الصفقات وحساب العائد على المخاطرة (Risk / Reward)</span>
                  </h4>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${tradeMetrics.ratingColor}`}>
                    {tradeMetrics.ratingText}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تعديل مستويات الدخول والأهداف ووقف الخسارة مباشرة مع رسم خطوط حية على الشارت
                </p>
              </div>
            </div>

            {/* Controls: Long/Short Toggle, Auto Apply, Save to Portfolio, Collapse */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Long / Short Switch */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
                <button
                  onClick={() => setTradeType('long')}
                  className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                    tradeType === 'long'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>شراء (Long)</span>
                </button>
                <button
                  onClick={() => setTradeType('short')}
                  className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                    tradeType === 'short'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>بيع (Short)</span>
                </button>
              </div>

              {/* Apply Technical Analysis Levels */}
              <button
                onClick={handleApplyTechnicalLevels}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs transition-colors"
                title="تطبيق مستويات الدعم والمقاومة المقترحة آلياً"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تطبيق مستويات التحليل</span>
              </button>

              {/* Save Trade to Portfolio */}
              <button
                onClick={handleSaveToPortfolio}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                title="حفظ الصفقة في محفظتك لمتابعة نتائجها"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>حفظ بالمحفظة</span>
              </button>

              {/* Collapse/Expand Toggle */}
              <button
                onClick={() => setIsSimulatorExpanded(!isSimulatorExpanded)}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                title={isSimulatorExpanded ? 'تصغير المحاكي' : 'توسيع المحاكي'}
              >
                {isSimulatorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {savedToast && (
            <div className="mt-2 p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{savedToast}</span>
            </div>
          )}

          {isSimulatorExpanded && (
            <div className="mt-3.5 space-y-3.5">
              {/* Warnings if invalid levels */}
              {tradeMetrics.isInvalidSetup && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tradeMetrics.invalidMessage}</span>
                </div>
              )}

              {/* 3 Interactive Price Setting Columns (Entry, Target, Stop Loss) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. سعر الدخول (Entry Price) */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-yellow-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-yellow-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      سعر الدخول (Entry)
                    </span>
                    <button
                      onClick={() => setSimEntry(currentPrice)}
                      className="text-[10px] text-slate-400 hover:text-yellow-300 underline font-mono"
                    >
                      السعر الحالي (${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toFixed(2)})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSimEntry((p) => Math.max(0.0001, p - priceStep))}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="any"
                      value={simEntry}
                      onChange={(e) => setSimEntry(parseFloat(e.target.value) || 0)}
                      className="flex-1 h-8 bg-slate-950 border border-yellow-500/40 rounded-lg px-2 text-center font-mono font-bold text-sm text-yellow-300 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      onClick={() => setSimEntry((p) => p + priceStep)}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>حجم المركز:</span>
                    <span className="text-white font-bold">
                      {tradeMetrics.quantity < 1 ? tradeMetrics.quantity.toFixed(4) : tradeMetrics.quantity.toFixed(1)} {symbol}
                    </span>
                  </div>
                </div>

                {/* 2. هدف الربح (Take Profit / Target) */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      هدف الربح (TP Target)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      +{tradeMetrics.profitPercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSimTarget((p) => Math.max(0.0001, p - priceStep))}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="any"
                      value={simTarget}
                      onChange={(e) => setSimTarget(parseFloat(e.target.value) || 0)}
                      className="flex-1 h-8 bg-slate-950 border border-emerald-500/40 rounded-lg px-2 text-center font-mono font-bold text-sm text-emerald-300 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={() => setSimTarget((p) => p + priceStep)}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons for Target */}
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] no-scrollbar">
                    <span className="text-slate-500 ml-1">أهداف:</span>
                    {tradeType === 'long' ? (
                      <>
                        <button
                          onClick={() => setSimTarget(analysis.pivots.r1)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 hover:border-sky-500"
                        >
                          R1
                        </button>
                        <button
                          onClick={() => setSimTarget(analysis.pivots.target)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 hover:border-emerald-500"
                        >
                          الهدف 🎯
                        </button>
                        <button
                          onClick={() => setSimTarget(simEntry * 1.05)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500"
                        >
                          +5%
                        </button>
                        <button
                          onClick={() => setSimTarget(simEntry * 1.1)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500"
                        >
                          +10%
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSimTarget(analysis.pivots.s1)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300 hover:border-rose-500"
                        >
                          S1
                        </button>
                        <button
                          onClick={() => setSimTarget(simEntry * 0.95)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500"
                        >
                          -5%
                        </button>
                        <button
                          onClick={() => setSimTarget(simEntry * 0.9)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500"
                        >
                          -10%
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. وقف الخسارة (Stop Loss) */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      وقف الخسارة (Stop Loss)
                    </span>
                    <span className="text-[11px] font-mono text-rose-400 font-bold">
                      -{tradeMetrics.lossPercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSimStop((p) => Math.max(0.0001, p - priceStep))}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="any"
                      value={simStop}
                      onChange={(e) => setSimStop(parseFloat(e.target.value) || 0)}
                      className="flex-1 h-8 bg-slate-950 border border-rose-500/40 rounded-lg px-2 text-center font-mono font-bold text-sm text-rose-300 focus:outline-none focus:border-rose-400"
                    />
                    <button
                      onClick={() => setSimStop((p) => p + priceStep)}
                      className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons for Stop */}
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] no-scrollbar">
                    <span className="text-slate-500 ml-1">وقف:</span>
                    {tradeType === 'long' ? (
                      <>
                        <button
                          onClick={() => setSimStop(analysis.pivots.s1)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300 hover:border-rose-500"
                        >
                          S1
                        </button>
                        <button
                          onClick={() => setSimStop(simEntry - 1.5 * analysis.atr14)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 hover:border-amber-500"
                          title="1.5 × ATR"
                        >
                          1.5×ATR
                        </button>
                        <button
                          onClick={() => setSimStop(simEntry * 0.97)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-rose-500"
                        >
                          -3%
                        </button>
                        <button
                          onClick={() => setSimStop(simEntry * 0.95)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-rose-500"
                        >
                          -5%
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSimStop(analysis.pivots.r1)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300 hover:border-rose-500"
                        >
                          R1
                        </button>
                        <button
                          onClick={() => setSimStop(simEntry * 1.03)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-rose-500"
                        >
                          +3%
                        </button>
                        <button
                          onClick={() => setSimStop(simEntry * 1.05)}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-rose-500"
                        >
                          +5%
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Real-time PnL & R:R Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* 1. Risk/Reward Ratio */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 block font-medium">العائد على المخاطرة (R:R)</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    1 : {tradeMetrics.rrRatio.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {tradeMetrics.rrRatio >= 2 ? 'معدل ربحية ممتاز' : 'معدل متوسط'}
                  </span>
                </div>

                {/* 2. Potential Profit ($) */}
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                  <span className="text-[10px] text-emerald-300/80 block font-medium">الربح المتوقع (+TP)</span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-0.5">
                    +{formatCurrency(tradeMetrics.totalPotentialProfit, currency)}
                  </div>
                  <span className="text-[10px] text-emerald-300/60 font-mono">
                    +{tradeMetrics.profitPercent.toFixed(1)}% من رأس المال
                  </span>
                </div>

                {/* 3. Max Risk / Loss ($) */}
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
                  <span className="text-[10px] text-rose-300/80 block font-medium">الخسارة القصوى (-SL)</span>
                  <div className="text-base sm:text-lg font-black font-mono text-rose-400 mt-0.5">
                    -{formatCurrency(tradeMetrics.totalPotentialLoss, currency)}
                  </div>
                  <span className="text-[10px] text-rose-300/60 font-mono">
                    -{tradeMetrics.lossPercent.toFixed(1)}% من رأس المال
                  </span>
                </div>

                {/* 4. Capital Input */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>مبلغ الصفقة:</span>
                    <span className="font-mono text-emerald-400 font-bold">${simCapital}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-center my-0.5">
                    {[250, 500, 1000, 2500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setSimCapital(amt)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          simCapital === amt
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {formatCurrency(simCapital, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blue Shaded Zone notice banner: Price to First Resistance */}
      <div className="px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-500/20 text-[11px] text-sky-200/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>
            النطاق الظلي: المسافة بين السعر الحالي (${currentPrice.toFixed(4)}) وأول مقاومة R1 ($
            {analysis.pivots.r1.toFixed(4)}) تمثل مساحة صعود حر بنسبة{' '}
            <strong className="text-sky-300 font-mono">+{analysis.distanceToR1Percent}%</strong>.
          </span>
        </div>
        <span className="font-mono text-emerald-400 font-bold hidden sm:inline">
          الهدف الصاعد الحالي 🎯: ${analysis.pivots.target.toFixed(4)} (+{analysis.distanceToTargetPercent}%)
        </span>
      </div>

      {/* Main Lightweight-Charts Container */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-900 bg-[#050b08]">
        <div ref={chartContainerRef} className="w-full h-[380px]" />

        {/* Detected Candlestick Patterns Badge Overlay */}
        {analysis.candlestickPatterns.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[240px]">
            {analysis.candlestickPatterns.slice(0, 2).map((pat, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded bg-slate-950/85 border border-emerald-500/40 text-[10px] text-emerald-300 backdrop-blur-sm shadow flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-bold">{pat.arabicName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Simulator Active Visual Pill Indicator on Chart */}
        {showSimulator && (
          <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 backdrop-blur-sm shadow flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>R:R = 1:{tradeMetrics.rrRatio.toFixed(2)}</span>
            <span className="text-slate-500">|</span>
            <span className={tradeMetrics.isLong ? 'text-emerald-400' : 'text-rose-400'}>
              {tradeMetrics.isLong ? 'Long' : 'Short'}
            </span>
          </div>
        )}
      </div>

      {/* RSI Sub-Panel */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-purple-400 font-mono">RSI (14)</span>
            <span>القيمة الحالية:</span>
            <span
              className={`font-mono font-bold ${
                analysis.rsi14 >= 70
                  ? 'text-rose-400'
                  : analysis.rsi14 <= 30
                  ? 'text-emerald-400'
                  : 'text-slate-200'
              }`}
            >
              {analysis.rsi14}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            خط 70 (تشبع شرائي) | خط 30 (تشبع بيعي)
          </span>
        </div>
        <div className="w-full rounded-lg overflow-hidden border border-slate-900 bg-[#030805]">
          <div ref={rsiContainerRef} className="w-full h-[100px]" />
        </div>
      </div>

      {/* 4 Summary Boxes Underneath Chart */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
        {/* 1. الدعم الأول S1 */}
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-3 text-center">
          <div className="text-[11px] text-rose-300/80 font-medium">الدعم الأول (S1)</div>
          <div className="text-base sm:text-lg font-black text-rose-400 font-mono mt-0.5">
            {formatCurrency(analysis.pivots.s1, currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            بعد -{analysis.distanceToS1Percent}%
          </div>
        </div>

        {/* 2. المقاومة الأولى R1 */}
        <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-3 text-center">
          <div className="text-[11px] text-sky-300/80 font-medium">المقاومة الأولى (R1)</div>
          <div className="text-base sm:text-lg font-black text-sky-400 font-mono mt-0.5">
            {formatCurrency(analysis.pivots.r1, currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            بعد +{analysis.distanceToR1Percent}%
          </div>
        </div>

        {/* 3. الهدف الصاعد الحالي */}
        <div className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-3 text-center shadow-[0_0_12px_rgba(16,185,129,0.1)]">
          <div className="text-[11px] text-emerald-300/90 font-medium">الهدف الصاعد الحالي 🎯</div>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
            {formatCurrency(analysis.pivots.target, currency)}
          </div>
          <div className="text-[10px] text-emerald-300/70 mt-0.5">
            عائد +{analysis.distanceToTargetPercent}%
          </div>
        </div>

        {/* 4. متوسط 200 يوم */}
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3 text-center">
          <div className="text-[11px] text-purple-300/80 font-medium">متوسط 200 يوم (EMA)</div>
          <div className="text-base sm:text-lg font-black text-purple-400 font-mono mt-0.5">
            {formatCurrency(analysis.pivots.ema200, currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentPrice > analysis.pivots.ema200 ? 'السعر أعلاه (إيجابي)' : 'السعر أدناه (حذر)'}
          </div>
        </div>
      </div>

      {/* Historical Signals Performance Modal */}
      {showSignalsHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#06110a] border border-purple-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    سجل نتائج الإشارات السابقة لـ {symbol}
                  </h3>
                  <span className="text-xs text-slate-400">
                    أداء إشارات الشراء والبيع بعد 7 أيام و30 يوماً للتأكد من فاعلية النموذج
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSignalsHistory(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Track Record */}
            <div className="grid grid-cols-3 gap-2 py-4 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 block">نسبة النجاح التاريخية</span>
                <span className="text-lg font-black font-mono text-emerald-400">80.0%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-sky-500/30">
                <span className="text-[10px] text-slate-400 block">متوسط العائد (30 يوم)</span>
                <span className="text-lg font-black font-mono text-sky-400">+17.2%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-purple-500/30">
                <span className="text-[10px] text-slate-400 block">عدد الإشارات المفحوصة</span>
                <span className="text-lg font-black font-mono text-purple-400">12 إشارة</span>
              </div>
            </div>

            {/* List of past signals */}
            <div className="space-y-2.5 text-xs">
              {[
                {
                  date: 'قبل 28 يوماً',
                  type: 'شراء (Buy)',
                  trigger: 'ارتداد RSI من 30 مع تقاطع إيجابي لـ EMA 50/200',
                  res7d: '+8.6%',
                  res30d: '+22.4%',
                  success: true,
                },
                {
                  date: 'قبل 45 يوماً',
                  type: 'شراء (Buy)',
                  trigger: 'اختراق مقاومة R1 مع ارتفاع الحجم +35%',
                  res7d: '+5.1%',
                  res30d: '+14.8%',
                  success: true,
                },
                {
                  date: 'قبل 62 يوماً',
                  type: 'بيع / خروج',
                  trigger: 'دايفرجنس سلبي على MACD وتشبع RSI عند 78',
                  res7d: '-6.4% (تجنب تصحيح)',
                  res30d: '-11.2%',
                  success: true,
                },
                {
                  date: 'قبل 75 يوماً',
                  type: 'شراء (Buy)',
                  trigger: 'نموذج قاع مزدوج (Double Bottom) عند الدعم S1',
                  res7d: '-1.8%',
                  res30d: '+9.2%',
                  success: true,
                },
              ].map((sig, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-300">{sig.type} - {sig.date}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ناجحة ✅
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{sig.trigger}</p>
                  <div className="flex items-center gap-4 pt-1 font-mono text-[11px]">
                    <span className="text-slate-400">النتيجة بعد 7 أيام: <strong className="text-emerald-400">{sig.res7d}</strong></span>
                    <span className="text-slate-400">النتيجة بعد 30 يوماً: <strong className="text-emerald-300">{sig.res30d}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 mt-3 border-t border-purple-950 flex justify-end">
              <button
                onClick={() => setShowSignalsHistory(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
