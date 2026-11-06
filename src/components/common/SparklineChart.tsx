import React, { useState, useId } from 'react';

export interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  strokeWidth?: number;
  showGradient?: boolean;
  showDot?: boolean;
  interactive?: boolean;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 96,
  height = 32,
  isPositive,
  strokeWidth = 1.75,
  showGradient = true,
  showDot = true,
  interactive = true,
  className = '',
}) => {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-[10px] text-slate-500 font-mono ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  const positive = isPositive !== undefined ? isPositive : data[data.length - 1] >= data[0];
  const strokeColor = positive ? '#10b981' : '#f43f5e';
  const fillColor = positive ? '#10b981' : '#f43f5e';

  // Math bounds with padding
  const paddingY = 4;
  const paddingX = 2;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
    const normalizedY = (val - minVal) / range;
    const y = height - paddingY - normalizedY * (height - paddingY * 2);
    return { x, y, val, idx };
  });

  // Build SVG Path
  // Smooth bezier curve generator
  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  // Area path for gradient background
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const lastPoint = points[points.length - 1];
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const closestIdx = Math.max(
      0,
      Math.min(
        data.length - 1,
        Math.round(((mouseX - paddingX) / (width - paddingX * 2)) * (data.length - 1))
      )
    );
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Format price for hover label
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.28" />
            <stop offset="85%" stopColor={fillColor} stopOpacity="0.04" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath */}
        {showGradient && (
          <path d={areaD} fill={`url(#${gradientId})`} pointerEvents="none" />
        )}

        {/* Main trendline */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {/* Last point indicator */}
        {showDot && !activePoint && (
          <g>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="3.5"
              fill={strokeColor}
              className="animate-pulse"
              opacity="0.4"
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="2"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="1"
            />
          </g>
        )}

        {/* Hover vertical crosshair & point */}
        {activePoint && (
          <g pointerEvents="none">
            <line
              x1={activePoint.x}
              y1="0"
              x2={activePoint.x}
              y2={height}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>

      {/* Floating tooltip on hover */}
      {activePoint && (
        <div
          className="absolute -top-7 pointer-events-none z-30 px-1.5 py-0.5 rounded bg-slate-950/95 border border-slate-700 text-[10px] text-white font-mono shadow-lg whitespace-nowrap transform -translate-x-1/2 flex items-center gap-1"
          style={{
            left: `${Math.max(16, Math.min(width - 16, activePoint.x))}px`,
          }}
        >
          <span className="text-slate-400">
            {activePoint.idx === data.length - 1 ? 'الآن' : `-${data.length - 1 - activePoint.idx}س`}
          </span>
          <span className="font-bold text-slate-100">{formatPrice(activePoint.val)}</span>
        </div>
      )}
    </div>
  );
};
