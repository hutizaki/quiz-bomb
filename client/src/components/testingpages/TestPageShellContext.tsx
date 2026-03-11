import { createContext, useCallback, useContext, useRef } from 'react'
import { useExplosionManager } from '@/lib/explosionAnimation'
import { runLoseHeartEffects } from '@/lib/loseHeart'
import { playExplosionSound } from '@/lib/playExplosionSound'
import { TEST_PLAYER_ID } from '@/lib/testGameBridge'

/** Default avatar size when test page doesn't set it (matches UserAvatar default). */
export const DEFAULT_AVATAR_SIZE_PX = 55

/** Default scale factor (e.g. 1 = no scaling; 5 = test page scale(5) so explosion matches). */
export const DEFAULT_EXPLOSION_SCALE = 1

/** Context so test pages can report profile circle size and optional display scale; explosion respects both. */
export const ExplosionAvatarSizeContext = createContext<{
  avatarSizePx: number
  setAvatarSizePx: (n: number) => void
  scaleFactor: number
  setScaleFactor: (n: number) => void
}>({
  avatarSizePx: DEFAULT_AVATAR_SIZE_PX,
  setAvatarSizePx: () => {},
  scaleFactor: DEFAULT_EXPLOSION_SCALE,
  setScaleFactor: () => {},
})

export function useExplosionAvatarSize(): [
  number,
  (n: number) => void,
  number,
  (n: number) => void
] {
  const { avatarSizePx, setAvatarSizePx, scaleFactor, setScaleFactor } = useContext(
    ExplosionAvatarSizeContext
  )
  return [avatarSizePx, setAvatarSizePx, scaleFactor, setScaleFactor]
}

/**
 * Optional context provided by test pages that own avatar/hearts state. When set,
 * the shell calls this handler on Explode (after runLoseHeartEffects) so the same
 * state that drives UserAvatar updates — direct connection, no ref registration.
 * Provide this above TestPageShell so triggerExplode updates the right state.
 */
export const TestLoseHeartContext = createContext<(() => void) | null>(null)

/**
 * Context for test pages: when Explode is pressed, the shell runs runLoseHeartEffects
 * (sound + explosion + shake stub) then calls the lose-heart handler (from
 * TestLoseHeartContext if provided, else the ref registered via setOnExplode).
 */
export const ExplosionOnExplodeContext = createContext<{
  setOnExplode: (fn: (() => void) | null) => void
  triggerExplode: () => void
}>({
  setOnExplode: () => {},
  triggerExplode: () => {},
})

export function useExplosionOnExplode(): [(fn: (() => void) | null) => void, () => void] {
  const { setOnExplode, triggerExplode } = useContext(ExplosionOnExplodeContext)
  return [setOnExplode, triggerExplode]
}

/**
 * Hook that provides state and handlers for the test shell's explosion/lose-heart flow.
 * Used only by TestPageShell. Prefers onLoseHeartFromContext (from TestLoseHeartContext)
 * so the test page's state that drives UserAvatar updates directly when Explode is pressed.
 */
export function useTestPageShellExplosion(
  avatarSizePx: number,
  scaleFactor: number,
  onLoseHeartFromContext: (() => void) | null
) {
  const onExplodeRef = useRef<(() => void) | null>(null)
  const setOnExplode = useCallback((fn: (() => void) | null) => {
    onExplodeRef.current = fn
  }, [])
  const { explosions, spawnExplosion, onComplete } = useExplosionManager()

  const triggerExplode = useCallback(() => {
    const x = window.innerWidth / 2
    const y = window.innerHeight / 2
    const sizePx = avatarSizePx * scaleFactor
    const playerId = TEST_PLAYER_ID
    try {
      runLoseHeartEffects(playerId, { x, y }, sizePx, {
        playSound: playExplosionSound,
        spawnExplosion: (opts) => spawnExplosion(opts),
      })
    } catch (e) {
      console.warn('[Explode] runLoseHeartEffects failed:', e)
    }
    const applyLoseHeart = onLoseHeartFromContext ?? onExplodeRef.current
    try {
      applyLoseHeart?.()
    } catch (e) {
      console.warn('[Explode] onLoseHeart callback failed:', e)
    }
  }, [avatarSizePx, scaleFactor, spawnExplosion, onLoseHeartFromContext])

  return { explosions, spawnExplosion, onComplete, setOnExplode, triggerExplode }
}
