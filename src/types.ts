/** Status of a proof stamp in the service lifecycle. */
export type ProofStatus = "SIGNED" | "ANCHORED" | "CONFIRMED" | "REVOKED"

/** Options for creating a stamp. */
export interface StampOptions {
  /**
   * SHA-256 hex digest of the content to stamp.
   * Compute it yourself (e.g. with `hashContent()`) so bytes never leave your machine.
   */
  contentHash: string

  /** MIME type of the content, e.g. `"text/plain"` or `"image/png"`. */
  contentType?: string

  /** Human-readable title for display in verify pages. */
  title?: string

  /**
   * Your creator identifier. Omit to stamp anonymously; supply to claim authorship
   * and later revoke or supersede this stamp.
   */
  creatorId?: string

  /**
   * ID of a prior stamp to supersede. Use when publishing a new version of the same work.
   * The previous stamp is marked superseded but remains verifiable.
   */
  previousProofId?: string

  /**
   * Your API key (from tatastu.dev/proof). Required for paid tiers; omitted for free-tier
   * usage up to the monthly quota.
   */
  apiKey?: string
}

/** The receipt returned after a successful stamp. */
export interface ProofReceipt {
  /** Unique proof ID, e.g. `"prf_01jz..."`. */
  proofId: string

  /** SHA-256 hex digest that was stamped. */
  contentHash: string

  /** The creator ID that claimed this stamp. */
  creatorId: string

  /** Current status in the anchoring lifecycle. */
  status: ProofStatus

  /** Version counter (1 for original, 2+ for superseding stamps). */
  version: number

  /** Unix ms timestamp recorded at signing time (claimed time). */
  signedAt: number

  /** ID of the signing key used by the service. */
  signingKeyId: string

  /** Base64url Ed25519 signature over the canonical receipt. */
  signature: string

  /** Public URL where anyone can verify this stamp. */
  verifyUrl: string

  /** Previous proof ID if this is a superseding stamp. */
  previousProofId?: string

  /** Plain-text byline: `"Verified · https://tatastu.dev/p/..."` */
  byline: string

  /** One-line HTML byline, always XSS-safe. */
  bylineHtml: string
}

/** Result from verifying a content hash. */
export interface VerifyResult {
  /** SHA-256 hex that was checked. */
  contentHash: string

  /** All stamps matching this hash, earliest-anchored first. */
  proofs: VerifyProof[]
}

/** A single proof entry returned by verify. */
export interface VerifyProof {
  proofId: string
  creatorId: string
  status: ProofStatus
  version: number
  signedAt: number
  signingKeyId: string
  signature: string
  verifyUrl: string
  previousProofId?: string
  supersededBy?: string | null
  byline: string
  bylineHtml: string
}

/**
 * A self-contained bundle for offline verification.
 * Fetch with `GET /proof/:id/bundle`.
 */
export interface ProofBundle {
  proof: {
    proofId: string
    contentHash: string
    creatorId: string
    status: ProofStatus
    version: number
    signedAt: number
    signingKeyId: string
    signature: string
  }
  signingPublicKey: string | null
  merkle?: {
    root: string
    leafIndex: number
    path: Array<{ hash: string; side: "left" | "right" }>
  }
  anchor?: {
    arweaveTx: string | null
    baseAnchorTx: string | null
  }
}
