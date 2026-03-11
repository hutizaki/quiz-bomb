import { useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserAvatar, type UserCirclePlayer } from '@/components/game'
import { removePlayerHeart } from '@/lib/loseHeart'
import { useShake } from '@/contexts/ShakeContext'
import { TestPageShell } from './TestPageShell'
import { ExplodeButton } from './ExplodeButton'
import { TestLoseHeartContext, useExplosionAvatarSize } from './TestPageShellContext'

const DEFAULT_AVATAR_SIZE_PX = 58
/** Manual scale used for testing (wrapper transform: scale(5)); explosion respects this. */
const TEST_DISPLAY_SCALE = 5

const DEFAULT_PLAYER: UserCirclePlayer = {
  id: '0',
  name: 'Player',
  lives: 3,
  hearts: 3,
  crown: false,
}

/**
 * Same state (player) drives UserAvatar (profile circle + hearts pill). We provide
 * applyLoseHeart via TestLoseHeartContext so when Explode is pressed the shell
 * calls it and this state updates — avatar and hearts DOM stay in sync.
 */
export function TestAvatarPage() {
  const [player, setPlayer] = useState<UserCirclePlayer>(DEFAULT_PLAYER)
  const { shakingPlayerId } = useShake()
  const [, setAvatarSizePx, , setScaleFactor] = useExplosionAvatarSize()

  const applyLoseHeart = useCallback(() => {
    setPlayer((prev) => removePlayerHeart([prev], prev.id)[0])
  }, [])

  useEffect(() => {
    setAvatarSizePx(DEFAULT_AVATAR_SIZE_PX)
    setScaleFactor(TEST_DISPLAY_SCALE)
  }, [setAvatarSizePx, setScaleFactor])

  const sidebarContent = (
    <>
      <ExplodeButton />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Name</div>
      <input
        type="text"
        value={player.name}
        onChange={(e) => setPlayer((p) => ({ ...p, name: e.target.value || 'Player' }))}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.2)',
          color: '#e2e8f0',
          fontSize: 13,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={player.crown}
          onChange={(e) => setPlayer((p) => ({ ...p, crown: e.target.checked }))}
        />
        Crown (host)
      </label>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Hearts</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPlayer((p) => ({ ...p, hearts: n }))}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${(player.hearts ?? 0) === n ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              background: (player.hearts ?? 0) === n ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {n} ❤️
          </button>
        ))}
      </div>
    </>
  )

  return (
    <TestLoseHeartContext.Provider value={applyLoseHeart}>
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
        <div style={{ transform: 'scale(5)', transformOrigin: 'center center' }}>
          <UserAvatar
            player={player}
            avatarSizePx={58}
            onRemove={player.crown ? () => {} : undefined}
            shaking={shakingPlayerId != null}
          />
        </div>
      </motion.div>
      </TestPageShell>
    </TestLoseHeartContext.Provider>
  )
}
