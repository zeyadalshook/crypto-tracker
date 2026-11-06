import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Copy,
  Check,
  Sparkles,
  Calculator,
  Percent,
  Coins,
  Zap,
} from 'lucide-react';
import { CoinDetail, TechnicalAnalysisResult } from '../types/crypto';
import { formatUsdtPrice, calculateCryptoInUsdt, calculateUsdtInCrypto } from '../utils/formatters';

interface UsdtCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CoinDetail;
  analysis?: TechnicalAnalysisResult | null;
}

export const UsdtCalculatorModal: React.FC<UsdtCalculatorModalProps> = ({
  isOpen,
  onClose,
  coin,
  analysis,
}) => {
  const currentPriceUsdt = coin.current_price || 0.0001;
  const symbol = coin.symbol.toUpperCase();

  const [mode, setMode] = useState<'coin-to-usdt' | 'usdt-to-coin'>('coin-to-usdt');
  const [coinInput, setCoinInput] = useState<string>('100');
  const [usdtInput, setUsdtInput] = useState<string>((100 * currentPriceUsdt).toFixed(2));
  const [copied, setCopied] = useState<boolean>(false);

  const usdtPresets = [25, 50, 100, 250, 500, 1000, 2500, 5000];
  const coinPresets = [1, 10, 50, 100, 500, 1000, 5000, 10000];

  if (!isOpen) return null;

  const handleCoinChange = (val: string) => {
    setCoinInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const calculatedUsdt = calculateCryptoInUsdt(parsed, currentPriceUsdt);
      setUsdtInput(calculatedUsdt < 0.01 ? calculatedUsdt.toFixed(6) : calculatedUsdt.toFixed(2));
    } else {
      setUsdtInput('');
    }
  };

  const handleUsdtChange = (val: string) => {
    setUsdtInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const calculatedCoin = calculateUsdtInCrypto(parsed, currentPriceUsdt);
      setCoinInput(calculatedCoin < 1 ? calculatedCoin.toFixed(6) : calculatedCoin.toFixed(2));
    } else {
      setCoinInput('');
    }
  };

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'coin-to-usdt' ? 'usdt-to-coin' : 'coin-to-usdt'));
  };

  const handleSelectUsdtPreset = (amount: number) => {
    setUsdtInput(amount.toString());
    const calculatedCoin = calculateUsdtInCrypto(amount, currentPriceUsdt);
    setCoinInput(calculatedCoin < 1 ? calculatedCoin.toFixed(6) : calculatedCoin.toFixed(2));
    setMode('usdt-to-coin');
  };

  const handleSelectCoinPreset = (amount: number) => {
    setCoinInput(amount.toString());
    const calculatedUsdt = calculateCryptoInUsdt(amount, currentPriceUsdt);
    setUsdtInput(calculatedUsdt < 0.01 ? calculatedUsdt.toFixed(6) : calculatedUsdt.toFixed(2));
    setMode('coin-to-usdt');
  };

  const handleCopyResult = () => {
    const textToCopy = `${coinInput} ${symbol} = ${usdtInput} USDT (سعر الوحدة: ${currentPriceUsdt} USDT)`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const numCoins = parseFloat(coinInput) || 0;
  const targetPriceUsdt = analysis?.pivots.target || currentPriceUsdt * 1.15;
  const r1PriceUsdt = analysis?.pivots.r1 || currentPriceUsdt * 1.05;
  const s1PriceUsdt = analysis?.pivots.s1 || currentPriceUsdt * 0.95;

  const profitAtTargetUsdt = numCoins * (targetPriceUsdt - currentPriceUsdt);
  const profitAtR1Usdt = numCoins * (r1PriceUsdt - currentPriceUsdt);
  const lossAtS1Usdt = numCoins * (currentPriceUsdt - s1PriceUsdt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#07130c] border border-emerald-500/40 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-emerald-950/80 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>حاسبة أسعار العملات بـ USDT</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40">
                    {symbol}/USDT
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                حساب فوري لكميات وقيم صفقات {coin.name} مقابل عملة التيثر المستقرة (USDT)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Current Live USDT Price Hero Ribbon */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              {coin.image && (
                <img src={coin.image} alt={symbol} className="w-8 h-8 rounded-full" />
              )}
              <div>
                <span className="text-xs text-slate-400 font-medium block">سعر الوحدة اللحظي المباشر</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatUsdtPrice(currentPriceUsdt)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-bold">
                    = 1.00 {symbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[10px]">تغير 24 ساعة</span>
                <span
                  className={`font-mono font-bold ${
                    coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {coin.price_change_percentage_24h?.toFixed(2)}%
                </span>
              </div>

              <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[10px]">الترتيب السوقي</span>
                <span className="font-mono font-bold text-amber-300">
                  #{coin.market_cap_rank || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Bidirectional Interactive Converter Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>التحويل التفاعلي المباشر</span>
              </span>
              <button
                onClick={handleToggleMode}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-colors"
              >
                <span>عكس اتجاه الحساب</span>
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  <span>الكمية بعملة ({symbol})</span>
                  <span className="text-[10px] text-slate-500 font-mono">العملة الأساسية</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={coinInput}
                    onChange={(e) => handleCoinChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 pl-16 text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="absolute left-3 top-3.5 text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {symbol}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
                <button
                  onClick={handleToggleMode}
                  className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center hover:bg-emerald-500/30 transition-transform active:scale-95 shadow-md"
                  title="تبديل"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  <span>المبلغ بالتيثر (USDT)</span>
                  <span className="text-[10px] text-emerald-400/80 font-mono">₮ 1.00 USD</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={usdtInput}
                    onChange={(e) => handleUsdtChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 pl-18 text-lg font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="absolute left-3 top-3.5 text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    USDT
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">
                النتيجة المحسوبة:{' '}
                <strong className="text-white font-mono">{coinInput || 0} {symbol}</strong> ={' '}
                <strong className="text-emerald-400 font-mono">{usdtInput || 0} USDT</strong>
              </span>
              <button
                onClick={handleCopyResult}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-medium text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ النتيجة'}</span>
              </button>
            </div>
          </div>

          {/* 2. Quick USDT Investment Presets */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400 block">
              احسب كم ستحصل عليه بمبالغ USDT جاهزة:
            </span>
            <div className="flex flex-wrap gap-2">
              {usdtPresets.map((amt) => {
                const yieldCoins = calculateUsdtInCrypto(amt, currentPriceUsdt);
                return (
                  <button
                    key={amt}
                    onClick={() => handleSelectUsdtPreset(amt)}
                    className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all text-right group"
                  >
                    <span className="text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
                      ${amt} USDT
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ≈ {yieldCoins < 1 ? yieldCoins.toFixed(4) : yieldCoins.toFixed(1)} {symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Quick Coin Quantity Presets */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400 block">
              احسب قيمة كميات محددة من {symbol} بـ USDT:
            </span>
            <div className="flex flex-wrap gap-2">
              {coinPresets.map((qty) => {
                const totalCost = calculateCryptoInUsdt(qty, currentPriceUsdt);
                return (
                  <button
                    key={qty}
                    onClick={() => handleSelectCoinPreset(qty)}
                    className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all text-right group"
                  >
                    <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-300">
                      {qty.toLocaleString()} {symbol}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ≈ {formatUsdtPrice(totalCost)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Key Price Levels in USDT & Potential PnL */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>المستويات الفنية والأرباح المتوقعة بـ USDT (لكمية {coinInput} {symbol})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <div className="text-rose-400 font-medium flex items-center justify-between">
                  <span>الدعم الأول S1 (وقف الخسارة)</span>
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black font-mono text-rose-300 mt-1">
                  {formatUsdtPrice(s1PriceUsdt)}
                </div>
                <div className="text-[11px] text-rose-400/80 mt-1 font-mono">
                  الخسارة المحتملة: -{lossAtS1Usdt > 0 ? lossAtS1Usdt.toFixed(2) : '0.00'} USDT
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30">
                <div className="text-sky-400 font-medium flex items-center justify-between">
                  <span>المقاومة الأولى R1 (هدف قصير)</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black font-mono text-sky-300 mt-1">
                  {formatUsdtPrice(r1PriceUsdt)}
                </div>
                <div className="text-[11px] text-sky-400/80 mt-1 font-mono">
                  الربح المتوقع: +{profitAtR1Usdt > 0 ? profitAtR1Usdt.toFixed(2) : '0.00'} USDT
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <div className="text-emerald-300 font-medium flex items-center justify-between">
                  <span>الهدف الصاعد الحالي 🎯</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-base font-black font-mono text-emerald-400 mt-1">
                  {formatUsdtPrice(targetPriceUsdt)}
                </div>
                <div className="text-[11px] text-emerald-300/90 mt-1 font-mono font-bold">
                  الربح المتوقع: +{profitAtTargetUsdt > 0 ? profitAtTargetUsdt.toFixed(2) : '0.00'} USDT
                </div>
              </div>
            </div>
          </div>

          {/* 5. Historical Extremes in USDT */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">أعلى سعر تاريخي (ATH) بـ USDT</span>
              <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                {formatUsdtPrice(coin.ath)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                تراجع حالياً بـ {coin.ath_change_percentage?.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">أقل سعر تاريخي (ATL) بـ USDT</span>
              <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                {formatUsdtPrice(coin.atl)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                ارتفع من القاع بـ +{coin.atl_change_percentage?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-emerald-950/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>الأسعار مستقاة من منصات التداول العالمية الموثوقة بصيغة {symbol}/USDT.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
