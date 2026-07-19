# REST API reference

Mirrors [proof.tatastu.dev/docs](https://proof.tatastu.dev/docs), the canonical,
always-current reference. Base URL for every route below: `https://proof.tatastu.dev`.

## Endpoints

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /keys` | none (rate-limited) | Self-serve key: mint a free-plan key with no human step. 3 per network per day. |
| `POST /proof` | key or x402 | Create a stamp for a content hash. Returns a signed receipt + verify URL. |
| `POST /verify` | none | Given a content hash, returns every stamp for it, earliest-anchored first. |
| `GET /proof/:id` | none | Public projection of one proof (status, times, anchors). |
| `GET /proof/:id/bundle` | none | Self-contained JSON to verify the proof offline. |
| `GET /proof/:id/c2pa` | none | C2PA 2.4 manifest (media content types). |
| `GET /proof/:id/badge.svg` | none | Embeddable status badge. |
| `GET /proof/:id/qr.svg` | none | Scannable QR that opens the proof record. |
| `GET /proofs` | key | List the caller's own stamps. |
| `POST /proof/:id/revoke` | key (owner) | Forward-only revoke. |
| `POST /identities` | key | Start verifying a domain or handle. Returns publish instructions. |
| `POST /identities/:id/verify` | key | Check the published token; on success future stamps carry the verified identity. |
| `GET /identities` | none | Transparent public registry of every verified publisher. |
| `GET /identities/:value/proofs` | none | A verified publisher's public stamps. |

### `POST /keys`

No auth. Body: `{ label? }`. Returns `{ id, secret, creatorId, plan }` immediately, no
email, no human step. Rate-limited to 3 self-serve keys per network per day; a human can
instead sign in at [proof.tatastu.dev/account](https://proof.tatastu.dev/account) for the
same free tier under their own identity.

### `POST /proof`

`Authorization: Bearer pk_...` (or an x402 payment, launching soon). Body:

```json
{
  "contentHash": "64-char lowercase SHA-256 hex",
  "title": "optional, ≤300 chars",
  "visibility": "public | private",
  "previousProofId": "optional, prior version's proof id"
}
```

Public-only disclosure fields (unsigned, shown only when `visibility: "public"`):
`aiDisclosure` (`"Not AI-generated"` | `"AI-assisted"` | `"Fully AI-generated"`),
`usageNote`, `location` (creator opt-in only).

Returns a signed receipt: `{ proofId, status, signedAt, signingKeyId, signature,
verifyUrl, byline, badgeEmbed }`.

### `POST /verify`

No auth. Body: `{ contentHash }`. Returns every stamp for that hash, earliest-anchored
first, plus a `conflict` field if more than one distinct signer claimed the same bytes.

## Error responses

Every error body is `{ error, message, next, docs }`, so a failed call tells you exactly
what to do next: follow `next`, no support ticket.

| Status | error | Meaning |
|---|---|---|
| 400 | `bad_request` / `bad_json` | Malformed input (e.g. a non-64-char hash). |
| 401 | `unauthorized` | Missing/invalid API key on a route that needs one. |
| 402 | `payment_unavailable` | No credits or free stamps remain, or a keyless call needs payment. |
| 403 | `forbidden` | Authenticated, but not the owner of the target proof/key. |
| 404 | `not_found` | No such proof id. |
| 409 | `previous_already_superseded` | The `previousProofId` was already superseded. |
| 429 | `too_many_requests` | Rate limited. Retry after the given delay. |
| 429 | `rate_limited` | `POST /keys` only: 3 self-serve accounts per network per day. |
| 501 | `not_yet_available` | A feature (content escrow/reveal) ships later. |

## Rate limits

- Self-serve key minting (`POST /keys`): 3 per network per day.
- Stamping: bounded by your plan's monthly allowance (5/month free, 100/month with a
  Tatastu membership), not a request-rate limit; the plan cap returns `402` with `next`.

## Offline verification walkthrough

Once a stamp reaches `ANCHORED`, verify it with zero network calls:

```ts
import { getBundle, hashNodeBuffer } from "@tatastu/proof"
import { verifyOffline } from "@tatastu/proof/verify/offline"
import { readFile } from "node:fs/promises"

const bytes = await readFile("./report.pdf")
const bundle = await getBundle("prf_01jz...")
const result = await verifyOffline(bundle, await hashNodeBuffer(bytes))
console.log(result.valid, result.signatureVerified, result.merkleVerified)
```

`verify/offline.ts` recomputes the leaf, walks the Merkle inclusion path to the root,
checks the root against the on-chain Arweave/Base anchor, and checks the Ed25519
signature against the published key. Zero dependencies, Web Crypto API only.

## ChatGPT Actions / OpenAPI

A ready-to-import OpenAPI 3.1 schema is hosted at a stable URL:
[proof.tatastu.dev/.well-known/gpt-actions.json](https://proof.tatastu.dev/.well-known/gpt-actions.json).
In a Custom GPT's Actions config, choose "Import from URL" and paste that link.

## MCP

See [docs/mcp.md](mcp.md) and [examples/agent-mcp.md](../examples/agent-mcp.md).
