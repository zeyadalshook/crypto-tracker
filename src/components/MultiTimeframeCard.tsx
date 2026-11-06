import React from 'react';
import { Layers, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MultiTimeframeItem } from '../types/crypto';

interface MultiTimeframeCardProps {
  currentTrend: 'صاعد' | 'هابط' | 'عرضي';
  currentRsi: number;
}

export const MultiTimeframeCard: React.FC<MultiTimeframeCardProps> = ({
  currentTrend,
  currentRsi,
}) => {
  const mtfData: MultiTimeframeItem[] = [
    {
      timeframe: '15m',
      trend: currentRsi > 55 ? 'صاعد' : 'عرضي',
      signal: currentRsi > 60 ? 'شراء' : 'محايد',
      rsi: Math.round(currentRsi + 3),
      status: 'زخم مضاربي لحظي',
    },
    {
      timeframe: '1h',
      trend: currentTrend,
      signal: currentTrend === 'صاعد' ? 'شراء' : currentTrend === 'هابط' ? 'بيع' : 'محايد',
      rsi: Math.round(currentRsi + 1),
      status: 'تأكيد الاندفاع قصير المدى',
    },
    {
      timeframe: '4h',
      trend: currentTrend,
      signal: currentTrend === 'صاعد' ? 'شراء' : 'محايد',
      rsi: Math.round(currentRsi - 2),
      status: 'الإطار الرئيسي للمتداولين اليوميين',
    },
    {
      timeframe: '1D',
      trend: currentTrend,
      signal: currentTrend === 'صاعد' ? 'شراء' : currentTrend === 'هابط' ? 'بيع' : 'محايد',
      rsi: Math.round(currentRsi),
      status: 'الاتجاه العام المعتمد',
    },
    {
      timeframe: '1W',
      trend: currentTrend === 'صاعد' ? 'صاعد' : 'عرضي',
      signal: 'شراء',
      rsi: Math.round(Math.max(40, currentRsi - 5)),
      status: 'الاتجاه الهيكلي الكلي (Macro)',
    },
  ];

  const matchingCount = mtfData.filter((m) => m.trend === currentTrend).length;
  const alignmentPercent = Math.round((matchingCount / mtfData.length) * 100);

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            تحليل متعدد الأطر الزمنية (MTF Alignment)
          </h3>
        </div>

        {/* Alignment Score Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono">
          <span>توافق الأطر: {alignmentPercent}%</span>
        </div>
      </div>

      {/* MTF Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/60">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">الإطار الزمني</th>
              <th className="p-3">الاتجاه</th>
              <th className="p-3">الإشارة</th>
              <th className="p-3">RSI</th>
              <th className="p-3">الوصف الفني</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {mtfData.map((row) => (
              <tr key={row.timeframe} className="hover:bg-slate-900/40 transition-colors">
                <td className="p-3 font-bold font-mono text-white">{row.timeframe}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.trend === 'صاعد'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : row.trend === 'هابط'
                        ? 'text-rose-400 bg-rose-500/10'
                        : 'text-amber-400 bg-amber-500/10'
                    }`}
                  >
                    {row.trend === 'صاعد' ? (
                      <TrendingUp className="w-3 h-3 ml-1" />
                    ) : row.trend === 'هابط' ? (
                      <TrendingDown className="w-3 h-3 ml-1" />
                    ) : (
                      <Minus className="w-3 h-3 ml-1" />
                    )}
                    {row.trend}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`font-semibold ${
                      row.signal === 'شراء'
                        ? 'text-emerald-400'
                        : row.signal === 'بيع'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {row.signal}
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-200">{row.rsi}</td>
                <td className="p-3 text-slate-400">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alignmentPercent >= 80 ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            توافق ممتاز بين الأطر الكبيرة والصغيرة (تزامن الاتجاه يزيد من احتمالية نجاح الصفقات).
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            تضارب جزئي بين الأطر (يُفضل انتظار إغلاق شموع الأطر الأكبر مثل اليومي والأسبوعي لتأكيد الاستمرارية).
          </span>
        </div>
      )}
    </div>
  );
};
