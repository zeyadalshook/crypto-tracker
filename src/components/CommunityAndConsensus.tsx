import React from 'react';
import { Users, Compass, Layers, CheckCircle, AlertCircle, MinusCircle } from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult } from '../types/crypto';

interface CommunityAndConsensusProps {
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
}

export const CommunityAndConsensus: React.FC<CommunityAndConsensusProps> = ({
  coin,
  analysis,
}) => {
  const upPercent = coin.sentiment_votes_up_percentage || 82;
  const downPercent = 100 - upPercent;

  const { maConsensus, oscillatorsConsensus } = analysis;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (upPercent / 100) * circumference;

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            آراء المجتمع وإجماع المؤشرات
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          تحليل مجمع لـ 18 مؤشراً فنياً واستطلاع المتداولين
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* 1. Community Sentiment Donut Chart */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            تصويت مجتمع CoinGecko
          </div>

          <div className="relative w-28 h-28 flex items-center justify-center my-1">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="#f43f5e"
                strokeWidth="10"
                fill="transparent"
                opacity="0.3"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="#10b981"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {upPercent}%
              </span>
              <span className="text-[10px] text-slate-400">متفائل</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs mt-2 w-full pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-bold">{upPercent}% إيجابي</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">{downPercent}% سلبي</span>
            </div>
          </div>
        </div>

        {/* 2. Moving Averages Consensus (12 Indicators) */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-300">
                إجماع المتوسطات (12 مؤشراً)
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold ${
                  maConsensus.overall.includes('شراء')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : maConsensus.overall.includes('بيع')
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {maConsensus.overall}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 mb-3 bg-slate-950/70 rounded-lg text-center border border-slate-800/80">
              <div>
                <span className="block text-emerald-400 text-lg font-black font-mono">
                  {maConsensus.buyCount}
                </span>
                <span className="text-[10px] text-slate-400">شراء</span>
              </div>
              <div>
                <span className="block text-amber-400 text-lg font-black font-mono">
                  {maConsensus.neutralCount}
                </span>
                <span className="text-[10px] text-slate-400">محايد</span>
              </div>
              <div>
                <span className="block text-rose-400 text-lg font-black font-mono">
                  {maConsensus.sellCount}
                </span>
                <span className="text-[10px] text-slate-400">بيع</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
              {maConsensus.items.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-0.5 border-b border-slate-800/40 text-slate-300"
                >
                  <span className="font-mono text-slate-400">{item.name}</span>
                  <span
                    className={`font-semibold ${
                      item.action === 'شراء'
                        ? 'text-emerald-400'
                        : item.action === 'بيع'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Oscillators Consensus (6 Indicators) */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-300">
                إجماع المذبذبات (6 مؤشرات)
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold ${
                  oscillatorsConsensus.overall.includes('شراء')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : oscillatorsConsensus.overall.includes('بيع')
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {oscillatorsConsensus.overall}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 mb-3 bg-slate-950/70 rounded-lg text-center border border-slate-800/80">
              <div>
                <span className="block text-emerald-400 text-lg font-black font-mono">
                  {oscillatorsConsensus.buyCount}
                </span>
                <span className="text-[10px] text-slate-400">شراء</span>
              </div>
              <div>
                <span className="block text-amber-400 text-lg font-black font-mono">
                  {oscillatorsConsensus.neutralCount}
                </span>
                <span className="text-[10px] text-slate-400">محايد</span>
              </div>
              <div>
                <span className="block text-rose-400 text-lg font-black font-mono">
                  {oscillatorsConsensus.sellCount}
                </span>
                <span className="text-[10px] text-slate-400">بيع</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
              {oscillatorsConsensus.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-0.5 border-b border-slate-800/40 text-slate-300"
                >
                  <span className="font-mono text-slate-400">{item.name}</span>
                  <span
                    className={`font-semibold ${
                      item.action === 'شراء'
                        ? 'text-emerald-400'
                        : item.action === 'بيع'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
