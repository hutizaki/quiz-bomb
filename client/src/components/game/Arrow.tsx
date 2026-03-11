import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode, RefObject } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import bombArrowSvg from '../../assets/BombArrow.svg'
import type { PositionPx } from './UserCircle'
import { distance, getEllipseRadiiPx, getRadiusAtAngle } from './ellipse'

/**
 * Percent position [x, y] 0–100 (legacy / when no containerSize).
 * Turn order is counter-clockwise: index 0 → 1 → 2 → …
 */
export type CirclePosition = [number, number]

export interface ArrowProps {
  /** Percent positions (0–100). Ignored when positionsPx + containerSize are provided. */
  positions: CirclePosition[]
  /** Index of the player whose turn it is (bomb holder). Arrow points from center to this position. */
  targetIndex: number
  /** When set, arrow uses pixel positioning to align with UserCircle. Same order as positions. */
  positionsPx?: PositionPx[]
  /** Container size in px. Required when using positionsPx. */
  containerSize?: { w: number; h: number }
  /** Container to portal into (same as UserCircle). When provided, arrow renders inside this node. */
  containerRef?: RefObject<HTMLDivElement | null>
  /** Center in percent (default [50, 50]). Only used when not in pixel mode. */
  center?: [number, number]
  /** Length as fraction of distance to target. Ignored when radiusScale is set. */
  lengthFraction?: number
  /**
   * When set, arrow tip is on a smaller concentric ellipse (same shape as UserCircle).
   * Arrow length = radiusScale * distance to avatar, so it grows/shrinks with the layout.
   * e.g. 0.85 = tip at 85% of the way from center to avatar.
   */
  radiusScale?: number
  /**
   * In pixel mode: arrow length = (distance to guide/avatar ellipse) - ellipseOffsetPx.
   * Offset 0 = arrow touches the guide all the way around; >0 = shortens by that many px.
   */
  ellipseOffsetPx?: number
  /**
   * When set with containerSize, arrow length follows the ellipse (same as the bounded sweep):
   * length = radius at current angle, so the tip stays on the inner ellipse. Angle animates to target and stops when pointing at target.
   */
  radiusPercent?: number
  radiusYPercent?: number
  className?: string
}

const ARROW_HEIGHT = 72
/** Default: arrow shortens this many px from the guide. Use 0 for arrow to touch the guide ellipse. Export so test page can sync arrow-tip guide. */
export const DEFAULT_ELLIPSE_OFFSET_PX = 50

/** Normalize angle delta to (-180, 180] so rotation takes the shortest path. */
function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  let delta = toDeg - fromDeg
  while (delta > 180) delta -= 360
  while (delta <= -180) delta += 360
  return delta
}

export function Arrow({
  positions,
  targetIndex,
  positionsPx,
  containerSize,
  containerRef,
  center = [50, 50],
  lengthFraction = 0.85,
  radiusScale,
  ellipseOffsetPx = DEFAULT_ELLIPSE_OFFSET_PX,
  radiusPercent,
  radiusYPercent,
  className = '',
}: ArrowProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const prevAngleRef = useRef<number | null>(null)
  const displayAngleMotion = useMotionValue(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!containerRef) return
    const schedule = () => {
      if (containerRef.current) setPortalTarget(containerRef.current)
    }
    schedule()
    const raf = requestAnimationFrame(schedule)
    return () => cancelAnimationFrame(raf)
  }, [containerRef])

  const usePx = positionsPx && containerSize && positionsPx.length > 0 && containerSize.w > 0 && containerSize.h > 0
  const useRadiusScale = radiusScale != null
  const useBoundedLength = usePx && radiusPercent != null

  const { rxInner, ryInner } =
    useBoundedLength && containerSize
      ? (() => {
          const { rx, ry } = getEllipseRadiiPx(containerSize.w, containerSize.h, radiusPercent!, radiusYPercent)
          return { rxInner: Math.max(0, rx - ellipseOffsetPx), ryInner: Math.max(0, ry - ellipseOffsetPx) }
        })()
      : { rxInner: 0, ryInner: 0 }
  const lengthMotion = useTransform(displayAngleMotion, (deg) =>
    rxInner > 0 || ryInner > 0 ? Math.max(getRadiusAtAngle((deg * Math.PI) / 180, rxInner, ryInner), 10) : 10
  )

  useEffect(() => {
    if (!useBoundedLength || !positionsPx || !containerSize || targetIndex < 0 || targetIndex >= positionsPx.length)
      return
    const target = positionsPx[targetIndex]
    const cx = containerSize.w / 2
    const cy = containerSize.h / 2
    const targetAngleDeg = (Math.atan2(target.y - cy, target.x - cx) * 180) / Math.PI
    if (!initializedRef.current || prevAngleRef.current === null) {
      displayAngleMotion.set(targetAngleDeg)
      prevAngleRef.current = targetAngleDeg
      initializedRef.current = true
      return
    }
    const currentAngle = displayAngleMotion.get()
    const newTarget = currentAngle + shortestAngleDelta(currentAngle, targetAngleDeg)
    const controls = animate(displayAngleMotion, newTarget, {
      type: 'tween',
      duration: 0.2,
      ease: 'linear',
      onComplete: () => {
        prevAngleRef.current = newTarget
      },
    })
    return () => controls.stop()
  }, [useBoundedLength, targetIndex])

  let content: ReactNode = null

  if (usePx) {
    const { w, h } = containerSize
    const cx = w / 2
    const cy = h / 2
    const target = targetIndex >= 0 && targetIndex < positionsPx.length ? positionsPx[targetIndex] : null
    if (target) {
      const targetAngleDeg = (Math.atan2(target.y - cy, target.x - cx) * 180) / Math.PI

      if (useBoundedLength) {
        content = (
          <motion.div
            className={className}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              height: ARROW_HEIGHT,
              transformOrigin: '0 50%',
              transform: 'translate(0, -50%)',
              zIndex: 5,
              rotate: displayAngleMotion,
              width: lengthMotion,
            }}
          >
            <img
              src={bombArrowSvg}
              alt=""
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'left center',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )
      } else {
        const displayAngleDeg =
          prevAngleRef.current === null
            ? targetAngleDeg
            : prevAngleRef.current + shortestAngleDelta(prevAngleRef.current, targetAngleDeg)
        prevAngleRef.current = displayAngleDeg
        const guideDistPx = distance(cx, cy, target.x, target.y)
        const lengthPx =
          useRadiusScale
            ? Math.max(guideDistPx * radiusScale! - ellipseOffsetPx, 10)
            : Math.max(guideDistPx - ellipseOffsetPx, 10)
        content = (
          <motion.div
            className={className}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              height: ARROW_HEIGHT,
              transformOrigin: '0 50%',
              transform: 'translate(0, -50%)',
              zIndex: 5,
            }}
            initial={{ rotate: displayAngleDeg, width: lengthPx }}
            animate={{ rotate: displayAngleDeg, width: lengthPx }}
            transition={{ type: 'tween', duration: 0.2, ease: 'linear' }}
          >
            <img
              src={bombArrowSvg}
              alt=""
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'left center',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )
      }
    }
  } else {
    const [cx, cy] = center
    const target = targetIndex >= 0 && targetIndex < positions.length ? positions[targetIndex] : null
    if (target) {
      const [toX, toY] = target
      const dx = toX - cx
      const dy = toY - cy
      const targetAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      const displayAngleDeg =
        prevAngleRef.current === null
          ? targetAngleDeg
          : prevAngleRef.current + shortestAngleDelta(prevAngleRef.current, targetAngleDeg)
      prevAngleRef.current = displayAngleDeg
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = useRadiusScale ? radiusScale! : lengthFraction
      const length = Math.max(dist * scale, 10)
      content = (
        <motion.div
          className={className}
          style={{
            position: 'absolute',
            left: `${cx}%`,
            top: `${cy}%`,
            height: ARROW_HEIGHT,
            transformOrigin: '0% 50%',
            zIndex: 5,
          }}
          initial={{ rotate: displayAngleDeg, width: `${length}%`, y: '-50%' }}
          animate={{
            rotate: displayAngleDeg,
            width: `${length}%`,
            y: '-50%',
          }}
          transition={{
            type: 'tween',
            duration: 0.2,
            ease: 'linear',
          }}
        >
          <img
            src={bombArrowSvg}
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left center',
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      )
    }
  }

  if (!content) return null
  if (containerRef && portalTarget) return createPortal(content, portalTarget)
  return content
}
