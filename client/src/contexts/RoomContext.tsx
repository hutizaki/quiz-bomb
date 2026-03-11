import { createContext, useContext, useState, ReactNode } from 'react'
import type { Room } from 'colyseus.js'

type GameRoom = Room

const RoomContext = createContext<{
  room: GameRoom | null
  setRoom: (r: GameRoom | null) => void
}>({ room: null, setRoom: () => {} })

export function RoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<GameRoom | null>(null)
  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  return useContext(RoomContext)
}
