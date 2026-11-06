import React from 'react';
import {
  OutOfSampleDegradation,
  RegimeRobustnessResult,
} from '../../types/evidence';
import {
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

interface DegradationAnalysisViewProps {
  degradation?: OutOfSampleDegradation;
  regimes: RegimeRobustnessResult[];
}

export const DegradationAnalysisView: React.FC<DegradationAnalysisViewProps> = ({
  degradation,
  regimes,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. In-Sample vs Out-of-Sample Degradation */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h4 className="text-base font-semibold text-slate-200">
              مقارنة داخل العينة مقابل خارجها (In-Sample vs Out-of-Sample Degradation)
            </h4>
          </div>
          {degradation && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                degradation.passedDegradationTest
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {degradation.passedDegradationTest ? 'اجتاز اختبار التآكل (≤35%)' : 'تآكل غير مقبول (>35%)'}
            </span>
          )}
        </div>

        {degradation ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* In-Sample Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  داخل العينة (In-Sample التدريب)
                </div>
                <div className="text-2xl font-bold text-slate-200">
                  +{degradation.inSampleExpectancyR.toFixed(2)} R
                </div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div>نسبة النجاح: {(degradation.inSampleWinRate * 100).toFixed(1)}%</div>
                  <div>عدد الصفقات: {degradation.inSampleTradesCount} صفقة</div>
                </div>
              </div>

              {/* Degradation Gap Indicator */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-slate-400 font-medium mb-1">نسبة التآكل (Degradation)</div>
                <div
                  className={`text-2xl font-bold ${
                    degradation.passedDegradationTest ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {degradation.degradationPct >= 0 ? '-' : '+'}
                  {Math.abs(degradation.degradationPct).toFixed(1)}%
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      degradation.degradationPct <= 35
                        ? 'bg-emerald-500'
                        : degradation.degradationPct <= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(10, degradation.degradationPct))}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-2">
                  الحد الأقصى المسموح به: 35.0%
                </div>
              </div>

              {/* Out-of-Sample Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  خارج العينة (Out-of-Sample الاختبار)
                </div>
                <div
                  className={`text-2xl font-bold ${
                    degradation.outOfSampleExpectancyR > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {degradation.outOfSampleExpectancyR >= 0 ? '+' : ''}
                  {degradation.outOfSampleExpectancyR.toFixed(2)} R
                </div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div>نسبة النجاح: {(degradation.outOfSampleWinRate * 100).toFixed(1)}%</div>
                  <div>عدد الصفقات: {degradation.outOfSampleTradesCount} صفقة</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              💡 <strong className="text-slate-300">ملاحظة إحصائية:</strong> التآكل الطبيعي في أسواق الكريبتو
              يتراوح بين 15% و 30% بسبب الرسوم والانزلاق وتغير السيولة. بقاء العائد خارج العينة موجباً
              مع نسبة تآكل أقل من 35% يؤكد أن الاستراتيجية لم تقع في فخ الملاءمة المفرطة (Overfitting).
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            لم يتم تفعيل عزل العينة الخارجية في هذا الاختبار. يوصى بإجراء Out-of-Sample بنسبة 70% تدريب و 30% اختبار.
          </div>
        )}
      </div>

      {/* 2. Market Regime Robustness */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-amber-400" />
          <h4 className="text-base font-semibold text-slate-200">
            صلابة الاستراتيجية عبر أطوار السوق (Market Regime Robustness)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="p-3">طور السوق</th>
                <th className="p-3">عدد الصفقات</th>
                <th className="p-3">نسبة النجاح (مع 95% CI)</th>
                <th className="p-3">متوسط العائد E[R]</th>
                <th className="p-3">معامل الربحية PF</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {regimes.map((reg, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-sans font-medium text-slate-200">
                    {reg.regimeNameAr}
                  </td>
                  <td className="p-3 text-slate-300">{reg.tradesCount}</td>
                  <td className="p-3 text-slate-300">
                    {(reg.winRate * 100).toFixed(1)}%
                    <span className="text-[10px] text-slate-400 mr-1">
                      [{(reg.winRateCi95[0] * 100).toFixed(0)}% - {(reg.winRateCi95[1] * 100).toFixed(0)}%]
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={reg.expectancyR >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {reg.expectancyR >= 0 ? '+' : ''}{reg.expectancyR.toFixed(2)} R
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{reg.profitFactor.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    {reg.isProfitable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                        <CheckCircle2 className="w-3 h-3" /> رابحة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans">
                        <AlertTriangle className="w-3 h-3" /> خاسرة
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
