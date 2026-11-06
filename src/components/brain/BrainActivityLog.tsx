import React, { useState } from 'react';
import {
  BrainActivityEntry,
  getBrainActivityLog,
} from '../../lib/brain/brainStorage';
import {
  Clock,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  Search,
} from 'lucide-react';

interface BrainActivityLogProps {
  onRefresh?: () => void;
}

export const BrainActivityLog: React.FC<BrainActivityLogProps> = () => {
  const [logs, setLogs] = useState<BrainActivityEntry[]>(getBrainActivityLog());
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchCoin, setSearchCoin] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchCoin.trim() && !log.coin.toLowerCase().includes(searchCoin.toLowerCase().trim()))
      return false;
    return true;
  });

  const getActionBadge = (action: BrainActivityEntry['action']) => {
    switch (action) {
      case 'ENTER_LONG':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'ENTER_SHORT':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'MOVE_SL_BREAKEVEN':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'PARTIAL_TP':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'EXIT':
      case 'MANUAL_CLOSE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'HALT':
        return 'bg-rose-600/20 text-rose-300 border-rose-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getActionLabelAr = (action: BrainActivityEntry['action']) => {
    switch (action) {
      case 'ENTER_LONG':
        return 'دخول شراء (LONG)';
      case 'ENTER_SHORT':
        return 'دخول بيع (SHORT)';
      case 'MOVE_SL_BREAKEVEN':
        return 'تأمين الوقف (Breakeven)';
      case 'PARTIAL_TP':
        return 'جني جزئي (TP1)';
      case 'EXIT':
        return 'إغلاق مركز (Exit)';
      case 'MANUAL_CLOSE':
        return 'إغلاق يدوي';
      case 'HALT':
        return 'إيقاف مخاطر (Halt)';
      default:
        return 'تحليل وتقييم دوري';
    }
  };

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="تصفية حسب العملة (مثلاً: BTC, SOL...)"
            value={searchCoin}
            onChange={(e) => setSearchCoin(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'ENTER_LONG', label: 'صفقات الشراء' },
            { id: 'ENTER_SHORT', label: 'صفقات البيع' },
            { id: 'MOVE_SL_BREAKEVEN', label: 'تأمين الصفقات' },
            { id: 'EXIT', label: 'إغلاق المراكز' },
            { id: 'HALT', label: 'إيقافات المخاطر' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterAction(f.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                filterAction === f.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-500 text-xs">
            لا توجد سجلات مطابقة حتى الآن. ستظهر هنا كافة قرارات العقل المدبر وإجراءات التداول الورقي.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {getActionLabelAr(log.action)}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {log.coin}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      ثقة: {log.confidence}%
                    </span>

                    {log.entryPrice && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        بسعر: ${log.entryPrice}
                      </span>
                    )}

                    {log.pnlR !== undefined && (
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                          log.pnlR >= 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.pnlR >= 0 ? '+' : ''}
                        {log.pnlR.toFixed(2)} R
                        {log.pnlUsdt !== undefined && ` (${log.pnlUsdt >= 0 ? '+' : ''}$${log.pnlUsdt.toFixed(2)})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="عرض تفاصيل التفسير"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? 'rotate-180 text-emerald-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Reasoning Paragraph Preview / Expanded */}
                <p
                  className={`text-xs text-slate-300 leading-relaxed font-normal ${
                    !isExpanded ? 'line-clamp-2' : ''
                  }`}
                >
                  {log.reasoningAr}
                </p>

                {isExpanded && log.confluenceGroups && log.confluenceGroups.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-slate-400 font-medium">المجموعات المتوافقة:</span>
                    {log.confluenceGroups.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-800/90 text-indigo-300 border border-slate-700/80 font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
