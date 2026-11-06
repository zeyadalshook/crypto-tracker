import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Star,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Camera,
} from 'lucide-react';
import { JournalTradeExtended } from '../types/discipline';
import { formatCurrency } from '../utils/formatters';

interface CloseTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: JournalTradeExtended | null;
  currentPrice: number;
  onConfirmClose: (
    tradeId: string,
    exitPrice: number,
    followedPlan: boolean,
    executionRating: number,
    exitNotes: string,
    exitScreenshotUrl?: string
  ) => void;
}

export const CloseTradeModal: React.FC<CloseTradeModalProps> = ({
  isOpen,
  onClose,
  trade,
  currentPrice,
  onConfirmClose,
}) => {
  if (!isOpen || !trade) return null;

  const [exitPrice, setExitPrice] = useState<number>(currentPrice || trade.entryPrice);
  const [followedPlan, setFollowedPlan] = useState<boolean>(true);
  const [executionRating, setExecutionRating] = useState<number>(5);
  const [exitNotes, setExitNotes] = useState<string>('');
  const [exitScreenshotUrl, setExitScreenshotUrl] = useState<string>('');

  const isLong = trade.type === 'long';
  const rawPnl = isLong
    ? trade.quantity * (exitPrice - trade.entryPrice)
    : trade.quantity * (trade.entryPrice - exitPrice);
  const pnlPercent =
    trade.entryPrice > 0
      ? (isLong
          ? (exitPrice - trade.entryPrice) / trade.entryPrice
          : (trade.entryPrice - exitPrice) / trade.entryPrice) * 100
      : 0;

  // R multiple: PnL / RiskAmount
  const riskAmount = trade.riskAmountUSDT || Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity || 1;
  const resultInR = Math.round((rawPnl / riskAmount) * 100) / 100;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setExitScreenshotUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmClose(
      trade.id,
      exitPrice,
      followedPlan,
      executionRating,
      exitNotes.trim(),
      exitScreenshotUrl || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              إغلاق الصفقة وتسجيل جودة التنفيذ
            </h3>
            <span className="text-xs text-slate-400">
              {trade.symbol} ({trade.type === 'long' ? 'شراء Long' : 'بيع Short'}) | الدخول: ${trade.entryPrice}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* PnL Preview */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">الربح/الخسارة $</span>
              <span
                className={`text-base font-bold mt-0.5 block ${
                  rawPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {rawPnl >= 0 ? '+' : ''}${rawPnl.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">النسبة %</span>
              <span
                className={`text-base font-bold mt-0.5 block ${
                  pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">مضاعف المخاطرة (R)</span>
              <span
                className={`text-base font-black mt-0.5 block ${
                  resultInR >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {resultInR >= 0 ? '+' : ''}{resultInR}R
              </span>
            </div>
          </div>

          {/* Actual Exit Price */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              سعر الخروج الفعلي ($):
            </label>
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-emerald-500 outline-none"
              required
            />
          </div>

          {/* Plan Compliance */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-slate-300 font-bold block">
              هل نُفّذت خطة التداول المسبقة بحذافيرها؟
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFollowedPlan(true)}
                className={`py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                  followedPlan
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                نعم، التزمت بالخطة
              </button>
              <button
                type="button"
                onClick={() => setFollowedPlan(false)}
                className={`py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                  !followedPlan
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                لا، كسرت الخطة
              </button>
            </div>
          </div>

          {/* Execution Rating (1 to 5 Stars) */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">
                تقييم جودة التنفيذ (Execution Quality):
              </span>
              <span className="text-amber-400 font-bold font-mono text-xs">
                {executionRating} من 5 نجوم
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              * قيّم انضباطك وصبرك وإدارتك للمخاطرة، وليس النتيجة المالية للصفقة.
            </p>
            <div className="flex items-center gap-2 pt-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setExecutionRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= executionRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Exit Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              ملاحظة الخروج والدروس المستفادة (اختياري):
            </label>
            <textarea
              value={exitNotes}
              onChange={(e) => setExitNotes(e.target.value)}
              rows={2}
              placeholder="مثال: خروج ممتاز عند الهدف الأول، أو خروج مبكر بسبب الخوف..."
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Exit Screenshot */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{exitScreenshotUrl ? 'تم إرفاق لقطة الخروج ✓' : 'إرفاق لقطة شاشة الخروج'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {exitScreenshotUrl && (
              <button
                type="button"
                onClick={() => setExitScreenshotUrl('')}
                className="text-rose-400 hover:underline text-[11px]"
              >
                إزالة
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              تأكيد إغلاق الصفقة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
