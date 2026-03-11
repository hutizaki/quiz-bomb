# QuizBomb — Build notes (what we built)

Consolidated notes on the features and architecture we implemented. Use with `API.md`, `WORD_BOMB_DNA.md`, `IMPLEMENTATION_NOTES.md`, and **`TYPING_AND_UI_NOTES.md`** (typing component, portal, prompt layout, type sound, test-typing).

---

## 1. User Circle and ellipse

### Portal-based placement

- **UserCircle** renders avatars via `createPortal` into a container (or `document.body`). The container is measured with `ResizeObserver` + `getBoundingClientRect()`; avatars are positioned with pixel coordinates so they stay aligned on resize.
- When the parent has zero height (e.g. GameBoard’s mount div), UserCircle measures the parent’s dimensions for the ellipse; on test pages it measures the provided container.

### Ellipse (oval) on wide screens

- When `width > height`, the circle becomes a horizontal oval: `radiusY` is compressed via `radiusYPercent = radiusPercent * (h / w)` so the shape fits the viewport.
- **Shared math:** `client/src/components/game/ellipse.ts` is the single source for:
  - `getCircleAngle(i, count)` — parametric angle for player index (1 player = right; 2 = left/right; odd = middle at bottom; even = middle two at bottom).
  - `getPointOnEllipse(angle, cx, cy, rx, ry, offset)` — point on ellipse, optional inner offset.
  - `getEllipseRadiiPx(w, h, radiusPercent, radiusYPercent?)` — radii in pixels.
  - `getRadiusAtAngle(angleRad, rx, ry)` — distance from center to ellipse edge in a direction (for bounded arrow length).
  - `getParametricAngleFromPoint`, `distance` helpers.

### Player positions

- Positions come from `getPlayerPositionsPx(count, w, h, radiusPercent, radiusYPercent)` (ellipse.ts + UserCircle). Arrow uses the same positions for pixel-perfect alignment.

---

## 2. UserAvatar

- **Anchor:** The profile circle is the anchor; crown, username pill, and hearts pill are overlays positioned relative to it (no center-offset math).
- **Hearts pill:** Black ~65% opacity pill at the bottom of the profile circle; bottom edges aligned. Hearts use `quizBombHeart.png`; pill has tight padding (e.g. 3px), max height ~25px, static aspect ratio.
- **Username pill:** Same pill style (dark, rounded); touches the top of the profile circle (small gap when crown is present).
- **Zero hearts:** When `hearts === 0`, avatar scales to 70%, `filter: grayscale(100%)`, hearts pill hidden. Same treatment for dead players (0 lives) during play.
- **Lobby mode:** When `onRemove` is passed, crown shows “leader glow” (orange), click removes player; no glow during actual gameplay.
- **Responsive size:** Avatar size is computed from container and player count (`getAvatarSizePx`), clamped (e.g. 28–70px).

---

## 3. Arrow

- **Bounded length:** When `radiusPercent` (and optional `radiusYPercent`) are passed with `containerSize`, the arrow’s length is the ellipse radius at the **current** angle: `getRadiusAtAngle(displayAngle, rxInner, ryInner)`. So the tip stays on the inner ellipse (same shape as the circle).
- **Shortest path:** The arrow’s displayed angle is driven by a motion value that animates toward the target angle. We use `currentAngle + shortestAngleDelta(currentAngle, targetAngleDeg)` so it always rotates the short way (e.g. from last to first player it moves one step, not the long way).
- **Pixel mode:** With `positionsPx` and `containerSize`, the arrow uses pixel layout; base is at `left: 50%`, `top: 50%`, `transform: translate(0, -50%)` so it aligns with the circle center. Length is derived from the motion value via `useTransform(displayAngleMotion, deg => getRadiusAtAngle(...))`.
- **Animation:** Tween 0.2s linear (no spring). Effect that runs the animation depends only on `targetIndex` so it doesn’t restart every frame when the sweep or other state updates.
- **Ellipse offset:** `ellipseOffsetPx` (default e.g. 50) shortens the arrow from the ellipse; 0 = tip on the ellipse. Exported for the test-page arrow-tip guide.

---

## 4. Bomb

- **Visuals:** Fuse (short, thick), spark image (`defaultSpark.png`) rotating; progress ring around the sphere. Warning/danger states (e.g. 3s and 1.5s) use stronger pulse (scale + drop-shadow), no translation.
- **Timer end:** When the round timer hits zero, the ring fills and stays full ~1s, then the server resets the timer and starts the next round (no explosion VFX on timer end; server handles life loss and bomb pass).
- **Reset on new round:** When the server sends a higher `timeRemaining` (e.g. 0 → 15 after timeout), the client increments a `roundKey` and the Bomb remounts so the progress ring starts full again. Server resets the timer in `onRoundTimeUp()` after passing the bomb so the new holder gets a full round.

---

## 5. Lobby

- **Layout:** Full viewport: `position: fixed; inset: 0`. Left sidebar (vertical icon strip): Menu (☰), Upload questions (📄, host only), Leave (←). Clicking an icon opens a panel to the right (overlay + panel); only one panel open at a time.
- **Canvas:** Same dark gradient as the game; UserCircle only (no bomb, no arrow). Room code and “Copy invite link” are inside the canvas (top-left). “Play again” (host) at bottom center. Feedback (e.g. “Link copied!”) top-right.
- **Play again:** Label for the host’s start button; same action as `start_game`.

---

## 6. Playing view

- **Layout:** Same full viewport and left sidebar as lobby. One game canvas with GameBoard (full height via `fullHeight` prop), PromptComponent, and PlayerTypingComponent (or “Waiting for X…” when not your turn).
- **No countdown phase:** Game goes LOBBY → PLAYING; no separate countdown screen.
- **PromptComponent:** Shows only the prompt letter(s) or question (no “Type a word containing"). Black 40% background, light gray border. Position from `testStageConfig.ts` (PROMPT_TOP_PERCENT). Rendered inside GameBoard.
- **PlayerTypingComponent:** Displays typed word (tile mode or plain text + cursor). Key capture is at game root (full-screen div); typing UI is portaled. Shown only when it's your turn. See **`TYPING_AND_UI_NOTES.md`**.

---

## 7. Game end → back to lobby

- **No game-over leaderboard:** When the game ends (last player standing or last two and one dies), the server does **not** set `phase = 'GAME_END'`. It persists the game, broadcasts `game_ended`, then sets `phase = 'LOBBY'`, clears bomb holder and timer, and resets every player’s `lives` and `score` to initial values. So the client immediately shows the lobby again with “Play again.”
- **Dead players during play:** Avatars with 0 lives already use the same zero-hearts treatment (shrink + grayscale) via `hearts: p.hearts ?? p.lives` in GameBoard’s circle players.

---

## 8. Custom questions upload (TXT)

- **Where:** Lobby only; host-only. Third icon in the left sidebar opens the upload panel.
- **Format:** One row per round. Line format: `question ~ answer1, answer2, ...`  
  - Newline = new row (support `\n` and `\r\n`).  
  - First `~` on the line separates question from answers.  
  - Answers separated by `,`; trim each. Empty lines and invalid rows (no `~` or no answers) are skipped.
- **Parser:** `client/src/lib/parseQuestionsTxt.ts` — `parseQuestionsTxt(text)` returns `{ rounds, invalidLines }`. Max 500 rounds. Used when the user selects a file (FileReader.readAsText, UTF-8).
- **UI:** File input, preview (round count, first 3 rows, invalid count), “Use this set” (sends to server and closes), “Clear,” “Download example” (sample .txt).
- **Server:** `set_questions` message (host + LOBBY only). Payload `{ rounds: { prompt, answers[] }[] }`. Server stores `customRounds` and uses them in `startRound()` (pick round by index) and when passing the bomb (next round from `customRounds`, reset timer). Validation for custom rounds: submitted word (lowercased) must be in the current round’s `answers` and not in `wordsUsedThisRound`. Default (no custom set) still uses `getRandomPrompt` and `isValidWord`.

---

## 9. Test pages

- **Shell:** `TestPageShell` with expandable left overlay menu (does not affect layout). Stage content centered at a configurable vertical percent (`testStageConfig.ts`: `STAGE_CENTER_Y_PERCENT`). Clicking a test page link reopens the menu if it was closed.
- **Pages:** Test Avatar (UserAvatar only, zoomed for inspection), Test UserCircle (circle + optional ring guide), Test Arrow (UserCircle + Arrow + optional arrow-tip guide, “Next user” to cycle target), Test Bomb (timer, presets, no explosion on timer end), **Test Typing** (typing component with tile-mode toggle, example prompt, full-screen key capture via portal to body). See **`TYPING_AND_UI_NOTES.md`**.
- **Container:** No container presets; test content uses full viewport (or a single full-size container). Default = viewport-sized; content portaled to body and positioned so the stage center matches `STAGE_CENTER_Y_PERCENT`.

---

## 10. File reference (current)

| Area           | Files / components |
|----------------|--------------------|
| Ellipse math   | `components/game/ellipse.ts` |
| User circle    | `components/game/UserCircle.tsx`, `UserAvatar.tsx` |
| Arrow          | `components/game/Arrow.tsx` (bounded length, pixel mode, shortest path) |
| Bomb           | `components/game/Bomb.tsx`, `bombState.ts` |
| Prompt / type  | `components/game/PromptComponent.tsx`, `PlayerTypingComponent.tsx` |
| Game board     | `components/GameBoard.tsx` (fullHeight, roundKey for bomb reset) |
| Play page      | `pages/Play.tsx` (lobby + playing full viewport, sidebar, upload panel) |
| Custom questions | `lib/parseQuestionsTxt.ts`; server `GameRoom.ts` (`set_questions`, customRounds, currentRoundAnswers) |
| Test pages     | `testingpages/TestPageShell.tsx`, `testStageConfig.ts`, TestAvatarPage, TestUserCirclePage, TestArrowPage, TestBombPage, TestTypingPage |
| Typing / prompt / audio | **`TYPING_AND_UI_NOTES.md`** — PlayerTypingComponent, typing portal, testStageConfig, PromptComponent, lib/typeSound.ts |

---

## 11. API reminders (see API.md for full spec)

- **Phases:** `LOBBY` and `PLAYING` only (no `COUNTDOWN`, no `GAME_END` in UI; game end transitions to LOBBY).
- **Messages:** `start_game`, `submit_word`, `set_questions` (custom rounds), `set_round_time`, `set_initial_lives`; server sends `word_result`, `game_ended`.
- **State:** `phase`, `players`, `prompt`, `timerRemaining`, `bombHolderSessionId`, `hostSessionId`; optional `roundTimeSeconds`, `roundEndsAt`, `lastServerTimeMs`, `initialLives` per your schema.
