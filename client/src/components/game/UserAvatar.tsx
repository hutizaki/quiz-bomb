import { useState } from 'react'
import quizBombHeart from '../../assets/quizBombHeart.png'
import { getDisplayHearts, hasZeroHearts } from '@/lib/loseHeart'
import type { UserCirclePlayer } from './UserCircle'

export interface UserAvatarProps {
  player: UserCirclePlayer
  /** Avatar circle size in px (default 55) */
  avatarSizePx?: number
  /** When set, enables lobby mode: click to remove, leader glow */
  onRemove?: (id: string) => void
  /** When true, plays a short left–right shake (pivot at bottom of circle) */
  shaking?: boolean
}

/** Fixed overlay offsets (px) from the profile circle. Scale with avatar size. */
const OVERLAY = {
  GAP: 4,
  CROWN_HEIGHT: 13,
  NAME_FONT_SIZE: 11,
} as const

/**
 * Profile circle is the anchor. Crown, name, and hearts are fixed overlays
 * positioned in relation to the circle (no center-offset math).
 */
export function UserAvatar({
  player,
  avatarSizePx = 55,
  onRemove,
  shaking = false,
}: UserAvatarProps) {
  const [hovered, setHovered] = useState(false)
  const isLobbyMode = !!onRemove

  const scale = avatarSizePx / 55
  const svgSize = Math.round(avatarSizePx * 0.8)
  const gap = Math.max(2, Math.round(OVERLAY.GAP * scale))
  const crownH = Math.round(OVERLAY.CROWN_HEIGHT * scale)
  const nameAboveCircle = gap + crownH + gap
  const zeroHearts = hasZeroHearts(player)

  const handleClick = () => {
    if (onRemove) onRemove(player.id)
  }

  const wrapperTransform = zeroHearts ? 'scale(0.7)' : 'none'

  return (
    <div
      style={{
        position: 'relative',
        width: avatarSizePx,
        height: avatarSizePx,
        transform: wrapperTransform,
        transformOrigin: '50% 50%',
        filter: zeroHearts ? 'grayscale(100%)' : 'none',
        transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: isLobbyMode ? 'pointer' : undefined,
      }}
      onMouseEnter={() => isLobbyMode && setHovered(true)}
      onMouseLeave={() => isLobbyMode && setHovered(false)}
      onClick={isLobbyMode ? handleClick : undefined}
    >
      {/* Profile circle — fills the anchor; shake pivots at bottom (50% 100%) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: avatarSizePx,
          height: avatarSizePx,
          borderRadius: '50%',
          transformOrigin: '50% 100%',
          animation: shaking ? 'avatar-shake 0.6s ease-in-out 1' : undefined,
          background:
            isLobbyMode && hovered
              ? 'linear-gradient(145deg,#ef4444,#b91c1c)'
              : 'linear-gradient(145deg,#3b82f6,#1d4ed8)',
          border: `3px solid ${
            player.crown && isLobbyMode ? '#f97316' : isLobbyMode && hovered ? '#ef4444' : '#64748b'
          }`,
          boxShadow:
            isLobbyMode && hovered
              ? '0 0 18px rgba(239,68,68,0.5),0 4px 20px rgba(0,0,0,0.6)'
              : player.crown && isLobbyMode
                ? '0 0 18px rgba(249,115,22,0.5),0 4px 20px rgba(0,0,0,0.6)'
                : '0 4px 20px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: isLobbyMode ? 1 : player.lives > 0 ? 1 : 0.5,
          transition: 'all 0.2s ease',
        }}
      >
        {isLobbyMode && hovered ? (
          <span style={{ fontSize: Math.round(22 * scale), color: '#fff', fontWeight: 900 }}>✕</span>
        ) : (
          <svg width={svgSize} height={svgSize} viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="22" fill="#60a5fa" />
            <ellipse cx="22" cy="27" rx="12" ry="9" fill="#fca5a5" />
            <circle cx="22" cy="18" r="8" fill="#fca5a5" />
            <circle cx="19" cy="17" r="1.5" fill="#1e293b" />
            <circle cx="25" cy="17" r="1.5" fill="#1e293b" />
            <path d="M19 21 Q22 23.5 25 21" stroke="#1e293b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <ellipse cx="12" cy="19" rx="5" ry="7" fill="#f87171" />
            <ellipse cx="32" cy="19" rx="5" ry="7" fill="#f87171" />
          </svg>
        )}
      </div>

      {/* Crown — fixed above circle */}
      {player.crown && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: gap,
            fontSize: Math.max(10, Math.round(13 * scale)),
            filter: 'drop-shadow(0 0 4px #fbbf24)',
          }}
        >
          👑
        </span>
      )}

      {/* Name — fixed above circle (above crown if present), pill touches circle */}
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: player.crown ? nameAboveCircle : 0,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.65)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#e2e8f0',
            fontSize: Math.max(9, Math.round(OVERLAY.NAME_FONT_SIZE * scale)),
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 700,
            letterSpacing: 0.3,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
          }}
        >
          {player.name}
        </span>
      </div>

      {/* Hearts pill — bottom aligned to bottom of profile circle */}
      {getDisplayHearts(player) > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            padding: 3,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.65)',
            minHeight: 0,
            maxHeight: 25,
          }}
        >
          {Array.from({ length: getDisplayHearts(player) }, (_, i) => {
            const heartSize = Math.min(19, Math.max(10, Math.round(15 * scale)))
            return (
              <img
                key={i}
                src={quizBombHeart}
                alt=""
                aria-hidden
                style={{
                  width: heartSize,
                  height: heartSize,
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
