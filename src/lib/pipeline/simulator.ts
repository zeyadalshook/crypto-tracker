// Vectorized Fast Simulator for Strategy Screening & Grid Search
// Single Source of Truth Wrapper around /lib/sim/core.ts

import { PrecalculatedIndicators } from './indicators';
import { simulateCore, CoreSimulationConfig, CoreSimulationResult } from '../sim/core';

export interface StrategyParamConfig {
  entryType: 'rsi_oversold' | 'ema_cross' | 'macd_cross' | 'breakout_high' | 'supertrend';
  exitType: 'tp_sl' | 'rsi_overbought' | 'ema_cross';
  tpPct: number;
  slPct: number;
  feePct?: number;      // default: 0.075%
  slippagePct?: number; // default: 0.05%
  maxDrawdownLimitPct?: number; // default: 30%
}

export interface FastSimulationResult {
  tradesCount: number;
  winRate: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownPct: number;
  rValues: number[];
  finalCapital: number;
  stoppedEarly: boolean;
}

/**
 * Delegated to /lib/sim/core.ts: Single Source of Truth for simulation logic
 */
export function runVectorizedSimulation(
  ind: PrecalculatedIndicators,
  config: StrategyParamConfig,
  startIndex: number = 0,
  endIndex: number = ind.length - 1
): FastSimulationResult {
  const result: CoreSimulationResult = simulateCore(
    ind,
    {
      entryType: config.entryType,
      exitType: config.exitType,
      tpPct: config.tpPct,
      slPct: config.slPct,
      feePct: config.feePct !== undefined ? config.feePct : 0.075,
      slippagePct: config.slippagePct !== undefined ? config.slippagePct : 0.05,
      maxDrawdownLimitPct: config.maxDrawdownLimitPct !== undefined ? config.maxDrawdownLimitPct : 30,
    },
    startIndex,
    endIndex,
    false // indices are explicitly managed by pipeline
  );

  return {
    tradesCount: result.tradesCount,
    winRate: result.winRate,
    expectancyR: result.expectancyR,
    profitFactor: result.profitFactor,
    maxDrawdownPct: result.maxDrawdownPct,
    rValues: result.rValues,
    finalCapital: result.finalCapital,
    stoppedEarly: result.stoppedEarly,
  };
}
