/**
 * Tatastu Proof — offline verifier
 *
 * Verifies a proof bundle with zero network calls and zero dependencies.
 * Copy this single file into any project. It uses only the Web Crypto API
 * (SubtleCrypto), available in Node 18+, Deno, and modern browsers.
 *
 * Two checks are performed:
 *
 *   1. Ed25519 signature — the service's signing key signed the canonical
 *      receipt (proofId:contentHash:signedAt:signingKeyId:version).
 *      The public key is embedded in every bundle from the service's
 *      transparency log (key-transparency log on Arweave).
 *
 *   2. RFC 6962 Merkle inclusion — the proof leaf (proofId:contentHash:signedAt)
 *      is included in the batch Merkle root anchored to Arweave and Base.
 *      Domain prefixes: 0x00 || leafBytes for leaves, 0x01 || left || right
 *      for interior nodes. These prefixes are fixed — the service bakes them
 *      into every bundle and will never change them without a versioned migration.
 *
 * Usage:
 *   import { verifyOffline } from "./offline.js"
 *   const result = await verifyOffline(bundle, "expected-sha256-hex")
 *   if (!result.valid) throw new Error(result.reason)
 *
 * @see https://github.com/tatastu-labs/proof
 * @see https://tatastu.dev/content-authenticity
 */

export interface OfflineBundle {
  proof: {
    proofId: string
    contentHash: string
    creatorId: string
    status: string
    version: number
    signedAt: number
    signingKeyId: string
    signature: string
  }
  /** SPKI-DER base64 encoded Ed25519 public key from the transparency log. */
  signingPublicKey: string | null
  merkle?: {
    root: string
    leafIndex: number
    path: Array<{ hash: string; side: "left" | "right" }>
  }
}

export interface OfflineResult {
  valid: boolean
  /** Populated when valid is false. */
  reason?: string
  /** True when the Merkle check passed (requires batch to be closed+anchored). */
  merkleVerified: boolean
  /** True when the Ed25519 signature check passed. */
  signatureVerified: boolean
}

// ---------- SHA-256 helpers (RFC 6962 Merkle) ----------

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
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
  for (const step of path) {
    const sibling = hexToBytes(step.hash)
    current =
      step.side === "left"
        ? await nodeHash(sibling, current)
        : await nodeHash(current, sibling)
  }
  return bytesToHex(current) === expectedRoot.toLowerCase()
}

// ---------- Ed25519 signature ----------

/**
 * Canonical receipt string: the exact bytes that were signed.
 * Fields are sorted alphabetically and joined with colons.
 * This encoding is stable — never change field order without a new signingKeyId.
 */
function canonicalReceipt(proof: OfflineBundle["proof"]): string {
  return [
    proof.contentHash,
    proof.creatorId,
    proof.proofId,
    String(proof.signedAt),
    proof.signingKeyId,
    String(proof.version),
  ].join(":")
}

function base64ToBytes(b64: string): Uint8Array {
  // Handle base64url (no padding, - and _ instead of + and /)
  const standard = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function verifyEd25519(
  publicKeySpkiBase64: string,
  signatureBase64url: string,
  message: string,
): Promise<boolean> {
  const keyBytes = base64ToBytes(publicKeySpkiBase64)
  const sigBytes = base64ToBytes(signatureBase64url)
  const msgBytes = new TextEncoder().encode(message)

  const key = await crypto.subtle.importKey(
    "spki",
    keyBytes,
    { name: "Ed25519" },
    false,
    ["verify"],
  )
  return crypto.subtle.verify({ name: "Ed25519" }, key, sigBytes, msgBytes)
}

// ---------- Main export ----------

/**
 * Verify a proof bundle offline.
 *
 * @param bundle - Bundle JSON from `GET /proof/:id/bundle` or `getBundle(id)`
 * @param expectedContentHash - The SHA-256 hex of the content you hashed locally.
 *   Pass this to confirm the bundle's contentHash matches what you computed.
 * @returns OfflineResult with `valid`, `reason`, `signatureVerified`, `merkleVerified`
 *
 * @example
 * ```ts
 * import { verifyOffline } from "./offline.js"
 * import { getBundle, hashNodeBuffer } from "@tatastu/proof"
 * import { readFile } from "node:fs/promises"
 *
 * const myHash = await hashNodeBuffer(await readFile("report.pdf"))
 * const bundle = await getBundle("prf_01jz...")
 * const result = await verifyOffline(bundle, myHash)
 * console.log(result.valid, result.merkleVerified)
 * ```
 */
export async function verifyOffline(
  bundle: OfflineBundle,
  expectedContentHash: string,
): Promise<OfflineResult> {
  const { proof, signingPublicKey, merkle } = bundle

  // 1. Content hash match
  if (proof.contentHash.toLowerCase() !== expectedContentHash.toLowerCase()) {
    return {
      valid: false,
      reason: `contentHash mismatch: bundle has ${proof.contentHash}, expected ${expectedContentHash}`,
      merkleVerified: false,
      signatureVerified: false,
    }
  }

  // 2. Ed25519 signature
  let signatureVerified = false
  if (!signingPublicKey) {
    return {
      valid: false,
      reason: "bundle has no signingPublicKey (key transparency log not yet published for this key)",
      merkleVerified: false,
      signatureVerified: false,
    }
  }
  try {
    const canonical = canonicalReceipt(proof)
    signatureVerified = await verifyEd25519(signingPublicKey, proof.signature, canonical)
  } catch (err) {
    return {
      valid: false,
      reason: `Ed25519 verification threw: ${err instanceof Error ? err.message : String(err)}`,
      merkleVerified: false,
      signatureVerified: false,
    }
  }

  if (!signatureVerified) {
    return {
      valid: false,
      reason: "Ed25519 signature is invalid",
      merkleVerified: false,
      signatureVerified: false,
    }
  }

  // 3. Merkle inclusion (optional — only present once the batch closes)
  let merkleVerified = false
  if (merkle) {
    try {
      merkleVerified = await verifyMerkleInclusion(
        proof.proofId,
        proof.contentHash,
        proof.signedAt,
        merkle.path,
        merkle.root,
      )
      if (!merkleVerified) {
        return {
          valid: false,
          reason: "RFC 6962 Merkle inclusion check failed",
          merkleVerified: false,
          signatureVerified: true,
        }
      }
    } catch (err) {
      return {
        valid: false,
        reason: `Merkle verification threw: ${err instanceof Error ? err.message : String(err)}`,
        merkleVerified: false,
        signatureVerified: true,
      }
    }
  }

  return { valid: true, merkleVerified, signatureVerified: true }
}
