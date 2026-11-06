import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Server,
  RefreshCw,
  Terminal,
  Bug,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { errorLogger, DataSourceHealth, LogEntry } from '../services/errorLogger';

interface FooterStatusRibbonProps {
  onOpenErrorModal: (tab?: 'sources' | 'logs' | 'sentry') => void;
}

export function FooterStatusRibbon({ onOpenErrorModal }: FooterStatusRibbonProps) {
  const [dataSources, setDataSources] = useState<DataSourceHealth[]>(() =>
    errorLogger.getDataSources()
  );
  const [errorCount, setErrorCount] = useState<number>(() => errorLogger.getErrorCount());
  const [warningCount, setWarningCount] = useState<number>(() => errorLogger.getWarningCount());
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    const unsubscribe = errorLogger.subscribe(() => {
      setDataSources(errorLogger.getDataSources());
      setErrorCount(errorLogger.getErrorCount());
      setWarningCount(errorLogger.getWarningCount());
    });
    return unsubscribe;
  }, []);

  const handlePingAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinging(true);
    try {
      await errorLogger.checkAllDataSources();
    } finally {
      setIsPinging(false);
    }
  };

  const systemStatus = errorLogger.getOverallSystemStatus();
  const operationalCount = dataSources.filter((d) => d.status === 'operational').length;

  return (
    <div className="w-full bg-[#050b08]/90 border-t border-emerald-950/80 py-2.5 px-4 text-xs backdrop-blur-md">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Sources Quick Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            onClick={() => onOpenErrorModal('sources')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold cursor-pointer hover:bg-emerald-500/20 transition-colors"
            title="انقر لعرض تفاصيل توافر مصادر البيانات"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>مصادر البيانات:</span>
            <span className="font-mono text-white">
              {operationalCount}/{dataSources.length} متاحة
            </span>
          </div>

          {dataSources.slice(0, 3).map((ds) => {
            const isOperational = ds.status === 'operational';
            return (
              <div
                key={ds.id}
                onClick={() => onOpenErrorModal('sources')}
                className={`hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono cursor-pointer transition-colors ${
                  isOperational
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300 hover:border-rose-500'
                }`}
                title={`${ds.name} - ${ds.statusLabelAr}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOperational ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
                  }`}
                />
                <span className="text-slate-200">
                  {ds.id === 'binance-spot' ? 'Binance' : ds.id === 'fear-greed' ? 'Alternative.me' : 'Gemini AI'}
                </span>
                <span className="text-slate-500">|</span>
                <span className={ds.latencyMs < 100 ? 'text-emerald-400' : 'text-amber-400'}>
                  {ds.latencyMs}ms
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Sentry Tracker & Error Log Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenErrorModal('logs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
              errorCount > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-sm shadow-rose-950'
                : warningCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-900/80 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
            }`}
            title="عرض سجل الأخطاء وتتبع Sentry في الوقت الفعلي"
          >
            {errorCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>سجل الأخطاء (Sentry)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                errorCount > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {errorCount > 0 ? `${errorCount} أخطاء` : '0 أخطاء'}
            </span>
          </button>

          <button
            onClick={handlePingAll}
            disabled={isPinging}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors text-xs disabled:opacity-50"
            title="فحص فوري لاتصال مصادر البيانات"
          >
            <RefreshCw className={`w-3 h-3 text-emerald-400 ${isPinging ? 'animate-spin' : ''}`} />
            <span>فحص المصادر</span>
          </button>

          <div
            onClick={() => onOpenErrorModal('sentry')}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-mono cursor-pointer hover:bg-purple-500/20 transition-colors"
            title="تتبع Sentry نشط"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Sentry Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
