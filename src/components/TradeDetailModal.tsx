import React from 'react';
import {
  X,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { JournalTradeExtended } from '../types/discipline';

interface TradeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: JournalTradeExtended | null;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  isOpen,
  onClose,
  trade,
}) => {
  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="card-glow bg-[#05110a] border border-emerald-500/50 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                trade.type === 'long'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {trade.type === 'long' ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  تفاصيل صفقة {trade.symbol} ({trade.type === 'long' ? 'شراء Long' : 'بيع Short'})
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    trade.status === 'open'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : trade.pnl >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {trade.status === 'open' ? 'مركز مفتوح' : trade.pnl >= 0 ? 'صفقة رابحة' : 'صفقة خاسرة'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                الدخول: {new Date(trade.entryDate).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Financial Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">سعر الدخول</span>
            <span className="text-sm font-bold text-white mt-0.5 block">${trade.entryPrice}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-sans block">سعر الخروج</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {trade.exitPrice ? `$${trade.exitPrice}` : 'قيد التداول'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-sans block">الربح / الخسارة</span>
            <span
              className={`text-sm font-black mt-0.5 block ${
                trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} ({trade.pnlPercent.toFixed(2)}%)
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-sans block">مضاعف المخاطرة (R)</span>
            <span
              className={`text-sm font-black mt-0.5 block ${
                (trade.resultInR || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {trade.resultInR !== undefined ? `${trade.resultInR >= 0 ? '+' : ''}${trade.resultInR}R` : '—'}
            </span>
          </div>
        </div>

        {/* Discipline & Risk Controls */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
          <span className="font-bold text-emerald-400 block">إدارة المخاطر والانضباط المعتمدة:</span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">وقف الخسارة المحدد:</span>
              <span className="font-mono font-bold text-rose-400">${trade.stopLoss}</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">المبلغ المعرّض للخسارة:</span>
              <span className="font-mono font-bold text-slate-200">${trade.riskAmountUSDT?.toFixed(1) || '—'}</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">الهدف الأول TP1:</span>
              <span className="font-mono font-bold text-emerald-400">${trade.takeProfit1}</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">نسبة R:R المخططة:</span>
              <span className="font-mono font-bold text-white">1:{trade.riskRewardRatio}</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">الالتزام بالخطة:</span>
              <span className={`font-bold ${trade.followedPlan ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trade.followedPlan ? 'نعم ✓' : 'لا ❌ كسر الخطة'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">جودة التنفيذ:</span>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= (trade.executionRating || 5)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="font-bold text-slate-300 block mb-1">سبب الدخول الفني:</span>
            <p className="text-slate-200 leading-relaxed">{trade.entryReason}</p>
          </div>

          {trade.notes && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-slate-300 block mb-1">ملاحظات ودروس الصفقة:</span>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed">{trade.notes}</p>
            </div>
          )}

          {trade.exitNotes && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-emerald-300 block mb-1">ملاحظة الإغلاق:</span>
              <p className="text-slate-300 leading-relaxed">{trade.exitNotes}</p>
            </div>
          )}
        </div>

        {/* Screenshots if available */}
        {(trade.chartScreenshotUrl || trade.exitScreenshotUrl) && (
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-300 block">لقطات الشارت المحفوظة:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trade.chartScreenshotUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <span className="text-[10px] text-slate-400 p-2 block bg-slate-900">لقطة الدخول</span>
                  <img
                    src={trade.chartScreenshotUrl}
                    alt="Entry Chart"
                    className="w-full h-44 object-cover hover:object-contain transition-all"
                  />
                </div>
              )}
              {trade.exitScreenshotUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <span className="text-[10px] text-slate-400 p-2 block bg-slate-900">لقطة الخروج</span>
                  <img
                    src={trade.exitScreenshotUrl}
                    alt="Exit Chart"
                    className="w-full h-44 object-cover hover:object-contain transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {trade.tags && trade.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {trade.tags.map((t, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 text-[11px] border border-slate-800"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-emerald-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
