# Tatastu Proof

[![npm version](https://img.shields.io/npm/v/@tatastu/proof.svg)](https://www.npmjs.com/package/@tatastu/proof)
[![CI](https://github.com/Tatastu-Labs/proof/actions/workflows/ci.yml/badge.svg)](https://github.com/Tatastu-Labs/proof/actions/workflows/ci.yml)
[![service status](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fproof.tatastu.dev%2Fhealth&query=%24.ok&label=service&color=success&logo=cloudflare)](https://proof.tatastu.dev/health)
[![license](https://img.shields.io/npm/l/@tatastu/proof.svg)](LICENSE)

**应对欧盟《人工智能法案》第 50 条的实用方案。** 第 50(4) 条要求通用人工智能系统的提供者为 AI
生成的内容打上机器可读的溯源标记，截止日期为 **2026 年 8 月 2 日**。Tatastu Proof 只需一次 API
调用：在本地对内容进行哈希，即可获得一条永久、可公开验证的记录，证明是谁签署了它、以及签署时间。
支持任何语言、任何智能体、任何流水线。（这不构成法律意见；某次盖章是否满足你具体的第 50 条义务，
取决于你的使用场景和法律顾问的判断，参见 [docs/eu-ai-act.md](docs/eu-ai-act.md)。）

```ts
import { stamp, hashText } from "@tatastu/proof"

const hash = await hashText("你好，世界！")
const receipt = await stamp({ contentHash: hash, title: "我的文章" })
console.log(receipt.verifyUrl)
// → https://proof.tatastu.dev/p/prf_01jz...
```

在线服务：[proof.tatastu.dev](https://proof.tatastu.dev)，验证永久免费。在浏览器中打开返回的
`verifyUrl`，即可看到公开记录：签署者、时间戳，以及锚定完成后的 Arweave/Base 锚定信息。

---

## 功能说明

**盖章（stamp）** 接收任意内容（文本、文件、JSON、代码、二进制）的 SHA-256 哈希，并记录：

- 签署者（你提供的创作者身份，或匿名）
- 签署时间（毫秒精度，由每日 Merkle 锚定限制）
- Tatastu Proof 服务密钥透明日志中的 Ed25519 签名

24 小时内，印记被批量处理为 RFC 6962 Merkle 树，根节点锚定到 **Arweave**（永久存储）和 **Base**（EVM 链上 calldata）。锚定后，可通过本仓库中的离线验证器，在零网络请求的情况下完成验证。

---

## 安装

```bash
npm install @tatastu/proof
```

---

## 快速开始

### 为文本盖章

```ts
import { stamp, hashText } from "@tatastu/proof"

const hash = await hashText("报告内容写在这里。")
const receipt = await stamp({ contentHash: hash, title: "Q3 报告" })
console.log(receipt.verifyUrl)   // https://proof.tatastu.dev/p/prf_...
console.log(receipt.byline)      // "Verified · https://proof.tatastu.dev/p/prf_..."
```

### 验证内容

```ts
import { verify, hashText } from "@tatastu/proof"

const { proofs } = await verify(await hashText("报告内容写在这里。"))
if (proofs.length > 0) {
  console.log("真实有效：", proofs[0].verifyUrl)
  console.log("状态：", proofs[0].status)   // SIGNED | ANCHORED | CONFIRMED
}
```

### EU AI 法案合规（第 50 条）

EU AI 法案第 50(4) 条要求对 AI 生成内容附加机器可读的溯源元数据，截止日期为 **2026 年 8 月 2 日**。

```ts
import { stamp, hashText } from "@tatastu/proof"

const aiOutput = "AI 生成的文本内容。"
const receipt = await stamp({ contentHash: await hashText(aiOutput) })

const labeledOutput = {
  text: aiOutput,
  _proof: {
    contentHash: receipt.contentHash,
    proofId: receipt.proofId,
    verifyUrl: receipt.verifyUrl,
    signedAt: receipt.signedAt,
    bylineHtml: receipt.bylineHtml,
  },
}
```

详见 [docs/eu-ai-act.md](docs/eu-ai-act.md)（英文）。

---

## MCP（AI 智能体）

在 Claude Code、Cursor 或 Windsurf 的配置中添加 `proof.tatastu.dev/mcp`：

```json
{
  "mcpServers": {
    "tatastu-proof": {
      "url": "https://proof.tatastu.dev/mcp"
    }
  }
}
```

详见 [examples/agent-mcp.md](examples/agent-mcp.md)。

---

## 离线验证

印记达到 `ANCHORED` 状态后，可在无网络的情况下完成验证：

```ts
import { getBundle, hashNodeBuffer } from "@tatastu/proof"
import { verifyOffline } from "@tatastu/proof/verify/offline"
import { readFile } from "node:fs/promises"

const bytes = await readFile("./report.pdf")
const bundle = await getBundle("prf_01jz...")
const result = await verifyOffline(bundle, await hashNodeBuffer(bytes))
console.log(result.valid, result.signatureVerified, result.merkleVerified)
```

`verify/offline.ts` 是一个约 200 行的单文件，零依赖，仅使用 Web Crypto API（SubtleCrypto），适用于 Node 18+、Deno 和现代浏览器。

---

## 价格

| 套餐 | 价格 | 印记数 | 状态 |
|------|------|--------|------|
| 免费 | $0 | 5/月 | 已上线 |
| Tatastu 会员 | $20/月（含整个 [Tatastu 应用](https://tatastu.dev)） | 每月含 100 次 | 已上线 |
| 入门包 | $8 | 100 次（永不过期） | 即将上线 |
| 创作者包 | $35 | 500 次（永不过期） | 即将上线 |
| 创作者订阅 | $12/月 | 100/月 | 即将上线 |
| 按次付费（x402） | $0.10 或 $0.05（API key） | n/a | 即将上线 |

**验证永久免费，无需注册账号。**

“即将上线”的套餐已定价但暂不可购买。完整价格：[proof.tatastu.dev/pricing](https://proof.tatastu.dev/pricing)。

---

## 贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。服务端、Worker 和 D1 数据库模式位于私有仓库——本仓库仅包含公开 SDK、离线验证器和示例代码。
