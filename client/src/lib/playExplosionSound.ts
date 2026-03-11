/**
 * Play explosion sound when bomb runs out (lose heart).
 * Uses bundled asset from src/assets/explosion.mp3 (same pattern as typeSound) so the request
 * resolves in dev and build. If load or play ever fails, we disable and never touch audio again.
 */
import explosionSoundUrl from '@/assets/explosion.mp3'

let ctx: AudioContext | null = null
let buffer: AudioBuffer | null = null
let loadPromise: Promise<void> | null = null
/** Once set, we never try to load or play again (prevents repeated crashes from bad asset). */
let disabled = false

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || disabled) return null
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      ctx = new Ctx()
      void loadBuffer()
    }
    return ctx
  } catch {
    disabled = true
    return null
  }
}

function loadBuffer(): Promise<void> {
  if (disabled || buffer) return Promise.resolve()
  if (loadPromise) return loadPromise
  try {
    const context = getContext()
    if (!context) {
      loadPromise = Promise.resolve()
      return loadPromise
    }
    loadPromise = fetch(explosionSoundUrl)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('404'))))
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((decoded) => {
        buffer = decoded
      })
      .catch(() => {
        disabled = true
      })
    return loadPromise
  } catch {
    disabled = true
    loadPromise = Promise.resolve()
    return loadPromise
  }
}

/**
 * Preload the explosion sound buffer so the first explosion plays immediately.
 * Call when entering the game (e.g. Play page with room) so buffer is ready before first bomb.
 */
export function preloadExplosionSound(): void {
  if (typeof window === 'undefined' || disabled) return
  console.log('[EXPLODE] preloadExplosionSound called (buffer will load in background)')
  getContext()
  void loadBuffer()
}

/**
 * Play the explosion sound once. Call when bomb timer hits 0 (lose heart).
 * No-op if disabled (e.g. after a prior load/play failure). Safe to call multiple times.
 */
export function playExplosionSound(): void {
  console.log('[EXPLODE] playExplosionSound called', { disabled })
  if (disabled) return
  try {
    const context = getContext()
    console.log('[EXPLODE] playExplosionSound context', { hasContext: !!context, hasBuffer: !!buffer, contextState: context?.state })
    if (!context || !buffer) {
      if (!buffer) {
        console.log('[EXPLODE] playExplosionSound no buffer, scheduling retry after load')
        void loadBuffer().then(() => playExplosionSound())
      }
      return
    }
    if (context.state === 'suspended') {
      console.log('[EXPLODE] playExplosionSound context suspended, resuming then retrying')
      void context.resume().then(() => playExplosionSound())
      return
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const gainNode = context.createGain()
    gainNode.gain.value = 0.5
    source.connect(gainNode)
    gainNode.connect(context.destination)
    source.start(0)
    console.log('[EXPLODE] playExplosionSound started source')
  } catch (e) {
    console.warn('[EXPLODE] playExplosionSound error', e)
    disabled = true
  }
}
