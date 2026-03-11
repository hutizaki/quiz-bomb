// Common letter prompts for word bomb (substrings that must appear in the word)
export const PROMPTS_1 = ['a', 'e', 'i', 'o', 'u', 't', 's', 'r', 'n', 'l']
export const PROMPTS_2 = [
  'th', 'he', 'in', 'er', 'an', 'ed', 're', 'on', 'at', 'en',
  'nd', 'ti', 'es', 'or', 'te', 'of', 'ar', 'to', 'it', 'is',
  'ing', 'and', 'ion', 'ent', 'ter', 'ate', 'for', 'con', 'nce', 'ted',
]
export const PROMPTS_3 = [
  'ing', 'and', 'ion', 'ent', 'ter', 'ate', 'for', 'con', 'nce', 'ted',
  'the', 'ere', 'ver', 'ith', 'has', 'nce', 'ive', 'all', 'ble', 'com',
]

export function getRandomPrompt(roundIndex: number): string {
  const prompts = roundIndex < 3 ? PROMPTS_1 : roundIndex < 8 ? PROMPTS_2 : PROMPTS_3
  return prompts[Math.floor(Math.random() * prompts.length)]
}
