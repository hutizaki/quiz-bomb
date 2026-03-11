import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { LOSE_HEART_SHAKE_EVENT } from '@/lib/loseHeart'

const SHAKE_DURATION_MS = 650

type ShakeContextValue = {
  /** When set, the avatar with this id should play the shake animation. */
  shakingPlayerId: string | null
}

const ShakeContext = createContext<ShakeContextValue>({ shakingPlayerId: null })

export function ShakeProvider({ children }: { children: React.ReactNode }) {
  const [shakingPlayerId, setShakingPlayerId] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { playerId } = (e as CustomEvent<{ playerId: string }>).detail
      console.log('[EXPLODE] ShakeContext received LOSE_HEART_SHAKE_EVENT', { playerId })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setShakingPlayerId(playerId)
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        setShakingPlayerId(null)
      }, SHAKE_DURATION_MS)
    }
    console.log('[EXPLODE] ShakeContext adding LOSE_HEART_SHAKE_EVENT listener')
    window.addEventListener(LOSE_HEART_SHAKE_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(LOSE_HEART_SHAKE_EVENT, handler as EventListener)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <ShakeContext.Provider value={{ shakingPlayerId }}>
      {children}
    </ShakeContext.Provider>
  )
}

export function useShake(): ShakeContextValue {
  return useContext(ShakeContext)
}
