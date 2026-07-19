# Tatastu Proof

[![npm version](https://img.shields.io/npm/v/@tatastu/proof.svg)](https://www.npmjs.com/package/@tatastu/proof)
[![CI](https://github.com/Tatastu-Labs/proof/actions/workflows/ci.yml/badge.svg)](https://github.com/Tatastu-Labs/proof/actions/workflows/ci.yml)
[![service status](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fproof.tatastu.dev%2Fhealth&query=%24.ok&label=service&color=success&logo=cloudflare)](https://proof.tatastu.dev/health)
[![license](https://img.shields.io/npm/l/@tatastu/proof.svg)](LICENSE)

**A working answer to EU AI Act Article 50.** Article 50(4) requires providers of
general-purpose AI systems to mark AI-generated content with machine-readable
provenance metadata by **2 August 2026**. Tatastu Proof is one API call: hash the
content locally, get back a permanent, publicly verifiable record of who signed it and
when. Works from any language, any agent, any pipeline. (This is not legal advice;
whether a given stamp satisfies your specific Article 50 obligation depends on your use
case and counsel, see [docs/eu-ai-act.md](docs/eu-ai-act.md).)

```ts
import { stamp, hashText } from "@tatastu/proof"

const hash = await hashText("Hello, world!")
const receipt = await stamp({ contentHash: hash, title: "My post" })
console.log(receipt.verifyUrl)
// → https://proof.tatastu.dev/p/prf_01jz...
```

Live service: [proof.tatastu.dev](https://proof.tatastu.dev) — verification is always free.
Open the printed `verifyUrl` in a browser to see the public record: signer, timestamp,
and the Arweave/Base anchor once it lands.

---

## What it does

A **stamp** takes the SHA-256 of any content (text, file, JSON, code, binary) and records:

- Who signed it (a creator identity you provide, or anonymous)
- When it was signed (millisecond-precision, bounded by the daily Merkle anchor)
- An Ed25519 signature from the Tatastu Proof service's key-transparency log

Within 24 hours, stamps are batched into an RFC 6962 Merkle tree. The root is anchored
to **Arweave** (permanent storage) and **Base** (EVM on-chain calldata). After anchoring,
you can verify the stamp with zero network calls using the offline verifier in this repo.

What a stamp **does not** prove: authorship truth. The service records "this signer
claimed this content at this time." The claimed time (`signedAt`) and proven time
(anchored) are distinct and both shown on every verify page.

---

## Install

```bash
npm install @tatastu/proof
```

Or use without installing:

```bash
npx tsx examples/eu-ai-act-label.ts
```

---

## Quickstart

### Stamp text

```ts
import { stamp, hashText } from "@tatastu/proof"

const hash = await hashText("The report content goes here.")
const receipt = await stamp({ contentHash: hash, title: "Q3 Report" })
console.log(receipt.verifyUrl)   // https://proof.tatastu.dev/p/prf_...
console.log(receipt.byline)      // "Verified · https://proof.tatastu.dev/p/prf_..."
```

### Stamp a file (Node.js)

```ts
import { stamp, hashNodeBuffer } from "@tatastu/proof"
import { readFile } from "node:fs/promises"

const bytes = await readFile("./report.pdf")
const receipt = await stamp({
  contentHash: await hashNodeBuffer(bytes),
  contentType: "application/pdf",
  title: "Q3 Financial Report",
  apiKey: process.env.TATASTU_API_KEY,
})
```

### Verify any content

```ts
import { verify, hashText } from "@tatastu/proof"

const { proofs } = await verify(await hashText("The report content goes here."))
if (proofs.length > 0) {
  console.log("Authentic:", proofs[0].verifyUrl)
  console.log("Status:", proofs[0].status)   // SIGNED | ANCHORED | CONFIRMED
}
```

### Stamp a file in the browser (drag-and-drop)

```ts
import { stamp, hashBlob } from "@tatastu/proof"

const file = dropEvent.dataTransfer.files[0]
const receipt = await stamp({
  contentHash: await hashBlob(file),
  title: file.name,
})
```

See [examples/browser-drop.html](examples/browser-drop.html) for a complete
self-contained verify page with no build step.

---

## MCP (agent use)

Add `proof.tatastu.dev/mcp` to your Claude Code, Cursor, or Windsurf config:

```json
{
  "mcpServers": {
    "tatastu-proof": {
      "url": "https://proof.tatastu.dev/mcp"
    }
  }
}
```

The agent can then call `create_proof` and `verify_proof` directly. See
[examples/agent-mcp.md](examples/agent-mcp.md) for the full config and tool reference.

---

## EU AI Act compliance

EU AI Act Article 50(4) requires machine-readable provenance on AI-generated content.
The deadline is 2 August 2026.

```ts
import { stamp, hashText } from "@tatastu/proof"

const aiOutput = "AI-generated text goes here."
const receipt = await stamp({ contentHash: await hashText(aiOutput) })

const labeledOutput = {
  text: aiOutput,
  _proof: {
    contentHash: receipt.contentHash,
    proofId: receipt.proofId,
    verifyUrl: receipt.verifyUrl,
    signedAt: receipt.signedAt,
    bylineHtml: receipt.bylineHtml,
  },
}
```

Run the full example with no setup:

```bash
npx tsx examples/eu-ai-act-label.ts
```

See [docs/eu-ai-act.md](docs/eu-ai-act.md) for the compliance guide.

---

## How verification works

Every stamp is:

1. **Signed** immediately with an Ed25519 key from the service's transparency log
2. **Batched** daily into an RFC 6962 Merkle tree (0x00/0x01 domain-separated prefixes)
3. **Anchored** — the Merkle root written to Arweave (permanent) and Base (on-chain calldata)
4. **Confirmed** once the Arweave transaction has sufficient confirmations

After anchoring you can verify with the public key and inclusion path — no network,
no trust, no service required.

### Four verified layers on every verify page

1. **Ed25519 signature** — the service signed the canonical receipt
2. **RFC 6962 Merkle inclusion** — the stamp is in the anchored batch
3. **Arweave anchor** — the Merkle root is on Arweave
4. **Base calldata** — the root is in an EVM transaction on Base

---

## Offline verification

After a stamp reaches `ANCHORED` status, you can verify it with no network calls:

```ts
import { getBundle, hashNodeBuffer } from "@tatastu/proof"
import { verifyOffline } from "@tatastu/proof/verify/offline"
import { readFile } from "node:fs/promises"

const bytes = await readFile("./report.pdf")
const bundle = await getBundle("prf_01jz...")
const result = await verifyOffline(bundle, await hashNodeBuffer(bytes))
console.log(result.valid, result.signatureVerified, result.merkleVerified)
```

`verify/offline.ts` is a single 200-line file with zero dependencies. Copy it into
any project. It uses only the Web Crypto API (SubtleCrypto), available in Node 18+,
Deno, and modern browsers.

---

## Pricing

| Tier | Price | Stamps | Status |
|------|-------|--------|--------|
| Free | $0 | 5/month | Live |
| Tatastu membership | $20/month (the whole [Tatastu app](https://tatastu.dev)) | 100/month included | Live |
| Starter bundle | $8 | 100 (no expiry) | Launching soon |
| Creator bundle | $35 | 500 (no expiry) | Launching soon |
| Creator subscription | $12/month | 100/month | Launching soon |
| Pay-per-stamp (x402) | $0.10, or $0.05 with API key | n/a | Launching soon |

**Verification is always free and requires no account.**

"Launching soon" tiers are priced and committed but not yet purchasable; the API never
routes you to a paywall that doesn't exist. Full, always-current pricing:
[proof.tatastu.dev/pricing](https://proof.tatastu.dev/pricing) (mirrored in
[docs/pricing.md](docs/pricing.md)).

---

## Integrations and examples

| Framework / target | File |
|---|---|
| LangChain (tool-calling agent) | [examples/langchain-tool.ts](examples/langchain-tool.ts) |
| Vercel AI SDK | [examples/vercel-ai-tool.ts](examples/vercel-ai-tool.ts) |
| CrewAI / AutoGen (Python) | [examples/crewai-autogen-tool.py](examples/crewai-autogen-tool.py) |
| MCP (Claude Code, Cursor, Windsurf) | [examples/agent-mcp.md](examples/agent-mcp.md) |
| ChatGPT Actions (OpenAPI 3.1) | hosted at [proof.tatastu.dev/.well-known/gpt-actions.json](https://proof.tatastu.dev/.well-known/gpt-actions.json), source: [examples/gpt-actions.json](examples/gpt-actions.json) |
| Browser, no build step | [examples/browser-drop.html](examples/browser-drop.html) |
| Node.js CLI | [examples/node-stamp.ts](examples/node-stamp.ts) |
| EU AI Act labeling | [examples/eu-ai-act-label.ts](examples/eu-ai-act-label.ts) |

Full REST reference (every endpoint, error table, rate limits): [docs/api.md](docs/api.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Found a security issue? See
[SECURITY.md](SECURITY.md) instead of opening a public issue. The service, Worker, and D1 schema are in a
private repo — this repo contains only the public SDK, offline verifier, and examples.
