import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';
import {
  SignalScoreResult,
  SignalWeightsConfig,
  DEFAULT_SIGNAL_WEIGHTS,
} from '../utils/signalScore';

interface SignalScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SignalScoreResult;
  weights: SignalWeightsConfig;
  onSaveWeights: (weights: SignalWeightsConfig) => void;
}

export const SignalScoreBreakdownModal: React.FC<SignalScoreBreakdownModalProps> = ({
  isOpen,
  onClose,
  result,
  weights,
  onSaveWeights,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'indicators' | 'weights'>('indicators');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Weights form state
  const [trendWeight, setTrendWeight] = useState(Math.round(weights.trendWeight * 100));
  const [momWeight, setMomWeight] = useState(Math.round(weights.momentumWeight * 100));
  const [oscWeight, setOscWeight] = useState(Math.round(weights.oscillatorsWeight * 100));
  const [volWeight, setVolWeight] = useState(Math.round(weights.volumeWeight * 100));
  const [sentWeight, setSentWeight] = useState(Math.round(weights.sentimentWeight * 100));
  const [levelsWeight, setLevelsWeight] = useState(Math.round(weights.levelsWeight * 100));

  const totalWeightsSum =
    trendWeight + momWeight + oscWeight + volWeight + sentWeight + levelsWeight;

  const handleSaveCustomWeights = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeightsSum <= 0) return;

    onSaveWeights({
      trendWeight: trendWeight / totalWeightsSum,
      momentumWeight: momWeight / totalWeightsSum,
      oscillatorsWeight: oscWeight / totalWeightsSum,
      volumeWeight: volWeight / totalWeightsSum,
      sentimentWeight: sentWeight / totalWeightsSum,
      levelsWeight: levelsWeight / totalWeightsSum,
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setTrendWeight(35);
    setMomWeight(25);
    setOscWeight(15);
    setVolWeight(10);
    setSentWeight(5);
    setLevelsWeight(10);
  };

  const filteredIndicators = result.indicators.filter((it) => {
    if (filterGroup === 'all') return true;
    return it.group === filterGroup;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  شفافية الحساب: تفصيل نتيجة الإشارات المركبة
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    result.netScore >= 20
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : result.netScore <= -20
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  S = {result.netScore > 0 ? '+' : ''}{result.netScore} ({result.classification})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تفكيك النتيجة إلى 6 مجموعات مستقلة تمنع التكرار والانحياز، مع عرض مساهمة كل مؤشر بالأرقام الدقيقة.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'indicators'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            جدول تفصيل المؤشرات ({result.indicators.length})
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'weights'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تعديل أوزان المجموعات
          </button>
        </div>

        {/* TAB 1: Indicators Detail Table */}
        {activeTab === 'indicators' && (
          <div className="space-y-3 text-xs">
            {/* Groups Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
              {result.groups.map((grp) => (
                <div
                  key={grp.groupId}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      {grp.groupNameAr} ({Math.round(grp.effectiveWeight * 100)}%)
                    </span>
                    <span
                      className={`text-sm font-black font-mono mt-0.5 block ${
                        grp.avgSignal > 0.15
                          ? 'text-emerald-400'
                          : grp.avgSignal < -0.15
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {grp.scoreContribution > 0 ? '+' : ''}{grp.scoreContribution}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 mt-1 font-mono">
                    <span className="text-emerald-400 font-bold">{grp.buyCount} شراء</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{grp.sellCount} بيع</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ADX Modulated notification if active */}
            {result.adxModulated && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  معدّل ADX نشط: نظراً لأن مؤشر AD &lt; 20 (سوق عرضي)، تم تخفيض وزن مجموعة الاتجاه تلقائياً إلى النصف وتعزيز المذبذبات لمنع الإشارات الكاذبة.
                </span>
              </div>
            )}

            {/* Group Filter */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-slate-400 text-[11px]">تصفية حسب المجموعة:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'trend', label: 'الاتجاه' },
                { id: 'momentum', label: 'الزخم' },
                { id: 'oscillators', label: 'المذبذبات' },
                { id: 'volume', label: 'الحجم' },
                { id: 'sentiment', label: 'المشاعر' },
                { id: 'levels', label: 'الدعم والمقاومة' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterGroup(filter.id)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                    filterGroup === filter.id
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Indicators Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[11px] sticky top-0 font-sans z-10">
                  <tr>
                    <th className="p-2.5">المؤشر</th>
                    <th className="p-2.5">المجموعة</th>
                    <th className="p-2.5">القيمة المقروءة</th>
                    <th className="p-2.5">الإشارة</th>
                    <th className="p-2.5">التفسير الفني الدقيق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredIndicators.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-sans font-bold text-white">{it.name}</td>
                      <td className="p-2.5 font-sans text-slate-400">{it.groupNameAr}</td>
                      <td className="p-2.5 text-slate-200">{it.rawDisplay}</td>
                      <td className="p-2.5 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            it.signal === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : it.signal === 'sell'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {it.signal === 'buy' ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              شراء (+1)
                            </>
                          ) : it.signal === 'sell' ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-rose-400" />
                              بيع (-1)
                            </>
                          ) : (
                            'محايد (0)'
                          )}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans text-[11px] text-slate-300">{it.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Weights Customizer */}
        {activeTab === 'weights' && (
          <form onSubmit={handleSaveCustomWeights} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-white block text-sm">
                توزيع أوزان المجموعات (يجب أن يكون المجموع 100%):
              </span>
              <p className="text-slate-400 text-[11px]">
                توزيع الأوزان على مجموعات مستقلة يمنع أن تطغى المؤشرات المتشابهة على النتيجة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Trend */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">الاتجاه (Trend):</label>
                  <span className="font-mono text-emerald-400 font-bold">{trendWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={trendWeight}
                  onChange={(e) => setTrendWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">المتوسطات، التقاطعات، السوبرتريند (افتراضي 35%)</span>
              </div>

              {/* Momentum */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">الزخم (Momentum):</label>
                  <span className="font-mono text-emerald-400 font-bold">{momWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={momWeight}
                  onChange={(e) => setMomWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">MACD, RSI, Momentum(10) (افتراضي 25%)</span>
              </div>

              {/* Oscillators */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">المذبذبات (Oscillators):</label>
                  <span className="font-mono text-emerald-400 font-bold">{oscWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={oscWeight}
                  onChange={(e) => setOscWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">Stochastic, CCI, Williams %R (افتراضي 15%)</span>
              </div>

              {/* Volume */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">الحجم والسيولة (Volume):</label>
                  <span className="font-mono text-emerald-400 font-bold">{volWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={volWeight}
                  onChange={(e) => setVolWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">تدفق الحجم، وقوة الاتجاه ADX (افتراضي 10%)</span>
              </div>

              {/* Sentiment */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">المشاعر (Sentiment):</label>
                  <span className="font-mono text-emerald-400 font-bold">{sentWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={sentWeight}
                  onChange={(e) => setSentWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">مؤشر الخوف والطمع وتصويت المجتمع (افتراضي 5%)</span>
              </div>

              {/* Levels */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">الدعم والمقاومة (S/R Levels):</label>
                  <span className="font-mono text-emerald-400 font-bold">{levelsWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={levelsWeight}
                  onChange={(e) => setLevelsWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">القرب من نقاط البيفوت S1 و R1 (افتراضي 10%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الأوزان القياسية</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                حفظ وتطبيق الأوزان
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>* حساب نقي خاضع لقواعد رياضية واضحة بدون صندوق أسود</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
