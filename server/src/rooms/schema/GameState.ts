import { Schema, type, MapSchema } from '@colyseus/schema'

export class PlayerState extends Schema {
  @type('string') sessionId = ''
  @type('string') name = ''
  @type('number') lives = 3
  @type('number') score = 0
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  @type('string') phase = 'LOBBY'
  @type('string') prompt = ''
  @type('number') timerRemaining = 0
  @type('number') roundTimeSeconds = 15
  @type('number') roundEndsAt = 0
  @type('number') lastServerTimeMs = 0
  @type('string') bombHolderSessionId = ''
  @type('string') hostSessionId = ''
  /** Number of hearts/lives each player gets at join and after game end. Host can change in lobby. */
  @type('number') initialLives = 3
  /** Current word being typed by the bomb holder; synced to all clients so everyone sees the same letters. */
  @type('string') currentWordInProgress = ''
  /** Game mode: 'prompt' = word-bomb with letter prompts; 'qa' = Q&A with custom questions. Host can change in lobby. */
  @type('string') gameMode = 'prompt'
  /** When true, if everyone misses and bomb returns to starter, game pauses and shows answer until "Next question". */
  @type('boolean') learningMode = false
  /** True while paused in learning mode (showing revealed answer; waiting for next_question). */
  @type('boolean') learningModePaused = false
  /** When learningModePaused, the first correct answer to show in green. */
  @type('string') revealedAnswer = ''
}
