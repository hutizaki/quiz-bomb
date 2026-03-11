const MAX_ROUNDS = 500

export interface ParsedRound {
  prompt: string
  answers: string[]
}

export interface ParseQuestionsResult {
  rounds: ParsedRound[]
  invalidLines: number
}

/**
 * Parse TXT content: one row per round.
 * Format per line: question ~ answer1, answer2, ...
 * - First ~ separates question from answers.
 * - Answers separated by comma; all trimmed. Empty lines and invalid rows skipped.
 */
export function parseQuestionsTxt(text: string): ParseQuestionsResult {
  const rounds: ParsedRound[] = []
  let invalidLines = 0
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length && rounds.length < MAX_ROUNDS; i++) {
    const line = lines[i]
    const tildeIndex = line.indexOf('~')
    if (tildeIndex === -1) {
      invalidLines += 1
      continue
    }
    const prompt = line.slice(0, tildeIndex).trim()
    const answersStr = line.slice(tildeIndex + 1).trim()
    const answers = answersStr
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    if (answers.length === 0) {
      invalidLines += 1
      continue
    }
    rounds.push({ prompt, answers })
  }

  return { rounds, invalidLines }
}
