// Minimal English word set for validation (words that contain common prompts)
const WORDS = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'are', 'but', 'his', 'had', 'they', 'from', 'she', 'their', 'been', 'would',
  'there', 'could', 'other', 'what', 'about', 'when', 'which', 'your', 'said', 'each', 'these', 'thing', 'think', 'than', 'then', 'them', 'some', 'make',
  'more', 'most', 'into', 'time', 'like', 'just', 'know', 'take', 'come', 'word', 'being', 'going', 'through', 'where', 'after', 'before', 'right',
  'running', 'something', 'anything', 'everything', 'nothing', 'thinking', 'working', 'playing', 'saying', 'having', 'doing', 'string', 'bring', 'ring',
  'king', 'sing', 'wing', 'cling', 'they', 'heat', 'heart', 'hear', 'here', 'her', 'hero', 'herb', 'stand', 'land', 'hand', 'band', 'sand', 'grand',
  'action', 'station', 'nation', 'option', 'motion', 'notion', 'things', 'three', 'those', 'game', 'name', 'same', 'came', 'take', 'make', 'wake', 'bake',
  'ate', 'gate', 'late', 'rate', 'date', 'get', 'let', 'met', 'set', 'bet', 'net', 'pet', 'wet', 'yet', 'end', 'and', 'send', 'tend', 'bend', 'mend',
  'the', 'then', 'them', 'they', 'their', 'these', 'those', 'this', 'that', 'thin', 'thick', 'thing', 'think', 'third', 'three', 'throw', 'thread',
  'ing', 'ring', 'sing', 'king', 'wing', 'bring', 'thing', 'string', 'sting', 'cling', 'fling', 'being', 'doing', 'going', 'seeing', 'having',
])

export function isValidWord(word: string, prompt: string): boolean {
  const w = word.toLowerCase().trim()
  if (w.length < 2 || w.length > 20) return false
  if (!/^[a-z]+$/.test(w)) return false
  if (!w.includes(prompt.toLowerCase())) return false
  return WORDS.has(w)
}

export function addWords(...words: string[]) {
  words.forEach((w) => WORDS.add(w.toLowerCase()))
}
