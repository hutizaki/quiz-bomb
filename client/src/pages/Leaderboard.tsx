import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type LeaderboardEntry = { name: string; total_score: number; games_won: number }

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/leaderboard?limit=20')
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading leaderboard…</p>
  if (error) return <p style={{ color: 'var(--error)' }}>{error}</p>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1>Leaderboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Top scores across all games.</p>
      {entries.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No games played yet. Be the first!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {entries.map((e, i) => (
            <motion.li
              key={e.name + i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                marginBottom: '0.5rem',
              }}
            >
              <span><strong>#{i + 1}</strong> {e.name}</span>
              <span>{e.total_score} pts · {e.games_won} wins</span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
