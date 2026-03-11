# Typing, prompt, and audio — what we built

Consolidated notes on the typing component, typing portal, pitch-shifted key sound, prompt/typing layout config, and related UI. Use with `IMPLEMENTATION_NOTES.md` and `BUILD_NOTES.md`.

---

## 1. PlayerTypingComponent — behavior and layout

### Input model (no text field)

- Typing is **keyboard capture**, not a focused `<input>`. The game (or test page) has a **full-screen focusable div** that receives key events; the component only **displays** the current word and optional feedback.
- **Play:** `Play.tsx` has a game root div with `ref={gameRootRef}`, `tabIndex={0}`, `onKeyDown={handleGameKeyDown}`. Keys are handled there; `wordInput` state is updated and passed to the typing component as `value` / `onChange`. So “click anywhere” works because the whole game area is the key target.
- **Test-typing:** The test page portals a full-screen stage to `document.body` with its own `onKeyDown` and `setValue`, so the stage is the key target and letters appear without focusing a small box.

### Position modes

- **`positionMode: 'bottom'`** (default) — Component positions itself absolute, `bottom: 12%`, centered. Used when the component is the only thing at the bottom.
- **`positionMode: 'belowPrompt'`** — Component uses `position: relative`, `width: 100%`; the **parent** positions it (e.g. Play’s typing portal wrapper at `top: TYPING_PORTAL_TOP`). So the typing area sits a fixed distance below the prompt (or overlapping if gap = 0). No extra minHeight; content is `justifyContent: 'flex-start'` so letters sit at the top of the block.

### Tile mode vs plain text

- **`tileMode: true`** (default) — Each character in a separate box (tile). Styling: black background `rgba(0,0,0,0.75)`, no border, minimal padding `0 2px`, small tiles (`minWidth: 28`, `height: 36`), font weight 900, **letters shown in ALL CAPS** (`char.toUpperCase()`). Gap between tiles is the inner flex `gap` (e.g. 2 or 6) in the letter-row div.
- **`tileMode: false`** — Same font (size, weight, letterSpacing) but no boxes; one span of text plus a **blinking vertical cursor** (thick bar, `player-typing-cursor-blink` keyframes in `gameBoardKeyframes.css`).

### Feedback and layout stability

- The “Submitted” / error feedback is **position absolute** (`top: 100%`, `left: 50%`, `transform: translateX(-50%)`) so when it appears it does **not** push the letter row or change layout.

### Type sound (in component)

- **Trigger:** A `useEffect` in the component watches `value`. When `value.length === prevValueLengthRef.current + 1` (exactly one character added), it calls `playTypeSound(pitch)`. So the sound is **owned by the component** and fires whether the parent or the component handled the key. No duplicate logic in Play or TestTypingPage.
- **Pitch:** `pitch = BASE_PITCH + value.length * PITCH_INCREASE_PER_LETTER`, capped at `MAX_PITCH`. Constants in the component: `BASE_PITCH = 1.0`, `PITCH_INCREASE_PER_LETTER = 0.035`, `MAX_PITCH = 1.45`. So backspace reduces length; next keypress plays at the pitch for the new length (lower note).

---

## 2. Typing portal (game)

- **Pattern (same as UserCircle):** A **mount div** in Play (full size, `position: absolute; inset: 0`). A `useEffect` resolves the portal target from the mount ref (with `requestAnimationFrame` so ref is set after paint). `createPortal(typingContent, typingPortalTarget)` renders the typing UI into that div.
- **Portal content:** A wrapper div (full size, `pointerEvents: 'none'`, `zIndex: 100`) containing either `PlayerTypingComponent` (when it’s your turn) or “Waiting for X…” (when not). The wrapper has no border/background; it only layers the typing UI. The **position** of the typing block is controlled by a child div with `top: TYPING_PORTAL_TOP`, `left: 50%`, `transform: translateX(-50%)`, so the letters sit below the prompt (or overlapping if config is 0).
- **Why a portal:** Keeps the typing UI in a separate DOM subtree so stacking and focus work correctly with the rest of the game (UserCircle, etc.).

---

## 3. testStageConfig (single place for layout)

- **Location:** `client/src/components/testStageConfig.ts` at the **components root** (not under testingpages).
- **Exports:**
  - **`STAGE_CENTER_Y_PERCENT`** — Vertical center for test stage (e.g. 55).
  - **`PROMPT_TOP_PERCENT`** — Vertical position of the prompt (e.g. 5). Must match `PromptComponent`.
  - **`PROMPT_HEIGHT_PX`** — Approximate height of the prompt box in px. 0 = letters can sit at same vertical position as prompt; ~50 = letters start below the prompt box.
  - **`TYPING_GAP_BELOW_PROMPT_PX`** — Extra gap in px between prompt and typing. 0 = letters touch prompt.
  - **`TYPING_PORTAL_TOP`** — CSS `top` for the typing portal: `calc(PROMPT_TOP_PERCENT% + PROMPT_HEIGHT_PX + TYPING_GAP_BELOW_PROMPT_PX)`.
- **Used by:** `PromptComponent` (top %), `Play.tsx` (typing portal position), `TestTypingPage` (prompt position and spacer height). Change one value here to move prompt or typing everywhere.

---

## 4. PromptComponent

- **Position:** `top: PROMPT_TOP_PERCENT%`, centered (left 50%, translateX -50%).
- **Styling:** Background `rgba(0,0,0,0.4)` (black 40% opacity), border `1px solid rgba(180,180,180,0.6)` (light gray). No “Type a word containing” line — only the prompt letter(s) or question text.
- **Test-typing:** The test page has its own “this is a default prompt” div with the **same** styles so layout matches the game.

---

## 5. Type sound — Web Audio API (lib/typeSound.ts)

- **Single sample, pitch-shifted:** One WAV/MP3 (e.g. `@/assets/typeSound.mp3`) is loaded and decoded once into an **AudioBuffer**. Each keypress creates an **AudioBufferSourceNode**, sets **`playbackRate.value`** for pitch, optionally a **GainNode** for volume, then `source.start(0)`. No `HTMLAudioElement`; this avoids pitch preservation and gives low-latency, overlapping plays.
- **Flow:** `getContext()` creates a single `AudioContext` and kicks off `loadBuffer()` (fetch → decodeAudioData). `playTypeSound(playbackRate)` uses that context and buffer; if buffer isn’t ready or context is suspended, it bails (or resumes) and the next keypress will play.
- **Volume:** `gainNode.gain.value` (e.g. 1.8 for louder, or 0.1 for quieter). No min/max clamp in the lib; the component passes a pitch in the intended range.
- **File:** `client/src/lib/typeSound.ts`. Asset can be `.mp3` or `.wav`; import path in the lib determines what Vite serves.

---

## 6. Test-typing page

- **Stage:** Content is portaled to **`document.body`** so the focusable stage is not inside TestPageShell’s transformed wrapper; the whole viewport is the key target and “click anywhere” works.
- **Layout:** Prompt at top (`paddingTop: PROMPT_TOP_PERCENT%`), then a spacer `height: TYPING_GAP_BELOW_PROMPT_PX`, then `PlayerTypingComponent` with `positionMode="belowPrompt"` and `tileMode={tileMode}`.
- **Toggle:** A checkbox in the sidebar toggles **tile mode** (letters in boxes vs plain text + cursor).
- **Example prompt:** “this is a default prompt” with the same styles as `PromptComponent` (black 40%, light gray border) so spacing matches the game.

---

## 7. Game (Play) — key capture and typing

- **Full-screen key capture:** The game root div (`ref={gameRootRef}`, `tabIndex={0}`, `onKeyDown={handleGameKeyDown}`) wraps the GameBoard. It receives all key events when focused. So the user can click anywhere on the game area and then type; no need to focus a small input.
- **handleGameKeyDown:** If `phase !== 'PLAYING'` or not my turn, only Enter is handled (or ignored). When it’s my turn: Enter → submit word; Backspace → `setWordInput(prev => prev.slice(0,-1))`; single character → `setWordInput(prev => prev + e.key)`. All with `preventDefault` where needed.
- **Focus:** When `phase === 'PLAYING'`, an effect focuses `gameRootRef` so the game area is focused as soon as the game starts. After submit, we refocus `gameRootRef` so the next word can be typed immediately.
- **Typing UI:** Rendered inside the **typing portal** (see §2). So: keys handled at game root, typing painted in portal; sound triggered inside `PlayerTypingComponent` when `value` gains one character.

---

## 8. Question logic (server)

- **When the question changes:** Only when (1) someone submits a **correct** word (bomb passes and question advances), or (2) the bomb completes a **full rotation** back to the player who had it when the question was shown. So wrong answers do not change the question; the same prompt stays until it “comes back” to the starter or someone gets it right.
- **Implementation:** Server keeps `questionStartedWithHolder`; on bomb pass, it advances the question only if `fromCorrectAnswer` or if the new holder equals `questionStartedWithHolder`, then updates `questionStartedWithHolder` when the question advances.

---

## 9. Timer and game end (brief)

- **Timer sync:** Server sets `roundEndsAt` (timestamp) and `lastServerTimeMs` when the round starts (and on reset). Client uses `useRoundEndsAtTimer(roundEndsAt, lastServerTimeMs, totalTime)` to compute remaining time with a client–server time offset so the countdown is consistent across clients.
- **Server timing:** Colyseus `this.clock` (e.g. `setInterval` / `setTimeout`) for round timer; clear on dispose and when round ends.
- **Game end:** Server broadcasts `game_ended` with winner and final players; client keeps a **gameEndSnapshot** and shows the user circle with winner label and grayed-out defeated players; “Play again” clears the snapshot and (if host) sends `start_game`.

---

## 10. File reference (typing & audio)

| Area              | Files / components |
|-------------------|--------------------|
| Typing component  | `components/game/PlayerTypingComponent.tsx` (tileMode, positionMode, pitch constants, effect that calls playTypeSound) |
| Typing portal     | `pages/Play.tsx` (typingPortalTargetRef, useEffect to set typingPortalTarget, createPortal with typing content) |
| Layout config     | `components/testStageConfig.ts` (PROMPT_TOP_PERCENT, PROMPT_HEIGHT_PX, TYPING_GAP_BELOW_PROMPT_PX, TYPING_PORTAL_TOP) |
| Prompt            | `components/game/PromptComponent.tsx` (uses PROMPT_TOP_PERCENT; black 40%, light gray border) |
| Type sound        | `lib/typeSound.ts` (Web Audio API, playTypeSound(playbackRate), gain node) |
| Cursor keyframes  | `styles/gameBoardKeyframes.css` (`player-typing-cursor-blink`) |
| Test typing       | `components/testingpages/TestTypingPage.tsx` (portal to body, tile toggle, example prompt) |
