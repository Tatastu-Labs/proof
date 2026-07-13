# Pricing

Canonical, always-current pricing lives at
**[proof.tatastu.dev/pricing](https://proof.tatastu.dev/pricing)**. This file mirrors it.

## Available today

### Free tier

- 25 stamps/month with an API key
- Keys are free and instant: `POST /keys` (no auth, built for agents), the
  `create_account` MCP tool, or sign in at
  [proof.tatastu.dev/account](https://proof.tatastu.dev/account)
- Unlimited verification (no account required)
- Full offline verifiability once anchored

### Tatastu members: 500 stamps/month included

An active [Tatastu](https://tatastu.dev) app subscription ($20/month for the whole Mac
AI workspace) includes the Creator plan: 500 stamps/month. Sign in at
[proof.tatastu.dev/account](https://proof.tatastu.dev/account) with your Tatastu email
and create a key; it carries the Creator plan automatically.

### Verification is always free

`POST /verify`, `GET /proof/:id`, verify pages, badges, and the offline verifier are
free, unmetered, and require no account, permanently. Content verification is a
zero-friction public good: you should never need to pay or sign in to check whether
something is authentic.

## Launching soon (not yet purchasable)

These lanes are built and priced; they are being switched on carefully. Until then
nothing below can be bought, and the API will never dead-end you into a paywall that
doesn't exist. Need volume before they launch? Write to
[support@tatastu.dev](mailto:support@tatastu.dev).

### Credit bundles (prepaid, no expiry)

| Bundle | Credits | Price |
|--------|---------|-------|
| Starter | 100 stamps | $8 |
| Creator | 500 stamps | $35 |
| Studio | 2,000 stamps | $120 |

Your monthly included allowance is always consumed first; credits only burn after it
runs out, so they never go to waste.

### Subscriptions

| Plan | Price | Monthly stamps |
|------|-------|----------------|
| Creator | $12/month | 500 |
| Pro | $49/month | 2,000 |
| Team | $149/month | 10,000 |

Creator is already included free with a Tatastu app subscription.

### Pay-per-stamp (x402)

USDC on Base via the [x402 protocol](https://x402.org):

- $0.10/stamp without an API key
- $0.05/stamp with a creator API key

This is the programmatic lane for agents and pipelines that need to stamp on demand
without pre-purchasing credits. Payment is attached to the HTTP request header, with no
separate billing step. Until it is live, a keyless `POST /proof` returns
`503 payment_unavailable` with the exact next step (a free key via `POST /keys`).

## What counts as a stamp

One successful `POST /proof`. Re-stamping content you already stamped (same creator,
same hash) returns the existing receipt and never consumes a second stamp. Monthly
allowances reset on the 1st of each month (UTC).
