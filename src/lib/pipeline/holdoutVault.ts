// ============================================================================
// Protected Holdout Data Vault (/lib/pipeline/holdoutVault.ts)
// ============================================================================
// Enforces the sacred Out-Of-Sample (OOS) Holdout isolation rule:
// 1. Exactly ONE candidate (the top candidate pre-selected by Validation) is allowed to read holdout data.
// 2. Any subsequent access throws a fatal HOLDOUT_LEAK_ERROR.
// 3. Data-access counter tracks actual reads at the data level.
// ============================================================================

export class ProtectedHoldoutVault<T = any> {
  private accessCount = 0;
  private readonly maxAllowedAccesses = 1;
  private accessingCandidates: string[] = [];

  constructor(private readonly data: T) {}

  public getAccessCount(): number {
    return this.accessCount;
  }

  public getAccessingCandidates(): string[] {
    return [...this.accessingCandidates];
  }

  public accessHoldoutData(candidateId: string): T {
    this.accessCount++;
    this.accessingCandidates.push(candidateId);

    if (this.accessCount > this.maxAllowedAccesses) {
      throw new Error(
        `HOLDOUT_LEAK_ERROR: Data-level holdout breach! Attempted multiple accesses (${this.accessCount}) to sacred out-of-sample data by [${candidateId}]. Only ONE pre-selected candidate may evaluate holdout.`
      );
    }

    return this.data;
  }
}
