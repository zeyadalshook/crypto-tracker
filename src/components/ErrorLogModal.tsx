import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Activity,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  Zap,
  Server,
  Layers,
  Clock,
  Bug,
} from 'lucide-react';
import {
  errorLogger,
  LogEntry,
  LogLevel,
  DataSourceHealth,
  SourceStatus,
} from '../services/errorLogger';
import { getSentryStatus } from '../services/sentry';

interface ErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'sources' | 'logs' | 'sentry';
}

export function ErrorLogModal({ isOpen, onClose, defaultTab = 'sources' }: ErrorLogModalProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'logs' | 'sentry'>(defaultTab);
  const [logs, setLogs] = useState<LogEntry[]>(() => errorLogger.getLogs());
  const [dataSources, setDataSources] = useState<DataSourceHealth[]>(() =>
    errorLogger.getDataSources()
  );
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshingSources, setIsRefreshingSources] = useState(false);
  const [pingingSourceId, setPingingSourceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testErrorToast, setTestErrorToast] = useState<{ eventId: string; message: string } | null>(
    null
  );

  const searchInputId = useId();

  useEffect(() => {
    if (!isOpen) return;

    setLogs(errorLogger.getLogs());
    setDataSources(errorLogger.getDataSources());

    const unsubscribe = errorLogger.subscribe(() => {
      setLogs(errorLogger.getLogs());
      setDataSources(errorLogger.getDataSources());
    });

    return unsubscribe;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const sentryStatus = getSentryStatus();
  const systemStatus = errorLogger.getOverallSystemStatus();
  const errorCount = errorLogger.getErrorCount();
  const warningCount = errorLogger.getWarningCount();

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSource = log.source.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchSentryId = log.sentryId?.toLowerCase().includes(q);
      return matchMsg || matchSource || matchDetails || matchSentryId;
    }
    return true;
  });

  const handleRefreshAll = async () => {
    setIsRefreshingSources(true);
    try {
      await errorLogger.checkAllDataSources();
    } finally {
      setIsRefreshingSources(false);
    }
  };

  const handlePingSource = async (id: string) => {
    setPingingSourceId(id);
    try {
      await errorLogger.pingSingleSource(id);
    } finally {
      setPingingSourceId(null);
    }
  };

  const handleTriggerTestSentry = () => {
    const res = errorLogger.triggerTestSentry();
    setTestErrorToast(res);
    setTimeout(() => {
      setTestErrorToast(null);
    }, 6000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = errorLogger.exportLogsAsJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-sentry-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: SourceStatus) => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            متاح ويعمل
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            استجابة بطيئة / تنبيه
          </span>
        );
      case 'down':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            غير متوفر / خطأ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            جارِ الفحص...
          </span>
        );
    }
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (ms < 300) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl bg-[#090f0c] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/50 flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-950/80 bg-[#060c09]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  مركز تتبع الأخطاء ومراقبة مصادر البيانات
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sentry v8 Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع لحظي مباشر للأخطاء وتوافر واجهات API مع إحصائيات زمن الاستجابة (Latency)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global System Banner & Sentry Test Toast */}
        {testErrorToast && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-500/50 flex items-center justify-between gap-3 text-xs text-purple-200 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white">تم التقاط الخطأ الاختباري بواسطة Sentry بنجاح! </span>
                <span className="font-mono text-purple-300">({testErrorToast.eventId})</span>
              </div>
            </div>
            <button
              onClick={() => handleCopy(testErrorToast.eventId, 'toast-event')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-100 text-[11px]"
            >
              {copiedId === 'toast-event' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              نسخ Event ID
            </button>
          </div>
        )}

        {/* Quick Health Strip */}
        <div className="px-5 py-3 bg-[#0a120e] border-b border-emerald-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400">الحالة العامة للمنظومة:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${systemStatus.bgClass}`}>
              {systemStatus.status === 'operational' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {systemStatus.textAr}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTriggerTestSentry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-purple-300 hover:bg-purple-500/25 transition-all text-xs font-semibold shadow-sm"
              title="إرسال استثناء اختباري للتحقق من اتصال Sentry في الوقت الفعلي"
            >
              <Bug className="w-3.5 h-3.5 text-purple-400" />
              <span>إرسال خطأ اختباري لـ Sentry</span>
            </button>

            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingSources}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSources ? 'animate-spin' : ''}`} />
              <span>فحص شامل للمصادر</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-emerald-950/80 bg-[#070d0a] px-5">
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'sources'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>حالة مصادر البيانات ({dataSources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>سجل الأخطاء الفوري</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                {errorCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sentry')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'sentry'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>تشخيصات Sentry والجلسة</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {dataSources.map((ds) => {
                  const isPinging = pingingSourceId === ds.id;
                  return (
                    <div
                      key={ds.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-emerald-950/90 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-white text-sm leading-snug">
                            {ds.name}
                          </h3>
                          {getStatusBadge(ds.status)}
                        </div>

                        <div className="text-[11px] font-mono text-emerald-400/80 mb-2 truncate" title={ds.nameEn}>
                          {ds.nameEn}
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          {ds.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">زمن الاستجابة:</span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-xs ${getLatencyColor(ds.latencyMs)}`}>
                            {ds.latencyMs} ms
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">نسبة التوفر (Uptime):</span>
                          <span className="font-mono text-emerald-400 font-semibold">{ds.uptimePercent}%</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">آخر فحص:</span>
                          <span className="text-slate-300 font-mono text-[11px]">{ds.lastChecked}</span>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={ds.endpoint}>
                            {ds.endpoint}
                          </span>
                          <button
                            onClick={() => handlePingSource(ds.id)}
                            disabled={isPinging}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs transition-colors font-medium disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                            <span>فحص الاتصال</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white">نظام الحماية من انقطاع البيانات (Fallback Architecture):</div>
                  <p className="text-slate-400 leading-relaxed">
                    في حال تعذر الاتصال بأي من واجهات بينانس أو Alternative.me، تقوم المنظومة تلقائياً باستخدام البيانات المخزنة مؤقتاً (In-Memory Cache) ومحركات CoinGecko كاحتياطي لتفادي أي انقطاع في تجربة المستخدم، مع إرسال تقرير فوري إلى Sentry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في رسائل الخطأ، المصادر، أو معرّف Sentry..."
                    className="w-full pl-3 pr-9 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {(['all', 'error', 'warning', 'info'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilterLevel(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filterLevel === lvl
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lvl === 'all' && `الكل (${logs.length})`}
                      {lvl === 'error' && `أخطاء (${errorCount})`}
                      {lvl === 'warning' && `تحذيرات (${warningCount})`}
                      {lvl === 'info' && `معلومات (${logs.filter((l) => l.level === 'info').length})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    title="تصدير السجل كملف JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير JSON</span>
                  </button>
                  <button
                    onClick={() => errorLogger.clearLogs()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-colors"
                    title="مسح السجل بالكامل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح السجل</span>
                  </button>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h4 className="text-base font-bold text-white mb-1">السجل نظيف تماماً</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    لا توجد أخطاء تطابق هذا الفلتر حالياً. يتم تسجيل كافة استثناءات الواجهة واستدعاءات API لحظة بلحظة.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((entry) => {
                    const isExpanded = expandedLogId === entry.id;
                    const isError = entry.level === 'error';
                    const isWarning = entry.level === 'warning';

                    return (
                      <div
                        key={entry.id}
                        className={`p-3.5 rounded-xl border transition-all text-xs ${
                          isError
                            ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                            : isWarning
                            ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {isError ? (
                              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            )}

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">{entry.source}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {entry.timestamp}
                                </span>
                                {entry.sentryId && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 border border-purple-500/40 text-purple-300">
                                    <Zap className="w-2.5 h-2.5" />
                                    Sentry: {entry.sentryId.slice(0, 10)}...
                                  </span>
                                )}
                                {entry.httpStatus && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                    HTTP {entry.httpStatus}
                                  </span>
                                )}
                              </div>

                              <p className="text-slate-200 leading-relaxed font-mono text-[11px] break-words">
                                {entry.message}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {entry.details && (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                              >
                                {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(entry.message + (entry.details ? `\n${entry.details}` : ''), entry.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="نسخ الخطأ"
                            >
                              {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && entry.details && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80">
                            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {entry.details}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sentry' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-950/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">حالة تكامل Sentry SDK</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    STATUS: INITIALIZED & READY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">بيئة التشغيل (Environment):</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs">{sentryStatus.environment}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">إصدار الحزمة (Release):</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs">{sentryStatus.release}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">معرف جلسة المتصفح (Session ID):</span>
                    <span className="font-mono text-slate-300 text-[11px] break-all">{sentryStatus.sessionId}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">الأحداث المسجلة في Sentry:</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs">{sentryStatus.capturedEventCount} حدث</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">عنوان DSN المعتمد:</span>
                  <span className="font-mono text-slate-400 text-[11px] break-all">{sentryStatus.dsnMasked}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تتبع في الوقت الفعلي</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    يتم إرسال أي استثناء غير متوقع في JavaScript أو في شبكة البيانات مباشرة إلى Sentry مع سياق التداول والرمز النشط.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>حاجز الأخطاء (Boundary)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    تم تغليف التطبيق بمكون Sentry ErrorBoundary لضمان عدم توقف واجهة المتداول عند حدوث خطأ غير متوقع.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>مسار الإجراءات (Breadcrumbs)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    يوثق Sentry خطوات المستخدم قبل الخطأ (مثل تغيير الإطار الزمني أو التبديل لـ USDT) لتسهيل تصحيح المشاكل.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-emerald-950/80 bg-[#060c09] flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>نظام المراقبة يعمل في الخلفية ويُحدّث كل 3 دقائق تلقائياً.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
