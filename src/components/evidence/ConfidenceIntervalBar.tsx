import React from 'react';
import { MetricWithCI } from '../../types/evidence';

interface ConfidenceIntervalBarProps {
  label: string;
  metric: MetricWithCI;
  unit?: string;
  isPercentage?: boolean;
  zeroThreshold?: number; // baseline zero line (e.g. 0 for Expectancy, 50 for Win Rate)
  minDisplay?: number;
  maxDisplay?: number;
}

export const ConfidenceIntervalBar: React.FC<ConfidenceIntervalBarProps> = ({
  label,
  metric,
  unit = '',
  isPercentage = false,
  zeroThreshold = 0,
  minDisplay,
  maxDisplay,
}) => {
  const [lower, upper] = metric.ci95;
  const point = metric.point;

  // Format values
  const formatVal = (val: number) => {
    if (isPercentage) return `${(val * 100).toFixed(1)}%`;
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}${unit}`;
  };

  const pointDisplay = isPercentage ? point * 100 : point;
  const lowerDisplay = isPercentage ? lower * 100 : lower;
  const upperDisplay = isPercentage ? upper * 100 : upper;

  // Compute visual bounds
  const autoMin = minDisplay !== undefined ? minDisplay : Math.min(lowerDisplay * 1.3, zeroThreshold - 1);
  const autoMax = maxDisplay !== undefined ? maxDisplay : Math.max(upperDisplay * 1.3, zeroThreshold + 2);
  const span = Math.max(0.1, autoMax - autoMin);

  const getPercent = (v: number) => {
    return Math.max(0, Math.min(100, ((v - autoMin) / span) * 100));
  };

  const leftPct = getPercent(lowerDisplay);
  const rightPct = getPercent(upperDisplay);
  const pointPct = getPercent(pointDisplay);
  const zeroPct = getPercent(zeroThreshold);

  const isHealthy = lowerDisplay > zeroThreshold;
  const isNeutral = lowerDisplay <= zeroThreshold && pointDisplay > zeroThreshold;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-medium text-slate-400">{label}</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              className={`text-lg font-bold ${
                isHealthy
                  ? 'text-emerald-400'
                  : isNeutral
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {formatVal(point)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              [مجال الثقة 95%: {formatVal(lower)} إلى {formatVal(upper)}]
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            N = {metric.sampleSize}
          </span>
          {metric.standardError !== undefined && (
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              خطأ معياري: ±{metric.standardError.toFixed(3)}
            </div>
          )}
        </div>
      </div>

      {/* Visual Interval Track */}
      <div className="relative h-6 bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800/80 my-2">
        {/* Zero / Baseline reference line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10 dashed"
          style={{ left: `${zeroPct}%` }}
          title={`الحد المحايد: ${zeroThreshold}`}
        />

        {/* 95% Confidence Range Bar */}
        <div
          className={`absolute top-1 bottom-1 rounded transition-all duration-300 opacity-80 ${
            isHealthy
              ? 'bg-emerald-500/30 border border-emerald-500/60'
              : isNeutral
              ? 'bg-amber-500/30 border border-amber-500/60'
              : 'bg-rose-500/30 border border-rose-500/60'
          }`}
          style={{
            left: `${Math.min(leftPct, rightPct)}%`,
            width: `${Math.max(2, Math.abs(rightPct - leftPct))}%`,
          }}
        />

        {/* Point Estimate Marker */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-2 -ml-1 rounded shadow-md z-20 ${
            isHealthy
              ? 'bg-emerald-400'
              : isNeutral
              ? 'bg-amber-400'
              : 'bg-rose-400'
          }`}
          style={{ left: `${pointPct}%` }}
          title={`التقدير النقطي: ${formatVal(point)}`}
        />
      </div>

      {/* Axis Scale labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
        <span>{isPercentage ? `${autoMin.toFixed(0)}%` : autoMin.toFixed(1)}</span>
        <span className="text-slate-400">عتبة الأساس ({zeroThreshold})</span>
        <span>{isPercentage ? `${autoMax.toFixed(0)}%` : autoMax.toFixed(1)}</span>
      </div>
    </div>
  );
};
