import React, { useState } from 'react';
import {
  BrainAlert,
  getBrainAlerts,
  markAlertAsRead,
  clearAllAlerts,
  loadBrainSettings,
  saveBrainSettings,
} from '../../lib/brain/brainStorage';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Check,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Filter,
} from 'lucide-react';

interface BrainAlertsProps {
  onRefresh?: () => void;
}

export const BrainAlerts: React.FC<BrainAlertsProps> = ({ onRefresh }) => {
  const [alerts, setAlerts] = useState<BrainAlert[]>(getBrainAlerts());
  const [filterType, setFilterType] = useState<string>('all');
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const reload = () => {
    setAlerts(getBrainAlerts());
    if (onRefresh) onRefresh();
  };

  const handleMarkAsRead = (id: string) => {
    markAlertAsRead(id);
    reload();
  };

  const handleClearAll = () => {
    clearAllAlerts();
    reload();
  };

  const handleRequestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('المتصفح لا يدعم واجهة الإشعارات.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPerm(permission);
      if (permission === 'granted') {
        const settings = loadBrainSettings();
        settings.browserNotificationsEnabled = true;
        saveBrainSettings(settings);
        new Notification('العقل المدبر للتداول', {
          body: 'تم تفعيل إشعارات المتصفح بنجاح! ستصلك تنبيهات الصفقات والإشارات فورياً.',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !a.read;
    if (filterType === 'signals') return a.type === 'SIGNAL_ENTER' || a.type === 'SIGNAL_EXIT';
    if (filterType === 'trades') return a.type === 'TRADE_OPENED' || a.type === 'TRADE_CLOSED' || a.type === 'SL_BREAKEVEN';
    if (filterType === 'risk') return a.type === 'RISK_HALT' || a.type === 'KILL_SWITCH';
    return true;
  });

  const getSeverityBadge = (sev: BrainAlert['severity']) => {
    switch (sev) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  const getSeverityIcon = (sev: BrainAlert['severity']) => {
    switch (sev) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'danger':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* Alert Center Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>مركز تنبيهات العقل المدبر</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {alerts.filter((a) => !a.read).length} غير مقروء
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              إشعارات فورية بالإشارات المؤكدة، التنفيذات الورقية، وتحذيرات طبقة المخاطر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {browserPerm !== 'granted' && (
            <button
              onClick={handleRequestBrowserNotifications}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              تفعيل إشعارات المتصفح
            </button>
          )}

          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 rounded-lg text-xs font-medium text-slate-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              مسح الكل
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
        {[
          { id: 'all', label: 'جميع التنبيهات' },
          { id: 'unread', label: 'غير المقروءة' },
          { id: 'signals', label: 'الإشارات فقط' },
          { id: 'trades', label: 'الصفقات الورقية' },
          { id: 'risk', label: 'حماية المخاطر والـ Kill Switch' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
              filterType === f.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-500 text-xs">
            لا توجد تنبيهات مطابقة لهذا الفلتر حالياً.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleMarkAsRead(alert.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                alert.read
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                  : 'bg-slate-900/90 border-slate-800 shadow-lg'
              } hover:border-slate-700`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-100">
                      {alert.titleAr}
                    </span>
                    {alert.coin !== 'ALL' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold border border-slate-700">
                        {alert.coin}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {alert.messageAr}
                  </p>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    • {new Date(alert.timestamp).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              {!alert.read && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2 shadow-[0_0_6px_#10b981]" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
