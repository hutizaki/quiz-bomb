import { createContext, useContext, useRef, ReactNode } from 'react'
import {
  createTestLobbyRoom,
  type TestLobbyRoom,
} from '@/lib/testLobbyReplica'

type TestLobbyContextValue = {
  room: TestLobbyRoom
}

const TestLobbyContext = createContext<TestLobbyContextValue | null>(null)

export function TestLobbyProvider({ children }: { children: ReactNode }) {
  const roomRef = useRef<TestLobbyRoom | null>(null)
  if (!roomRef.current) {
    roomRef.current = createTestLobbyRoom()
  }
  const room = roomRef.current
  return (
    <TestLobbyContext.Provider value={{ room }}>
      {children}
    </TestLobbyContext.Provider>
  )
}

export function useTestLobby(): TestLobbyContextValue {
  const value = useContext(TestLobbyContext)
  if (!value) {
    throw new Error('useTestLobby must be used within TestLobbyProvider')
  }
  return value
}
