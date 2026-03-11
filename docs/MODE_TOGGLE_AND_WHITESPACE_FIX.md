# Mode Toggle (Default / Q&A) and Whitespace Fix

Summary of changes for the lobby-leader mode toggle and plain-text typing whitespace display. For senior dev review.

---

## 1. Server: schema and room

### `server/src/rooms/schema/GameState.ts`

- **`hasCustomRounds`** (`boolean`, default `false`)  
  Set to `true` when the host uploads custom rounds via `set_questions`. Clients use this to show the Default/Q&A mode toggle only when custom questions are in use.

- **`promptMode`** (`string`, `'default' | 'qa'`, default `'default'`)  
  - `'default'`: letter tiles.  
  - `'qa'`: plain text + blinking cursor (tiles disabled).  
  Only meaningful when `hasCustomRounds` is true.

### `server/src/rooms/GameRoom.ts`

- **`set_questions`**  
  After storing custom rounds and resetting `customRoundIndex`, the room now sets:
  - `this.state.hasCustomRounds = true`
  - `this.state.promptMode = 'default'`

- **`set_prompt_mode`** (new message)  
  - Allowed only when: `phase === 'LOBBY'`, caller is host, and `hasCustomRounds === true`.  
  - Payload: `{ mode: 'default' | 'qa' }`.  
  - Normalizes to `'qa'` or `'default'`: `this.state.promptMode = payload?.mode === 'qa' ? 'qa' : 'default'`.

---

## 2. Client: Play page — state and mode toggle button

### `client/src/pages/Play.tsx`

- **State read from room**  
  - `hasCustomRounds`: `room.state.hasCustomRounds ?? false`  
  - `promptMode`: `room.state.promptMode ?? 'default'`

- **Sidebar: mode toggle button**  
  - Rendered only when **host** and **`hasCustomRounds`** are true.  
  - Inserted as the **third** icon button (index 2): Menu, Upload, **Mode toggle**, Settings, Leave.  
  - Same 44×44 circular style as other sidebar buttons (`iconButtonStyle`).  
  - Label: `"Q&A"` when current mode is Default, `"A"` when current mode is Q&A.  
  - Title/aria: “Default mode (tiles). Click for Q&A.” / “Q&A mode (plain text). Click for Default.”  
  - On click: sends `set_prompt_mode` with `{ mode: promptMode === 'qa' ? 'default' : 'qa' }`.  
  - When `promptMode === 'qa'`, button uses accent background (`rgba(99,102,241,0.4)`) to show active Q&A mode.

- **`PlayerTypingComponent`**  
  - Receives **`tileMode={promptMode !== 'qa'}`**: tiles when Default, plain text + cursor when Q&A.

---

## 3. Client: plain-text (Q&A) mode — whitespace fix

### `client/src/components/game/PlayerTypingComponent.tsx`

- **`tileMode` prop**  
  - When `tileMode === false` (Q&A mode), the component uses the **plain-text branch**: no per-letter tiles, single span for the value + blinking cursor.

- **Whitespace fix**  
  - The span that renders `{value}` in the plain-text branch now has **`whiteSpace: 'pre'`** in its style.  
  - So spaces are preserved and take width; “a b”, “ ”, or “  ” display correctly and the blinking cursor stays in the right place.  
  - Fixes the issue where a single space or “letter space letter” did not show the middle space correctly.

- **Blinking cursor**  
  - In plain-text mode a small inline-block span (3px width, `1.2em` height) is rendered immediately after the text span, with the existing `player-typing-cursor-blink` animation.

---

## 4. Data flow (concise)

- Host uploads questions → `set_questions` → `hasCustomRounds = true`, `promptMode = 'default'`.  
- Host clicks mode button in lobby → `set_prompt_mode` → `promptMode` toggles `'default'` ↔ `'qa'`.  
- All clients receive state sync; when `promptMode === 'qa'`, `PlayerTypingComponent` gets `tileMode={false}` and uses plain text + `whiteSpace: 'pre'` + blinking cursor.

---

## 5. Files touched

| File | Changes |
|------|--------|
| `server/src/rooms/schema/GameState.ts` | Added `hasCustomRounds`, `promptMode`. |
| `server/src/rooms/GameRoom.ts` | Set `hasCustomRounds` (and `promptMode`) in `set_questions`; added `set_prompt_mode` handler. |
| `client/src/pages/Play.tsx` | Read `hasCustomRounds`, `promptMode`; mode toggle button when host + hasCustomRounds; pass `tileMode={promptMode !== 'qa'}` to `PlayerTypingComponent`. |
| `client/src/components/game/PlayerTypingComponent.tsx` | In plain-text span, set `whiteSpace: 'pre'` so spaces and empty area are visible. |
