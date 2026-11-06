import React from 'react';
import {
  Zap,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  Scale,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { DerivativesData } from '../types/crypto';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface DerivativesCardProps {
  derivatives: DerivativesData;
  symbol: string;
}

export const DerivativesCard: React.FC<DerivativesCardProps> = ({
  derivatives,
  symbol,
}) => {
  const fundingRatePercent = (derivatives.fundingRate * 100).toFixed(4);
  const isPositiveFunding = derivatives.fundingRate >= 0;

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            بيانات المشتقات والعقود الآجلة والسلسلة
          </h3>
        </div>
        <span className="text-xs text-slate-400">Binance Futures Public Feed</span>
      </div>

      {/* Grid of Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Funding Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">معدل التمويل (Funding Rate)</div>
          <div
            className={`text-lg font-black font-mono mt-1 ${
              isPositiveFunding ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveFunding ? '+' : ''}
            {fundingRatePercent}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {isPositiveFunding ? 'المشترون يدفعون للبائعين (إيجابي)' : 'البائعون يدفعون للمشترين'}
          </div>
        </div>

        {/* 2. Open Interest */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">الفائدة المفتوحة (Open Interest)</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            ${(derivatives.openInterest / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            حجم العقود المفتوحة النشطة
          </div>
        </div>

        {/* 3. Long / Short Ratio */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">نسبة Long / Short</div>
          <div className="text-lg font-black text-emerald-300 font-mono mt-1">
            {derivatives.longShortRatio}:1
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            تفضيل مراكز الشراء في السوق
          </div>
        </div>

        {/* 4. BTC Dominance & Altseason */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">هيمنة BTC وموسم البديلات</div>
          <div className="text-lg font-black text-sky-400 font-mono mt-1">
            {derivatives.btcDominance}% / {derivatives.altseasonIndex}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {derivatives.altseasonIndex >= 50 ? 'موسم العملات البديلة' : 'سيطرة البيتكوين'}
          </div>
        </div>
      </div>
    </div>
  );
};
