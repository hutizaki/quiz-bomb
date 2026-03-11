import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bomb,
  Arrow,
  UserCircle,
  PromptComponent,
  getProfileCircleCenterPositions,
  getPlayerPositionsPx,
  getAvatarSizePx,
  type UserCirclePlayer,
} from '@/components/game'
import { withDisplayHearts } from '@/lib/loseHeart'

export interface OnExplodedPayload {
  bombHolderId: string
  positionPx: { x: number; y: number } | undefined
  sizePx: number
}


/**
 * Bomb timer from server round end timestamp, with server-time offset to correct clock skew.
 * Uses refs for roundEndsAt/lastServerTimeMs so the tick loop is never torn down when those props
 * transition from 0 to valid (avoids missing first bomb when effect re-runs and cancels rAF).
 * When the computed value first reaches <= 0, onReachZero is called once.
 */
function useRoundEndsAtTimer(
  roundEndsAt: number,
  lastServerTimeMs: number,
  totalTime: number,
  onReachZero?: () => void
): number {
  const roundEndsAtRef = useRef(roundEndsAt)
  const lastServerTimeMsRef = useRef(lastServerTimeMs)
  const totalTimeRef = useRef(totalTime)
  roundEndsAtRef.current = roundEndsAt
  lastServerTimeMsRef.current = lastServerTimeMs
  totalTimeRef.current = totalTime

  const offsetRef = useRef(0)
  const roundIdRef = useRef(0)
  const haveFiredForThisRoundRef = useRef(false)
  const onReachZeroRef = useRef(onReachZero)
  onReachZeroRef.current = onReachZero

  const [displayTime, setDisplayTime] = useState(totalTime)

  useEffect(() => {
    let rafId = 0
    const tick = () => {
      const r = roundEndsAtRef.current
      const s = lastServerTimeMsRef.current
      const total = totalTimeRef.current
      if (r <= 0 || s <= 0) {
        setDisplayTime((t) => (t === total ? t : total))
        rafId = requestAnimationFrame(tick)
        return
      }
      if (roundIdRef.current !== r) {
        roundIdRef.current = r
        offsetRef.current = s - Date.now()
        haveFiredForThisRoundRef.current = false
      }
      const value = (r - Date.now() - offsetRef.current) / 1000
      const clamped = Math.max(0, value)
      setDisplayTime(clamped)
      if (value <= 0 && !haveFiredForThisRoundRef.current) {
        haveFiredForThisRoundRef.current = true
        onReachZeroRef.current?.()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (roundEndsAt <= 0 || lastServerTimeMs <= 0) return totalTime
  return displayTime
}

export interface GameBoardPlayer {
  id: string
  name: string
  lives: number
  hearts?: number
  crown: boolean
  hasBomb: boolean
  isYou: boolean
  x?: number
  y?: number
}

export interface GameBoardProps {
  players: GameBoardPlayer[]
  prompt: string
  timeRemaining: number
  totalTime: number
  /** Server: Unix ms when round ends; 0 when no active round. */
  roundEndsAt: number
  /** Server: Unix ms when roundEndsAt was set; used with roundEndsAt to correct client clock skew. */
  lastServerTimeMs: number
  bombHolderSessionId: string
  hostSessionId: string
  mySessionId: string
  exploded?: boolean
  /** Called once when bomb timer hits 0; payload has bomb holder id and position for explosion/shake. */
  onExploded?: (payload: OnExplodedPayload) => void
  /** When set, the avatar with this id plays a short shake (bomb holder when timer hits 0). */
  shakingPlayerId?: string | null
  /** When true, board fills container (100% height); otherwise 60vh */
  fullHeight?: boolean
  /** When true, hide prompt/bomb/arrow so only UserCircle shows (e.g. post-game while death animation plays). */
  postGame?: boolean
}

export function GameBoard({
  players,
  prompt,
  timeRemaining,
  totalTime,
  roundEndsAt,
  lastServerTimeMs,
  bombHolderSessionId,
  mySessionId: _mySessionId,
  exploded = false,
  onExploded,
  shakingPlayerId,
  fullHeight = false,
  postGame = false,
}: GameBoardProps) {
  const [localExploded, setLocalExploded] = useState(exploded)
  const [roundKey, setRoundKey] = useState(0)
  const prevTimeRef = useRef(timeRemaining)
  const onExplodedPayloadRef = useRef<OnExplodedPayload | null>(null)
  useEffect(() => {
    const prev = prevTimeRef.current
    prevTimeRef.current = timeRemaining
    // New round: timer jumped up (e.g. 0 -> 15 after timeout reset on server)
    if (timeRemaining > prev || (prev <= 1 && timeRemaining >= totalTime - 1)) {
      setRoundKey((k) => k + 1)
    }
  }, [timeRemaining, totalTime])
  const onReachZero = useCallback(() => {
    const payload = onExplodedPayloadRef.current
    console.log('[EXPLODE] GameBoard onReachZero called', {
      hasPayload: !!payload,
      payload: payload ? { bombHolderId: payload.bombHolderId, hasPositionPx: !!payload.positionPx, sizePx: payload.sizePx } : null,
      hasOnExploded: !!onExploded,
    })
    if (payload) {
      onExploded?.(payload)
    } else {
      console.warn('[EXPLODE] GameBoard onReachZero: no payload ref, skipping onExploded')
    }
  }, [onExploded])
  const displayTimeRemaining = useRoundEndsAtTimer(roundEndsAt, lastServerTimeMs, totalTime, onReachZero)

  useEffect(() => {
    setLocalExploded(exploded)
  }, [exploded])

  const boardRef = useRef<HTMLDivElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const [radiusYPercent, setRadiusYPercent] = useState<number | undefined>(undefined)
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setBoardSize({ w: rect.width, h: rect.height })
        setRadiusYPercent(rect.width > rect.height ? 44 * (rect.height / rect.width) : undefined)
      }
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    const raf = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const circlePlayers: UserCirclePlayer[] = withDisplayHearts(
    players.map((p) => ({
      id: p.id,
      name: p.name,
      lives: p.lives,
      crown: p.crown,
      hasBomb: p.hasBomb,
      isYou: p.isYou,
    }))
  )

  const radiusPercent = 44
  const bombHolderIndex = players.findIndex((p) => p.id === bombHolderSessionId)
  const arrowPositions = getProfileCircleCenterPositions(players.length, radiusPercent, radiusYPercent)
  const arrowPositionsPx =
    boardSize.w > 0 && boardSize.h > 0
      ? getPlayerPositionsPx(players.length, boardSize.w, boardSize.h, radiusPercent, radiusYPercent)
      : []
  const arrowContainerSize = boardSize.w > 0 && boardSize.h > 0 ? boardSize : undefined
  const avatarSizePx = getAvatarSizePx(Math.min(boardSize.w, boardSize.h), players.length)
  const positionPx = bombHolderIndex >= 0 && arrowPositionsPx[bombHolderIndex]
  onExplodedPayloadRef.current = {
    bombHolderId: bombHolderSessionId,
    positionPx: positionPx ?? undefined,
    sizePx: avatarSizePx,
  }
  return (
    <div
      ref={boardRef}
      style={{
        width: '100%',
        height: fullHeight ? '100%' : '60vh',
        minHeight: fullHeight ? '100%' : '60vh',
        background: 'radial-gradient(ellipse at 40% 30%, #1a2535 0%, #0d1520 60%, #080e18 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Nunito',sans-serif",
        borderRadius: fullHeight ? 0 : 'var(--radius)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
          pointerEvents: 'none',
        }}
      />

      {!postGame && <PromptComponent prompt={prompt} />}

      {/* Arrow from center to current turn — hidden in post-game so only circle + animation show */}
      {!postGame && arrowPositions.length > 0 && bombHolderIndex >= 0 && (
        <Arrow
          positions={arrowPositions}
          targetIndex={bombHolderIndex}
          positionsPx={arrowPositionsPx}
          containerSize={arrowContainerSize}
          radiusPercent={radiusPercent}
          radiusYPercent={radiusYPercent}
        />
      )}

      {/* Center: Bomb — hidden in post-game */}
      {!postGame && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 8,
          }}
        >
          <Bomb
            key={roundKey}
            timeLeft={displayTimeRemaining}
            totalTime={totalTime}
            exploded={localExploded}
          />
        </div>
      )}

      {/* Zero-height mount for portaled avatars; UserCircle measures board (parent) for layout */}
      <div ref={playerContainerRef} style={{ position: 'absolute', width: '100%', height: 0, top: 0, left: 0 }} />
      <UserCircle
        players={circlePlayers}
        containerRef={playerContainerRef}
        radiusPercent={radiusPercent}
        radiusYPercent={radiusYPercent}
        shakingPlayerId={shakingPlayerId}
      />
    </div>
  )
}
