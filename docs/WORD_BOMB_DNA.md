# Word Bomb — Everything That Makes It What It Is

A full design inventory of mechanics, feel, and details so we can capture the same experience in QuizBomb. Use this as a checklist for “Word Bomb DNA.”

---

## 1. Core loop & rules

- [ ] **Prompt-based rounds** — Each round shows a letter or letter sequence; you must type a **valid word that contains it** (e.g. “ing” → “running”, “thing”).
- [ ] **One bomb, one holder** — The bomb is “on” one player at a time; only they can submit. When they type a valid word, the bomb **passes** to another player (random or next in order).
- [ ] **Lives** — Typically 2 or 3 lives; wrong word or timeout = lose a life. Zero lives = out.
- [ ] **Last player standing wins** — Last one alive wins the round/game.
- [ ] **Word validation** — Server checks against a dictionary; no made-up words, no duplicates (in that round), no invalid chars.
- [ ] **Turn-based pressure** — You only have so much time **when the bomb is on you**; the timer is *your* deadline.

---

## 2. The bomb & timer (heart of the feel)

- [ ] **Visible bomb** — A bomb asset (literal bomb, or bomb icon) that reads as “the thing that can blow up on you.”
- [ ] **Timer tied to the bomb** — Countdown is clearly the bomb’s fuse; when it hits zero, it “explodes” on the current holder.
- [ ] **Timer gets faster over the game** — Early rounds: more time. Later rounds: less time. Difficulty ramps.
- [ ] **Timer visualization** — Bar that shrinks, or circular fuse, or number countdown. Must be easy to read at a glance.
- [ ] **“Skull Bomb” / final phase** — Last phase (e.g. 3-letter prompts, very fast timer) for maximum tension.
- [ ] **Explosion moment** — When time runs out or invalid word: clear “explosion” feedback (screen shake, sound, red flash, “BOOM”).
- [ ] **Bomb pass moment** — When you submit a valid word, the bomb visibly “leaves” you and moves to the next player (satisfying handoff).

---

## 3. Who has the bomb (arrows & indicators)

- [ ] **Arrow pointing at bomb holder** — Obvious indicator (arrow, highlight, or “YOU HAVE THE BOMB”) so everyone knows whose turn it is.
- [ ] **Arrows / order indicators** — Visual order of players (e.g. around the bomb, or in a row) so you see who’s next or who’s in the hot seat.
- [ ] **Your turn vs others** — When it’s your turn: input enabled, timer prominent. When it’s not: input disabled or hidden, you’re watching.
- [ ] **Player list + bomb state** — List of players with lives; the one with the bomb is clearly marked (arrow, glow, “BOMB” badge).

---

## 4. Typing satisfaction & input

- [ ] **Single, focused input** — One main text field; no clutter. Keyboard-first (type and Enter).
- [ ] **Instant submit** — Enter (or button) sends the word immediately; no extra clicks.
- [ ] **Immediate feedback** — Valid: green/success, short “ding” or “pass” animation. Invalid: red/error, shake, “wrong” sound. Duplicate: neutral (e.g. “already used”).
- [ ] **No laggy validation** — Validation feels instant (client optimistic + server confirm, or fast server).
- [ ] **Word appears in chat or feed** — After a valid word, it shows in a feed so others see “they said ‘running’” and it feels social.
- [ ] **Clear prompt display** — The required letters are big and readable (e.g. “_ _ ing” or “contains: ING”).
- [ ] **Input cleared after submit** — Box clears so you’re ready for next time (or next round).

---

## 5. Prompts & difficulty curve

- [ ] **Letter or letter sequence** — “A”, “TH”, “ING”, “TION”, etc. Must appear *in* the word in order.
- [ ] **Progression** — Early: 1 letter, then 2, then 3 (e.g. Skull Bomb = 3-letter prompts).
- [ ] **Random but fair** — Prompts drawn from a set that’s solvable (enough valid words) so it’s skill, not luck.
- [ ] **Optional: blanks** — “In the Blanks” style: e.g. “_ E _” so one slot is free (any letter).
- [ ] **Optional: Shiritori** — Next prompt = last N letters of the word just played (chain effect).

---

## 6. Players, lobby & room

- [ ] **Small room size** — e.g. 2–9 players; feels like a party game, not a massive lobby.
- [ ] **Room code / link** — Easy way to join same game (code or share link).
- [ ] **Lobby state** — See who’s in the room before start; host (or voting) starts the game.
- [ ] **Names** — Display names for each player; optional avatar or color.
- [ ] **Lives visible** — Hearts or “3/3” next to each player; when someone dies, it’s obvious.
- [ ] **Elimination** — Dead players can spectate (see prompt, timer, words) but can’t play; “X was eliminated” message.

---

## 7. Teams (if we support it)

- [ ] **Team selection or auto-split** — Players on Team A vs Team B (or more).
- [ ] **Shared lives or last team standing** — Either team loses a life when their teammate explodes, or last team with a living player wins.
- [ ] **Team indicator** — Color or label so you see who’s on which team next to names.
- [ ] **Bomb can pass within or across teams** — Same bomb, but score/lives are per team.

---

## 8. Score & progression (optional but common)

- [ ] **Points per valid word** — e.g. +10 per word, or more for longer words / speed.
- [ ] **Streak bonus** — Consecutive correct words = extra points or multiplier.
- [ ] **Round winner** — Last player standing might get a round bonus.
- [ ] **Leaderboard in-room** — Scores (and lives) visible during the game.
- [ ] **Global leaderboard** — Persisted across games (needs backend/DB).

---

## 9. Sound & audio

- [ ] **Tick / fuse sound** — Timer ticking (faster as time runs low = more stress).
- [ ] **Correct word** — Satisfying “ding” or “pass” sound.
- [ ] **Wrong word / duplicate** — Short error sound.
- [ ] **Explosion** — Distinct “boom” when someone loses a life.
- [ ] **Bomb pass** — Optional “whoosh” or transfer sound.
- [ ] **Music** — Optional background track (lobby vs in-game); can be minimal.
- [ ] **Mute toggle** — So players can turn off sounds.

---

## 10. Visual polish & motion

- [ ] **Bomb animation** — Idle pulse or glow; more intense as timer runs down (e.g. faster pulse, redder).
- [ ] **Timer animation** — Bar/circle animates smoothly (no jagged jumps).
- [ ] **Explosion VFX** — Screen shake, flash, particles, or simple “BOOM” text.
- [ ] **Word accepted** — Quick highlight or checkmark; word flies to feed or score.
- [ ] **Lives lost** — Heart breaks or number decrements with a small animation.
- [ ] **Player join/leave** — Names appear/disappear with a subtle motion so the list doesn’t feel static.
- [ ] **Round transition** — “Round 2”, “Skull Bomb”, or “Get ready” with a short transition so it feels like a new beat.

---

## 11. Modes & variants

- [ ] **Default** — Standard prompts, 2–3 lives, timer speeds up, last round = Skull Bomb (3-letter).
- [ ] **Empty** — No prompt; any valid dictionary word (speed + vocabulary).
- [ ] **Shiritori** — Next prompt = last letter(s) of previous word; chain of words.
- [ ] **Blanks** — Prompt has blank tiles; one (or more) slot = any letter.
- [ ] **Dictionary choice** — English, or themed (e.g. Pokémon names) for fun variety.
- [ ] **Custom** — Private room options: lives, round length, prompt difficulty, dictionary.

---

## 12. Social & meta

- [ ] **Chat** — Optional in-game chat so friends can trash-talk or react.
- [ ] **Emotes / quick reactions** — “Nice!”, “Oof”, “GG” without full chat.
- [ ] **Spectator view** — When dead, you still see prompt, timer, and words so you’re not bored.
- [ ] **Reconnect** — If someone disconnects, optional “rejoin same room” so the party doesn’t break.
- [ ] **Room settings** — Host can set mode, lives, or kick (if we support it).

---

## 13. Edge cases & feel

- [ ] **Tie / simultaneous** — If two people could win (e.g. last two both timeout)? Sudden death or shared win—define it.
- [ ] **No valid word** — If prompt is too hard, consider “skip” or “hint” (or accept that someone loses a life).
- [ ] **Spam / cheating** — Rate limit submissions; server-authoritative validation so clients can’t fake words.
- [ ] **Afk / slow typist** — Timer is the same for everyone; fair. Optional “afk kick” in lobby only.
- [ ] **Mobile** — If we support it: big input, optional on-screen keyboard, tap-to-focus.

---

## 14. Summary: the “Word Bomb” feeling

- **One bomb, one timer, one prompt** — Simple to understand.
- **Pressure** — Timer and “it’s on you” create real tension.
- **Satisfaction** — Valid word = instant relief + “I passed the bomb.”
- **Social** — Small room, visible names, lives, and words; feels like a party game.
- **Progression** — Timer gets meaner, prompts get harder; game escalates.
- **Clear feedback** — You always know: whose turn, how much time, right/wrong, who’s out.

Use this list when designing screens, writing backlog tasks, or reviewing: “Did we get the arrow? The tick sound? The bomb pass moment?” so QuizBomb feels like Word Bomb at its core.
