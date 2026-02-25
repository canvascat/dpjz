# dpjz

[中文](./README.zh-CN.md)

A P2P collaboration app built with **Yjs + WebRTC**: real-time chat, scorekeeping (poker-style), clipboard sharing, and file transfer—all without a backend for application data. Supports PWA and can be deployed on Cloudflare’s free tier.

## Features

- **Chat rooms** – Create or join rooms by ID/link. Messages sync via Yjs over WebRTC; presence (peers) via awareness.
- **Member bar & actions** – In chat, a member list (like the poker room). Tap a peer to:
  - **Read clipboard** – Request the peer’s clipboard; they approve and the text is sent to you (shown in a sheet with copy / paste-into-input).
  - **Send file** – P2P file transfer (up to 100MB). Offer/answer/ICE signaling over the same Yjs doc; file bytes over a dedicated WebRTC DataChannel.
- **Poker (scorekeeping) rooms** – Members, balances, transfers, “tea” fee and cap, transaction list. All state in a shared Yjs doc.
- **Profile** – Local nickname and avatar (text or Notion-style dice); stored in `localStorage`.
- **PWA** – Installable; mobile-first, touch-friendly UI (Tailwind + shadcn/ui).

Data is peer-to-peer (WebRTC) and persisted locally (IndexedDB). Only **signaling** (WebSocket) uses a server so peers can discover each other.

## Project structure (pnpm workspace)

```
├── apps/
│   ├── web/            # Frontend (Vite + React + PWA)
│   ├── signaling/      # Signaling server (Node.js + ws, local/self-hosted)
│   └── signaling-cf/   # Signaling (Cloudflare Worker + Durable Object)
├── pnpm-workspace.yaml
└── package.json
```

## Requirements

- **Node.js** 18+
- **pnpm** (recommended; version in `.node-version`)

## Install

From the repo root:

```bash
pnpm install
```

## Local development

Run both the frontend and a signaling server (frontend connects via WebSocket).

**Option A: Two terminals**

```bash
# Terminal 1: frontend
pnpm dev

# Terminal 2: Node signaling (default port 4444)
pnpm signaling:start
```

**Option B: Cloudflare Worker signaling locally**

```bash
# Terminal 1: frontend (set signaling URL if not using default)
VITE_SIGNALING_URL=ws://localhost:8787 pnpm dev

# Terminal 2: signaling-cf dev
pnpm --filter signaling-cf dev
```

Open the dev URL (e.g. `http://localhost:5173`).

## Build

```bash
# Frontend only
pnpm build

# Node signaling only (output: dist/index.mjs)
pnpm --filter signaling build
```

## Test and lint

```bash
pnpm test      # Frontend unit tests
pnpm lint      # ESLint
pnpm format    # Prettier check
pnpm check     # Prettier write + ESLint fix
```

## Deploy (Cloudflare)

### 1. Signaling (Worker + Durable Object)

After deploying signaling, set the frontend’s `VITE_SIGNALING_URL` to the **wss** URL of that Worker.

1. Log in: `cd apps/signaling-cf && pnpm exec wrangler login` (or set `CLOUDFLARE_API_TOKEN`).
2. Deploy:
   ```bash
   pnpm deploy:signaling
   ```
3. Note the Worker URL (e.g. `https://dpjz-signaling.<subdomain>.workers.dev`). Use **wss** for the frontend, e.g. `wss://dpjz-signaling.<subdomain>.workers.dev`.

### 2. Frontend (Pages)

**Option A: Git integration**

1. Cloudflare Dashboard → Pages → Create project → Connect Git.
2. Root: repo root. Build: `pnpm install && pnpm --filter web build`. Output: `apps/web/dist`.
3. Add env var: `VITE_SIGNALING_URL` = `wss://dpjz-signaling.<subdomain>.workers.dev`.

**Option B: Manual upload**

1. Deploy signaling and get its wss URL.
2. Build and deploy:
   ```bash
   VITE_SIGNALING_URL=wss://dpjz-signaling.<subdomain>.workers.dev pnpm build
   pnpm deploy:web
   ```
   `deploy:web` runs the web build and `wrangler pages deploy` (default project name: `dpjz`, configurable in root `package.json`).

## Environment variables

| Variable | Purpose | Where |
|----------|---------|--------|
| `VITE_SIGNALING_URL` | Signaling WebSocket (ws/wss) | Injected at frontend build time; default `ws://localhost:4444` |
| `PORT` | Node signaling server port | `apps/signaling`, default 4444 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Deploy without interactive login |

## Tech stack

- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui, Yjs (y-webrtc, y-indexeddb)
- **Signaling (Node)**: Node.js, ws, lib0
- **Signaling (Cloudflare)**: Workers, Durable Objects (Hibernation API)
- **PWA**: vite-plugin-pwa (Workbox)

### Frontend notes

- Routes: TanStack Router file-based under `apps/web/src/routes`.
- Styling: Tailwind; UI patterns follow shadcn/ui. Add components with `pnpm dlx shadcn@latest add <name>` inside `apps/web`.
- Layout: Mobile-first, touch-friendly, PWA-oriented.

