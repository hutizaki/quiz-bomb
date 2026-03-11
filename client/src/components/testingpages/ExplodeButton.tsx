import type { ButtonHTMLAttributes } from 'react'
import { useExplosionOnExplode } from './TestPageShellContext'

const explodeButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#e2e8f0',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 8,
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

export interface ExplodeButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /**
   * Optional custom click handler. When provided, runs instead of context triggerExplode.
   * When omitted and used inside TestPageShell, uses context triggerExplode (spawn explosion + lose-heart callback).
   */
  onClick?: () => void
}

/**
 * Isolated, reusable "Explode" button. Use inside TestPageShell to trigger explosion + lose-heart,
 * or pass onClick for custom behavior (e.g. runLoseHeartEffects elsewhere).
 */
export function ExplodeButton({ onClick, style, children = 'Explode', ...rest }: ExplodeButtonProps) {
  const [, triggerExplode] = useExplosionOnExplode()
  const handleClick = () => {
    const handler = onClick ?? triggerExplode
    handler?.()
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{ ...explodeButtonStyle, ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
