import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Arrow, UserCircle, getProfileCircleCenterPositions, getPlayerPositionsPx, getEllipseRadiiPx, DEFAULT_ELLIPSE_OFFSET_PX, type UserCirclePlayer } from '@/components/game'
import { playJoinedSound } from '@/lib/playJoinedSound'
import { TestPageShell } from './TestPageShell'
import { STAGE_CENTER_Y_PERCENT } from '../testStageConfig'

const RADIUS_PERCENT = 44
const NAMES = ['Player6767', 'Player2171', 'mada', 'xXSniper', 'NightOwl', 'BlazeFX', 'ZeroG', 'Phantom']
let uidCounter = 3

const DEFAULT_PLAYERS: UserCirclePlayer[] = [
  { id: '0', name: 'Player6767', lives: 3, hearts: 3, crown: true },
  { id: '1', name: 'Player2171', lives: 3, hearts: 3, crown: false },
  { id: '2', name: 'mada', lives: 3, hearts: 3, crown: false },
]

const sidebarLabel = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }
const sidebarButton = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer' as const,
}

export function TestArrowPage() {
  const [players, setPlayers] = useState<UserCirclePlayer[]>(DEFAULT_PLAYERS)
  const [targetIndex, setTargetIndex] = useState(0)
  const [lengthFraction, setLengthFraction] = useState(0.85)
  const [showArrowEllipse, setShowArrowEllipse] = useState(true)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setContainerSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const radiusYPercent =
    containerSize.w > containerSize.h ? RADIUS_PERCENT * (containerSize.h / containerSize.w) : undefined
  const arrowPositions = getProfileCircleCenterPositions(players.length, RADIUS_PERCENT, radiusYPercent)
  const arrowPositionsPx =
    containerSize.w > 0 && containerSize.h > 0
      ? getPlayerPositionsPx(players.length, containerSize.w, containerSize.h, RADIUS_PERCENT, radiusYPercent)
      : []
  const arrowContainerSize = containerSize.w > 0 && containerSize.h > 0 ? containerSize : undefined

  const removePlayer = (id: string) => setPlayers((prev) => prev.filter((p) => p.id !== id))
  const goToNextUser = () => {
    if (players.length === 0) return
    setTargetIndex((i) => (i + 1) % players.length)
  }
  const addPlayer = () => {
    if (players.length >= 8) return
    const idx = uidCounter % NAMES.length
    uidCounter += 1
    setPlayers((prev) => [
      ...prev,
      { id: String(uidCounter), name: NAMES[idx % NAMES.length], lives: 3, hearts: 3, crown: false },
    ])
    playJoinedSound()
  }

  const sidebarContent = (
    <>
      <div style={sidebarLabel}>Players ({players.length}/8)</div>
      <button type="button" onClick={addPlayer} disabled={players.length >= 8} style={{ ...sidebarButton, opacity: players.length >= 8 ? 0.5 : 1 }}>
        + Add player
      </button>
      <div style={{ ...sidebarLabel, marginTop: 8 }}>Who has the bomb? (turn)</div>
      <button type="button" onClick={goToNextUser} disabled={players.length === 0} style={{ ...sidebarButton, opacity: players.length === 0 ? 0.5 : 1 }}>
        Next user
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {players.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setTargetIndex(i)}
            style={{
              ...sidebarButton,
              padding: '4px 8px',
              fontSize: 11,
              background: targetIndex === i ? 'rgba(99,102,241,0.3)' : undefined,
              borderColor: targetIndex === i ? '#6366f1' : undefined,
            }}
          >
            {p.name} ({i})
          </button>
        ))}
      </div>
      <div style={{ ...sidebarLabel, marginTop: 8 }}>Arrow length</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
        <input
          type="range"
          min={0.3}
          max={1}
          step={0.05}
          value={lengthFraction}
          onChange={(e) => setLengthFraction(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 36 }}>{lengthFraction.toFixed(2)}</span>
      </label>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Click avatar to remove (lobby)</div>
      <div style={{ ...sidebarLabel, marginTop: 12 }}>Arrow ellipse guide</div>
      <button
        type="button"
        onClick={() => setShowArrowEllipse((v) => !v)}
        style={{
          ...sidebarButton,
          borderColor: showArrowEllipse ? '#6366f1' : undefined,
          background: showArrowEllipse ? 'rgba(99,102,241,0.25)' : undefined,
        }}
      >
        {showArrowEllipse ? 'On' : 'Off'}
      </button>
    </>
  )

  const containerStyle = {
    position: 'absolute' as const,
    left: '50%',
    top: `${STAGE_CENTER_Y_PERCENT}%`,
    transform: 'translate(-50%, -50%)',
    width: '100vw',
    height: '100vh',
  }

  const arrowTipGuide =
    showArrowEllipse && containerSize.w > 0 && containerSize.h > 0
      ? (() => {
          const { rx, ry } = getEllipseRadiiPx(containerSize.w, containerSize.h, RADIUS_PERCENT, radiusYPercent)
          const cx = containerSize.w / 2
          const cy = containerSize.h / 2
          const rxInner = Math.max(0, rx - DEFAULT_ELLIPSE_OFFSET_PX)
          const ryInner = Math.max(0, ry - DEFAULT_ELLIPSE_OFFSET_PX)
          return (
            <svg
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: containerSize.w,
                height: containerSize.h,
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              aria-hidden
            >
              <ellipse
                cx={cx}
                cy={cy}
                rx={rxInner}
                ry={ryInner}
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </svg>
          )
        })()
      : null

  const stage = (
    <div ref={containerRef} style={containerStyle}>
      <UserCircle
        players={players}
        containerRef={containerRef}
        radiusPercent={RADIUS_PERCENT}
        radiusYPercent={radiusYPercent}
        showRingGuide
        onRemove={removePlayer}
      />
      {arrowTipGuide}
      <Arrow
        positions={arrowPositions}
        targetIndex={targetIndex}
        positionsPx={arrowPositionsPx}
        containerSize={arrowContainerSize}
        radiusPercent={RADIUS_PERCENT}
        radiusYPercent={radiusYPercent}
      />
    </div>
  )

  return (
    <TestPageShell sidebarContent={sidebarContent}>
      {createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          {stage}
        </div>,
        document.body
      )}
    </TestPageShell>
  )
}
