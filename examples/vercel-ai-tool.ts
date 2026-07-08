/**
 * Vercel AI SDK tool wrapper for Tatastu Proof.
 *
 * Usage with any Vercel AI SDK model:
 *   import { proofTools } from "./examples/vercel-ai-tool"
 *   const result = await generateText({
 *     model: openai("gpt-4o"),
 *     tools: proofTools({ apiKey: process.env.TATASTU_PROOF_KEY }),
 *     prompt: "Write a short article about AI transparency and stamp it.",
 *   })
 */

import crypto from "node:crypto"
import { tool } from "ai"
import { z } from "zod"

const API_BASE = "https://proof.tatastu.dev"

export function proofTools(opts: { apiKey?: string } = {}) {
  return {
    stampContent: tool({
      description:
        "Stamp content with a permanent provenance record. " +
        "Hashes the content locally (SHA-256, bytes never leave the machine) and records the fingerprint " +
        "on a public ledger with your creator identity and a timestamp. Returns a permanent verify URL.",
      parameters: z.object({
        content: z.string().describe("The text content to stamp."),
        title: z.string().optional().describe("Optional title for the stamp (≤300 chars)."),
        visibility: z.enum(["public", "private"]).optional().default("public"),
      }),
      execute: async ({ content, title, visibility }) => {
        const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex")
        const headers: Record<string, string> = { "content-type": "application/json" }
        if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`

        const res = await fetch(`${API_BASE}/proof`, {
          method: "POST",
          headers,
          body: JSON.stringify({ contentHash: hash, title, visibility }),
        })

        if (!res.ok) {
          const err = (await res.json()) as { message?: string; error?: string }
          return { error: err.message ?? err.error ?? `HTTP ${res.status}` }
        }

        const r = (await res.json()) as { proofId: string; verifyUrl: string; byline: string; status: string }
        return { proofId: r.proofId, verifyUrl: r.verifyUrl, byline: r.byline, status: r.status, contentHash: hash }
      },
    }),

    verifyContent: tool({
      description:
        "Check if content has an existing provenance stamp. Returns all stamps for this content hash.",
      parameters: z.object({
        content: z.string().describe("The text content to look up."),
      }),
      execute: async ({ content }) => {
        const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex")
        const res = await fetch(`${API_BASE}/verify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentHash: hash }),
        })
        const data = (await res.json()) as { proofs: unknown[] }
        return { contentHash: hash, stamped: data.proofs.length > 0, proofs: data.proofs }
      },
    }),
  }
}
