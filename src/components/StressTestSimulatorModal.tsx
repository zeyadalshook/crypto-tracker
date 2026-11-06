import React, { useState, useEffect, useMemo } from 'react';
import { X, ShieldAlert, Sliders, TrendingDown, TrendingUp, ShieldCheck } from 'lucide-react';
import { AutoTraderEngine, BrainPosition } from '../lib/brain/autoTrader';

interface StressTestSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
}

interface ShockScenario {
  id: string;
  nameAr: string;
  btcShockPct: number;
  betaMultiplier: number;
  descriptionAr: string;
}

const PRESET_SCENARIOS: ShockScenario[] = [
  {
    id: 'flash_crash',
    nameAr: 'انهيار سيولة مفاجئ (Flash Crash -15%)',
    btcShockPct: -15,
    betaMultiplier: 1.45,
    descriptionAr: 'تصفيات متتالية للعقود الآجلة تؤدي لهبوط البيتكوين 15% والعملات البديلة بنحو 21%.',
  },
  {
    id: 'black_swan',
    nameAr: 'أزمة سوقية حادة (Black Swan -30%)',
    btcShockPct: -30,
    betaMultiplier: 1.6,
    descriptionAr: 'صدمة كلية عنيفة مشابهة لانهيارات السيولة الكبرى مع اتساع الفروقات السعرية.',
  },
  {
    id: 'macro_tightening',
    nameAr: 'تشديد نقدي ورفع فائدة (-10%)',
    btcShockPct: -10,
    betaMultiplier: 1.3,
    descriptionAr: 'تصحيح متوسط ناتج عن بيانات تضخم مرتفعة أو عزوف مؤقت عن المخاطرة.',
  },
  {
    id: 'bull_breakout',
    nameAr: 'اندفاع مؤسسي صاعد (+20%)',
    btcShockPct: 20,
    betaMultiplier: 1.35,
    descriptionAr: 'تدفقات صناديق استثمارية قوية تدفع السوق لاختراق القمم السعرية.',
  },
];

const ASSET_BETAS: Record<string, number> = {
  BTC: 1.0,
  ETH: 1.22,
  BNB: 1.15,
  SOL: 1.55,
  PYTH: 1.75,
  XRP: 1.3,
  AVAX: 1.6,
  LINK: 1.45,
  SUI: 1.7,
  NEAR: 1.65,
};

export const StressTestSimulatorModal: React.FC<StressTestSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('flash_crash');
  const [btcShockPct, setBtcShockPct] = useState<number>(-15);
  const [altBetaScale, setAltBetaScale] = useState<number>(1.45);
  const [hypotheticalPositionUsdt, setHypotheticalPositionUsdt] = useState<number>(2500);
  const [hypotheticalStopLossPct, setHypotheticalStopLossPct] = useState<number>(4);

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

  const traderState = useMemo(() => {
    if (!isOpen) return null;
    return AutoTraderEngine.getInstance().getState();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (scen: ShockScenario) => {
    setSelectedScenarioId(scen.id);
    setBtcShockPct(scen.btcShockPct);
    setAltBetaScale(scen.betaMultiplier);
  };

  const baseBeta = ASSET_BETAS[currentSymbol.toUpperCase()] ?? 1.4;
  const effectiveBeta = currentSymbol.toUpperCase() === 'BTC' ? 1.0 : Number(((baseBeta * altBetaScale) / 1.4).toFixed(2));
  const projectedAssetMovePct = Math.max(-95, Math.min(300, Number((btcShockPct * effectiveBeta).toFixed(2))));
  const projectedPrice = Math.max(0.000001, currentPrice * (1 + projectedAssetMovePct / 100));

  // Unprotected vs Stop-Loss Protected PnL on hypothetical position
  const unprotectedPnlUsdt = hypotheticalPositionUsdt * (projectedAssetMovePct / 100);
  const protectedLossPct =
    projectedAssetMovePct < -hypotheticalStopLossPct ? -hypotheticalStopLossPct - 0.25 : projectedAssetMovePct;
  const protectedPnlUsdt = hypotheticalPositionUsdt * (protectedLossPct / 100);
  const capitalSavedByStopLossUsdt = Math.max(0, protectedPnlUsdt - unprotectedPnlUsdt);

  const paperEquity = traderState?.equity || 10000;
  const openPositions: BrainPosition[] = traderState?.openPositions || [];

  const formatPrice = (p: number) => {
    if (!p || isNaN(p)) return '--';
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(3)}`;
    if (p >= 0.01) return `$${p.toFixed(5)}`;
    return `$${p.toFixed(7)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stress-test-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-[#06120b] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>إدارة المخاطر الكمية</span>
              <span aria-hidden="true">·</span>
              <span>Portfolio Stress Testing</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-400">تداول ورقي محاكى 100%</span>
            </div>
            <h2 id="stress-test-modal-title" className="text-xl font-bold text-white">
              مختبر اختبار الضغط والصدمات السعرية للمحفظة (Scenario & Crash Simulator)
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Shock Scenarios */}
        <div className="space-y-2">
          <span className="text-xs text-slate-400 font-medium block">
            اختر سيناريو صدمة قياسي أو اضبط المؤشرات يدوياً:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESET_SCENARIOS.map((scen) => {
              const isSelected = selectedScenarioId === scen.id;
              return (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => handleSelectPreset(scen)}
                  className={`p-3 rounded-xl border text-right transition-colors flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-950/35 border-emerald-500/60 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{scen.nameAr}</span>
                    <span
                      className={`text-xs font-mono tabular-nums font-bold ${
                        scen.btcShockPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {scen.btcShockPct > 0 ? `+${scen.btcShockPct}%` : `${scen.btcShockPct}%`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{scen.descriptionAr}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Shock Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">نسبة صدمة البيتكوين المرجعية (BTC Shock %):</label>
              <span
                className={`font-mono tabular-nums font-bold text-sm ${
                  btcShockPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {btcShockPct > 0 ? `+${btcShockPct}%` : `${btcShockPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={btcShockPct}
              onChange={(e) => {
                setSelectedScenarioId('custom');
                setBtcShockPct(Number(e.target.value));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
              <span>-50% (انهيار شامل)</span>
              <span>0% (مستقر)</span>
              <span>+50% (طفرة سعرية)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">
                معامل حساسية العملات البديلة (Beta Multiplier):
              </label>
              <span className="font-mono tabular-nums font-bold text-sm text-amber-300">
                {altBetaScale.toFixed(2)}x (Beta {currentSymbol}: {effectiveBeta}x)
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.5}
              step={0.05}
              value={altBetaScale}
              onChange={(e) => {
                setSelectedScenarioId('custom');
                setAltBetaScale(Number(e.target.value));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
              <span>0.8x (دفاعي)</span>
              <span>1.4x (اعتيادي)</span>
              <span>2.5x (تذبذب عالٍ)</span>
            </div>
          </div>
        </div>

        {/* Active Coin Impact & Stop-Loss Protection Proof */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
            <span className="text-slate-400 block">السعر المتوقع لـ {currentSymbol} بعد الصدمة:</span>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              {formatPrice(projectedPrice)}
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
              <span className="text-slate-400">الحالي: {formatPrice(currentPrice)}</span>
              <span aria-hidden="true">·</span>
              <span className={projectedAssetMovePct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {projectedAssetMovePct >= 0 ? `+${projectedAssetMovePct}%` : `${projectedAssetMovePct}%`}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
            <span className="text-slate-400 block">النتيجة بدون وقف خسارة (عقد ${hypotheticalPositionUsdt}):</span>
            <div
              className={`text-lg font-bold font-mono tabular-nums ${
                unprotectedPnlUsdt >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {unprotectedPnlUsdt >= 0
                ? `+$${unprotectedPnlUsdt.toFixed(2)}`
                : `-$${Math.abs(unprotectedPnlUsdt).toFixed(2)}`}
            </div>
            <span className="text-[11px] text-slate-400 block">
              انكشاف كامل لتقلبات الصدمة السوقية
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-1.5">
            <span className="text-emerald-300 font-medium block">
              مع وقف خسارة منضبط ({hypotheticalStopLossPct}% + 0.25% انزلاق):
            </span>
            <div
              className={`text-lg font-bold font-mono tabular-nums ${
                protectedPnlUsdt >= 0 ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {protectedPnlUsdt >= 0
                ? `+$${protectedPnlUsdt.toFixed(2)}`
                : `-$${Math.abs(protectedPnlUsdt).toFixed(2)}`}
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              {capitalSavedByStopLossUsdt > 0
                ? `رأس المال المحمي بفضل وقف الخسارة: $${capitalSavedByStopLossUsdt.toFixed(2)}`
                : 'الصفقة ضمن النطاق الآمن'}
            </span>
          </div>
        </div>

        {/* Custom Position Size & Stop Loss Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300">حجم الصفقة الافتراضية للاختبار (USDT):</span>
            <input
              type="number"
              min={100}
              max={100000}
              step={100}
              value={hypotheticalPositionUsdt}
              onChange={(e) => setHypotheticalPositionUsdt(Math.max(100, Number(e.target.value) || 1000))}
              className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums font-bold text-left"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300">مسافة وقف الخسارة المفترضة (%):</span>
            <input
              type="number"
              min={0.5}
              max={25}
              step={0.5}
              value={hypotheticalStopLossPct}
              onChange={(e) => setHypotheticalStopLossPct(Math.max(0.5, Number(e.target.value) || 4))}
              className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums font-bold text-left"
            />
          </div>
        </div>

        {/* Paper Portfolio Open Positions Stress Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              تأثير الصدمة على محفظة التداول الورقي الحالية (الرصيد: ${paperEquity.toFixed(2)}):
            </span>
            <span className="text-slate-400 font-mono tabular-nums">
              الصفقات المفتوحة: {openPositions.length}
            </span>
          </div>

          {openPositions.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>لا توجد صفقات ورقية مفتوحة حالياً — رصيدك النقدي المحاكى (${paperEquity.toFixed(2)}) محمي بالكامل بنسبة 100% ضد صدمات السوق.</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-3">الزوج</th>
                    <th className="py-2.5 px-3">الاتجاه</th>
                    <th className="py-2.5 px-3">سعر الدخول</th>
                    <th className="py-2.5 px-3">وقف الخسارة</th>
                    <th className="py-2.5 px-3">السعر بعد الصدمة</th>
                    <th className="py-2.5 px-3 text-left">حالة الحماية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {openPositions.map((pos: BrainPosition) => {
                    const sym = pos.symbol.replace(/USDT$/, '');
                    const b = ASSET_BETAS[sym] ?? 1.4;
                    const move = btcShockPct * b;
                    const shockedPrice = pos.entryPrice * (1 + move / 100);
                    const slHit =
                      pos.side === 'long'
                        ? shockedPrice <= pos.stopLossPrice
                        : shockedPrice >= pos.stopLossPrice;
                    return (
                      <tr key={pos.id}>
                        <td className="py-2.5 px-3 text-white font-bold">{pos.symbol}</td>
                        <td className="py-2.5 px-3 uppercase">{pos.side}</td>
                        <td className="py-2.5 px-3">{formatPrice(pos.entryPrice)}</td>
                        <td className="py-2.5 px-3 text-amber-300">{formatPrice(pos.stopLossPrice)}</td>
                        <td className="py-2.5 px-3">{formatPrice(shockedPrice)}</td>
                        <td className="py-2.5 px-3 text-left font-sans">
                          {slHit ? (
                            <span className="text-amber-300 font-semibold">
                              يتفعل وقف الخسارة الآلي ويحمي الرصيد
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">ضمن الهامش الآمن</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
