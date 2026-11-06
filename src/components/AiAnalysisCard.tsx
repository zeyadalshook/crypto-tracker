import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CoinDetail, FearAndGreedData, TechnicalAnalysisResult } from '../types/crypto';

interface AiAnalysisCardProps {
  coin: CoinDetail;
  analysis: TechnicalAnalysisResult;
  fearGreed: FearAndGreedData;
}

export const AiAnalysisCard: React.FC<AiAnalysisCardProps> = ({
  coin,
  analysis,
  fearGreed,
}) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: `مرحباً بك! أنا مساعد التحليل الذكي للعملة ${coin.name} (${coin.symbol}). يمكنك سؤالي عن مستويات الدعم والمقاومة، أو سلوك المؤشرات، أو السيناريوهات الفنية.`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Trigger Explain with Gemini
  const handleRequestExplanation = async () => {
    setIsLoadingExplanation(true);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: coin.symbol,
          name: coin.name,
          price: coin.current_price,
          trend: analysis.trend,
          rsi: analysis.rsi14,
          macd: analysis.macd.histogram.toFixed(4),
          adx: analysis.adx14,
          s1: analysis.pivots.s1.toFixed(4),
          r1: analysis.pivots.r1.toFixed(4),
          target: analysis.pivots.target.toFixed(4),
          momentumScore: analysis.momentumScore,
          fearGreed: fearGreed.classification,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanation(data.analysis || data.fallback);
      } else {
        setExplanation('تعذر الحصول على التحليل من الذكاء الاصطناعي حالياً، يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      console.error('AI Explain error:', err);
      setExplanation('حدث خطأ في الاتصال بالخادم. يرجى مراجعة إعدادات الشبكة.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Send message in interactive chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    const userText = chatInput.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          coinContext: {
            symbol: coin.symbol,
            name: coin.name,
            price: coin.current_price,
            trend: analysis.trend,
            s1: analysis.pivots.s1.toFixed(4),
            r1: analysis.pivots.r1.toFixed(4),
            target: analysis.pivots.target.toFixed(4),
            rsi: analysis.rsi14,
            momentumScore: analysis.momentumScore,
            ema200: analysis.pivots.ema200.toFixed(4),
            volume: coin.total_volume,
            marketCap: coin.market_cap,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'عذراً، حدث خطأ أثناء معالجة السؤال.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'تعذر الاتصال بالمساعد الذكي.' },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const quickQuestions = [
    'ما هو أقرب دعم ومقاومة؟',
    'هل الحجم يدعم اختراق المقاومة؟',
    'ما هو السيناريو الهابط وشروط إلغائه؟',
    'ما هي وضعية مؤشر RSI الحالية؟',
  ];

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/35 relative overflow-hidden flex flex-col gap-4">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
              <span>التحليل الذكي المدعوم بالذكاء الاصطناعي</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                GEMINI 3.8 FLASH
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              قراءة فورية مكتوبة بالعربية تشرح السيناريو الصاعد والهابط وما يلغي كل منهما
            </p>
          </div>
        </div>

        {/* Explain Trigger Button */}
        <button
          onClick={handleRequestExplanation}
          disabled={isLoadingExplanation}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoadingExplanation ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span>اشرح لي بالذكاء الاصطناعي</span>
        </button>
      </div>

      {/* Explanation Box */}
      {explanation ? (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-inner">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2 pb-1 border-b border-emerald-900/50">
            <ShieldCheck className="w-4 h-4" />
            <span>تقرير المستشار الفني الذكي ({coin.symbol})</span>
          </div>
          {explanation}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Bot className="w-8 h-8 text-emerald-400/60" />
          <span>انقر على زر "اشرح لي بالذكاء الاصطناعي" للحصول على قراءة فنية مفصلة في 5 إلى 8 أسطر.</span>
        </div>
      )}

      {/* Interactive Chat Accordion */}
      <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-slate-950/60">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-full flex items-center justify-between p-3 text-xs sm:text-sm font-bold text-slate-200 hover:bg-emerald-950/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>المحادثة التفاعلية مع لوحة {coin.symbol} (دردشة ذكية)</span>
          </div>
          {isChatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isChatOpen && (
          <div className="p-3 border-t border-slate-900 flex flex-col gap-3">
            {/* Quick Questions Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setChatInput(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-300 whitespace-nowrap transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="max-h-56 overflow-y-auto space-y-2.5 p-2 bg-slate-950/80 rounded-lg border border-slate-900 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-200 border border-slate-800'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isSendingMessage && (
                <div className="flex justify-end">
                  <div className="bg-slate-900 text-slate-400 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>جارٍ صياغة الرد...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`اسأل المساعد عن تحليل ${coin.symbol}...`}
                className="flex-1 h-9 px-3 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatInput.trim()}
                className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">إرسال</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
