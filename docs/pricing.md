# Pricing

Canonical, always-current pricing lives at
**[proof.tatastu.dev/pricing](https://proof.tatastu.dev/pricing)**. This file mirrors it.

## Available today

### First stamp

- One lifetime sample stamp per durable Proof account
- Keys are free and instant: `POST /keys` (no auth, built for agents), the
  `create_account` MCP tool, or sign in at
  [proof.tatastu.dev/account](https://proof.tatastu.dev/account)
- Unlimited verification (no account required)
- Full offline verifiability once anchored

### Tatastu members: 100 stamps/month included

An active [Tatastu](https://tatastu.dev) app subscription ($20/month for the whole Mac
AI workspace) includes the Creator plan: 100 stamps/month. Sign in at
[proof.tatastu.dev/account](https://proof.tatastu.dev/account) with your Tatastu email
and create a key; it carries the Creator plan automatically.

### Verification is always free

`POST /verify`, `GET /proof/:id`, verify pages, badges, and the offline verifier are
free, unmetered, and require no account, permanently. Content verification is a
zero-friction public good: you should never need to pay or sign in to check whether
something is authentic.

### Credit bundles (prepaid, no expiry)

| Stamps | Price | Per stamp |
|-------:|------:|----------:|
| 5 | $1.00 | $0.200 |
| 10 | $1.50 | $0.150 |
| 50 | $5.00 | $0.100 |
| 100 | $8.00 | $0.080 |
| 500 | $35.00 | $0.070 |
| 1,000 | $65.00 | $0.065 |
| 2,000 | $120.00 | $0.060 |

Your monthly included allowance is always consumed first; credits only burn after it
runs out, so they never go to waste.

### Pay-per-stamp (x402)

USDC on Base via the [x402 protocol](https://x402.org):

- $0.10/stamp without an API key
- $0.05/stamp with a creator API key

This is the programmatic lane for agents and pipelines that need to stamp on demand
without pre-purchasing credits. Payment is attached to the HTTP request header, with no
separate billing step. A keyless `POST /proof` returns machine-readable 402 requirements
and points to `POST /keys` for the one lifetime sample.

## What counts as a stamp

One successful `POST /proof`. Re-stamping content you already stamped (same creator,
same hash) returns the existing receipt and never consumes a second stamp. Monthly
allowances reset on the 1st of each month (UTC).
