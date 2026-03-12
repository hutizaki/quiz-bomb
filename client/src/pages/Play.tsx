import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRoom } from '@/contexts/RoomContext'
import { GameBoard, type GameBoardPlayer, type OnExplodedPayload } from '@/components/GameBoard'
import { UserCircle, PlayerTypingComponent, ExplosionCanvas, type UserCirclePlayer } from '@/components/game'
import { TYPING_PORTAL_TOP } from '@/components/testStageConfig'
import { parseQuestionsTxt, type ParsedRound } from '@/lib/parseQuestionsTxt'
import { useExplosionManager } from '@/lib/explosionAnimation'
import { runLoseHeartEffects } from '@/lib/loseHeart'
import { useShake } from '@/contexts/ShakeContext'
import { playExplosionSound, preloadExplosionSound } from '@/lib/playExplosionSound'
import { playJoinedSound } from '@/lib/playJoinedSound'
import explosionSprite from '@/assets/explosion.png'

export function Play() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { room, setRoom } = useRoom()
  const roomId = searchParams.get('roomId')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'neutral'; message: string } | null>(null)
  const [wordInput, setWordInput] = useState('')
  const [gameEndSnapshot, setGameEndSnapshot] = useState<{
    winnerSessionId: string | null
    winnerName: string | null
    players: Array<{ sessionId: string; name: string; lives: number }>
  } | null>(null)
  /** When true, we keep showing the game view (same UserCircle/GameBoard) so death animation can finish before switching to lobby. */
  const [postGameActive, setPostGameActive] = useState(false)
  const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false)
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [parsedRounds, setParsedRounds] = useState<ParsedRound[] | null>(null)
  const [uploadInvalidLines, setUploadInvalidLines] = useState(0)
  type ChatEntry =
    | { id: number; type: 'correct'; prompt: string; answer: string; playerName: string }
    | { id: number; type: 'missed'; prompt: string; revealedAnswer?: string }
  const [qaChatEntries, setQaChatEntries] = useState<ChatEntry[]>([])
  const chatIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gameRootRef = useRef<HTMLDivElement>(null)
  const typingInputRef = useRef<HTMLDivElement | null>(null)
  const lobbyPlayerMountRef = useRef<HTMLDivElement>(null)
  const prevLobbyCountRef = useRef(0)
  const postGameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { shakingPlayerId } = useShake()
  const { explosions, spawnExplosion, onComplete } = useExplosionManager()
  const handleExploded = useCallback(
    (payload: OnExplodedPayload) => {
      console.log('[EXPLODE] Play handleExploded invoked', {
        bombHolderId: payload.bombHolderId,
        hasPositionPx: !!payload.positionPx,
        sizePx: payload.sizePx,
      })
      requestAnimationFrame(() => {
        console.log('[EXPLODE] Play rAF fired, calling runLoseHeartEffects')
        runLoseHeartEffects(payload.bombHolderId, payload.positionPx, payload.sizePx, {
          playSound: playExplosionSound,
          spawnExplosion: (opts) => spawnExplosion(opts),
        })
      })
    },
    [spawnExplosion]
  )

  // Preload explosion sound as soon as we have a room so first bomb plays immediately
  useEffect(() => {
    if (room) preloadExplosionSound()
  }, [room])


  // Force re-render when Colyseus state updates (lobby players, phase, etc.)
  const [stateTick, setStateTick] = useState(0)

  const phase = room ? ((room.state as { phase?: string })?.phase ?? 'LOBBY') : 'LOBBY'
  const bombHolderSessionId = room ? (room.state as { bombHolderSessionId?: string })?.bombHolderSessionId : undefined
  const isMyTurn = !!(room && bombHolderSessionId === room.sessionId)
  const currentWordInProgress = room
    ? (room.state as { currentWordInProgress?: string })?.currentWordInProgress ?? ''
    : ''
  const gameMode = room
    ? ((room.state as { gameMode?: string })?.gameMode ?? 'prompt')
    : 'prompt'
  const learningModePaused = room ? (room.state as { learningModePaused?: boolean })?.learningModePaused ?? false : false
  const revealedAnswer = room ? (room.state as { revealedAnswer?: string })?.revealedAnswer ?? '' : ''
  const gamePaused = room ? (room.state as { gamePaused?: boolean })?.gamePaused ?? false : false

  // Keep local wordInput in sync with turn: when I become holder, seed from server once; when I stop being holder, clear
  const prevIsMyTurnRef = useRef(false)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      setWordInput(currentWordInProgress)
    } else if (!isMyTurn) {
      setWordInput('')
    }
    prevIsMyTurnRef.current = isMyTurn
  }, [isMyTurn, currentWordInProgress])

  const handleTypingChange = useCallback(
    (value: string) => {
      console.log('[TYPING] handleTypingChange called, value:', value)
      setWordInput(value)
      room?.send('typing_update', { word: value })
    },
    [room]
  )

  // When entering PLAYING, focus game root only when it's not our turn (no typing UI).
  // When it's our turn, PlayerTypingComponent focuses itself so keys go to the input.
  useEffect(() => {
    if (phase === 'PLAYING' && !isMyTurn) {
      gameRootRef.current?.focus({ preventScroll: true })
    }
  }, [phase, isMyTurn])

  useEffect(() => {
    if (!room) return
    const onStateChange = () => setStateTick((t) => t + 1)
    room.onStateChange(onStateChange)
    return () => {
      room.onStateChange.remove(onStateChange)
    }
  }, [room])

  // If someone opens an old invite link like /play?join=CODE (no roomId), send them to home join flow
  const joinParam = searchParams.get('join')
  useEffect(() => {
    if (!roomId && joinParam?.trim()) {
      const code = joinParam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
      if (code) navigate(`/?join=${encodeURIComponent(code)}`, { replace: true })
    }
  }, [roomId, joinParam, navigate])

  useEffect(() => {
    if (!roomId || !room) return
    const onLeave = () => {
      setGameEndSnapshot(null)
      setRoom(null)
      navigate('/?msg=room_closed')
    }
    room.onLeave(onLeave)
    return () => room.removeAllListeners()
  }, [room, roomId, navigate, setRoom])

  // Clear end-game snapshot when a new game starts so award titles disappear
  useEffect(() => {
    if (phase === 'PLAYING') {
      setGameEndSnapshot(null)
      setPostGameActive(false)
    }
  }, [phase])

  // Clear Q&A chat when returning to lobby (new game)
  useEffect(() => {
    if (phase === 'LOBBY') {
      setQaChatEntries([])
    }
  }, [phase])

  // Play joined sound when lobby player count increases (someone joined)
  useEffect(() => {
    if (!room) return
    const phase = (room.state as { phase?: string })?.phase ?? 'LOBBY'
    if (phase !== 'LOBBY') return
    const pmap = (room.state as { players?: { forEach: (cb: (p: unknown) => void) => void } })?.players
    let count = 0
    if (pmap && typeof pmap.forEach === 'function') pmap.forEach(() => { count += 1 })
    if (count > prevLobbyCountRef.current && prevLobbyCountRef.current > 0) {
      playJoinedSound()
    }
    prevLobbyCountRef.current = count
  }, [room, stateTick])

  useEffect(() => {
    room?.onMessage('word_result', (payload: { sessionId: string; success: boolean; reason?: string; word?: string; points?: number; prompt?: string; playerName?: string }) => {
      if (payload.success) {
        setFeedback({ type: 'success', message: `+${payload.points ?? 0} pts!` })
        if (payload.prompt != null && payload.word != null) {
          const name = payload.playerName ?? 'Someone'
          setQaChatEntries((prev) => [...prev, { id: ++chatIdRef.current, type: 'correct', prompt: payload.prompt!, answer: payload.word!, playerName: name }])
        }
      } else {
        const msg = payload.reason === 'duplicate' ? 'Already used' : payload.reason === 'timeout' ? 'Time up!' : 'Wrong word'
        setFeedback({ type: 'error', message: msg })
      }
      setTimeout(() => setFeedback(null), 1500)
    })
  }, [room])

  useEffect(() => {
    room?.onMessage('qa_no_answer', (payload: { prompt?: string; revealedAnswer?: string }) => {
      // Only add to chat when we have an answer to show (e.g. learning mode reveal); skip when it's just a timeout with nothing to show
      const answer = (payload.revealedAnswer ?? '').trim()
      if (payload.prompt != null && answer !== '') {
        setQaChatEntries((prev) => [...prev, { id: ++chatIdRef.current, type: 'missed', prompt: payload.prompt!, revealedAnswer: answer }])
      }
    })
  }, [room])

  useEffect(() => {
    room?.onMessage(
      'game_ended',
      (payload: {
        winnerSessionId: string | null
        winnerName: string | null
        finalPlayers: Array<{ sessionId: string; name: string; lives: number }>
      }) => {
        if (postGameTimeoutRef.current) clearTimeout(postGameTimeoutRef.current)
        setGameEndSnapshot({
          winnerSessionId: payload.winnerSessionId ?? null,
          winnerName: payload.winnerName ?? null,
          players: payload.finalPlayers ?? [],
        })
        setPostGameActive(true)
        postGameTimeoutRef.current = setTimeout(() => {
          postGameTimeoutRef.current = null
          setPostGameActive(false)
        }, 2500)
      }
    )
    return () => {
      if (postGameTimeoutRef.current) {
        clearTimeout(postGameTimeoutRef.current)
        postGameTimeoutRef.current = null
      }
    }
  }, [room])

  if (!roomId) {
    return (
      <div>
        <p style={{ color: 'var(--error)' }}>Missing room ID. Create or join a game from home.</p>
        <button onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  if (!room) {
    return (
      <div>
        <p style={{ color: 'var(--muted)' }}>No room connected. Join or create a game from the home page.</p>
        <button onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  const state = room.state
  console.log('[TYPING] Play render — phase:', phase, 'isMyTurn:', isMyTurn, 'bombHolder:', bombHolderSessionId, 'mySession:', room.sessionId, 'wordInput:', wordInput)
  type P = { sessionId: string; name: string; lives: number; score: number }
  const players: P[] = []
  const pmap = (state as { players?: Record<string, P> | Map<string, P> | { forEach(cb: (p: P) => void): void } })?.players
  if (pmap) {
    if (typeof (pmap as { forEach: (cb: (p: P) => void) => void }).forEach === 'function')
      (pmap as { forEach: (cb: (p: P) => void) => void }).forEach((p: P) => players.push(p))
    else if (typeof (pmap as Map<string, P>).values === 'function')
      players.push(...Array.from((pmap as Map<string, P>).values()))
    else if (typeof pmap === 'object' && !Array.isArray(pmap))
      players.push(...Object.values(pmap as Record<string, P>))
  }
  const isHost = ((state as { hostSessionId?: string })?.hostSessionId ?? '') === room.sessionId
  const myPlayer = players.find((p) => p.sessionId === room.sessionId)
  const bombHolder = state?.bombHolderSessionId ?? bombHolderSessionId

  const handleStart = () => {
    room?.send('start_game')
  }

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault()
    const w = wordInput.trim()
    if (!w || !isMyTurn) return
    room.send('submit_word', { word: w })
    setWordInput('')
    gameRootRef.current?.focus({ preventScroll: true })
  }

  const handleGameKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    console.log('[TYPING] handleGameKeyDown fired, key:', e.key, 'phase:', phase, 'isMyTurn:', isMyTurn)
    if (phase !== 'PLAYING') return
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmitWord(e as unknown as React.FormEvent)
      return
    }
    if (!isMyTurn) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = wordInput.slice(0, -1)
      setWordInput(next)
      room?.send('typing_update', { word: next })
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      const next = wordInput + e.key
      setWordInput(next)
      room?.send('typing_update', { word: next })
    }
  }

  const handleLeave = () => {
    room?.leave()
    setRoom(null)
    navigate('/')
  }

  const copyLink = () => {
    // Invite link must point to home (/) so the recipient lands on the join form (nickname + room code).
    const base = window.location.origin.replace(/\/$/, '') + '/'
    const url = `${base}?join=${encodeURIComponent(String(roomId).toUpperCase())}`
    navigator.clipboard.writeText(url).then(
      () => {
        setFeedback({ type: 'success', message: 'Link copied!' })
        setTimeout(() => setFeedback(null), 2000)
      },
      () => {
        setFeedback({ type: 'error', message: 'Could not copy' })
        setTimeout(() => setFeedback(null), 2000)
      }
    )
  }

  if (phase === 'LOBBY' && !postGameActive) {
    const hostSessionId = (state as { hostSessionId?: string })?.hostSessionId ?? ''
    // Always use live players so new joiners appear; use snapshot only for award titles (1st/2nd/3rd)
    const lobbyCirclePlayers: UserCirclePlayer[] = players.map((p) => ({
      id: p.sessionId,
      name: p.name,
      lives: p.lives,
      hearts: p.lives,
      crown: hostSessionId === p.sessionId,
    }))
    const awardTitles: Record<string, string> | null =
      gameEndSnapshot?.players?.length != null
        ? Object.fromEntries(
            gameEndSnapshot.players.slice(0, 3).map((p, i) => [p.sessionId, ['1st', '2nd', '3rd'][i] ?? ''])
          )
        : null
    const sideBarStyle: React.CSSProperties = {
      position: 'fixed',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 10,
      background: 'rgba(30,41,59,0.95)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }
    const iconButtonStyle: React.CSSProperties = {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(0,0,0,0.4)',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {/* Left side menu */}
        <div style={sideBarStyle}>
          <button
            type="button"
            onClick={() => { setLobbyMenuOpen((o) => !o); setUploadPanelOpen(false); setSettingsModalOpen(false) }}
            aria-label={lobbyMenuOpen ? 'Close menu' : 'Open menu'}
            style={iconButtonStyle}
          >
            ☰
          </button>
          {isHost && (
            <button
              type="button"
              onClick={() => { setUploadPanelOpen((o) => !o); setLobbyMenuOpen(false); setSettingsModalOpen(false) }}
              aria-label={uploadPanelOpen ? 'Close upload' : 'Upload questions'}
              style={{ ...iconButtonStyle, ...(uploadPanelOpen ? { background: 'rgba(99,102,241,0.4)' } : {}) }}
              title="Upload questions (.txt)"
            >
              📄
            </button>
          )}
          <button
            type="button"
            onClick={() => { setSettingsModalOpen((o) => !o); setLobbyMenuOpen(false); setUploadPanelOpen(false) }}
            aria-label={settingsModalOpen ? 'Close settings' : 'Settings'}
            style={{ ...iconButtonStyle, ...(settingsModalOpen ? { background: 'rgba(99,102,241,0.4)' } : {}) }}
            title="Settings"
          >
            ⚙
          </button>
          {phase === 'PLAYING' && isHost && !gamePaused && !learningModePaused && (
            <button
              type="button"
              onClick={() => room?.send('set_pause', { paused: true })}
              aria-label="Pause game"
              style={iconButtonStyle}
              title="Pause game"
            >
              ⏸
            </button>
          )}
          <button type="button" onClick={handleLeave} aria-label="Leave game" style={{ ...iconButtonStyle, color: 'var(--error)' }} title="Leave game">
            ←
          </button>
        </div>
        {uploadPanelOpen && isHost && (
          <>
            <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setUploadPanelOpen(false)} />
            <div
              style={{
                position: 'fixed',
                left: 72,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1001,
                width: 280,
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '1rem',
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Upload questions</div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                Format: one line per round. <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 4 }}>question ~ answer1, answer2</code>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const text = typeof reader.result === 'string' ? reader.result : ''
                    const { rounds, invalidLines } = parseQuestionsTxt(text)
                    setParsedRounds(rounds)
                    setUploadInvalidLines(invalidLines)
                  }
                  reader.readAsText(file, 'UTF-8')
                }}
                style={{ fontSize: 12, color: '#e2e8f0' }}
              />
              {parsedRounds && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                    {parsedRounds.length} round{parsedRounds.length !== 1 ? 's' : ''}
                  </div>
                  {uploadInvalidLines > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{uploadInvalidLines} invalid row(s) skipped</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--muted)', maxHeight: 120, overflowY: 'auto' }}>
                    {parsedRounds.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <span style={{ color: '#f1f5f9' }}>{r.prompt || '—'}</span>
                        <span style={{ color: '#94a3b8' }}> → {r.answers.length} answer(s)</span>
                      </div>
                    ))}
                    {parsedRounds.length > 3 && (
                      <div style={{ color: 'var(--muted)' }}>… and {parsedRounds.length - 3} more</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedRounds.length > 0) {
                          room?.send('set_questions', { rounds: parsedRounds })
                          setUploadPanelOpen(false)
                          setParsedRounds(null)
                          setUploadInvalidLines(0)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }
                      }}
                      disabled={parsedRounds.length === 0}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        background: parsedRounds.length > 0 ? 'var(--accent)' : 'rgba(99,102,241,0.3)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        color: '#fff',
                        cursor: parsedRounds.length > 0 ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      Use this set
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedRounds(null)
                        setUploadInvalidLines(0)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 'var(--radius)',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(['Type a word containing ~ cat, dog, bat\nName a country ~ France, Germany, Japan'], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'questions-example.txt'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textAlign: 'left' }}
              >
                Download example
              </button>
            </div>
          </>
        )}
        {lobbyMenuOpen && (
          <>
            <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setLobbyMenuOpen(false)} />
            <div
              style={{
                position: 'fixed',
                left: 72,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1001,
                minWidth: 160,
                padding: '0.5rem 0',
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <Link to="/" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.5rem 1rem', color: 'inherit', textDecoration: 'none', fontSize: '1rem', fontWeight: 700 }}>
                Home
              </Link>
              <Link to="/leaderboard" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.4rem 1rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                Leaderboard
              </Link>
              <Link to="/history" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.5rem 1rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                History
              </Link>
            </div>
          </>
        )}

        {settingsModalOpen && (() => {
          const roundTimeSeconds = (state as { roundTimeSeconds?: number })?.roundTimeSeconds ?? 15
          const clampedTime = Math.min(60, Math.max(5, roundTimeSeconds))
          const sendTime = (sec: number) => {
            const value = Math.round(Math.min(60, Math.max(5, sec)))
            if (isHost) room?.send('set_round_time', { seconds: value })
          }
          const initialLives = (state as { initialLives?: number })?.initialLives ?? 3
          const clampedHearts = Math.min(10, Math.max(1, initialLives))
          const sendHearts = (hearts: number) => {
            const value = Math.round(Math.min(10, Math.max(1, hearts)))
            if (isHost) room?.send('set_initial_lives', { hearts: value })
          }
          const currentGameMode = (state as { gameMode?: string })?.gameMode ?? 'prompt'
          const sendGameMode = (mode: 'prompt' | 'qa') => {
            if (isHost) room?.send('set_game_mode', { mode })
          }
          const learningMode = (state as { learningMode?: boolean })?.learningMode ?? false
          const sendLearningMode = (enabled: boolean) => {
            if (isHost) room?.send('set_learning_mode', { enabled })
          }
          return (
            <>
              <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setSettingsModalOpen(false)} />
              <div
                style={{
                  position: 'fixed',
                  left: 72,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1001,
                  width: 260,
                  padding: '1rem',
                  background: 'var(--surface)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Settings</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Bomb timer (seconds)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={clampedTime}
                    onChange={(e) => sendTime(Number(e.target.value))}
                    disabled={!isHost}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={clampedTime}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 15 : Number(e.target.value)
                      if (!Number.isNaN(v)) sendTime(v)
                    }}
                    disabled={!isHost}
                    style={{
                      width: 52,
                      padding: '0.35rem 0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 'var(--radius)',
                      color: '#f1f5f9',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>s</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Number of hearts</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={clampedHearts}
                    onChange={(e) => sendHearts(Number(e.target.value))}
                    disabled={!isHost}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={clampedHearts}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 3 : Number(e.target.value)
                      if (!Number.isNaN(v)) sendHearts(v)
                    }}
                    disabled={!isHost}
                    style={{
                      width: 52,
                      padding: '0.35rem 0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 'var(--radius)',
                      color: '#f1f5f9',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16, marginBottom: 8 }}>Game mode</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['prompt', 'qa'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => sendGameMode(mode)}
                      disabled={!isHost}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0',
                        borderRadius: 'var(--radius)',
                        border: `1px solid ${currentGameMode === mode ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                        background: currentGameMode === mode ? 'rgba(99,102,241,0.25)' : 'rgba(0,0,0,0.25)',
                        color: currentGameMode === mode ? '#f1f5f9' : 'var(--muted)',
                        fontWeight: currentGameMode === mode ? 700 : 400,
                        fontSize: 12,
                        cursor: isHost ? 'pointer' : 'default',
                      }}
                    >
                      {mode === 'prompt' ? 'Word Bomb' : 'Q&A'}
                    </button>
                  ))}
                </div>
                {currentGameMode === 'qa' && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                    Q&A mode requires custom questions (upload via the questions icon).
                  </p>
                )}
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16, marginBottom: 8 }}>Learning mode</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={learningMode}
                    onClick={() => sendLearningMode(!learningMode)}
                    disabled={!isHost}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: 'none',
                      background: learningMode ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                      cursor: isHost ? 'pointer' : 'default',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: learningMode ? 22 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.15s ease',
                      }}
                    />
                  </button>
                  <span style={{ fontSize: 12, color: '#f1f5f9' }}>
                    {learningMode ? 'On' : 'Off'} — when a question goes full circle unanswered, show the answer and pause until "Next question"
                  </span>
                </div>
                {!isHost && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--muted)' }}>Only the host can change settings.</p>
                )}
              </div>
            </>
          )
        })()}

        {/* Game canvas: UserCircle + room code + copy + start + feedback — full container */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at 40% 30%, #1a2535 0%, #0d1520 60%, #080e18 100%)',
            overflow: 'hidden',
            fontFamily: "'Nunito',sans-serif",
          }}
        >
          <div ref={lobbyPlayerMountRef} style={{ position: 'absolute', width: '100%', height: 0, top: 0, left: 0 }} />
          <UserCircle
            players={lobbyCirclePlayers}
            containerRef={lobbyPlayerMountRef}
            radiusPercent={44}
            showRingGuide={false}
            onRemove={isHost ? () => {} : undefined}
            awardTitles={awardTitles}
          />
          {/* Room code + Copy inside canvas */}
          <div style={{ position: 'absolute', top: 16, left: 24, zIndex: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: 8, fontSize: '0.9rem' }}>
              Room code: <strong style={{ letterSpacing: '0.2em', fontSize: '1.25rem', color: '#fff' }}>{String(roomId || '').toUpperCase()}</strong>
            </p>
            <button
              onClick={copyLink}
              style={{
                padding: '0.4rem 0.75rem',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius)',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Copy invite link
            </button>
          </div>
          {/* Start game — only visible to host */}
          {isHost && (
            <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <button
                onClick={handleStart}
                disabled={players.length < 1}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: players.length < 1 ? 'rgba(99,102,241,0.4)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  color: 'white',
                  cursor: players.length < 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                Start
              </button>
            </div>
          )}
          {feedback && (
            <p style={{ position: 'absolute', top: 16, right: 24, margin: 0, color: feedback.type === 'success' ? 'var(--success)' : 'var(--error)', zIndex: 10, fontSize: '0.9rem' }}>
              {feedback.message}
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  // PLAYING (or post-game): same GameBoard + UserCircle so death animation can finish before switching to lobby
  const hostSessionId = (state as { hostSessionId?: string })?.hostSessionId ?? ''
  const gameBoardPlayers: GameBoardPlayer[] =
    postGameActive && gameEndSnapshot?.players?.length
      ? gameEndSnapshot.players.map((p) => ({
          id: p.sessionId,
          name: p.name,
          lives: p.lives,
          crown: hostSessionId === p.sessionId,
          hasBomb: false,
          isYou: p.sessionId === room.sessionId,
          x: 0,
          y: 0,
        }))
      : players.map((p) => ({
          id: p.sessionId,
          name: p.name,
          lives: p.lives,
          crown: hostSessionId === p.sessionId,
          hasBomb: bombHolder === p.sessionId,
          isYou: p.sessionId === room.sessionId,
          x: 0,
          y: 0,
        }))

  const sideBarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 10,
    background: 'rgba(30,41,59,0.95)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  }
  const iconButtonStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
      {/* Left side menu */}
      <div style={sideBarStyle}>
        <button type="button" onClick={() => setLobbyMenuOpen((o) => !o)} aria-label={lobbyMenuOpen ? 'Close menu' : 'Open menu'} style={iconButtonStyle}>
          ☰
        </button>
        <button type="button" onClick={handleLeave} aria-label="Leave game" style={{ ...iconButtonStyle, color: 'var(--error)' }} title="Leave game">
          ←
        </button>
      </div>
      {lobbyMenuOpen && (
        <>
          <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setLobbyMenuOpen(false)} />
          <div
            style={{
              position: 'fixed',
              left: 72,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1001,
              minWidth: 160,
              padding: '0.5rem 0',
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <Link to="/" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.5rem 1rem', color: 'inherit', textDecoration: 'none', fontSize: '1rem', fontWeight: 700 }}>
              Home
            </Link>
            <Link to="/leaderboard" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.4rem 1rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Leaderboard
            </Link>
            <Link to="/history" onClick={() => setLobbyMenuOpen(false)} style={{ display: 'block', padding: '0.5rem 1rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
              History
            </Link>
          </div>
        </>
      )}

      {/* Explosion layer: same size as game area; lose-heart effects spawn here when timer hits 0 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
        <ExplosionCanvas
          explosions={explosions}
          onComplete={onComplete}
          spriteUrl={explosionSprite}
          frameSize={80}
        />
      </div>

      {/* Full-screen key capture: track keyboard here; typing UI is painted to typing portal below */}
      <div
        ref={gameRootRef}
        tabIndex={0}
        role="application"
        aria-label="Game"
        onClick={() => phase === 'PLAYING' && gameRootRef.current?.focus({ preventScroll: true })}
        onKeyDown={handleGameKeyDown}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          outline: 'none',
        }}
      >
        <GameBoard
          players={gameBoardPlayers}
          prompt={state.prompt ?? ''}
          timeRemaining={state.timerRemaining ?? 0}
          totalTime={(state as { roundTimeSeconds?: number })?.roundTimeSeconds ?? 15}
          roundEndsAt={(state as { roundEndsAt?: number })?.roundEndsAt ?? 0}
          lastServerTimeMs={(state as { lastServerTimeMs?: number })?.lastServerTimeMs ?? 0}
          bombHolderSessionId={bombHolder ?? ''}
          hostSessionId={(state as { hostSessionId?: string })?.hostSessionId ?? ''}
          mySessionId={room.sessionId}
          onExploded={handleExploded}
          shakingPlayerId={shakingPlayerId}
          fullHeight
          postGame={postGameActive}
        />
        {phase === 'PLAYING' && learningModePaused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: 'auto',
            }}
          >
            <p style={{ margin: 0, fontSize: '1.25rem', color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
              Answer: {revealedAnswer}
            </p>
            <button
              type="button"
              onClick={() => room?.send('next_question')}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Next question
            </button>
          </div>
        )}
        {phase === 'PLAYING' && gamePaused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: 'auto',
            }}
          >
            <p style={{ margin: 0, fontSize: '1.5rem', color: '#f1f5f9', fontWeight: 700, textAlign: 'center' }}>
              Game paused
            </p>
            {isHost && (
              <button
                type="button"
                onClick={() => room?.send('set_pause', { paused: false })}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Resume
              </button>
            )}
          </div>
        )}
      </div>

      {/* Typing input — positioned using the same config constants as the test page so
          adjusting PROMPT_HEIGHT_PX / TYPING_GAP_BELOW_PROMPT_PX in testStageConfig.ts
          moves the typed word display in both the test page and the live game. */}
      <div
        style={{
          position: 'absolute',
          top: TYPING_PORTAL_TOP,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 420,
          zIndex: 100,
          pointerEvents: isMyTurn ? 'auto' : 'none',
        }}
        onClick={() => typingInputRef.current?.focus({ preventScroll: true })}
      >
        <PlayerTypingComponent
          containerRef={typingInputRef}
          value={isMyTurn ? wordInput : currentWordInProgress}
          onChange={handleTypingChange}
          onSubmit={handleSubmitWord}
          disabled={phase !== 'PLAYING' || gamePaused}
          placeholder={gameMode === 'qa' ? 'Type your answer…' : 'Type a word…'}
          feedback={feedback}
          positionMode="belowPrompt"
          tileMode={gameMode !== 'qa'}
          readOnly={!isMyTurn}
          waitingForName={!isMyTurn ? players.find((p) => p.sessionId === bombHolder)?.name : undefined}
        />
      </div>

      {/* Right-side Q&A chat: question + answer when someone gets it right; red when no one got it */}
      {phase === 'PLAYING' && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 280,
            zIndex: 100,
            background: 'rgba(15,23,42,0.96)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 14, fontWeight: 700, color: '#f1f5f9', flexShrink: 0 }}>
            Q&A
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {qaChatEntries.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Correct answers and missed questions will appear here.</p>
            ) : (
              qaChatEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    marginBottom: 14,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 'var(--radius)',
                    borderLeft: `3px solid ${entry.type === 'correct' ? 'var(--accent)' : '#e57373'}`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                    {entry.prompt}
                  </p>
                  {entry.type === 'correct' ? (
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: '#e2e8f0' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{entry.playerName}:</span> {entry.answer}
                    </p>
                  ) : (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#e57373' }}>
                      No one got it.{entry.revealedAnswer != null && entry.revealedAnswer !== '' ? ` Answer: ${entry.revealedAnswer}` : ''}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
