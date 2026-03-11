/**
 * Shared ellipse/circle path math for UserCircle and Arrow.
 * Single source of truth for positions and concentric inner ellipse (arrow tip).
 */

/**
 * Parametric angle (radians) for player index i of count.
 * Single player: right side (0). Odd count: middle at bottom (π/2). Even: middle two at bottom. Two: left and right.
 */
export function getCircleAngle(i: number, count: number): number {
  if (count === 1) return 0
  if (count === 2) return i * Math.PI
  if (count % 2 === 1) return Math.PI / 2 + (i - (count - 1) / 2) * (2 * Math.PI / count)
  return Math.PI / 2 + (i - count / 2 + 0.5) * (2 * Math.PI / count)
}

/**
 * Point on ellipse at parametric angle. Optional offset (px or same units as rx, ry)
 * gives a concentric inner ellipse: pass 0 for outer (e.g. UserCircle), >0 for inner (e.g. Arrow tip).
 */
export function getPointOnEllipse(
  angle: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  offset: number = 0
): { x: number; y: number } {
  const rxo = Math.max(0, rx - offset)
  const ryo = Math.max(0, ry - offset)
  return {
    x: cx + rxo * Math.cos(angle),
    y: cy + ryo * Math.sin(angle),
  }
}

/**
 * Parametric angle for a point on the ellipse (inverse of getPointOnEllipse).
 * Use when you have a point (e.g. avatar) and need the angle for the inner ellipse.
 */
export function getParametricAngleFromPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): number {
  if (rx <= 0 || ry <= 0) return 0
  return Math.atan2((py - cy) / ry, (px - cx) / rx)
}

/**
 * Ellipse radii in pixels for a container (w, h). Same formula as UserCircle.
 * When w > h, ry is compressed for a horizontal oval.
 */
export function getEllipseRadiiPx(
  w: number,
  h: number,
  radiusPercent: number,
  radiusYPercent?: number
): { rx: number; ry: number } {
  const radiusPx = (Math.min(w, h) / 100) * radiusPercent
  const ry = radiusYPercent != null ? radiusPx * (radiusYPercent / radiusPercent) : radiusPx
  return { rx: radiusPx, ry }
}

/** Distance between (x1,y1) and (x2,y2). */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Distance from ellipse center to ellipse edge in direction angleRad (radians).
 * r(θ) = 1 / sqrt(cos²(θ)/rx² + sin²(θ)/ry²)
 */
export function getRadiusAtAngle(angleRad: number, rx: number, ry: number): number {
  if (rx <= 0 || ry <= 0) return 0
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const q = (c * c) / (rx * rx) + (s * s) / (ry * ry)
  return q <= 0 ? 0 : 1 / Math.sqrt(q)
}
