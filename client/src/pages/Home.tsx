import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AnimatedBadge } from '@/components/AnimatedBadge'
import { useRoom } from '@/contexts/RoomContext'
import { createRoom, joinRoom } from '@/lib/colyseus'

export function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setRoom } = useRoom()
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // When opening a shared link like /?join=ABCD, show join form with code pre-filled
  useEffect(() => {
    const join = searchParams.get('join')
    if (join && join.trim()) {
      setMode('join')
      setRoomCode(join.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
      setError('')
    }
  }, [searchParams])

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('Enter a nickname')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { roomId, room } = await createRoom(nickname.trim())
      setRoom(room)
      navigate(`/play?roomId=${roomId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!nickname.trim() || !roomCode.trim()) {
      setError('Enter nickname and room code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const room = await joinRoom(roomCode.trim(), nickname.trim())
      setRoom(room)
      navigate(`/play?roomId=${roomCode.trim()}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        QuizBomb
        <AnimatedBadge />
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Type words containing the prompt before the bomb explodes. Last player standing wins.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setMode('create'); setError(''); setRoomCode(''); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: mode === 'create' ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            color: 'inherit',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Create game
        </button>
        <button
          onClick={() => { setMode('join'); setError(''); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: mode === 'join' ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            color: 'inherit',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Join game
        </button>
      </div>

      {mode === 'create' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginBottom: '1rem' }}
        >
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Player"
            maxLength={20}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.75rem',
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius)',
              color: 'inherit',
              fontSize: '1rem',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? 'Creating…' : 'Create room'}
          </button>
        </motion.div>
      )}

      {mode === 'join' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginBottom: '1rem' }}
        >
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Player"
            maxLength={20}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.75rem',
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius)',
              color: 'inherit',
              fontSize: '1rem',
              marginBottom: '0.75rem',
            }}
          />
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Room code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g. ABCD"
            maxLength={8}
            autoComplete="off"
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.75rem',
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius)',
              color: 'inherit',
              fontSize: '1rem',
            }}
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? 'Joining…' : 'Join room'}
          </button>
        </motion.div>
      )}

      {error && (
        <p style={{ color: 'var(--error)', marginTop: '1rem' }}>{error}</p>
      )}

      <p style={{ marginTop: '2rem' }}>
        <a href="/leaderboard" style={{ color: 'var(--accent)' }}>View leaderboard</a>
      </p>
    </motion.div>
  )
}
