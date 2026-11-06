import React from 'react';

export interface FundamentalBadgeProps {
  status?: 'passed' | 'failed' | 'not_evaluated' | 'out_of_scope';
  score?: number;
  coveragePct?: number;
}

/**
 * Small isolated badge for single-decision screens.
 * STRICT RULE: Has zero influence on any calculations or execution decisions.
 */
export const FundamentalBadge: React.FC<FundamentalBadgeProps> = ({
  status = 'not_evaluated',
  score,
  coveragePct,
}) => {
  let label = 'جودة أساسية: لم تُقيَّم';
  let badgeColor = 'bg-slate-900 text-slate-400 border-slate-800';

  if (status === 'passed') {
    label = `جودة أساسية: مجتازة (${score ?? 0}/100)`;
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (status === 'failed') {
    label = `جودة أساسية: لم تجتز (${score ?? 0}/100)`;
    badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  } else if (status === 'out_of_scope') {
    label = 'جودة أساسية: خارج نطاق البروتوكول';
    badgeColor = 'bg-slate-800/80 text-slate-300 border-slate-700';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${badgeColor} select-none`}
      title="تقييم وصفي معزول للأصل ولا يؤثر في أي قرار تنفيذي أو إشارة تداول"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{label}</span>
      {coveragePct !== undefined && coveragePct < 60 && status !== 'out_of_scope' && (
        <span className="text-[10px] text-amber-400 font-mono">(تغطية غير كافية)</span>
      )}
    </div>
  );
};
