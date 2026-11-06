// Persistent Storage & History Aggregator for Autonomous Trading Brain
// Manages Append-Only Activity Log, Daily Summaries, In-App Alerts, and User Settings

import { BrainDecision, BrainDecisionType } from './decisionTypes';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface BrainActivityEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  coin: string;
  decision: BrainDecisionType;
  confidence: number;
  action:
    | 'ANALYSIS'
    | 'ENTER_LONG'
    | 'ENTER_SHORT'
    | 'MOVE_SL_BREAKEVEN'
    | 'PARTIAL_TP'
    | 'EXIT'
    | 'HALT'
    | 'MANUAL_CLOSE';
  reasoningAr: string;
  entryPrice?: number;
  exitPrice?: number;
  pnlR?: number;
  pnlUsdt?: number;
  feeUsdt?: number;
  netPnlUsdt?: number;
  confluenceCount?: number;
  confluenceGroups?: string[];
}

export interface BrainDailySummary {
  dateStr: string;
  totalAnalyses: number;
  decisionsBreakdown: {
    ENTER_LONG: number;
    ENTER_SHORT: number;
    EXIT: number;
    STAY_OUT: number;
  };
  tradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRatePct: number;
  totalPnlR: number;
  totalPnlUsdt: number;
  biggestWinnerR: number;
  biggestLoserR: number;
  riskGuardHaltsCount: number;
}

export interface BrainAlert {
  id: string;
  timestamp: number;
  coin: string;
  type:
    | 'SIGNAL_ENTER'
    | 'SIGNAL_EXIT'
    | 'TRADE_OPENED'
    | 'TRADE_CLOSED'
    | 'SL_BREAKEVEN'
    | 'RISK_HALT'
    | 'KILL_SWITCH';
  titleAr: string;
  messageAr: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
}

export interface BrainAutopilotSettings {
  autopilotEnabled: boolean;          // Default: false (OFF)
  riskPerTradePct: number;            // Default: 1.0%
  maxDailyLossPct: number;            // Default: 3.0%
  maxConsecutiveLosses: number;       // Default: 3
  maxNotionalEquityPct: number;       // Default: 10.0%
  minConfidence: number;              // Default: 60
  moveSlToBreakevenAtR: number;       // Default: 1.0 R
  takePartialProfitAtTp1: boolean;    // Default: true
  roundTripFeePct: number;            // Default: 0.25% (round-trip friction & fee)
  browserNotificationsEnabled: boolean;
}

export const DEFAULT_BRAIN_SETTINGS: BrainAutopilotSettings = {
  autopilotEnabled: false,
  riskPerTradePct: 1.0,
  maxDailyLossPct: 3.0,
  maxConsecutiveLosses: 3,
  maxNotionalEquityPct: 10.0,
  minConfidence: 60,
  moveSlToBreakevenAtR: 1.0,
  takePartialProfitAtTp1: true,
  roundTripFeePct: 0.25,
  browserNotificationsEnabled: false,
};

const STORAGE_KEYS = {
  ACTIVITY_LOG: 'brain_activity_log_v1',
  ALERTS: 'brain_alerts_v1',
  SETTINGS: 'brain_settings_v1',
  POSITIONS: 'brain_paper_positions_v1',
  DAILY_STATE: 'brain_daily_state_v1',
};

// --- SETTINGS ---
export function loadBrainSettings(): BrainAutopilotSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_BRAIN_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_BRAIN_SETTINGS;
}

export function saveBrainSettings(settings: BrainAutopilotSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

// --- ACTIVITY LOG (APPEND-ONLY) ---
export function getBrainActivityLog(): BrainActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function appendBrainActivity(entry: Omit<BrainActivityEntry, 'id' | 'timestamp' | 'dateStr'>): BrainActivityEntry {
  const fullEntry: BrainActivityEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    dateStr: getLocalDateString(),
  };

  try {
    const list = getBrainActivityLog();
    // Keep last 1,000 log entries
    const updated = [fullEntry, ...list].slice(0, 1000);
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(updated));
  } catch {}

  return fullEntry;
}

// --- DAILY SUMMARY CALCULATION ---
export function calculateDailySummary(dateStr: string = getLocalDateString()): BrainDailySummary {
  const allLogs = getBrainActivityLog();
  const dayLogs = allLogs.filter((l) => l.dateStr === dateStr);

  let totalAnalyses = 0;
  const breakdown = { ENTER_LONG: 0, ENTER_SHORT: 0, EXIT: 0, STAY_OUT: 0 };
  let tradesCount = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let totalPnlR = 0;
  let totalPnlUsdt = 0;
  let biggestWinnerR = 0;
  let biggestLoserR = 0;
  let riskGuardHaltsCount = 0;

  for (const log of dayLogs) {
    if (log.action === 'ANALYSIS') {
      totalAnalyses++;
      if (log.decision in breakdown) {
        breakdown[log.decision]++;
      }
    } else if (log.action === 'EXIT' || log.action === 'MANUAL_CLOSE') {
      tradesCount++;
      const pnlR = log.pnlR || 0;
      const pnlUsdt = log.pnlUsdt || 0;
      totalPnlR += pnlR;
      totalPnlUsdt += pnlUsdt;

      if (pnlR > 0) {
        winningTradesCount++;
        if (pnlR > biggestWinnerR) biggestWinnerR = pnlR;
      } else if (pnlR < 0) {
        losingTradesCount++;
        if (pnlR < biggestLoserR) biggestLoserR = pnlR;
      }
    } else if (log.action === 'HALT') {
      riskGuardHaltsCount++;
    }
  }

  const winRatePct =
    tradesCount > 0 ? Number(((winningTradesCount / tradesCount) * 100).toFixed(1)) : 0;

  return {
    dateStr,
    totalAnalyses,
    decisionsBreakdown: breakdown,
    tradesCount,
    winningTradesCount,
    losingTradesCount,
    winRatePct,
    totalPnlR: Number(totalPnlR.toFixed(2)),
    totalPnlUsdt: Number(totalPnlUsdt.toFixed(2)),
    biggestWinnerR: Number(biggestWinnerR.toFixed(2)),
    biggestLoserR: Number(biggestLoserR.toFixed(2)),
    riskGuardHaltsCount,
  };
}

// --- ALERTS ---
export function getBrainAlerts(): BrainAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function addBrainAlert(alert: Omit<BrainAlert, 'id' | 'timestamp' | 'read'>): BrainAlert {
  const fullAlert: BrainAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    read: false,
  };

  try {
    const list = getBrainAlerts();
    const updated = [fullAlert, ...list].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updated));
  } catch {}

  // Trigger browser notification if permitted and enabled
  try {
    const settings = loadBrainSettings();
    if (
      settings.browserNotificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(`[العقل المدبر] ${fullAlert.titleAr}`, {
        body: fullAlert.messageAr,
        icon: '/favicon.ico',
      });
    }
  } catch {}

  return fullAlert;
}

export function markAlertAsRead(id: string): void {
  try {
    const list = getBrainAlerts();
    const updated = list.map((a) => (a.id === id ? { ...a, read: true } : a));
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updated));
  } catch {}
}

export function clearAllAlerts(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([]));
  } catch {}
}
