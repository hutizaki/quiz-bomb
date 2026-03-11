import { PROMPT_TOP_PERCENT } from '../testStageConfig'

export interface PromptComponentProps {
  /** The letter or prompt fragment players must include in their word (e.g. "o") */
  prompt: string
}

export function PromptComponent({ prompt }: PromptComponentProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${PROMPT_TOP_PERCENT}%`,
        left: '50%',
        transform: 'translateX(-50%)',
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
        {prompt || '—'}
      </div>
    </div>
  )
}
