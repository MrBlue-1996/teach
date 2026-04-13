/**
 * Content Pack Signer (TS-SEC-009)
 *
 * Handles cryptographic signing of content packs
 * for authenticity and integrity verification.
 */

import { hashSHA256, nowISO, type ContentPackManifest } from '@topshelf/shared';

/** Signing configuration */
export interface SigningConfig {
  /** Signing key ID */
  readonly keyId: string;
  /** Key algorithm */
  readonly algorithm: 'ECDSA-P256-SHA256' | 'RSA-PSS-SHA256';
  /** HSM/KMS endpoint (optional) */
  readonly kmsEndpoint?: string;
}

/** Signing result */
export interface SigningResult {
  /** Generated signature */
  readonly signature: string;
  /** Key ID used */
  readonly keyId: string;
  /** Algorithm used */
  readonly algorithm: string;
  /** Signing timestamp */
  readonly signedAt: string;
  /** Content hash that was signed */
  readonly contentHash: string;
}

/** Verification result */
export interface VerificationResult {
  /** Whether signature is valid */
  readonly valid: boolean;
  /** Key ID used */
  readonly keyId: string;
  /** Verification timestamp */
  readonly verifiedAt: string;
  /** Error message if invalid */
  readonly error?: string;
}

/**
 * Content pack signer
 */
export class ContentPackSigner {
  private readonly config: SigningConfig;
  private readonly signingKey: string;

  constructor(config: SigningConfig, signingKey: string) {
    this.config = config;
    this.signingKey = signingKey;
  }

  /**
   * Sign a content pack manifest
   */
  sign(pack: Omit<ContentPackManifest, 'signature' | 'signingKeyId'>): SigningResult {
    // Create canonical representation for signing
    const contentToSign = this.createCanonicalContent(pack);
    const contentHash = hashSHA256(contentToSign);

    // Sign the content hash
    // In production, use actual cryptographic signing with KMS/HSM
    const signature = this.generateSignature(contentHash);

    return {
      signature,
      keyId: this.config.keyId,
      algorithm: this.config.algorithm,
      signedAt: nowISO(),
      contentHash,
    };
  }

  /**
   * Verify a content pack signature
   */
  verify(pack: ContentPackManifest): VerificationResult {
    const verifiedAt = nowISO();

    // Check key ID matches
    if (pack.signingKeyId !== this.config.keyId) {
      return {
        valid: false,
        keyId: pack.signingKeyId,
        verifiedAt,
        error: `Key ID mismatch: expected ${this.config.keyId}, got ${pack.signingKeyId}`,
      };
    }

    // Create canonical representation
    const packWithoutSig = Object.fromEntries(
      Object.entries(pack).filter(([key]) => key !== 'signature' && key !== 'signingKeyId')
    ) as Omit<ContentPackManifest, 'signature' | 'signingKeyId'>;
    const contentToVerify = this.createCanonicalContent(packWithoutSig);
    const contentHash = hashSHA256(contentToVerify);

    // Verify signature
    const expectedSignature = this.generateSignature(contentHash);
    const valid = pack.signature === expectedSignature;

    return {
      valid,
      keyId: pack.signingKeyId,
      verifiedAt,
      ...(!valid ? { error: 'Signature verification failed' } : {}),
    };
  }

  /**
   * Create canonical content representation for signing
   */
  private createCanonicalContent(
    pack: Omit<ContentPackManifest, 'signature' | 'signingKeyId'>
  ): string {
    // Sort keys and stringify for deterministic output
    return JSON.stringify(pack, Object.keys(pack).sort());
  }

  /**
   * Generate signature for content hash
   * In production, this would use actual crypto with KMS/HSM
   */
  private generateSignature(contentHash: string): string {
    const signatureData = `${contentHash}:${this.config.keyId}:${this.config.algorithm}`;
    const signature = hashSHA256(signatureData + this.signingKey);
    return `sig-v1-${this.config.algorithm}-${signature}`;
  }

  /**
   * Get signing key ID
   */
  getKeyId(): string {
    return this.config.keyId;
  }
}

/**
 * Content pack revocation manager
 */
export class RevocationManager {
  private readonly revocationList: Map<
    string,
    { version: string; reason: string; revokedAt: string }
  > = new Map();

  /**
   * Add a pack to the revocation list
   */
  revoke(packId: string, version: string, reason: string): void {
    const key = `${packId}:${version}`;
    this.revocationList.set(key, {
      version,
      reason,
      revokedAt: nowISO(),
    });
  }

  /**
   * Check if a pack version is revoked
   */
  isRevoked(packId: string, version: string): boolean {
    return this.revocationList.has(`${packId}:${version}`);
  }

  /**
   * Get revocation info for a pack
   */
  getRevocationInfo(
    packId: string,
    version: string
  ): {
    revoked: boolean;
    reason?: string;
    revokedAt?: string;
  } {
    const info = this.revocationList.get(`${packId}:${version}`);
    if (info === undefined) {
      return { revoked: false };
    }
    return {
      revoked: true,
      reason: info.reason,
      revokedAt: info.revokedAt,
    };
  }

  /**
   * Get all revoked packs
   */
  getAllRevocations(): Array<{
    packId: string;
    version: string;
    reason: string;
    revokedAt: string;
  }> {
    const result: Array<{
      packId: string;
      version: string;
      reason: string;
      revokedAt: string;
    }> = [];

    for (const [key, info] of this.revocationList) {
      const [packId] = key.split(':');
      if (packId !== undefined) {
        result.push({
          packId,
          version: info.version,
          reason: info.reason,
          revokedAt: info.revokedAt,
        });
      }
    }

    return result;
  }
}

/**
 * Create a signed content pack
 */
export function createSignedPack(
  pack: Omit<ContentPackManifest, 'signature' | 'signingKeyId'>,
  signer: ContentPackSigner
): ContentPackManifest {
  const signingResult = signer.sign(pack);

  return {
    ...pack,
    signature: signingResult.signature,
    signingKeyId: signingResult.keyId,
  };
}
