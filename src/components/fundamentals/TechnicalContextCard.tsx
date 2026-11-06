import React from 'react';
import { StageDTechnicalContext } from '../../lib/fundamentals/types';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Lock,
} from 'lucide-react';

interface TechnicalContextCardProps {
  context: StageDTechnicalContext;
  currentPrice?: number;
}

export const TechnicalContextCard: React.FC<TechnicalContextCardProps> = ({
  context,
  currentPrice = 0,
}) => {
  const isSupported = context.isSupportedByStatisticalGate;
  const p = context.pivotLevels;

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-5 space-y-4 text-slate-100" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>المرحلة د: السياق الفني ومناطق الارتكاز (بحث فقط) لـ {context.symbol}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                {context.historyYears} سنوات بيانات
              </span>
            </h4>
          </div>
        </div>

        {/* Statistical Support Status Badge */}
        <div>
          {isSupported ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مدعومة بالتحقق الإحصائي (بوابة 🟢/🟡)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>غير مدعومة بالتحقق الإحصائي</span>
            </span>
          )}
        </div>
      </div>

      {/* Warning Alert if not supported by statistical gate */}
      {!isSupported && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-300">
            <Lock className="w-4 h-4 shrink-0" />
            <span>قاعدة الأمان الإحصائي: حظر اقتراح أحجام الصفقات والأوامر التنفيذية</span>
          </div>
          <p className="leading-relaxed text-slate-300">{context.disclaimerAr}</p>
        </div>
      )}

      {/* Pivot & ATR Levels Display (Derived from pure rules, NO price prediction) */}
      {p && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 block">نقطة الارتكاز (Pivot)</span>
            <div className="text-sm font-bold font-mono text-white mt-0.5">${p.pivot.toLocaleString()}</div>
            <span className="text-[9px] text-slate-500">حساب رياضي محايد</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-rose-400 block">المقاومة الأولى (R1)</span>
            <div className="text-sm font-bold font-mono text-rose-300 mt-0.5">${p.r1.toLocaleString()}</div>
            <span className="text-[9px] text-slate-500">مستوى ارتداد فني</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-rose-400 block">المقاومة الثانية (R2)</span>
            <div className="text-sm font-bold font-mono text-rose-300 mt-0.5">${p.r2.toLocaleString()}</div>
            <span className="text-[9px] text-slate-500">مستوى إجهاد شرائي</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-emerald-400 block">الدعم الأول (S1)</span>
            <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">${p.s1.toLocaleString()}</div>
            <span className="text-[9px] text-slate-500">مستوى تماسك محتمل</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-emerald-400 block">الدعم الثاني (S2)</span>
            <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">${p.s2.toLocaleString()}</div>
            <span className="text-[9px] text-slate-500">منطقة ارتداد عميقة</span>
          </div>
        </div>
      )}

      {/* Position Sizing Status */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400">حالة اقتراح حجم الصفقة (Position Sizing):</span>
        <span className={`font-bold font-mono ${context.allowedPositionSizing ? 'text-emerald-400' : 'text-rose-400'}`}>
          {context.allowedPositionSizing ? 'مسموح وفق معيار كيلي المخفف' : 'محظور تماماً (غير معتمد)'}
        </span>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="text-[11px] text-slate-500 text-center pt-1 border-t border-slate-900">
        ملاحظة نظامية: هذه المناطق مشتقة بقواعد هندسية معرّفة مسبقاً (Standard Pivot Formula) دون أي تنبؤ مستقبلي بالأسعار.
      </div>
    </div>
  );
};
