import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Info,
  HelpCircle,
  X,
  Layers,
} from 'lucide-react';
import { DailyDisciplineState, DisciplineSettings } from '../types/discipline';
import { formatCurrency } from '../utils/formatters';

interface DailyLockoutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  state: DailyDisciplineState;
  settings: DisciplineSettings;
  onSaveReflection: (reflection: string) => void;
}

export const DailyLockoutOverlay: React.FC<DailyLockoutOverlayProps> = ({
  isOpen,
  onClose,
  state,
  settings,
  onSaveReflection,
}) => {
  if (!isOpen) return null;

  // Countdown timer to lockout expiration
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [reflectionChoice, setReflectionChoice] = useState<string>(
    settings.lockoutReflection || ''
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [hasSaved, setHasSaved] = useState<boolean>(!!settings.lockoutReflection);

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = state.lockoutExpiresAt || Date.now() + 6 * 60 * 60 * 1000;
      const diff = Math.max(0, targetTime - Date.now());

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [state.lockoutExpiresAt]);

  const handleConfirmReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionChoice) return;
    const fullText = customNote.trim()
      ? `${reflectionChoice}: ${customNote.trim()}`
      : reflectionChoice;
    onSaveReflection(fullText);
    setHasSaved(true);
  };

  const lockoutTitle =
    state.lockoutType === 'consecutive'
      ? 'استراحة إجبارية مؤقتة (Consecutive Losses Cool-off)'
      : state.lockoutType === 'weekly'
      ? 'قفل الحد الأسبوعي للخسارة (Weekly Loss Lockout)'
      : 'قفل الخسارة اليومية الإلزامي (Daily Loss Lockout)';

  const lockoutSubtitle =
    state.lockoutType === 'consecutive'
      ? `تجاوزت حد الخسائر المتتالية (${settings.consecutiveLossLimit} صفقات خاسرة متتابعة).`
      : state.lockoutType === 'weekly'
      ? `وصلت إلى الحد الأقصى للخسارة الأسبوعية (${settings.weeklyLossLimitPct}%).`
      : `وصلت إلى الحد الأقصى للخسارة اليومية المقدر بـ ${settings.dailyLossLimitPct}% (-$${state.todayLossLimitDollars}).`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg overflow-y-auto">
      <div className="card-glow bg-[#0f0407] border-2 border-rose-500/60 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-rose-950/80">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 font-mono inline-block mb-1">
                BEHAVIORAL LOCKOUT ACTIVE
              </span>
              <h3 className="font-black text-white text-lg sm:text-xl">
                {lockoutTitle}
              </h3>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {lockoutSubtitle}
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

        {/* Countdown Timer Display */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-400" />
            الوقت المتبقي حتى انتهاء القفل واستئناف فتح الصفقات:
          </span>

          <div className="flex items-center gap-3 font-mono font-black text-3xl sm:text-4xl text-rose-400 tracking-wider">
            <div className="flex flex-col items-center">
              <span>{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[10px] text-slate-500 font-sans font-normal">ساعة</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
              <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] text-slate-500 font-sans font-normal">دقيقة</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
              <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] text-slate-500 font-sans font-normal">ثانية</span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 mt-1">
            بتوقيت {settings.timezone === 'utc' ? 'العالمي (UTC)' : 'المستخدم المحلي'} عند منتصف الليل
          </span>
        </div>

        {/* Financial Summary of the Day */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">صافي خسارة اليوم</span>
            <span className="text-base font-bold font-mono text-rose-400 mt-1 block">
              ${state.todayTotalPnL.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">حد الخسارة اليومي</span>
            <span className="text-base font-bold font-mono text-slate-200 mt-1 block">
              -${state.todayLossLimitDollars} ({settings.dailyLossLimitPct}%)
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">الصفقات المفتوحة</span>
            <span className="text-base font-bold font-mono text-emerald-300 mt-1 block">
              {state.openTradesCount} متاحة للإدارة
            </span>
          </div>
        </div>

        {/* Crucial Guarantee: Open positions can ALWAYS be managed/closed! */}
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>حماية الصفقات المفتوحة:</strong> القفل يمنع فتح "صفقة جديدة" فقط. صفقاتك المفتوحة الحالية تظل مرئية ومتاحة للإدارة أو الإغلاق في أي لحظة.
          </span>
        </div>

        {/* Mandatory Reflection Question: "ما الذي حدث؟" */}
        <form onSubmit={handleConfirmReflection} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span>سؤال الانضباط الذاتي الإلزامي: ما الذي حدث اليوم؟</span>
          </div>

          <p className="text-slate-400 text-[11px]">
            حدد السبب الصادق الذي أدى للوصول إلى هذا الحد لتسجيله في الدفتر ومراجعته في تقريرك الأسبوعي:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'خرق خطتي المسبقة', label: '1. خرق خطتي وعدم الالتزام بنقاط الوقف' },
              { id: 'تداول انتقامي بعد خسارة', label: '2. تداول انتقامي متسرع (Revenge Trading)' },
              { id: 'ظروف سوق متقلبة وعنيفة', label: '3. ظروف سوق استثنائية وانزلاق سعري' },
              { id: 'خطأ في التنفيذ وحجم العقد', label: '4. خطأ في حساب حجم العقد (Overleverage)' },
              { id: 'تراجع طبيعي ضمن التوزيع الاحتمالي', label: '5. تراجع طبيعي لاستراتيجية رابحة (Drawdown)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReflectionChoice(opt.id)}
                className={`p-2.5 rounded-lg text-right font-medium transition-all ${
                  reflectionChoice === opt.id
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-500/60 shadow'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            rows={2}
            placeholder="ملاحظة سريعة لنسختك المستقبلية (ما هو الدرس من اليوم؟)..."
            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-rose-500 outline-none"
          />

          <div className="flex items-center justify-between pt-1">
            {hasSaved ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ التقييم الذاتي في الدفتر
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">
                * تقييم صريح يحول الخسارة إلى درس استراتيجي
              </span>
            )}

            <button
              type="submit"
              disabled={!reflectionChoice}
              className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-black transition-colors disabled:opacity-40"
            >
              حفظ التقييم
            </button>
          </div>
        </form>

        {/* Behavioral Education Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            هذا القفل هو أداة سلوكية وانضباطية ذكية مدمجة داخل التطبيق لمساعدتك على استعادة السيطرة النفسية وحماية رأسمالك، ولا يتحكم بحسابك البنكي أو حساب المنصة الخارجية.
          </span>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-rose-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
          >
            الانتقال للدفتر وإدارة الصفقات المفتوحة
          </button>
        </div>
      </div>
    </div>
  );
};
