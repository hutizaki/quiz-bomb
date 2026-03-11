import type Database from 'better-sqlite3'
import { getDb, runMigrations } from './schema.js'

let db: Database.Database | null = null

export function initDb() {
  db = getDb()
  runMigrations(db)
  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('DB not initialized')
  return db
}

export function persistGame(params: {
  roomId: string
  startedAt: number
  endedAt: number
  winnerName: string | null
  config: string
  playerResults: Array<{ name: string; score: number; rank: number; wordsPlayed: number }>
}) {
  const database = getDatabase()
  const insertGame = database.prepare(`
    INSERT INTO games (room_id, started_at, ended_at, winner_id, config)
    VALUES (?, ?, ?, NULL, ?)
  `)
  const insertGamePlayer = database.prepare(`
    INSERT INTO game_players (game_id, player_name, score, rank, words_played)
    VALUES (?, ?, ?, ?, ?)
  `)
  const run = database.transaction(() => {
    const result = insertGame.run(
      params.roomId,
      params.startedAt,
      params.endedAt,
      params.config
    )
    const gameId = (result as any).lastInsertRowid as number
    for (const p of params.playerResults) {
      insertGamePlayer.run(gameId, p.name, p.score, p.rank, p.wordsPlayed)
    }
  })
  run()
}

export function getLeaderboard(limit = 20): Array<{ name: string; total_score: number; games_won: number }> {
  const database = getDatabase()
  const rows = database.prepare(`
    SELECT player_name AS name,
           SUM(score) AS total_score,
           SUM(CASE WHEN rank = 1 THEN 1 ELSE 0 END) AS games_won
    FROM game_players
    GROUP BY player_name
    ORDER BY total_score DESC
    LIMIT ?
  `).all(limit) as Array<{ name: string; total_score: number; games_won: number }>
  return rows
}

export function getRecentGames(limit = 20): Array<{
  id: number
  room_id: string
  ended_at: number
  winner_name: string | null
}> {
  const database = getDatabase()
  const rows = database.prepare(`
    SELECT g.id, g.room_id, g.ended_at,
           (SELECT player_name FROM game_players WHERE game_id = g.id AND rank = 1 LIMIT 1) AS winner_name
    FROM games g
    WHERE g.ended_at IS NOT NULL
    ORDER BY g.ended_at DESC
    LIMIT ?
  `).all(limit) as Array<{ id: number; room_id: string; ended_at: number; winner_name: string | null }>
  return rows
}
