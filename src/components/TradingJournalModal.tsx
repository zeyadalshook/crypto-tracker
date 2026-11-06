import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Smile,
  Frown,
  Meh,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  RefreshCw,
  Search,
  Filter,
  Brain,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
  Lock,
  Unlock,
  Star,
  FileText,
  Printer,
  ChevronDown,
  Tag,
  Zap,
  Info,
  Check,
} from 'lucide-react';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';
import {
  DisciplineSettings,
  JournalTradeExtended,
  DailyDisciplineState,
  WeeklyReviewData,
  AIJournalAnalysisResult,
} from '../types/discipline';
import {
  getDisciplineSettings,
  saveDisciplineSettings,
  getJournalTrades,
  saveJournalTrades,
  computeDailyDisciplineState,
  computeAdvancedJournalStats,
  getTodayDateString,
  getNextMidnightTimestamp,
} from '../utils/disciplineStorage';
import { PreTradeChecklistModal } from './PreTradeChecklistModal';
import { DailyLockoutOverlay } from './DailyLockoutOverlay';
import { DisciplineSettingsModal } from './DisciplineSettingsModal';
import { CloseTradeModal } from './CloseTradeModal';
import { TradeDetailModal } from './TradeDetailModal';

interface TradingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  currency: Currency;
}

export const TradingJournalModal: React.FC<TradingJournalModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  currency,
}) => {
  if (!isOpen) return null;

  // Active Main View Tab
  const [activeTab, setActiveTab] = useState<'trades' | 'analytics' | 'weekly_review' | 'ai_coach'>('trades');

  // Persistence State
  const [settings, setSettings] = useState<DisciplineSettings>(() => getDisciplineSettings());
  const [trades, setTrades] = useState<JournalTradeExtended[]>(() => getJournalTrades());

  // Sub-Modals Visibility
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLockoutModalOpen, setIsLockoutModalOpen] = useState(false);
  const [closingTrade, setClosingTrade] = useState<JournalTradeExtended | null>(null);
  const [inspectingTrade, setInspectingTrade] = useState<JournalTradeExtended | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'long' | 'short'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'followed' | 'violated'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'wins' | 'losses'>('all');
  const [filterEmotion, setFilterEmotion] = useState<'all' | 'calm' | 'excited' | 'anxious' | 'revenge' | 'fatigued'>('all');

  // AI Journal Coach State
  const [aiAnalysis, setAiAnalysis] = useState<AIJournalAnalysisResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ruleAddedSuccess, setRuleAddedSuccess] = useState<string | null>(null);

  // Weekly Review State
  const [weeklyGoal, setNextWeekGoal] = useState('الالتزام التام بوقف الخسارة وعدم الدخول إلا بصفقات R:R > 1:1.5');
  const [bestDecision, setBestDecision] = useState('الصبر على إغلاق شمعة التأكيد وعدم مطاردة السعر المرتفع.');
  const [mistakeAvoid, setMistakeAvoid] = useState('التداول الانتقامي بعد خسارة الصباح.');
  const [reviewSavedSuccess, setReviewSavedSuccess] = useState(false);

  // Daily Discipline State computation
  const dailyState = useMemo(() => {
    return computeDailyDisciplineState(trades, settings);
  }, [trades, settings]);

  // Advanced Stats computation
  const advancedStats = useMemo(() => {
    return computeAdvancedJournalStats(trades);
  }, [trades]);

  // Open trades vs Closed trades
  const openPositions = useMemo(() => {
    return trades.filter((t) => t.status === 'open');
  }, [trades]);

  // Auto trigger Lockout Modal if 100% loss limit is reached and not already dismissed
  useEffect(() => {
    if (dailyState.isLockedOut && !settings.lockoutReflection) {
      setIsLockoutModalOpen(true);
    }
  }, [dailyState.isLockedOut, settings.lockoutReflection]);

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Search query (symbol or reason or tag)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSym = t.symbol.toLowerCase().includes(q);
        const matchReason = t.entryReason.toLowerCase().includes(q);
        const matchTag = t.tags?.some((tg) => tg.toLowerCase().includes(q));
        if (!matchSym && !matchReason && !matchTag) return false;
      }

      // Filter direction
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Filter Plan
      if (filterPlan === 'followed' && !t.followedPlan) return false;
      if (filterPlan === 'violated' && t.followedPlan) return false;

      // Filter Status / Win / Loss
      if (filterStatus === 'open' && t.status !== 'open') return false;
      if (filterStatus === 'closed' && t.status !== 'closed') return false;
      if (filterStatus === 'wins' && (t.status !== 'closed' || t.pnl <= 0)) return false;
      if (filterStatus === 'losses' && (t.status !== 'closed' || t.pnl >= 0)) return false;

      // Filter Emotion
      if (filterEmotion !== 'all' && t.emotionBeforeTrade !== filterEmotion) return false;

      return true;
    });
  }, [trades, searchQuery, filterType, filterPlan, filterStatus, filterEmotion]);

  // Handle New Trade Confirmed from PreTradeChecklistModal
  const handleConfirmNewTrade = (
    newTradeData: Omit<JournalTradeExtended, 'id' | 'pnl' | 'pnlPercent' | 'status'>
  ) => {
    const newTrade: JournalTradeExtended = {
      ...newTradeData,
      id: `tr-${Date.now()}`,
      status: 'open',
      pnl: 0,
      pnlPercent: 0,
    };

    const updated = [newTrade, ...trades];
    setTrades(updated);
    saveJournalTrades(updated);
  };

  // Handle Trade Close Confirmed from CloseTradeModal
  const handleConfirmCloseTrade = (
    tradeId: string,
    exitPrice: number,
    followedPlan: boolean,
    executionRating: number,
    exitNotes: string,
    exitScreenshotUrl?: string
  ) => {
    const updated = trades.map((t) => {
      if (t.id !== tradeId) return t;

      const isLong = t.type === 'long';
      const rawPnl = isLong
        ? t.quantity * (exitPrice - t.entryPrice)
        : t.quantity * (t.entryPrice - exitPrice);
      const pnlPct =
        t.entryPrice > 0
          ? (isLong ? (exitPrice - t.entryPrice) / t.entryPrice : (t.entryPrice - exitPrice) / t.entryPrice) * 100
          : 0;

      const riskAmt = t.riskAmountUSDT || Math.abs(t.entryPrice - t.stopLoss) * t.quantity || 1;
      const rMultiple = Math.round((rawPnl / riskAmt) * 100) / 100;

      return {
        ...t,
        status: 'closed' as const,
        exitPrice,
        exitDate: new Date().toISOString(),
        followedPlan,
        executionRating,
        exitNotes,
        exitScreenshotUrl,
        pnl: Math.round(rawPnl * 100) / 100,
        pnlPercent: Math.round(pnlPct * 100) / 100,
        resultInR: rMultiple,
      };
    });

    setTrades(updated);
    saveJournalTrades(updated);
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    const updated = trades.filter((t) => t.id !== id);
    setTrades(updated);
    saveJournalTrades(updated);
  };

  // Save Settings from modal
  const handleSaveSettings = (newSettings: DisciplineSettings) => {
    setSettings(newSettings);
    saveDisciplineSettings(newSettings);
  };

  // Trigger Pro AI Journal Analysis
  const handleAnalyzeWithAI = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const resp = await fetch('/api/ai/analyze-journal-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades,
          stats: advancedStats,
          disciplineSettings: settings,
        }),
      });

      if (!resp.ok) {
        throw new Error('فشل استدعاء تحليل الذكاء الاصطناعي');
      }

      const data: AIJournalAnalysisResult = await resp.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error('AI Journal analysis failed:', err);
      setAiError('حدث خطأ في الاتصال بالنموذج الذكي. تم استخدام المحلل الإحصائي المحلي.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Convert AI suggested rule to active Pre-Trade constraint
  const handleConvertRuleToConstraint = (rule: { id: string; ruleText: string; category: string; reason?: string }) => {
    const newRule = {
      id: rule.id || `rule_${Date.now()}`,
      ruleText: rule.ruleText,
      category: rule.category || 'مستنبطة من الذكاء الاصطناعي',
      reason: rule.reason,
      enabled: true,
    };

    const exists = settings.customRules.some((r) => r.ruleText === rule.ruleText);
    if (!exists) {
      const updatedSettings = {
        ...settings,
        customRules: [...settings.customRules, newRule],
      };
      setSettings(updatedSettings);
      saveDisciplineSettings(updatedSettings);
      setRuleAddedSuccess(`✓ تمت إضافة القاعدة بنجاح إلى قائمة الفحص: "${rule.ruleText}"`);
      setTimeout(() => setRuleAddedSuccess(null), 4000);
    } else {
      setRuleAddedSuccess(`القاعدة موجودة بالفعل في قائمة الفحص.`);
      setTimeout(() => setRuleAddedSuccess(null), 3000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'المعرف',
      'الرمز',
      'الاتجاه',
      'سعر الدخول',
      'سعر الخروج',
      'الكمية',
      'وقف الخسارة',
      'الهدف الأول',
      'الربح بالدولار',
      'الربح بالنسبة %',
      'مضاعف المخاطرة R',
      'الحالة',
      'الالتزام بالخطة',
      'تقييم التنفيذ',
      'تاريخ الدخول',
      'تاريخ الخروج',
      'السبب',
    ];

    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.type,
      t.entryPrice,
      t.exitPrice || '',
      t.quantity,
      t.stopLoss,
      t.takeProfit1,
      t.pnl,
      t.pnlPercent + '%',
      t.resultInR !== undefined ? t.resultInR + 'R' : '',
      t.status,
      t.followedPlan ? 'نعم' : 'لا',
      t.executionRating || '',
      t.entryDate,
      t.exitDate || '',
      `"${(t.entryReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_journal_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Backup JSON
  const handleExportJSON = () => {
    const backupData = {
      settings,
      trades,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.trades && Array.isArray(parsed.trades)) {
          setTrades(parsed.trades);
          saveJournalTrades(parsed.trades);
        }
        if (parsed.settings) {
          setSettings(parsed.settings);
          saveDisciplineSettings(parsed.settings);
        }
        alert('تم استيراد النسخة الاحتياطية بنجاح!');
      } catch {
        alert('الملف غير صالح.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-6xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  دفتر التداول ووحدة الانضباط السلوكي (Discipline & Trading Journal)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                  {trades.length} صفقات
                </span>
                {advancedStats.isSmallSample && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    عينة صغيرة (&lt;30 صفقة)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                قائمة فحص إلزامية قبل كل صفقة، قفل الخسارة اليومية السلوكي، وتحليل الأنماط بالذكاء الاصطناعي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>إعدادات الانضباط</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Discipline Dashboard Ribbon: Loss Meter, Discipline Score, and Lock Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* KPI 1: Discipline Score % */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">نسبة الانضباط بالخطة:</span>
              <span
                className={`text-xl font-black font-mono mt-0.5 block ${
                  advancedStats.disciplineScore >= 75
                    ? 'text-emerald-400'
                    : advancedStats.disciplineScore >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {advancedStats.disciplineScore}%
              </span>
              <span className="text-[10px] text-slate-500">
                المؤشر الرئيسي للنجاح طويل المدى
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2: Daily Loss Meter with 70% threshold */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">استهلاك حد الخسارة اليومي:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  dailyState.dailyLossPercentReached >= 70 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {dailyState.dailyLossPercentReached}%
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  dailyState.dailyLossPercentReached >= 100
                    ? 'bg-rose-500'
                    : dailyState.dailyLossPercentReached >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, dailyState.dailyLossPercentReached)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>خسارة اليوم: ${Math.abs(dailyState.todayTotalPnL).toFixed(1)}</span>
              <span>الحد: ${dailyState.todayLossLimitDollars} ({settings.dailyLossLimitPct}%)</span>
            </div>
          </div>

          {/* KPI 3: Expected Value in R (R-Expectancy) */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">التوقع الرياضي (R-Expectancy):</span>
              <span
                className={`text-xl font-black font-mono mt-0.5 block ${
                  advancedStats.rExpectancy > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {advancedStats.rExpectancy > 0 ? '+' : ''}
                {advancedStats.rExpectancy}R
              </span>
              <span className="text-[10px] text-slate-500">
                الربح المتوقع لكل صفقة بوحدات المخاطرة
              </span>
            </div>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono font-bold text-xs">
              R:R
            </div>
          </div>

          {/* KPI 4: Lockout Action Button */}
          <div className="flex flex-col justify-center gap-1.5">
            {dailyState.isLockedOut ? (
              <button
                onClick={() => setIsLockoutModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600/30 border border-rose-500/60 text-rose-300 font-black flex items-center justify-center gap-2 animate-pulse hover:bg-rose-600/40"
              >
                <Lock className="w-4 h-4" />
                <span>القفل اليومي نشط (عرض العداد)</span>
              </button>
            ) : dailyState.isNearLimitWarning ? (
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>اقتربت من حد الخسارة (تجاوزت 70%)</span>
              </div>
            ) : (
              <button
                onClick={() => setIsChecklistOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>صفقة جديدة (قائمة الفحص)</span>
              </button>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>مراكز مفتوحة: {openPositions.length} / {settings.maxOpenPositions}</span>
              <span>رأس المال: ${settings.capital.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'trades'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            سجل الصفقات ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            لوحة الإحصاءات والأنماط
          </button>
          <button
            onClick={() => setActiveTab('weekly_review')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'weekly_review'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المراجعة الأسبوعية والروتين
          </button>
          <button
            onClick={() => setActiveTab('ai_coach')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ai_coach'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>تحليل الأنماط بالذكاء الاصطناعي</span>
          </button>
        </div>

        {/* TAB 1: Trades List & Open Positions */}
        {activeTab === 'trades' && (
          <div className="space-y-4">
            {/* Open Positions Section (with Close Action) */}
            {openPositions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    المراكز المفتوحة حالياً ({openPositions.length}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    * القفل لا يمنع إغلاق الصفقات أبداً
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {openPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono">{pos.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              pos.type === 'long'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {pos.type === 'long' ? 'شراء' : 'بيع'}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">${pos.entryPrice}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
                        <span>الوقف: ${pos.stopLoss}</span>
                        <span>الهدف: ${pos.takeProfit1}</span>
                      </div>

                      <button
                        onClick={() => setClosingTrade(pos)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-colors text-xs"
                      >
                        إغلاق المركز وتسجيل التنفيذ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search, Filters, and Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative min-w-[160px] flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالرمز أو السبب أو الوسم..."
                    className="w-full pr-8 pl-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                >
                  <option value="all">كل الاتجاهات</option>
                  <option value="long">شراء فقط (Long)</option>
                  <option value="short">بيع فقط (Short)</option>
                </select>

                <select
                  value={filterPlan}
                  onChange={(e: any) => setFilterPlan(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                >
                  <option value="all">كل الصفقات</option>
                  <option value="followed">ملتزمة بالخطة ✓</option>
                  <option value="violated">كسرت الخطة ❌</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e: any) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="wins">الرابحة فقط</option>
                  <option value="losses">الخاسرة فقط</option>
                  <option value="open">المفتوحة</option>
                  <option value="closed">المغلقة</option>
                </select>

                <select
                  value={filterEmotion}
                  onChange={(e: any) => setFilterEmotion(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                >
                  <option value="all">كل الحالات النفسية</option>
                  <option value="calm">هادئ</option>
                  <option value="excited">متحمس</option>
                  <option value="anxious">خائف</option>
                  <option value="revenge">انتقامي</option>
                  <option value="fatigued">متعب</option>
                </select>
              </div>

              {/* Import / Export Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px]"
                  title="تصدير إلى ملف CSV"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px]"
                  title="تصدير نسخة احتياطية JSON"
                >
                  <Download className="w-3 h-3 text-sky-400" />
                  <span>نسخة JSON</span>
                </button>
                <label
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
                  title="استيراد نسخة احتياطية JSON"
                >
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>استيراد</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[460px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[11px] sticky top-0 font-sans z-10">
                  <tr>
                    <th className="p-3">الرمز والاتجاه</th>
                    <th className="p-3">الدخول / الخروج</th>
                    <th className="p-3">الربح $ (%)</th>
                    <th className="p-3">مضاعف R</th>
                    <th className="p-3">الالتزام بالخطة</th>
                    <th className="p-3">جودة التنفيذ</th>
                    <th className="p-3">الحالة النفسية</th>
                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTrades.length > 0 ? (
                    filteredTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                        {/* Symbol & Type */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspectingTrade(t)}
                              className="font-bold text-white hover:text-emerald-400 underline underline-offset-2"
                            >
                              {t.symbol}
                            </button>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                t.type === 'long'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {t.type === 'long' ? 'شراء' : 'بيع'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block font-sans mt-0.5">
                            {new Date(t.entryDate).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Prices */}
                        <td className="p-3 text-slate-300">
                          <div>${t.entryPrice}</div>
                          <div className="text-[10px] text-slate-500">
                            {t.status === 'open' ? 'مفتوح' : `$${t.exitPrice}`}
                          </div>
                        </td>

                        {/* PnL */}
                        <td className="p-3">
                          {t.status === 'open' ? (
                            <span className="text-sky-400 font-sans">قيد التداول</span>
                          ) : (
                            <div>
                              <span
                                className={`font-bold block ${
                                  t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {t.pnl >= 0 ? '+' : ''}${t.pnl}
                              </span>
                              <span
                                className={`text-[10px] block ${
                                  t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent}%
                              </span>
                            </div>
                          )}
                        </td>

                        {/* R Multiple */}
                        <td className="p-3">
                          {t.resultInR !== undefined ? (
                            <span
                              className={`font-black font-mono ${
                                t.resultInR >= 0 ? 'text-emerald-300' : 'text-rose-300'
                              }`}
                            >
                              {t.resultInR >= 0 ? '+' : ''}{t.resultInR}R
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Followed Plan */}
                        <td className="p-3 font-sans">
                          {t.followedPlan ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ملتزم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              مخالف للخطة
                            </span>
                          )}
                        </td>

                        {/* Execution Rating */}
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= (t.executionRating || 5)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                        </td>

                        {/* Emotion */}
                        <td className="p-3 font-sans text-[11px] text-slate-300">
                          {t.emotionBeforeTrade === 'calm'
                            ? 'هادئ 🧘'
                            : t.emotionBeforeTrade === 'excited'
                            ? 'متحمس 🔥'
                            : t.emotionBeforeTrade === 'anxious'
                            ? 'خائف 😰'
                            : t.emotionBeforeTrade === 'revenge'
                            ? 'انتقامي ⚡'
                            : 'متعب 🥱'}
                        </td>

                        {/* Actions */}
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setInspectingTrade(t)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                              title="عرض التفاصيل"
                            >
                              تفاصيل
                            </button>
                            {t.status === 'open' && (
                              <button
                                onClick={() => setClosingTrade(t)}
                                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold"
                              >
                                إغلاق
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400"
                              title="حذف الصفقة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        لا توجد صفقات تطابق البحث. اضغط على "صفقة جديدة" للبدء في التسجيل.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Advanced Analytics & Behavioral Heatmaps */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 text-xs">
            {/* Direct Plan Impact Comparison: How much did breaking the plan cost you? */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                  مقارنة حاسمة: أثر الالتزام بالخطة على أرباح محفظتك
                </span>
                <p className="text-slate-300 text-xs">
                  مقارنة مباشرة بالأرقام توضح الفارق الشاسع بين الصفقات الملتزمة بالخطة والصفقات المخالفة:
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-slate-400 block">تكلفة الصفقات المخالفة</span>
                  <span
                    className={`text-lg font-black font-mono block ${
                      advancedStats.planTradesCost <= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    ${advancedStats.planTradesCost}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {advancedStats.planTradesCost < 0
                      ? 'مبلغ خسرته بسبب كسر الخطة!'
                      : 'أرباح الصفقات غير المخططة'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">نسبة الانضباط الإجمالية</span>
                  <span className="text-lg font-black font-mono text-emerald-400 block">
                    {advancedStats.disciplineScore}%
                  </span>
                  <span className="text-[10px] text-slate-500">من إجمالي الصفقات</span>
                </div>
              </div>
            </div>

            {/* Core Quantitative Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">نسبة الفوز (Win Rate)</span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">
                  {advancedStats.winRate}%
                </span>
                <span className="text-[10px] text-slate-500">
                  متوسط الربح: ${advancedStats.avgWin}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">عامل الربح (Profit Factor)</span>
                <span className="text-lg font-bold font-mono text-emerald-300 mt-1 block">
                  {advancedStats.profitFactor}
                </span>
                <span className="text-[10px] text-slate-500">
                  متوسط الخسارة: -${advancedStats.avgLoss}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">أقصى تراجع (Max Drawdown)</span>
                <span className="text-lg font-bold font-mono text-rose-400 mt-1 block">
                  -{advancedStats.maxDrawdown}%
                </span>
                <span className="text-[10px] text-slate-500">أكبر هبوط من القمة</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">أطول سلسلة خسائر متتالية</span>
                <span className="text-lg font-bold font-mono text-rose-400 mt-1 block">
                  {advancedStats.maxConsecutiveLosses} صفقات
                </span>
                <span className="text-[10px] text-slate-500">
                  أطول سلسلة ربح: {advancedStats.maxConsecutiveWins}
                </span>
              </div>
            </div>

            {/* Daily Calendar Heatmap (Green/Red Day Tiles) */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <span className="font-bold text-white block">
                التقويم الحراري اليومي لنتائج التداول (Daily PnL Heatmap):
              </span>
              <p className="text-[11px] text-slate-400">
                مربعات الأيام توضح الأيام الخضراء والصفراء والحمراء للتأكد من وتيرة الأداء واستقرار العوائد:
              </p>

              {/* Mock Calendar Grid for past 28 days */}
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
                {Array.from({ length: 28 }).map((_, idx) => {
                  const dayOffset = 27 - idx;
                  const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
                  const dateStr = date.toISOString().slice(0, 10);
                  const dayTrades = trades.filter((t) => (t.exitDate || t.entryDate || '').slice(0, 10) === dateStr);
                  const pnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

                  const bg =
                    dayTrades.length === 0
                      ? 'bg-slate-950/60 border-slate-900 text-slate-600'
                      : pnl > 0
                      ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-500/30 border-rose-500/50 text-rose-300';

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center font-mono text-[10px] flex flex-col justify-between h-14 ${bg}`}
                      title={`${dateStr}: ${pnl !== 0 ? (pnl > 0 ? '+' : '') + pnl + '$' : 'بدون تداول'}`}
                    >
                      <span className="text-slate-400 text-[9px]">{date.getDate()}</span>
                      <span className="font-bold">
                        {dayTrades.length > 0 ? (pnl >= 0 ? `+${pnl}$` : `${pnl}$`) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Weekly & Monthly Routine */}
        {activeTab === 'weekly_review' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm">
                  المراجعة الأسبوعية الذاتية (Weekly Reflection Routine)
                </strong>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  الانضباط الحقيقي يُبنى بالمراجعة الدورية الصادقة. خصص 10 دقائق أسبوعياً لتفريغ الدروس المستفادة وتثبيت الأنماط الرابحة.
                </p>
              </div>
            </div>

            {/* Weekly Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">صافي أرباح الأسبوع</span>
                <span
                  className={`text-lg font-bold font-mono mt-1 block ${
                    advancedStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${advancedStats.totalPnL}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">نسبة الانضباط</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                  {advancedStats.disciplineScore}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">إجمالي الصفقات</span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">
                  {trades.length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">عامل الربح الأسبوعي</span>
                <span className="text-lg font-bold font-mono text-emerald-300 mt-1 block">
                  {advancedStats.profitFactor}
                </span>
              </div>
            </div>

            {/* 2 Core Reflection Questions */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <label className="block text-emerald-300 font-bold">
                  1. ما هو أفضل قرار تداولي اتخذته هذا الأسبوع ولماذا؟
                </label>
                <textarea
                  value={bestDecision}
                  onChange={(e) => setBestDecision(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <label className="block text-rose-300 font-bold">
                  2. ما هو الخطأ التنفيذي أو السلوكي الذي لن تكرره مجدداً؟
                </label>
                <textarea
                  value={mistakeAvoid}
                  onChange={(e) => setMistakeAvoid(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-rose-500 outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <label className="block text-amber-300 font-bold">
                  3. هدف انضباطي رئيسي واحد للأسبوع القادم:
                </label>
                <input
                  type="text"
                  value={weeklyGoal}
                  onChange={(e) => setNextWeekGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {reviewSavedSuccess && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  تم حفظ المراجعة الأسبوعية بنجاح
                </span>
              )}
              <div className="flex items-center gap-2 mr-auto">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة / حفظ PDF</span>
                </button>
                <button
                  onClick={() => {
                    setReviewSavedSuccess(true);
                    setTimeout(() => setReviewSavedSuccess(false), 3000);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  حفظ المراجعة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI Pattern Recognition & Rule Converter */}
        {activeTab === 'ai_coach' && (
          <div className="space-y-4 text-xs">
            {/* AI Coach Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  تحليل الأنماط والمدرب الذكي (AI Discipline Coach)
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  يقوم النموذج بفحص سجل صفقاتك واستخراج أكبر 3 أنماط خسارة مقترنة بالأرقام الدقيقة، واقتراح 3 قواعد عملية لتحويلها فوراً إلى قيود في قائمة الفحص.
                </p>
              </div>

              <button
                onClick={handleAnalyzeWithAI}
                disabled={isLoadingAi}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 text-xs"
              >
                <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
                <span>{isLoadingAi ? 'جاري التحليل الإحصائي...' : 'حلّل دفتري بالذكاء الاصطناعي'}</span>
              </button>
            </div>

            {ruleAddedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200">
                {ruleAddedSuccess}
              </div>
            )}

            {/* AI Analysis Results Display */}
            {aiAnalysis ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 leading-relaxed">
                  <strong className="text-emerald-400 block mb-1">ملخص المدرب:</strong>
                  {aiAnalysis.summary}
                </div>

                {/* Top 3 Loss Patterns with Numerical Evidence */}
                <div className="space-y-2">
                  <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    أكبر أنماط الخسارة المرصودة (مدعمة بالأرقام الدقيقة):
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {aiAnalysis.lossPatterns?.map((pat, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-white block text-sm">{pat.title}</span>
                          <span className="text-[11px] font-mono font-bold text-rose-300 block mt-1">
                            الدليل الرقمي: {pat.evidence}
                          </span>
                          <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                            {pat.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best Conditions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    أفضل ظروف الأداء (نقاط قوتك):
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiAnalysis.bestConditions?.map((cond, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30"
                      >
                        <span className="font-bold text-emerald-300 block">{cond.title}</span>
                        <span className="text-[11px] font-mono text-emerald-400 block mt-0.5">
                          {cond.evidence}
                        </span>
                        <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">{cond.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Rules with "Convert to Pre-Trade Constraint" Button */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    قواعد عملية مقترحة للتطبيق (زر التحويل إلى قيود):
                  </h4>

                  <div className="space-y-2.5">
                    {aiAnalysis.suggestedRules?.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="space-y-0.5 flex-1">
                          <span className="font-bold text-white block text-xs">
                            {rule.ruleText}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            التصنيف: {rule.category} | {rule.reason}
                          </span>
                        </div>

                        <button
                          onClick={() => handleConvertRuleToConstraint(rule)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>حوّل إلى قيد في قائمة الفحص</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 flex flex-col items-center gap-2">
                <Brain className="w-8 h-8 text-emerald-500/50" />
                <span>اضغط على "حلّل دفتري بالذكاء الاصطناعي" لكشف الأنماط الخفية وقواعد الانضباط.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>* وحدة الانضباط السلوكي وإدارة المخاطر - بياناتك محفوظة محلياً بالكامل</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Sub-Modals */}
      {isChecklistOpen && (
        <PreTradeChecklistModal
          isOpen={isChecklistOpen}
          onClose={() => setIsChecklistOpen(false)}
          onConfirmTrade={handleConfirmNewTrade}
          currentSymbol={currentSymbol}
          currentPrice={currentPrice}
          settings={settings}
          openTrades={openPositions}
          currency={currency}
        />
      )}

      {isLockoutModalOpen && (
        <DailyLockoutOverlay
          isOpen={isLockoutModalOpen}
          onClose={() => setIsLockoutModalOpen(false)}
          state={dailyState}
          settings={settings}
          onSaveReflection={(ref) => {
            const upd = { ...settings, lockoutReflection: ref };
            setSettings(upd);
            saveDisciplineSettings(upd);
          }}
        />
      )}

      {isSettingsOpen && (
        <DisciplineSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onDataPurged={() => {
            setTrades([]);
            setSettings(getDisciplineSettings());
          }}
        />
      )}

      {closingTrade && (
        <CloseTradeModal
          isOpen={!!closingTrade}
          onClose={() => setClosingTrade(null)}
          trade={closingTrade}
          currentPrice={currentPrice}
          onConfirmClose={handleConfirmCloseTrade}
        />
      )}

      {inspectingTrade && (
        <TradeDetailModal
          isOpen={!!inspectingTrade}
          onClose={() => setInspectingTrade(null)}
          trade={inspectingTrade}
        />
      )}
    </div>
  );
};
