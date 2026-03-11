/**
 * Colyseus lobby replica for test pages: same state shape and join/leave semantics
 * as server GameRoom, so test UI can drive and read game state the same way as Play.
 */

export const LOBBY_OWNER_ID = 'lobby-owner'

const INITIAL_LIVES = 3
const MAX_PLAYERS = 8

export interface TestPlayerState {
  sessionId: string
  name: string
  lives: number
  score: number
}

export interface TestLobbyState {
  phase: 'LOBBY' | 'PLAYING'
  hostSessionId: string
  bombHolderSessionId: string
  /** Map-like: forEach(cb), get(), set(), delete(), size. Play.tsx iterates with forEach or values. */
  players: Map<string, TestPlayerState>
}

let joinCounter = 0

function nextSessionId(): string {
  joinCounter += 1
  return `join-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface TestLobbyRoom {
  id: string
  sessionId: string
  state: TestLobbyState
  onStateChange: (callback: () => void) => void
  onLeave: (callback: () => void) => void
  removeAllListeners: () => void
  send: (type: string, payload?: unknown) => void
  /** Simulate a client joining the lobby (mirrors GameRoom.onJoin). */
  join: (nickname: string) => void
  /** Simulate a client leaving (mirrors GameRoom.onLeave). Lobby owner cannot leave. */
  leave: (sessionId: string) => void
  /** Notify subscribers after external state mutation (e.g. lose heart). */
  notifyStateChange: () => void
}

export function createTestLobbyRoom(): TestLobbyRoom {
  const players = new Map<string, TestPlayerState>()
  players.set(LOBBY_OWNER_ID, {
    sessionId: LOBBY_OWNER_ID,
    name: 'Lobby Owner',
    lives: INITIAL_LIVES,
    score: 0,
  })

  const state: TestLobbyState = {
    phase: 'LOBBY',
    hostSessionId: LOBBY_OWNER_ID,
    bombHolderSessionId: '',
    players,
  }

  const stateChangeListeners: Array<() => void> = []
  const leaveListeners: Array<() => void> = []

  const room: TestLobbyRoom = {
    id: 'TEST',
    sessionId: LOBBY_OWNER_ID,
    state,
    onStateChange(callback: () => void) {
      stateChangeListeners.push(callback)
    },
    onLeave(callback: () => void) {
      leaveListeners.push(callback)
    },
    removeAllListeners() {
      stateChangeListeners.length = 0
      leaveListeners.length = 0
    },
    send() {
      // no-op for test lobby
    },
    join(nickname: string) {
      if (state.players.size >= MAX_PLAYERS) return
      const sessionId = nextSessionId()
      const name = (nickname || `Player_${String(joinCounter).padStart(4, '0')}`).trim().slice(0, 20) || `Player_${sessionId.slice(-4)}`
      state.players.set(sessionId, {
        sessionId,
        name,
        lives: INITIAL_LIVES,
        score: 0,
      })
      stateChangeListeners.forEach((cb) => cb())
    },
    leave(sessionId: string) {
      if (sessionId === LOBBY_OWNER_ID) return
      state.players.delete(sessionId)
      if (state.hostSessionId === sessionId && state.players.size > 0) {
        const nextHost = state.players.keys().next().value as string
        state.hostSessionId = nextHost
      }
      stateChangeListeners.forEach((cb) => cb())
    },
    notifyStateChange() {
      stateChangeListeners.forEach((cb) => cb())
    },
  }

  return room
}

/**
 * Convert replica state.players to the shape Play uses (array from Map).
 * Mirrors Play.tsx extraction of players from room.state.
 */
export function getPlayersFromReplicaState(state: TestLobbyState): TestPlayerState[] {
  const list: TestPlayerState[] = []
  state.players.forEach((p) => list.push(p))
  return list
}
