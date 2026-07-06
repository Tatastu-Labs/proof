/**
 * Stamp a file from Node.js and log the verify URL.
 *
 * Usage:
 *   npx tsx examples/node-stamp.ts ./my-report.pdf
 *   npx tsx examples/node-stamp.ts ./my-report.pdf --api-key YOUR_API_KEY
 */

import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import { getBundle, hashNodeBuffer, stamp, verify } from "../src/index.js"
import { verifyOffline } from "../verify/offline.js"

const [, , filePath, ...flags] = process.argv
if (!filePath) {
  console.error("Usage: npx tsx examples/node-stamp.ts <file> [--api-key KEY]")
  process.exit(1)
}

const apiKeyIdx = flags.indexOf("--api-key")
const apiKey = apiKeyIdx !== -1 ? flags[apiKeyIdx + 1] : undefined

async function main() {
  const bytes = await readFile(filePath)
  const contentHash = await hashNodeBuffer(bytes)
  const title = basename(filePath)

  console.log(`Hashing ${title}…`)
  console.log(`SHA-256: ${contentHash}`)

  // Check if already stamped before creating a new one
  const existing = await verify(contentHash)
  if (existing.proofs.length > 0) {
    console.log(`\nAlready stamped (${existing.proofs.length} record${existing.proofs.length > 1 ? "s" : ""})`)
    for (const p of existing.proofs) {
      console.log(`  [${p.status}] ${p.verifyUrl}`)
    }
    console.log("\nUse --force to stamp again (creates a new version).")
    return
  }

  console.log("\nStamping…")
  const receipt = await stamp({
    contentHash,
    contentType: "application/octet-stream",
    title,
    apiKey,
  })

  console.log("\nStamped successfully!")
  console.log(`  ID:         ${receipt.proofId}`)
  console.log(`  Status:     ${receipt.status}`)
  console.log(`  Signed at:  ${new Date(receipt.signedAt).toISOString()}`)
  console.log(`  Verify URL: ${receipt.verifyUrl}`)
  console.log(`  Byline:     ${receipt.byline}`)

  // Demonstrate offline verification
  console.log("\nFetching bundle for offline verification…")
  const bundle = await getBundle(receipt.proofId)
  const result = await verifyOffline(bundle, contentHash)
  console.log(`  Signature verified: ${result.signatureVerified}`)
  console.log(`  Merkle verified:    ${result.merkleVerified} (true after daily batch closes)`)
  console.log(`  Valid:              ${result.valid}`)
}

main().catch((err) => {
  console.error("Error:", err.message)
  process.exit(1)
})
