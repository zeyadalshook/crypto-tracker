import React, { useState, useRef } from 'react';
import {
  Share2,
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Layers,
  Flame,
  Award,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { CoinDetail, FearAndGreedData, TechnicalAnalysisResult } from '../types/crypto';
import { Currency, formatCurrency, formatPercentage } from '../utils/formatters';

interface ShareAnalysisCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  fearGreed: FearAndGreedData;
  currency: Currency;
}

export const ShareAnalysisCardModal: React.FC<ShareAnalysisCardModalProps> = ({
  isOpen,
  onClose,
  coin,
  analysis,
  fearGreed,
  currency,
}) => {
  if (!isOpen) return null;

  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopiedText, setIsCopiedText] = useState<boolean>(false);
  const [cardLayout, setCardLayout] = useState<'square' | 'story'>('square');

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#050b08',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Analysis_${coin.symbol}_${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export card image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTelegramText = () => {
    const isUp = (coin.price_change_percentage_24h || 0) >= 0;
    const summaryText =
      analysis.positivePoints && analysis.positivePoints.length > 0
        ? `${analysis.positivePoints[0]}. التوصية الفنية: ${analysis.recommendation}`
        : `الاتجاه العام ${analysis.trend} مع درجة زخم ${analysis.momentumScore}/100. التوصية: ${analysis.recommendation}`;

    const text = `📊 تقرير التحليل الفني لعملة #${coin.symbol} (${coin.name})
💰 السعر اللحظي: $${coin.current_price} (${isUp ? '📈 +' : '📉 '}${coin.price_change_percentage_24h.toFixed(2)}%)
⚡ الاتجاه العام: ${analysis.trend} (الزخم: ${analysis.momentumScore}/100)
🎯 الهدف الصاعد: $${analysis.pivots.target}
🛡️ الدعم الأقرب S1: $${analysis.pivots.s1}
🚧 المقاومة R1: $${analysis.pivots.r1}
🔥 مؤشر الخوف والطمع: ${fearGreed.value}/100 (${fearGreed.classification_ar})
📈 مؤشر RSI(14): ${analysis.rsi14.toFixed(1)}

💡 خلاصة التحليل:
"${summaryText}"

⚠️ للتثقيف فقط، ليست توصية مالية مباشرة.
منصة القراءة الفنية والأساسية 🚀`;

    navigator.clipboard.writeText(text);
    setIsCopiedText(true);
    setTimeout(() => setIsCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#06110a] border border-emerald-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                تصدير بطاقة التحليل للنشر (Telegram & Instagram)
              </h2>
              <p className="text-xs text-slate-400">
                شارك بطاقة بصرية احترافية بنقرة واحدة كصورة عالية الجودة أو نص منسق.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center justify-between pt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">تنسيق البطاقة:</span>
            <button
              onClick={() => setCardLayout('square')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                cardLayout === 'square'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              مربع (Telegram & Feed 1:1)
            </button>
            <button
              onClick={() => setCardLayout('story')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                cardLayout === 'story'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              ستوري (Instagram Story 9:16)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTelegramText}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition-colors"
            >
              {isCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopiedText ? 'تم نسخ النص!' : 'نسخ النص لتليجرام'}</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'جاري التحميل...' : 'تنزيل PNG'}</span>
            </button>
          </div>
        </div>

        {/* Card Canvas to capture */}
        <div className="flex-1 overflow-y-auto py-4 flex justify-center items-center">
          <div
            ref={cardRef}
            className={`w-full bg-gradient-to-b from-[#091a10] via-[#050c07] to-[#040806] border-2 border-emerald-500/50 rounded-2xl p-6 text-slate-100 shadow-[0_0_35px_rgba(16,185,129,0.25)] flex flex-col justify-between ${
              cardLayout === 'story' ? 'max-w-[380px] min-h-[580px]' : 'max-w-[480px]'
            }`}
          >
            {/* Top Brand & Watermark */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">القراءة الفنية والأساسية</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">PRO TERMINAL</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>

            {/* Coin Header & Price */}
            <div className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {coin.image && (
                  <img src={coin.image} alt={coin.name} className="w-12 h-12 rounded-full border border-emerald-500/40" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-white">{coin.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {analysis.trend}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{coin.name}</span>
                </div>
              </div>

              <div className="text-left font-mono">
                <div className="text-xl font-black text-white">
                  ${coin.current_price < 1 ? coin.current_price.toFixed(4) : coin.current_price.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-bold mt-0.5 ${
                    coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {coin.price_change_percentage_24h.toFixed(2)}% (24س)
                </div>
              </div>
            </div>

            {/* Pivot Targets 3-Box */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-center">
                <span className="text-[10px] text-slate-400 block">الدعم S1</span>
                <span className="text-xs font-black font-mono text-rose-400 mt-0.5 block">
                  ${analysis.pivots.s1.toFixed(3)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-500/30 text-center">
                <span className="text-[10px] text-slate-400 block">المقاومة R1</span>
                <span className="text-xs font-black font-mono text-sky-400 mt-0.5 block">
                  ${analysis.pivots.r1.toFixed(3)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="text-[10px] text-emerald-300 font-bold block">الهدف 🎯</span>
                <span className="text-xs font-black font-mono text-emerald-400 mt-0.5 block">
                  ${analysis.pivots.target.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Indicators Ribbon */}
            <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">مؤشر RSI</span>
                <span className="font-mono font-bold text-slate-200">{analysis.rsi14.toFixed(1)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">قوة الزخم</span>
                <span className="font-mono font-bold text-emerald-400">{analysis.momentumScore}/100</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">الخوف والطمع</span>
                <span className="font-mono font-bold text-amber-400">{fearGreed.value} ({fearGreed.classification_ar})</span>
              </div>
            </div>

            {/* AI Verdict summary */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed my-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>رأي التحليل الفني والذكاء الاصطناعي:</span>
              </div>
              <p className="line-clamp-3 text-[11px] text-slate-300">
                {analysis.positivePoints && analysis.positivePoints.length > 0
                  ? `${analysis.positivePoints[0]}. التوصية الفنية: ${analysis.recommendation}`
                  : `الاتجاه العام ${analysis.trend} مع درجة زخم ${analysis.momentumScore}/100. التوصية: ${analysis.recommendation}`}
              </p>
            </div>

            {/* Disclaimer & Footer */}
            <div className="pt-2 border-t border-emerald-950 flex items-center justify-between text-[10px] text-slate-500">
              <span>⚠️ للتثقيف والتحليل فقط، ليست توصية مالية.</span>
              <span className="font-mono text-emerald-400/80">#CryptoAnalysis</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-emerald-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
