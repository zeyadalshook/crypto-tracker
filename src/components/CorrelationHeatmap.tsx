import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  HelpCircle,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { CorrelationData } from '../types/crypto';

interface CorrelationHeatmapProps {
  currentSymbol: string;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  currentSymbol,
}) => {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [days, setDays] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredCell, setHoveredCell] = useState<{
    symA: string;
    symB: string;
    val: number;
  } | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const fetchCorrelation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/correlation/${currentSymbol}?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch correlation matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrelation();
  }, [currentSymbol, days]);

  const getCellColor = (val: number, isDiagonal: boolean) => {
    if (isDiagonal) {
      return 'bg-slate-800/80 text-slate-400 border-slate-700 font-bold';
    }
    if (val >= 0.75) {
      return 'bg-emerald-500/40 text-emerald-200 border-emerald-500/60 font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    }
    if (val >= 0.5) {
      return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold';
    }
    if (val >= 0.25) {
      return 'bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold';
    }
    if (val >= -0.1) {
      return 'bg-slate-900 text-slate-300 border-slate-800';
    }
    if (val >= -0.4) {
      return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold';
    }
    return 'bg-rose-500/30 text-rose-200 border-rose-500/50 font-black shadow-[0_0_12px_rgba(244,63,94,0.3)]';
  };

  const getCorrelationLabel = (val: number) => {
    if (val >= 0.8) return 'ارتباط طردي قوي جداً';
    if (val >= 0.6) return 'ارتباط إيجابي ملحوظ';
    if (val >= 0.3) return 'ارتباط إيجابي معتدل';
    if (val >= -0.1) return 'حركة مستقلة (ضعيف)';
    if (val >= -0.4) return 'ارتباط عكسي طفيف';
    return 'ارتباط عكسي قوي (تحوط)';
  };

  return (
    <div className="card-glow rounded-2xl p-5 border border-emerald-500/25 flex flex-col gap-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>مصفوفة الارتباط (Correlation Heatmap)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono">
                {currentSymbol} مع أكبر 5 عملات
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              قياس الترابط السعري اليومي لبيرسون وتحديد فرص التنويع ومخاطر السوق
            </p>
          </div>
        </div>

        {/* Timeframe selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  days === d
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d} يوم
              </button>
            ))}
          </div>

          <button
            onClick={fetchCorrelation}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="إعادة الحساب"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="دليل قراءة المصفوفة"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span>جارٍ جلب السلاسل التاريخية وحساب مصفوفة الارتباط لـ 6 عملات...</span>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-5">
          {/* Top Quick Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  معامل بيتا مقابل BTC (Beta)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-300 font-mono">
                    {data.betaAgainstBtc.toFixed(2)}x
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {data.betaAgainstBtc > 1.2
                      ? 'تذبذب عالي (High Beta)'
                      : data.betaAgainstBtc >= 0.8
                      ? 'تذبذب موازٍ للبيتكوين'
                      : 'تذبذب منخفض ومستقل'}
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  الأعلى ارتباطاً مع {currentSymbol}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {data.strongestPositive.symbol}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    +{data.strongestPositive.value.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  حركة متزامنة في نفس الاتجاه
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  الأفضل للتنويع والتحوط
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-sky-400 font-mono">
                    {data.weakestOrNegative.symbol}
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-300">
                    {data.weakestOrNegative.value >= 0 ? '+' : ''}
                    {data.weakestOrNegative.value.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  أقل تأثراً بهبوط {currentSymbol}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Heatmap Matrix Grid */}
          <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/70 p-3">
            <table className="w-full text-center border-separate border-spacing-1.5 text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-right text-slate-400 font-bold min-w-[70px]">
                    العملات
                  </th>
                  {data.symbols.map((sym) => (
                    <th
                      key={sym}
                      className={`p-2 font-mono font-bold rounded-lg ${
                        sym === currentSymbol
                          ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/40'
                          : 'text-slate-300 bg-slate-900/60'
                      }`}
                    >
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.symbols.map((symA, rowIdx) => (
                  <tr key={symA}>
                    <td className="p-2 text-right font-mono font-bold text-slate-300">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span
                          className={
                            symA === currentSymbol ? 'text-emerald-400 font-black' : 'text-slate-300'
                          }
                        >
                          {symA}
                        </span>
                        {symA === currentSymbol && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </td>

                    {data.symbols.map((symB, colIdx) => {
                      const val = data.matrix[rowIdx][colIdx];
                      const isDiagonal = rowIdx === colIdx;
                      const cellClass = getCellColor(val, isDiagonal);

                      return (
                        <td
                          key={symB}
                          onMouseEnter={() =>
                            setHoveredCell({ symA, symB, val })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-2.5 rounded-lg border font-mono transition-transform duration-150 cursor-pointer hover:scale-105 ${cellClass}`}
                        >
                          {val >= 0 ? '+' : ''}
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Hover Detail Box */}
          {hoveredCell && (
            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono">
                  {hoveredCell.symA} ⟷ {hoveredCell.symB}
                </span>
                <span>معامل الارتباط:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {hoveredCell.val >= 0 ? '+' : ''}
                  {hoveredCell.val.toFixed(2)}
                </span>
              </div>
              <span className="text-emerald-300/90 font-medium">
                {getCorrelationLabel(hoveredCell.val)}
              </span>
            </div>
          )}

          {/* Color Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 p-2.5 rounded-xl bg-slate-900/50 border border-slate-900">
            <span className="font-medium text-slate-300">مقياس درجات الارتباط:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/70" />
                <span>+0.75 إلى +1.00 (طردي قوي)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/30" />
                <span>+0.50 إلى +0.74 (معتدل)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-800" />
                <span>-0.10 إلى +0.25 (مستقل)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-500/50" />
                <span>-1.00 إلى -0.40 (عكسي / تحوط)</span>
              </span>
            </div>
          </div>

          {/* Educational Explanation Box */}
          {showExplanation && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 font-bold pb-1 border-b border-emerald-900/50">
                <Sparkles className="w-4 h-4" />
                <span>كيف تستفيد من مصفوفة الارتباط في التداول وإدارة المحفظة؟</span>
              </div>
              <p>
                • <strong>الارتباط القوي (+0.70 إلى +1.00):</strong> إذا كانت عملتك ترتبط بشكل وثيق مع
                البيتكوين أو الإيثيريوم، فإن فتح صفقات شراء في كلاهما في نفس الوقت يضاعف مخاطرتك
                دون إضافة تنويع حقيقي.
              </p>
              <p>
                • <strong>الارتباط المنخفض أو المستقل (&lt; +0.40):</strong> العملات ذات الارتباط المنخفض
                تتحرك بفضل محفزاتها الخاصة (مثل أخبار المشروع أو نمو نظامه البيئي) مما يجعلها ممتازة لتقليل
                تذبذب المحفظة الكلي.
              </p>
              <p>
                • <strong>معامل بيتا (&beta;):</strong> يقيس مدى استجابة وتضخيم عملة {currentSymbol} لحركة البيتكوين.
                بيتا أكبر من 1.0 تعني أن العملة تتحرك بنسبة أسرع (صعوداً وهبوطاً)، بينما بيتا أقل من 1.0 تعني تذبذباً أقل حدة.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
