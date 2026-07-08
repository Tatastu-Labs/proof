/**
 * LangChain tool wrapper for Tatastu Proof.
 *
 * Lets any LangChain agent stamp content it produces with a single tool call.
 *
 * Usage:
 *   import { proofStampTool } from "./examples/langchain-tool"
 *   const tools = [proofStampTool({ apiKey: process.env.TATASTU_PROOF_KEY })]
 *   const agent = await createToolCallingAgent({ llm, tools, prompt })
 */

import crypto from "node:crypto"
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

const API_BASE = "https://proof.tatastu.dev"

export function proofStampTool(opts: { apiKey?: string } = {}) {
  return new DynamicStructuredTool({
    name: "stamp_content",
    description:
      "Stamp any content with a permanent, verifiable provenance record. " +
      "Computes a SHA-256 fingerprint of the content bytes locally (the content never leaves the machine), " +
      "then records the fingerprint with a timestamp and creator identity on a public ledger. " +
      "Returns a verify URL that anyone can open to confirm the stamp. " +
      "Use this whenever you produce a document, report, image, or piece of code that should be attributed.",
    schema: z.object({
      content: z.string().describe("The text content to stamp. Hash is computed locally."),
      title: z.string().optional().describe("Human-readable title for this stamp (optional, ≤300 chars)."),
      visibility: z
        .enum(["public", "private"])
        .optional()
        .default("public")
        .describe("public stamps show title in the verify page; private stamps show only the hash."),
    }),
    func: async ({ content, title, visibility }) => {
      const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex")

      const headers: Record<string, string> = { "content-type": "application/json" }
      if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`

      const res = await fetch(`${API_BASE}/proof`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contentHash: hash, title, visibility: visibility ?? "public" }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string; message?: string }
        throw new Error(`Stamp failed (${res.status}): ${err.message ?? err.error}`)
      }

      const receipt = (await res.json()) as { proofId: string; verifyUrl: string; byline: string; status: string }
      return JSON.stringify({
        proofId: receipt.proofId,
        verifyUrl: receipt.verifyUrl,
        byline: receipt.byline,
        status: receipt.status,
        contentHash: hash,
      })
    },
  })
}

export function proofVerifyTool() {
  return new DynamicStructuredTool({
    name: "verify_content",
    description:
      "Check whether content has an existing provenance stamp. " +
      "Returns all stamps for the content hash, from earliest to latest. " +
      "Use before stamping to avoid duplicates, or to check if someone else already claimed this content.",
    schema: z.object({
      content: z.string().describe("The text content to look up. Hash is computed locally."),
    }),
    func: async ({ content }) => {
      const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex")

      const res = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentHash: hash }),
      })

      const data = (await res.json()) as { proofs: unknown[]; contentHash: string }
      return JSON.stringify({ contentHash: hash, stamped: data.proofs.length > 0, proofs: data.proofs })
    },
  })
}
