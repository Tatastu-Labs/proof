/**
 * Offline-verifier test suite. Dependency-free: node:test + WebCrypto.
 * Builds synthetic bundles signed with a throwaway keypair, including a
 * hand-constructed 2-leaf RFC 6962 tree, and checks every verification lane.
 *
 * Run: npm test  (requires the build first: npm run build)
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { webcrypto as crypto } from "node:crypto"
import { verifyOffline } from "../dist/verify/offline.js"

const te = new TextEncoder()
const b64 = (u) => Buffer.from(u).toString("base64")
const hex = (u) => Buffer.from(u).toString("hex")

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
}
async function leafHash(leafBytes) {
  return sha256(new Uint8Array([0x00, ...leafBytes]))
}
async function nodeHash(left, right) {
  return sha256(new Uint8Array([0x01, ...left, ...right]))
}

/** Canonical receipt JSON — must byte-match the service's canonicalizeReceipt(). */
function canonicalReceipt(r) {
  return JSON.stringify({
    contentHash: r.contentHash,
    creatorId: r.creatorId,
    proofId: r.proofId,
    signedAt: r.signedAt,
    signingKeyId: r.signingKeyId,
    version: r.version,
  })
}

async function makeKeypair() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey))
  return { pair, spkiB64: b64(spki) }
}

async function sign(pair, message) {
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, te.encode(message)))
  return b64(sig)
}

const HASH_A = "a".repeat(64)
const HASH_B = "b".repeat(64)

async function makeBundle(overrides = {}) {
  const service = await makeKeypair()
  const receipt = {
    contentHash: HASH_A,
    creatorId: "creator_test",
    proofId: "proof_a",
    signedAt: 1783400000000,
    signingKeyId: "key-test",
    version: 1,
    ...overrides.receipt,
  }
  return {
    service,
    bundle: {
      format: "tatastu-proof-bundle",
      version: 1,
      receipt,
      signature: await sign(service.pair, canonicalReceipt(receipt)),
      signingPublicKey: service.spkiB64,
      ...overrides.bundle,
    },
  }
}

test("valid signature-only bundle verifies", async () => {
  const { bundle } = await makeBundle()
  const res = await verifyOffline(bundle, HASH_A)
  assert.equal(res.valid, true)
  assert.equal(res.signatureVerified, true)
  assert.equal(res.merkleVerified, false)
  assert.equal(res.creatorBinding, "absent")
})

test("contentHash mismatch fails before any crypto", async () => {
  const { bundle } = await makeBundle()
  const res = await verifyOffline(bundle, HASH_B)
  assert.equal(res.valid, false)
  assert.match(res.reason, /contentHash mismatch/)
})

test("tampered receipt field breaks the service signature", async () => {
  const { bundle } = await makeBundle()
  bundle.receipt.signedAt += 1
  const res = await verifyOffline(bundle, HASH_A)
  assert.equal(res.valid, false)
  assert.match(res.reason, /signature is invalid/)
})

test("2-leaf RFC 6962 inclusion verifies, tampered root fails", async () => {
  const receiptA = {
    contentHash: HASH_A,
    creatorId: "creator_test",
    proofId: "proof_a",
    signedAt: 1783400000000,
    signingKeyId: "key-test",
    version: 1,
  }
  const leafA = te.encode(`${receiptA.proofId}:${receiptA.contentHash}:${receiptA.signedAt}`)
  const leafB = te.encode(`proof_b:${HASH_B}:1783400000001`)
  const hA = await leafHash(leafA)
  const hB = await leafHash(leafB)
  const root = hex(await nodeHash(hA, hB))

  const service = await makeKeypair()
  const bundle = {
    format: "tatastu-proof-bundle",
    version: 1,
    receipt: receiptA,
    signature: await sign(service.pair, canonicalReceipt(receiptA)),
    signingPublicKey: service.spkiB64,
    merkle: {
      leaf: `${receiptA.proofId}:${receiptA.contentHash}:${receiptA.signedAt}`,
      leafIndex: 0,
      path: [{ hash: hex(hB), side: "right" }],
      root,
    },
  }

  const ok = await verifyOffline(bundle, HASH_A)
  assert.equal(ok.valid, true)
  assert.equal(ok.merkleVerified, true)

  const tampered = { ...bundle, merkle: { ...bundle.merkle, root: "ff" + root.slice(2) } }
  const bad = await verifyOffline(tampered, HASH_A)
  assert.equal(bad.valid, false)
  assert.match(bad.reason, /Merkle/)
})

test("creator binding verifies and rejects a wrong key", async () => {
  const creator = await makeKeypair()
  const { bundle } = await makeBundle()
  bundle.creatorPubkey = creator.spkiB64
  bundle.creatorSig = await sign(creator.pair, `${HASH_A}:${bundle.receipt.signedAt}`)

  const ok = await verifyOffline(bundle, HASH_A)
  assert.equal(ok.valid, true)
  assert.equal(ok.creatorBinding, "verified")

  const stranger = await makeKeypair()
  bundle.creatorPubkey = stranger.spkiB64
  const bad = await verifyOffline(bundle, HASH_A)
  assert.equal(bad.valid, false)
  assert.equal(bad.creatorBinding, "invalid")
})

test("missing signingPublicKey is an explicit failure", async () => {
  const { bundle } = await makeBundle()
  bundle.signingPublicKey = null
  const res = await verifyOffline(bundle, HASH_A)
  assert.equal(res.valid, false)
  assert.match(res.reason, /signingPublicKey/)
})
