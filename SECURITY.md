# Security

## Scope

This repo is the public SDK, offline verifier, and examples for Tatastu Proof. It
contains no secrets, signing keys, or server-side code (that lives in a private
repo; see [CONTRIBUTING.md](CONTRIBUTING.md)). Most security issues that matter
belong to one of two categories:

- A bug in this SDK or the offline verifier (`src/verify/offline.ts`) that could
  make a tampered or forged stamp appear valid.
- A vulnerability in the live service at `proof.tatastu.dev` (auth, rate limiting,
  the Worker, or the anchoring pipeline).

## Reporting a vulnerability

Email **support@tatastu.dev** with:

- What you found and why it matters (especially for verifier bugs: an example
  input that verifies when it shouldn't, or vice versa).
- Steps to reproduce.
- Whether it affects this SDK, the offline verifier, or the live API.

Please do not open a public issue for a vulnerability report. We'll acknowledge
within a few business days and keep you posted as we investigate and fix.

## Supported versions

Only the latest published version of `@tatastu/proof` is supported. There is no
long-term-support branch at this stage.
