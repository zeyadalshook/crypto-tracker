import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Camera,
  Image as ImageIcon,
  Flame,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  DisciplineSettings,
  JournalTradeExtended,
  ChecklistResponses,
} from '../types/discipline';
import { Currency, formatCurrency } from '../utils/formatters';

interface PreTradeChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTrade: (trade: Omit<JournalTradeExtended, 'id' | 'pnl' | 'pnlPercent' | 'status'>) => void;
  currentSymbol: string;
  currentPrice: number;
  settings: DisciplineSettings;
  openTrades: JournalTradeExtended[];
  currency?: Currency;
}

export const PreTradeChecklistModal: React.FC<PreTradeChecklistModalProps> = ({
  isOpen,
  onClose,
  onConfirmTrade,
  currentSymbol,
  currentPrice,
  settings,
  openTrades,
  currency = 'USDT',
}) => {
  if (!isOpen) return null;

  // 1. Core Trade Fields
  const [symbol, setSymbol] = useState<string>(currentSymbol.toUpperCase());
  const [type, setType] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice || 100);
  const [stopLoss, setStopLoss] = useState<number>(
    currentPrice ? (type === 'long' ? Math.round(currentPrice * 0.97 * 100) / 100 : Math.round(currentPrice * 1.03 * 100) / 100) : 0
  );
  const [takeProfit1, setTakeProfit1] = useState<number>(
    currentPrice ? (type === 'long' ? Math.round(currentPrice * 1.06 * 100) / 100 : Math.round(currentPrice * 0.94 * 100) / 100) : 0
  );
  const [takeProfit2, setTakeProfit2] = useState<number>(0);
  const [entryReason, setEntryReason] = useState<string>('');
  const [emotion, setEmotion] = useState<'calm' | 'excited' | 'anxious' | 'revenge' | 'fatigued'>('calm');
  const [tagsInput, setTagsInput] = useState<string>('DayTrade, Strategy');
  const [chartScreenshotUrl, setChartScreenshotUrl] = useState<string>('');

  // 2. Mandatory Checklist Responses
  const [trendAligned1D, setTrendAligned1D] = useState<boolean>(true);
  const [noUpcomingNews24h, setNoUpcomingNews24h] = useState<boolean>(true);
  const [partOfPrePlan, setPartOfPrePlan] = useState<boolean>(true);
  const [isRevengeTrade, setIsRevengeTrade] = useState<boolean>(false);
  const [customRuleChecks, setCustomRuleChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    settings.customRules?.filter((r) => r.enabled).forEach((r) => {
      initial[r.id] = true;
    });
    return initial;
  });

  // Calculate Risk per Trade from settings
  const riskAmountDollars = useMemo(() => {
    return (settings.capital * settings.maxRiskPerTradePct) / 100;
  }, [settings.capital, settings.maxRiskPerTradePct]);

  // Risk Distance and Automated Position Size
  const riskDistance = useMemo(() => {
    if (!entryPrice || !stopLoss) return 0;
    return Math.abs(entryPrice - stopLoss);
  }, [entryPrice, stopLoss]);

  const isStopLossValid = useMemo(() => {
    if (!stopLoss || stopLoss <= 0 || !entryPrice || entryPrice <= 0) return false;
    if (type === 'long') return stopLoss < entryPrice;
    if (type === 'short') return stopLoss > entryPrice;
    return false;
  }, [type, entryPrice, stopLoss]);

  // Auto-calculated Position Size: (Risk $ / Risk Distance)
  const calculatedQuantity = useMemo(() => {
    if (!isStopLossValid || riskDistance <= 0) return 0;
    const qty = riskAmountDollars / riskDistance;
    return Math.round(qty * 1000) / 1000;
  }, [riskAmountDollars, riskDistance, isStopLossValid]);

  const totalPositionValue = useMemo(() => {
    return Math.round(calculatedQuantity * entryPrice);
  }, [calculatedQuantity, entryPrice]);

  // Risk-to-Reward (R:R) Calculation
  const rewardDistance = useMemo(() => {
    if (!takeProfit1 || !entryPrice) return 0;
    return type === 'long' ? takeProfit1 - entryPrice : entryPrice - takeProfit1;
  }, [type, entryPrice, takeProfit1]);

  const calculatedRiskReward = useMemo(() => {
    if (riskDistance <= 0 || rewardDistance <= 0) return 0;
    return Math.round((rewardDistance / riskDistance) * 100) / 100;
  }, [riskDistance, rewardDistance]);

  const isRiskRewardAcceptable = calculatedRiskReward >= settings.minRiskReward;

  // Suggest Stop Loss based on ATR (~1.8% of price)
  const handleSuggestAtrStopLoss = () => {
    const atrEst = entryPrice * 0.018; // 1.8% ATR approximation
    if (type === 'long') {
      const sl = Math.round((entryPrice - 1.5 * atrEst) * 100) / 100;
      setStopLoss(sl);
      setTakeProfit1(Math.round((entryPrice + 1.5 * atrEst * settings.minRiskReward) * 100) / 100);
    } else {
      const sl = Math.round((entryPrice + 1.5 * atrEst) * 100) / 100;
      setStopLoss(sl);
      setTakeProfit1(Math.round((entryPrice - 1.5 * atrEst * settings.minRiskReward) * 100) / 100);
    }
  };

  // Warnings Detection Engine
  const liveWarnings = useMemo(() => {
    const list: string[] = [];

    if (!trendAligned1D) {
      list.push('⚠️ تعارض مع الاتجاه الأكبر: تداول عكس اتجاه الإطار الزمني اليومي (1D) يرفع احتمالية فشل الصفقة.');
    }

    if (!noUpcomingNews24h) {
      list.push('⚠️ فلتر لا تتداول (حدث قريب): تذبذب الأخبار والبيانات الاقتصادية قد يضرب وقف الخسارة بانزلاق سعري.');
    }

    if (isRevengeTrade) {
      list.push('🚨 تحذير تداول انتقامي (Revenge Trade): الدخول لتعويض خسارة سابقة هو السبب الأول لإفلاس الحسابات. يُنصح بأخذ استراحة فوراً.');
    }

    if (emotion === 'revenge' || emotion === 'excited' || emotion === 'fatigued') {
      list.push(`⚠️ حالتك النفسية (${emotion === 'revenge' ? 'انتقام' : emotion === 'excited' ? 'حماس مفرط' : 'إرهاق'}): غير متزنة وقد تؤدي لاتخاذ قرارات تداول اندفاعية.`);
    }

    // Correlated Exposure Warning (e.g. holding BTC long and opening ETH long)
    const hasCorrelatedOpen = openTrades.some(
      (t) => t.type === type && (t.symbol === 'BTC' || t.symbol === 'ETH' || t.symbol === 'SOL') && t.symbol !== symbol
    );
    if (hasCorrelatedOpen) {
      list.push(`⚠️ تعرّض مرتبط (Correlated Exposure): لديك بالفعل مركز مفتوح بنفس الاتجاه على عملة قيادية، مما يضاعف المخاطرة الكلية للمحفظة.`);
    }

    if (!isRiskRewardAcceptable && calculatedRiskReward > 0) {
      list.push(`⚠️ العائد على المخاطرة (1:${calculatedRiskReward}) أقل من الحد الأدنى المقبول في إعداداتك (1:${settings.minRiskReward}).`);
    }

    // 4) Edge vs Cost Gate (العائد المتوقع للهدف الأول ≥ 3× التكلفة الكلية للدورة)
    if (totalPositionValue > 0 && rewardDistance > 0 && entryPrice > 0) {
      const expectedGainDollars = calculatedQuantity * rewardDistance;
      // Conservative estimated round-trip fee (0.15% fee + 0.1% slippage = 0.25%)
      const estimatedRoundTripCostDollars = (totalPositionValue * 0.0025);
      const edgeCostRatio = expectedGainDollars / (estimatedRoundTripCostDollars || 1);
      if (edgeCostRatio < 3.0) {
        list.push(`🚨 بوابة الجدوى (Edge vs Cost Gate): التكلفة المقدرة للدورة ($${estimatedRoundTripCostDollars.toFixed(1)}) تلتهم أغلب الربح المحتمل ($${expectedGainDollars.toFixed(1)}). النسبة ${edgeCostRatio.toFixed(1)}x وأدنى حد هو 3x. اقتراح: استخدم أمراً محدداً (Limit) أو اختر أصلاً أعلى سيولة.`);
      }
    }

    return list;
  }, [
    trendAligned1D,
    noUpcomingNews24h,
    isRevengeTrade,
    emotion,
    openTrades,
    type,
    symbol,
    isRiskRewardAcceptable,
    calculatedRiskReward,
    settings.minRiskReward,
  ]);

  // Is Confirm Button Allowed?
  const isFormValid = useMemo(() => {
    if (!symbol.trim()) return false;
    if (!entryPrice || entryPrice <= 0) return false;
    if (!isStopLossValid) return false;
    if (!takeProfit1 || takeProfit1 <= 0) return false;
    if (!entryReason.trim()) return false;
    if (calculatedQuantity <= 0) return false;
    // Check if custom rules are acknowledged
    for (const ruleId in customRuleChecks) {
      if (!customRuleChecks[ruleId]) return false;
    }
    return true;
  }, [symbol, entryPrice, isStopLossValid, takeProfit1, entryReason, calculatedQuantity, customRuleChecks]);

  // Handle Image Upload for chart screenshot
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setChartScreenshotUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const checklist: ChecklistResponses = {
      trendAligned1D,
      noUpcomingNews24h,
      partOfPrePlan,
      isRevengeTrade,
      customRuleChecks,
    };

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onConfirmTrade({
      symbol: symbol.toUpperCase(),
      type,
      entryPrice,
      quantity: calculatedQuantity,
      positionValueUSDT: totalPositionValue,
      entryDate: new Date().toISOString(),
      stopLoss,
      takeProfit1,
      takeProfit2: takeProfit2 > 0 ? takeProfit2 : undefined,
      riskAmountUSDT: riskAmountDollars,
      riskRewardRatio: calculatedRiskReward,
      entryReason: entryReason.trim(),
      emotionBeforeTrade: emotion,
      followedPlan: partOfPrePlan && !isRevengeTrade,
      notes: liveWarnings.length > 0 ? `تحذيرات وقت الدخول:\n${liveWarnings.join('\n')}` : undefined,
      tags,
      checklistResponses: checklist,
      chartScreenshotUrl: chartScreenshotUrl || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                قائمة الفحص الإلزامية قبل الصفقة (Pre-Trade Checklist)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تأكيد إدارة المخاطر، احتساب حجم العقد تلقائياً، والتحقق النفسي والتكتيكي قبل إرسال الصفقة للدفتر.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Pair, Direction, and Prices */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-emerald-400 block">1. بيانات الدخول ووقف الخسارة (إلزامي):</span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Symbol */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">الرمز (Symbol):</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase text-xs focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Direction */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">الاتجاه:</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setType('long')}
                    className={`py-1.5 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1 ${
                      type === 'long'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    شراء (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('short')}
                    className={`py-1.5 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1 ${
                      type === 'short'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    بيع (Short)
                  </button>
                </div>
              </div>

              {/* Entry Price */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">سعر الدخول ($):</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Stop Loss (MANDATORY) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-rose-400 font-bold">وقف الخسارة (إلزامي):</label>
                  <button
                    type="button"
                    onClick={handleSuggestAtrStopLoss}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    1.5× ATR
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-950 font-mono text-xs outline-none ${
                    isStopLossValid
                      ? 'border border-rose-500/50 text-rose-300'
                      : 'border-2 border-rose-500 text-rose-400 animate-pulse'
                  }`}
                  placeholder={type === 'long' ? 'أقل من الدخول' : 'أعلى من الدخول'}
                  required
                />
                {!isStopLossValid && (
                  <span className="text-[10px] text-rose-400 block mt-0.5 font-bold">
                    * لا يمكن فتح صفقة بدون وقف خسارة صحيح
                  </span>
                )}
              </div>
            </div>

            {/* Target 1 and Target 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">الهدف الأول TP1 ($):</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit1}
                  onChange={(e) => setTakeProfit1(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">الهدف الثاني TP2 (اختياري):</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit2 || ''}
                  onChange={(e) => setTakeProfit2(parseFloat(e.target.value) || 0)}
                  placeholder="مستهدف إضافي لتريلينغ ستوب"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Automated Risk & Position Sizing Ribbon */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">المبلغ المعرّض للخسارة</span>
              <span className="text-base font-bold font-mono text-rose-400 mt-0.5 block">
                -${riskAmountDollars.toFixed(1)} ({settings.maxRiskPerTradePct}%)
              </span>
              <span className="text-[10px] text-slate-500">من محفظة ${settings.capital.toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">حجم المركز المحسوب</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {calculatedQuantity.toLocaleString()} {symbol}
              </span>
              <span className="text-[10px] text-slate-500">القيمة: ${totalPositionValue.toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">نسبة العائد/المخاطرة (R:R)</span>
              <span
                className={`text-base font-black font-mono mt-0.5 block ${
                  isRiskRewardAcceptable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                1 : {calculatedRiskReward}
              </span>
              <span className="text-[10px] text-slate-500">
                الحد الأدنى: 1:{settings.minRiskReward}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">الربح المتوقع عند TP1</span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                +${Math.round(calculatedQuantity * rewardDistance).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">
                مضاعف R: +{calculatedRiskReward}R
              </span>
            </div>
          </div>

          {/* Section 3: Yes/No Questions & Behavioral Audit */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 text-xs">
            <span className="font-bold text-emerald-400 block">2. أسئلة التحقق السلوكي والتكتيكي (نعم / لا):</span>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">هل الاتجاه في الإطار الأكبر (1D) يوافق صفقتي؟</span>
                <input
                  type="checkbox"
                  checked={trendAligned1D}
                  onChange={(e) => setTrendAligned1D(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">هل لا يوجد خبر أو حدث اقتصادي كبير خلال 24 ساعة؟</span>
                <input
                  type="checkbox"
                  checked={noUpcomingNews24h}
                  onChange={(e) => setNoUpcomingNews24h(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 cursor-pointer">
                <span className="text-slate-300">هل هذه الصفقة جزء من خطتي المسبقة المكتوبة وليست عشوائية؟</span>
                <input
                  type="checkbox"
                  checked={partOfPrePlan}
                  onChange={(e) => setPartOfPrePlan(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 cursor-pointer">
                <span className="text-rose-300 font-bold">هل أدخل هذه الصفقة لأعوّض خسارة سابقة (Revenge Trade)؟</span>
                <input
                  type="checkbox"
                  checked={isRevengeTrade}
                  onChange={(e) => setIsRevengeTrade(e.target.checked)}
                  className="w-4 h-4 accent-rose-500"
                />
              </label>

              {/* Custom AI rules if any */}
              {settings.customRules?.filter((r) => r.enabled).map((rule) => (
                <label key={rule.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-emerald-500/30 cursor-pointer">
                  <span className="text-emerald-300 font-medium">{rule.ruleText}</span>
                  <input
                    type="checkbox"
                    checked={!!customRuleChecks[rule.id]}
                    onChange={(e) =>
                      setCustomRuleChecks({ ...customRuleChecks, [rule.id]: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Mandatory Reason, Emotions, and Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Reason */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">سبب الدخول في سطر واحد (إلزامي):</label>
              <textarea
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                rows={2}
                placeholder="مثال: ارتداد من فيبوناتشي 61.8% مع دايفرجنس إيجابي وتأكيد شمعة مطرقة..."
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-emerald-500 outline-none"
                required
              />
            </div>

            {/* Emotional State */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">حالتي النفسية والذهنية الآن:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'calm', label: 'هادئ ومتزن 🧘', color: 'emerald' },
                  { id: 'excited', label: 'متحمس (FOMO) 🔥', color: 'amber' },
                  { id: 'anxious', label: 'خائف / قلق 😰', color: 'rose' },
                  { id: 'fatigued', label: 'متعب / مشتت 🥱', color: 'purple' },
                ].map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => setEmotion(em.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold text-right transition-all ${
                      emotion === em.id
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/60 shadow'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {em.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Screenshot & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{chartScreenshotUrl ? 'تم إرفاق صورة الشارت ✓' : 'إرفاق لقطة الشارت'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {chartScreenshotUrl && (
                <button
                  type="button"
                  onClick={() => setChartScreenshotUrl('')}
                  className="text-rose-400 hover:underline text-[11px]"
                >
                  حذف الصورة
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">الوسوم:</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="DayTrade, Trend, Breakout"
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono w-44"
              />
            </div>
          </div>

          {/* Live Warnings Display */}
          {liveWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1 text-xs text-rose-300">
              <span className="font-bold flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                تنبيهات انضباطية مرصودة (ستسجل في الدفتر مع الصفقة):
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {liveWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              * الزر معطل حتى إدخال وقف خسارة صالح وسبب الدخول
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={!isFormValid}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد وتسجيل الصفقة في الدفتر</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
