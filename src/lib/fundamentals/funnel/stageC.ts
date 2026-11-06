import { StageCChecklist } from '../types';
export type { StageCChecklist };

export function createDefaultChecklist(coinId: string, symbol: string): StageCChecklist {
  return {
    coinId,
    symbol,
    reviewedAt: new Date().toISOString().split('T')[0],
    reviewerNotes: '',
    decision: 'follow',
    recheckDays: 30,
    isComplete: false,
    top5NumbersVerified: false,
    unlockScheduleVerifiedFromDocs: false,
    latestGovernanceProposalsChecked: false,
    recentSecurityIncidentsAudited: false,
    holderConcentrationVerifiedOnExplorer: false,
  };
}

export function validateChecklistCompletion(checklist: StageCChecklist): boolean {
  return (
    checklist.top5NumbersVerified &&
    checklist.unlockScheduleVerifiedFromDocs &&
    checklist.latestGovernanceProposalsChecked &&
    checklist.recentSecurityIncidentsAudited &&
    checklist.holderConcentrationVerifiedOnExplorer &&
    checklist.reviewerNotes.trim().length >= 15
  );
}

export function canProgressToStageD(checklist: StageCChecklist | null | undefined): boolean {
  if (!checklist) return false;
  return checklist.isComplete && checklist.decision === 'follow';
}
