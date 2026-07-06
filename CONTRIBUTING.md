# Contributing

Thanks for your interest in contributing to `@tatastu/proof`.

## What's in scope

This repo is the **public SDK and verifier** that calls `proof.tatastu.dev`. Contributions
that are in scope:

- `src/` — the SDK client (`stamp`, `verify`, `getProof`, `getBundle`)
- `verify/offline.ts` — the standalone zero-dependency offline verifier
- `examples/` — new language examples (Python, Go, Rust, etc.)
- `docs/` — documentation improvements, corrections, translations
- `test-vectors/` — additional known-answer test vectors

## What's out of scope

The Worker service, D1 schema, signing keys, Merkle implementation, and anchoring
logic live in the private `JakeVartanian/tatastu` repo. PRs touching the server-side
are not accepted here.

## Development

```bash
npm install
npm run build
```

To run an example against the live service:

```bash
npx tsx examples/eu-ai-act-label.ts
```

## Testing the offline verifier

The offline verifier can be tested against any live proof:

```bash
node --input-type=module << 'EOF'
import { getBundle, hashText } from "./src/index.js"
import { verifyOffline } from "./verify/offline.js"

const hash = await hashText("Hello, world!")
// Replace with a real proof ID from your stamps:
const bundle = await getBundle("prf_01jz...")
console.log(await verifyOffline(bundle, hash))
EOF
```

## Translations

We welcome translations of the README (see `README.zh.md` as the reference). Name the
file `README.{lang-code}.md` and open a PR. The content should match the English README
(not a creative adaptation) — accuracy over style.

## Code of conduct

Be direct and honest. Respect that this is an early product with real constraints.
Open an issue before starting a large PR.
