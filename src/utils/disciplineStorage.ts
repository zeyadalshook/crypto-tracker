import {
  DisciplineSettings,
  JournalTradeExtended,
  DailyDisciplineState,
  WeeklyReviewData,
} from '../types/discipline';

export const DEFAULT_DISCIPLINE_SETTINGS: DisciplineSettings = {
  capital: 10000,
  maxRiskPerTradePct: 1.0, // 1%
  dailyLossLimitPct: 3.0, // 3% ($300 on $10k)
  weeklyLossLimitPct: 6.0, // 6% ($600 on $10k)
  maxOpenPositions: 3,
  maxTradesPerDay: 5,
  minRiskReward: 1.5, // 1:1.5
  consecutiveLossLimit: 3,
  coolOffHours: 4,
  timezone: 'local',
  pendingSettingsChange: null,
  lockoutActiveUntil: null,
  lockoutReason: null,
  lockoutReflection: null,
  customRules: [
    {
      id: 'rule_no_overleverage',
      ruleText: 'لا تتجاوز نسبة المخاطرة المحددة (1%) مهما كانت الثقة بالصفقة',
      category: 'إدارة المخاطر',
      reason: 'حماية رأس المال من التراجع المتسارع.',
      enabled: true,
    },
    {
      id: 'rule_trend_align',
      ruleText: 'التأكد من عدم معاكسة اتجاه الشمعة اليومية الرئيسية (1D)',
      category: 'التوافق الفني',
      reason: 'رفع نسبة النجاح ومضاعف R.',
      enabled: true,
    },
  ],
};

const SETTINGS_KEY = 'ctr_discipline_settings_v2';
const TRADES_KEY = 'ctr_discipline_trades_v2';
const REVIEWS_KEY = 'ctr_discipline_weekly_reviews_v2';

export function getDisciplineSettings(): DisciplineSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed: DisciplineSettings = JSON.parse(raw);
      // Check if any pending 24h settings change is ready to apply
      if (parsed.pendingSettingsChange && Date.now() >= parsed.pendingSettingsChange.effectiveAt) {
        const merged = { ...parsed, ...parsed.pendingSettingsChange.settings, pendingSettingsChange: null };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse discipline settings:', err);
  }
  return DEFAULT_DISCIPLINE_SETTINGS;
}

// IndexedDB Tamper & Reset Detection
const IDB_DB_NAME = 'ctr_security_vault_v1';
const IDB_STORE_NAME = 'lock_backups';

export async function backupLockToIndexedDB(pendingChange: any): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put({ id: 'active_lock', ...pendingChange, backupTimestamp: Date.now() });
    };
  } catch (e) {
    console.warn('Failed to backup lock to IndexedDB:', e);
  }
}

export async function checkIndexedDBTamper(): Promise<{ tampered: boolean; restoredLock?: any }> {
  if (typeof indexedDB === 'undefined') return { tampered: false };
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const getReq = store.get('active_lock');
        getReq.onsuccess = () => {
          const backup = getReq.result;
          if (backup && backup.effectiveAt && Date.now() < backup.effectiveAt) {
            // Check if localStorage has lost the lock!
            const localSettings = getDisciplineSettings();
            if (!localSettings.pendingSettingsChange) {
              // TAMPER DETECTED: Local storage was cleared while IndexedDB has active lock!
              console.warn('DISCIPLINE TAMPER DETECTED: Restoring active lock from IndexedDB vault.');
              const restored = {
                ...localSettings,
                pendingSettingsChange: {
                  settings: backup.settings,
                  requestTimestamp: backup.requestTimestamp,
                  effectiveAt: backup.effectiveAt,
                },
              };
              saveDisciplineSettings(restored);
              resolve({ tampered: true, restoredLock: backup });
              return;
            }
          }
          resolve({ tampered: false });
        };
        getReq.onerror = () => resolve({ tampered: false });
      };
      req.onerror = () => resolve({ tampered: false });
    } catch {
      resolve({ tampered: false });
    }
  });
}

export function saveDisciplineSettings(settings: DisciplineSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const loadDisciplineSettings = getDisciplineSettings;

// Request a settings change with anti-rage 24-hour lock if relaxing risk during active trading
export function requestSettingsUpdateWithAntiRage(
  current: DisciplineSettings,
  proposed: Partial<DisciplineSettings>,
  isRelaxingLimits: boolean
): { updated: DisciplineSettings; isPending: boolean; effectiveAt?: number } {
  if (isRelaxingLimits) {
    const effectiveAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours later
    const updated: DisciplineSettings = {
      ...current,
      pendingSettingsChange: {
        settings: proposed,
        requestTimestamp: Date.now(),
        effectiveAt,
      },
    };
    saveDisciplineSettings(updated);
    backupLockToIndexedDB(updated.pendingSettingsChange);
    return { updated, isPending: true, effectiveAt };
  } else {
    // Tightening limits takes effect immediately
    const updated: DisciplineSettings = {
      ...current,
      ...proposed,
    };
    saveDisciplineSettings(updated);
    return { updated, isPending: false };
  }
}

export function getJournalTrades(): JournalTradeExtended[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse journal trades:', err);
  }
  return SEED_TRADES;
}

export function saveJournalTrades(trades: JournalTradeExtended[]): void {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

export function clearAllDisciplineData(): void {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(TRADES_KEY);
  localStorage.removeItem(REVIEWS_KEY);
  localStorage.removeItem('ctr_trading_journal');
}

// Get Date string for today based on settings timezone
export function getTodayDateString(timezone: 'local' | 'utc' = 'local'): string {
  const d = new Date();
  if (timezone === 'utc') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Calculate midnight timestamp for lockout countdown
export function getNextMidnightTimestamp(timezone: 'local' | 'utc' = 'local'): number {
  const d = new Date();
  if (timezone === 'utc') {
    d.setUTCHours(24, 0, 0, 0);
  } else {
    d.setHours(24, 0, 0, 0);
  }
  return d.getTime();
}

// Calculate Daily Discipline and Lockout State
export function computeDailyDisciplineState(
  trades: JournalTradeExtended[],
  settings: DisciplineSettings
): DailyDisciplineState {
  const todayStr = getTodayDateString(settings.timezone);

  // Closed trades today
  const todayTrades = trades.filter((t) => {
    const dStr = (t.exitDate || t.entryDate || '').slice(0, 10);
    return dStr === todayStr;
  });

  const openTrades = trades.filter((t) => t.status === 'open');

  const todayRealizedPnL = todayTrades
    .filter((t) => t.status === 'closed')
    .reduce((sum, t) => sum + (t.pnl || 0), 0);

  const todayUnrealizedPnL = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const todayTotalPnL = todayRealizedPnL + todayUnrealizedPnL;

  const todayLossLimitDollars = (settings.capital * settings.dailyLossLimitPct) / 100;

  // Calculate percentage of daily loss limit consumed (if negative PnL)
  let dailyLossPercentReached = 0;
  if (todayTotalPnL < 0) {
    dailyLossPercentReached = Math.min(100, (Math.abs(todayTotalPnL) / todayLossLimitDollars) * 100);
  }

  // Calculate consecutive losses streak from closed trades
  const closedSorted = [...trades]
    .filter((t) => t.status === 'closed')
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  let consecutiveLosses = 0;
  for (const t of closedSorted) {
    if (t.pnl < 0) consecutiveLosses++;
    else break;
  }

  // Lockout determination
  const isNearLimitWarning = dailyLossPercentReached >= 70 && dailyLossPercentReached < 100;
  let isLockedOut = false;
  let lockoutExpiresAt: number | null = null;
  let lockoutType: 'daily' | 'weekly' | 'consecutive' | null = null;

  const now = Date.now();
  if (settings.lockoutActiveUntil && settings.lockoutActiveUntil > now) {
    isLockedOut = true;
    lockoutExpiresAt = settings.lockoutActiveUntil;
    lockoutType = settings.lockoutReason === 'consecutive_losses'
      ? 'consecutive'
      : settings.lockoutReason === 'weekly_limit'
      ? 'weekly'
      : 'daily';
  } else if (todayTotalPnL <= -todayLossLimitDollars) {
    // 100% daily loss limit hit!
    isLockedOut = true;
    lockoutExpiresAt = getNextMidnightTimestamp(settings.timezone);
    lockoutType = 'daily';
  } else if (consecutiveLosses >= settings.consecutiveLossLimit) {
    // Consecutive losses limit hit!
    isLockedOut = true;
    lockoutExpiresAt = now + settings.coolOffHours * 60 * 60 * 1000;
    lockoutType = 'consecutive';
  }

  return {
    todayDateStr: todayStr,
    todayRealizedPnL: Math.round(todayRealizedPnL * 100) / 100,
    todayUnrealizedPnL: Math.round(todayUnrealizedPnL * 100) / 100,
    todayTotalPnL: Math.round(todayTotalPnL * 100) / 100,
    todayTradesCount: todayTrades.length,
    todayLossLimitDollars: Math.round(todayLossLimitDollars),
    dailyLossPercentReached: Math.round(dailyLossPercentReached * 10) / 10,
    isNearLimitWarning,
    isLockedOut,
    lockoutExpiresAt,
    lockoutType,
    consecutiveLosses,
    openTradesCount: openTrades.length,
  };
}

// Compute Expected Value in R (R-Expectancy) and Advanced Metrics
export function computeAdvancedJournalStats(trades: JournalTradeExtended[]) {
  const closed = trades.filter((t) => t.status === 'closed');
  const total = closed.length;

  if (total === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalPnL: 0,
      rExpectancy: 0,
      disciplineScore: 0,
      planTradesCost: 0,
      maxDrawdown: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWins: 0,
      isSmallSample: true,
    };
  }

  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const winRate = (wins.length / total) * 100;
  const lossRate = 100 - winRate;

  const totalWinAmount = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const totalPnL = totalWinAmount - totalLossAmount;

  const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 99;

  // R multiples calculation
  const winRs = wins.map((t) => t.resultInR || 1.5);
  const lossRs = losses.map((t) => Math.abs(t.resultInR || 1.0));
  const avgWinR = winRs.length > 0 ? winRs.reduce((a, b) => a + b, 0) / winRs.length : 1.5;
  const avgLossR = lossRs.length > 0 ? lossRs.reduce((a, b) => a + b, 0) / lossRs.length : 1.0;

  // Expected Value in R: (WinRate * AvgWinR) - (LossRate * AvgLossR)
  const rExpectancy = ((winRate / 100) * avgWinR) - ((lossRate / 100) * avgLossR);

  // Plan Discipline Score & Cost of breaking the plan
  const planFollowed = closed.filter((t) => t.followedPlan);
  const planViolated = closed.filter((t) => !t.followedPlan);
  const disciplineScore = (planFollowed.length / total) * 100;

  // How much did breaking the plan cost?
  const planViolatedPnL = planViolated.reduce((sum, t) => sum + t.pnl, 0);

  // Consecutive streaks
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  closed.forEach((t) => {
    if (t.pnl > 0) {
      curWins++;
      curLosses = 0;
      if (curWins > maxConsecWins) maxConsecWins = curWins;
    } else {
      curLosses++;
      curWins = 0;
      if (curLosses > maxConsecLosses) maxConsecLosses = curLosses;
    }
  });

  // Drawdown
  let peak = 0;
  let cum = 0;
  let maxDd = 0;
  closed.forEach((t) => {
    cum += t.pnl;
    if (cum > peak) peak = cum;
    const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  });

  return {
    totalTrades: total,
    winRate: Math.round(winRate * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    totalPnL: Math.round(totalPnL),
    rExpectancy: Math.round(rExpectancy * 100) / 100,
    disciplineScore: Math.round(disciplineScore * 10) / 10,
    planTradesCost: Math.round(planViolatedPnL),
    maxDrawdown: Math.round(maxDd * 10) / 10,
    maxConsecutiveLosses: maxConsecLosses,
    maxConsecutiveWins: maxConsecWins,
    isSmallSample: total < 30,
  };
}

// Generate Realistic Seed Trades with Rich Discipline Metadata
const SEED_TRADES: JournalTradeExtended[] = [
  {
    id: 'tr-seed-1',
    symbol: 'BTC',
    type: 'long',
    entryPrice: 91200,
    exitPrice: 94500,
    quantity: 0.15,
    positionValueUSDT: 13680,
    entryDate: '2026-10-06T10:15',
    exitDate: '2026-10-07T16:40',
    stopLoss: 89700,
    takeProfit1: 94500,
    takeProfit2: 96000,
    riskAmountUSDT: 225,
    riskRewardRatio: 2.2,
    resultInR: 2.2,
    entryReason: 'اختراق نموذج راية استمرارية مع دعم قوي عند متوسط 50 يوم.',
    emotionBeforeTrade: 'calm',
    followedPlan: true,
    executionRating: 5,
    tags: ['Breakout', 'Trend', 'DayTrade'],
    checklistResponses: {
      trendAligned1D: true,
      noUpcomingNews24h: true,
      partOfPrePlan: true,
      isRevengeTrade: false,
      customRuleChecks: {},
    },
    pnl: 495,
    pnlPercent: 3.62,
    status: 'closed',
    notes: 'صفقة مثالية التزمت بوقف الخسارة وجني الربح عند الهدف المحدد بدقة.',
  },
  {
    id: 'tr-seed-2',
    symbol: 'SOL',
    type: 'long',
    entryPrice: 204,
    exitPrice: 191,
    quantity: 20,
    positionValueUSDT: 4080,
    entryDate: '2026-10-04T18:20',
    exitDate: '2026-10-05T02:10',
    stopLoss: 196,
    takeProfit1: 220,
    riskAmountUSDT: 160,
    riskRewardRatio: 2.0,
    resultInR: -1.6,
    entryReason: 'شراء سريع متأخر بعد شمعة خضراء متطرفة 12% خوفاً من فوات الفرصة (FOMO).',
    emotionBeforeTrade: 'excited',
    followedPlan: false,
    executionRating: 1,
    tags: ['FOMO', 'Impulsive'],
    checklistResponses: {
      trendAligned1D: false,
      noUpcomingNews24h: true,
      partOfPrePlan: false,
      isRevengeTrade: true,
      customRuleChecks: {},
    },
    pnl: -260,
    pnlPercent: -6.37,
    status: 'closed',
    notes: 'خطأ تنفيذي فادح: تحريك وقف الخسارة للأسفل وتجاهل خطة التداول المسبقة.',
  },
  {
    id: 'tr-seed-3',
    symbol: 'ETH',
    type: 'short',
    entryPrice: 3520,
    exitPrice: 3390,
    quantity: 1.5,
    positionValueUSDT: 5280,
    entryDate: '2026-10-01T14:30',
    exitDate: '2026-10-02T21:00',
    stopLoss: 3585,
    takeProfit1: 3390,
    riskAmountUSDT: 97.5,
    riskRewardRatio: 2.0,
    resultInR: 2.0,
    entryReason: 'دايفرجنس سلبي على مؤشر RSI عند مقاومة أسبوعية مع كسر خط الاتجاه.',
    emotionBeforeTrade: 'calm',
    followedPlan: true,
    executionRating: 5,
    tags: ['Divergence', 'Resistance'],
    checklistResponses: {
      trendAligned1D: true,
      noUpcomingNews24h: true,
      partOfPrePlan: true,
      isRevengeTrade: false,
      customRuleChecks: {},
    },
    pnl: 195,
    pnlPercent: 3.69,
    status: 'closed',
  },
  {
    id: 'tr-seed-4',
    symbol: 'BNB',
    type: 'long',
    entryPrice: 650,
    exitPrice: 632,
    quantity: 6,
    positionValueUSDT: 3900,
    entryDate: '2026-09-28T11:00',
    exitDate: '2026-09-28T15:30',
    stopLoss: 635,
    takeProfit1: 680,
    riskAmountUSDT: 90,
    riskRewardRatio: 2.0,
    resultInR: -1.2,
    entryReason: 'دخول ارتداد قاع قبل موعد خبر اقتصادي بـ 30 دقيقة.',
    emotionBeforeTrade: 'anxious',
    followedPlan: false,
    executionRating: 2,
    tags: ['NewsTrap'],
    checklistResponses: {
      trendAligned1D: false,
      noUpcomingNews24h: false,
      partOfPrePlan: false,
      isRevengeTrade: false,
      customRuleChecks: {},
    },
    pnl: -108,
    pnlPercent: -2.77,
    status: 'closed',
    notes: 'الخبر الاقتصادي تسبب بتذبذب عنيف ضرب الوقف.',
  },
  {
    id: 'tr-seed-5',
    symbol: 'SOL',
    type: 'long',
    entryPrice: 192,
    exitPrice: 206,
    quantity: 25,
    positionValueUSDT: 4800,
    entryDate: '2026-09-25T09:00',
    exitDate: '2026-09-26T17:00',
    stopLoss: 185,
    takeProfit1: 206,
    riskAmountUSDT: 175,
    riskRewardRatio: 2.0,
    resultInR: 2.0,
    entryReason: 'اختبار دعم متوسط 200 يوم مع شموع ابتلاعية إيجابية واضحة.',
    emotionBeforeTrade: 'calm',
    followedPlan: true,
    executionRating: 5,
    tags: ['Support', 'MorningTrade'],
    checklistResponses: {
      trendAligned1D: true,
      noUpcomingNews24h: true,
      partOfPrePlan: true,
      isRevengeTrade: false,
      customRuleChecks: {},
    },
    pnl: 350,
    pnlPercent: 7.29,
    status: 'closed',
  },
];
