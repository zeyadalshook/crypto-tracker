import { sha256Sync } from '../../../utils/sha256';
import { FundamentalEvaluationReport } from '../types';

export interface PreRegisteredCandidate {
  entryIndex: number;
  symbol: string;
  coinId: string;
  score: number;
  coveragePct: number;
  hasPassed: boolean;
  registeredAt: string;
  protocolVersion: string;
  protocolHash: string;
  previousHash: string;
  currentHash: string;
}

export interface CandidateLogFile {
  specVersion: string;
  logTitleAr: string;
  createdAt: string;
  genesisHash: string;
  candidates: PreRegisteredCandidate[];
  forwardTrackingNoticeAr: string;
}

export class CandidateLogManager {
  private log: PreRegisteredCandidate[] = [];
  private genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

  public addCandidate(report: FundamentalEvaluationReport): PreRegisteredCandidate {
    const prevHash = this.log.length > 0 ? this.log[this.log.length - 1].currentHash : this.genesisHash;
    const nowIso = new Date().toISOString();

    const dataToHash = {
      entryIndex: this.log.length,
      symbol: report.symbol,
      coinId: report.coinId,
      score: report.finalScore,
      coveragePct: report.coveragePct,
      hasPassed: report.hasPassed,
      registeredAt: nowIso,
      protocolVersion: report.protocolVersion,
      protocolHash: report.protocolHash,
      previousHash: prevHash,
    };

    const currentHash = sha256Sync(JSON.stringify(dataToHash));

    const entry: PreRegisteredCandidate = {
      ...dataToHash,
      currentHash,
    };

    this.log.push(entry);
    return entry;
  }

  public getLog(): PreRegisteredCandidate[] {
    return [...this.log];
  }

  public exportJson(): string {
    const payload: CandidateLogFile = {
      specVersion: '1.0-fundamentals-audit',
      logTitleAr: 'سجل المرشحين المعتمدين غير القابل للتعديل (Fundamental Candidates Hash Chain)',
      createdAt: new Date().toISOString(),
      genesisHash: this.genesisHash,
      candidates: this.log,
      forwardTrackingNoticeAr:
        'تنبيه الاختبار الأمامي: لا يمكن استخلاص أي نتيجة إحصائية حاسمة قبل مرور 12 شهراً ومتابعة 20 عملة على الأقل مقابل BTC وسلة القيمة السوقية.',
    };
    return JSON.stringify(payload, null, 2);
  }
}

export const candidateLogManager = new CandidateLogManager();
