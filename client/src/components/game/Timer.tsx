import { getBombState, BOMB_STATE_STROKE } from './bombState'

export interface TimerProps {
  /** Seconds remaining */
  timeLeft: number
  /** Total duration in seconds (for pie fill) */
  maxTime: number
  /** Outer size in pixels (default 100) */
  size?: number
  /** Show numeric label below (e.g. "8s") */
  showLabel?: boolean
  className?: string
}

export function Timer({
  timeLeft,
  maxTime,
  size = 100,
  showLabel = true,
  className = '',
}: TimerProps) {
  const progress = maxTime > 0 ? Math.max(0, Math.min(1, timeLeft / maxTime)) : 0
  const radius = size / 2 - 6
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const state = getBombState(timeLeft)
  const strokeColor = BOMB_STATE_STROKE[state]

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: size * 0.14,
            fontWeight: 700,
            color: state === 'danger' ? '#ef4444' : state === 'warning' ? '#f97316' : 'var(--muted)',
          }}
        >
          {Math.ceil(timeLeft)}s
        </div>
      )}
    </div>
  )
}
