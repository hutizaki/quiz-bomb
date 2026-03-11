import express from 'express'
import { createServer } from 'http'
import { createRequire } from 'module'
import { initDb } from './db/games.js'
import { getLeaderboard, getRecentGames } from './db/games.js'
import { GameRoom } from './rooms/GameRoom.js'

initDb()

const require = createRequire(import.meta.url)
const { Server } = require('colyseus')
const app = express()
app.use(express.json())

app.get('/api/leaderboard', (_req, res) => {
  try {
    const limit = Math.min(Number(_req.query.limit) || 20, 100)
    res.json(getLeaderboard(limit))
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

app.get('/api/games', (_req, res) => {
  try {
    const limit = Math.min(Number(_req.query.limit) || 20, 100)
    res.json(getRecentGames(limit))
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch games' })
  }
})

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() })
})

const httpServer = createServer(app)
const gameServer = new Server({ server: httpServer })
gameServer.define('game', GameRoom)

const PORT = Number(process.env.PORT) || 2567
httpServer.listen(PORT, () => {
  console.log(`Colyseus server listening on ws://localhost:${PORT}`)
})
