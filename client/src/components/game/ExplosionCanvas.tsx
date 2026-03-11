/**
 * Canvas-based explosion sprite-sheet renderer.
 *
 * Why canvas: we avoid re-rendering the React tree every frame. One rAF loop
 * updates and draws all active explosions; only state changes (add/remove
 * explosions) trigger React re-renders. Suitable for many simultaneous
 * explosions in a game.
 *
 * Frame slicing: we use drawImage with source rectangle (sx, sy, sw, sh).
 * For a horizontal strip, frame N has sx = N * (imageWidth / totalFrames),
 * sy = 0, sw = frameWidth, sh = imageHeight. We compute the current frame
 * from elapsed time and FPS so timing is delta-time based and stable.
 */

import { useEffect, useRef, useState } from 'react'
import {
  type ExplosionInstance,
  EXPLOSION_TOTAL_FRAMES,
  EXPLOSION_DEFAULT_FPS,
  getExplosionFrameIndex,
  getExplosionSourceRect,
} from '@/lib/explosionAnimation'

export interface ExplosionCanvasProps {
  /** List of active explosions to draw; instances are removed via onComplete. */
  explosions: ExplosionInstance[]
  /** Called when an explosion has finished (played all frames). Remove it from state here. */
  onComplete: (id: string) => void
  /** Sprite sheet image URL (horizontal strip, 17 frames). */
  spriteUrl: string
  /** Default pixel size of one frame (display size before scale). */
  frameSize?: number
  /** Optional CSS for the canvas container (e.g. position absolute, pointer-events none). */
  style?: React.CSSProperties
  /** Optional className for the canvas container. */
  className?: string
}

const DEFAULT_FRAME_SIZE = 80

export function ExplosionCanvas({
  explosions,
  onComplete,
  spriteUrl,
  frameSize = DEFAULT_FRAME_SIZE,
  style,
  className,
}: ExplosionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const completedIdsRef = useRef<Set<string>>(new Set())

  // Load sprite sheet once
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }
    img.src = spriteUrl
    return () => {
      imageRef.current = null
      setImageLoaded(false)
    }
  }, [spriteUrl])

  // Single requestAnimationFrame loop: draw all explosions, call onComplete for finished ones
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded || !imageRef.current) return

    const img = imageRef.current
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight
    const totalFrames = EXPLOSION_TOTAL_FRAMES

    let rafId = 0
    const tick = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx || !img) {
        rafId = requestAnimationFrame(tick)
        return
      }

      const now = performance.now()
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      for (const exp of explosions) {
        const fps = exp.fps ?? EXPLOSION_DEFAULT_FPS
        const frameIndex = getExplosionFrameIndex(exp.startTime, fps, totalFrames, now)

        if (frameIndex >= totalFrames) {
          if (!completedIdsRef.current.has(exp.id)) {
            completedIdsRef.current.add(exp.id)
            onComplete(exp.id)
          }
          continue
        }

        const { sx, sy, sw, sh } = getExplosionSourceRect(imgW, imgH, frameIndex, totalFrames)
        const size = exp.sizePx ?? frameSize * (exp.scale ?? 1)
        const half = size / 2
        const opacity = exp.opacity ?? 1
        const rotation = (exp.rotation ?? 0) * (Math.PI / 180)

        ctx.save()
        ctx.globalAlpha = opacity
        ctx.translate(exp.x, exp.y)
        ctx.rotate(rotation)
        ctx.drawImage(img, sx, sy, sw, sh, -half, -half, size, size)
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [explosions, imageLoaded, frameSize, onComplete])

  // Resize canvas to match container (1:1 CSS pixels for simplicity)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const resize = () => {
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()
    return () => ro.disconnect()
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }} className={className}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        width={1}
        height={1}
        aria-hidden
      />
    </div>
  )
}
