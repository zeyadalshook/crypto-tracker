import React, { useState } from 'react';
import { StageCChecklist } from '../../lib/fundamentals/types';
import { validateChecklistCompletion } from '../../lib/fundamentals/funnel/stageC';
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Save,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface ManualChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: StageCChecklist;
  onSave: (updated: StageCChecklist) => void;
}

export const ManualChecklistModal: React.FC<ManualChecklistModalProps> = ({
  isOpen,
  onClose,
  checklist,
  onSave,
}) => {
  if (!isOpen) return null;

  const [form, setForm] = useState<StageCChecklist>({ ...checklist });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = (key: keyof StageCChecklist) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key as keyof StageCChecklist],
    }));
  };

  const handleSave = () => {
    const isComplete = validateChecklistCompletion(form);
    if (!isComplete && form.decision === 'follow') {
      setErrorMsg(
        'يُشترط تدقيق جميع البنود الخمسة وكتابة ملاحظات لا تقل عن 15 حرفاً قبل اعتماد قرار المتابعة.'
      );
      return;
    }

    onSave({
      ...form,
      isComplete,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="card-glow bg-slate-950 border border-indigo-500/40 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>المرحلة ج: المراجعة اليدوية الإلزامية لـ {form.symbol}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono">
                  بوابة التدقيق البشري
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                لا انتقال للمرحلة التالية دون استكمال التدقيق اليدوي المباشر وتوثيق مصادره
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 5 Mandatory Verification Items */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 block">
            قائمة التحقق الإلزامية (يجب تأكيد كل بند بعد مراجعته من المصدر الأولي):
          </label>

          {[
            {
              key: 'top5NumbersVerified',
              title: '1. التحقق من أهم 5 أرقام رقمية من مصادرها الأساسية',
              desc: 'المعروض المتداول، القيمة المقفلة TVL، الرسوم السنوية، إيرادات الخزينة، وحجم التداول من المستكشف وDefiLlama.',
            },
            {
              key: 'unlockScheduleVerifiedFromDocs',
              title: '2. جدول الفك والانبعاثات مراجع ومطابق لوثائق المشروع الرسمية',
              desc: 'التأكد من عدم وجود جولات فك مفاجئة تفوق 50% من المتداول خلال الـ 12 شهراً القادمة من مستندات التوكنومكس.',
            },
            {
              key: 'latestGovernanceProposalsChecked',
              title: '3. آخر مقترحات الحوكمة والتصويتات مدققة',
              desc: 'التأكد من سلامة القرارات على Snapshot/On-chain وعدم وجود نزاعات حوكمة أو مقترحات تضر بحاملي التوكن.',
            },
            {
              key: 'recentSecurityIncidentsAudited',
              title: '4. سجل الحوادث والاختراقات مفحوص في DefiLlama Hacks',
              desc: 'التأكد من خلو المشروع من أي اختراق غير معالج أو خسائر غير معوضة خلال السنوات الثلاث الماضية.',
            },
            {
              key: 'holderConcentrationVerifiedOnExplorer',
              title: '5. تركّز الحيازة لأكبر 10 عناوين مفحوص في مستكشف البلوكشين',
              desc: 'استبعاد عناوين البورصات والعقود المبرمجة والتأكد من أن الأفراد والحيتان لا يستحوذون على أكثر من 60%.',
            },
          ].map((item) => {
            const isChecked = Boolean(form[item.key as keyof StageCChecklist]);
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key as keyof StageCChecklist)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isChecked
                    ? 'bg-indigo-950/30 border-indigo-500/50 text-slate-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by wrapper div
                  className="mt-0.5 accent-indigo-500 rounded cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className={`text-xs font-bold ${isChecked ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reviewer Notes */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            ملاحظات التدقيق البشري والروابط المرجعية (مطلوب ≥ 15 حرفاً):
          </label>
          <textarea
            value={form.reviewerNotes}
            onChange={(e) => setForm({ ...form, reviewerNotes: e.target.value })}
            placeholder="اكتب ملاحظات التدقيق هنا، مثل نتائج مراجعة التوكنومكس على المستكشف، آخر مقترح تصويت تم اعتماده، وحالة الخزينة..."
            rows={3}
            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Decision & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">القرار بعد المراجعة:</label>
            <div className="flex gap-1.5 h-9">
              <button
                type="button"
                onClick={() => setForm({ ...form, decision: 'follow' })}
                className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                  form.decision === 'follow'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                متابعة (Follow)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, decision: 'recheck_later' })}
                className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                  form.decision === 'recheck_later'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                إعادة فحص
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, decision: 'drop' })}
                className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                  form.decision === 'drop'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                إسقاط (Drop)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">تاريخ التدقيق:</label>
            <input
              type="date"
              value={form.reviewedAt}
              onChange={(e) => setForm({ ...form, reviewedAt: e.target.value })}
              className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>حفظ واعتماد التدقيق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
