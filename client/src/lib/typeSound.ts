import typeSoundUrl from '@/assets/typeSound.mp3'

let ctx: AudioContext | null = null
let buffer: AudioBuffer | null = null
let loadPromise: Promise<void> | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    void loadBuffer()
  }
  return ctx
}

function loadBuffer(): Promise<void> {
  if (buffer) return Promise.resolve()
  if (loadPromise) return loadPromise
  const context = getContext()
  if (!context) return Promise.resolve()
  loadPromise = fetch(typeSoundUrl)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((decoded) => {
      buffer = decoded
    })
    .catch(() => {})
  return loadPromise
}

/**
 * Play the typing key sound with pitch (playback rate) via Web Audio API.
 * One sample, real-time pitch shift, low latency, overlapping plays supported.
 * @param playbackRate — 1 = normal; >1 higher pitch, <1 lower. Tie to current string length so backspace lowers the next note.
 */
export function playTypeSound(playbackRate = 1): void {
  try {
    const context = getContext()
    if (!context) return
    if (!buffer) {
      void loadBuffer()
      return
    }
    if (context.state === 'suspended') {
      void context.resume()
      return
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRate
    const gainNode = context.createGain()
    gainNode.gain.value = 0.1
    source.connect(gainNode)
    gainNode.connect(context.destination)
    source.start(0)
  } catch {
    // ignore
  }
}
