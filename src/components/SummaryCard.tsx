import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, Sparkles } from 'lucide-react';
import { TechnicalAnalysisResult } from '../types/crypto';

interface SummaryCardProps {
  analysis: TechnicalAnalysisResult;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ analysis }) => {
  const { positivePoints, cautionPoints } = analysis;

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            خلاصة القراءة الفنية والأساسية
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          توليد منطقي آلي بناءً على القواعد الفنية المعتمدة
        </span>
      </div>

      {/* Two Columns: Positive (✓ Green) and Caution (! Red) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: الإيجابي (Green) */}
        <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm pb-2 border-b border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4" />
            <span>العوامل الإيجابية والفرص (البناء الصاعد)</span>
            <span className="mr-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 font-mono">
              {positivePoints.length}
            </span>
          </div>

          <ul className="space-y-2 mt-1">
            {positivePoints.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-200 leading-relaxed"
              >
                <span className="text-emerald-400 font-bold mt-0.5 shrink-0">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: الحذر (Red / Warning) */}
        <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm pb-2 border-b border-rose-900/50">
            <AlertTriangle className="w-4 h-4" />
            <span>عوامل الحذر والمخاطر المحتملة</span>
            <span className="mr-auto text-xs px-2 py-0.5 rounded-full bg-rose-500/20 font-mono">
              {cautionPoints.length}
            </span>
          </div>

          <ul className="space-y-2 mt-1">
            {cautionPoints.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-200 leading-relaxed"
              >
                <span className="text-rose-400 font-bold mt-0.5 shrink-0">!</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
