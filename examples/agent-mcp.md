# MCP configuration — use Tatastu Proof from any AI agent

Add `proof.tatastu.dev/mcp` to your agent's MCP config to stamp and verify content
directly from Claude Code, Cursor, Windsurf, or any MCP-compatible client.

## Claude Code (`~/.claude/settings.json`)

```json
{
  "mcpServers": {
    "tatastu-proof": {
      "url": "https://proof.tatastu.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Omit the `headers` block to use the free tier (25 stamps/month, unlimited verify).

## Cursor / Windsurf / other clients

```json
{
  "mcpServers": {
    "tatastu-proof": {
      "command": "npx",
      "args": ["-y", "@tatastu/proof-mcp"],
      "env": {
        "TATASTU_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Available MCP tools

| Tool | Description |
|---|---|
| `create_proof` | Stamp a content hash. Returns `verifyUrl` and `byline`. |
| `verify_proof` | Check whether a hash has a stamp. Returns all matching records. |
| `list_proofs` | List your stamps, paginated. |
| `grant_access` | (coming) Grant another identity selective-disclosure access. |
| `reveal` | (coming) Reveal escrowed content to a granted identity. |
| `revoke_proof` | Revoke a stamp by ID (requires creator API key). |

## Example agent prompt

```
You are writing a report. When you finalize a section, use the create_proof tool
to stamp its SHA-256 hash and include the byline in the document footer.
```

The agent will call `create_proof`, receive a `verifyUrl`, and can embed the
byline HTML in any output it produces.
