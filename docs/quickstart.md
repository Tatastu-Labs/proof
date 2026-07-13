# Quickstart

## Install

```bash
npm install @tatastu/proof
```

Or use without installing:

```bash
npx tsx examples/node-stamp.ts ./my-report.pdf
```

## Node.js

```ts
import { stamp, verify, hashNodeBuffer } from "@tatastu/proof"
import { readFile } from "node:fs/promises"

// Hash a file locally — bytes never leave your machine
const bytes = await readFile("./report.pdf")
const contentHash = await hashNodeBuffer(bytes)

// Create a stamp. Sign in free at https://proof.tatastu.dev/account for a key
// (no card, 25 stamps/month); creating a stamp always needs a key or an x402
// payment, verification never does.
const receipt = await stamp({
  contentHash,
  contentType: "application/pdf",
  title: "Q3 Financial Report",
  apiKey: process.env.TATASTU_API_KEY,
})

console.log(receipt.verifyUrl)
// → https://proof.tatastu.dev/p/prf_01jz...
console.log(receipt.byline)
// → "Verified · https://proof.tatastu.dev/p/prf_01jz..."
```

## Browser

```ts
import { stamp, verify, hashBlob } from "@tatastu/proof"

// From a file input or drag-drop
const file = event.target.files[0]
const contentHash = await hashBlob(file)

// Verify before stamping
const { proofs } = await verify(contentHash)
if (proofs.length > 0) {
  console.log("Already stamped:", proofs[0].verifyUrl)
}
```

## AI agent (MCP)

See [examples/agent-mcp.md](../examples/agent-mcp.md) for a Claude Code / Cursor config.

## Offline verification

After a stamp reaches `ANCHORED` or `CONFIRMED` status (within 24 hours of the daily
batch), you can verify it with zero network calls:

```ts
import { getBundle, hashNodeBuffer } from "@tatastu/proof"
import { verifyOffline } from "@tatastu/proof/verify/offline"
import { readFile } from "node:fs/promises"

const bytes = await readFile("./report.pdf")
const myHash = await hashNodeBuffer(bytes)

const bundle = await getBundle("prf_01jz...")
const result = await verifyOffline(bundle, myHash)
// { valid: true, signatureVerified: true, merkleVerified: true }
```

The `verify/offline.ts` file can also be copied as a single standalone file into
any project — it has zero dependencies beyond Web Crypto.
