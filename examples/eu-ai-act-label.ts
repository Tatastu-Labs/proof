/**
 * EU AI Act Article 50 compliance — stamp AI-generated text and attach the proof.
 *
 * Article 50(4) of the EU AI Act requires providers of general-purpose AI systems
 * to mark AI-generated content with machine-readable metadata. This deadline applies
 * from 2 August 2026.
 *
 * This example shows the minimal pattern: generate content, stamp its hash, and
 * attach the verify URL and signed proof receipt to the output payload.
 *
 * Run with no setup required (free tier, no API key needed):
 *   npx tsx examples/eu-ai-act-label.ts
 */

import { hashText, stamp } from "../src/index.js"

// --- Replace with your actual AI-generated content ---
const aiOutput = "The quarterly revenue grew 12% year over year, driven by enterprise subscriptions."

async function generateLabeledOutput(content: string) {
  const contentHash = await hashText(content)

  const receipt = await stamp({
    contentHash,
    contentType: "text/plain",
    title: "AI-generated financial summary",
    // Optional: add your creator ID for revocable stamps
    // creatorId: "did:key:z6Mk...",
  })

  // Attach the proof to your output payload
  return {
    text: content,
    _proof: {
      // Machine-readable fields for EU AI Act Art. 50(4) compliance
      contentHash,
      proofId: receipt.proofId,
      verifyUrl: receipt.verifyUrl,
      signedAt: receipt.signedAt,
      signingKeyId: receipt.signingKeyId,
      // Human-readable byline for embedding in documents or web pages
      byline: receipt.byline,
      bylineHtml: receipt.bylineHtml,
    },
  }
}

const output = await generateLabeledOutput(aiOutput)

console.log("AI content with provenance label:")
console.log(JSON.stringify(output, null, 2))
console.log("\nVerify at:", output._proof.verifyUrl)
