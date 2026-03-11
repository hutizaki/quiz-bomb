import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type GameEntry = { id: number; room_id: string; ended_at: number; winner_name: string | null }

export function History() {
  const [games, setGames] = useState<GameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/games?limit=20')
      .then((r) => r.json())
      .then((data) => {
        setGames(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading history…</p>
  if (error) return <p style={{ color: 'var(--error)' }}>{error}</p>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1>Game history</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Recent games.</p>
      {games.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No games yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {games.map((g, i) => (
            <motion.li
              key={g.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                marginBottom: '0.5rem',
              }}
            >
              <div>Room {g.room_id.slice(0, 8)}…</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                Winner: {g.winner_name ?? '—'} · {new Date(g.ended_at * 1000).toLocaleString()}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
