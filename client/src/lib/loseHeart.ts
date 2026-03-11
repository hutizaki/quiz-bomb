/**
 * Lose-heart state and animation helpers.
 * Centralizes heart/lives display logic and state updates so GameBoard and
 * UserCircle stay thin and consistent.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal player shape for heart helpers; compatible with GameBoardPlayer / UserCirclePlayer */
export interface PlayerWithHearts {
  id: string
  lives?: number
  hearts?: number
}

// ─── Display / resolution ────────────────────────────────────────────────────

/** Default heart count when not specified (e.g. start of round). */
export const DEFAULT_HEARTS = 3

/**
 * Resolve display heart count: prefers hearts, then lives, then DEFAULT_HEARTS.
 * Use this when mapping server players to circle/avatar display so UI is consistent.
 */
export function getDisplayHearts(player: PlayerWithHearts): number {
  const h = player.hearts
  if (h !== undefined && h !== null) return Math.max(0, h)
  const l = player.lives
  if (l !== undefined && l !== null) return Math.max(0, l)
  return DEFAULT_HEARTS
}

/** True when the player has no hearts to show (grayed out / scaled down avatar). */
export function hasZeroHearts(player: PlayerWithHearts): boolean {
  return getDisplayHearts(player) === 0
}

/**
 * Map an array of players to display hearts (e.g. for UserCircle).
 * Use in GameBoard when building circlePlayers so one place owns the rule.
 */
export function withDisplayHearts<T extends PlayerWithHearts>(
  players: T[]
): (T & { hearts: number })[] {
  return players.map((p) => ({ ...p, hearts: getDisplayHearts(p) }))
}

// ─── State updates ────────────────────────────────────────────────────────────

/**
 * Set a single player's heart count by id.
 * Returns a new array; does not mutate.
 */
export function setPlayerHearts<T extends PlayerWithHearts>(
  players: T[],
  id: string,
  hearts: number
): T[] {
  const value = Math.max(0, hearts)
  return players.map((p) => (p.id === id ? { ...p, hearts: value } : p))
}

/**
 * Add delta to a player's hearts (e.g. -1 for lose heart).
 * Clamps to >= 0. Returns a new array; does not mutate.
 */
export function addPlayerHearts<T extends PlayerWithHearts>(
  players: T[],
  id: string,
  delta: number
): T[] {
  return players.map((p) =>
    p.id === id
      ? { ...p, hearts: Math.max(0, (p.hearts ?? p.lives ?? DEFAULT_HEARTS) + delta) }
      : p
  )
}

/**
 * Remove one heart from a player. Convenience for addPlayerHearts(players, id, -1).
 */
export function removePlayerHeart<T extends PlayerWithHearts>(
  players: T[],
  id: string
): T[] {
  return addPlayerHearts(players, id, -1)
}

// ─── Animation ────────────────────────────────────────────────────────────────

/** Duration (ms) for a "just lost heart" visual (e.g. pulse or flash). */
export const LOSE_HEART_ANIMATION_MS = 600

/**
 * Whether we're still inside the "just lost heart" window.
 * Use with a timestamp from when the heart was lost to drive CSS or state.
 */
export function isInLoseHeartWindow(lostAt: number | null, now: number = Date.now()): boolean {
  if (lostAt == null) return false
  return now - lostAt < LOSE_HEART_ANIMATION_MS
}

// ─── Lose-heart effects (bomb ran out) ────────────────────────────────────────

/** Custom event dispatched by runLoseHeartEffects so the app can show avatar shake. Listen on window. */
export const LOSE_HEART_SHAKE_EVENT = 'quizbomb-lose-heart-shake'

/** Options for runLoseHeartEffects. Server handles actual heart subtract; this runs client-only effects. */
export interface LoseHeartEffectsOptions {
  /** Play explosion sound (call playExplosionSound). */
  playSound?: () => void
  /** Spawn explosion sprite at the given position/size (e.g. on bomb holder avatar). */
  spawnExplosion?: (opts: { x: number; y: number; sizePx: number }) => void
}

/**
 * Run all client-side lose-heart effects when the bomb runs out.
 * Call this from onExploded (GameBoard). Does not update player state — server sends that.
 * - Play explosion sound
 * - Spawn explosion animation at position
 * - Dispatches LOSE_HEART_SHAKE_EVENT so the app can shake the bomb holder's avatar
 */
export function runLoseHeartEffects(
  playerId: string,
  positionPx: { x: number; y: number } | undefined,
  sizePx: number,
  options: LoseHeartEffectsOptions
): void {
  console.log('[EXPLODE] runLoseHeartEffects entered', {
    playerId,
    hasPositionPx: !!positionPx,
    sizePx,
    hasPlaySound: !!options.playSound,
    hasSpawnExplosion: !!options.spawnExplosion,
  })
  if (options.playSound) {
    console.log('[EXPLODE] runLoseHeartEffects calling playSound')
    options.playSound()
  }
  if (positionPx && options.spawnExplosion) {
    console.log('[EXPLODE] runLoseHeartEffects calling spawnExplosion', positionPx)
    options.spawnExplosion({ x: positionPx.x, y: positionPx.y, sizePx })
  } else if (!positionPx) {
    console.warn('[EXPLODE] runLoseHeartEffects skipped spawnExplosion: no positionPx')
  }
  if (typeof window !== 'undefined') {
    console.log('[EXPLODE] runLoseHeartEffects dispatching LOSE_HEART_SHAKE_EVENT', { playerId })
    window.dispatchEvent(new CustomEvent(LOSE_HEART_SHAKE_EVENT, { detail: { playerId } }))
  }
}
