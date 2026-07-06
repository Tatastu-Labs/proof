/**
 * SHA-256 helpers that work in Node 18+, Deno, and browsers.
 * Content is hashed locally — bytes never leave your machine.
 */

/** Hash a string and return the hex digest. */
export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  return hashBytes(bytes)
}

/** Hash arbitrary bytes and return the hex digest. */
export async function hashBytes(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const buf = bytes instanceof Uint8Array ? bytes.buffer : bytes
  const digest = await crypto.subtle.digest("SHA-256", buf)
  return bufToHex(digest)
}

/**
 * Hash a `File` or `Blob` (browser) in streaming chunks.
 * Falls back to a single-shot read for environments without `stream()`.
 */
export async function hashBlob(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === "function") {
    const ab = await blob.arrayBuffer()
    return hashBytes(ab)
  }
  // ReadableStream path (modern browsers)
  const stream = (blob as Blob & { stream(): ReadableStream<Uint8Array> }).stream()
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.length
  }
  return hashBytes(merged)
}

/**
 * Hash a Node.js `Buffer` or `Uint8Array` from a file read.
 * In Node you'll typically do:
 *   import { readFile } from "node:fs/promises"
 *   const hash = await hashNodeBuffer(await readFile("myfile.pdf"))
 */
export async function hashNodeBuffer(buf: Uint8Array | Buffer): Promise<string> {
  return hashBytes(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
