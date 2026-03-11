/** Seconds remaining at which the bomb enters warning state (orange). */
export const BOMB_WARNING_SEC = 3

/** Seconds remaining at which the bomb enters danger state (red). */
export const BOMB_DANGER_SEC = 1.5

export type BombState = 'normal' | 'warning' | 'danger'

export function getBombState(timeLeft: number): BombState {
  if (timeLeft <= BOMB_DANGER_SEC) return 'danger'
  if (timeLeft <= BOMB_WARNING_SEC) return 'warning'
  return 'normal'
}

export const BOMB_STATE_COLORS = {
  normal: 'rgba(99,102,241,0.25)',
  warning: 'rgba(249,115,22,0.4)',
  danger: 'rgba(239,68,68,0.55)',
} as const

export const BOMB_STATE_STROKE = {
  normal: 'rgba(255,255,255,0.28)',
  warning: '#f97316',
  danger: '#ef4444',
} as const
