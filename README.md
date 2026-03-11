# QuizBomb

Word Bomb–style multiplayer word game. React + TypeScript + Framer Motion (frontend), Colyseus + Node.js (backend), SQLite (database).

## Custom questions (input format)

Use a `.txt` file to upload your own questions. **One line per question.** Each line is:

```
question~answer1,answer2,answer3
```

- `~` separates the question from the answers  
- `,` separates multiple valid answers  
- A new line starts a new question  

**Examples:**

```
What is 2 + 2?~4,four
Capital of France?~Paris
Word containing "ing"~running,thing,ring,sing
```

Save as e.g. `questions.txt`, then in the lobby use the upload (questions) icon and choose **Use this set**.

## Stack

| Layer     | Tech                          |
|----------|-------------------------------|
| Frontend | React, TypeScript, Vite, Framer Motion, React Router |
| Backend  | Node.js, Colyseus (TypeScript) |
| Database | SQLite (better-sqlite3)       |
| Dev      | cloudflared Quick Tunnel for sharing |

## Quick start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Start database (SQLite file created automatically)
# Start server (from repo root)
cd server && npm run dev

# Start client (new terminal)
cd client && npm run dev

# Share with friends (new terminal)
cloudflared tunnel --url http://localhost:5174
```

Then open http://localhost:5174 and share the `https://xxxx.trycloudflare.com` URL.

## Scripts

- `client`: `npm run dev` (Vite dev server, port 5174)
- `server`: `npm run dev` (Colyseus, port 2567) or `npm run build && npm start`
- Tunnel: `cloudflared tunnel --url http://localhost:5174`

## Env

- `client/.env`: `VITE_COLYSEUS_URL` (optional; defaults to same origin `/colyseus`)
- `server/.env`: `PORT=2567`, `DATABASE_PATH=./data/quizbomb.db`

See `client/.env.example` and `server/.env.example`.
