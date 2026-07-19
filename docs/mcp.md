# MCP Tool Reference

Tatastu Proof exposes a [Model Context Protocol](https://modelcontextprotocol.io) server
at `https://proof.tatastu.dev/mcp`. Any MCP-compatible client can use it to stamp and
verify content directly from an agent session.

## Setup

See [examples/agent-mcp.md](../examples/agent-mcp.md) for config snippets for
Claude Code, Cursor, and Windsurf.

## Available tools

### `create_proof`

Stamp a content hash with the Tatastu Proof service.

**Input:**
```json
{
  "contentHash": "string (64 hex chars, SHA-256)",
  "contentType": "string (optional, e.g. 'text/plain')",
  "title": "string (optional, up to 300 chars)",
  "creatorId": "string (optional, did:key: or opaque ID)",
  "previousProofId": "string (optional, supersede an existing stamp)"
}
```

**Output:** ProofReceipt with `proofId`, `verifyUrl`, `status`, `signedAt`, `byline`, `bylineHtml`.

---

### `verify_proof`

Check whether a content hash has any stamps.

**Input:**
```json
{
  "contentHash": "string (64 hex chars)"
}
```

**Output:** `{ contentHash, proofs: ProofReceipt[] }` — empty array if no stamps exist.

---

### `list_proofs`

List stamps by creator ID, paginated.

**Input:**
```json
{
  "creatorId": "string",
  "limit": "number (optional, default 20)",
  "offset": "number (optional, default 0)"
}
```

---

### `grant_access`

(Coming — escrow feature not yet available)

---

### `reveal`

(Coming — escrow feature not yet available)

---

### `revoke_proof`

Revoke a stamp by ID. Requires a creator API key.

**Input:**
```json
{
  "proofId": "string",
  "reason": "string (optional)"
}
```

## Annotations

All tools include MCP `annotations`:

- `create_proof`: `readOnlyHint: false`, `idempotentHint: false`
- `verify_proof`: `readOnlyHint: true`, `idempotentHint: true`
- `list_proofs`: `readOnlyHint: true`, `idempotentHint: true`
- `revoke_proof`: `readOnlyHint: false`, `idempotentHint: false`

## Free tier

Verification tools (`verify_proof`, `list_proofs`) are always free and unmetered.
`create_proof` needs an API key: call `create_account` once (free, instant, no human in
the loop) and the key includes 5 stamps/month. A key minted by signing in at
[proof.tatastu.dev/account](https://proof.tatastu.dev/account) with a Tatastu
subscription email includes 500 stamps/month. Full pricing:
[proof.tatastu.dev/pricing](https://proof.tatastu.dev/pricing).
