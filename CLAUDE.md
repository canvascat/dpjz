# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**dpjz** 是一个基于 P2P 的协作应用（聊天室、文件传输、Poker 记分）。核心理念：**无后端应用数据**，所有数据通过 WebRTC + Yjs CRDT 在对等节点间同步，持久化到本地 IndexedDB，服务器仅用于 WebSocket 信令握手。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发（前端）
pnpm dev                          # Vite 开发服务器，localhost:5173

# 开发（信令服务器，二选一）
pnpm signaling:start              # Node.js 信令，端口 4444
pnpm --filter signaling-cf dev    # Cloudflare Worker 信令，端口 8787

# 配合 CF 信令开发前端
VITE_SIGNALING_URL=ws://localhost:8787 pnpm dev

# 构建
pnpm build                        # 前端构建
pnpm --filter signaling build     # Node 信令构建 → dist/index.mjs

# 代码质量
pnpm lint      # ESLint 检查
pnpm format    # Prettier 格式化检查（不写入）
pnpm check     # Prettier 写入 + ESLint 自动修复
pnpm test      # 前端单元测试

# 部署（Cloudflare）
pnpm deploy:signaling             # 部署 CF Worker 信令
pnpm deploy:web                   # 构建前端 + wrangler pages deploy

# 添加 shadcn/ui 组件（需在 apps/web 目录执行）
pnpm dlx shadcn@latest add <name>
```

## 代码架构

### Monorepo 结构

pnpm workspace，三个子包：

- `apps/web/` — 前端（Vite + React 19 + TanStack Router + Tailwind + shadcn/ui）
- `apps/signaling/` — Node.js 信令服务器（ws + lib0）
- `apps/signaling-cf/` — Cloudflare Workers 信令服务器（Durable Objects Hibernation API）

### P2P 数据流

```
浏览器 A ←── WebRTC DataChannel ──→ 浏览器 B
    │          Yjs CRDT 同步            │
    └── y-indexeddb（本地持久化）        └── y-indexeddb

          ↑ 仅握手
    WebSocket 信令服务器（不传输应用数据）
```

- **Yjs Doc**：房间实时状态（消息、Poker 记分）的 CRDT 存储
- **y-webrtc**：Yjs 的 WebRTC transport，同时复用 Doc 传递文件传输信令（Offer/Answer/ICE）
- **Awareness**：在线状态通过 Yjs awareness 协议管理

### 状态存储分层

| 数据 | 存储 |
|------|------|
| 房间消息、Poker 记分 | Yjs Doc（内存 + y-webrtc 实时同步） |
| 本地持久化 | y-indexeddb |
| 用户昵称、头像偏好 | localStorage |

### 前端路由

TanStack Router 文件式路由，路由文件位于 `apps/web/src/routes/`，每个文件对应一个路由。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_SIGNALING_URL` | `ws://localhost:4444` | 信令服务器地址，前端构建时注入 |
| `PORT` | `4444` | Node 信令服务器端口 |

### 部署（Cloudflare 免费套餐）

- **Pages** → `apps/web/dist`（前端构建输出）
- **Worker + Durable Object** → `apps/signaling-cf`（信令）
- Pages 构建命令：`pnpm install && pnpm --filter web build`
