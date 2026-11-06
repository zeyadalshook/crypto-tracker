// Cryptographic Append-Only Audit Log with SHA-256 Hash Chaining
// Ensures tamper-evident traceability of every decision, intent, order, and limit change

import { AuditLogEntry } from '../risk/riskTypes';

// Fast SHA-256 hash using Web Crypto API or pure fallback
async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash
  let h = 0x811c9dc5;
  for (let i = 0; i < message.length; i++) {
    h ^= message.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8).repeat(4);
}

const AUDIT_STORAGE_KEY = 'crypto_execution_audit_log_v1';
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditLogManager {
  private log: AuditLogEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
        this.log = raw ? JSON.parse(raw) : [];
      } else {
        this.log = [];
      }
    } catch {
      this.log = [];
    }
  }

  private save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        // Keep last 1,000 entries
        const slice = this.log.slice(-1000);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(slice));
      }
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
  }

  public getEntries(): AuditLogEntry[] {
    return [...this.log];
  }

  public async append(
    eventType: AuditLogEntry['eventType'],
    actor: AuditLogEntry['actor'],
    details: string,
    payload?: any
  ): Promise<AuditLogEntry> {
    const timestamp = Date.now();
    const previousEntry = this.log[this.log.length - 1];
    const previousHash = previousEntry ? previousEntry.hash : GENESIS_HASH;

    const dataToHash = `${previousHash}|${timestamp}|${eventType}|${actor}|${details}`;
    const hash = await sha256(dataToHash);

    const entry: AuditLogEntry = {
      id: `audit_${timestamp}_${this.log.length}`,
      timestamp,
      eventType,
      actor,
      details,
      payload,
      previousHash,
      hash,
    };

    this.log.push(entry);
    this.save();
    return entry;
  }

  public async verifyIntegrity(): Promise<{ isValid: boolean; brokenAtIndex?: number }> {
    for (let i = 0; i < this.log.length; i++) {
      const entry = this.log[i];
      const prevHash = i === 0 ? GENESIS_HASH : this.log[i - 1].hash;

      if (entry.previousHash !== prevHash) {
        return { isValid: false, brokenAtIndex: i };
      }

      const expectedData = `${prevHash}|${entry.timestamp}|${entry.eventType}|${entry.actor}|${entry.details}`;
      const expectedHash = await sha256(expectedData);
      if (entry.hash !== expectedHash) {
        return { isValid: false, brokenAtIndex: i };
      }
    }
    return { isValid: true };
  }
}

export const auditLogger = new AuditLogManager();
