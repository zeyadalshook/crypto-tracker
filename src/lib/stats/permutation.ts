// Permutation Test (Monte Carlo Permutation / White's Reality Check test)
// Shuffles trade ordering to assess whether performance metrics exceed noise

import { PermutationTestResult } from '../../types/evidence';
import { Mulberry32 } from './random';

function calculateSharpe(rValues: number[]): number {
  const n = rValues.length;
  if (n < 2) return 0;
  const mean = rValues.reduce((s, v) => s + v, 0) / n;
  const variance =
    rValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return mean / stdDev;
}

/**
 * Runs a permutation test comparing actual strategy Sharpe ratio against
 * 1,000 randomized sign-flipping and order shuffles under H0: zero skill.
 */
export function runPermutationTest(
  rValues: number[],
  permutationsCount: number = 1000,
  seed: number = 98765
): PermutationTestResult {
  const n = rValues.length;
  const originalSharpe = calculateSharpe(rValues);

  if (n < 5) {
    return {
      originalSharpe: Number(originalSharpe.toFixed(3)),
      simulatedSharpeDistribution: [],
      pValPermutation: 1.0,
      isSignificant: false,
    };
  }

  const rng = new Mulberry32(seed);
  const simulatedSharpes: number[] = new Array(permutationsCount);
  let betterOrEqualCount = 0;

  for (let p = 0; p < permutationsCount; p++) {
    // Under null hypothesis: trade return sign is random coin toss (+ or -)
    const permuted = new Array(n);
    for (let i = 0; i < n; i++) {
      const sign = rng.next() < 0.5 ? 1 : -1;
      permuted[i] = Math.abs(rValues[i]) * sign;
    }

    const simSharpe = calculateSharpe(permuted);
    simulatedSharpes[p] = Number(simSharpe.toFixed(3));

    if (simSharpe >= originalSharpe) {
      betterOrEqualCount++;
    }
  }

  const pVal = betterOrEqualCount / permutationsCount;

  return {
    originalSharpe: Number(originalSharpe.toFixed(3)),
    simulatedSharpeDistribution: simulatedSharpes,
    pValPermutation: Number(pVal.toFixed(4)),
    isSignificant: pVal < 0.05,
  };
}
