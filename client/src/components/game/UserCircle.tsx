import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import { setPlayerHearts, addPlayerHearts, removePlayerHeart } from '@/lib/loseHeart'
import { getCircleAngle, getEllipseRadiiPx, getPointOnEllipse } from './ellipse'
import { UserAvatar } from './UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserCirclePlayer {
  id: string
  name: string
  lives: number
  maxLives?: number
  hearts?: number
  crown: boolean
  hasBomb?: boolean
  isYou?: boolean
}

// Re-export heart helpers from loseHeart for backwards compatibility
export { setPlayerHearts, addPlayerHearts, removePlayerHeart }

// ─── Avatar sizing ────────────────────────────────────────────────────────────

const AVATAR_SIZE_MIN = 28
const AVATAR_SIZE_MAX = 70
const AVATAR_BASE_RATIO = 0.11

export function getAvatarSizePx(containerSizePx: number, playerCount: number): number {
  if (playerCount <= 0) return (AVATAR_SIZE_MIN + AVATAR_SIZE_MAX) / 2
  const base = containerSizePx * AVATAR_BASE_RATIO
  const scale = Math.max(0.5, Math.min(1.6, 1.6 - (playerCount - 1) * 0.08))
  return Math.round(Math.max(AVATAR_SIZE_MIN, Math.min(AVATAR_SIZE_MAX, base * scale)))
}

// ─── Position math (uses shared ellipse.ts) ─────────────────────────────────────

/** Percent position [x, y] 0–100, for Arrow and external use */
export type CirclePosition = [number, number]

/**
 * Returns percent positions (0–100) for profile circle centers on a circle/ellipse
 * centered at (50, 50). Used by Arrow and for consistency with portal px positions.
 */
export function getProfileCircleCenterPositions(
  count: number,
  radiusPercent = 44,
  radiusYPercent?: number
): CirclePosition[] {
  if (count <= 0) return []
  const rx = radiusPercent
  const ry = radiusYPercent ?? radiusPercent
  const cx = 50
  const cy = 50
  return Array.from({ length: count }, (_, i) => {
    const angle = getCircleAngle(i, count)
    const p = getPointOnEllipse(angle, cx, cy, rx, ry, 0)
    return [p.x, p.y] as CirclePosition
  })
}

export function getCirclePositions(count: number, radiusPercent = 44): CirclePosition[] {
  return getProfileCircleCenterPositions(count, radiusPercent)
}

export function getAvatarCircleCenterPositions(count: number, radiusPercent = 44): CirclePosition[] {
  return getProfileCircleCenterPositions(count, radiusPercent)
}

/** Pixel position for portal placement and Arrow alignment */
export type PositionPx = { x: number; y: number }

/**
 * Returns pixel positions for avatars on a circle/ellipse inside a rect of size (w, h).
 * Center is (w/2, h/2). Uses shared ellipse.ts for consistency with Arrow.
 */
export function getPlayerPositionsPx(
  count: number,
  w: number,
  h: number,
  radiusPercent: number,
  radiusYPercent?: number
): PositionPx[] {
  if (count <= 0 || w <= 0 || h <= 0) return []
  const cx = w / 2
  const cy = h / 2
  const { rx, ry } = getEllipseRadiiPx(w, h, radiusPercent, radiusYPercent)
  return Array.from({ length: count }, (_, i) => {
    const angle = getCircleAngle(i, count)
    return getPointOnEllipse(angle, cx, cy, rx, ry, 0)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface UserCircleProps {
  players: UserCirclePlayer[]
  /** Container to measure and portal into. When not provided, portal to body and use viewport size. */
  containerRef?: RefObject<HTMLDivElement | null>
  /** Radius as percent of min(width, height); default 44 */
  radiusPercent?: number
  /** Y radius for ellipse when wide; omit for circle */
  radiusYPercent?: number
  /** Show dashed ring + spokes (debug only) */
  showRingGuide?: boolean
  onRemove?: (id: string) => void
  /** When set, show award title (e.g. "1st", "2nd", "3rd") below the player's avatar. Key = player id. Shown in lobby after game ends until next game. */
  awardTitles?: Record<string, string> | null
  /** When set, the avatar with this id plays a short shake (e.g. on bomb explode) */
  shakingPlayerId?: string | null
}

export function UserCircle({
  players,
  containerRef,
  radiusPercent = 44,
  radiusYPercent,
  showRingGuide = false,
  onRemove,
  awardTitles,
  shakingPlayerId,
}: UserCircleProps) {
  const [rect, setRect] = useState({ w: 0, h: 0 })
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  // Resolve portal target (ref may not be set on first paint)
  useEffect(() => {
    if (!containerRef) {
      setPortalTarget(document.body)
      return
    }
    const schedule = () => {
      const el = containerRef.current
      if (el) {
        setPortalTarget(el)
        const r = el.getBoundingClientRect()
        const hasSize = r.width > 0 && r.height > 0
        const toMeasure = hasSize ? el : (el.parentElement ?? el)
        const rMeasure = toMeasure.getBoundingClientRect()
        if (rMeasure.width > 0 && rMeasure.height > 0) setRect({ w: rMeasure.width, h: rMeasure.height })
      }
    }
    schedule()
    const raf = requestAnimationFrame(schedule)
    return () => cancelAnimationFrame(raf)
  }, [containerRef])

  // Measure the element that defines the circle area. Use the container when it has non-zero size
  // (e.g. test pages); use the parent only when the container is zero-height (e.g. GameBoard portal).
  const getMeasureEl = () => {
    if (!portalTarget || portalTarget === document.body) return null
    const r = portalTarget.getBoundingClientRect()
    return r.width > 0 && r.height > 0 ? portalTarget : (portalTarget.parentElement ?? portalTarget)
  }
  const measureEl = getMeasureEl()

  useEffect(() => {
    if (measureEl && measureEl !== document.body) {
      const update = () => {
        const r = measureEl.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) setRect({ w: r.width, h: r.height })
      }
      update()
      const ro = new ResizeObserver(update)
      ro.observe(measureEl)
      const raf = requestAnimationFrame(update)
      return () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
      }
    }

    if (!portalTarget || portalTarget === document.body) {
      const update = () => setRect({ w: window.innerWidth, h: window.innerHeight })
      update()
      window.addEventListener('resize', update)
      const raf = requestAnimationFrame(update)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', update)
      }
    }
    return undefined
  }, [portalTarget, measureEl])

  const { w, h } = rect
  // Oval: when wide (w > h), compress Y radius so the ring is a horizontal ellipse. Use prop or derive from rect.
  const effectiveRadiusY =
    radiusYPercent ??
    (w > h ? radiusPercent * (h / w) : undefined)
  const positionsPx = getPlayerPositionsPx(players.length, w, h, radiusPercent, effectiveRadiusY)
  const avatarSizePx = getAvatarSizePx(Math.min(w, h), players.length)

  const rx = (Math.min(w, h) / 100) * radiusPercent
  const ry = effectiveRadiusY != null ? rx * (effectiveRadiusY / radiusPercent) : rx
  const cx = w / 2
  const cy = h / 2

  const portalContent = (
    <div
      style={{
        position: containerRef ? 'absolute' : 'fixed',
        inset: 0,
        width: containerRef ? undefined : '100vw',
        height: containerRef ? undefined : '100vh',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {showRingGuide && (
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: w,
            height: h,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
          <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.08)" />
          {positionsPx.map((pos, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={pos.x}
              y2={pos.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.8"
            />
          ))}
        </svg>
      )}

      {players.map((player, i) => {
        const pos = positionsPx[i]
        if (!pos) return null
        const awardTitle = awardTitles?.[player.id]
        return (
          <div
            key={player.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              zIndex: 11,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <UserAvatar player={player} avatarSizePx={avatarSizePx} onRemove={onRemove} shaking={shakingPlayerId != null && player.id === shakingPlayerId} />
            {awardTitle && (
              <span
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fbbf24',
                  textShadow: '0 0 12px rgba(251,191,36,0.8)',
                  whiteSpace: 'nowrap',
                }}
              >
                {awardTitle}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )

  if (!portalTarget) return null

  return createPortal(portalContent, portalTarget)
}
