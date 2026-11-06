import React, { useState } from 'react';
import { StatisticalEvidence } from '../../types/evidence';
import { Percent, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';
import { getDisciplineSettings, saveDisciplineSettings } from '../../utils/disciplineStorage';

interface KellyRiskRecommenderProps {
  evidence: StatisticalEvidence;
  onAppliedToDiscipline?: (newRiskPct: number) => void;
}

export const KellyRiskRecommender: React.FC<KellyRiskRecommenderProps> = ({
  evidence,
  onAppliedToDiscipline,
}) => {
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const kelly = evidence.kellySuggestedRiskPct;

  const handleApplyToDiscipline = () => {
    try {
      const settings = getDisciplineSettings();
      settings.maxRiskPerTradePct = kelly.appliedCapPct;
      saveDisciplineSettings(settings);

      setAppliedSuccess(true);
      if (onAppliedToDiscipline) {
        onAppliedToDiscipline(kelly.appliedCapPct);
      }
      setTimeout(() => setAppliedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to update discipline settings:', e);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-indigo-400" />
          <h4 className="text-base font-semibold text-slate-200">
            تحديد حجم المخاطرة بنصف كيلي المعدل (Kelly Risk Allocation)
          </h4>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          مكبوح بمجال الثقة 95% وسقف الانضباط
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Full Kelly */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">كيلي الكامل (Full Kelly)</div>
          <div className="text-2xl font-bold text-slate-300 mt-1">
            {kelly.fullKellyPct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            المعادلة النظرية البحتة (مفرطة التقلب وعالية التراجع)
          </div>
        </div>

        {/* Half Kelly */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">نصف كيلي (Half-Kelly)</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            {kelly.halfKellyPct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            يقلل التراجع بنسبة 50% مع الحفاظ على 75% من معدل النمو
          </div>
        </div>

        {/* Conservative Discounted Kelly */}
        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-indigo-300 font-medium flex items-center justify-between">
            <span>المخاطرة المقترحة المعتمدة</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1">
            {kelly.appliedCapPct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-indigo-200/70 mt-1">
            مخفضة بأسوأ سيناريو لمجال الثقة وسقف الانضباط
          </div>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-slate-200 mb-0.5">كيف تم الحساب؟</div>
          <p className="text-slate-400">{kelly.formulaNotesAr}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-400">
          تطبيق هذه النسبة سيحدّث حاسبة الصفقات وقائمة الفحص في وحدة الانضباط تلقائياً.
        </div>

        <button
          onClick={handleApplyToDiscipline}
          disabled={appliedSuccess || kelly.appliedCapPct <= 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all shadow-lg ${
            appliedSuccess
              ? 'bg-emerald-600 text-white cursor-default'
              : kelly.appliedCapPct > 0
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {appliedSuccess ? (
            <>
              <Check className="w-4 h-4" /> تم التطبيق على وحدة الانضباط بنجاح
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" /> تطبيق نسبة المخاطرة ({kelly.appliedCapPct}%) على وحدة الانضباط
            </>
          )}
        </button>
      </div>
    </div>
  );
};
