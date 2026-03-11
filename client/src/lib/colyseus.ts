import { Client, Room } from 'colyseus.js'

// Same origin + /colyseus so Vite proxy forwards to Colyseus server
const endpoint =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/colyseus`
    : 'ws://localhost:2567'
const gameClient = new Client(endpoint)

export type GameRoom = Room

export async function createRoom(nickname: string): Promise<{ roomId: string; room: GameRoom }> {
  const room = await gameClient.create('game', { nickname })
  console.log('Joined room:', room.id)
  return { roomId: room.id, room }
}

export async function joinRoom(roomId: string, nickname: string): Promise<GameRoom> {
  const room = await gameClient.joinById(roomId, { nickname })
  console.log('Joined room:', room.id)
  return room
}

export function getClient() {
  return gameClient
}
