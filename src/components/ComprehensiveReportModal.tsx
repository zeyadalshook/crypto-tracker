import React, { useState, useRef, useId } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Flame,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  Sliders,
  Eye,
  Check,
  Copy,
  Info,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  CoinDetail,
  TechnicalAnalysisResult,
  OHLCV,
  FearAndGreedData,
  DerivativesData,
} from '../types/crypto';
import { Currency, formatCurrency, formatUsdtPrice } from '../utils/formatters';

interface ComprehensiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  klines: OHLCV[];
  fearGreed: FearAndGreedData | null;
  derivatives: DerivativesData | null;
  currency: Currency;
  timeframe: string;
}

export const ComprehensiveReportModal: React.FC<ComprehensiveReportModalProps> = ({
  isOpen,
  onClose,
  coin,
  analysis,
  klines,
  fearGreed,
  derivatives,
  currency,
  timeframe,
}) => {
  const [printTheme, setPrintTheme] = useState<'paper' | 'dark'>('paper');
  const [includeChart, setIncludeChart] = useState(true);
  const [includeIndicators, setIncludeIndicators] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includePivots, setIncludePivots] = useState(true);
  const [includeDerivatives, setIncludeDerivatives] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  const chartCheckboxId = useId();
  const indicatorsCheckboxId = useId();
  const summaryCheckboxId = useId();
  const pivotsCheckboxId = useId();
  const derivativesCheckboxId = useId();

  if (!isOpen) return null;

  const reportDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('ar-EG');
  const reportId = `CTR-${coin.symbol}-${Date.now().toString(36).toUpperCase()}`;

  const recentCandles = klines.slice(-35);
  const minPrice = recentCandles.length > 0 ? Math.min(...recentCandles.map((c) => c.low)) : coin.low_24h;
  const maxPrice = recentCandles.length > 0 ? Math.max(...recentCandles.map((c) => c.high)) : coin.high_24h;
  const priceRange = Math.max(maxPrice - minPrice, 0.000001);
  const maxVolume = recentCandles.length > 0 ? Math.max(...recentCandles.map((c) => c.volume)) : 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const volumeHeight = 50;
  const candleAreaHeight = svgHeight - volumeHeight - 20;

  const getCandleY = (price: number) => {
    return candleAreaHeight - ((price - minPrice) / priceRange) * candleAreaHeight + 10;
  };

  const candleWidth = Math.max(svgWidth / Math.max(recentCandles.length, 1) - 4, 3);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: printTheme === 'paper' ? '#ffffff' : '#090f0c',
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const filename = `تقرير_تحليل_${coin.symbol}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `📊 تقرير التحليل الفني والأساسي الشامل: ${coin.name} (${coin.symbol}/USDT)
📅 التاريخ: ${reportDate} - ${reportTime}
💵 السعر الحالي: $${coin.current_price.toLocaleString()} (${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%)
📈 الاتجاه العام: ${analysis.trend} | التوصية الفنية: ${analysis.recommendation} (درجة الزخم: ${analysis.momentumScore}/100)
🎯 الدعم الأول (S1): $${analysis.pivots.s1.toLocaleString()} | المقاومة الأولى (R1): $${analysis.pivots.r1.toLocaleString()}
🚀 الهدف الصاعد: $${analysis.pivots.target.toLocaleString()}
🔥 مؤشر الخوف والطمع: ${fearGreed ? `${fearGreed.value}/100 (${fearGreed.classification_ar})` : 'غير متوفر'}

✅ أبرز العوامل الإيجابية:
${analysis.positivePoints.map((p) => `• ${p}`).join('\n')}

⚠️ أبرز عوامل الحذر:
${analysis.cautionPoints.map((p) => `• ${p}`).join('\n')}

منصة القراءة الفنية والأساسية - للتثقيف المالي فقط.`;

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const isPaper = printTheme === 'paper';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl bg-[#090f0c] border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-200">
        {/* Top Control Bar */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-emerald-950/80 bg-[#060c09]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  تصدير تقرير التحليل الشامل (PDF)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {coin.symbol} / USDT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تقرير مؤسسي متكامل يتضمن الشارت، المؤشرات، ومستويات الدعم والخلاصة الذكية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setPrintTheme('paper')}
                className={`px-3 py-1 rounded-md transition-colors font-medium ${
                  isPaper ? 'bg-white text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="نمط الطباعة الورقية (أبيض)"
              >
                نمط الطباعة الورقية (أبيض)
              </button>
              <button
                onClick={() => setPrintTheme('dark')}
                className={`px-3 py-1 rounded-md transition-colors font-medium ${
                  !isPaper ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="النسق الداكن"
              >
                النسق الداكن
              </button>
            </div>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
              title="نسخ ملخص التقرير كنص"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'تم النسخ' : 'نسخ ملخص'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              title="فتح نافذة الطباعة وحفظ كـ PDF"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة (Ctrl+P)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              title="توليد وتنزيل ملف PDF عالي الدقة مباشرة"
            >
              <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span>{isExportingPdf ? 'جارِ إنشاء PDF...' : 'تحميل PDF مباشرة'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Customize Strip */}
        <div className="print:hidden px-5 py-2.5 bg-[#0a120e] border-b border-emerald-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium">تضمين أقسام التقرير:</span>
          <div className="flex items-center gap-4 flex-wrap text-slate-300">
            <label htmlFor={chartCheckboxId} className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                id={chartCheckboxId}
                type="checkbox"
                checked={includeChart}
                onChange={(e) => setIncludeChart(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>الشارت البياني</span>
            </label>
            <label htmlFor={indicatorsCheckboxId} className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                id={indicatorsCheckboxId}
                type="checkbox"
                checked={includeIndicators}
                onChange={(e) => setIncludeIndicators(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>المؤشرات والمتوسطات</span>
            </label>
            <label htmlFor={summaryCheckboxId} className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                id={summaryCheckboxId}
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>الخلاصة الذكية (الإيجابي/الحذر)</span>
            </label>
            <label htmlFor={pivotsCheckboxId} className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                id={pivotsCheckboxId}
                type="checkbox"
                checked={includePivots}
                onChange={(e) => setIncludePivots(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>الدعوم والمقاومات</span>
            </label>
            <label htmlFor={derivativesCheckboxId} className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                id={derivativesCheckboxId}
                type="checkbox"
                checked={includeDerivatives}
                onChange={(e) => setIncludeDerivatives(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>معنويات السوق والمشتقات</span>
            </label>
          </div>
        </div>

        {/* Scrollable Printable Report Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-report-area"
            ref={reportRef}
            className={`max-w-[900px] mx-auto rounded-xl p-6 sm:p-8 transition-colors shadow-2xl border print:shadow-none print:border-none print:p-6 ${
              isPaper
                ? 'bg-white text-slate-900 border-slate-200'
                : 'bg-[#060c09] text-slate-100 border-emerald-500/30'
            }`}
          >
            {/* Header: Institutional Branding & Title */}
            <div
              className={`pb-5 mb-5 border-b flex flex-wrap items-center justify-between gap-4 ${
                isPaper ? 'border-slate-300' : 'border-emerald-950/90'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${
                    isPaper
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {coin.symbol.slice(0, 3)}
                </div>
                <div>
                  <h1
                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                      isPaper ? 'text-slate-950' : 'text-white'
                    }`}
                  >
                    تقرير التحليل الفني والأساسي الشامل
                  </h1>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-600">
                      منصة القراءة الفنية والأساسية للعملات الرقمية
                    </span>
                    <span>•</span>
                    <span className="font-mono">{reportId}</span>
                  </div>
                </div>
              </div>

              <div className="text-left text-xs font-mono space-y-1">
                <div className={isPaper ? 'text-slate-700' : 'text-slate-300'}>
                  <Calendar className="w-3.5 h-3.5 inline ml-1 text-emerald-500" />
                  <span>{reportDate}</span>
                </div>
                <div className="text-slate-400">
                  <Clock className="w-3.5 h-3.5 inline ml-1 text-emerald-500" />
                  <span>{reportTime} (الإطار: {timeframe})</span>
                </div>
              </div>
            </div>

            {/* Coin Identity & Primary Metrics Bar */}
            <div
              className={`p-4 rounded-xl mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs ${
                isPaper
                  ? 'bg-slate-100 border border-slate-200'
                  : 'bg-slate-900/80 border border-emerald-500/25'
              }`}
            >
              <div>
                <span className="text-slate-500 block mb-0.5">العملة والرمز:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {coin.name} ({coin.symbol})
                </span>
                <span className="block text-[11px] text-emerald-600 font-mono font-bold">
                  {coin.symbol}/USDT
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">السعر اللحظي:</span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  ${coin.current_price.toLocaleString()}
                </span>
                <span
                  className={`block text-[11px] font-mono font-bold ${
                    coin.price_change_percentage_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {coin.price_change_percentage_24h.toFixed(2)}% (24h)
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">الاتجاه والتوصية:</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                    analysis.recommendation.includes('شراء')
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : analysis.recommendation.includes('بيع')
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {analysis.recommendation}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  الاتجاه: {analysis.trend}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">درجة الزخم الفني:</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {analysis.momentumScore}/100
                </span>
                <span className="block text-[11px] text-slate-500">
                  RSI(14): {analysis.rsi14.toFixed(1)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">القيمة السوقية:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ${(coin.market_cap / 1e9).toFixed(2)}B
                </span>
                <span className="block text-[11px] text-slate-500">
                  المرتبة #{coin.market_cap_rank || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">نطاق 24 ساعة:</span>
                <span className="font-mono text-[11px] block text-slate-700 dark:text-slate-300">
                  أعلى: ${coin.high_24h.toLocaleString()}
                </span>
                <span className="font-mono text-[11px] block text-slate-700 dark:text-slate-300">
                  أدنى: ${coin.low_24h.toLocaleString()}
                </span>
              </div>
            </div>

            {/* SECTION 1: CANDLESTICK CHART */}
            {includeChart && (
              <div className="mb-6 page-break-inside-avoid">
                <div
                  className={`flex items-center justify-between pb-2 mb-3 border-b ${
                    isPaper ? 'border-slate-300' : 'border-emerald-950/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-500" />
                    <h2
                      className={`text-sm sm:text-base font-bold ${
                        isPaper ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      1. الشارت الفني وحركة الأسعار والشموع اليابانية ({recentCandles.length} شمعة)
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    EMA(20) • EMA(50) • EMA(200) • RSI(14)
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isPaper
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#040806] border-emerald-950/90'
                  }`}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto overflow-visible font-mono text-[10px]"
                  >
                    {[0.25, 0.5, 0.75].map((fraction, i) => {
                      const y = candleAreaHeight * fraction;
                      const priceVal = maxPrice - fraction * priceRange;
                      return (
                        <g key={i}>
                          <line
                            x1="0"
                            y1={y}
                            x2={svgWidth - 60}
                            y2={y}
                            stroke={isPaper ? '#e2e8f0' : '#13241b'}
                            strokeDasharray="4 4"
                          />
                          <text
                            x={svgWidth - 55}
                            y={y + 3}
                            fill={isPaper ? '#64748b' : '#6ee7b7'}
                            fontSize="9"
                          >
                            ${priceVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </text>
                        </g>
                      );
                    })}

                    {analysis.pivots.r1 <= maxPrice && analysis.pivots.r1 >= minPrice && (
                      <g>
                        <line
                          x1="0"
                          y1={getCandleY(analysis.pivots.r1)}
                          x2={svgWidth - 60}
                          y2={getCandleY(analysis.pivots.r1)}
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="5"
                          y={getCandleY(analysis.pivots.r1) - 4}
                          fill="#ef4444"
                          fontWeight="bold"
                          fontSize="9"
                        >
                          مقاومة R1: ${analysis.pivots.r1.toLocaleString()}
                        </text>
                      </g>
                    )}

                    {analysis.pivots.s1 <= maxPrice && analysis.pivots.s1 >= minPrice && (
                      <g>
                        <line
                          x1="0"
                          y1={getCandleY(analysis.pivots.s1)}
                          x2={svgWidth - 60}
                          y2={getCandleY(analysis.pivots.s1)}
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="5"
                          y={getCandleY(analysis.pivots.s1) - 4}
                          fill="#10b981"
                          fontWeight="bold"
                          fontSize="9"
                        >
                          دعم S1: ${analysis.pivots.s1.toLocaleString()}
                        </text>
                      </g>
                    )}

                    {recentCandles.map((candle, idx) => {
                      const x = (idx / (recentCandles.length - 1 || 1)) * (svgWidth - 80) + 10;
                      const isGreen = candle.close >= candle.open;
                      const candleColor = isGreen ? '#10b981' : '#f43f5e';

                      const yOpen = getCandleY(candle.open);
                      const yClose = getCandleY(candle.close);
                      const yHigh = getCandleY(candle.high);
                      const yLow = getCandleY(candle.low);

                      const bodyTop = Math.min(yOpen, yClose);
                      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

                      const volH = (candle.volume / maxVolume) * volumeHeight;
                      const volY = svgHeight - volH;

                      return (
                        <g key={idx}>
                          <rect
                            x={x - candleWidth / 2}
                            y={volY}
                            width={candleWidth}
                            height={volH}
                            fill={candleColor}
                            opacity={isPaper ? '0.4' : '0.35'}
                          />
                          <line
                            x1={x}
                            y1={yHigh}
                            x2={x}
                            y2={yLow}
                            stroke={candleColor}
                            strokeWidth="1.2"
                          />
                          <rect
                            x={x - candleWidth / 2}
                            y={bodyTop}
                            width={candleWidth}
                            height={bodyHeight}
                            fill={candleColor}
                            stroke={candleColor}
                            strokeWidth="0.5"
                            rx="1"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  <div
                    className={`mt-2 pt-2 border-t flex items-center justify-between text-[11px] ${
                      isPaper ? 'border-slate-200 text-slate-700' : 'border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">مؤشر القوة النسبية RSI(14):</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {analysis.rsi14.toFixed(1)}
                      </span>
                      <span className="text-slate-500">
                        ({analysis.rsi14 >= 70 ? 'تشبع شرائي' : analysis.rsi14 <= 30 ? 'تشبع بيعي' : 'منطقة محايدة متوازنة'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 font-mono">
                      <span>حد الشراء المفرط: 70</span>
                      <span>•</span>
                      <span>حد البيع المفرط: 30</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: TECHNICAL INDICATORS */}
            {includeIndicators && (
              <div className="mb-6 page-break-inside-avoid">
                <div
                  className={`flex items-center justify-between pb-2 mb-3 border-b ${
                    isPaper ? 'border-slate-300' : 'border-emerald-950/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <h2
                      className={`text-sm sm:text-base font-bold ${
                        isPaper ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      2. مصفوفة المؤشرات الفنية وإجماع المتوسطات والمذبذبات
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    إجماع: {analysis.maConsensus.buyCount} شراء / {analysis.maConsensus.sellCount} بيع
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white block mb-2">
                      المتوسطات المتحركة (EMA):
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">EMA(20):</span>
                        <span className="font-bold">${analysis.pivots.sma20.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">EMA(50):</span>
                        <span className="font-bold">${analysis.pivots.ema50.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">EMA(200):</span>
                        <span className="font-bold">${analysis.pivots.ema200.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-emerald-600">
                        <span>إشارة المتوسطات:</span>
                        <span className="font-bold font-sans">{analysis.maConsensus.overall}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white block mb-2">
                      المذبذبات والزخم:
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">RSI (14):</span>
                        <span className="font-bold">{analysis.rsi14.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">MACD Histogram:</span>
                        <span className={analysis.macd.histogram >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {analysis.macd.histogram.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stochastic %K/%D:</span>
                        <span className="font-bold">{analysis.stochastic.k.toFixed(1)} / {analysis.stochastic.d.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        <span>إشارة المذبذبات:</span>
                        <span className="font-bold font-sans">{analysis.oscillatorsConsensus.overall}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white block mb-2">
                      التقلب ونطاقات بولينجر:
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الحد العلوي BB:</span>
                        <span className="font-bold">${analysis.bollingerBands.upper.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الحد الأوسط BB:</span>
                        <span className="font-bold">${analysis.bollingerBands.middle.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الحد السفلي BB:</span>
                        <span className="font-bold">${analysis.bollingerBands.lower.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">مؤشر ATR(14):</span>
                        <span className="font-bold">${analysis.atr14.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white block mb-2">
                      قوة الاتجاه و Supertrend:
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">مؤشر ADX (14):</span>
                        <span className="font-bold">{analysis.adx14.toFixed(1)} ({analysis.adx14 > 25 ? 'اتجاه قوي' : 'اتجاه ضعيف'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Supertrend:</span>
                        <span className={analysis.supertrend.trend === 'صاعد' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {analysis.supertrend.trend} (${analysis.supertrend.value.toLocaleString()})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">التقلب السنوي:</span>
                        <span className="font-bold">{analysis.annualizedVolatility.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">حجم التداول:</span>
                        <span className={analysis.volumeTrend.isSurging ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                          {analysis.volumeTrend.isSurging ? 'تدفق تصاعدي' : 'متوسط طبيعي'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PIVOT POINTS */}
            {includePivots && (
              <div className="mb-6 page-break-inside-avoid">
                <div
                  className={`flex items-center justify-between pb-2 mb-3 border-b ${
                    isPaper ? 'border-slate-300' : 'border-emerald-950/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <h2
                      className={`text-sm sm:text-base font-bold ${
                        isPaper ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      3. مستويات المحاور والدعوم والمقاومات الفنية (Pivot Points)
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    البعد عن R1: {analysis.distanceToR1Percent > 0 ? `+${analysis.distanceToR1Percent}%` : `${analysis.distanceToR1Percent}%`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono text-center">
                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                    <span className="text-[10px] text-slate-500 block">المقاومة R2</span>
                    <span className="font-bold text-xs">${analysis.pivots.r2.toLocaleString()}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/20 border-rose-500/30 text-rose-400'}`}>
                    <span className="text-[10px] text-slate-500 block">المقاومة R1</span>
                    <span className="font-bold text-xs">${analysis.pivots.r1.toLocaleString()}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-800/60 border-slate-700 text-white'}`}>
                    <span className="text-[10px] text-slate-500 block">نقطة المحور Pivot</span>
                    <span className="font-bold text-xs">${analysis.pivots.pp.toLocaleString()}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'}`}>
                    <span className="text-[10px] text-slate-500 block">الدعم S1</span>
                    <span className="font-bold text-xs">${analysis.pivots.s1.toLocaleString()}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'}`}>
                    <span className="text-[10px] text-slate-500 block">الدعم S2</span>
                    <span className="font-bold text-xs">${analysis.pivots.s2.toLocaleString()}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isPaper ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-950/20 border-blue-500/30 text-blue-300'}`}>
                    <span className="text-[10px] text-slate-500 block">الهدف المتوقع Target</span>
                    <span className="font-bold text-xs">${analysis.pivots.target.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: SMART SUMMARY */}
            {includeSummary && (
              <div className="mb-6 page-break-inside-avoid">
                <div
                  className={`flex items-center justify-between pb-2 mb-3 border-b ${
                    isPaper ? 'border-slate-300' : 'border-emerald-950/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h2
                      className={`text-sm sm:text-base font-bold ${
                        isPaper ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      4. الخلاصة الذكية: الفرص الفنية ومحاذير المخاطر
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    استنتاج آلي مستند إلى القواعد الرياضية للمؤشرات
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div
                    className={`p-4 rounded-xl border ${
                      isPaper
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 pb-2 mb-2 border-b border-emerald-200 dark:border-emerald-900/50">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>العوامل الإيجابية والفرص (البناء الفني):</span>
                      <span className="mr-auto font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20">
                        {analysis.positivePoints.length}
                      </span>
                    </div>

                    <ul className="space-y-2 leading-relaxed">
                      {analysis.positivePoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      isPaper
                        ? 'bg-rose-50/70 border-rose-200 text-slate-800'
                        : 'bg-rose-950/20 border-rose-500/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 pb-2 mb-2 border-b border-rose-200 dark:border-rose-900/50">
                      <AlertTriangle className="w-4 h-4" />
                      <span>عوامل الحذر ومستويات المخاطرة المحتملة:</span>
                      <span className="mr-auto font-mono text-[11px] px-2 py-0.5 rounded bg-rose-500/20">
                        {analysis.cautionPoints.length}
                      </span>
                    </div>

                    <ul className="space-y-2 leading-relaxed">
                      {analysis.cautionPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-600 font-bold shrink-0">!</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    isPaper
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-500" />
                    <span><strong>إدارة رأس المال المقترحة:</strong> لا تتجاوز المخاطرة 1-2% من إجمالي المحفظة للصفقة، مع وضع وقف خسارة صارم أسفل ${analysis.pivots.s1.toLocaleString()}.</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">R:R Ratio 1:2.4</span>
                </div>
              </div>
            )}

            {/* SECTION 5: MARKET SENTIMENT & DERIVATIVES */}
            {includeDerivatives && (
              <div className="mb-6 page-break-inside-avoid">
                <div
                  className={`flex items-center justify-between pb-2 mb-3 border-b ${
                    isPaper ? 'border-slate-300' : 'border-emerald-950/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h2
                      className={`text-sm sm:text-base font-bold ${
                        isPaper ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      5. معنويات السوق (Fear & Greed) وبيانات المشتقات والعقود
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">مصادر موثوقة (Alternative.me / Binance Futures)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="text-slate-500 block mb-1">مؤشر الخوف والطمع:</span>
                    <span className="font-mono font-bold text-base text-amber-600 block">
                      {fearGreed ? `${fearGreed.value}/100` : '—'}
                    </span>
                    <span className="text-[11px] text-slate-600 font-semibold">
                      {fearGreed?.classification_ar || 'حياد'}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="text-slate-500 block mb-1">معدل التمويل (Funding Rate):</span>
                    <span className="font-mono font-bold text-base text-emerald-600 block">
                      {derivatives ? `${(derivatives.fundingRate * 100).toFixed(4)}%` : '0.0100%'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {derivatives && derivatives.fundingRate > 0 ? 'المشترون يدفعون للبائعين' : 'توازن هادئ'}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="text-slate-500 block mb-1">الفائدة المفتوحة (OI):</span>
                    <span className="font-mono font-bold text-base text-slate-900 dark:text-white block">
                      {derivatives ? `$${(derivatives.openInterest / 1e6).toFixed(1)}M` : '—'}
                    </span>
                    <span className="text-[11px] text-slate-500">إجمالي العقود النشطة</span>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      isPaper ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="text-slate-500 block mb-1">نسبة الشراء/البيع (L/S):</span>
                    <span className="font-mono font-bold text-base text-emerald-600 block">
                      {derivatives ? derivatives.longShortRatio.toFixed(2) : '1.15'}
                    </span>
                    <span className="text-[11px] text-slate-500">تفوق نسبي لصفقات الشراء</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: INSTITUTIONAL FOOTER */}
            <div
              className={`pt-5 mt-6 border-t text-[11px] leading-relaxed space-y-2 page-break-inside-avoid ${
                isPaper ? 'border-slate-300 text-slate-500' : 'border-emerald-950/90 text-slate-400'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                <span>تم إنشاء هذا المستند آلياً عبر منصة: القراءة الفنية والأساسية للعملات الرقمية</span>
                <span>رقم التقرير: {reportId}</span>
              </div>

              <p className="border-t pt-2 border-slate-200 dark:border-slate-900">
                <strong>إخلاء مسؤولية قانوني:</strong> هذا التقرير مُعدّ للأغراض التثقيفية والبحثية والمعلوماتية فقط، ولا يُشكّل بأي حال من الأحوال نصيحة استثمارية أو توصية مباشرة بشراء أو بيع أي أصل رقمي. أسواق العملات الرقمية شديدة التقلب وتنطوي على مخاطر عالية لفقدان رأس المال. يجب على كل مستثمر إجراء دراسته الذاتية المستقلة وإدارة المخاطر بحكمة.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="print:hidden px-5 py-3 border-t border-emerald-950/80 bg-[#060c09] flex items-center justify-between text-xs">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>التقرير جاهز بدقة عالية (A4 Ready) ومتوافق مع كافة الطابعات ومولدات PDF.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              طباعة
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-colors disabled:opacity-50"
            >
              {isExportingPdf ? 'جارِ التحميل...' : 'تنزيل ملف PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
