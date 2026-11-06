import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  Camera,
} from 'lucide-react';

interface ChartVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
}

export const ChartVisionModal: React.FC<ChartVisionModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sample Charts for fast demonstration if user doesn't have an image ready
  const sampleCharts = [
    {
      id: 'breakout',
      title: 'نموذج اختراق مثلث صاعد (Breakout Setup)',
      desc: 'اختراق مقاومة أفقية مع ارتفاع ملحوظ في الحجم',
      // SVG base64 placeholder
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" fill="%23050b08"><rect width="600" height="350" fill="%23050b08"/><path d="M 50 280 L 180 200 L 250 240 L 360 140 L 420 170 L 530 80" stroke="%2310b981" stroke-width="3" fill="none"/><line x1="50" y1="140" x2="550" y2="140" stroke="%2338bdf8" stroke-dasharray="5,5" stroke-width="2"/><line x1="50" y1="280" x2="420" y2="170" stroke="%23f59e0b" stroke-dasharray="5,5" stroke-width="2"/><text x="60" y="50" fill="%23e2e8f0" font-family="sans-serif" font-size="16" font-weight="bold">SAMPLE CHART: Ascending Triangle Breakout</text><text x="370" y="130" fill="%2338bdf8" font-family="sans-serif" font-size="12">Resistance: $94,500</text><text x="440" y="80" fill="%2310b981" font-family="sans-serif" font-size="14">Breakout Candle %2B8.4%25</text></svg>',
    },
    {
      id: 'double-bottom',
      title: 'نموذج قاع مزدوج (Double Bottom W-Pattern)',
      desc: 'ارتداد مزدوج من الدعم مع دايفرجنس إيجابي على RSI',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" fill="%23050b08"><rect width="600" height="350" fill="%23050b08"/><path d="M 50 100 L 160 270 L 280 160 L 400 270 L 520 110" stroke="%2310b981" stroke-width="3" fill="none"/><line x1="100" y1="270" x2="460" y2="270" stroke="%23f43f5e" stroke-dasharray="5,5" stroke-width="2"/><line x1="200" y1="160" x2="480" y2="160" stroke="%23f59e0b" stroke-dasharray="4,4" stroke-width="2"/><text x="60" y="50" fill="%23e2e8f0" font-family="sans-serif" font-size="16" font-weight="bold">SAMPLE CHART: Double Bottom Reversal</text><text x="170" y="295" fill="%23f43f5e" font-family="sans-serif" font-size="12">Support S1: $3,200</text><text x="290" y="150" fill="%23f59e0b" font-family="sans-serif" font-size="12">Neckline: $3,550</text></svg>',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً، الحد الأقصى هو 8 ميغابايت.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sampleUrl: string) => {
    setSelectedImage(sampleUrl);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setErrorMessage('يرجى رفع صورة الشارت أولاً أو اختيار شارت تجريبي.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/analyze-chart-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: selectedImage.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        setErrorMessage(data.error || 'تعذر تحليل الصورة، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setErrorMessage(`حدث خطأ أثناء فحص الصورة: ${err?.message || err}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#07130d] border border-emerald-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  قارئ الشارت الذكي من الصور (AI Vision Scanner)
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  Multimodal Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ارفع لقطة شاشة لأي شارت من TradingView أو Binance ليقوم الذكاء الاصطناعي باستخراج الاتجاه والدعوم والمقاومات والسيناريوهات.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Top Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>تنبيه دقة التحليل:</strong> قراءة الشارت من الصور تعتمد على وضوح الأرقام والمحاور والشموع في اللقطة. هذا التحليل استرشادي للمساعدة والتعليم ولا يُعد توصية مالية مباشرة.
            </span>
          </div>

          {/* Upload & Sample Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center cursor-pointer bg-slate-900/40 hover:bg-emerald-950/20 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-200 group-hover:text-emerald-300">
                اضغط هنا لرفع لقطة شاشة من جهازك
              </span>
              <span className="text-xs text-slate-500">
                يدعم صيغ PNG, JPG, WebP حتى 8 ميغابايت
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                أو اختر شارت تجريبي فوراً للتجربة:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {sampleCharts.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample.url)}
                    className="flex flex-col text-right p-2.5 rounded-lg bg-slate-950/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 transition-all text-xs"
                  >
                    <span className="font-bold text-emerald-300">{sample.title}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">{sample.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Image if selected */}
          {selectedImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>معاينة الشارت المحدد:</span>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysisResult(null);
                  }}
                  className="text-rose-400 hover:underline"
                >
                  إزالة الصورة
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-black/60 max-h-64 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Chart Screenshot Preview"
                  className="max-h-64 object-contain w-full"
                />
              </div>

              {/* Additional notes from trader */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ملاحظات أو أسئلة إضافية للمساعد الذكي حول هذا الشارت (اختياري):
                </label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder={`مثال: هل ترى دايفرجنس على الفريم اليومي لـ ${currentSymbol}؟ أين أفضل نقطة دخول؟`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'جاري فحص الشارت بالذكاء الاصطناعي...' : 'تحليل الشارت الآن'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#040e08] border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">
                    تقرير الفحص الفني المستخلص من الصورة
                  </span>
                </div>
                <button
                  onClick={handleCopyAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'تم النسخ!' : 'نسخ التقرير'}</span>
                </button>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                {analysisResult}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>يدعم نماذج الرؤية الحاسوبية السريعة (Gemini Multimodal Vision)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
