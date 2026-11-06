import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  ExternalLink,
  Smile,
  Frown,
  Meh,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { NewsItem } from '../types/crypto';

interface NewsAndSentimentProps {
  symbol: string;
}

export const NewsAndSentiment: React.FC<NewsAndSentimentProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/news/${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 border border-emerald-500/25 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            تحليل الأخبار والمشاعر المباشرة ({symbol})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          تصنيف آلي للمشاعر وملخصات عربية مركزة
        </span>
      </div>

      {/* News Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] text-slate-400 font-mono">{item.source}</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.sentiment === 'positive'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : item.sentiment === 'negative'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {item.sentiment === 'positive' ? (
                    <Smile className="w-3 h-3" />
                  ) : item.sentiment === 'negative' ? (
                    <Frown className="w-3 h-3" />
                  ) : (
                    <Meh className="w-3 h-3" />
                  )}
                  <span>
                    {item.sentiment === 'positive'
                      ? 'إيجابي'
                      : item.sentiment === 'negative'
                      ? 'سلبي'
                      : 'محايد'}
                  </span>
                  <span className="font-mono text-[9px] opacity-75">
                    ({Math.round(item.confidence * 100)}%)
                  </span>
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug hover:text-emerald-300 transition-colors">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                  <span>{item.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-500 mt-0.5" />
                </a>
              </h4>

              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-900">
                {item.arabic_summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
