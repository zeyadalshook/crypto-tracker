import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, BookOpen, X } from 'lucide-react';

interface LegalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const LegalDisclaimerModal: React.FC<LegalDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="card-glow bg-[#07130c] border border-amber-500/50 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-amber-500/30">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              إخلاء المسؤولية القانونية والتنبيه من المخاطر
            </h3>
            <span className="text-xs text-amber-300/80">
              يرجى القراءة والموافقة للمتابعة
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
          <p className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>للتثقيف والتحليل الفني فقط:</strong> جميع التحليلات، المؤشرات، القراءات الفنية،
              وتقارير الذكاء الاصطناعي المعروضة في هذا التطبيق هي لأغراض تعليمية وإعلامية بحتة، ولا
              تُعد بأي حال من الأحوال نصيحة استثمارية أو توصية مباشرة بالبيع أو الشراء.
            </span>
          </p>

          <p className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>طبيعة أسواق العملات الرقمية:</strong> تداول العملات الرقمية والمشتقات المالية
              ينطوي على درجة عالية من التذبذب والمخاطر، وقد يؤدي إلى خسارة جزء من رأس المال أو كله.
            </span>
          </p>

          <p className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>الصيغ الاحتمالية:</strong> لا تُعرض أي مؤشرات بصيغ قطعية أو وعود مؤكدة؛ فكل
              القراءات مبنية على نماذج احتمالية وافتراضات رياضية قد تصيب أو تخطئ تبعاً لتغيرات
              السيولة والأخبار.
            </span>
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onAccept}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>أوافق وأتفهم المخاطر والمتابعة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
