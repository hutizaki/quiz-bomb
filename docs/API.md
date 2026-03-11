# QuizBomb — Room API

## Message types (client → server)

| Message            | Payload                    | Description |
|--------------------|----------------------------|-------------|
| `start_game`       | —                          | Host starts the game (min 1 player). |
| `submit_word`      | `{ word: string }`         | Submit a word containing the current prompt. |
| `typing_update`    | `{ word: string }`         | Update the current word-in-progress (bomb holder only, PLAYING only). Synced to all clients via state. |
| `set_round_time`   | `{ seconds: number }`      | Host sets bomb timer (5–60 s). LOBBY only. |
| `set_initial_lives`| `{ hearts: number }`       | Host sets hearts per player (1–10). LOBBY only. Updates all current players’ lives. |
| `set_questions`    | `{ rounds: { prompt, answers[] }[] }` | Host uploads custom rounds. LOBBY only. |

## Message types (server → client)

| Message        | Payload                                                                 | Description |
|----------------|-------------------------------------------------------------------------|-------------|
| `word_result`  | `{ sessionId, success, reason?: 'wrong' \| 'invalid' \| 'duplicate' \| 'timeout', word?, points? }` | Result of a word submission. |
| `game_ended`   | `{ winnerSessionId, winnerName, finalPlayers: { sessionId, name, lives }[] }` | Game over; winner or null; final player states for UI. |

## Room state (synced)

- `phase`: `'LOBBY'` \| `'PLAYING'`
- `players`: Map of `PlayerState` (sessionId, name, lives, score)
- `prompt`: Current letter(s) that must appear in the word
- `timerRemaining`: Seconds left in the round
- `roundTimeSeconds`: Bomb timer length in seconds (5–60)
- `roundEndsAt`: Unix ms when round ends (for client timer sync)
- `lastServerTimeMs`: Unix ms when server set roundEndsAt (clock skew correction)
- `bombHolderSessionId`: Session ID of the player who must answer
- `hostSessionId`: Session ID of the room host
- `initialLives`: Hearts/lives each player gets at join and after game end (1–10)
- `currentWordInProgress`: Current word being typed by the bomb holder; synced so everyone sees the same letters. Cleared on submit, bomb pass, round start, and game end.
