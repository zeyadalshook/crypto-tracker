import React, { useState } from 'react';
import {
  Calculator,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  DollarSign,
  Shield,
  Layers,
} from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult } from '../types/crypto';
import { Currency, formatCurrency } from '../utils/formatters';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  currency: Currency;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  coin,
  analysis,
  currency,
}) => {
  if (!isOpen) return null;

  const currentPrice = coin.current_price;
  const s1 = analysis.pivots.s1;
  const atrStop = currentPrice - 1.5 * analysis.atr14;
  const recommendedStop = Math.max(0.0001, Math.min(s1, atrStop));

  const [capital, setCapital] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(recommendedStop);

  const tp1 = analysis.pivots.r1;
  const tp2 = analysis.pivots.target;
  const tp3 = analysis.pivots.r2 > analysis.pivots.target ? analysis.pivots.r2 : analysis.pivots.target * 1.12;

  const riskAmount = (capital * riskPercent) / 100;
  const riskPerCoin = Math.max(0.00001, entryPrice - stopLoss);
  const coinQuantity = riskPerCoin > 0 ? riskAmount / riskPerCoin : 0;
  const positionSizeUsd = coinQuantity * entryPrice;
  const leverageRequired = positionSizeUsd > 0 && capital > 0 ? (positionSizeUsd / capital).toFixed(1) : '1.0';

  const rewardTp1 = Math.max(0, tp1 - entryPrice);
  const rrTp1 = riskPerCoin > 0 ? rewardTp1 / riskPerCoin : 0;

  const rewardTp2 = Math.max(0, tp2 - entryPrice);
  const rrTp2 = riskPerCoin > 0 ? rewardTp2 / riskPerCoin : 0;

  const rewardTp3 = Math.max(0, tp3 - entryPrice);
  const rrTp3 = riskPerCoin > 0 ? rewardTp3 / riskPerCoin : 0;

  const isBadRR = rrTp1 < 1.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="card-glow bg-[#07130c] border border-emerald-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                حاسبة حجم الصفقة وإدارة المخاطر ({coin.symbol})
              </h3>
              <p className="text-xs text-slate-400">
                حساب دقيق لحجم العقد، وقف الخسارة، ونسبة العائد إلى المخاطرة (R:R)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              إجمالي رأس مال المحفظة ($)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-sm font-mono text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نسبة المخاطرة في الصفقة (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-sm font-mono text-white focus:outline-none"
            />
            <span className="text-[11px] text-emerald-400 mt-1 block">
              قيمة المخاطرة القصوى: ${riskAmount.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              سعر الدخول المقترح ($)
            </label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-sm font-mono text-white focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                سعر وقف الخسارة ($)
              </label>
              <button
                type="button"
                onClick={() => setStopLoss(recommendedStop)}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                اقتراح آلي (1.5×ATR / S1)
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-slate-900 border border-rose-500/30 focus:border-rose-500 rounded-xl text-sm font-mono text-rose-300 focus:outline-none"
            />
          </div>
        </div>

        {/* Result Summary Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-950/80 rounded-xl border border-emerald-950/80 my-4">
          <div>
            <span className="text-[11px] text-slate-400 block">حجم الصفقة الإجمالي</span>
            <span className="text-base font-bold text-white font-mono">
              ${positionSizeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">كمية العملات المطلوبة</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {coinQuantity.toFixed(4)} {coin.symbol}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">الرافعة الفعالة المطلوبة</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {leverageRequired}x
            </span>
          </div>
        </div>

        {/* Targets & Risk/Reward Table */}
        <div className="space-y-2.5 my-4">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>الأهداف الجزئية ونسبة العائد/المخاطرة (R:R)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-emerald-400">الهدف الأول (TP1)</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  إغلاق 40%
                </span>
              </div>
              <div className="text-base font-bold text-white font-mono mt-1">
                ${tp1.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                نسبة R:R:{' '}
                <span className={`font-bold font-mono ${rrTp1 >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  1:{rrTp1.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-emerald-300">الهدف الثاني (TP2)</span>
                <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">
                  إغلاق 40%
                </span>
              </div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                ${tp2.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                نسبة R:R:{' '}
                <span className="font-bold font-mono text-emerald-400">
                  1:{rrTp2.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-sky-400">الهدف الأقصى (TP3)</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  إغلاق 20%
                </span>
              </div>
              <div className="text-base font-bold text-white font-mono mt-1">
                ${tp3.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                نسبة R:R:{' '}
                <span className="font-bold font-mono text-sky-400">
                  1:{rrTp3.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isBadRR && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 mt-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              تحذير تلقائي: نسبة العائد إلى المخاطرة للهدف الأول أقل من 1:1.5 (حالياً 1:
              {rrTp1.toFixed(2)}). يُفضل تقريب وقف الخسارة أو انتظار سعر دخول أفضل.
            </span>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors"
          >
            إغلاق ومتابعة الشارت
          </button>
        </div>
      </div>
    </div>
  );
};
