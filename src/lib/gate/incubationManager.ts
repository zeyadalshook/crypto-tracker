// Incubation Session Manager (إدارة فترة الحضانة وتتبع التآكل الحي)
// Manages ongoing paper or micro-live incubation sessions and checks decay in real-time

import {
  IncubationSession,
  EvidenceTrade,
  StatisticalEvidence,
} from '../../types/evidence';
import { evaluateStrategyDecay } from '../stats/decayMonitor';

const STORAGE_KEY = 'crypto_strategy_incubation_sessions';

export function loadAllIncubationSessions(): IncubationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load incubation sessions:', e);
    return [];
  }
}

export function saveAllIncubationSessions(sessions: IncubationSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save incubation sessions:', e);
  }
}

export function startNewIncubationSession(
  evidence: StatisticalEvidence,
  initialPhase: 'paper' | 'micro_live' = 'paper'
): IncubationSession {
  const sessions = loadAllIncubationSessions();

  const newSession: IncubationSession = {
    strategyId: evidence.strategyId,
    strategyName: evidence.strategyName,
    symbol: evidence.symbol,
    timeframe: evidence.timeframe,
    startDate: Date.now(),
    currentPhase: initialPhase,
    trades: [],
    expectedBaselineExpectancyR: evidence.expectancyR.point,
    expectedBaselineWinRate: evidence.winRate.point,
    maxAllowedDrawdownR: evidence.bootstrap.drawdown95thPercentileR || 10,
    rollingExpectancyR: 0,
    rollingWinRate: 0,
    cusumScore: 0,
    cusumAlertTriggered: false,
    edgeDecayWarning: false,
    consecutiveLosses: 0,
  };

  // Replace or add
  const filtered = sessions.filter((s) => s.strategyId !== evidence.strategyId);
  filtered.push(newSession);
  saveAllIncubationSessions(filtered);

  return newSession;
}

export function addTradeToIncubationSession(
  strategyId: string,
  trade: EvidenceTrade
): IncubationSession | null {
  const sessions = loadAllIncubationSessions();
  const session = sessions.find((s) => s.strategyId === strategyId);
  if (!session) return null;

  session.trades.push(trade);

  // Recalculate rolling metrics
  const rValues = session.trades.map((t) => t.pnlR);
  const wins = session.trades.filter((t) => t.pnlR > 0).length;
  session.rollingWinRate = wins / session.trades.length;

  const decayResult = evaluateStrategyDecay({
    baselineExpectancyR: session.expectedBaselineExpectancyR,
    baselineStdDevR: 1.0,
    recentTradesR: rValues,
    cusumThreshold: 3.5,
  });

  session.rollingExpectancyR = decayResult.rollingExpectancyR;
  session.cusumScore = decayResult.cusumScore;
  session.cusumAlertTriggered = decayResult.isDecayAlert;
  session.edgeDecayWarning = decayResult.statusLevel !== 'healthy';
  session.consecutiveLosses = decayResult.consecutiveLosses;
  session.decayMessageAr = decayResult.summaryAr;

  if (decayResult.isDecayAlert && session.currentPhase === 'micro_live') {
    session.currentPhase = 'suspended';
  }

  saveAllIncubationSessions(sessions);
  return session;
}

export function updateSessionPhase(
  strategyId: string,
  newPhase: 'paper' | 'micro_live' | 'full_live' | 'suspended'
): IncubationSession | null {
  const sessions = loadAllIncubationSessions();
  const session = sessions.find((s) => s.strategyId === strategyId);
  if (!session) return null;

  session.currentPhase = newPhase;
  saveAllIncubationSessions(sessions);
  return session;
}
