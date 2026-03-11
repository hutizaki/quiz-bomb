import { ReactNode, useContext, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ExplosionCanvas } from '@/components/game'
import explosionSprite from '@/assets/explosion.png'
import { STAGE_CENTER_Y_PERCENT } from '../testStageConfig'
import {
  DEFAULT_AVATAR_SIZE_PX,
  DEFAULT_EXPLOSION_SCALE,
  ExplosionAvatarSizeContext,
  ExplosionOnExplodeContext,
  TestLoseHeartContext,
  useTestPageShellExplosion,
} from './TestPageShellContext'

const THEME_KEY = 'quizbomb-theme'

const STAGE_BACKGROUND =
  'radial-gradient(ellipse at 40% 30%, #1a2535 0%, #0d1520 60%, #080e18 100%)'

export interface TestPageShellProps {
  children: ReactNode
  /** Controls/buttons for this test page; shown in an overlay panel that expands from the left bar. Does not affect layout. */
  sidebarContent?: ReactNode
}

/**
 * Wraps test pages so the thing being tested sees the full viewport (whole browser).
 * Left-side menu is an overlay and does NOT affect the layout of the test content.
 * Optional sidebarContent expands as an overlay panel from the left bar.
 */
export function TestPageShell({ children, sidebarContent }: TestPageShellProps) {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const [avatarSizePx, setAvatarSizePx] = useState(DEFAULT_AVATAR_SIZE_PX)
  const [scaleFactor, setScaleFactor] = useState(DEFAULT_EXPLOSION_SCALE)
  const onLoseHeart = useContext(TestLoseHeartContext)
  const { explosions, onComplete, setOnExplode, triggerExplode } = useTestPageShellExplosion(
    avatarSizePx,
    scaleFactor,
    onLoseHeart
  )
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
  })

  const isTestPage = ['/test-bomb', '/test-arrow', '/test-usercircle', '/test-avatar', '/test-typing'].includes(location.pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (isTestPage) setExpanded(true)
  }, [isTestPage])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const navItems = [
    { to: '/test-bomb', label: 'Bomb' },
    { to: '/test-arrow', label: 'Arrow' },
    { to: '/test-usercircle', label: 'Circle' },
    { to: '/test-avatar', label: 'Avatar' },
    { to: '/test-typing', label: 'Typing' },
  ]

  return (
    <ExplosionAvatarSizeContext.Provider
      value={{ avatarSizePx, setAvatarSizePx, scaleFactor, setScaleFactor }}
    >
    <ExplosionOnExplodeContext.Provider value={{ setOnExplode, triggerExplode }}>
      {/* Full-viewport stage: background + test content. Menu does not affect this layout. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: STAGE_BACKGROUND,
          overflow: 'auto',
          ['--test-stage-center-y' as string]: `${STAGE_CENTER_Y_PERCENT}%`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${STAGE_CENTER_Y_PERCENT}%`,
            transform: 'translate(-50%, -50%)',
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </div>

      {/* Explosion layer: canvas covers stage; spawn at viewport center */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
        <ExplosionCanvas
          explosions={explosions}
          onComplete={onComplete}
          spriteUrl={explosionSprite}
          frameSize={80}
        />
      </div>

      {/* Left overlay menu — does not take space from the stage */}
      <nav
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 56,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          paddingTop: 12,
          paddingBottom: 12,
          background: 'rgba(15,23,42,0.9)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
        }}
      >
        {navItems.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setExpanded(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 10,
              color: location.pathname === to ? '#818cf8' : 'rgba(255,255,255,0.5)',
              background: location.pathname === to ? 'rgba(99,102,241,0.2)' : 'transparent',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              transition: 'all 0.2s ease',
            }}
            title={label}
          >
            {label}
          </Link>
        ))}
        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 10,
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
            fontSize: 18,
            transition: 'color 0.2s ease',
          }}
          title="Home"
        >
          ⌂
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{
          width: 44,
          height: 44,
          border: 'none',
          borderRadius: 10,
          background: 'transparent',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀' : '☽'}
        </button>
      </nav>

      {/* Expandable overlay panel — does not affect stage layout */}
      {sidebarContent != null && expanded && (
        <div
          style={{
            position: 'fixed',
            left: 56,
            top: 0,
            bottom: 0,
            width: 280,
            zIndex: 1000,
            background: 'rgba(15,23,42,0.96)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>
              CONTROLS
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close"
              style={{
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
          {sidebarContent}
        </div>
      )}
    </ExplosionOnExplodeContext.Provider>
    </ExplosionAvatarSizeContext.Provider>
  )
}
