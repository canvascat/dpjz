# 信令服务（Cloudflare Worker + Durable Object）

与 `apps/signaling`（Node.js）协议兼容，用于部署到 Cloudflare 免费额度。

## 开发

```bash
pnpm dev
# 或从仓库根: pnpm --filter signaling-cf dev
```

本地会启动 `wrangler dev`，WebSocket 地址一般为 `ws://localhost:8787`。

## 部署

1. 登录 Cloudflare：`pnpm exec wrangler login`（或设置 `CLOUDFLARE_API_TOKEN`）。
2. 部署 Worker：
   ```bash
   pnpm deploy
   # 或从仓库根: pnpm deploy:signaling
   ```
3. 部署完成后得到 `https://dpjz-signaling.<你的子域>.workers.dev`，前端 WebSocket 使用 **wss** 同路径，例如：
   - `wss://dpjz-signaling.<子域>.workers.dev/`

在 Pages 或构建前端时设置环境变量：

- `VITE_SIGNALING_URL=wss://dpjz-signaling.<子域>.workers.dev`
