import { RawAssetFundamentalInput, evaluateAssetFundamentals } from '../scoringEngine';
import { ProtocolDefinition } from '../types';
import defaultProtocolJson from '../profiles/defaultProtocol.json';
import { calculateProfileHash } from '../profiles/profileManager';

export interface PerturbationResult {
  categoryPerturbed: string;
  weightDelta: number; // +5 or -5
  spearmanRankCorrelation: number;
  shortlistChangesCount: number;
  topCandidateBefore: string;
  topCandidateAfter: string;
}

export interface SensitivityAuditReport {
  perturbations: PerturbationResult[];
  minSpearmanR: number;
  averageSpearmanR: number;
  isRobust: boolean; // avg Spearman >= 0.85
  summaryAr: string;
}

/**
 * Computes Spearman Rank Correlation between two ranked arrays of identical items
 */
function computeSpearmanRank(
  baseItems: { symbol: string; score: number }[],
  perturbedItems: { symbol: string; score: number }[]
): number {
  const n = baseItems.length;
  if (n <= 1) return 1.0;

  // Assign ranks (1 = highest score)
  const baseSorted = [...baseItems].sort((a, b) => b.score - a.score);
  const baseRanks = new Map<string, number>();
  baseSorted.forEach((item, idx) => baseRanks.set(item.symbol, idx + 1));

  const pertSorted = [...perturbedItems].sort((a, b) => b.score - a.score);
  const pertRanks = new Map<string, number>();
  pertSorted.forEach((item, idx) => pertRanks.set(item.symbol, idx + 1));

  let dSquaredSum = 0;
  for (const item of baseItems) {
    const r1 = baseRanks.get(item.symbol) || 1;
    const r2 = pertRanks.get(item.symbol) || 1;
    const diff = r1 - r2;
    dSquaredSum += diff * diff;
  }

  // Spearman formula: 1 - (6 * sum(d^2)) / (n * (n^2 - 1))
  const rho = 1 - (6 * dSquaredSum) / (n * (n * n - 1));
  return Number(rho.toFixed(4));
}

export function runSensitivityAnalysis(coins: RawAssetFundamentalInput[]): SensitivityAuditReport {
  const baseProtocol: ProtocolDefinition = {
    profileId: defaultProtocolJson.profileId,
    profileNameAr: defaultProtocolJson.profileNameAr,
    profileNameEn: defaultProtocolJson.profileNameEn,
    version: defaultProtocolJson.version,
    sha256Hash: calculateProfileHash(defaultProtocolJson),
    targetSector: defaultProtocolJson.targetSector,
    categories: defaultProtocolJson.categories.map((c) => ({ id: c.id as any, titleAr: c.titleAr, weight: c.weight })),
    passScoreThreshold: defaultProtocolJson.passScoreThreshold,
    minCoverageThreshold: defaultProtocolJson.minCoverageThreshold,
    disclaimerAr: defaultProtocolJson.disclaimerAr,
  };

  // Base evaluation
  const baseEvaluations = coins
    .filter((c) => !c.isStoreOfValueOrMeme)
    .map((c) => {
      const rep = evaluateAssetFundamentals(c, baseProtocol);
      return { symbol: c.symbol, score: rep.finalScore, passed: rep.hasPassed };
    });

  const baseShortlist = [...baseEvaluations].sort((a, b) => b.score - a.score).slice(0, 5).map((i) => i.symbol);
  const perturbations: PerturbationResult[] = [];

  const categoryIds = ['tokenomics', 'revenue', 'users', 'development', 'security', 'team'] as const;

  for (const catId of categoryIds) {
    for (const delta of [+5, -5]) {
      // Create perturbed protocol
      const perturbedProtocol = JSON.parse(JSON.stringify(baseProtocol)) as ProtocolDefinition;
      const targetCat = perturbedProtocol.categories.find((c) => c.id === catId);
      if (targetCat) {
        targetCat.weight += delta;
      }

      // Re-evaluate
      const perturbedEvaluations = coins
        .filter((c) => !c.isStoreOfValueOrMeme)
        .map((c) => {
          const rep = evaluateAssetFundamentals(c, perturbedProtocol);
          return { symbol: c.symbol, score: rep.finalScore, passed: rep.hasPassed };
        });

      const perturbedShortlist = [...perturbedEvaluations].sort((a, b) => b.score - a.score).slice(0, 5).map((i) => i.symbol);

      // Count changes in shortlist
      const changesCount = baseShortlist.filter((sym) => !perturbedShortlist.includes(sym)).length;
      const rho = computeSpearmanRank(baseEvaluations, perturbedEvaluations);

      perturbations.push({
        categoryPerturbed: catId,
        weightDelta: delta,
        spearmanRankCorrelation: rho,
        shortlistChangesCount: changesCount,
        topCandidateBefore: baseShortlist[0] || '—',
        topCandidateAfter: perturbedShortlist[0] || '—',
      });
    }
  }

  const spearmanValues = perturbations.map((p) => p.spearmanRankCorrelation);
  const minSpearmanR = Math.min(...spearmanValues);
  const averageSpearmanR = Number((spearmanValues.reduce((s, v) => s + v, 0) / spearmanValues.length).toFixed(4));
  const isRobust = averageSpearmanR >= 0.85;

  const summaryAr = isRobust
    ? `صلابة معلمية ممتازة (متوسط سبيرمان = ${averageSpearmanR} ≥ 0.85). تغيير الأوزان بمقدار ±5 نقاط لا يزعزع الترتيب الأساسي أو القائمة المختصرة.`
    : `حساسية معلمية مرتفعة (متوسط سبيرمان = ${averageSpearmanR} < 0.85)؛ ترتيب المشاريع يعتمد بشدة على الأوزان المختارة.`;

  return {
    perturbations,
    minSpearmanR,
    averageSpearmanR,
    isRobust,
    summaryAr,
  };
}
