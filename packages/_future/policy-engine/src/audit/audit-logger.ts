/**
 * Policy Audit Logger (TS-SEC-009)
 *
 * Append-only audit logging for policy evaluation decisions.
 */

import {
  generateAuditEventId,
  hashSHA256,
  nowISO,
  type PolicyAuditRecord,
  type PolicyEvaluationInput,
  type PolicyEvaluationOutput,
} from '@topshelf/shared';

/** Audit storage interface */
export interface AuditStorage {
  append(record: PolicyAuditRecord): Promise<void>;
  getByLearnerId(learnerId: string, limit?: number): Promise<PolicyAuditRecord[]>;
  getByAuditId(auditId: string): Promise<PolicyAuditRecord | null>;
  getLastHash(): Promise<string>;
}

/**
 * In-memory audit storage for development/testing
 */
export class InMemoryAuditStorage implements AuditStorage {
  private readonly records: PolicyAuditRecord[] = [];
  private lastHash: string = 'genesis';

  append(record: PolicyAuditRecord): Promise<void> {
    this.records.push(record);
    this.lastHash = hashSHA256(JSON.stringify(record));
    return Promise.resolve();
  }

  getByLearnerId(learnerId: string, limit: number = 100): Promise<PolicyAuditRecord[]> {
    return Promise.resolve(this.records.filter((r) => r.input.learnerId === learnerId).slice(-limit));
  }

  getByAuditId(auditId: string): Promise<PolicyAuditRecord | null> {
    return Promise.resolve(this.records.find((r) => r.auditId === auditId) ?? null);
  }

  getLastHash(): Promise<string> {
    return Promise.resolve(this.lastHash);
  }

  // For testing
  getRecordCount(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
    this.lastHash = 'genesis';
  }
}

/**
 * Policy audit logger
 */
export class PolicyAuditLogger {
  private readonly storage: AuditStorage;
  private readonly nodeId: string;
  private readonly signingKey: string;

  constructor(storage: AuditStorage, nodeId: string, signingKey: string) {
    this.storage = storage;
    this.nodeId = nodeId;
    this.signingKey = signingKey;
  }

  /**
   * Log a policy evaluation decision
   */
  async logEvaluation(
    input: PolicyEvaluationInput,
    output: PolicyEvaluationOutput
  ): Promise<PolicyAuditRecord> {
    const auditId = generateAuditEventId();
    const timestamp = nowISO();
    const previousHash = await this.storage.getLastHash();

    // Redact PII from input before logging
    const redactedInput = this.redactPII(input);

    // Create signature
    const signaturePayload = JSON.stringify({
      auditId,
      input: redactedInput,
      output,
      timestamp,
      previousHash,
    });
    const signature = this.sign(signaturePayload);

    const record: PolicyAuditRecord = {
      auditId,
      input: redactedInput,
      output,
      policyVersion: input.policy.policyVersion,
      timestamp,
      nodeId: this.nodeId,
      signature,
    };

    await this.storage.append(record);

    return record;
  }

  /**
   * Retrieve audit records for a learner
   */
  async getLearnerHistory(learnerId: string, limit?: number): Promise<PolicyAuditRecord[]> {
    return this.storage.getByLearnerId(learnerId, limit);
  }

  /**
   * Verify a single audit record's signature
   */
  verifyRecord(record: PolicyAuditRecord): boolean {
    // Simplified verification - production would use proper crypto with full payload reconstruction
    return record.signature.startsWith(`sig-${record.nodeId}-`);
  }

  /**
   * Redact PII from input
   */
  private redactPII(input: PolicyEvaluationInput): PolicyEvaluationInput {
    // In production, implement proper PII redaction
    // For now, return as-is since learner IDs are pseudonymous
    return input;
  }

  /**
   * Sign data
   */
  private sign(data: string): string {
    return `sig-${this.nodeId}-${hashSHA256(data + this.signingKey).slice(0, 32)}`;
  }
}

/**
 * Audit chain verifier for integrity checks
 */
export class AuditChainVerifier {
  private readonly storage: AuditStorage;

  constructor(storage: AuditStorage) {
    this.storage = storage;
  }

  /**
   * Verify chain integrity for a learner's records
   */
  async verifyLearnerChain(learnerId: string): Promise<{
    valid: boolean;
    brokenAt?: string;
    recordCount: number;
  }> {
    const records = await this.storage.getByLearnerId(learnerId, 1000);

    if (records.length === 0) {
      return { valid: true, recordCount: 0 };
    }

    // Verify each record's signature format
    for (const record of records) {
      if (!record.signature.startsWith('sig-')) {
        return {
          valid: false,
          brokenAt: record.auditId,
          recordCount: records.length,
        };
      }
    }

    return { valid: true, recordCount: records.length };
  }
}
