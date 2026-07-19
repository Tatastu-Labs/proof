# Security Policy

## Scope

This repo is the public SDK, offline verifier, and examples for Tatastu Proof. It
contains no signing keys, no server code, and no user data. The live service
(`proof.tatastu.dev`, the Worker, and the D1 database) lives in a private repo; report
issues with the live service the same way as issues in this SDK, see below.

## Reporting a vulnerability

Email **support@tatastu.dev** (subject line starting `[security]`) with:

- A description of the issue and its impact.
- Steps to reproduce (a minimal repro is ideal).
- The affected version (`npm ls @tatastu/proof`) or, for the live service, the
  request/response that demonstrates it.

Please do not open a public GitHub issue for a security report; the vulnerability class
that matters most here is anything that could let a proof be forged, a signature
misverified, or an offline-verification bundle accepted when it shouldn't be, and those
deserve a private report first.

We aim to acknowledge reports within 3 business days. Once a fix ships, we credit
reporters in the release notes unless they ask to stay anonymous.

## Supported versions

Only the latest published version of `@tatastu/proof` receives security fixes. The SDK
is young (pre-1.0); we do not yet maintain parallel security branches for older majors.
