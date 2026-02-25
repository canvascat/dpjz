# dpjz

基于 **Yjs + WebRTC** 的 P2P 协作应用：实时聊天、记账房（扑克式记分）、剪切板读取与 P2P 文件传输，应用数据无需自建后端。支持 PWA，可部署到 Cloudflare 免费额度。

## 功能概览

- **聊天室** – 创建或通过房间号/链接加入。消息经 Yjs 在 WebRTC 上同步；在线成员通过 awareness 展示。
- **成员栏与操作** – 聊天室顶部有成员列表（风格类似记账房）。点击某成员可：
  - **读取剪切板** – 向对方发起请求，对方同意后将其剪切板内容发给你（弹层中可复制或填入输入框）。
  - **发送文件** – 一对一 P2P 传文件（单文件最大 100MB）。信令（offer/answer/ICE）走同一 Yjs 文档；文件内容经独立 WebRTC DataChannel 直连。
- **记账房** – 成员、余额、转分、茶位费与上限、流水记录，状态全部在共享 Yjs 文档中。
- **个人资料** – 本地昵称与头像（文字或 Notion 骰子风格），存于 `localStorage`。
- **PWA** – 可安装；移动端优先、触控友好，UI 使用 Tailwind + shadcn/ui。

数据在端与端之间经 WebRTC 直连，本地用 IndexedDB 持久化。仅 **信令**（WebSocket）需要服务器，用于发现与连接对等端。

## 项目结构（pnpm workspace）

```
├── apps/
│   ├── web/            # 前端（Vite + React + PWA）
│   ├── signaling/      # 信令服务（Node.js + ws，本地/自托管）
│   └── signaling-cf/   # 信令（Cloudflare Worker + Durable Object）
├── pnpm-workspace.yaml
└── package.json
```

## 环境要求

- **Node.js** 18+
- **pnpm**（建议与仓库内 `.node-version` 一致）

## 安装

在仓库根目录执行：

```bash
pnpm install
```

## 本地开发

需同时运行前端与信令服务（前端通过 WebSocket 连接信令）。

**方式一：两个终端**

```bash
# 终端 1：前端
pnpm dev

# 终端 2：Node 信令（默认端口 4444）
pnpm signaling:start
```

**方式二：信令用 Cloudflare 本地 Worker**

```bash
# 终端 1：前端（需指定信令地址时）
VITE_SIGNALING_URL=ws://localhost:8787 pnpm dev

# 终端 2：信令 Worker 本地调试
pnpm --filter signaling-cf dev
```

浏览器访问前端开发地址（通常 `http://localhost:5173`）。

## 构建

```bash
# 仅构建前端
pnpm build

# 仅构建 Node 信令（产出 dist/index.mjs）
pnpm --filter signaling build
```

## 测试与代码质量

```bash
pnpm test      # 前端单元测试
pnpm lint      # ESLint
pnpm format    # Prettier 检查
pnpm check     # Prettier 写回 + ESLint 修复
```

## 部署到 Cloudflare（免费）

### 1. 信令服务（Worker + Durable Object）

信令部署后，前端需使用其 **wss** 地址作为 `VITE_SIGNALING_URL`。

1. 登录 Cloudflare：
   ```bash
   cd apps/signaling-cf && pnpm exec wrangler login
   ```
   或设置环境变量 `CLOUDFLARE_API_TOKEN`。

2. 部署：
   ```bash
   pnpm deploy:signaling
   ```

3. 记下 Worker 地址，例如：`https://dpjz-signaling.<你的子域>.workers.dev`。  
   前端生产环境信令 URL 为 **wss** 同主机，如：`wss://dpjz-signaling.<子域>.workers.dev`。

### 2. 前端（Pages）

**方式 A：Git 关联（推荐）**

1. Cloudflare Dashboard → Pages → 创建项目 → 连接 Git。
2. 根目录：仓库根；构建命令：`pnpm install && pnpm --filter web build`；输出目录：`apps/web/dist`。
3. 在 Pages 的 **构建配置** 中新增环境变量：  
   `VITE_SIGNALING_URL` = `wss://dpjz-signaling.<你的子域>.workers.dev`（协议改为 wss）。

**方式 B：本地上传**

1. 先部署信令，得到 wss 地址。
2. 本地设置该地址并构建、上传：
   ```bash
   VITE_SIGNALING_URL=wss://dpjz-signaling.<子域>.workers.dev pnpm build
   pnpm deploy:web
   ```
   `deploy:web` 会执行构建并调用 `wrangler pages deploy`；需已存在同名 Pages 项目（默认 `--project-name=dpjz`，可在根目录 `package.json` 中修改）。

## 环境变量

| 变量 | 作用 | 使用位置 |
|------|------|----------|
| `VITE_SIGNALING_URL` | 信令 WebSocket 地址（ws/wss） | 前端构建时注入，未设置时默认 `ws://localhost:4444` |
| `PORT` | Node 信令服务端口 | `apps/signaling`，默认 4444 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌 | 非交互环境部署 Worker/Pages 时使用 |

## 技术栈

- **前端**：React 19、Vite、TanStack Router、TanStack Query、Tailwind CSS、shadcn/ui、Yjs（y-webrtc、y-indexeddb）
- **信令（Node）**：Node.js、ws、lib0
- **信令（Cloudflare）**：Workers、Durable Objects（Hibernation API）
- **PWA**：vite-plugin-pwa（Workbox）

### 前端相关

- 路由：TanStack Router，文件位于 `apps/web/src/routes`。
- 样式：Tailwind，组件风格见 shadcn/ui；新增组件可用 `pnpm dlx shadcn@latest add <组件名>`（在 `apps/web` 下执行）。
- 设计：移动端优先、触控友好，目标为 PWA。

## 其他说明

- 更多 TanStack 用法见 [TanStack 文档](https://tanstack.com)。
