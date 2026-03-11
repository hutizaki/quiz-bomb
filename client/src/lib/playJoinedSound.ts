/**
 * Play joined sound when a player joins the lobby.
 * Uses bundled asset from src/assets/joined.mp3.
 */
import joinedSoundUrl from '@/assets/joined.mp3'

let audio: HTMLAudioElement | null = null
let loadPromise: Promise<void> | null = null

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audio) {
    audio = new Audio(joinedSoundUrl)
  }
  return audio
}

/**
 * Play the joined lobby sound. Safe to call repeatedly (e.g. rapid add player).
 */
export function playJoinedSound(): void {
  try {
    const el = getAudio()
    if (!el) return
    el.currentTime = 0
    void el.play()
  } catch {
    // ignore
  }
}
