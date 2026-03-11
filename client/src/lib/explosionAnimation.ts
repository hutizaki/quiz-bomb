import { useState, useCallback } from 'react'

/**
 * Explosion sprite-sheet animation model and helpers.
 *
 * Frame slicing: the sprite sheet is a single horizontal strip with TOTAL_FRAMES
 * columns. Each frame has width = imageWidth / TOTAL_FRAMES and height = imageHeight.
 * We advance frames using elapsed time and FPS so timing is stable (delta-time based).
 *
 * If the sprite sheet changes (e.g. different frame count), update TOTAL_FRAMES
 * and ensure the image asset matches (one row, N equal-width columns).
 */

export const EXPLOSION_TOTAL_FRAMES = 17
export const EXPLOSION_DEFAULT_FPS = 22

export interface ExplosionInstance {
  id: string
  x: number
  y: number
  /** When set, explosion is drawn at this size (matches profile circle). Overrides scale. */
  sizePx?: number
  scale?: number
  rotation?: number
  opacity?: number
  fps?: number
  startTime: number
}

export interface SpawnExplosionOptions {
  x: number
  y: number
  /** When set, explosion is drawn at this size (e.g. avatar circle size). Overrides scale. */
  sizePx?: number
  scale?: number
  rotation?: number
  opacity?: number
  fps?: number
}

/**
 * Compute current frame index from elapsed time and FPS.
 * Frame index is 0-based; when currentFrame >= totalFrames, animation is complete.
 *
 * Formula: currentFrame = floor(elapsedTime * fps)
 * We use elapsed time in seconds: (now - startTime) / 1000 * fps.
 */
export function getExplosionFrameIndex(
  startTime: number,
  fps: number = EXPLOSION_DEFAULT_FPS,
  totalFrames: number = EXPLOSION_TOTAL_FRAMES,
  now: number = performance.now()
): number {
  const elapsedMs = now - startTime
  const elapsedSec = elapsedMs / 1000
  const frameIndex = Math.floor(elapsedSec * fps)
  return Math.min(frameIndex, totalFrames)
}

/**
 * Returns true when the explosion has played all frames (no frame wrapping).
 */
export function isExplosionComplete(
  startTime: number,
  fps: number,
  totalFrames: number = EXPLOSION_TOTAL_FRAMES,
  now: number = performance.now()
): boolean {
  return getExplosionFrameIndex(startTime, fps, totalFrames, now) >= totalFrames
}

/**
 * Source rectangle for canvas drawImage (sprite sheet slice).
 * Horizontal strip: frame N is at sourceX = N * frameWidth, sourceY = 0.
 */
export function getExplosionSourceRect(
  imageWidth: number,
  imageHeight: number,
  frameIndex: number,
  totalFrames: number = EXPLOSION_TOTAL_FRAMES
): { sx: number; sy: number; sw: number; sh: number } {
  const frameWidth = imageWidth / totalFrames
  return {
    sx: frameIndex * frameWidth,
    sy: 0,
    sw: frameWidth,
    sh: imageHeight,
  }
}

/**
 * Generate a unique id for a new explosion instance.
 */
export function createExplosionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * React hook: manages a list of active explosions. Spawn adds an instance;
 * onComplete removes it. Colyseus should only send "explosion happened" events;
 * the client calls spawnExplosion locally to play the effect.
 */
export function useExplosionManager(): {
  explosions: ExplosionInstance[]
  spawnExplosion: (opts: SpawnExplosionOptions) => void
  onComplete: (id: string) => void
} {
  const [explosions, setExplosions] = useState<ExplosionInstance[]>([])

  const spawnExplosion = useCallback((opts: SpawnExplosionOptions) => {
    const id = createExplosionId()
    console.log('[EXPLODE] useExplosionManager spawnExplosion', { id, x: opts.x, y: opts.y, sizePx: opts.sizePx })
    setExplosions((prev) => [
      ...prev,
      {
        id,
        x: opts.x,
        y: opts.y,
        sizePx: opts.sizePx,
        scale: opts.scale,
        rotation: opts.rotation,
        opacity: opts.opacity,
        fps: opts.fps,
        startTime: performance.now(),
      },
    ])
  }, [])

  const onComplete = useCallback((id: string) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { explosions, spawnExplosion, onComplete }
}
