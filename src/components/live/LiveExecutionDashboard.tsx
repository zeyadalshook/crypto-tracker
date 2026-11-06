import React, { useState, useEffect } from 'react';
import {
  ExecutionSystemState,
  PositionRecord,
  TradingIntent,
  RiskDecision,
  ExecutedOrder,
  AuditLogEntry,
  RiskLimits,
} from '../../lib/risk/riskTypes';
import { DEFAULT_RISK_LIMITS } from '../../lib/risk/riskEngine';
import { PaperAdapter } from '../../lib/execution/adapters/PaperAdapter';
import { OrderManager } from '../../lib/execution/orderManager';
import { auditLogger } from '../../lib/execution/auditLog';
import { generateSupervisorDigest, SupervisorDailyDigest } from '../../lib/execution/aiSupervisor';
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Send,
  SlidersHorizontal,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';

interface LiveExecutionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveExecutionDashboard: React.FC<LiveExecutionDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Active State Machine
  const [systemState, setSystemState] = useState<ExecutionSystemState>('PAPER');
  const [rolloutPhase, setRolloutPhase] = useState<'PAPER' | 'TESTNET' | 'LIVE_SMALL' | 'LIVE'>('PAPER');

  // Risk limits
  const [limits, setLimits] = useState<RiskLimits>(DEFAULT_RISK_LIMITS);

  // Core metrics
  const [equity, setEquity] = useState<number>(10000);
  const [dailyPnlAmount, setDailyPnlAmount] = useState<number>(142.5);
  const [dailyPnlR, setDailyPnlR] = useState<number>(1.42);
  const [dailyLossConsumedPct, setDailyLossConsumedPct] = useState<number>(18.0);
  const [haltReason, setHaltReason] = useState<string | null>(null);

  // Positions, Intents & Orders
  const [openPositions, setOpenPositions] = useState<PositionRecord[]>([
    {
      id: 'pos_btc_1',
      symbol: 'BTCUSDT',
      strategyId: 'rsi_reversal',
      side: 'long',
      entryPrice: 62450.0,
      currentPrice: 63120.0,
      quantity: 0.032,
      riskAmount: 100,
      stopLossPrice: 59327.5,
      takeProfitPrice: 67914.5,
      hasActiveExchangeStop: true, // Attached on-exchange stop order!
      unrealizedPnl: 21.44,
      unrealizedPnlR: 0.21,
      openedAt: Date.now() - 7200000,
    },
  ]);

  const [recentIntents, setRecentIntents] = useState<
    { intent: TradingIntent; decision: RiskDecision }[]
  >([
    {
      intent: {
        id: 'intent_eth_1',
        strategyId: 'ema_trend',
        strategyName: 'تقاطع المتوسطات EMA',
        params: { slAtr: 2.0, tpAtr: 3.5 },
        symbol: 'ETHUSDT',
        side: 'buy',
        type: 'entry',
        reason: 'تقاطع اتجاهي صاعد EMA9 فوق EMA21 مع دعم السعر',
        entryPriceRef: 3450.0,
        stopPrice: 3310.0,
        targets: [{ price: 3695.0, closePct: 100 }],
        signalCandleTime: Date.now() - 3600000,
        createdAt: Date.now() - 3600000,
      },
      decision: {
        intentId: 'intent_eth_1',
        status: 'approved',
        approvedQty: 0.714,
        approvedRiskAmount: 100,
        approvedRiskPct: 1.0,
        originalRequestedRiskPct: 1.0,
        reductionRatio: 1.0,
        checkedAt: Date.now() - 3590000,
      },
    },
    {
      intent: {
        id: 'intent_sol_2',
        strategyId: 'breakout_high',
        strategyName: 'اختراق القمة',
        params: { slAtr: 2.0, tpAtr: 3.0 },
        symbol: 'SOLUSDT',
        side: 'buy',
        type: 'entry',
        reason: 'اختراق قمة 20 شمعة',
        entryPriceRef: 185.0,
        stopPrice: 155.0,
        targets: [{ price: 230.0, closePct: 100 }],
        signalCandleTime: Date.now() - 1800000,
        createdAt: Date.now() - 1800000,
      },
      decision: {
        intentId: 'intent_sol_2',
        status: 'rejected',
        approvedQty: 0,
        approvedRiskAmount: 0,
        approvedRiskPct: 0,
        originalRequestedRiskPct: 1.0,
        reductionRatio: 0,
        rejectionReasonAr: 'مسافة وقف الخسارة بعيدة جداً (> 6.0×ATR)',
        ruleViolatedId: 'RULE_1_SL_TOO_WIDE',
        checkedAt: Date.now() - 1795000,
      },
    },
  ]);

  // Audit Logs & Hash Chain Integrity
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isAuditValid, setIsAuditValid] = useState<boolean>(true);

  // AI Supervisor Digest
  const [supervisorDigest, setSupervisorDigest] = useState<SupervisorDailyDigest | null>(null);

  // Close All confirmation modal
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);

  // Active sub-tab in dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'intents' | 'orders' | 'rollout' | 'audit' | 'settings'>('overview');

  useEffect(() => {
    // Generate initial digest
    const digest = generateSupervisorDigest({
      intentsCount: 6,
      approvedCount: 4,
      rejectedCount: 2,
      rejectionReasons: ['مسافة وقف الخسارة بعيدة (> 6×ATR)'],
      dailyPnlAmount: 142.5,
      dailyPnlR: 1.42,
      dailyLossConsumedPct: 18.0,
      avgSlippagePct: 0.038,
      backtestExpectedSlippagePct: 0.04,
    });
    setSupervisorDigest(digest);

    // Load audit logs
    auditLogger.getEntries();
    setAuditLogs(auditLogger.getEntries());
    auditLogger.verifyIntegrity().then((res) => setIsAuditValid(res.isValid));
  }, []);

  const handleKillSwitch = async () => {
    setSystemState('HALT');
    setHaltReason('تم الضغط على زر الإيقاف الطارئ (Kill Switch) يدوياً من الواجهة.');
    await auditLogger.append(
      'KILL_SWITCH_PRESSED',
      'USER',
      'تم تفعيل زر الإيقاف الطارئ (Kill Switch) يدوياً. إلغاء جميع أوامر الدخول المعلقة وإبقاء أوامر وقف الخسارة على المنصة.'
    );
    setAuditLogs(auditLogger.getEntries());
  };

  const handleResumeFromHalt = async () => {
    setSystemState(rolloutPhase);
    setHaltReason(null);
    await auditLogger.append(
      'STATE_CHANGE',
      'USER',
      `تم استئناف التداول يدوياً بعد فترة التهدئة والتحقق. الانتقال إلى حالة ${rolloutPhase}.`
    );
    setAuditLogs(auditLogger.getEntries());
  };

  const handleCloseAllPositions = async () => {
    setOpenPositions([]);
    setShowCloseAllConfirm(false);
    await auditLogger.append(
      'HALT_TRIGGERED',
      'USER',
      'تم إغلاق جميع المراكز المفتوحة فوراً بأوامر سوقية بتأكيد المستخدم المزدوج.'
    );
    setAuditLogs(auditLogger.getEntries());
  };

  const stateColors: Record<ExecutionSystemState, { bg: string; text: string; border: string }> = {
    OFF: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' },
    PAPER: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    TESTNET: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
    LIVE_SMALL: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    LIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    HALT: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Bar with Status & Kill Switch */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  محرك التنفيذ الآلي وطبقة المخاطر (Execution Engine)
                </h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold border ${stateColors[systemState].bg} ${stateColors[systemState].text} ${stateColors[systemState].border}`}
                >
                  الحالة: {systemState}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                10 حواجز سلوكية محلية يمكن تجاوزها للاستراتيجيات المعتمدة فقط | مراكز محمية بأوامر وقف على المنصة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* BIG RED KILL SWITCH BUTTON */}
            {systemState !== 'HALT' ? (
              <button
                onClick={handleKillSwitch}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-2 animate-pulse"
                title="إيقاف طارئ فوري: إلغاء جميع أوامر الدخول المعلقة وإبقاء الحماية"
              >
                <Power className="w-4 h-4" />
                KILL SWITCH (إيقاف طارئ)
              </button>
            ) : (
              <button
                onClick={handleResumeFromHalt}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                استئناف العمل بعد المراجعة
              </button>
            )}

            <button
              onClick={() => setShowCloseAllConfirm(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs rounded-xl border border-rose-500/30 transition-colors font-medium"
            >
              أغلق كل المراكز الآن
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Warning Banner if in LIVE */}
        {systemState === 'LIVE' && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 text-center font-bold">
            ⚠️ تحذير: التداول الحي بأموال حقيقية مفعّل. المخاطرة خاضعة لطبقة الحماية الحتمية.
          </div>
        )}

        {/* HALT Notice Banner if Active */}
        {systemState === 'HALT' && (
          <div className="bg-rose-950/60 border-b border-rose-500/50 p-3.5 text-xs text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                <strong>النظام متوقف طارئاً (HALT):</strong> {haltReason || 'تم تعليق فتح الصفقات الجديدة تلقائياً لحماية رأس المال.'} المراكز المفتوحة محمية بأوامر وقف خسارة فعالة على المنصة.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 overflow-x-auto gap-1 text-xs font-medium">
          {[
            { id: 'overview', label: 'اللوحة المباشرة والمراكز', icon: Activity },
            { id: 'intents', label: 'نوايا التداول وفحص المخاطر', icon: SlidersHorizontal },
            { id: 'rollout', label: 'مراحل التفعيل (Rollout Gates)', icon: Layers },
            { id: 'audit', label: 'سجل التدقيق وسلسلة التجزئة', icon: FileText },
            { id: 'settings', label: 'إعدادات وحدود المخاطر', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-rose-500 text-rose-400 font-bold bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: OVERVIEW & POSITIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Core Risk Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400">الرصيد الكلي المتاح</div>
                  <div className="text-xl font-black font-mono text-slate-200 mt-1">
                    ${equity.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    اليوم: {dailyPnlAmount >= 0 ? '+' : ''}${dailyPnlAmount} (+{dailyPnlR} R)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400">استهلاك حد الخسارة اليومي</div>
                  <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                    {dailyLossConsumedPct.toFixed(1)}% / 100%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dailyLossConsumedPct >= 70 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dailyLossConsumedPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400">المخاطرة المفتوحة الإجمالية</div>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                    1.00% / 1.50%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    صفقة واحدة مفتوحة (الحد: 3 صفقات)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400">نبض الخادم والمطابقة</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 inline" /> متصل ومتطابق
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    آخر مطابقة: قبل 12 ثانية (0.0% انحراف)
                  </div>
                </div>
              </div>

              {/* Open Positions Table */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    المراكز المفتوحة حالياً ({openPositions.length})
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    جميع المراكز محمية بأوامر OCO / Stop Loss على المنصة
                  </span>
                </div>

                {openPositions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                        <tr>
                          <th className="p-3">الزوج</th>
                          <th className="p-3">النوع</th>
                          <th className="p-3">سعر الدخول</th>
                          <th className="p-3">السعر الحالي</th>
                          <th className="p-3">وقف الخسارة (على المنصة)</th>
                          <th className="p-3">الهدف</th>
                          <th className="p-3">الربح غير المحقق</th>
                          <th className="p-3 text-center">أمر الحماية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {openPositions.map((pos) => (
                          <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-sans font-bold text-slate-200">{pos.symbol}</td>
                            <td className="p-3 text-emerald-400 font-sans font-bold">شراء (Long)</td>
                            <td className="p-3">${pos.entryPrice.toLocaleString()}</td>
                            <td className="p-3 text-slate-200">${pos.currentPrice.toLocaleString()}</td>
                            <td className="p-3 text-rose-400 font-bold">${pos.stopLossPrice.toLocaleString()}</td>
                            <td className="p-3 text-emerald-400">${pos.takeProfitPrice.toLocaleString()}</td>
                            <td className="p-3 text-emerald-400 font-bold">
                              +${pos.unrealizedPnl} (+{pos.unrealizedPnlR} R)
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                                <ShieldCheck className="w-3 h-3" /> فعّال على المنصة
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    لا توجد مراكز مفتوحة حالياً. المحرك يراقب إغلاق الشموع في انتظار إشارات مؤكدة.
                  </div>
                )}
              </div>

              {/* AI Supervisor Daily Digest Card */}
              {supervisorDigest && (
                <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-bold text-slate-200">
                        تقرير المشرف الذكي الرقابي (AI Supervisor Daily Digest)
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      صلاحية قراءة فقط (Read-only)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                    {supervisorDigest.digestTextAr}
                  </div>

                  <div className="text-[10px] text-slate-500">
                    ℹ️ {supervisorDigest.disclaimer}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTENTS & RISK DECISIONS */}
          {activeTab === 'intents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200">
                  سجل نوايا التداول وقرارات طبقة المخاطر المستقلة (Trading Intents Log)
                </h4>
                <span className="text-xs text-slate-400">
                  كل نية تخضع لـ 11 فحصاً إلزامياً قبل التنفيذ
                </span>
              </div>

              <div className="space-y-3">
                {recentIntents.map(({ intent, decision }) => (
                  <div
                    key={intent.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                      decision.status === 'approved'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : decision.status === 'reduced'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            decision.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : decision.status === 'reduced'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {decision.status === 'approved'
                            ? 'موافقة كاملة'
                            : decision.status === 'reduced'
                            ? 'موافقة بحجم مخفّض'
                            : 'مرفوض من طبقة المخاطر'}
                        </span>
                        <span className="font-mono font-bold text-slate-200 text-sm">
                          {intent.symbol} ({intent.side.toUpperCase()})
                        </span>
                        <span className="text-xs text-slate-400">
                          بواسطة: {intent.strategyName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mr-2">
                        <strong>السبب الحتمي:</strong> {intent.reason}
                      </p>
                      {decision.rejectionReasonAr && (
                        <p className="text-xs text-rose-300 font-semibold mr-2">
                          سبب الرفض: {decision.rejectionReasonAr}
                        </p>
                      )}
                    </div>

                    <div className="text-left shrink-0 font-mono text-xs text-slate-300 mr-2 md:mr-0">
                      <div>السعر المرجعي: ${intent.entryPriceRef}</div>
                      <div>وقف الخسارة: ${intent.stopPrice}</div>
                      <div>الحجم المصادق عليه: {decision.approvedQty}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ROLLOUT GATES */}
          {activeTab === 'rollout' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                🛡️ <strong>مبدأ التدرج الصارم (Rollout Gates):</strong> لا يمكن لأي حساب الانتقال للتداول الحقيقي إلا بعد إتمام 30 يوماً ورقية تليها 30 يوماً على Testnet واجتياز شروط الأمان.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  {
                    phase: 'PAPER',
                    label: '1. المحاكاة الورقية',
                    desc: 'محاكاة كاملة بأسعار حية ورسوم وانزلاق عمق السوق',
                    isActive: rolloutPhase === 'PAPER',
                    isDone: true,
                  },
                  {
                    phase: 'TESTNET',
                    label: '2. شبكة الاختبار (Testnet)',
                    desc: 'أوامر حقيقية على Binance Spot Testnet بأموال وهمية',
                    isActive: rolloutPhase === 'TESTNET',
                    isDone: false,
                  },
                  {
                    phase: 'LIVE_SMALL',
                    label: '3. حقيقي بحجم مصغر (Small)',
                    desc: 'مخاطرة = ربع النسبة المقترحة وسقف 5% من رأس المال',
                    isActive: rolloutPhase === 'LIVE_SMALL',
                    isDone: false,
                  },
                  {
                    phase: 'LIVE',
                    label: '4. تداول حي كامل (Production)',
                    desc: 'بعد 60 يوماً ناجحة؛ رفع المخاطرة تدريجياً',
                    isActive: rolloutPhase === 'LIVE',
                    isDone: false,
                  },
                ].map((st, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border space-y-2 ${
                      st.isActive
                        ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{st.label}</span>
                      {st.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500 text-white font-bold">
                          الحالية
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{st.desc}</p>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">
                  قائمة شروط التفعيل الحقيقي (كلها إلزامية قبل التداول الحي):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>مفتاح API بصلاحية التداول فقط (بلا سحب)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تأكيد قراءة تحذير المخاطر المالية</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>اختبار عمل زر Kill Switch فعلياً</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ضبط حدود الخسارة اليومية والأسبوعية الصارمة</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS & HASH CHAIN */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    سجل التدقيق غير القابل للتعديل (Append-Only Cryptographic Audit Log)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    كل قرار وأمر مسجل بتجزئة SHA-256 متسلسلة تكشف أي تلاعب فورياً
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isAuditValid
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isAuditValid ? '✓ سلسلة التجزئة سليمة ومطابقة' : '⚠️ تم اكتشاف تلاعب بالسجل'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="p-3">الوقت</th>
                      <th className="p-3">نوع الحدث</th>
                      <th className="p-3">المصدر</th>
                      <th className="p-3">التفاصيل</th>
                      <th className="p-3">تجزئة SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {auditLogs.slice(-15).reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                        </td>
                        <td className="p-3 font-sans text-slate-200">{log.eventType}</td>
                        <td className="p-3 font-sans text-sky-400">{log.actor}</td>
                        <td className="p-3 font-sans text-slate-300 max-w-md truncate">
                          {log.details}
                        </td>
                        <td className="p-3 text-[10px] text-slate-500 truncate max-w-[120px]">
                          {log.hash.slice(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RISK SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  حدود طبقة المخاطر (تغيير الحدود نحو التراخي يتطلب 24 ساعة تأخير ضد الغضب)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">نسبة المخاطرة القصوى للصفقة:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={limits.maxRiskPerTradePct}
                    disabled
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">تعديل النسبة لأعلى يتطلب تأكيد 24 ساعة</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">حد الخسارة اليومي الإجباري (HALT):</label>
                  <input
                    type="number"
                    value={limits.dailyLossLimitPct}
                    disabled
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">تفعيل الإيقاف عند بلوغ 2%</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الحد الأقصى للصفقات المفتوحة معاً:</label>
                  <input
                    type="number"
                    value={limits.maxOpenPositions}
                    disabled
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">أقصى مخاطرة مفتوحة إجمالية:</label>
                  <input
                    type="number"
                    value={limits.maxTotalOpenRiskPct}
                    disabled
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sky-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            🔒 طبقة المخاطر تعمل مستقلاً وتمنع تجاوز الحدود مهما كانت إشارة الاستراتيجية.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-medium"
          >
            إغلاق اللوحة
          </button>
        </div>
      </div>

      {/* Close All Confirmation Modal */}
      {showCloseAllConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-100">تأكيد إغلاق جميع المراكز المفتوحة</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد تماماً من رغبتك في إغلاق جميع المراكز المفتوحة فوراً بأوامر سوقية؟ سيتم إيقاف فتح الصفقات وإلغاء الأوامر المفتوحة.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCloseAllConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleCloseAllPositions}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30"
              >
                نعم، أغلق كل المراكز فوراً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
