# QuizBomb — Implementation notes

Documentation of client/server behavior, patterns, and fixes for the features we built. Use this alongside `API.md`, `WORD_BOMB_DNA.md`, **`BUILD_NOTES.md`** (layout, UserCircle/Arrow/Bomb, lobby, playing view, custom questions, test pages), and **`TYPING_AND_UI_NOTES.md`** (typing component, typing portal, prompt layout, type sound, test-typing page).

---

## 1. Explosion & lose-heart system

### Overview

When the bomb timer hits zero (or wrong word path), the server deducts a life and the client runs **lose-heart effects**: explosion animation, sound, and (when implemented) profile-circle shake.

### Client pieces

- **`lib/explosionAnimation.ts`**  
  - Constants: 17 frames, default FPS (~22).  
  - `ExplosionInstance`, `SpawnExplosionOptions` (x, y, sizePx/scale, fps, etc.).  
  - Frame math: `getExplosionFrameIndex`, `getExplosionSourceRect`, `isExplosionComplete`.  
  - `useExplosionManager()`: `explosions`, `spawnExplosion(opts)`, `onComplete(id)`.

- **`components/game/ExplosionCanvas.tsx`**  
  - Single canvas over the game area.  
  - Loads sprite sheet once; `requestAnimationFrame` loop draws all active explosions by cropping one frame per instance.  
  - Uses elapsed time and FPS for frame index; calls `onComplete` when an explosion reaches the last frame.  
  - Rendered above the stage with `pointerEvents: 'none'`.

- **`lib/playExplosionSound.ts`**  
  - Loads and plays `explosion.mp3` via Web Audio API.  
  - Asset must be imported from `@/assets/explosion.mp3` so Vite serves it (avoid 404 from `/assets/...`).  
  - `preloadExplosionSound()` for first-round readiness.  
  - Module-level `disabled` flag and try/catch so failures don’t crash the app.

- **`lib/loseHeart.ts`**  
  - **Display:** `getDisplayHearts(player)`, `hasZeroHearts(player)`, `withDisplayHearts(players)`.  
  - **State updates:** `setPlayerHearts`, `addPlayerHearts`, `removePlayerHeart` (used by game and test pages).  
  - **Effects:** `runLoseHeartEffects(playerId, positionPx, sizePx, options)` where `options` has `playSound` and `spawnExplosion`. The **shake** is triggered inside `runLoseHeartEffects` by dispatching a custom event `LOSE_HEART_SHAKE_EVENT` with `{ playerId }` in `detail`; `ShakeContext` listens and sets `shakingPlayerId`.  
  - Called from Play’s `handleExploded` (when bomb hits 0) and from test Explode flow.

### Flow when timer hits zero

1. **GameBoard** `useRoundEndsAtTimer` (effect deps: `[roundEndsAt, lastServerTimeMs, totalTime]`) runs a `requestAnimationFrame` tick; when the computed value first goes ≤ 0 it calls `onReachZero` once per round.  
2. **Play** `handleExploded` receives payload (bomb holder id, position, avatar size), defers with `requestAnimationFrame`, then calls `runLoseHeartEffects(..., { playSound: playExplosionSound, spawnExplosion })`.  
3. **runLoseHeartEffects** runs sound, spawns explosion, and dispatches `LOSE_HEART_SHAKE_EVENT`; server has already decremented the holder’s life.

---

## 2. Bomb timer and first-bomb fix

### Problem

The first bomb often didn’t “go off” (no explosion sound, animation, or shake) when the first round’s timer reached zero; hearts were still deducted correctly. Subsequent bombs worked.

### Causes

1. **Timer / effect race:** `useRoundEndsAtTimer` effect depends on `[roundEndsAt, lastServerTimeMs, totalTime]`. When the game started, the effect could run with placeholder values then re-run when the server sent real values; each re-run **cleaned up the previous rAF loop**, so the tick that would have fired at zero might never run.  
2. **Sound buffer not ready:** On the first explosion, `playExplosionSound()` was called before the explosion audio buffer had finished loading (`hasBuffer: false`). The code scheduled a retry after load, so sound played late or felt disconnected.

### Fixes

**GameBoard (reliable explosion trigger):**

- Effect depends on `[roundEndsAt, lastServerTimeMs, totalTime]` and resets `haveFiredForThisRoundRef` when they change.  
- **Fire from inside the tick:** When the tick computes `value <= 0` and we haven’t fired for this round, we call `onReachZeroRef.current?.()` directly from the rAF callback. That way the explosion fires exactly when the client’s countdown hits zero, regardless of server sync timing.  
- `onReachZero` passes `onExplodedPayloadRef.current` to `onExploded` (bomb holder id, position, size).

**Play + playExplosionSound (first bomb has sound):**

- **Preload:** When the Play page has a `room` (user has joined), we call `preloadExplosionSound()`. That creates the AudioContext and starts loading the explosion buffer in the background.  
- By the time the first round ends and the first bomb “goes off”, the buffer is usually ready, so `playExplosionSound()` sees `hasBuffer: true` and plays immediately (no retry).  
- `handleExploded` still wraps `runLoseHeartEffects` in `requestAnimationFrame` so the first explosion runs after React commit.

---

## 3. Avatar shake (lose-heart feedback)

When a player loses a heart (bomb explodes on them), their avatar shakes so it’s clear who was hit.

### Implementation

- **Trigger:** Inside `runLoseHeartEffects` in `lib/loseHeart.ts`, we dispatch a custom event: `window.dispatchEvent(new CustomEvent(LOSE_HEART_SHAKE_EVENT, { detail: { playerId } }))`. The shake is not a separate option; it always runs when lose-heart effects run.
- **Listener:** `contexts/ShakeContext.tsx` — `ShakeProvider` wraps the app (in `App.tsx`). It listens for `LOSE_HEART_SHAKE_EVENT`, sets `shakingPlayerId` to the event’s `playerId`, then clears it after `SHAKE_DURATION_MS` (650 ms). Timeout is cleared on unmount to avoid leaks.
- **Hook:** `useShake()` returns `{ shakingPlayerId }`. Play page and test avatar page use it to pass `shakingPlayerId` down to the circle/avatar.
- **Rendering:** `GameBoard` accepts `shakingPlayerId` and passes it to `UserCircle`. `UserCircle` passes `shaking={shakingPlayerId != null && player.id === shakingPlayerId}` to each `UserAvatar`.
- **UserAvatar:** Accepts `shaking?: boolean`. The inner profile circle uses `transformOrigin: '50% 100%'` (bottom center) and when `shaking` is true applies `animation: 'avatar-shake 0.6s ease-in-out 1'`.
- **Keyframes:** `styles/gameBoardKeyframes.css` defines `@keyframes avatar-shake`: 0%/100% → 0°, 25%/75% → 7.2°, 50% → -7.2° (left–right shake, 20% larger than original spec, 50% longer duration ~0.6 s).

---

## 4. Joined sound (player joined lobby)

When a player joins the lobby, we play a short sound so everyone notices.

- **Asset:** `client/src/assets/joined.mp3`.
- **`lib/playJoinedSound.ts`:** Exports `playJoinedSound()` which plays the asset (e.g. via `HTMLAudioElement` or Web Audio). Used in both the **real** Play lobby and the **test** lobby.
- **Real lobby (Play.tsx):** In an effect that watches room state, when `phase === 'LOBBY'` and `players.length > prevLobbyCountRef.current`, we call `playJoinedSound()` and update the ref so we don’t re-play for the same count.
- **Test lobby (TestUserCirclePage):** When “+ Add player” adds a player (e.g. `room.join(nickname)`), we call `playJoinedSound()` after the join.

---

## 5. Test lobby (simulated Colyseus)

The UserCircle test page (`/test-usercircle`) acts as a lobby with join/leave and a permanent Lobby Owner, using a **mock Colyseus room** so we don’t need the real server.

### Test lobby replica

- **`lib/testLobbyReplica.ts`:** Defines a fake `Room`-like object:
  - **State:** `state.players` is a `Map<string, TestPlayerState>` (sessionId, nickname, lives, etc.). `state.hostSessionId` / phase if needed.
  - **Lobby owner:** Hardcoded `LOBBY_OWNER_ID` (e.g. `'lobby-owner'`) is always present; leave is prevented for that id.
  - **Methods:** `join(nickname)` adds a player and notifies listeners; `leave(sessionId)` removes (except owner) and reassigns host; `onStateChange(cb)`, `notifyStateChange()` for manual refresh (e.g. after heart loss in test).
- **`getPlayersFromReplicaState(state)`** returns an array of players from the map for the UI.

### Test lobby context

- **`contexts/TestLobbyContext.tsx`:** `TestLobbyProvider` creates a single `TestLobbyRoom` (e.g. via `createTestLobbyRoom()`) in a ref and provides it. `useTestLobby()` returns that room. The `/test-usercircle` route is wrapped with `TestLobbyProvider` in `App.tsx`.

### Test UserCircle page behavior

- Uses `useTestLobby()` to get the room. Subscribes to `room.onStateChange` to re-render when state changes.
- Players are derived from `getPlayersFromReplicaState(room.state)` and mapped to `UserCirclePlayer` (with `hearts: p.lives`). Lobby Owner is shown with a crown; remove is disabled for them.
- “+ Add player” calls `room.join(nickname)` and `playJoinedSound()`. Remove calls `room.leave(id)`.
- Test pages use **shared components** (UserCircle, ellipse layout, playJoinedSound); they do not drive the real game.

---

## 6. Single-avatar layout (ellipse)

When only one player is in the circle, the avatar should sit on the **right** side of the circle (not bottom) so the layout is consistent with multi-player.

- **`components/game/ellipse.ts`:** `getCircleAngle(count, index)` — when `count === 1`, return `0` (right side); otherwise use the existing distribution (e.g. `(index / count) * 2 * Math.PI - Math.PI / 2` for bottom start). Used by UserCircle for positioning.

---

## 7. Game end → back to lobby (no game-over screen)

### Goal

When the second-to-last player “dies” (timer hits 0), the death animation (explosion, sound, hearts) should play fully. The prompt, bomb, and arrow should disappear immediately; the user circle should stay so the animation is visible.

### Client behavior

- **`postGameActive` (Play.tsx):** When the client receives `game_ended`, it sets `postGameActive = true` and starts a 2.5 s timeout, then sets `postGameActive = false`.  
- **Lobby switch:** We only switch to the lobby UI when `phase === 'LOBBY' && !postGameActive`. So for 2.5 s after game end we keep rendering the **game** branch (same GameBoard and UserCircle).  
- **GameBoard `postGame` prop:** When `postGame={postGameActive}` is true, GameBoard hides the prompt, arrow, and bomb but keeps the UserCircle and background. So the circle and ExplosionCanvas stay; only the game chrome is removed.  
- **Circle data during post-game:** While `postGameActive`, `gameBoardPlayers` is built from `gameEndSnapshot.players` so the circle shows final lives (e.g. loser at 0 hearts).

### Lobby after game end

- **Lobby circle always uses live `players`:** After the 2.5 s we show the lobby. The lobby UserCircle is driven by **live** `players` from room state, not `gameEndSnapshot`. So new joiners appear in the circle.  
- **Award titles (1st / 2nd / 3rd):** Still derived from `gameEndSnapshot` so the right avatars keep their badges; new joiners have no title.

---

## 8. Settings (hearts and bomb timer)

### Number of hearts

- **Server:** `GameState.initialLives` (default 3).  
- **`set_initial_lives`:** Host sends `{ hearts: number }` (clamped 1–10). Server sets `state.initialLives` and **updates every current player’s `lives`** to that value so the lobby circle updates immediately.  
- **Usage:** `onJoin` sets `p.lives = state.initialLives`. `endGame` resets each player’s lives to `state.initialLives`.

### Client

- Settings modal (gear): “Number of hearts” slider + number input (1–10). Only host can change.  
- Sends `set_initial_lives` with `{ hearts }`; UI reads `state.initialLives`.  
- Lobby circle uses `p.lives` (no longer hardcoded 3), so when the host changes the setting, hearts update live.

### Bomb timer (round time)

- **Server:** `set_round_time` (host, LOBBY only), payload `{ seconds: number }` (e.g. 5–60). Schema: `roundTimeSeconds`, and when the round starts the server sets `roundEndsAt` and `lastServerTimeMs` for client sync.
- **Client:** Settings modal (gear on left sidebar) has a slider and number input for round time (seconds). Only host can change. Sends `set_round_time`; client timer uses `roundEndsAt` and `lastServerTimeMs` for smooth, consistent countdown.

---

## 9. Play again button and lobby

- **Visibility:** Only the host sees the Start button.  
- **Label:** Always “Start” (never “Play again”).  
- **Lobby circle:** Always sourced from live `players` so new joiners appear even right after a game ends.

---

## 10. Shared links and join flow

### Problem

Shared invite links sometimes didn’t let people join. Copying the link from the Play page produced a URL like `/play?join=CODE`. Opening that loaded the Play page, which only reads `roomId` (not `join`), so the user saw “Missing room ID” and never reached the join form.

### Fix

- **Invite link (Play `copyLink`):** Always points to the **home** URL with the `join` param, e.g. `https://origin/?join=ROOMCODE`, so the recipient lands on Home.  
- **Home:** When the URL has `?join=CODE`, it switches to “Join game” and pre-fills the room code. User enters nickname and clicks “Join room” → `joinRoom(roomCode, nickname)` then redirect to `/play?roomId=CODE`.  
- **Redirect:** If someone opens an old link like `/play?join=CODE`, Play redirects to `/?join=CODE` so they still get the join form.

---

## 11. Test pages and test-game alignment

### Goal

Test pages (e.g. Avatar, UserCircle) should behave like the real game: same logic (runLoseHeartEffects, removePlayerHeart), same state shape, so we can test visuals and state in isolation. They use **shared components and libs** (UserCircle, ellipse, playJoinedSound, loseHeart); test pages do not drive the real app.

### Patterns

- **`lib/testGameBridge.ts`:** Documents that test UI should call the same functions as the live game; defines `TEST_PLAYER_ID`; e.g. `simulateJoinLobby` for creating a join-like player object.
- **Test lobby:** TestUserCirclePage uses `TestLobbyContext` + `testLobbyReplica` (mock Room with state.players Map, join/leave, onStateChange). Lobby Owner is always present; “+ Add player” runs `room.join()` + `playJoinedSound()`.
- **Shake on test pages:** `ShakeProvider` wraps the whole app, so when Explode runs and `runLoseHeartEffects` dispatches `LOSE_HEART_SHAKE_EVENT`, the same `ShakeContext` listener sets `shakingPlayerId`. TestAvatarPage uses `useShake()` and passes `shakingPlayerId` so the single avatar can shake.
- **TestLoseHeartContext:** Optional context provided by test pages (e.g. TestAvatarPage). When set, the shell’s Explode button calls this handler so the same state that drives UserAvatar (profile circle + hearts) is updated.
- **ExplodeButton:** Uses context `triggerExplode`; only shown on test pages that need it (e.g. Test Avatar).
- **TestPageShellContext:** Explosion position/size use avatar size and scale factor from context; `runLoseHeartEffects` is called so sound, animation, and shake all run the same as in the real game.

### Avatar test page

- Wraps content in `TestLoseHeartContext.Provider value={applyLoseHeart}` where `applyLoseHeart` does `setPlayer(prev => removePlayerHeart([prev], prev.id)[0])`.  
- Uses `useShake()` and passes `shaking={shakingPlayerId != null}` (or per-player id) to UserAvatar. Same `player` state drives UserAvatar; when Explode runs, the circle, hearts, and shake update.

---

## 12. Custom questions upload (TXT)

- **Format:** One row per round: `question ~ answer1, answer2, ...`. Newline = new row; first `~` separates question from answers; comma separates answers. Max 500 rounds.
- **Parser:** `client/src/lib/parseQuestionsTxt.ts` — `parseQuestionsTxt(text)` returns `{ rounds, invalidLines }`. Used when the host selects a file in the lobby upload panel.
- **Client:** Lobby left sidebar has an upload icon (host-only); panel has file input, preview (round count, sample, invalid count), "Use this set" (sends `set_questions`), "Clear," "Download example."
- **Server:** `set_questions` (host + LOBBY only). Stores `customRounds`; `startRound()` uses custom round by index; `submit_word` for custom rounds checks word is in current round's answers and not in `wordsUsedThisRound`. On bomb pass, server advances to next custom round and resets timer.

---

## 13. Synced typing (letters for everyone, input only for current turn)

- **Schema:** `GameState.currentWordInProgress` (string). Synced to all clients by Colyseus so everyone sees the same letters in real time.
- **Server:** `typing_update` message (payload `{ word: string }`) accepted only when `phase === 'PLAYING'` and the client is the current `bombHolderSessionId`. Server sanitizes (trim, max length 30) and sets `state.currentWordInProgress`. Cleared in: `submit_word` (before processing), `startRound()`, `passBombToNext()`, `endGame()`.
- **Client:** Play page always shows one typing area. When it’s your turn: value from local `wordInput`, each change sends `typing_update`; when not your turn: value from `state.currentWordInProgress`, `readOnly={true}`. `PlayerTypingComponent` supports `readOnly` and `waitingForName` so the same component displays letters for everyone (editable for holder, display-only for others). Local `wordInput` is seeded from server when you become the holder and cleared when you stop being the holder.

---

## 14. File and component reference

| Area              | Files / components |
|-------------------|--------------------|
| Explosion         | `lib/explosionAnimation.ts`, `components/game/ExplosionCanvas.tsx`, `lib/playExplosionSound.ts` (incl. `preloadExplosionSound`) |
| Hearts / state    | `lib/loseHeart.ts` (runLoseHeartEffects, LOSE_HEART_SHAKE_EVENT) |
| Shake             | `contexts/ShakeContext.tsx`, `components/game/UserAvatar.tsx` (shaking), `styles/gameBoardKeyframes.css` (avatar-shake) |
| Joined sound      | `lib/playJoinedSound.ts`, `assets/joined.mp3`; used in Play.tsx (lobby) and TestUserCirclePage |
| Test lobby        | `lib/testLobbyReplica.ts`, `contexts/TestLobbyContext.tsx`, TestUserCirclePage |
| Ellipse / layout  | `components/game/ellipse.ts` (getCircleAngle, getRadiusAtAngle, getEllipseRadiiPx; UserCircle + Arrow) |
| Game end / timer  | `pages/Play.tsx` (handleExploded, preloadExplosionSound), `components/GameBoard.tsx` (useRoundEndsAtTimer, roundKey for bomb reset). See BUILD_NOTES §7 for game end → lobby. |
| Custom questions  | `lib/parseQuestionsTxt.ts`; Play.tsx upload panel; server `set_questions`, `customRounds`, `currentRoundAnswers` |
| Settings          | Play.tsx (settings modal), server `set_initial_lives`, `GameState.initialLives` |
| Invite / join     | Play.tsx `copyLink`, redirect `join` → home; `pages/Home.tsx` `?join=` handling |
| Test pages        | `TestPageShellContext.tsx`, `TestLoseHeartContext`, `ExplodeButton.tsx`, `lib/testGameBridge.ts`, `TestAvatarPage.tsx`, TestUserCirclePage, TestArrowPage, TestBombPage, TestTypingPage; `testStageConfig.ts` (STAGE_CENTER_Y_PERCENT) |
| Typing / prompt / audio | See **`TYPING_AND_UI_NOTES.md`**: `PlayerTypingComponent.tsx`, typing portal in Play.tsx, `testStageConfig.ts`, `PromptComponent.tsx`, `lib/typeSound.ts`, TestTypingPage |
| Synced typing          | `GameState.currentWordInProgress`; server `typing_update`; Play.tsx `handleTypingChange`, single `PlayerTypingComponent` with `readOnly` / `waitingForName` |

---

## 15. Server room (reminder)

- **GameRoom** (`server/src/rooms/GameRoom.ts`): `start_game`, `set_round_time`, `set_initial_lives`, `set_questions`, `typing_update`, `submit_word`; `startRound()`; `onRoundTimeUp` resets timer and passes bomb; `endGame` persists, broadcasts `game_ended`, then sets `phase = 'LOBBY'` and resets each player's lives and score so "Play again" starts a fresh game. Custom rounds: `set_questions` stores `customRounds`; when set, rounds use custom prompt + answers and advance on each bomb pass. `currentWordInProgress` cleared on submit, round start, bomb pass, and game end.
- **Schema** (`server/src/rooms/schema/GameState.ts`): GameState has `phase`, `prompt`, `timerRemaining`, `bombHolderSessionId`, `hostSessionId`, `currentWordInProgress`; optional `roundEndsAt`, `lastServerTimeMs`, `initialLives`; PlayerState has `lives`, `score`.
