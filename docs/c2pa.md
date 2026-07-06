# C2PA and Tatastu Proof

## What C2PA does

[C2PA (Coalition for Content Provenance and Authenticity)](https://c2pa.org) is an
industry standard (currently at version 2.4) for embedding signed provenance metadata
directly into media file formats — JPEG, PNG, PDF, MP4, and others. A C2PA manifest
is written into the file's binary structure using a JUMBF (JPEG Universal Metadata
Box Format) container.

The standard is backed by Adobe, Microsoft, Sony, the BBC, and others. Adobe
Content Credentials and the `verify.contentcredentials.org` verifier are built on C2PA.

## What Tatastu Proof does differently

| | C2PA | Tatastu Proof |
|---|---|---|
| Where metadata lives | Embedded in the file binary | External stamp registry (hash-only) |
| Works on any content type | Only standardized formats | Any bytes (text, code, data, binary) |
| Verification without the file | No — needs the embedded manifest | Yes — hash is all you need |
| Setup complexity | WASM SDK, file parsing, key management | One API call |
| Tamper-evident file | Yes (breaks if file is re-saved) | No (file is not modified) |
| Permanent public anchor | Optional (trust provider-dependent) | Always (Arweave + Base) |
| Revocation | Not standardized | Built-in |

## When to use C2PA

Use C2PA when:
- Your content is an image, video, or PDF that will be distributed as a file
- You want provenance embedded in the file itself (survives copy-paste, re-upload)
- Your toolchain already includes Adobe tools or the C2PA SDK

## When to use Tatastu Proof

Use Tatastu Proof when:
- Your content is text, JSON, code, structured data, or any non-media format
- You want a simple API call with no binary SDK or file modification
- You need to stamp content that won't be distributed as a file (API responses,
  database records, AI-generated text)
- You want permanent anchoring without managing trust provider relationships
- You're working in an agent/MCP pipeline

## Using both

The two approaches are complementary. A common pattern for media content:

1. Stamp the SHA-256 with Tatastu Proof to get an immediate signed receipt
2. Use the C2PA SDK to embed a manifest in the file that includes the Tatastu
   verify URL as a `c2pa.actions` entry

This gives you an embedded manifest (C2PA) plus an independently verifiable
external stamp that persists even if the manifest is stripped.

Tatastu Proof plans to emit C2PA manifests for media content types directly
(tracked as task 1.10 in the roadmap).
