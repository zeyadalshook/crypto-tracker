import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Send,
  Mail,
  Smartphone,
  Moon,
  Clock,
  Sparkles,
  RotateCcw,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
} from 'lucide-react';
import { SmartAlert } from '../types/crypto';
import { loadStoredAlerts, saveStoredAlerts } from '../services/alertManager';

interface SmartAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
}

export const SmartAlertsModal: React.FC<SmartAlertsModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'create_price' | 'my_alerts' | 'channels' | 'compound' | 'morning_brief'>('create_price');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'triggered'>('all');

  // Form State for Custom Price Alert
  const [targetSymbol, setTargetSymbol] = useState<string>(currentSymbol);
  const [condition, setCondition] = useState<'price_above' | 'price_below'>('price_above');
  const [targetPrice, setTargetPrice] = useState<number>(() => {
    return Math.round(currentPrice * 1.05 * 100) / 100;
  });
  const [customNote, setCustomNote] = useState<string>('');

  // Channel selections
  const [enableEmail, setEnableEmail] = useState<boolean>(true);
  const [enableSms, setEnableSms] = useState<boolean>(true);
  const [enableInApp, setEnableInApp] = useState<boolean>(true);

  // Contact Info
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('crypto_alert_email') || 'zeyadalshook9@gmail.com';
  });
  const [userPhone, setUserPhone] = useState<string>(() => {
    return localStorage.getItem('crypto_alert_phone') || '+9647701234567';
  });

  // Test Delivery Feedback
  const [testingChannel, setTestingChannel] = useState<'email' | 'sms' | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Loaded Alerts
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => {
    const stored = loadStoredAlerts();
    if (stored.length > 0) return stored;

    // Default sample alerts if empty
    return [
      {
        id: 'alt-default-1',
        symbol: currentSymbol,
        type: 'price_above',
        targetValue: Math.round(currentPrice * 1.05 * 100) / 100,
        active: true,
        triggered: false,
        message: `تنبيه عند صعود ${currentSymbol} فوق مستوى $${(currentPrice * 1.05).toFixed(2)}`,
        note: 'مقاومة رئيسية وجني أرباح أول',
        channels: { email: true, sms: true, inApp: true },
        email: 'zeyadalshook9@gmail.com',
        phone: '+9647701234567',
      },
      {
        id: 'alt-default-2',
        symbol: currentSymbol,
        type: 'price_below',
        targetValue: Math.round(currentPrice * 0.95 * 100) / 100,
        active: true,
        triggered: false,
        message: `تنبيه عند هبوط ${currentSymbol} تحت مستوى $${(currentPrice * 0.95).toFixed(2)}`,
        note: 'دعم مهم وفرصة إعادة شراء',
        channels: { email: true, sms: false, inApp: true },
        email: 'zeyadalshook9@gmail.com',
      },
    ];
  });

  // Compound alerts
  const [compoundAlerts, setCompoundAlerts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_compound_alerts');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'cmp-1',
        name: 'إشارة شراء ذهبية مركبة',
        formula: 'RSI < 30 و السعر فوق EMA200 و الحجم أعلى من المتوسط بـ 20%',
        active: true,
        symbol: currentSymbol,
      },
      {
        id: 'cmp-2',
        name: 'إشارة جني أرباح وتحذير قمة',
        formula: 'RSI > 75 و ملامسة المقاومة R1 و دايفرجنس سلبي على MACD',
        active: true,
        symbol: currentSymbol,
      },
    ];
  });

  // Save contacts and alerts
  useEffect(() => {
    saveStoredAlerts(alerts);
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('crypto_compound_alerts', JSON.stringify(compoundAlerts));
  }, [compoundAlerts]);

  useEffect(() => {
    localStorage.setItem('crypto_alert_email', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('crypto_alert_phone', userPhone);
  }, [userPhone]);

  // Update targetSymbol when currentSymbol changes
  useEffect(() => {
    setTargetSymbol(currentSymbol);
    if (condition === 'price_above') {
      setTargetPrice(Math.round(currentPrice * 1.05 * 100) / 100);
    } else {
      setTargetPrice(Math.round(currentPrice * 0.95 * 100) / 100);
    }
  }, [currentSymbol, currentPrice, condition]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Percentage quick shortcuts
  const applyPercentOffset = (pct: number) => {
    const newPrice = currentPrice * (1 + pct / 100);
    const rounded = newPrice >= 1 ? Math.round(newPrice * 100) / 100 : parseFloat(newPrice.toFixed(6));
    setTargetPrice(rounded);
    if (pct >= 0) {
      setCondition('price_above');
    } else {
      setCondition('price_below');
    }
  };

  // Add custom price alert
  const handleCreatePriceAlert = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetPrice || targetPrice <= 0) {
      alert('يرجى تحديد مستوى سعر صحيح');
      return;
    }

    const isAbove = condition === 'price_above';
    const directionAr = isAbove ? 'صعود السعر وتجاوز' : 'هبوط السعر وكسر';
    const newAlert: SmartAlert = {
      id: `alert-${Date.now()}`,
      symbol: targetSymbol.toUpperCase(),
      type: condition,
      targetValue: targetPrice,
      active: true,
      triggered: false,
      message: `تنبيه عند ${directionAr} مستوى $${targetPrice.toLocaleString()}`,
      note: customNote.trim() || (isAbove ? 'مقاومة سعرية مستهدفة' : 'دعم سعري مستهدف'),
      channels: {
        email: enableEmail,
        sms: enableSms,
        inApp: enableInApp,
      },
      email: enableEmail ? userEmail : undefined,
      phone: enableSms ? userPhone : undefined,
    };

    setAlerts([newAlert, ...alerts]);
    setCustomNote('');
    setActiveTab('my_alerts');
  };

  // Test SMS / Email Delivery
  const handleTestDelivery = async (channel: 'email' | 'sms') => {
    setTestingChannel(channel);
    setTestResult(null);

    const recipient = channel === 'email' ? userEmail : userPhone;
    try {
      const res = await fetch('/api/alerts/test-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          recipient,
          symbol: currentSymbol,
          currentPrice,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          type: 'success',
          message: data.messageAr || `تم إرسال تجربة التنبيه بنجاح إلى ${recipient}`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: data.error || 'فشل إرسال الإشعار التجريبي',
        });
      }
    } catch (err: any) {
      setTestResult({
        type: 'error',
        message: err.message || 'خطأ في الاتصال بالخادم',
      });
    } finally {
      setTestingChannel(null);
    }
  };

  // Toggle alert active
  const handleToggleAlert = (id: string) => {
    setAlerts(
      alerts.map((al) => {
        if (al.id === id) {
          return { ...al, active: !al.active };
        }
        return al;
      })
    );
  };

  // Re-arm triggered alert
  const handleRearmAlert = (id: string) => {
    setAlerts(
      alerts.map((al) => {
        if (al.id === id) {
          return {
            ...al,
            active: true,
            triggered: false,
            triggeredAt: undefined,
            deliveryStatus: undefined,
          };
        }
        return al;
      })
    );
  };

  // Delete alert
  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((al) => al.id !== id));
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((al) => {
    if (filterStatus === 'active') return al.active && !al.triggered;
    if (filterStatus === 'triggered') return al.triggered;
    return true;
  });

  const activeCount = alerts.filter((a) => a.active && !a.triggered).length;
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-alerts-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-[#06120b] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="smart-alerts-title" className="text-lg sm:text-xl font-black text-white">
                  التنبيهات السعرية المخصصة (Custom Price Alerts)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  SMS · البريد الإلكتروني · فوري
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تنبيهات لحظية عند وصول السعر للمستوى المستهدف مع إرسال رسائل نصية قصيرة SMS وبريد إلكتروني
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-emerald-950/70 pb-2.5 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('create_price')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'create_price'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ضبط تنبيه جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('my_alerts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'my_alerts'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>تنبيهاتي النشطة</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] font-mono text-emerald-300">
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'channels'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>إعدادات واختبار الرسائل (SMS & Email)</span>
          </button>

          <button
            onClick={() => setActiveTab('compound')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'compound'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تنبيهات فنية مركبة</span>
          </button>
        </div>

        {/* TAB 1: Create Custom Price Alert */}
        {activeTab === 'create_price' && (
          <form onSubmit={handleCreatePriceAlert} className="space-y-4 text-xs overflow-y-auto pr-1">
            {/* Top Info Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-white text-sm font-mono">{targetSymbol}/USDT</span>
                <span className="text-slate-400 text-xs">السعر اللحظي:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  ${currentPrice >= 1 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(6)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                سيتم إطلاق التنبيه وإرساله فور مطابقة السعر مع الهدف.
              </div>
            </div>

            {/* Condition & Target Price Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Condition Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">1. اتجاه شرط التفعيل:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCondition('price_above');
                      if (targetPrice <= currentPrice) {
                        setTargetPrice(Math.round(currentPrice * 1.05 * 100) / 100);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold transition-all ${
                      condition === 'price_above'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>صعود فوق الهدف (≥)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCondition('price_below');
                      if (targetPrice >= currentPrice) {
                        setTargetPrice(Math.round(currentPrice * 0.95 * 100) / 100);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold transition-all ${
                      condition === 'price_below'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <span>هبوط تحت الهدف (≤)</span>
                  </button>
                </div>
              </div>

              {/* Target Price Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">2. مستوى السعر المستهدف ($):</label>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {targetPrice > currentPrice
                      ? `+${(((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`
                      : `${(((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`}
                  </span>
                </div>

                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/35 rounded-xl text-base font-black text-white font-mono focus:outline-none focus:border-emerald-400 shadow-inner"
                  required
                />

                {/* Quick % Offset Buttons */}
                <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-slate-500 whitespace-nowrap ml-1">نسب سريعة:</span>
                  {[
                    { label: '+2%', val: 2 },
                    { label: '+5%', val: 5 },
                    { label: '+10%', val: 10 },
                    { label: '+20%', val: 20 },
                    { label: '-2%', val: -2 },
                    { label: '-5%', val: -5 },
                    { label: '-10%', val: -10 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => applyPercentOffset(btn.val)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] border transition-colors whitespace-nowrap ${
                        btn.val > 0
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/80'
                          : 'bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900/80'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification Channels Selection (The Core User Request) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  3. قنوات استلام التنبيه (رسالة نصية SMS أو بريد إلكتروني):
                </span>
                <span className="text-[10px] text-slate-400">حدد طريقة التوصيل المفضلة</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* SMS Channel */}
                <div className={`p-3 rounded-xl border transition-all ${enableSms ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900/40 border-slate-800'}`}>
                  <label className="flex items-center justify-between cursor-pointer mb-2">
                    <span className="flex items-center gap-2 font-bold text-slate-200">
                      <Smartphone className="w-4 h-4 text-sky-400" />
                      <span>رسالة نصية قصيرة (SMS)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enableSms}
                      onChange={(e) => setEnableSms(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                  {enableSms && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 block">رقم الهاتف المستلم (مع مفتاح الدولة):</span>
                      <input
                        type="tel"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+964 770 123 4567"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                        required={enableSms}
                      />
                    </div>
                  )}
                </div>

                {/* Email Channel */}
                <div className={`p-3 rounded-xl border transition-all ${enableEmail ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900/40 border-slate-800'}`}>
                  <label className="flex items-center justify-between cursor-pointer mb-2">
                    <span className="flex items-center gap-2 font-bold text-slate-200">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>بريد إلكتروني (Email)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enableEmail}
                      onChange={(e) => setEnableEmail(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                  {enableEmail && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 block">عنوان البريد الإلكتروني لاستلام التنبيه:</span>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                        required={enableEmail}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* In-App Chime & Notification Option */}
              <div className="flex items-center justify-between pt-1 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableInApp}
                    onChange={(e) => setEnableInApp(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>إشعار منبثق فوري وصوت رنين داخل التطبيق (In-App Toast & Audio Chime)</span>
                </label>
              </div>
            </div>

            {/* Custom Note */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                4. ملاحظة شخصية مخصصة (تُرفق مع الرسالة):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="مثال: هدف جني الأرباح الأول، كسر المقاومة، فرصة الدخول..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4 fill-slate-950" />
                <span>حفظ وتفعيل التنبيه السعري</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: My Active Alerts List */}
        {activeTab === 'my_alerts' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Filter Pills */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${filterStatus === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
                >
                  الكل ({alerts.length})
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${filterStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
                >
                  قيد المراقبة ({activeCount})
                </button>
                <button
                  onClick={() => setFilterStatus('triggered')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${filterStatus === 'triggered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
                >
                  تم التفعيل ({triggeredCount})
                </button>
              </div>

              <button
                onClick={() => setActiveTab('create_price')}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة تنبيه</span>
              </button>
            </div>

            {/* List */}
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">لا توجد تنبيهات في هذا القسم حالياً.</p>
                <button
                  onClick={() => setActiveTab('create_price')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold"
                >
                  إنشاء تنبيه سعري جديد
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAlerts.map((al) => {
                  const isAbove = al.type === 'price_above';

                  return (
                    <div
                      key={al.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        al.triggered
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : al.active
                          ? 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/35'
                          : 'bg-slate-950/30 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Right: Icon & Details */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg border mt-0.5 ${
                              al.triggered
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : isAbove
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {isAbove ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm font-mono">
                                {al.symbol}/USDT
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  al.triggered
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : al.active
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {al.triggered ? '🔔 تم التفعيل والإرسال' : al.active ? '🟢 قيد المراقبة اللحظية' : '⚪ معطّل'}
                              </span>

                              <span className="text-xs font-mono font-bold text-slate-200">
                                {isAbove ? '≥' : '≤'} ${al.targetValue?.toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mt-1">{al.message}</p>
                            {al.note && (
                              <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                                ملاحظة: {al.note}
                              </p>
                            )}

                            {/* Channels & Delivery Receipts */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                              {al.channels?.email && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                                  <Mail className="w-3 h-3 text-emerald-400" />
                                  <span>{al.email || userEmail}</span>
                                </span>
                              )}
                              {al.channels?.sms && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                                  <Smartphone className="w-3 h-3 text-sky-400" />
                                  <span>{al.phone || userPhone}</span>
                                </span>
                              )}
                              {al.triggered && al.triggeredAt && (
                                <span className="text-[10px] text-amber-400/90 font-mono">
                                  وقت التفعيل: {new Date(al.triggeredAt).toLocaleTimeString('ar-IQ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Left: Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {al.triggered ? (
                            <button
                              onClick={() => handleRearmAlert(al.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                              title="إعادة مراقبة التنبيه من جديد"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>إعادة التفعيل</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleAlert(al.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                al.active
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {al.active ? 'إيقاف' : 'تفعيل'}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteAlert(al.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="حذف التنبيه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Delivery Channels Configuration & Testing */}
        {activeTab === 'channels' && (
          <div className="space-y-4 text-xs overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 leading-relaxed">
              <strong>قنوات توصيل الإشعارات الفورية:</strong> تضمن لك المنصة استلام تنبيهات الأسعار حتى لو كان المتصفح مغلقاً عبر بوابة رسائل الـ SMS وخوادم البريد الإلكتروني.
            </div>

            {/* Test Results Banner */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  testResult.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SMS Config & Test */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    خدمة الرسائل النصية القصيرة (SMS)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    نشط (Active)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">رقم الهاتف لاستلام رسائل SMS:</label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+964 770 123 4567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    يجب إدخال مفتاح الدولة، مثال: 964+ للعراق أو 966+ للسعودية
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestDelivery('sms')}
                  disabled={testingChannel === 'sms'}
                  className="w-full py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{testingChannel === 'sms' ? 'جاري إرسال SMS...' : 'إرسال رسالة SMS تجريبية إلى رقمي'}</span>
                </button>
              </div>

              {/* Email Config & Test */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    خدمة البريد الإلكتروني (Email Delivery)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    نشط (Active)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">البريد الإلكتروني المعتمد:</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    يصل التقرير مفصلاً مع رابط مباشر للشارت والتوصيات الفنية
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestDelivery('email')}
                  disabled={testingChannel === 'email'}
                  className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{testingChannel === 'email' ? 'جاري إرسال البريد...' : 'إرسال بريد تجريبي الآن'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Compound Technical Alerts */}
        {activeTab === 'compound' && (
          <div className="space-y-3 text-xs overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300">
              <strong>التنبيهات الفنية المركبة (Compound Alerts):</strong> تنبيهات ذكية تجمع بين عدة مؤشرات فنية (مثل RSI، تقاطع MACD، وسيولة الحجم).
            </div>

            <div className="space-y-2.5">
              {compoundAlerts.map((cmp) => (
                <div
                  key={cmp.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>{cmp.name}</span>
                    </div>
                    <p className="text-slate-400 font-mono text-[11px] mt-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      الصيغة: {cmp.formula}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setCompoundAlerts(
                        compoundAlerts.map((c) => (c.id === cmp.id ? { ...c, active: !c.active } : c))
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cmp.active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cmp.active ? 'نشط' : 'إيقاف'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>نظام مراقبة سحابي مستمر 24/7 مع تأكيد الإرسال الفوري</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
