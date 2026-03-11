# QuizBomb — Backlog

Full-stack backlog: **React**, **TypeScript**, **Framer Motion** (frontend); **Colyseus + Node.js** (backend); **Database** for persistence.

**Legend:** `[F]` Frontend · `[B]` Backend · `[D]` Database · `[O]` DevOps · ✅ Done · — Deferred/optional

---

## Epic 1 — Project & repo setup

| ID | Area | Task | Done |
|----|------|------|------|
| 1.1 | [O] | Create monorepo or two repos (client / server); root README with stack and run instructions | ✅ |
| 1.2 | [F] | Scaffold Vite + React + TypeScript app; strict TS, path aliases | ✅ |
| 1.3 | [F] | Add Framer Motion; create a minimal animated component to verify setup | ✅ |
| 1.4 | [F] | Configure Vite proxy: `/colyseus` → `http://localhost:2567`, `ws: true` | ✅ |
| 1.5 | [B] | Scaffold Colyseus server (Node.js + TypeScript); single empty room that accepts connections | ✅ |
| 1.6 | [B] | Add Colyseus client dependency to frontend; connect to `/colyseus` and log room join | ✅ |
| 1.7 | [D] | Choose DB (e.g. PostgreSQL or SQLite); add to backend with a single table or migration | ✅ |
| 1.8 | [O] | Document env vars (`.env.example`) for client and server; add `.env` to `.gitignore` | ✅ |
| 1.9 | [O] | Add npm scripts: `dev` (client), `start` / `dev` (server), optional `tunnel` for cloudflared | ✅ |

---

## Epic 2 — Database schema & persistence

| ID | Area | Task | Done |
|----|------|------|------|
| 2.1 | [D] | Design and add `players` table: id, display_name, created_at, optional auth_id | ✅ |
| 2.2 | [D] | Design and add `games` table: id, room_id, started_at, ended_at, winner_id, config (JSON) | ✅ |
| 2.3 | [D] | Design and add `game_players` or `scores`: game_id, player_id, score, rank, words_played | ✅ |
| 2.4 | [D] | Add `wordlist` or `prompts` table if we store prompts/categories in DB | ✅ (file-based) |
| 2.5 | [B] | Add DB client (e.g. pg, better-sqlite3, Prisma, Drizzle) and run migrations on server start | ✅ |
| 2.6 | [B] | Persist game result when a room ends: insert into `games` + `game_players` | ✅ |
| 2.7 | [B] | API or Colyseus message: fetch recent games / leaderboard from DB | ✅ |
| 2.8 | [D] | Add indexes for leaderboard queries (e.g. by score, by date) | ✅ |

---

## Epic 3 — Backend: Colyseus rooms & game logic

| ID | Area | Task | Done |
|----|------|------|------|
| 3.1 | [B] | Define Colyseus room state schema (players, current prompt, timer, phase, scores) | ✅ |
| 3.2 | [B] | Implement room lifecycle: create, join, leave; broadcast player list | ✅ |
| 3.3 | [B] | Game phases: LOBBY → COUNTDOWN → PLAYING → ROUND_END → GAME_END | ✅ |
| 3.4 | [B] | Pick a word list / prompt source (file or DB); serve random prompt per round | ✅ |
| 3.5 | [B] | Validate submitted word against prompt (e.g. “contains letters”, language list); award points | ✅ |
| 3.6 | [B] | Timer per round: countdown, end round when time expires or all respond | ✅ |
| 3.7 | [B] | Lives system: deduct life on wrong word or timeout; remove player when lives = 0 | ✅ |
| 3.8 | [B] | Win condition: last player standing or max rounds; set winner in state | ✅ |
| 3.9 | [B] | Message types: SUBMIT_WORD, START_GAME, PLAYER_READY; document in ARCHITECTURE or API.md | ✅ |
| 3.10 | [B] | On game end, write result to DB (Epic 2); optionally trigger from room `onDispose` | ✅ |

---

## Epic 4 — Frontend: app shell & routing

| ID | Area | Task | Done |
|----|------|------|------|
| 4.1 | [F] | Add React Router: `/` (home), `/play` (game), `/leaderboard`, `/history` (optional) | ✅ |
| 4.2 | [F] | Global layout: header, main content area, footer; responsive container | ✅ |
| 4.3 | [F] | Home page: title, “Create game” / “Join game” actions, link to leaderboard | ✅ |
| 4.4 | [F] | Create-game flow: input nickname, create room via Colyseus, navigate to `/play?room=...` | ✅ |
| 4.5 | [F] | Join-game flow: input nickname + room ID (or code), join room, navigate to `/play` | ✅ |
| 4.6 | [F] | 404 and error boundary with Framer Motion exit/enter | ✅ |
| 4.7 | [F] | Dark/light theme (CSS variables); persist preference in localStorage | ✅ |

---

## Epic 5 — Frontend: lobby & waiting room

| ID | Area | Task | Done |
|----|------|------|------|
| 5.1 | [F] | Lobby view: show room ID/code and list of connected players from room state | ✅ |
| 5.2 | [F] | “Start game” button (host only); disabled until min players; Framer Motion on list changes | ✅ |
| 5.3 | [F] | Copy room link to clipboard; toast or feedback animation | ✅ |
| 5.4 | [F] | Animate players joining/leaving (list reorder, stagger with Framer Motion) | ✅ |
| 5.5 | [F] | Countdown overlay (3–2–1) when host starts; full-screen or modal with motion | ✅ |
| 5.6 | [F] | Handle “kicked” or room closed; redirect to home with message | ✅ |

---

## Epic 6 — Frontend: gameplay UI

| ID | Area | Task | Done |
|----|------|------|------|
| 6.1 | [F] | Playing view: show current prompt, timer bar, input for word submission | ✅ |
| 6.2 | [F] | Timer bar that shrinks or fills; Framer Motion + remaining seconds from state | ✅ |
| 6.3 | [F] | On submit: send word to Colyseus; show loading/disabled state until result | ✅ |
| 6.4 | [F] | Feedback: correct (green/success animation), wrong (red/shake), duplicate (neutral) | ✅ |
| 6.5 | [F] | Show own lives and score; optional sidebar with all players’ scores/lives | ✅ |
| 6.6 | [F] | Round-end state: show who got it, points earned; short delay then next round | ✅ |
| 6.7 | [F] | Game-end screen: winner, final scores, “Play again” / “Back to home” | ✅ |
| 6.8 | [F] | Framer Motion: page transitions, card flips, bomb/explosion-style cues for timer | ✅ |
| 6.9 | [F] | Keyboard: focus input, Enter to submit; accessibility (labels, focus order) | ✅ |

---

## Epic 7 — Frontend: polish & motion

| ID | Area | Task | Done |
|----|------|------|------|
| 7.1 | [F] | Page transitions (AnimatePresence + route change); consistent duration/easing | ✅ |
| 7.2 | [F] | Staggered list animations for leaderboard and player lists | ✅ |
| 7.3 | [F] | Micro-interactions: button hover/click, input focus ring (Framer Motion or CSS) | ✅ |
| 7.4 | [F] | Loading states: skeleton screens or spinners with motion | ✅ |
| 7.5 | [F] | Sound design (optional): correct/error/clock tick; mute toggle in UI | — |
| 7.6 | [F] | Confetti or celebration motion on win | — |
| 7.7 | [F] | Reduce motion preference: respect `prefers-reduced-motion` in Framer Motion | ✅ |

---

## Epic 8 — Leaderboard & history

| ID | Area | Task | Done |
|----|------|------|------|
| 8.1 | [B] | Endpoint or Colyseus lobby message: get leaderboard (top N by score or wins) | ✅ |
| 8.2 | [F] | Leaderboard page: table or list with rank, name, score; loading and empty states | ✅ |
| 8.3 | [F] | Optional: filter by time range (today, week, all time) if backend supports | — |
| 8.4 | [F] | Game history: list of recent games (from DB); click to see summary | ✅ |
| 8.5 | [F] | Animate leaderboard rows on load (stagger); highlight current user if logged in | ✅ |

---

## Epic 9 — Auth & identity (optional)

| ID | Area | Task | Done |
|----|------|------|------|
| 9.1 | [D] | Add `auth_provider` and `auth_id` to `players`; unique constraint | ✅ (schema ready) |
| 9.2 | [B] | Optional Discord OAuth or simple magic-link login; create/link player record | — |
| 9.3 | [F] | Login button and callback route; store token or session; pass identity to Colyseus | — |
| 9.4 | [F] | Show “Logged in as …” in header; logout | — |
| 9.5 | [B] | Colyseus: attach player ID from auth to connection; use for persistence and leaderboard | — |

---

## Epic 10 — DevOps & release

| ID | Area | Task | Done |
|----|------|------|------|
| 10.1 | [O] | Docker Compose for local DB + server (optional) | ✅ |
| 10.2 | [O] | Build script: client → static assets; server serves client in prod or separate host | ✅ |
| 10.3 | [O] | Deploy server (e.g. Railway, Fly, Colyseus Cloud); deploy client (Vercel, Netlify) | — |
| 10.4 | [O] | Production env: Colyseus URL for client; DB URL for server; no tunnel in prod | — |
| 10.5 | [O] | Health check endpoint for server and DB | ✅ |
| 10.6 | [O] | Optional: CI (lint, typecheck, test) for client and server | — |

---

## Epic 11 — Testing & quality

| ID | Area | Task | Done |
|----|------|------|------|
| 11.1 | [F] | Unit tests for game utils (e.g. word validation rules if in client) | — |
| 11.2 | [F] | React Testing Library: critical flows (join, submit word, see result) | — |
| 11.3 | [B] | Unit tests for word validation and scoring logic on server | ✅ |
| 11.4 | [B] | Integration test: create room, join, submit word, assert state | — |
| 11.5 | [F] | E2E (Playwright/Cypress): open app, create game, join in second tab, play one round | — |

---

## Epic 12 — Nice-to-haves

| ID | Area | Task | Done |
|----|------|------|------|
| 12.1 | [F] | Reconnect: restore session if tab refreshes during lobby or game | — |
| 12.2 | [B] | Private rooms with password or invite code | — |
| 12.3 | [F] | In-game chat (Colyseus message broadcast) | — |
| 12.4 | [F] | Custom game options: round time, lives, word list/category | — |
| 12.5 | [F] | Mobile-friendly layout and touch keyboard handling | — |
| 12.6 | [F] | PWA: manifest, service worker, “Add to home screen” | — |
| 12.7 | [B] | Rate limiting and anti-cheat (e.g. max words per second) | — |

---

## Stack summary

| Layer | Tech |
|-------|------|
| **Frontend** | React, TypeScript, Vite, Framer Motion, React Router |
| **Backend** | Node.js, Colyseus (TypeScript) |
| **Database** | PostgreSQL or SQLite; migrations + client (Prisma/Drizzle/pg) |
| **Dev** | cloudflared Quick Tunnel for sharing |

---

## Suggested order of attack

1. **Epic 1** — Get client and server running; connect client to Colyseus.
2. **Epic 3** — Minimal game loop (one round, one prompt, submit word).
3. **Epic 4 + 6** — Shell + gameplay UI so you can play end-to-end.
4. **Epic 2 + 2.6–2.7** — Persist games and read leaderboard.
5. **Epic 5, 8, 7** — Lobby, leaderboard page, then motion polish.
6. **Epic 9–12** — Auth, DevOps, tests, nice-to-haves as needed.

Use this backlog in your issue tracker (copy tasks as issues) or keep it as a single source of truth and check off items here.
