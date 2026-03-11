/**
 * Test stage layout. Change once to affect all test tabs.
 * Used by TestPageShell for positioning; also set as CSS var(--test-stage-center-y).
 */

/** Vertical position (percent from top) for the "center" of the stage content. 40 = content centered at 40% height. */
export const STAGE_CENTER_Y_PERCENT = 55

/** Horizontal center is always 50%. */

// ─── Typing portal (game + test-typing) ────────────────────────────────────────

/** Vertical position (percent from top) of the prompt. Must match PromptComponent. */
export const PROMPT_TOP_PERCENT = 5

/** Pixels from prompt top to where typing starts. 0 = letters at same vertical position as prompt (overlap); set to ~50 to sit below the prompt box. */
export const PROMPT_HEIGHT_PX = 0

/** Extra gap in px below that. 0 = letters touch (or overlap); increase for space between prompt and letters. */
export const TYPING_GAP_BELOW_PROMPT_PX = 50

/** CSS `top` value for the typing portal: prompt top + prompt height + gap. Set both PROMPT_HEIGHT_PX and TYPING_GAP_BELOW_PROMPT_PX to 0 to place letters exactly where the prompt is. */
export const TYPING_PORTAL_TOP = `calc(${PROMPT_TOP_PERCENT}% + ${PROMPT_HEIGHT_PX}px + ${TYPING_GAP_BELOW_PROMPT_PX}px)`
