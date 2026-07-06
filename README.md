# Tatastu Proof

One API call stamps any content with a permanent, publicly verifiable provenance record.
Works from any language, any agent, any pipeline.

```ts
import { stamp, hashText } from "@tatastu/proof"

const hash = await hashText("Hello, world!")
const receipt = await stamp({ contentHash: hash, title: "My post" })
console.log(receipt.verifyUrl)
// → https://tatastu.dev/p/prf_01jz...
```

Live service: [proof.tatastu.dev](https://proof.tatastu.dev) — verification is always free.

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
console.log(receipt.verifyUrl)   // https://tatastu.dev/p/prf_...
console.log(receipt.byline)      // "Verified · https://tatastu.dev/p/prf_..."
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

| Tier | Price | Stamps |
|------|-------|--------|
| Free | $0 | 25/month |
| Starter bundle | $8 | 100 (no expiry) |
| Creator bundle | $35 | 500 (no expiry) |
| Creator subscription | $12/month | 500/month |
| Pay-per-stamp (x402) | $0.10 or $0.05 with API key | — |

**Verification is always free and requires no account.**

Full pricing: [docs/pricing.md](docs/pricing.md) and [tatastu.dev/proof](https://tatastu.dev/proof).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The service, Worker, and D1 schema are in a
private repo — this repo contains only the public SDK, offline verifier, and examples.
