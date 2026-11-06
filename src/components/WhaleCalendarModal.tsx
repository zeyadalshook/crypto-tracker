import React, { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  AlertTriangle,
  RefreshCw,
  Coins,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Building2,
  ExternalLink,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { Currency, formatCurrency } from '../utils/formatters';

interface WhaleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
}

export const WhaleCalendarModal: React.FC<WhaleCalendarModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'calendar' | 'whales'>('calendar');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [whaleTransfers, setWhaleTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [calRes, whaleRes] = await Promise.all([
        fetch(`/api/calendar/${currentSymbol}`).then((r) => r.json()),
        fetch(`/api/whales/${currentSymbol}`).then((r) => r.json()),
      ]);

      if (Array.isArray(calRes)) setCalendarEvents(calRes);
      if (Array.isArray(whaleRes)) setWhaleTransfers(whaleRes);
    } catch (err) {
      console.error('Failed to fetch whale & calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentSymbol]);

  // Check if there is an event coming in <= 7 days
  const upcomingEvents7d = calendarEvents.filter((ev) => ev.isUpcoming7Days || ev.daysLeft <= 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#06110a] border border-emerald-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  رصد الحيتان والتقويم الاقتصادي لعملة {currentSymbol}
                </h2>
                {upcomingEvents7d.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>حدث هام خلال 7 أيام!</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع تدفقات المحافظ الضخمة، فتح التوكنات، وترقيات الشبكة، ومواعيد بيانات التضخم وقرارات الفيدرالي.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تقويم الأحداث وفتح التوكنات ({calendarEvents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('whales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'whales'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>رادار تحويلات الحيتان الضخمة ({whaleTransfers.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span>جاري استدعاء تدفقات الحيتان وجدول الأحداث القادمة...</span>
            </div>
          ) : activeTab === 'calendar' ? (
            <div className="space-y-3">
              {/* 7-Day Warning Banner if any */}
              {upcomingEvents7d.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block text-sm">
                      تنبيه: يوجد {upcomingEvents7d.length} حدث ذو تأثير مباشر خلال الـ 7 أيام القادمة!
                    </span>
                    <span className="text-amber-200/80 mt-1 block">
                      يرجى الانتباه لتقلبات السيولة المتوقعة وتعديل أهداف وقف الخسارة قبل صدور البيانات أو فتح التوكنات.
                    </span>
                  </div>
                </div>
              )}

              {/* Event Cards */}
              <div className="grid grid-cols-1 gap-3">
                {calendarEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border transition-all ${
                      ev.isUpcoming7Days
                        ? 'bg-slate-900/90 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {ev.category === 'unlock' ? (
                          <Unlock className="w-4 h-4 text-rose-400" />
                        ) : ev.category === 'macro' ? (
                          <Building2 className="w-4 h-4 text-amber-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="font-bold text-sm text-white">{ev.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            ev.impact === 'extreme'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : ev.impact === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {ev.impactLabel}
                        </span>

                        <span className="text-xs font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {ev.date} (باقي {ev.daysLeft} أيام)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>آخر التحويلات الكبيرة المرصودة على السلسلة (On-Chain Transfers):</span>
                <span className="text-[11px] text-slate-500">محدث كل 5 دقائق</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {whaleTransfers.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            tx.type === 'inflow'
                              ? 'bg-rose-400'
                              : tx.type === 'outflow'
                              ? 'bg-emerald-400'
                              : 'bg-sky-400'
                          }`}
                        />
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {tx.action}
                        </span>
                        <span className="font-mono text-xs text-slate-500">({tx.hash})</span>
                      </div>

                      <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tx.timestamp}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">حجم التحويل</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {tx.amount.toLocaleString()} {currentSymbol}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          (${tx.amountUsd.toLocaleString()})
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">من / إلى</span>
                        <div className="text-slate-300 truncate font-mono text-[11px]">{tx.from}</div>
                        <div className="text-slate-400 truncate font-mono text-[11px] mt-0.5">
                          ← {tx.to}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">الأثر الفني المتوقع</span>
                        <span
                          className={`font-semibold text-xs mt-0.5 block ${
                            tx.type === 'inflow'
                              ? 'text-rose-300'
                              : tx.type === 'outflow'
                              ? 'text-emerald-300'
                              : 'text-sky-300'
                          }`}
                        >
                          {tx.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>بيانات السلسلة العامة Whale Alert & Trading Economics</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
