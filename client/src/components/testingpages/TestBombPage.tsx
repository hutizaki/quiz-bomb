import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bomb, getBombState, BOMB_STATE_STROKE } from '@/components/game'
import { TestPageShell } from './TestPageShell'

const PULSE_MAX_DURATION = 30
const DEFAULT_TOTAL = 15

export function TestBombPage() {
  const [totalTime, setTotalTime] = useState(DEFAULT_TOTAL)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TOTAL)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    setTimeLeft(totalTime)
    setRunning(true)
  }, [totalTime])

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.05) {
          setRunning(false)
          setTimeout(() => setRunning(true), 1000)
          return totalTime
        }
        return +(t - 0.05).toFixed(2)
      })
    }, 50)
    return () => clearInterval(tick)
  }, [running, totalTime])

  const presets = [3, 5, 10, 15, 30, 60]
  const bombState = getBombState(timeLeft)
  const timerColor = bombState === 'normal' ? '#e2e8f0' : BOMB_STATE_STROKE[bombState]

  const sidebarContent = (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Time left</div>
      <div
        style={{
          color: timerColor,
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: 2,
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.4s ease',
          textShadow: bombState === 'danger' ? '0 0 20px rgba(239,68,68,0.6)' : 'none',
        }}
      >
        {timeLeft.toFixed(1)}s
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, marginTop: 8 }}>Preset</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {presets.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTotalTime(t)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${totalTime === t ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              background: totalTime === t ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t}s
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
        Pulse clamps at {PULSE_MAX_DURATION}s
      </div>
    </>
  )

  return (
    <TestPageShell sidebarContent={sidebarContent}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bomb timeLeft={timeLeft} totalTime={totalTime} />
      </motion.div>
    </TestPageShell>
  )
}
