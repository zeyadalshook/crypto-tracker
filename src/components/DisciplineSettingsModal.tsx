import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  Lock,
  Trash2,
  CheckCircle2,
  Key,
  Info,
  Layers,
  Save,
  RotateCcw,
} from 'lucide-react';
import { DisciplineSettings, DisciplineCustomRule } from '../types/discipline';
import {
  requestSettingsUpdateWithAntiRage,
  clearAllDisciplineData,
} from '../utils/disciplineStorage';
import { formatCurrency } from '../utils/formatters';

interface DisciplineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DisciplineSettings;
  onSaveSettings: (newSettings: DisciplineSettings) => void;
  onDataPurged: () => void;
}

export const DisciplineSettingsModal: React.FC<DisciplineSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onDataPurged,
}) => {
  if (!isOpen) return null;

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'rules' | 'binance' | 'danger'>('rules');

  // Form states
  const [capital, setCapital] = useState<number>(settings.capital);
  const [maxRiskPerTradePct, setMaxRiskPerTradePct] = useState<number>(settings.maxRiskPerTradePct);
  const [dailyLossLimitPct, setDailyLossLimitPct] = useState<number>(settings.dailyLossLimitPct);
  const [weeklyLossLimitPct, setWeeklyLossLimitPct] = useState<number>(settings.weeklyLossLimitPct);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(settings.maxOpenPositions);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(settings.maxTradesPerDay);
  const [minRiskReward, setMinRiskReward] = useState<number>(settings.minRiskReward);
  const [consecutiveLossLimit, setConsecutiveLossLimit] = useState<number>(settings.consecutiveLossLimit);
  const [coolOffHours, setCoolOffHours] = useState<number>(settings.coolOffHours);
  const [timezone, setTimezone] = useState<'local' | 'utc'>(settings.timezone);

  // Custom Rules
  const [customRules, setCustomRules] = useState<DisciplineCustomRule[]>(settings.customRules || []);
  const [newRuleText, setNewRuleText] = useState('');

  // Binance Read-Only state
  const [binanceKey, setBinanceKey] = useState(settings.binanceReadOnlyKey || '');
  const [binanceSecret, setBinanceSecret] = useState('');
  const [isVerifyingBinance, setIsVerifyingBinance] = useState(false);
  const [binanceStatus, setBinanceStatus] = useState<string | null>(null);

  // Notification / Pending state
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [showConfirmPurge, setShowConfirmPurge] = useState(false);

  // Handle Save with Anti-Rage 24-hour verification
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if the user is trying to relax (increase) daily/weekly loss limits or risk
    const isRelaxingLimits =
      dailyLossLimitPct > settings.dailyLossLimitPct ||
      weeklyLossLimitPct > settings.weeklyLossLimitPct ||
      maxRiskPerTradePct > settings.maxRiskPerTradePct;

    const proposed: Partial<DisciplineSettings> = {
      capital,
      maxRiskPerTradePct,
      dailyLossLimitPct,
      weeklyLossLimitPct,
      maxOpenPositions,
      maxTradesPerDay,
      minRiskReward,
      consecutiveLossLimit,
      coolOffHours,
      timezone,
      customRules,
      binanceReadOnlyKey: binanceKey.trim() || undefined,
    };

    const result = requestSettingsUpdateWithAntiRage(settings, proposed, isRelaxingLimits);

    if (result.isPending) {
      setFeedbackNotice(
        '⏳ تم تفعيل قفل الـ 24 ساعة (Anti-Rage Lock): نظراً لرفع حد المخاطرة أو الخسارة، سيتم تطبيق الإعدادات الجديدة تلقائياً بعد مرور 24 ساعة لحمايتك من التعديل اللحظي أثناء الانفعال.'
      );
    } else {
      setFeedbackNotice('✓ تم حفظ إعدادات الانضباط بنجاح.');
      setTimeout(() => setFeedbackNotice(null), 3000);
    }

    onSaveSettings(result.updated);
  };

  // Add custom rule
  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    const rule: DisciplineCustomRule = {
      id: `rule_${Date.now()}`,
      ruleText: newRuleText.trim(),
      category: 'قاعدة مخصصة',
      enabled: true,
    };
    setCustomRules([...customRules, rule]);
    setNewRuleText('');
  };

  // Toggle rule
  const handleToggleRule = (id: string) => {
    setCustomRules(
      customRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    setCustomRules(customRules.filter((r) => r.id !== id));
  };

  // Test Binance Read-Only Key
  const handleTestBinance = async () => {
    if (!binanceKey.trim()) return;
    setIsVerifyingBinance(true);
    setBinanceStatus(null);
    try {
      const resp = await fetch('/api/binance/verify-readonly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: binanceKey, apiSecret: binanceSecret }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setBinanceStatus(`❌ ${data.error || 'فشل التحقق من المفتاح'}`);
      } else {
        setBinanceStatus(`✓ ${data.message || 'المفتاح مؤكد بصلاحية القراءة فقط حصراً.'}`);
      }
    } catch {
      setBinanceStatus('❌ تعذر الاتصال بخادم التحقق من المفاتيح.');
    } finally {
      setIsVerifyingBinance(false);
    }
  };

  // Purge all data
  const handlePurge = () => {
    clearAllDisciplineData();
    setShowConfirmPurge(false);
    onDataPurged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                إعدادات الانضباط وإدارة المخاطر (Discipline Settings)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد حدود الخسارة، ونسب المخاطرة، وقواعد قفل الحساب السلوكي مع حماية ضد التعديل اللحظي (Anti-Tilt).
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

        {/* Behavioral Local Warning Notice */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block text-amber-200 font-bold mb-0.5">تنبيه أمان وانضباط:</strong>
            هذا القفل <strong>حاجز سلوكي محلي يمكن تجاوزه</strong> (عبر مسح بيانات المتصفح)، وليس حماية حقيقية مطلقة. القفل المالي الحقيقي لمنع التداول يتطلب وسيطاً أو خادماً سحابياً مستقلاً.
          </div>
        </div>

        {/* Anti-Rage Active Banner if pending */}
        {settings.pendingSettingsChange && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block text-sm">
                طلب تعديل قيد الانتظار (حماية الـ 24 ساعة):
              </strong>
              <p className="mt-0.5 leading-relaxed">
                تم تقديم طلب لرفع حدود المخاطرة. سيتم تفعيله تلقائياً بتاريخ:{' '}
                <span className="font-mono font-bold text-white">
                  {new Date(settings.pendingSettingsChange.effectiveAt).toLocaleString()}
                </span>
                . هذه الميزة مصممة خصيصاً لمنعك من تليين القواعد في لحظات الانفعال.
              </p>
            </div>
          </div>
        )}

        {/* Tab switchers */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'rules'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            حدود المخاطرة والقفل
          </button>
          <button
            onClick={() => setActiveTab('binance')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'binance'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ربط Binance (قراءة فقط)
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'danger'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الخصوصية وحذف البيانات
          </button>
        </div>

        {/* Tab 1: Rules & Limits */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              {/* Capital */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  رأس المال الحالي ($):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                    required
                  />
                  <span className="absolute left-2.5 top-2 text-slate-500 text-[10px]">USDT</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">الأساس لاحتساب المخاطرة والخسارة</span>
              </div>

              {/* Max Risk % */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  المخاطرة القصوى للصفقة (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5"
                    value={maxRiskPerTradePct}
                    onChange={(e) => setMaxRiskPerTradePct(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center"
                    required
                  />
                  <span className="text-rose-400 font-mono font-bold text-xs">
                    -${((capital * maxRiskPerTradePct) / 100).toFixed(1)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 1.0% (المعيار الاحترافي)</span>
              </div>

              {/* Daily Loss Limit % */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-rose-400 mb-1 font-bold">
                  حد الخسارة اليومي (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={dailyLossLimitPct}
                    onChange={(e) => setDailyLossLimitPct(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-300 font-mono text-xs text-center"
                    required
                  />
                  <span className="text-rose-400 font-mono font-bold text-xs">
                    -${((capital * dailyLossLimitPct) / 100).toFixed(0)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">يُقفل الحساب عند الوصول له حتى منتصف الليل</span>
              </div>

              {/* Weekly Loss Limit % */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-rose-400 mb-1 font-bold">
                  حد الخسارة الأسبوعي (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="20"
                    value={weeklyLossLimitPct}
                    onChange={(e) => setWeeklyLossLimitPct(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-300 font-mono text-xs text-center"
                    required
                  />
                  <span className="text-rose-400 font-mono font-bold text-xs">
                    -${((capital * weeklyLossLimitPct) / 100).toFixed(0)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">يُقفل حتى بداية الأسبوع التالي</span>
              </div>

              {/* Max Open Positions */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  أقصى صفقات مفتوحة معاً:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxOpenPositions}
                  onChange={(e) => setMaxOpenPositions(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 3 صفقات</span>
              </div>

              {/* Max Trades per Day */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  أقصى عدد صفقات في اليوم:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxTradesPerDay}
                  onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 5 صفقات (منع الإفراط Over-trading)</span>
              </div>

              {/* Min Risk Reward Ratio */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-emerald-400 mb-1 font-bold">
                  الحد الأدنى للـ R:R:
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">1 :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={minRiskReward}
                    onChange={(e) => setMinRiskReward(parseFloat(e.target.value) || 1.5)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs text-center"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 1:1.5</span>
              </div>

              {/* Consecutive Losses for Cool-off */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  الخسائر المتتالية للاستراحة:
                </label>
                <input
                  type="number"
                  min="2"
                  max="5"
                  value={consecutiveLossLimit}
                  onChange={(e) => setConsecutiveLossLimit(parseInt(e.target.value, 10) || 3)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 3 خسائر متتالية</span>
              </div>

              {/* Cool-off Duration */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-slate-400 mb-1 font-semibold">
                  مدة الاستراحة الإجبارية (ساعات):
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={coolOffHours}
                  onChange={(e) => setCoolOffHours(parseInt(e.target.value, 10) || 4)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs text-center"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">افتراضي: 4 ساعات</span>
              </div>
            </div>

            {/* Timezone and Educational Notice */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">التوقيت المعتمد لإعادة تعيين القفل اليومي:</span>
                <select
                  value={timezone}
                  onChange={(e: any) => setTimezone(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                >
                  <option value="local">توقيت جهازك المحلي</option>
                  <option value="utc">توقيت غرينتش العالمي (UTC)</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>حماية Anti-Rage مفعلة: تعديل الحدود للأعلى يتطلب 24 ساعة</span>
              </div>
            </div>

            {/* Custom Rules Section */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">
                  قواعد فحص إضافية نشطة في قائمة الفحص ({customRules.length}):
                </span>
                <span className="text-[11px] text-slate-400">تظهر كأسئلة إلزامية قبل كل صفقة</span>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto">
                {customRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="accent-emerald-500 rounded"
                      />
                      <span className={rule.enabled ? 'text-slate-200' : 'text-slate-500 line-through'}>
                        {rule.ruleText}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add rule input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="أضف قاعدة انضباط مخصصة (مثال: لا تداول بعد شمعة خضراء متطرفة)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  إضافة
                </button>
              </div>
            </div>

            {feedbackNotice && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200">
                {feedbackNotice}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                * قفل الخسارة سلوكي داخل التطبيق لمساعدتك على الانضباط
              </span>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all text-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Binance Read-Only */}
        {activeTab === 'binance' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Key className="w-4 h-4" />
                <span>ربط اختياري مع حساب Binance (صلاحية قراءة فقط حصراً):</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                يمكنك إدخال مفتاح API بصلاحية <strong>Read-Only</strong> حصراً لمزامنة صفقاتك تلقائياً في دفتر التداول. يرفض التطبيق تماماً أي مفتاح يحتوي على صلاحيات سحب أو تداول لضمان الأمان المطلق.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Binance API Key (Read-Only):</label>
                <input
                  type="text"
                  value={binanceKey}
                  onChange={(e) => setBinanceKey(e.target.value)}
                  placeholder="vmPU... أو مفتاحك بصلاحية القراءة فقط"
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Binance API Secret (اختياري للتحقق):</label>
                <input
                  type="password"
                  value={binanceSecret}
                  onChange={(e) => setBinanceSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestBinance}
                  disabled={isVerifyingBinance || !binanceKey.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors disabled:opacity-40"
                >
                  {isVerifyingBinance ? 'جاري التحقق الأمني...' : 'فحص الاتصال وتأكيد القراءة فقط'}
                </button>
              </div>

              {binanceStatus && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  {binanceStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Danger Zone & Privacy */}
        {activeTab === 'danger' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">الخصوصية والأمان:</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                جميع بيانات دفتر التداول وإعدادات الانضباط وسجل الصفقات تخزن محلياً على جهازك ومحفوظة ضمن بيئتك الخاصة دون مشاركتها مع أي جهة خارجية.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>حذف كل بيانات الدفتر والانضباط</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                هذا الإجراء سيقوم بحذف جميع الصفقات المسجلة والإعدادات والمراجعات الأسبوعية بشكل نهائي وغير قابل للاسترجاع.
              </p>

              {showConfirmPurge ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/50 border border-rose-500/40">
                  <span className="text-rose-300 font-bold">هل أنت متأكد تماماً من الحذف الشامل؟</span>
                  <button
                    type="button"
                    onClick={handlePurge}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    نعم، احذف كل شيء
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPurge(false)}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-300"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmPurge(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
                >
                  حذف كل بياناتي الآن
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              ⚖️ <strong>إخلاء المسؤولية القانونية:</strong> هذا التطبيق مصمم لأغراض التثقيف الرياضي وإدارة الانضباط النفسي فقط، ولا يقدم أي توصيات مالية أو استشارية. التداول في العملات الرقمية ينطوي على مخاطر مرتفعة.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
