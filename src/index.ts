/**
 * @tatastu/proof — JavaScript/TypeScript SDK for Tatastu Proof
 *
 * Stamps content with a permanent, publicly verifiable provenance record.
 * Works in Node 18+, Deno, and browsers (SubtleCrypto + fetch).
 *
 * What a stamp proves: who signed it and when, using the Tatastu Proof
 * service's Ed25519 key. Daily batches anchor the Merkle root to Arweave
 * and Base, making provenance permanent and independently verifiable.
 *
 * What a stamp does NOT prove: authorship truth. The service records
 * "this creator claimed this content at this time." Claimed time (signedAt)
 * and proven time (anchored) are distinct and both surfaced in every receipt.
 *
 * @see https://proof.tatastu.dev
 * @see https://proof.tatastu.dev/pricing
 */

export type { ProofBundle, ProofReceipt, ProofStatus, StampOptions, VerifyProof, VerifyResult } from "./types.js"
export { hashBlob, hashBytes, hashNodeBuffer, hashText } from "./hash.js"

import type { ProofBundle, ProofReceipt, StampOptions, VerifyResult } from "./types.js"

const BASE_URL = "https://proof.tatastu.dev"

class ProofError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "ProofError"
  }
}

async function apiFetch<T>(
  path: string,
  opts: RequestInit & { apiKey?: string } = {},
): Promise<T> {
  const { apiKey, ...rest } = opts
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    ...(rest.headers as Record<string, string>),
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ProofError(
      (body as { message?: string }).message ?? `HTTP ${res.status}`,
      (body as { error?: string }).error ?? "unknown_error",
      res.status,
    )
  }
  return res.json() as Promise<T>
}

/**
 * Stamp a content hash with the Tatastu Proof service.
 *
 * The hash must be a 64-character hex-encoded SHA-256 digest.
 * Use `hashText()`, `hashBytes()`, or `hashNodeBuffer()` from this package
 * to compute it locally — content bytes are never sent to the service.
 *
 * @example
 * ```ts
 * import { stamp, hashText } from "@tatastu/proof"
 *
 * const hash = await hashText("Hello, world!")
 * const receipt = await stamp({ contentHash: hash, title: "My post" })
 * console.log(receipt.verifyUrl)  // https://tatastu.dev/p/prf_01jz...
 * ```
 */
export async function stamp(opts: StampOptions): Promise<ProofReceipt> {
  const { apiKey, ...body } = opts
  return apiFetch<ProofReceipt>("/proof", {
    method: "POST",
    body: JSON.stringify(body),
    apiKey,
  })
}

/**
 * Verify a content hash: returns all stamps that match it, earliest-anchored first.
 * Returns an empty `proofs` array (not an error) if no stamps exist for this hash.
 *
 * The hash can also be passed as a `Blob` or `Uint8Array` — the SDK hashes it
 * locally first. This overload is useful for browser drop-zone verify pages.
 *
 * @example
 * ```ts
 * import { verify, hashText } from "@tatastu/proof"
 *
 * const hash = await hashText("Hello, world!")
 * const result = await verify(hash)
 * if (result.proofs.length > 0) {
 *   console.log("Authentic:", result.proofs[0].verifyUrl)
 * }
 * ```
 */
export async function verify(hashOrContent: string | Uint8Array | Blob): Promise<VerifyResult> {
  let contentHash: string

  if (typeof hashOrContent === "string") {
    contentHash = hashOrContent
  } else if (hashOrContent instanceof Uint8Array) {
    const { hashBytes } = await import("./hash.js")
    contentHash = await hashBytes(hashOrContent)
  } else {
    const { hashBlob } = await import("./hash.js")
    contentHash = await hashBlob(hashOrContent)
  }

  return apiFetch<VerifyResult>("/verify", {
    method: "POST",
    body: JSON.stringify({ contentHash }),
  })
}

/**
 * Fetch a proof receipt by ID.
 *
 * @example
 * ```ts
 * import { getProof } from "@tatastu/proof"
 * const proof = await getProof("prf_01jz...")
 * console.log(proof.status) // "SIGNED" | "ANCHORED" | "CONFIRMED"
 * ```
 */
export async function getProof(proofId: string): Promise<ProofReceipt> {
  return apiFetch<ProofReceipt>(`/proof/${proofId}`)
}

/**
 * Fetch a self-contained offline verification bundle for a proof.
 * The bundle contains the signature, signing public key, Merkle inclusion path,
 * and anchor transaction IDs — everything needed to verify without contacting
 * the service.
 *
 * Pass the result to `verify/offline.ts` for zero-network verification.
 *
 * @example
 * ```ts
 * import { getBundle } from "@tatastu/proof"
 * const bundle = await getBundle("prf_01jz...")
 * // then: verifyOffline(bundle, "my expected hash") from verify/offline.ts
 * ```
 */
export async function getBundle(proofId: string): Promise<ProofBundle> {
  return apiFetch<ProofBundle>(`/proof/${proofId}/bundle`)
}

export { ProofError }
