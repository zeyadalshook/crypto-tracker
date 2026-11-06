import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  RefreshCw,
  ShieldAlert,
  Printer,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ExternalLink,
  Calculator,
  ArrowRightLeft,
  Bell,
  X,
} from 'lucide-react';
import { Header } from './components/Header';
import { HeroCoinCard } from './components/HeroCoinCard';
import { QuickStatsRibbon } from './components/QuickStatsRibbon';
import { CryptoDataGrid } from './components/CryptoDataGrid';
import { CandlestickChart } from './components/CandlestickChart';
import { VolumeAndMomentum } from './components/VolumeAndMomentum';
import { CommunityAndConsensus } from './components/CommunityAndConsensus';
import { SummaryCard } from './components/SummaryCard';
import { AiAnalysisCard } from './components/AiAnalysisCard';
import { MultiTimeframeCard } from './components/MultiTimeframeCard';
import { DerivativesCard } from './components/DerivativesCard';
import { NewsAndSentiment } from './components/NewsAndSentiment';
import { FearAndGreedPanel } from './components/FearAndGreedPanel';
import { CorrelationHeatmap } from './components/CorrelationHeatmap';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { ScreenerModal } from './components/ScreenerModal';
import { PortfolioTracker } from './components/PortfolioTracker';
import { SmartAlertsModal } from './components/SmartAlertsModal';
import { BacktestingModal } from './components/BacktestingModal';
import { LegalDisclaimerModal } from './components/LegalDisclaimerModal';
import { UsdtCalculatorModal } from './components/UsdtCalculatorModal';
import { ComprehensiveReportModal } from './components/ComprehensiveReportModal';
import { ErrorLogModal } from './components/ErrorLogModal';
import { TradingJournalModal } from './components/TradingJournalModal';
import { PaperTradingModal } from './components/PaperTradingModal';
import { ChartVisionModal } from './components/ChartVisionModal';
import { DerivativesLiquidityModal } from './components/DerivativesLiquidityModal';
import { MarketOverviewModal } from './components/MarketOverviewModal';
import { WhaleCalendarModal } from './components/WhaleCalendarModal';
import { ShareAnalysisCardModal } from './components/ShareAnalysisCardModal';
import { SignalScoreCard } from './components/SignalScoreCard';
import { ExecutionQualityCard } from './components/ExecutionQualityCard';
import { ExecutionLiquidityModal } from './components/ExecutionLiquidityModal';
import { EvidenceGatekeeperModal } from './components/evidence/EvidenceGatekeeperModal';
import { getSampleOrCalculatedEvidence } from './lib/stats/sampleEvidence';
import { OneClickAnalysisModal } from './components/pipeline/OneClickAnalysisModal';
import { LiveExecutionDashboard } from './components/live/LiveExecutionDashboard';
import { FundamentalScreenerModal } from './components/fundamentals/FundamentalScreenerModal';
import { FundamentalBadge } from './components/fundamentals/FundamentalBadge';
import { BrainCommandCenter } from './components/brain/BrainCommandCenter';
import { FavoritesWatchlistBar } from './components/FavoritesWatchlistBar';
import { FavoritesWatchlistModal } from './components/FavoritesWatchlistModal';
import { SmcOrderBlockCard } from './components/SmcOrderBlockCard';
import { SmartDcaSimulatorModal } from './components/SmartDcaSimulatorModal';
import { StressTestSimulatorModal } from './components/StressTestSimulatorModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { TradingAgentsModal } from './components/TradingAgentsModal';
import { FooterStatusRibbon } from './components/FooterStatusRibbon';
import { evaluatePriceAlerts, playAlertSound } from './services/alertManager';
import { errorLogger } from './services/errorLogger';
import { CoinDetail, FearAndGreedData, DerivativesData, OHLCV, TechnicalAnalysisResult } from './types/crypto';
import { runCompleteTechnicalAnalysis } from './utils/technicalIndicators';
import { computeSignalScore, SignalWeightsConfig, DEFAULT_SIGNAL_WEIGHTS } from './utils/signalScore';
import { Currency } from './utils/formatters';

export default function App() {
  const getInitialSymbol = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const coinParam = urlParams.get('coin');
      if (coinParam) return coinParam.toUpperCase();

      const pathParts = window.location.pathname.split('/');
      if (pathParts[1] === 'coin' && pathParts[2]) {
        return pathParts[2].toUpperCase();
      }
    } catch {
      // ignore
    }
    return 'PYTH';
  };

  const [symbol, setSymbol] = useState<string>(getInitialSymbol);
  const [currency, setCurrency] = useState<Currency>('USDT');
  const [timeframe, setTimeframe] = useState<'4h' | '1d' | '1w'>('1d');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'pro' | 'simple'>('pro');

  // Core Data States
  const [coinDetail, setCoinDetail] = useState<CoinDetail | null>(null);
  const [derivatives, setDerivatives] = useState<DerivativesData | null>(null);
  const [klines, setKlines] = useState<OHLCV[]>([]);
  const [fearGreed, setFearGreed] = useState<FearAndGreedData>({
    value: 62,
    classification: 'Greed',
    classification_ar: 'طمع',
    timestamp: String(Date.now()),
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [nextRefreshSeconds, setNextRefreshSeconds] = useState<number>(60);

  // Modals Visibility
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);
  const [isUsdtCalcOpen, setIsUsdtCalcOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState<boolean>(false);
  const [isErrorLogOpen, setIsErrorLogOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isPaperTradingOpen, setIsPaperTradingOpen] = useState<boolean>(false);
  const [isChartVisionOpen, setIsChartVisionOpen] = useState<boolean>(false);
  const [isDerivativesProOpen, setIsDerivativesProOpen] = useState<boolean>(false);
  const [isHeatmapOpen, setIsHeatmapOpen] = useState<boolean>(false);
  const [isWhaleCalendarOpen, setIsWhaleCalendarOpen] = useState<boolean>(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState<boolean>(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState<boolean>(false);
  const [isEvidenceGateOpen, setIsEvidenceGateOpen] = useState<boolean>(false);
  const [isOneClickAnalysisOpen, setIsOneClickAnalysisOpen] = useState<boolean>(false);
  const [isLiveExecutionOpen, setIsLiveExecutionOpen] = useState<boolean>(false);
  const [isFundamentalsOpen, setIsFundamentalsOpen] = useState<boolean>(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState<boolean>(false);
  const [isSmartDcaOpen, setIsSmartDcaOpen] = useState<boolean>(false);
  const [isStressTestOpen, setIsStressTestOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isTradingAgentsOpen, setIsTradingAgentsOpen] = useState<boolean>(false);
  const [activeTriggerToast, setActiveTriggerToast] = useState<{
    symbol: string;
    message: string;
    targetValue?: number;
    livePrice: number;
    channels?: any;
  } | null>(null);
  const [errorLogDefaultTab, setErrorLogDefaultTab] = useState<'sources' | 'logs' | 'sentry'>('sources');

  const handleOpenErrorModal = (tab: 'sources' | 'logs' | 'sentry' = 'sources') => {
    setErrorLogDefaultTab(tab);
    setIsErrorLogOpen(true);
  };

  // Global Ctrl+K / Cmd+K Command Palette Shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_user_favorites');
      return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL', 'PYTH'];
    } catch {
      return ['BTC', 'ETH', 'SOL', 'PYTH'];
    }
  });

  const isFavorite = favorites.includes(symbol);

  const handleToggleFavorite = () => {
    const updated = isFavorite ? favorites.filter((s) => s !== symbol) : [...favorites, symbol];
    setFavorites(updated);
    localStorage.setItem('crypto_user_favorites', JSON.stringify(updated));
  };

  const handleToggleFavoriteSymbol = (targetSym: string) => {
    const cleaned = targetSym.toUpperCase();
    const exists = favorites.includes(cleaned);
    const updated = exists ? favorites.filter((s) => s !== cleaned) : [...favorites, cleaned];
    setFavorites(updated);
    localStorage.setItem('crypto_user_favorites', JSON.stringify(updated));
  };

  // Check first time legal disclaimer acknowledgement
  useEffect(() => {
    const acknowledged = localStorage.getItem('legal_disclaimer_accepted');
    if (!acknowledged) {
      setIsDisclaimerOpen(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('legal_disclaimer_accepted', 'true');
    setIsDisclaimerOpen(false);
  };

  const handleSelectSymbol = (newSymbol: string) => {
    const cleaned = newSymbol.toUpperCase();
    setSymbol(cleaned);
    try {
      const newUrl = `${window.location.pathname}?coin=${cleaned}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } catch {
      // ignore
    }
  };

  // Fetch all Coin & Market Data
  const loadCoinData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const detailPromise = fetch(`/api/crypto/${symbol}`).then((r) => r.json());
      const klinesPromise = fetch(`/api/klines/${symbol}?interval=${timeframe}`).then((r) => r.json());
      const fgPromise = fetch('/api/fear-greed').then((r) => r.json());

      const [detailData, klinesData, fgData] = await Promise.all([
        detailPromise,
        klinesPromise,
        fgPromise,
      ]);

      if (detailData?.detail) {
        setCoinDetail(detailData.detail);
        if (detailData.detail.current_price) {
          evaluatePriceAlerts({ [symbol]: detailData.detail.current_price }, (alert, price) => {
            playAlertSound();
            setActiveTriggerToast({
              symbol: alert.symbol,
              message: alert.message,
              targetValue: alert.targetValue,
              livePrice: price,
              channels: alert.channels,
            });
          });
        }
      }
      if (detailData?.derivatives) {
        setDerivatives(detailData.derivatives);
      }
      if (klinesData?.candles && Array.isArray(klinesData.candles)) {
        setKlines(klinesData.candles);
      }
      if (fgData?.value !== undefined) {
        setFearGreed(fgData);
      }

      setLastUpdated(new Date().toLocaleTimeString('ar-EG'));
      setNextRefreshSeconds(60);
    } catch (err: any) {
      console.error('Failed to load coin data:', err);
      errorLogger.logError(
        `تحديث بيانات ${symbol}`,
        `فشل جلب أو معالجة بيانات العملة (${symbol}): ${err?.message || err}`,
        err
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadCoinData();
  }, [loadCoinData]);

  // Auto-refresh countdown every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefreshSeconds((prev) => {
        if (prev <= 1) {
          loadCoinData(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadCoinData]);

  // Signal Score Weights Configuration
  const [signalWeights, setSignalWeights] = useState<SignalWeightsConfig>(() => {
    try {
      const saved = localStorage.getItem('signal_score_weights');
      return saved ? JSON.parse(saved) : DEFAULT_SIGNAL_WEIGHTS;
    } catch {
      return DEFAULT_SIGNAL_WEIGHTS;
    }
  });

  const handleSaveSignalWeights = (newWeights: SignalWeightsConfig) => {
    setSignalWeights(newWeights);
    try {
      localStorage.setItem('signal_score_weights', JSON.stringify(newWeights));
    } catch {
      // ignore
    }
  };

  // Run Technical Analysis
  const analysisResult = useMemo<TechnicalAnalysisResult | null>(() => {
    if (!coinDetail || !klines || klines.length === 0) return null;

    try {
      return runCompleteTechnicalAnalysis(
        klines,
        coinDetail.current_price,
        coinDetail.sentiment_votes_up_percentage || 80,
        coinDetail.price_change_percentage_7d || 0,
        coinDetail.price_change_percentage_1y || 0
      );
    } catch (err) {
      console.error('Technical analysis calculation failed:', err);
      return null;
    }
  }, [coinDetail, klines]);

  // Compute Aggregated Signal Score
  const signalScoreResult = useMemo(() => {
    if (!analysisResult || !klines || klines.length === 0) return null;
    try {
      return computeSignalScore(klines, analysisResult, fearGreed, signalWeights);
    } catch (err) {
      console.error('Signal Score calculation failed:', err);
      return null;
    }
  }, [analysisResult, klines, fearGreed, signalWeights]);

  const [isRefreshingFearGreed, setIsRefreshingFearGreed] = useState<boolean>(false);

  const handleRefreshFearGreed = async () => {
    setIsRefreshingFearGreed(true);
    try {
      const res = await fetch('/api/fear-greed');
      if (res.ok) {
        const data = await res.json();
        setFearGreed(data);
      }
    } catch (err) {
      console.error('Failed to refresh fear & greed:', err);
    } finally {
      setIsRefreshingFearGreed(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'fear-greed') {
      const el = document.getElementById('fear-greed-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    if (tab === 'correlation') {
      const el = document.getElementById('correlation-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    if (tab === 'journal') setIsJournalOpen(true);
    if (tab === 'paper-trading') setIsPaperTradingOpen(true);
    if (tab === 'chart-vision') setIsChartVisionOpen(true);
    if (tab === 'derivatives-pro') setIsDerivativesProOpen(true);
    if (tab === 'heatmap') setIsHeatmapOpen(true);
    if (tab === 'whales-calendar') setIsWhaleCalendarOpen(true);
    if (tab === 'share-card') setIsShareCardOpen(true);
    if (tab === 'usdt-calc') setIsUsdtCalcOpen(true);
    if (tab === 'calculator') setIsCalculatorOpen(true);
    if (tab === 'screener') setIsScreenerOpen(true);
    if (tab === 'portfolio') setIsPortfolioOpen(true);
    if (tab === 'alerts') setIsAlertsOpen(true);
    if (tab === 'backtest') setIsBacktestOpen(true);
    if (tab === 'pdf-report') setIsReportModalOpen(true);
    if (tab === 'execution-liquidity') setIsExecutionModalOpen(true);
    if (tab === 'evidence-gate') setIsEvidenceGateOpen(true);
    if (tab === 'one-click-analysis') setIsOneClickAnalysisOpen(true);
    if (tab === 'live-execution') setIsLiveExecutionOpen(true);
    if (tab === 'fundamentals') setIsFundamentalsOpen(true);
    if (tab === 'smart-dca') setIsSmartDcaOpen(true);
    if (tab === 'stress-test') setIsStressTestOpen(true);
    if (tab === 'trading-agents') setIsTradingAgentsOpen(true);
    if (tab === 'watchlist') setIsWatchlistModalOpen(true);
    if (tab === 'error-log') handleOpenErrorModal('sources');
  };

  const currentEvidence = useMemo(() => {
    return getSampleOrCalculatedEvidence(symbol);
  }, [symbol]);

  const handlePrint = () => {
    setIsReportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050b08] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        currentSymbol={symbol}
        onSelectSymbol={handleSelectSymbol}
        currency={currency}
        onChangeCurrency={setCurrency}
        lastUpdated={lastUpdated}
        onRefresh={() => loadCoinData(false)}
        isRefreshing={isRefreshing}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'pro' ? 'simple' : 'pro')}
        favoritesCount={favorites.length}
        onOpenWatchlist={() => setIsWatchlistModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* إشعار منبثق فوري عند تفعيل أي تنبيه سعري */}
      {activeTriggerToast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl bg-[#091f13] border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.45)] text-white flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] flex-shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-black text-emerald-300 text-sm">
                🔔 تم تفعيل التنبيه السعري لـ {activeTriggerToast.symbol}!
              </span>
              <button
                onClick={() => setActiveTriggerToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-200 mt-1 font-medium">{activeTriggerToast.message}</p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 font-mono flex-wrap">
              <span>السعر اللحظي: ${activeTriggerToast.livePrice.toLocaleString()}</span>
              {activeTriggerToast.channels?.sms && (
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  تم إرسال SMS 📱
                </span>
              )}
              {activeTriggerToast.channels?.email && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  تم إرسال بريد ✉️
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 py-4 sm:py-6">
        {/* شريط قائمة المفضلات مع الرسوم البيانية المصغرة (24H Sparklines) */}
        <div className="mb-4 sm:mb-5">
          <FavoritesWatchlistBar
            favorites={favorites}
            currentSymbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            onToggleFavorite={handleToggleFavoriteSymbol}
            onOpenFullWatchlist={() => setIsWatchlistModalOpen(true)}
          />
        </div>
        {activeTab === 'brain' ? (
          <BrainCommandCenter
            currentSymbol={symbol}
            coinDetail={coinDetail}
            derivatives={derivatives}
            fearGreed={fearGreed}
            onSelectSymbol={handleSelectSymbol}
            onOpenPaperModal={() => setIsPaperTradingOpen(true)}
          />
        ) : isLoading && !coinDetail ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-slate-900/60 rounded-2xl border border-slate-800" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-[550px] bg-slate-900/60 rounded-2xl border border-slate-800" />
              <div className="lg:col-span-5 h-[550px] bg-slate-900/60 rounded-2xl border border-slate-800" />
            </div>
          </div>
        ) : coinDetail && analysisResult ? (
          <div className="space-y-4 sm:space-y-6">
            {/* أ) بطاقة العملة (Hero Coin Card) */}
            <HeroCoinCard
              coin={coinDetail}
              analysis={analysisResult}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              currency={currency}
              onOpenUsdtCalc={() => setIsUsdtCalcOpen(true)}
              onOpenPdfReport={handlePrint}
              onOpenShareCard={() => setIsShareCardOpen(true)}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              onOpenTradingAgents={() => setIsTradingAgentsOpen(true)}
            />

            {/* بطاقة التوجيه السريع للعقل المدبر للتداول */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm">العقل المدبر للتداول (Trading Brain Autopilot)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      تداول ورقي محاكى 100% (Paper Only)
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    المدير الآلي لزياد: يدمج المؤشرات الفنية، التوافق الزمني، المشتقات، والأساسيات، مع قواعد إدارة المخاطر وسقف الخسارة اليومي
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleTabChange('brain')}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5"
              >
                <span>فتح غرفة قيادة العقل المدبر</span>
                <span>←</span>
              </button>
            </div>

            {/* بطاقة ملخص الإشارات المئوي (Signal Score Engine) */}
            {signalScoreResult && (
              <SignalScoreCard
                scoreResult={signalScoreResult}
                symbol={symbol}
                weights={signalWeights}
                onSaveWeights={handleSaveSignalWeights}
                onOpenBacktest={() => setIsBacktestOpen(true)}
              />
            )}

            {/* بطاقة جودة التنفيذ والسيولة (Execution & Liquidity Quality) */}
            <ExecutionQualityCard
              symbol={symbol}
              currentPrice={coinDetail.current_price}
              currency={currency}
              onOpenDetailedModal={() => setIsExecutionModalOpen(true)}
              onOpenChecklistWithGate={() => setIsJournalOpen(true)}
            />

            {/* شارة جودة الأساسيات المعزولة (منفصلة تماماً ولا تؤثر في أي حساب) */}
            <div className="flex items-center justify-between px-1 py-0.5 text-xs">
              <FundamentalBadge
                status={symbol === 'BTC' ? 'out_of_scope' : 'not_evaluated'}
              />
              <button
                type="button"
                onClick={() => setIsFundamentalsOpen(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>فتح وحدة تقييم الأساسيات (Fundamental Screener)</span>
                <span>←</span>
              </button>
            </div>

            {/* ب) شريط الإحصائيات السريعة (4 بطاقات) */}
            <QuickStatsRibbon
              coin={coinDetail}
              analysis={analysisResult}
              currency={currency}
            />

            {/* شريط حساب أسعار USDT اللحظي والتفاعلي */}
            <div className="card-glow rounded-xl p-3 sm:p-3.5 bg-gradient-to-r from-emerald-950/30 via-slate-900/70 to-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>حساب السعر بـ USDT:</span>
                    <span className="font-mono text-emerald-300 font-black text-sm">
                      1 {coinDetail.symbol} = {coinDetail.current_price < 1 ? coinDetail.current_price.toFixed(6) : coinDetail.current_price.toFixed(2)} USDT
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                      زوج Binance: {coinDetail.symbol}USDT
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    التحويل الفوري لأي كمية وحساب العوائد والأهداف بالتيثر (USDT)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                  <span>100 {coinDetail.symbol} = {(100 * coinDetail.current_price).toFixed(2)} USDT</span>
                  <span className="text-slate-600">|</span>
                  <span>100 USDT = {(100 / (coinDetail.current_price || 1)).toFixed(1)} {coinDetail.symbol}</span>
                </div>

                <button
                  onClick={() => setIsUsdtCalcOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فتح حاسبة أسعار USDT</span>
                </button>
              </div>
            </div>

            {/* Professional Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Right Column (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6 order-1 lg:order-2">
                <CryptoDataGrid
                  coin={coinDetail}
                  fearGreed={fearGreed}
                  analysis={analysisResult}
                  currency={currency}
                />

                <div id="fear-greed-section">
                  <FearAndGreedPanel
                    data={fearGreed}
                    onRefresh={handleRefreshFearGreed}
                    isRefreshing={isRefreshingFearGreed}
                  />
                </div>

                <CommunityAndConsensus
                  coin={coinDetail}
                  analysis={analysisResult}
                />

                <SummaryCard analysis={analysisResult} />

                <AiAnalysisCard
                  coin={coinDetail}
                  analysis={analysisResult}
                  fearGreed={fearGreed}
                />
              </div>

              {/* Left Column (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 order-2 lg:order-1">
                <CandlestickChart
                  klines={klines}
                  currentPrice={coinDetail.current_price}
                  analysis={analysisResult}
                  symbol={symbol}
                  currency={currency}
                  timeframe={timeframe}
                  onChangeTimeframe={setTimeframe}
                />

                <SmcOrderBlockCard
                  symbol={symbol}
                  klines={klines}
                  currentPrice={coinDetail.current_price}
                  currency={currency}
                  onOpenDcaSimulator={() => setIsSmartDcaOpen(true)}
                  onOpenStressTest={() => setIsStressTestOpen(true)}
                />

                <VolumeAndMomentum analysis={analysisResult} />

                <MultiTimeframeCard
                  currentTrend={analysisResult.trend}
                  currentRsi={analysisResult.rsi14}
                />

                {derivatives && (
                  <DerivativesCard derivatives={derivatives} symbol={symbol} />
                )}

                <div id="correlation-section">
                  <CorrelationHeatmap currentSymbol={symbol} />
                </div>

                <NewsAndSentiment symbol={symbol} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            تعذر تحميل بيانات العملة، يرجى المحاولة مع رمز آخر مثل BTC أو ETH.
          </div>
        )}
      </main>

      <FooterStatusRibbon onOpenErrorModal={handleOpenErrorModal} />

      <footer className="border-t border-emerald-950/80 bg-[#040806] py-5 px-4 text-xs text-slate-400">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-slate-300">
              للتثقيف فقط، وليست توصية شراء أو بيع. التداول ينطوي على مخاطر خسارة رأس المال.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>آخر تحديث: {lastUpdated}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                (تحديث تلقائي خلال {nextRefreshSeconds} ثانية)
              </span>
            </div>

            <button
              onClick={() => loadCoinData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors font-medium text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث يدوي</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
              title="طباعة / تصدير تقرير PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>تصدير PDF</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Feature Modals */}
      {isDisclaimerOpen && (
        <LegalDisclaimerModal
          isOpen={isDisclaimerOpen}
          onClose={() => setIsDisclaimerOpen(false)}
          onAccept={handleAcceptDisclaimer}
        />
      )}

      {isUsdtCalcOpen && coinDetail && (
        <UsdtCalculatorModal
          isOpen={isUsdtCalcOpen}
          onClose={() => setIsUsdtCalcOpen(false)}
          coin={coinDetail}
          analysis={analysisResult}
        />
      )}

      {isCalculatorOpen && coinDetail && analysisResult && (
        <RiskCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          coin={coinDetail}
          analysis={analysisResult}
          currency={currency}
        />
      )}

      {isScreenerOpen && (
        <ScreenerModal
          isOpen={isScreenerOpen}
          onClose={() => setIsScreenerOpen(false)}
          onSelectCoin={handleSelectSymbol}
          currency={currency}
        />
      )}

      {isPortfolioOpen && (
        <PortfolioTracker
          isOpen={isPortfolioOpen}
          onClose={() => setIsPortfolioOpen(false)}
          currentSymbol={symbol}
          currentPrice={coinDetail?.current_price || 0}
          currency={currency}
        />
      )}

      {isAlertsOpen && (
        <SmartAlertsModal
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          currentSymbol={symbol}
          currentPrice={coinDetail?.current_price || 0}
        />
      )}

      {isBacktestOpen && (
        <BacktestingModal
          isOpen={isBacktestOpen}
          onClose={() => setIsBacktestOpen(false)}
          klines={klines}
          symbol={symbol}
        />
      )}

      {isErrorLogOpen && (
        <ErrorLogModal
          isOpen={isErrorLogOpen}
          onClose={() => setIsErrorLogOpen(false)}
          defaultTab={errorLogDefaultTab}
        />
      )}

      {isReportModalOpen && coinDetail && analysisResult && (
        <ComprehensiveReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          coin={coinDetail}
          analysis={analysisResult}
          klines={klines}
          fearGreed={fearGreed}
          derivatives={derivatives}
          currency={currency}
          timeframe={timeframe}
        />
      )}

      {/* Trading Journal Modal */}
      {isJournalOpen && (
        <TradingJournalModal
          isOpen={isJournalOpen}
          onClose={() => setIsJournalOpen(false)}
          currentSymbol={symbol}
          currentPrice={coinDetail?.current_price || 1}
          currency={currency}
        />
      )}

      {/* Paper Trading Simulation Modal */}
      {isPaperTradingOpen && (
        <PaperTradingModal
          isOpen={isPaperTradingOpen}
          onClose={() => setIsPaperTradingOpen(false)}
          currentSymbol={symbol}
          currentPrice={coinDetail?.current_price || 1}
          currency={currency}
        />
      )}

      {/* AI Chart Vision Scanner Modal */}
      {isChartVisionOpen && (
        <ChartVisionModal
          isOpen={isChartVisionOpen}
          onClose={() => setIsChartVisionOpen(false)}
          currentSymbol={symbol}
        />
      )}

      {/* Pro Derivatives & Liquidity Depth Modal */}
      {isDerivativesProOpen && (
        <DerivativesLiquidityModal
          isOpen={isDerivativesProOpen}
          onClose={() => setIsDerivativesProOpen(false)}
          symbol={symbol}
          currentPrice={coinDetail?.current_price || 1}
        />
      )}

      {/* Market Heatmap & Sectors Overview Modal */}
      {isHeatmapOpen && (
        <MarketOverviewModal
          isOpen={isHeatmapOpen}
          onClose={() => setIsHeatmapOpen(false)}
          onSelectCoin={handleSelectSymbol}
          currency={currency}
        />
      )}

      {/* Whale Alerts & Crypto Events Calendar Modal */}
      {isWhaleCalendarOpen && (
        <WhaleCalendarModal
          isOpen={isWhaleCalendarOpen}
          onClose={() => setIsWhaleCalendarOpen(false)}
          currentSymbol={symbol}
        />
      )}

      {/* Social Media Shareable Analysis Card Modal */}
      {isShareCardOpen && coinDetail && analysisResult && (
        <ShareAnalysisCardModal
          isOpen={isShareCardOpen}
          onClose={() => setIsShareCardOpen(false)}
          coin={coinDetail}
          analysis={analysisResult}
          fearGreed={fearGreed}
          currency={currency}
        />
      )}

      {/* Execution & Liquidity Terminal Modal */}
      {isExecutionModalOpen && (
        <ExecutionLiquidityModal
          isOpen={isExecutionModalOpen}
          onClose={() => setIsExecutionModalOpen(false)}
          symbol={symbol}
          currentPrice={coinDetail?.current_price || 1}
          klines={klines}
          currency={currency}
        />
      )}

      {/* Statistical Evidence & Strategy Gatekeeper Modal */}
      {isEvidenceGateOpen && (
        <EvidenceGatekeeperModal
          isOpen={isEvidenceGateOpen}
          onClose={() => setIsEvidenceGateOpen(false)}
          evidence={currentEvidence}
        />
      )}

      {/* One-Click Full Analysis Pipeline Modal */}
      {isOneClickAnalysisOpen && (
        <OneClickAnalysisModal
          isOpen={isOneClickAnalysisOpen}
          onClose={() => setIsOneClickAnalysisOpen(false)}
          symbol={symbol}
          klines={klines}
          onOpenGateModal={() => setIsEvidenceGateOpen(true)}
        />
      )}

      {/* Automated Execution Engine & Risk Dashboard Modal */}
      {isLiveExecutionOpen && (
        <LiveExecutionDashboard
          isOpen={isLiveExecutionOpen}
          onClose={() => setIsLiveExecutionOpen(false)}
        />
      )}

      {/* Isolated Fundamental Screener Modal */}
      {isFundamentalsOpen && (
        <FundamentalScreenerModal
          isOpen={isFundamentalsOpen}
          onClose={() => setIsFundamentalsOpen(false)}
          currentSymbol={symbol}
        />
      )}

      {/* Favorites Watchlist Modal (Full Overview with 24H Sparklines) */}
      {isWatchlistModalOpen && (
        <FavoritesWatchlistModal
          isOpen={isWatchlistModalOpen}
          onClose={() => setIsWatchlistModalOpen(false)}
          favorites={favorites}
          currentSymbol={symbol}
          onSelectSymbol={handleSelectSymbol}
          onToggleFavorite={handleToggleFavoriteSymbol}
          currency={currency}
        />
      )}

      {/* Smart RSI-Weighted DCA Simulator Modal */}
      {isSmartDcaOpen && (
        <SmartDcaSimulatorModal
          isOpen={isSmartDcaOpen}
          onClose={() => setIsSmartDcaOpen(false)}
          symbol={symbol}
          klines={klines}
          currentPrice={coinDetail?.current_price || 0}
          currency={currency}
        />
      )}

      {/* Portfolio & Position Stress Test Simulator Modal */}
      {isStressTestOpen && (
        <StressTestSimulatorModal
          isOpen={isStressTestOpen}
          onClose={() => setIsStressTestOpen(false)}
          currentSymbol={symbol}
          currentPrice={coinDetail?.current_price || 0}
        />
      )}

      {/* Global Command Palette Modal (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectCoin={handleSelectSymbol}
          onNavigateTool={handleTabChange}
        />
      )}

      {/* TauricResearch / TradingAgents Multi-Agent Trading Firm Modal */}
      {isTradingAgentsOpen && coinDetail && analysisResult && (
        <TradingAgentsModal
          isOpen={isTradingAgentsOpen}
          onClose={() => setIsTradingAgentsOpen(false)}
          coin={coinDetail}
          analysis={analysisResult}
          fearGreed={fearGreed as any}
          derivatives={derivatives}
        />
      )}
    </div>
  );
}
