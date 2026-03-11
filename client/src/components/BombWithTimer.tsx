import { motion } from 'framer-motion'

export interface BombWithTimerProps {
  /** Seconds left in the round */
  timeRemaining: number
  /** Total round duration in seconds (for pie fill) */
  totalTime: number
  /** Where the arrow points: angle in degrees (0 = right, 90 = down), or 'none' to hide */
  arrowAngle?: number | 'none'
  /** Size of the bomb + timer in pixels */
  size?: number
  /** Optional class name */
  className?: string
}

export function BombWithTimer({
  timeRemaining,
  totalTime,
  arrowAngle = 90,
  size = 200,
  className = '',
}: BombWithTimerProps) {
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeRemaining / totalTime)) : 0
  // Pie: we draw a ring that "drains" clockwise (12 o'clock = 0). So remaining = progress * 360deg.
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      {/* Arrow pointing at the bomb (e.g. "whose turn") */}
      {arrowAngle !== 'none' && (
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: -size * 0.15,
            transformOrigin: 'center bottom',
            transform: `translateX(-50%) rotate(${typeof arrowAngle === 'number' ? arrowAngle : 0}deg)`,
            zIndex: 2,
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <svg width={32} height={28} viewBox="0 0 32 28" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
            <path
              d="M16 0 L28 24 L16 20 L4 24 Z"
              fill="var(--accent)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
          </svg>
        </motion.div>
      )}

      {/* Pie chart timer ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="bomb-timer-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
          <linearGradient id="bomb-timer-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#bomb-timer-bg)"
          strokeWidth="8"
        />
        {/* Progress ring (clockwise from top); drains as time runs out */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#bomb-timer-fill)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ type: 'linear', duration: 0.25 }}
        />
        {/* Danger color when low */}
        {progress <= 0.25 && (
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--error)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </svg>

      {/* Bomb graphic (center) */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={progress <= 0.2 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: progress <= 0.2 ? Infinity : 0, duration: 0.5 }}
      >
        <svg
          width={size * 0.45}
          height={size * 0.5}
          viewBox="0 0 80 90"
          fill="none"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
        >
          {/* Bomb body */}
          <ellipse cx="40" cy="58" rx="28" ry="26" fill="#2a2a2a" stroke="#444" strokeWidth="2" />
          <ellipse cx="40" cy="52" rx="22" ry="18" fill="#333" />
          {/* Fuse */}
          <path
            d="M40 22 Q38 8 42 4 L44 0 L46 4 Q42 8 40 22"
            stroke="#c4a35a"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="44" cy="2" r="3" fill="#f5d76e" />
          {/* Spark when low time */}
          {progress <= 0.25 && (
            <motion.circle
              cx="44"
              cy="2"
              r="4"
              fill="#ff6b35"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 0.3, 0.8] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
            />
          )}
        </svg>
      </motion.div>

      {/* Optional: time number overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '1rem',
          fontWeight: 700,
          color: progress <= 0.25 ? 'var(--error)' : 'var(--muted)',
        }}
      >
        {Math.ceil(timeRemaining)}s
      </div>
    </div>
  )
}
