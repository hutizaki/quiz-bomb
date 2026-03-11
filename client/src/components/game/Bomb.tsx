import { getBombState, BOMB_STATE_COLORS, BOMB_STATE_STROKE } from './bombState'
import defaultSparkImg from '@/assets/defaultSpark.png'

const PULSE_MAX_DURATION = 30

function getPulseDuration(totalTime: number): number {
  const clamped = Math.min(totalTime, PULSE_MAX_DURATION)
  const t = clamped / PULSE_MAX_DURATION
  return 0.3 + t * 1.1
}

// Fuse size
const FUSE_WIDTH = 28
const FUSE_HEIGHT = 26

// ── Fuse + Body — pulses together as one unit ────────────────────────────────
function BombBody({
  pulseDur,
  exploded,
  glowColor,
  state,
}: {
  pulseDur: number
  exploded: boolean
  glowColor: string
  state: 'normal' | 'warning' | 'danger'
}) {
  const pulseName = state === 'danger' ? 'bomb-pulse-danger' : state === 'warning' ? 'bomb-pulse-warning' : 'bomb-pulse-keyframes'
  const pulseSpeed = state === 'danger' ? 0.35 : state === 'warning' ? 0.6 : 1

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: exploded
          ? 'bomb-explode-keyframes 0.6s ease-out forwards'
          : `${pulseName} ${pulseDur * pulseSpeed}s ease-in-out infinite`,
      }}
    >
      <style>{`
        @keyframes bomb-spark-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bomb-fuse-glow {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes bomb-pulse-keyframes {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 12px ${glowColor}); }
          50%      { transform: scale(1.1);  filter: drop-shadow(0 0 28px ${glowColor}); }
        }
        @keyframes bomb-pulse-warning {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 16px ${glowColor}); }
          50%      { transform: scale(1.16); filter: drop-shadow(0 0 40px ${glowColor}); }
        }
        @keyframes bomb-pulse-danger {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 20px ${glowColor}); }
          50%      { transform: scale(1.22); filter: drop-shadow(0 0 56px ${glowColor}); }
        }
        @keyframes bomb-explode-keyframes {
          0%   { transform: scale(1);   opacity: 1; filter: brightness(1); }
          30%  { transform: scale(2.2); opacity: 1; filter: brightness(4); }
          100% { transform: scale(0.4); opacity: 0; }
        }
      `}</style>

      {/* Fuse */}
      {!exploded && (
        <div style={{ position: 'relative', width: FUSE_WIDTH, height: FUSE_HEIGHT, marginBottom: -2 }}>
          <svg width={FUSE_WIDTH} height={FUSE_HEIGHT} viewBox="0 0 20 36" fill="none" preserveAspectRatio="xMidYMid meet">
            <path
              d="M10 34 C6 26,14 18,10 10 C6 2,12 -2,10 -2"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M10 34 C6 26,14 18,10 10 C6 2,12 -2,10 -2"
              stroke="#92400e"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              style={{ animation: `bomb-fuse-glow ${pulseDur * pulseSpeed}s ease-in-out infinite` }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              width: 56,
              height: 56,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={defaultSparkImg}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                animation: 'bomb-spark-rotate 1s linear infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      {!exploded && (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 32%, #52525b, #09090b 72%)',
            boxShadow: `
              inset 0 -4px 10px rgba(0,0,0,0.6),
              inset 3px 3px 8px rgba(255,255,255,0.06),
              0 8px 32px rgba(0,0,0,0.8),
              0 0 0 1px rgba(255,255,255,0.05)
            `,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 18,
                width: 22,
                height: 10,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                transform: 'rotate(-30deg)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Progress Ring — static layer, never pulses ───────────────────────────────
function ProgressRing({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const r = 65
  const circumference = 2 * Math.PI * r
  const progress = totalTime > 0 ? timeLeft / totalTime : 0
  const dashOffset = circumference * (1 - progress)
  const state = getBombState(timeLeft)
  const color = BOMB_STATE_STROKE[state]
  const size = (r + 14) * 2

  return (
    <svg
      width={size}
      height={size}
      style={{ display: 'block', transform: 'rotate(-90deg)', pointerEvents: 'none' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="14"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke 0.4s ease' }}
      />
    </svg>
  )
}

export interface BombProps {
  /** Seconds remaining */
  timeLeft: number
  /** Total round duration in seconds */
  totalTime: number
  /** When true, show explosion (💥) and hide fuse/body/ring */
  exploded?: boolean
  className?: string
}

// ── Bomb — composes ring + body ──────────────────────────────────────────────
export function Bomb({ timeLeft, totalTime, exploded = false, className = '' }: BombProps) {
  const state = getBombState(timeLeft)
  const glowColor = BOMB_STATE_COLORS[state]
  const pulseDur = getPulseDuration(totalTime)

  const BODY_R = 40
  const sphereCenterOffset = FUSE_HEIGHT + BODY_R
  const contentHeight = FUSE_HEIGHT + 80
  const RING_R = 65
  const sphereCenterY = 80 - contentHeight / 2 + sphereCenterOffset
  const ringTop = sphereCenterY - (RING_R + 14)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: 160,
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(0.9)',
          transformOrigin: 'center center',
        }}
      >
        {/* Layer 1 — static ring, aligned to sphere center */}
        {!exploded && (
          <div
            style={{
              position: 'absolute',
              top: ringTop,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <ProgressRing timeLeft={timeLeft} totalTime={totalTime} />
          </div>
        )}

        {/* Layer 2 — pulsing bomb body + fuse */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {exploded ? (
            <div
              style={{
                fontSize: 80,
                lineHeight: 1,
                animation: 'bomb-explode-keyframes 0.6s ease-out forwards',
              }}
            >
              💥
            </div>
          ) : (
            <BombBody pulseDur={pulseDur} exploded={false} glowColor={glowColor} state={state} />
          )}
        </div>
      </div>
    </div>
  )
}
