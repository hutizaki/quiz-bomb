import { useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { playTypeSound } from '@/lib/typeSound'

export interface PlayerTypingComponentProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  disabled?: boolean
  placeholder?: string
  /** Optional feedback message (e.g. "Link copied!" or error) */
  feedback?: { type: 'success' | 'error' | 'neutral'; message: string } | null
  /** Ref for the focusable key-capture container (e.g. to refocus after submit) */
  containerRef?: React.RefObject<HTMLDivElement | null>
  /** @deprecated Use containerRef. Ref for the focusable key-capture container. */
  inputRef?: React.RefObject<HTMLDivElement | null>
  /** When 'belowPrompt', component uses relative positioning so parent can place it ~20px below the prompt */
  positionMode?: 'bottom' | 'belowPrompt'
  /** When true (default), each letter is in a tile/box. When false, letters are plain text, same font, no boxes. */
  tileMode?: boolean
  /** When true, display value only; no focus, no key handling, no type sound. Used so everyone sees the same letters. */
  readOnly?: boolean
  /** When readOnly and value is empty, show "Waiting for [name] to type…". Omit for generic message. */
  waitingForName?: string
}

export function PlayerTypingComponent({
  value,
  onChange,
  onSubmit,
  disabled = false,
  feedback,
  containerRef: containerRefProp,
  inputRef: inputRefProp,
  positionMode = 'bottom',
  tileMode = true,
  readOnly = false,
  waitingForName,
}: PlayerTypingComponentProps) {
  const containerRefInternal = useRef<HTMLDivElement>(null)
  const prevValueLengthRef = useRef(value.length)
  console.log('[TYPING] PlayerTypingComponent render — readOnly:', readOnly, 'disabled:', disabled, 'value:', value)

  // Pitch-shift: one sample, playback rate from current length (backspace = lower next note). Gradual increase per letter.
  const BASE_PITCH = 1.0
  const PITCH_INCREASE_PER_LETTER = 0.035
  const MAX_PITCH = 1.45

  // Play type sound whenever value gains one character; only when not readOnly (so only typist hears)
  useEffect(() => {
    if (readOnly) return
    if (value.length === prevValueLengthRef.current + 1) {
      const pitch = BASE_PITCH + value.length * PITCH_INCREASE_PER_LETTER
      playTypeSound(Math.min(pitch, MAX_PITCH))
    }
    prevValueLengthRef.current = value.length
  }, [value, readOnly])

  const setRef = (el: HTMLDivElement | null) => {
    (containerRefInternal as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (containerRefProp) (containerRefProp as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (inputRefProp) (inputRefProp as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // When it's the player's turn and not disabled and not readOnly, focus the key-capture area so they can type immediately
  useEffect(() => {
    console.log('[TYPING] PlayerTypingComponent focus effect — disabled:', disabled, 'readOnly:', readOnly)
    if (disabled || readOnly) return
    console.log('[TYPING] Focusing typing container')
    containerRefInternal.current?.focus({ preventScroll: true })
  }, [disabled, readOnly])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    console.log('[TYPING] PlayerTypingComponent handleKeyDown — key:', e.key, 'disabled:', disabled, 'readOnly:', readOnly)
    if (disabled || readOnly) return
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit(e as unknown as FormEvent<HTMLFormElement>)
      return
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      onChange(value.slice(0, -1))
      return
    }
    // Single character (letter, number, space, etc.) — append to word (sound plays via useEffect on value change)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      onChange(value + e.key)
    }
  }

  const focusContainer = () => {
    if (!disabled && !readOnly) containerRefInternal.current?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={setRef}
      role="textbox"
      tabIndex={readOnly ? -1 : 0}
      aria-label={readOnly ? 'Current word being typed' : 'Type your word. Press Enter to submit.'}
      aria-readonly={readOnly}
      onClick={focusContainer}
      onKeyDown={readOnly ? undefined : handleKeyDown}
      style={{
        ...(positionMode === 'belowPrompt'
          ? { position: 'relative' as const, width: '100%' }
          : {
              position: 'absolute' as const,
              bottom: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: 420,
            }),
        minHeight: positionMode === 'belowPrompt' ? undefined : 140,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: positionMode === 'belowPrompt' ? 'flex-start' : 'center',
        gap: 12,
        cursor: readOnly ? 'default' : disabled ? 'not-allowed' : 'text',
        isolation: 'isolate',
        outline: 'none',
      }}
    >
      {/* Visual: placeholder or letter boxes — gap here = space between each letter box */}
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 80,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        {value.length === 0 ? (
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            {readOnly
              ? (waitingForName ? `Waiting for ${waitingForName} to type…` : 'Waiting for current player to type…')
              : 'Type your word'}
          </span>
        ) : tileMode ? (
          value.split('').map((char, i) => (
            <span
              key={`${i}-${char}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 36,
                height: 36,
                padding: '0',
                background: 'rgba(0,0,0,0.75)',
                borderRadius: 'var(--radius)',
                color: '#f1f5f9',
                fontSize: '1.65rem',
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {char.toUpperCase()}
            </span>
          ))
        ) : (
          <>
            <span
              style={{
                color: '#f1f5f9',
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              {value}
            </span>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 3,
                height: '1.2em',
                marginLeft: 2,
                background: '#f1f5f9',
                verticalAlign: 'text-bottom',
                animation: 'player-typing-cursor-blink 1s step-end infinite',
              }}
            />
          </>
        )}
      </div>
      {feedback && (
        <p
          aria-live="polite"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            margin: 0,
            marginTop: 8,
            color: feedback.type === 'success' ? 'var(--success)' : feedback.type === 'error' ? 'var(--error)' : 'var(--muted)',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
          }}
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
