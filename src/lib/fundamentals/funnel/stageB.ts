import { RawAssetFundamentalInput, evaluateAssetFundamentals } from '../scoringEngine';
import { FundamentalEvaluationReport } from '../types';
import { StageACandidate } from './stageA';

export interface StageBResult {
  evaluatedCount: number;
  allEvaluations: FundamentalEvaluationReport[];
  passedSurvivors: FundamentalEvaluationReport[];
  shortlist: FundamentalEvaluationReport[]; // Top <= 5
}

/**
 * Stage B: Full Protocol Evaluation
 * Applies the complete weighted protocol to Stage A survivors.
 * Retains top <= 5 passing survivors for mandatory Stage C manual review.
 */
export function runStageBFullEvaluation(stageACandidates: StageACandidate[]): StageBResult {
  const evaluations: FundamentalEvaluationReport[] = [];

  for (const cand of stageACandidates) {
    const report = evaluateAssetFundamentals(cand.coin);
    evaluations.push(report);
  }

  // Filter survivors: No exclusions, score >= 70, coverage >= 60%
  const passedSurvivors = evaluations.filter((e) => e.hasPassed && !e.hasAnyExclusion);

  // Sort by finalScore descending
  passedSurvivors.sort((a, b) => b.finalScore - a.finalScore);

  // Take top <= 5 for Stage C shortlist
  const shortlist = passedSurvivors.slice(0, 5);

  return {
    evaluatedCount: evaluations.length,
    allEvaluations: evaluations,
    passedSurvivors,
    shortlist,
  };
}
