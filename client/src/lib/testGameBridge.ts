/**
 * Test-game bridge: align test pages with live game behavior.
 *
 * Pattern: wire test UI (buttons, etc.) to the same functions the live game uses.
 * - Live game: Colyseus sends state; client runs runLoseHeartEffects, removePlayerHeart
 *    is reflected in server state.
 * - Test pages: buttons call the same runLoseHeartEffects (and optionally the same
 *    state updaters like removePlayerHeart) with local/fake state so we exercise the
 *    same code paths and state shapes.
 *
 * Do:
 * - Call runLoseHeartEffects from test Explode (same as Play's onExploded).
 * - Use removePlayerHeart / addPlayerHearts from loseHeart for "subtract heart" in tests.
 * - Use the same types (GameBoardPlayer, UserCirclePlayer, etc.) for test state.
 * Do not:
 * - Duplicate effect logic (sound, explosion) in test code; use the shared functions.
 *
 * Extend this module with useTestGameState(), fake timer, etc., so multiple test
 * pages can share a single "fake game" state and trigger the same actions as the
 * live game.
 *
 * Wiring Explode -> avatar/hearts UI:
 * - Test page holds the state that is passed to UserAvatar (profile circle + hearts).
 * - Test page registers setOnExplode(callback) where callback updates that state
 *   (e.g. removePlayerHeart). When Explode is pressed, runLoseHeartEffects runs
 *   then callback(); the state update re-renders UserAvatar so the DOM updates.
 */

import type { UserCirclePlayer } from '@/components/game'

/** Placeholder player id for test-only flows (e.g. single-avatar Explode). */
export const TEST_PLAYER_ID = 'test-player'

/** Same initial lives as server GameRoom. */
const INITIAL_LIVES = 3

let joinCounter = 0

/**
 * Simulates the game state change when a player joins a lobby (mirrors server GameRoom.onJoin).
 * Use for test UI "+ Add player" / "Join lobby" so test state matches live join semantics.
 */
export function simulateJoinLobby(
  currentPlayers: UserCirclePlayer[],
  nickname?: string
): UserCirclePlayer[] {
  joinCounter += 1
  const name = (nickname ?? `Player_${String(joinCounter).padStart(4, '0')}`).trim().slice(0, 20) || `Player_${joinCounter}`
  const id = `join-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const newPlayer: UserCirclePlayer = {
    id,
    name,
    lives: INITIAL_LIVES,
    hearts: INITIAL_LIVES,
    crown: false,
  }
  return [...currentPlayers, newPlayer]
}
