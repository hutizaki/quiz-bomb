import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlayerTypingComponent } from '@/components/game/PlayerTypingComponent'
import { TestPageShell } from './TestPageShell'
import { PROMPT_TOP_PERCENT, TYPING_GAP_BELOW_PROMPT_PX } from '../testStageConfig'

export function TestTypingPage() {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [tileMode, setTileMode] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => stageRef.current?.focus({ preventScroll: true }), 0)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const word = value.trim()
    if (!word) return
    setFeedback({ type: 'success', message: `Submitted: "${word}"` })
    setValue('')
    setTimeout(() => setFeedback(null), 2000)
    stageRef.current?.focus({ preventScroll: true })
  }

  const handleStageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
      return
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      setValue((prev) => prev.slice(0, -1))
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setValue((prev) => prev + e.key)
    }
  }

  const sidebarContent = (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
        Test typing
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        Click anywhere or just type. Whole screen captures keys like the game.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={tileMode}
          onChange={(e) => setTileMode(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        Tile mode (letters in boxes)
      </label>
    </>
  )

  const stageContent = (
    <div
      ref={stageRef}
      data-test-typing-stage
      tabIndex={0}
      role="application"
      aria-label="Test typing stage"
      onClick={() => stageRef.current?.focus({ preventScroll: true })}
      onKeyDown={handleStageKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        outline: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: `${PROMPT_TOP_PERCENT}%`,
        pointerEvents: 'auto',
        zIndex: 100,
      }}
    >
      {/* Example prompt for spacing (matches game: ~20px below prompt) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(180,180,180,0.6)',
            borderRadius: 10,
            padding: '8px 20px',
            color: '#fbbf24',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 4,
          }}
        >
          this is a default prompt
        </div>
      </div>
      <div style={{ height: TYPING_GAP_BELOW_PROMPT_PX }} />
      <div style={{ width: '90%', maxWidth: 420 }}>
        <PlayerTypingComponent
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          disabled={false}
          placeholder="Type a word..."
          feedback={feedback}
          positionMode="belowPrompt"
          tileMode={tileMode}
        />
      </div>
    </div>
  )

  return (
    <TestPageShell sidebarContent={sidebarContent}>
      {typeof document !== 'undefined' && createPortal(stageContent, document.body)}
    </TestPageShell>
  )
}
