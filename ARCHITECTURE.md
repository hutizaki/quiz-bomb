# QuizBomb — Architecture

High-level architecture so we can **focus on the frontend**. Backend and dev tunnel are treated as fixed; we own the client.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Friends / Players                                               │
│  (browser → https://xxxx.trycloudflare.com)                      │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Quick Tunnel (cloudflared)                           │
│  Exposes local client to the internet                            │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (our focus)                                            │
│  Vite dev server (e.g. :5174)                                    │
│  - Serves the game UI                                            │
│  - Proxies /colyseus → Colyseus server                           │
└────────────────────────────┬────────────────────────────────────┘
                              │ /colyseus (HTTP + WebSocket)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (given)                                                 │
│  Colyseus server (e.g. :2567)                                    │
│  - Rooms, game state, matchmaking                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## What we own vs what we don’t

| Layer            | Owner   | Purpose                          |
|------------------|--------|-----------------------------------|
| **Frontend**     | **Us** | Game UI, client logic, Colyseus client |
| Backend          | Given  | Colyseus server (Node.js)        |
| Tunnel           | Given  | cloudflared Quick Tunnel         |

**Focus:** Build and iterate on the **frontend**; assume backend and tunnel are running as described below.

---

## Frontend (our focus)

- **Stack:** Vite + (e.g. React / Vue / vanilla TS).
- **Port:** e.g. `5174` (Vite dev server).
- **Responsibilities:**
  - Game UI and UX.
  - Colyseus client: connect to `/colyseus` (same origin), join/leave rooms, send/receive messages.
  - No direct backend URL in client code — always use relative `/colyseus` so the Vite proxy works.

**Proxy (required):** In `vite.config` we proxy `/colyseus` to the Colyseus server so that:
- The client talks to the same origin (no CORS).
- One cloudflared tunnel can expose both the site and the Colyseus WebSocket.

Example proxy:

```ts
// vite.config.ts
server: {
  proxy: {
    '/colyseus': {
      target: 'http://localhost:2567',
      changeOrigin: true,
      ws: true,
    },
  },
}
```

---

## Backend (given)

- **Stack:** Colyseus on Node.js.
- **Port:** e.g. `2567`.
- **Role:** Game rooms, state sync, matchmaking. We don’t change this for frontend work; we only depend on its **room API and message schema** (document those in a separate doc or in this file if needed).

---

## Tunnel (given)

- **Tool:** `cloudflared` Quick Tunnel.
- **Command:** `cloudflared tunnel --url http://localhost:5174` (client port).
- **Result:** A public `https://xxxx.trycloudflare.com` URL that serves the frontend; Colyseus is reached via the same origin thanks to the proxy.

---

## Running the stack (for reference)

1. Start Colyseus server (e.g. `npm run start` in server repo).
2. Start frontend (e.g. `npm run dev` in client repo).
3. Start tunnel: `cloudflared tunnel --url http://localhost:5174`.
4. Share the printed `https://….trycloudflare.com` link.

---

## Summary

- **One public URL** → frontend (Vite) → proxy `/colyseus` → Colyseus server.
- **We focus on:** frontend app and Colyseus client integration.
- **We assume:** backend and cloudflared are running as above; no need to touch them for normal frontend work.
