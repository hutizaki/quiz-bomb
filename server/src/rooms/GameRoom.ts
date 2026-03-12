import { Room, Client, Delayed } from '@colyseus/core'
import { GameState, PlayerState } from './schema/GameState.js'
import { getRandomPrompt } from '../db/wordlist.js'
import { isValidWord } from '../db/words.js'
import { persistGame } from '../db/games.js'

const INITIAL_LIVES_DEFAULT = 3
const INITIAL_LIVES_MIN = 1
const INITIAL_LIVES_MAX = 10
const MIN_PLAYERS = 1
const ROUND_TIME_MIN = 5
const ROUND_TIME_MAX = 60
const ROOM_CODE_LENGTH = 4
const MAX_CUSTOM_ROUNDS = 500
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I,O to avoid confusion
const TYPING_MAX_LENGTH = 30

const usedRoomCodes = new Set<string>()

function generateRoomCode(): string {
  let code: string
  do {
    code = ''
    for (let i = 0; i < ROOM_CODE_LENGTH; i++)
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  } while (usedRoomCodes.has(code))
  usedRoomCodes.add(code)
  return code
}

export class GameRoom extends Room<GameState> {
  private wordsUsedThisRound = new Set<string>()
  private roundStartTime = 0
  private timerInterval: Delayed | null = null
  private gameStartTime = 0
  private hostSessionId: string | null = null
  private customRounds: { prompt: string; answers: string[] }[] | null = null
  private customRoundsUsedIndices = new Set<number>()
  private currentRoundAnswers: Set<string> | null = null
  /** First answer of current round (for learning mode reveal). */
  private currentRoundFirstAnswer: string | null = null
  /** SessionId of the player who had the bomb when the current question was set; question only changes when bomb returns to them or someone gets it right */
  private questionStartedWithHolder: string | null = null

  onCreate() {
    const shortCode = generateRoomCode()
    this.roomId = shortCode
    const gs = new GameState()
    gs.initialLives = INITIAL_LIVES_DEFAULT
    this.setState(gs)
    this.setMetadata({})
    this.hostSessionId = null
    this.clock.start()

    this.onMessage('start_game', (client: Client) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      const count = this.state.players.size
      if (count < MIN_PLAYERS) return // need at least 1 player
      this.startRound()
    })

    this.onMessage('set_round_time', (client: Client, payload: { seconds?: number }) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      const sec = payload?.seconds
      const clamped = Math.round(Number(sec))
      if (!Number.isFinite(clamped) || clamped < ROUND_TIME_MIN || clamped > ROUND_TIME_MAX) return
      this.state.roundTimeSeconds = clamped
    })

    this.onMessage('set_initial_lives', (client: Client, payload: { hearts?: number }) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      const hearts = payload?.hearts
      const value = Math.round(Number(hearts))
      if (!Number.isFinite(value) || value < INITIAL_LIVES_MIN || value > INITIAL_LIVES_MAX) return
      this.state.initialLives = value
      this.state.players.forEach((p) => { p.lives = value })
    })

    this.onMessage('set_game_mode', (client: Client, payload: { mode?: string }) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      const mode = payload?.mode
      if (mode !== 'prompt' && mode !== 'qa') return
      this.state.gameMode = mode
    })

    this.onMessage('set_learning_mode', (client: Client, payload: { enabled?: boolean }) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      this.state.learningMode = payload?.enabled ?? !this.state.learningMode
    })

    this.onMessage('next_question', (_client: Client) => {
      if (this.state.phase !== 'PLAYING' || !this.state.learningModePaused) return
      this.state.learningModePaused = false
      this.state.revealedAnswer = ''
      this.questionStartedWithHolder = this.state.bombHolderSessionId
      if (this.customRounds !== null && this.customRounds.length > 0) {
        const round = this.getRandomUnusedCustomRound()
        if (round) {
          this.state.prompt = round.prompt
          this.currentRoundAnswers = new Set(round.answers.map((a) => a.trim().toLowerCase()).filter(Boolean))
          this.currentRoundFirstAnswer = round.answers[0]?.trim() ?? null
        }
      } else {
        this.state.prompt = getRandomPrompt(this.state.players.size)
        this.currentRoundAnswers = null
        this.currentRoundFirstAnswer = null
      }
      this.wordsUsedThisRound.clear()
      this.state.timerRemaining = this.state.roundTimeSeconds
      const now = Date.now()
      this.state.roundEndsAt = now + this.state.roundTimeSeconds * 1000
      this.state.lastServerTimeMs = now
      this.startTimer()
    })

    this.onMessage('set_questions', (client: Client, payload: { rounds?: { prompt: string; answers: string[] }[] }) => {
      if (this.state.phase !== 'LOBBY') return
      if (this.hostSessionId !== client.sessionId) return
      const raw = payload?.rounds
      if (!Array.isArray(raw) || raw.length === 0) return
      const rounds = raw.slice(0, MAX_CUSTOM_ROUNDS).filter(
        (r) => r && typeof r.prompt === 'string' && Array.isArray(r.answers) && r.answers.length >= 1
      )
      if (rounds.length === 0) return
      this.customRounds = rounds
      this.customRoundsUsedIndices.clear()
    })

    this.onMessage('typing_update', (client: Client, payload: { word?: string }) => {
      if (this.state.phase !== 'PLAYING') return
      if (this.state.bombHolderSessionId !== client.sessionId) return
      const raw = typeof payload?.word === 'string' ? payload.word : ''
      const sanitized = raw.trim().slice(0, TYPING_MAX_LENGTH)
      this.state.currentWordInProgress = sanitized
    })

    this.onMessage('submit_word', (client: Client, payload: { word: string }) => {
      if (this.state.phase !== 'PLAYING') return
      if (this.state.bombHolderSessionId !== client.sessionId) return
      const word = (payload?.word || '').trim()
      if (!word) return
      const player = this.state.players.get(client.sessionId)
      if (!player || player.lives <= 0) return

      this.state.currentWordInProgress = ''

      const wordLower = word.toLowerCase()

      if (this.currentRoundAnswers !== null) {
        if (!this.currentRoundAnswers.has(wordLower)) {
          this.broadcast('word_result', { sessionId: client.sessionId, success: false, reason: 'wrong' })
          return
        }
        if (this.wordsUsedThisRound.has(wordLower)) {
          this.broadcast('word_result', { sessionId: client.sessionId, success: false, reason: 'duplicate' })
          return
        }
        this.wordsUsedThisRound.add(wordLower)
        const points = Math.min(10 + word.length, 25)
        player.score += points
        this.broadcast('word_result', { sessionId: client.sessionId, success: true, word: wordLower, points })
        this.passBombToNext(true)
        return
      }

      const prompt = this.state.prompt
      if (!wordLower.includes(prompt.toLowerCase())) {
        this.broadcast('word_result', { sessionId: client.sessionId, success: false, reason: 'wrong' })
        return
      }
      if (!isValidWord(word, prompt)) {
        this.broadcast('word_result', { sessionId: client.sessionId, success: false, reason: 'invalid' })
        return
      }
      if (this.wordsUsedThisRound.has(wordLower)) {
        this.broadcast('word_result', { sessionId: client.sessionId, success: false, reason: 'duplicate' })
        return
      }

      this.wordsUsedThisRound.add(wordLower)
      const points = Math.min(10 + word.length, 25)
      player.score += points
      this.broadcast('word_result', { sessionId: client.sessionId, success: true, word: wordLower, points })
      this.passBombToNext(true)
    })
  }

  onJoin(client: Client, options: { nickname?: string }) {
    const name = (options?.nickname || `Player_${client.sessionId.slice(0, 6)}`).slice(0, 20)
    const p = new PlayerState()
    p.sessionId = client.sessionId
    p.name = name
    p.lives = this.state.initialLives
    p.score = 0
    this.state.players.set(client.sessionId, p)
    if (!this.hostSessionId) {
      this.hostSessionId = client.sessionId
      this.state.hostSessionId = client.sessionId
    }
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
    if (this.state.bombHolderSessionId === client.sessionId) this.passBombToNext(false)
    if (this.hostSessionId === client.sessionId && this.state.players.size > 0) {
      const nextHost = Array.from(this.state.players.keys())[0] as string
      this.hostSessionId = nextHost
      this.state.hostSessionId = nextHost
    }
  }

  private startRound() {
    this.customRoundsUsedIndices.clear()
    const alive = this.getAlivePlayers()
    if (alive.length === 0) {
      this.endGame(null)
      return
    }
    if (alive.length === 1) {
      this.endGame(alive[0][0] as string)
      return
    }

    this.gameStartTime = this.gameStartTime || Date.now()
    this.state.phase = 'PLAYING'
    this.state.learningModePaused = false
    this.state.revealedAnswer = ''
    this.wordsUsedThisRound.clear()
    this.state.currentWordInProgress = ''

    if (this.customRounds !== null && this.customRounds.length > 0) {
      const round = this.getRandomUnusedCustomRound()
      if (round) {
        this.state.prompt = round.prompt
        this.currentRoundAnswers = new Set(round.answers.map((a) => a.trim().toLowerCase()).filter(Boolean))
        this.currentRoundFirstAnswer = round.answers[0]?.trim() ?? null
      }
    } else {
      this.state.prompt = getRandomPrompt(this.state.players.size)
      this.currentRoundAnswers = null
      this.currentRoundFirstAnswer = null
    }

    const order = Array.from(this.state.players.keys()).filter((id: unknown) => {
      const p = this.state.players.get(id as string)
      return p && p.lives > 0
    }) as string[]
    if (order.length > 0) {
      const firstHolder = order[Math.floor(Math.random() * order.length)] as string
      this.state.bombHolderSessionId = firstHolder
      this.questionStartedWithHolder = firstHolder
    }
    this.state.timerRemaining = this.state.roundTimeSeconds
    const now = Date.now()
    this.state.roundEndsAt = now + this.state.roundTimeSeconds * 1000
    this.state.lastServerTimeMs = now
    this.startTimer()
  }

  private startTimer() {
    if (this.timerInterval) {
      this.timerInterval.clear()
      this.timerInterval = null
    }
    this.timerInterval = this.clock.setInterval(() => {
      this.state.timerRemaining = Math.max(0, this.state.timerRemaining - 1)
      if (this.state.timerRemaining <= 0) {
        if (this.timerInterval) {
          this.timerInterval.clear()
          this.timerInterval = null
        }
        this.onRoundTimeUp()
      }
    }, 1000)
  }

  private onRoundTimeUp() {
    const holder = this.state.bombHolderSessionId
    if (holder) {
      this.loseLife(holder)
      this.broadcast('word_result', { sessionId: holder, success: false, reason: 'timeout' })
    }
    this.passBombToNext(false)
  }

  private passBombToNext(fromCorrectAnswer: boolean) {
    const alive = this.getAlivePlayers()
    if (alive.length <= 1) {
      if (alive.length === 1) this.endGame(alive[0][0])
      else this.endGame(null)
      return
    }
    const order = alive.map(([id]) => id)
    const currentIndex = order.indexOf(this.state.bombHolderSessionId)
    const nextIndex = (currentIndex + 1) % order.length
    this.state.bombHolderSessionId = order[nextIndex]
    this.state.currentWordInProgress = ''
    const newHolder = this.state.bombHolderSessionId
    const shouldChangeQuestion = fromCorrectAnswer || newHolder === this.questionStartedWithHolder

    if (this.state.phase === 'PLAYING') {
      const everyoneMissed = shouldChangeQuestion && !fromCorrectAnswer && newHolder === this.questionStartedWithHolder
      if (everyoneMissed && this.state.learningMode && this.currentRoundFirstAnswer !== null) {
        if (this.timerInterval) {
          this.timerInterval.clear()
          this.timerInterval = null
        }
        this.state.learningModePaused = true
        this.state.revealedAnswer = this.currentRoundFirstAnswer
        this.state.timerRemaining = 0
        this.state.roundEndsAt = 0
        this.state.lastServerTimeMs = 0
        return
      }
      if (shouldChangeQuestion) {
        this.questionStartedWithHolder = newHolder
        if (this.customRounds !== null && this.customRounds.length > 0) {
          const round = this.getRandomUnusedCustomRound()
          if (round) {
            this.state.prompt = round.prompt
            this.currentRoundAnswers = new Set(round.answers.map((a) => a.trim().toLowerCase()).filter(Boolean))
            this.currentRoundFirstAnswer = round.answers[0]?.trim() ?? null
          }
          this.wordsUsedThisRound.clear()
        } else {
          this.state.prompt = getRandomPrompt(this.state.players.size)
          this.currentRoundAnswers = null
          this.currentRoundFirstAnswer = null
        }
      }
      this.state.timerRemaining = this.state.roundTimeSeconds
      const now = Date.now()
      this.state.roundEndsAt = now + this.state.roundTimeSeconds * 1000
      this.state.lastServerTimeMs = now
      this.startTimer()
    }
  }

  /** Picks a random custom round not yet used this game; if all used, resets and picks from full set. */
  private getRandomUnusedCustomRound(): { prompt: string; answers: string[] } | null {
    if (!this.customRounds || this.customRounds.length === 0) return null
    const len = this.customRounds.length
    let available = Array.from({ length: len }, (_, i) => i).filter((i) => !this.customRoundsUsedIndices.has(i))
    if (available.length === 0) {
      this.customRoundsUsedIndices.clear()
      available = Array.from({ length: len }, (_, i) => i)
    }
    const idx = available[Math.floor(Math.random() * available.length)]!
    this.customRoundsUsedIndices.add(idx)
    return this.customRounds[idx]!
  }

  private getAlivePlayers(): [string, PlayerState][] {
    return (Array.from(this.state.players.entries()) as [string, PlayerState][]).filter(
      ([, p]) => p.lives > 0
    )
  }

  private loseLife(sessionId: string) {
    const p = this.state.players.get(sessionId)
    if (p) {
      p.lives = Math.max(0, p.lives - 1)
      if (p.lives <= 0) {
        const alive = this.getAlivePlayers()
        if (alive.length <= 1) {
          if (alive.length === 1) this.endGame(alive[0][0])
          else this.endGame(null)
        }
      }
    }
  }

  private endGame(winnerSessionId: string | null) {
    if (this.timerInterval) {
      this.timerInterval.clear()
      this.timerInterval = null
    }
    const players = Array.from(this.state.players.values()) as PlayerState[]
    const sortedByScore = [...players].sort((a: PlayerState, b: PlayerState) => b.score - a.score)
    const withScores = sortedByScore.map((p: PlayerState) => ({ name: p.name, score: p.score, lives: p.lives }))
    const winnerName = winnerSessionId ? this.state.players.get(winnerSessionId)?.name ?? null : null
    const finalPlayers = sortedByScore.map((p: PlayerState) => ({ sessionId: p.sessionId, name: p.name, lives: p.lives }))
    const startedAt = Math.floor((this.gameStartTime || Date.now()) / 1000)
    const endedAt = Math.floor(Date.now() / 1000)
    try {
      persistGame({
        roomId: this.roomId,
        startedAt,
        endedAt,
        winnerName,
        config: '{}',
        playerResults: withScores.map((p, i) => ({
          name: p.name,
          score: p.score,
          rank: i + 1,
          wordsPlayed: 0,
        })),
      })
    } catch (_) {}
    this.broadcast('game_ended', { winnerSessionId, winnerName, finalPlayers })

    this.state.phase = 'LOBBY'
    this.state.bombHolderSessionId = ''
    this.state.timerRemaining = 0
    this.state.roundEndsAt = 0
    this.state.lastServerTimeMs = 0
    this.state.currentWordInProgress = ''
    this.state.learningModePaused = false
    this.state.revealedAnswer = ''
    this.state.players.forEach((p) => {
      p.lives = this.state.initialLives
      p.score = 0
    })
  }

  onDispose() {
    if (this.timerInterval) {
      this.timerInterval.clear()
      this.timerInterval = null
    }
    usedRoomCodes.delete(this.roomId)
  }
}
