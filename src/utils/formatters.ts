export type Currency = 'USDT' | 'USD' | 'IQD' | 'EUR';

// Current conversion rates
const EXCHANGE_RATES: Record<Currency, number> = {
  USDT: 1, // Tether USD (1 USDT = 1 USD peg)
  USD: 1,
  IQD: 1310, // Iraqi Dinar
  EUR: 0.92, // Euro
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USDT: ' USDT',
  USD: '$',
  IQD: 'د.ع ',
  EUR: '€',
};

export function formatCurrency(
  val: number | null | undefined,
  currency: Currency = 'USDT',
  decimalPlaces?: number
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';

  const rate = EXCHANGE_RATES[currency] || 1;
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const converted = val * rate;

  if (currency === 'USDT') {
    if (converted >= 1_000_000_000_000) {
      return `${(converted / 1_000_000_000_000).toFixed(2)}T USDT`;
    }
    if (converted >= 1_000_000_000) {
      return `${(converted / 1_000_000_000).toFixed(2)}B USDT`;
    }
    if (converted >= 1_000_000) {
      return `${(converted / 1_000_000).toFixed(2)}M USDT`;
    }
    if (decimalPlaces !== undefined) {
      return `${converted.toFixed(decimalPlaces)} USDT`;
    }
    if (converted < 0.00001) {
      return `${converted.toExponential(4)} USDT`;
    }
    if (converted < 0.01) {
      return `${converted.toFixed(6)} USDT`;
    }
    if (converted < 1) {
      return `${converted.toFixed(4)} USDT`;
    }
    if (converted < 100) {
      return `${converted.toFixed(2)} USDT`;
    }
    return `${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`;
  }

  if (currency === 'IQD') {
    if (converted >= 1_000_000_000_000) {
      return `${(converted / 1_000_000_000_000).toFixed(2)} ترليون ${symbol}`;
    }
    if (converted >= 1_000_000_000) {
      return `${(converted / 1_000_000_000).toFixed(2)} مليار ${symbol}`;
    }
    if (converted >= 1_000_000) {
      return `${(converted / 1_000_000).toFixed(2)} مليون ${symbol}`;
    }
    return `${Math.round(converted).toLocaleString('ar-IQ')} ${symbol}`;
  }

  // USD / EUR formatting
  if (val >= 1_000_000_000_000) {
    return `${symbol}${(converted / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (val >= 1_000_000_000) {
    return `${symbol}${(converted / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
  }

  if (decimalPlaces !== undefined) {
    return `${symbol}${converted.toFixed(decimalPlaces)}`;
  }

  if (converted < 0.00001) {
    return `${symbol}${converted.toExponential(4)}`;
  }
  if (converted < 0.01) {
    return `${symbol}${converted.toFixed(6)}`;
  }
  if (converted < 1) {
    return `${symbol}${converted.toFixed(4)}`;
  }
  if (converted < 100) {
    return `${symbol}${converted.toFixed(2)}`;
  }

  return `${symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatNumberCompact(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (val >= 1_000_000_000_000) return `${(val / 1_000_000_000_000).toFixed(2)}T`;
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return val.toLocaleString();
}

export function formatPercentage(val: number | null | undefined, includeSign = true): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const formatted = Math.abs(val).toFixed(2);
  if (includeSign) {
    if (val > 0) return `+${formatted}%`;
    if (val < 0) return `-${formatted}%`;
    return `${formatted}%`;
  }
  return `${formatted}%`;
}

export function formatDateArabic(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getFearGreedArabicClassification(value: number): { text: string; colorClass: string; bgClass: string } {
  if (value <= 24) {
    return { text: 'خوف شديد', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/20 border-rose-500/40' };
  }
  if (value <= 46) {
    return { text: 'خوف', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20 border-orange-500/40' };
  }
  if (value <= 54) {
    return { text: 'حياد', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/20 border-amber-500/40' };
  }
  if (value <= 75) {
    return { text: 'طمع', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20 border-emerald-500/40' };
  }
  return { text: 'طمع شديد', colorClass: 'text-emerald-300', bgClass: 'bg-emerald-500/30 border-emerald-400' };
}

// USDT Specific Pricing Helpers
export function formatUsdtPrice(val: number | null | undefined, decimalPlaces?: number): string {
  return formatCurrency(val, 'USDT', decimalPlaces);
}

export function calculateCryptoInUsdt(coinAmount: number, priceUsdt: number): number {
  if (isNaN(coinAmount) || isNaN(priceUsdt)) return 0;
  return coinAmount * priceUsdt;
}

export function calculateUsdtInCrypto(usdtAmount: number, priceUsdt: number): number {
  if (isNaN(usdtAmount) || isNaN(priceUsdt) || priceUsdt <= 0) return 0;
  return usdtAmount / priceUsdt;
}
