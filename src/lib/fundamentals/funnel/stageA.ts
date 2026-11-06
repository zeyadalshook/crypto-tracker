import { RawAssetFundamentalInput } from '../scoringEngine';
import { isAssetInProfileSector } from '../profiles/profileManager';

export interface StageACandidate {
  coin: RawAssetFundamentalInput;
  initialScore: number;
  liquidityUsd: number;
  ageMonths: number;
  sector: string;
  isEligible: boolean;
  rejectionReasonAr?: string;
}

export interface StageAResult {
  totalScanned: number;
  eligibleCount: number;
  selectedTopCandidates: StageACandidate[]; // Top 20-30 chosen
  rejectedCount: number;
  callCount: number;
  durationMs: number;
}

/**
 * Stage A: Fast, deterministic filtering & preliminary ranking
 * Strict filters: Liquidity >= 1M$, Age >= 24m, Sector support, basic data availability.
 */
export function runStageAFastScreening(coins: RawAssetFundamentalInput[]): StageAResult {
  const startTime = performance.now();
  const eligibleCandidates: StageACandidate[] = [];
  let rejectedCount = 0;

  for (const c of coins) {
    const vol = c.volume24hUsd?.value ?? 0;
    const age = c.projectAgeMonths?.value ?? 0;
    const isSectorSupported = isAssetInProfileSector(c.sector) && !c.isStoreOfValueOrMeme;

    // Filter 1: Sector
    if (!isSectorSupported) {
      rejectedCount++;
      continue;
    }

    // Filter 2: Liquidity >= 1M$
    if (vol < 1e6) {
      rejectedCount++;
      continue;
    }

    // Filter 3: Age >= 24 months
    if (age < 24) {
      rejectedCount++;
      continue;
    }

    // Preliminary 5-metric numerical score (0 to 100)
    // 1. Circulating / Max (up to 20 pts)
    const circPct = c.circulatingToMaxPct?.value ?? 50;
    const p1 = Math.min(20, (circPct / 100) * 20);

    // 2. FDV / Revenue (up to 25 pts: <=50 = 25pts, 150 = 10pts, >150 = 0)
    const mult = c.fdvToRevenueMultiple?.value ?? 100;
    let p2 = 0;
    if (mult <= 50) p2 = 25;
    else if (mult <= 150) p2 = Math.max(5, 25 - ((mult - 50) / 100) * 20);

    // 3. TVL or Fee volume (up to 20 pts)
    const fees = c.annualProtocolFeesUsd?.value ?? 0;
    const p3 = Math.min(20, (fees / 5e8) * 20);

    // 4. Liquidity Volume (up to 15 pts)
    const p4 = Math.min(15, (vol / 1e8) * 15);

    // 5. GitHub commits (up to 20 pts)
    const commits = c.githubCommits90Days?.value ?? 0;
    const p5 = Math.min(20, (commits / 100) * 20);

    const initialScore = Number((p1 + p2 + p3 + p4 + p5).toFixed(1));

    eligibleCandidates.push({
      coin: c,
      initialScore,
      liquidityUsd: vol,
      ageMonths: age,
      sector: c.sector,
      isEligible: true,
    });
  }

  // Sort by initialScore descending and pick top 20-30
  eligibleCandidates.sort((a, b) => b.initialScore - a.initialScore);
  const selectedTop = eligibleCandidates.slice(0, 30);

  const durationMs = Number((performance.now() - startTime).toFixed(1));

  return {
    totalScanned: coins.length,
    eligibleCount: eligibleCandidates.length,
    selectedTopCandidates: selectedTop,
    rejectedCount,
    callCount: 2,
    durationMs,
  };
}
