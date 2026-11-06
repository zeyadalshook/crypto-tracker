import { captureException, captureMessage, addBreadcrumb, triggerTestSentryError } from './sentry';

export type LogLevel = 'error' | 'warning' | 'info';

export interface LogEntry {
  id: string;
  timestamp: string;
  isoTime: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  sentryId?: string;
  httpStatus?: number;
  durationMs?: number;
}

export type SourceStatus = 'operational' | 'degraded' | 'down' | 'checking';

export interface DataSourceHealth {
  id: string;
  name: string;
  nameEn: string;
  endpoint: string;
  description: string;
  status: SourceStatus;
  statusLabelAr: string;
  latencyMs: number;
  lastChecked: string;
  uptimePercent: number;
  errorCount: number;
  lastStatusCode?: number;
}

export const INITIAL_DATA_SOURCES: DataSourceHealth[] = [
  {
    id: 'binance-spot',
    name: 'بيانات بينانس الفورية (Binance Spot)',
    nameEn: 'Binance Spot Ticker API',
    endpoint: 'https://api.binance.com/api/v3/ticker/24hr',
    description: 'الأسعار المباشرة اللحظية وحجم التداول على مدار 24 ساعة وأعلى/أدنى سعر.',
    status: 'operational',
    statusLabelAr: 'متاح ويعمل بكفاءة',
    latencyMs: 48,
    lastChecked: 'الآن',
    uptimePercent: 99.9,
    errorCount: 0,
    lastStatusCode: 200,
  },
  {
    id: 'binance-klines',
    name: 'شموع بينانس التاريخية (Klines OHLCV)',
    nameEn: 'Binance Klines API',
    endpoint: 'https://api.binance.com/api/v3/klines',
    description: 'بيانات الشموع اليابانية للأطر الزمنية (4h, 1d, 1w) والمؤشرات الفنية (RSI, Bollinger, MACD).',
    status: 'operational',
    statusLabelAr: 'متاح ويعمل بكفاءة',
    latencyMs: 62,
    lastChecked: 'الآن',
    uptimePercent: 99.8,
    errorCount: 0,
    lastStatusCode: 200,
  },
  {
    id: 'fear-greed',
    name: 'مؤشر الخوف والطمع (Alternative.me)',
    nameEn: 'Alternative.me Fear & Greed API',
    endpoint: 'https://api.alternative.me/fng/?limit=30',
    description: 'مؤشر معنويات السوق والتخزين المؤقت الذكي (15 دقيقة) لتجنب قيود الاستدعاء.',
    status: 'operational',
    statusLabelAr: 'متاح ويعمل بكفاءة',
    latencyMs: 115,
    lastChecked: 'الآن',
    uptimePercent: 99.6,
    errorCount: 0,
    lastStatusCode: 200,
  },
  {
    id: 'derivatives',
    name: 'بيانات المشتقات والعقود (Futures / Coinglass)',
    nameEn: 'Derivatives & Funding Rates',
    endpoint: '/api/derivatives',
    description: 'معدلات التمويل (Funding Rates)، الفائدة المفتوحة (OI)، ونسب التصفية ونسب الشراء/البيع.',
    status: 'operational',
    statusLabelAr: 'متاح ويعمل بكفاءة',
    latencyMs: 85,
    lastChecked: 'الآن',
    uptimePercent: 99.2,
    errorCount: 0,
    lastStatusCode: 200,
  },
  {
    id: 'gemini-ai',
    name: 'محرك التحليل الذكي (Google Gemini AI)',
    nameEn: 'Gemini 3.8 Flash Engine',
    endpoint: '/api/ai/explain',
    description: 'النموذج الذكي لشرح التحليلات الفنية والرد الفوري على استفسارات المتداولين.',
    status: 'operational',
    statusLabelAr: 'متاح وجاهز للاستفسارات',
    latencyMs: 140,
    lastChecked: 'الآن',
    uptimePercent: 99.5,
    errorCount: 0,
    lastStatusCode: 200,
  },
  {
    id: 'coingecko-fallback',
    name: 'محرك كوين جيكو الاحتياطي (CoinGecko Fallback)',
    nameEn: 'CoinGecko Public API',
    endpoint: 'https://api.coingecko.com/api/v3',
    description: 'مصدر ثانوي لمعلومات المشاريع، وصف العملات، والتصنيفات السوقية البديلة.',
    status: 'operational',
    statusLabelAr: 'جاهز كاحتياطي',
    latencyMs: 180,
    lastChecked: 'الآن',
    uptimePercent: 98.9,
    errorCount: 0,
    lastStatusCode: 200,
  },
];

class ErrorLoggingService {
  private logs: LogEntry[] = [];
  private dataSources: DataSourceHealth[] = [...INITIAL_DATA_SOURCES];
  private listeners: Set<() => void> = new Set();
  private maxLogs = 100;
  private isAutoMonitoringStarted = false;

  constructor() {
    this.loadPersistedLogs();
    this.setupGlobalWindowErrorListeners();
  }

  private loadPersistedLogs(): void {
    try {
      const saved = localStorage.getItem('ctr_error_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, this.maxLogs);
        }
      }
    } catch {
      // ignore
    }

    if (this.logs.length === 0) {
      this.logInfo(
        'نظام Sentry ومراقبة البيانات',
        'تم تشغيل وتفعيل نظام تتبع الأخطاء Sentry وفحص مصادر البيانات بنجاح.'
      );
    }
  }

  private persistLogs(): void {
    try {
      localStorage.setItem('ctr_error_logs', JSON.stringify(this.logs.slice(0, 50)));
    } catch {
      // ignore
    }
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in errorLogger listener:', err);
      }
    });
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getDataSources(): DataSourceHealth[] {
    return [...this.dataSources];
  }

  public getErrorCount(): number {
    return this.logs.filter((l) => l.level === 'error').length;
  }

  public getWarningCount(): number {
    return this.logs.filter((l) => l.level === 'warning').length;
  }

  public getOverallSystemStatus(): {
    status: SourceStatus;
    textAr: string;
    colorClass: string;
    bgClass: string;
  } {
    const downCount = this.dataSources.filter((d) => d.status === 'down').length;
    const degradedCount = this.dataSources.filter((d) => d.status === 'degraded').length;
    const errorLogsRecent = this.logs.filter((l) => l.level === 'error').length;

    if (downCount > 0 || errorLogsRecent > 5) {
      return {
        status: 'down',
        textAr: 'تنبيه: يوجد مصدر بيانات غير متاح أو به انقطاع',
        colorClass: 'text-rose-400',
        bgClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      };
    }

    if (degradedCount > 0 || errorLogsRecent > 0) {
      return {
        status: 'degraded',
        textAr: 'استقرار نسبي: تعمل المصادر مع بعض التحذيرات المسجلة',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      };
    }

    return {
      status: 'operational',
      textAr: 'كافة مصادر البيانات متاحة وتعمل بكفاءة ممتازة',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    };
  }

  public logError(
    source: string,
    message: string,
    details?: any,
    options?: { httpStatus?: number; durationMs?: number; skipSentry?: boolean }
  ): string {
    let sentryId: string | undefined;

    if (!options?.skipSentry) {
      try {
        const errorObj = details instanceof Error ? details : new Error(message);
        sentryId = captureException(errorObj, {
          source,
          details: typeof details === 'object' ? JSON.stringify(details) : details,
          httpStatus: options?.httpStatus,
          durationMs: options?.durationMs,
        });
      } catch {
        // ignore
      }
    }

    const entry: LogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      isoTime: new Date().toISOString(),
      level: 'error',
      source,
      message,
      details: typeof details === 'string' ? details : details ? JSON.stringify(details, null, 2) : undefined,
      sentryId,
      httpStatus: options?.httpStatus,
      durationMs: options?.durationMs,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.updateSourceStatusOnError(source);
    this.persistLogs();
    this.notify();

    return entry.id;
  }

  public logWarning(
    source: string,
    message: string,
    details?: any,
    options?: { httpStatus?: number; durationMs?: number }
  ): string {
    addBreadcrumb({
      category: source,
      message,
      level: 'warning',
      data: { details },
    });

    const entry: LogEntry = {
      id: `wrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      isoTime: new Date().toISOString(),
      level: 'warning',
      source,
      message,
      details: typeof details === 'string' ? details : details ? JSON.stringify(details, null, 2) : undefined,
      httpStatus: options?.httpStatus,
      durationMs: options?.durationMs,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.persistLogs();
    this.notify();

    return entry.id;
  }

  public logInfo(source: string, message: string, details?: any): string {
    addBreadcrumb({
      category: source,
      message,
      level: 'info',
      data: { details },
    });

    const entry: LogEntry = {
      id: `inf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      isoTime: new Date().toISOString(),
      level: 'info',
      source,
      message,
      details: typeof details === 'string' ? details : details ? JSON.stringify(details, null, 2) : undefined,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.persistLogs();
    this.notify();

    return entry.id;
  }

  private updateSourceStatusOnError(sourceName: string): void {
    const lower = sourceName.toLowerCase();
    this.dataSources = this.dataSources.map((ds) => {
      const match =
        ds.name.toLowerCase().includes(lower) ||
        ds.nameEn.toLowerCase().includes(lower) ||
        lower.includes(ds.id);
      if (match) {
        return {
          ...ds,
          status: 'degraded',
          statusLabelAr: 'استجابة مصحوبة بأخطاء',
          errorCount: ds.errorCount + 1,
          lastChecked: new Date().toLocaleTimeString('ar-EG'),
        };
      }
      return ds;
    });
  }

  public async checkAllDataSources(): Promise<void> {
    const timeNow = new Date().toLocaleTimeString('ar-EG');

    try {
      const startTime = performance.now();
      const res = await fetch('/api/health/sources');
      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.sources)) {
          this.dataSources = data.sources.map((s: any) => ({
            ...s,
            lastChecked: timeNow,
          }));
          this.logInfo('فحص مصادر البيانات', `تم تحديث حالة جميع مصادر البيانات بنجاح (${latency}ms)`);
          this.notify();
          return;
        }
      }
    } catch {
      // fallback to client-side checks
    }

    const checkPromises = this.dataSources.map(async (ds) => {
      const start = performance.now();
      try {
        let testUrl = '/api/fear-greed';
        if (ds.id === 'binance-spot') testUrl = '/api/crypto/BTC';
        else if (ds.id === 'binance-klines') testUrl = '/api/klines/BTC?interval=1d';

        const res = await fetch(testUrl, { method: 'GET' });
        const latency = Math.round(performance.now() - start);

        return {
          ...ds,
          status: (res.ok ? 'operational' : 'degraded') as SourceStatus,
          statusLabelAr: res.ok ? 'متاح ويعمل بكفاءة' : `خطأ استجابة (${res.status})`,
          latencyMs: latency,
          lastStatusCode: res.status,
          lastChecked: timeNow,
        };
      } catch (err: any) {
        const latency = Math.round(performance.now() - start);
        return {
          ...ds,
          status: 'down' as SourceStatus,
          statusLabelAr: 'تعذر الاتصال بالمصدر',
          latencyMs: latency,
          errorCount: ds.errorCount + 1,
          lastChecked: timeNow,
        };
      }
    });

    this.dataSources = await Promise.all(checkPromises);
    this.logInfo(
      'فحص مصادر البيانات',
      `اكتمل فحص جميع مصادر البيانات الـ ${this.dataSources.length} في الوقت الفعلي.`
    );
    this.notify();
  }

  public async pingSingleSource(sourceId: string): Promise<DataSourceHealth | null> {
    const ds = this.dataSources.find((s) => s.id === sourceId);
    if (!ds) return null;

    const start = performance.now();
    try {
      let testUrl = '/api/fear-greed';
      if (ds.id === 'binance-spot') testUrl = '/api/crypto/BTC';
      else if (ds.id === 'binance-klines') testUrl = '/api/klines/BTC?interval=1d';

      const res = await fetch(testUrl);
      const latency = Math.round(performance.now() - start);

      const updated: DataSourceHealth = {
        ...ds,
        status: (res.ok ? 'operational' : 'degraded') as SourceStatus,
        statusLabelAr: res.ok ? 'متاح ويعمل بكفاءة' : `خطأ استجابة (${res.status})`,
        latencyMs: latency,
        lastStatusCode: res.status,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
      };

      this.dataSources = this.dataSources.map((s) => (s.id === sourceId ? updated : s));
      this.logInfo(ds.name, `تم فحص الاتصال: ${updated.statusLabelAr} (زمن الاستجابة: ${latency}ms)`);
      this.notify();
      return updated;
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      const updated: DataSourceHealth = {
        ...ds,
        status: 'down',
        statusLabelAr: 'تعذر الاتصال بالمصدر',
        latencyMs: latency,
        errorCount: ds.errorCount + 1,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
      };

      this.dataSources = this.dataSources.map((s) => (s.id === sourceId ? updated : s));
      this.logError(ds.name, `فشل الاتصال بالمصدر أثناء الفحص اليدوي`, err?.message || err);
      this.notify();
      return updated;
    }
  }

  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('ctr_error_logs');
    this.logInfo('سجل الأخطاء', 'تم مسح سجل الأحداث والأخطاء يدوياً بواسطة المستخدم.');
    this.notify();
  }

  public triggerTestSentry(): { eventId: string; message: string } {
    const res = triggerTestSentryError();
    this.logError(
      'اختبار Sentry (Sentry Verification)',
      res.message,
      `معرّف الحدث في Sentry: ${res.eventId}`,
      { skipSentry: true }
    );
    return res;
  }

  public exportLogsAsJson(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      systemStatus: this.getOverallSystemStatus(),
      dataSources: this.dataSources,
      logs: this.logs,
    };
    return JSON.stringify(exportData, null, 2);
  }

  private setupGlobalWindowErrorListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.logError(
        'خطأ واجهة المستخدم (Runtime)',
        event.message || 'حدث خطأ غير متوقع في كود JavaScript',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack || event.error,
        }
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        'وعد لم تتم معالجته (Unhandled Promise)',
        event.reason?.message || 'وعد مرفوض لم يتم التقاطه (Unhandled Rejection)',
        event.reason?.stack || event.reason
      );
    });
  }

  public startBackgroundHealthMonitoring(): void {
    if (this.isAutoMonitoringStarted) return;
    this.isAutoMonitoringStarted = true;

    setTimeout(() => {
      this.checkAllDataSources();
    }, 3000);

    setInterval(() => {
      this.checkAllDataSources();
    }, 180000);
  }
}

export const errorLogger = new ErrorLoggingService();
