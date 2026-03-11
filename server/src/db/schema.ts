import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'quizbomb.db')

export function getDb(): Database.Database {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return new Database(DB_PATH)
}

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      auth_id TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      winner_id INTEGER REFERENCES players(id),
      config TEXT
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id),
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      rank INTEGER,
      words_played INTEGER NOT NULL DEFAULT 0,
      UNIQUE(game_id, player_name)
    );

    CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at);
    CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_players_score ON game_players(score DESC);
  `)
}
