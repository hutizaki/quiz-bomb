import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

const THEME_KEY = 'quizbomb-theme'

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isPlayPage = location.pathname === '/play' || location.pathname.startsWith('/play')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Menu button — hidden on play page (lobby has its own left side menu) */}
      {!isPlayPage && (
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius)',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span aria-hidden>☰</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Menu</span>
        </button>
        {menuOpen && (
          <>
            <div
              role="presentation"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
              }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                minWidth: 160,
                padding: '0.5rem 0',
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 1001,
              }}
            >
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.5rem 1rem',
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 4,
                }}
              >
                QuizBomb
              </Link>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.4rem 1rem',
                  color: 'var(--muted)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
              >
                Home
              </Link>
              <Link
                to="/leaderboard"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.5rem 1rem',
                  color: 'var(--muted)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
              >
                Leaderboard
              </Link>
              <Link
                to="/history"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.5rem 1rem',
                  color: 'var(--muted)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
              >
                History
              </Link>
              <button
                type="button"
                onClick={() => {
                  toggleTheme()
                  setMenuOpen(false)
                }}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
              </button>
            </div>
          </>
        )}
      </div>
      )}

      <main style={{ flex: 1, padding: '1.5rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
      {!isPlayPage && (
        <footer style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
          QuizBomb — type words before the bomb blows
        </footer>
      )}
    </div>
  )
}
