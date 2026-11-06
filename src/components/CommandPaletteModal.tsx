import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowLeft, TrendingUp, Layers } from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'tool' | 'coin';
  titleAr: string;
  subtitleAr: string;
  keywords: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
  onNavigateTool: (toolId: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectCoin,
  onNavigateTool,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const items: CommandItem[] = useMemo(() => {
    const tools: CommandItem[] = [
      {
        id: 'tool-brain',
        category: 'tool',
        titleAr: 'العقل المدبر للتداول الآلي (Autopilot Brain)',
        subtitleAr: 'قرارات التوافق السباعي وإدارة الصفقات الورقية الآلية',
        keywords: 'brain autopilot عقل مدبر تداول الي',
        action: () => onNavigateTool('brain'),
      },
      {
        id: 'tool-trading-agents',
        category: 'tool',
        titleAr: 'غرفة عمليات وكلاء التداول المتعددين (TauricResearch TradingAgents)',
        subtitleAr: 'مناظرة فريق المحللين، الباحث الصعودي ضد الهبوطي، لجنة المخاطر، ومدير الصندوق',
        keywords: 'tradingagents tauric agents وكلاء التداول مناظرة محللين صندوق',
        action: () => onNavigateTool('trading-agents'),
      },
      {
        id: 'tool-smart-dca',
        category: 'tool',
        titleAr: 'محاكي التراكم الذكي الموزون بـ RSI (Smart DCA)',
        subtitleAr: 'مقارنة الشراء الدوري الذكي مقابل المنتظم والدفعة الواحدة',
        keywords: 'dca smart accumulation تراكم ذكي استثمار دوري متوسط تكلفة',
        action: () => onNavigateTool('smart-dca'),
      },
      {
        id: 'tool-stress-test',
        category: 'tool',
        titleAr: 'مختبر اختبار الضغط والصدمات السعرية (Stress Test)',
        subtitleAr: 'محاكاة انهيارات السيولة واختبار حماية وقف الخسارة',
        keywords: 'stress test crash shock اختبار ضغط انهيار مخاطر صدمة',
        action: () => onNavigateTool('stress-test'),
      },
      {
        id: 'tool-one-click',
        category: 'tool',
        titleAr: 'التحليل الشامل بضغطة واحدة (One-Click Pipeline)',
        subtitleAr: 'مسح متجهي للاستراتيجيات ومقارنة العوائد التاريخية',
        keywords: 'one click pipeline تحليل شامل بضغطة واحدة',
        action: () => onNavigateTool('one-click-analysis'),
      },
      {
        id: 'tool-evidence-gate',
        category: 'tool',
        titleAr: 'بوابة اعتماد الاستراتيجية الإحصائية (Evidence Gatekeeper)',
        subtitleAr: 'اختبارات ويلسون، Student-t، DSR، والمونت كارلو',
        keywords: 'evidence gate stats بوابة اعتماد احصاء شارب كيلي',
        action: () => onNavigateTool('evidence-gate'),
      },
      {
        id: 'tool-live-exec',
        category: 'tool',
        titleAr: 'محرك التنفيذ الآلي ومفتاح الطوارئ (Kill Switch)',
        subtitleAr: 'مراقبة الحواجز السلوكية الـ 10 وإغلاق الطوارئ',
        keywords: 'kill switch execution طوارئ تنفيذ حواجز',
        action: () => onNavigateTool('live-execution'),
      },
      {
        id: 'tool-alerts',
        category: 'tool',
        titleAr: 'التنبيهات السعرية المخصصة (SMS & Email Alerts)',
        subtitleAr: 'ضبط تنبيهات الأسعار مع رسائل نصية وبريد إلكتروني',
        keywords: 'alerts sms email تنبيهات سعرية رسائل بريد',
        action: () => onNavigateTool('alerts'),
      },
      {
        id: 'tool-paper',
        category: 'tool',
        titleAr: 'محفظة التداول الورقي التفاعلي (Paper Trading)',
        subtitleAr: 'فتح وإغلاق الصفقات الافتراضية ومتابعة منحنى الرصيد',
        keywords: 'paper trading تداول ورقي محفظة تجريبية',
        action: () => onNavigateTool('paper-trading'),
      },
      {
        id: 'tool-calculator',
        category: 'tool',
        titleAr: 'حاسبة حجم الصفقة والمخاطر (Position Size Calculator)',
        subtitleAr: 'حساب الكمية الدقيقة ونسبة العائد إلى المخاطرة R:R',
        keywords: 'calculator risk حاسبة صفقات مخاطر حجم',
        action: () => onNavigateTool('calculator'),
      },
      {
        id: 'tool-screener',
        category: 'tool',
        titleAr: 'ماسح السوق الذكي (Crypto Screener)',
        subtitleAr: 'فلترة العملات حسب السيولة والتشبع والزخم',
        keywords: 'screener filter ماسح سوق فلترة',
        action: () => onNavigateTool('screener'),
      },
      {
        id: 'tool-watchlist',
        category: 'tool',
        titleAr: 'قائمة المفضلات والشارت المصغر (24H Watchlist)',
        subtitleAr: 'مراقبة الأزواج المفضلة مع رسوم Sparkline لـ 24 ساعة',
        keywords: 'watchlist favorites مفضلة مفضلات شارت مصغر',
        action: () => onNavigateTool('watchlist'),
      },
    ];

    const coins = [
      { sym: 'BTC', nameAr: 'بيتكوين (Bitcoin)' },
      { sym: 'ETH', nameAr: 'إيثيريوم (Ethereum)' },
      { sym: 'SOL', nameAr: 'سولانا (Solana)' },
      { sym: 'PYTH', nameAr: 'بايث نيتورك (Pyth Network)' },
      { sym: 'BNB', nameAr: 'بينانس كوين (BNB)' },
      { sym: 'XRP', nameAr: 'ريبل (XRP)' },
      { sym: 'AVAX', nameAr: 'أفالانش (Avalanche)' },
      { sym: 'LINK', nameAr: 'تشين لينك (Chainlink)' },
      { sym: 'SUI', nameAr: 'سوي (Sui Network)' },
      { sym: 'NEAR', nameAr: 'نير بروتوكول (NEAR)' },
    ].map((c) => ({
      id: `coin-${c.sym}`,
      category: 'coin' as const,
      titleAr: `تحليل زوج ${c.sym}/USDT`,
      subtitleAr: c.nameAr,
      keywords: `${c.sym.toLowerCase()} ${c.nameAr}`,
      action: () => onSelectCoin(c.sym),
    }));

    return [...tools, ...coins];
  }, [onNavigateTool, onSelectCoin]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.titleAr.toLowerCase().includes(q) ||
        it.subtitleAr.toLowerCase().includes(q) ||
        it.keywords.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="لوحة الأوامر والبحث السريع"
    >
      <div className="w-full max-w-2xl bg-[#06120b] border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أي أداة تحليلية أو عملة رقمية (مثال: تراكم ذكي، ضغط، BTC، PYTH)..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              لا توجد نتائج مطابقة لـ «{query}». جرب البحث برمز عملة مثل BTC أو SOL.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-right transition-colors ${
                    isSelected ? 'bg-emerald-500/20 text-white' : 'text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.category === 'tool' ? (
                      <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold">{item.titleAr}</div>
                      <div className="text-[11px] text-slate-400">{item.subtitleAr}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono shrink-0">
                    <span>فتح</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>التنقل بالأسهم ↑↓ · الاختيار Enter · الإغلاق Esc</span>
          <span>اختصار لوحة المفاتيح: Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
