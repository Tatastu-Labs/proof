# Pricing

## Free tier

- 25 stamps/month
- Unlimited verification (no account required)
- Full offline verifiability once anchored
- No API key required

## Credit bundles (prepaid, no expiry)

| Bundle | Credits | Price |
|--------|---------|-------|
| Starter | 100 stamps | $8 |
| Creator | 500 stamps | $35 |
| Studio | 2,000 stamps | $120 |

Purchase at [tatastu.dev/proof](https://tatastu.dev/proof). Credits are non-refundable
once consumed. They do not expire.

## Subscriptions

| Plan | Price | Monthly stamps |
|------|-------|----------------|
| Creator | $12/month | 500 |
| Pro | $49/month | 2,000 |
| Team | $149/month | 10,000 |

## Pay-per-stamp (x402)

USDC on Base via the [x402 protocol](https://x402.org):

- $0.10/stamp without an API key
- $0.05/stamp with a creator API key

This is the programmatic lane for agents and pipelines that need to stamp on demand
without pre-purchasing credits. Payment is attached to the HTTP request header —
no separate billing step.

## Verification is always free

`POST /verify` and `GET /proof/:id` are free, unmetered, and require no account.
The goal is to make content verification a zero-friction public good — you should
never need to pay or sign in to check whether something is authentic.
