import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { UserCircle, getAvatarSizePx, type UserCirclePlayer } from '@/components/game'
import { playJoinedSound } from '@/lib/playJoinedSound'
import { getPlayersFromReplicaState, LOBBY_OWNER_ID } from '@/lib/testLobbyReplica'
import { useTestLobby } from '@/contexts/TestLobbyContext'
import { TestPageShell } from './TestPageShell'
import { useExplosionAvatarSize, useExplosionOnExplode } from './TestPageShellContext'
import { STAGE_CENTER_Y_PERCENT } from '../testStageConfig'

const NAMES = ['Player6767', 'Player2171', 'mada', 'xXSniper', 'NightOwl', 'BlazeFX', 'ZeroG', 'Phantom']

/** Re-export for consumers that need the constant. */
export { LOBBY_OWNER_ID }

let nameIndex = 0

export function TestUserCirclePage() {
  const { room } = useTestLobby()
  const [, setTick] = useState(0)
  const [showRingGuide, setShowRingGuide] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setAvatarSizePx, , setScaleFactor] = useExplosionAvatarSize()
  const [setOnExplode] = useExplosionOnExplode()

  // Subscribe to Colyseus-style state changes so we re-render when join/leave runs
  useEffect(() => {
    room.onStateChange(() => setTick((t) => t + 1))
    return () => room.removeAllListeners()
  }, [room])

  useEffect(() => {
    setScaleFactor(1)
  }, [setScaleFactor])

  const rawPlayers = getPlayersFromReplicaState(room.state)
  const hostSessionId = room.state.hostSessionId
  const players: UserCirclePlayer[] = rawPlayers.map((p) => ({
    id: p.sessionId,
    name: p.name,
    lives: p.lives,
    hearts: p.lives,
    crown: hostSessionId === p.sessionId,
  }))

  useEffect(() => {
    const removeOneHeartFromFirst = () => {
      if (rawPlayers.length > 0) {
        const first = rawPlayers[0]
        const updated = { ...first, lives: Math.max(0, first.lives - 1) }
        room.state.players.set(first.sessionId, updated)
        room.notifyStateChange()
      }
    }
    setOnExplode(removeOneHeartFromFirst)
    return () => setOnExplode(null)
  }, [setOnExplode, room, rawPlayers.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const size = Math.min(rect.width, rect.height)
        setAvatarSizePx(getAvatarSizePx(size, players.length))
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [players.length, setAvatarSizePx])

  const addPlayer = () => {
    const nickname = NAMES[nameIndex % NAMES.length]
    nameIndex += 1
    room.join(nickname)
    playJoinedSound()
  }

  const removePlayer = (id: string) => {
    room.leave(id)
  }

  const sidebarContent = (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Lobby ({players.length}/8)</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
        “Lobby Owner” is always present. Click other avatars to remove.
      </div>
      <button
        type="button"
        onClick={addPlayer}
        disabled={players.length >= 8}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: 'none',
          background: players.length >= 8 ? 'rgba(99,102,241,0.3)' : '#6366f1',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: players.length >= 8 ? 'not-allowed' : 'pointer',
          opacity: players.length >= 8 ? 0.7 : 1,
        }}
      >
        + Add player
      </button>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
        Click avatar to remove (except Lobby Owner)
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, marginTop: 12 }}>Circle guide</div>
      <button
        type="button"
        onClick={() => setShowRingGuide((v) => !v)}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: `1px solid ${showRingGuide ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
          background: showRingGuide ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
          color: '#e2e8f0',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {showRingGuide ? 'On' : 'Off'}
      </button>
    </>
  )

  const stageCenterStyle = {
    position: 'absolute' as const,
    left: '50%',
    top: `${STAGE_CENTER_Y_PERCENT}%`,
    transform: 'translate(-50%, -50%)',
    width: '100vw',
    height: '100vh',
  }

  return (
    <TestPageShell sidebarContent={sidebarContent}>
      {createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <div ref={containerRef} style={stageCenterStyle}>
            <UserCircle
              players={players}
              containerRef={containerRef}
              radiusPercent={44}
              showRingGuide={showRingGuide}
              onRemove={removePlayer}
            />
          </div>
        </div>,
        document.body
      )}
    </TestPageShell>
  )
}
