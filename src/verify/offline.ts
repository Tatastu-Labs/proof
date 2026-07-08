/**
 * Tatastu Proof — offline verifier
 *
 * Verifies a proof bundle with zero network calls and zero dependencies.
 * Copy this single file into any project. It uses only the Web Crypto API
 * (SubtleCrypto), available in Node 18+, Deno, and modern browsers.
 *
 * Three checks are performed:
 *
 *   1. Ed25519 service signature — the service's signing key signed the
 *      canonical receipt JSON (stable key order:
 *      {"contentHash","creatorId","proofId","signedAt","signingKeyId","version"}).
 *      The public key is embedded in every bundle from the service's
 *      key-transparency log (published to Arweave).
 *
 *   2. RFC 6962 Merkle inclusion — the proof leaf, the UTF-8 bytes of
 *      `{proofId}:{contentHash}:{signedAt}`, is included in the batch Merkle
 *      root anchored to Arweave. Domain prefixes: 0x00 || leafBytes for
 *      leaves, 0x01 || left || right for interior nodes. These prefixes are
 *      fixed — the service will never change them without a versioned
 *      migration.
 *
 *   3. Creator binding (optional) — when the bundle carries `creatorPubkey`
 *      and `creatorSig`, the creator's own Ed25519 key co-signed
 *      `{contentHash}:{signedAt}` at stamp time. This proves the KEY-HOLDER
 *      (not just the API-key holder) attested to this content at this time.
 *
 * Usage:
 *   import { verifyOffline } from "@tatastu/proof/verify/offline"
 *   const result = await verifyOffline(bundle, "expected-sha256-hex")
 *   if (!result.valid) throw new Error(result.reason)
 *
 * @see https://github.com/tatastu-labs/proof
 * @see https://tatastu.dev/proof/docs
 */

/** Bundle JSON exactly as returned by GET https://proof.tatastu.dev/proof/:id/bundle */
export interface OfflineBundle {
  format: string
  version: number
  receipt: {
    contentHash: string
    creatorId: string
    proofId: string
    signedAt: number
    signingKeyId: string
    version: number
  }
  /** Base64 Ed25519 signature by the service over the canonical receipt JSON. */
  signature: string
  /** SPKI-DER base64 encoded Ed25519 public key from the transparency log. */
  signingPublicKey: string | null
  /** Present once the daily batch has closed and the tree was built. */
  merkle?: {
    leaf: string
    leafIndex: number | null
    path: Array<{ hash: string; side: "left" | "right" }>
    root: string
  } | null
  /** Anchor transactions, present once the batch anchored. */
  anchors?: {
    arweaveTx: string | null
    baseAnchorTx: string | null
    anchoredAt: number | null
  } | null
  /** Creator's co-signing public key (SPKI-DER base64), when key-bound. */
  creatorPubkey?: string | null
  /** Creator's Ed25519 signature over `{contentHash}:{signedAt}`, when key-bound. */
  creatorSig?: string | null
}

export interface OfflineResult {
  valid: boolean
  /** Populated when valid is false. */
  reason?: string
  /** True when the Ed25519 service-signature check passed. */
  signatureVerified: boolean
  /** True when the Merkle inclusion check passed (needs an anchored batch). */
  merkleVerified: boolean
  /**
   * Creator-binding check: "verified" | "invalid" | "absent".
   * "absent" means the stamp was not key-bound — that is normal, not a failure.
   */
  creatorBinding: "verified" | "invalid" | "absent"
}

// ---------- SHA-256 helpers (RFC 6962 Merkle) ----------

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return new Uint8Array(digest)
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex length")
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/** RFC 6962 §2.1 leaf hash: SHA-256(0x00 || leafBytes) */
async function leafHash(leafBytes: Uint8Array): Promise<Uint8Array> {
  return sha256(concat(new Uint8Array([0x00]), leafBytes))
}

/** RFC 6962 §2.1 interior node hash: SHA-256(0x01 || left || right) */
async function nodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  return sha256(concat(new Uint8Array([0x01]), left, right))
}

/**
 * Canonical leaf bytes: UTF-8 encoding of `{proofId}:{contentHash}:{signedAt}`.
 * Committing proofId and signedAt into the leaf bounds backdating attacks:
 * a signedAt cannot be swapped after the batch anchors without changing the root.
 */
function proofLeafBytes(proofId: string, contentHash: string, signedAt: number): Uint8Array {
  return new TextEncoder().encode(`${proofId}:${contentHash}:${signedAt}`)
}

async function verifyMerkleInclusion(
  proofId: string,
  contentHash: string,
  signedAt: number,
  path: Array<{ hash: string; side: "left" | "right" }>,
  expectedRoot: string,
): Promise<boolean> {
  const leaf = proofLeafBytes(proofId, contentHash, signedAt)
  let current = await leafHash(leaf)
  // `side` is which side the SIBLING is on.
  for (const step of path) {
    const sibling = hexToBytes(step.hash)
    current =
      step.side === "left"
        ? await nodeHash(sibling, current)
        : await nodeHash(current, sibling)
  }
  return bytesToHex(current) === expectedRoot.toLowerCase()
}

// ---------- Ed25519 signatures ----------

/**
 * Canonical receipt: the exact bytes the service signed. This is JSON with a
 * FIXED key order — it must byte-match the service's canonicalizeReceipt().
 * Never change this encoding for existing signingKeyIds.
 */
function canonicalReceipt(receipt: OfflineBundle["receipt"]): string {
  return JSON.stringify({
    contentHash: receipt.contentHash,
    creatorId: receipt.creatorId,
    proofId: receipt.proofId,
    signedAt: receipt.signedAt,
    signingKeyId: receipt.signingKeyId,
    version: receipt.version,
  })
}

function base64ToBytes(b64: string): Uint8Array {
  // Accepts standard base64 and base64url, padded or not.
  const standard = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function verifyEd25519(
  publicKeySpkiBase64: string,
  signatureBase64: string,
  message: string,
): Promise<boolean> {
  const keyBytes = base64ToBytes(publicKeySpkiBase64)
  const sigBytes = base64ToBytes(signatureBase64)
  const msgBytes = new TextEncoder().encode(message)

  const key = await crypto.subtle.importKey(
    "spki",
    keyBytes as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"],
  )
  return crypto.subtle.verify({ name: "Ed25519" }, key, sigBytes as BufferSource, msgBytes)
}

// ---------- Main export ----------

/**
 * Verify a proof bundle offline.
 *
 * @param bundle - Bundle JSON from `GET /proof/:id/bundle` or `getBundle(id)`
 * @param expectedContentHash - The SHA-256 hex of the content you hashed locally.
 *   Pass this to confirm the bundle's contentHash matches what you computed.
 * @returns OfflineResult with `valid`, `reason`, `signatureVerified`,
 *   `merkleVerified`, `creatorBinding`
 *
 * @example
 * ```ts
 * import { verifyOffline } from "@tatastu/proof/verify/offline"
 * import { getBundle, hashNodeBuffer } from "@tatastu/proof"
 * import { readFile } from "node:fs/promises"
 *
 * const myHash = await hashNodeBuffer(await readFile("report.pdf"))
 * const bundle = await getBundle("proof_1kx...")
 * const result = await verifyOffline(bundle, myHash)
 * console.log(result.valid, result.merkleVerified, result.creatorBinding)
 * ```
 */
export async function verifyOffline(
  bundle: OfflineBundle,
  expectedContentHash: string,
): Promise<OfflineResult> {
  const { receipt, signature, signingPublicKey, merkle } = bundle
  const fail = (
    reason: string,
    partial: Partial<OfflineResult> = {},
  ): OfflineResult => ({
    valid: false,
    reason,
    signatureVerified: false,
    merkleVerified: false,
    creatorBinding: "absent",
    ...partial,
  })

  if (!receipt || !signature) {
    return fail("not a proof bundle: missing receipt or signature")
  }

  // 1. Content hash match
  if (receipt.contentHash.toLowerCase() !== expectedContentHash.toLowerCase()) {
    return fail(
      `contentHash mismatch: bundle has ${receipt.contentHash}, expected ${expectedContentHash}`,
    )
  }

  // 2. Ed25519 service signature over the canonical receipt JSON
  if (!signingPublicKey) {
    return fail(
      "bundle has no signingPublicKey (key transparency log not yet published for this key)",
    )
  }
  let signatureVerified = false
  try {
    signatureVerified = await verifyEd25519(
      signingPublicKey,
      signature,
      canonicalReceipt(receipt),
    )
  } catch (err) {
    return fail(
      `Ed25519 verification threw: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!signatureVerified) {
    return fail("Ed25519 service signature is invalid")
  }

  // 3. Merkle inclusion (optional — only present once the batch closes)
  let merkleVerified = false
  if (merkle) {
    try {
      merkleVerified = await verifyMerkleInclusion(
        receipt.proofId,
        receipt.contentHash,
        receipt.signedAt,
        merkle.path,
        merkle.root,
      )
    } catch (err) {
      return fail(
        `Merkle verification threw: ${err instanceof Error ? err.message : String(err)}`,
        { signatureVerified: true },
      )
    }
    if (!merkleVerified) {
      return fail("RFC 6962 Merkle inclusion check failed", {
        signatureVerified: true,
      })
    }
  }

  // 4. Creator binding (optional): the creator's own key co-signed
  //    `{contentHash}:{signedAt}` at stamp time.
  let creatorBinding: OfflineResult["creatorBinding"] = "absent"
  if (bundle.creatorPubkey && bundle.creatorSig) {
    try {
      const ok = await verifyEd25519(
        bundle.creatorPubkey,
        bundle.creatorSig,
        `${receipt.contentHash}:${receipt.signedAt}`,
      )
      creatorBinding = ok ? "verified" : "invalid"
    } catch {
      creatorBinding = "invalid"
    }
    if (creatorBinding === "invalid") {
      return fail("creator binding signature is invalid", {
        signatureVerified: true,
        merkleVerified,
        creatorBinding,
      })
    }
  }

  return { valid: true, signatureVerified: true, merkleVerified, creatorBinding }
}
