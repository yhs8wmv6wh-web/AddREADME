export interface ParsedBookGuess {
  title: string
  author: string
  pages: number | null
}

const NOISE_PATTERNS = [
  /^borrowed$/i,
  /^returned/i,
  /^renew/i,
  /^loan/i,
  /^\d+\s*days?\s*left/i,
  /^send to device/i,
  /^available/i,
  /^holds?$/i,
  /^wish list$/i,
  /^tags?$/i,
  /^ebook$/i,
  /^audiobook$/i,
  /^\d+\s*of\s*\d+$/i,
  /^expires?/i,
  /^due/i,
  /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/,
  /^\d+%$/,
  /^narrated by/i,
  /^format:/i,
]

const PAGE_PATTERN = /(\d{2,4})\s*(pages|seiten)/i

// Matches "Title by Author" / "Title von Author" on a single OCR'd line,
// and a standalone "by Author" / "von Author" line.
const INLINE_AUTHOR_PATTERN = /^(.*\S)\s+(?:by|von)\s+(.+)$/i
const STANDALONE_BY_PATTERN = /^(?:by|von)\s+(.+)$/i

function isNoise(line: string): boolean {
  if (line.length < 2) return true
  if (/^\d+$/.test(line)) return true
  return NOISE_PATTERNS.some((pattern) => pattern.test(line))
}

function stripAuthorPrefix(line: string): string {
  const match = line.match(STANDALONE_BY_PATTERN)
  return match ? match[1].trim() : line
}

/**
 * Heuristically extracts title/author/pages from raw OCR text of a Libby
 * screenshot. Libby's layout puts the title in a larger bold line followed
 * by the author on the next line, surrounded by UI chrome we filter out.
 * Some layouts instead OCR title and author onto one "Title by Author" line.
 */
export function parseLibbyText(rawText: string): ParsedBookGuess {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let pages: number | null = null
  for (const line of lines) {
    const match = line.match(PAGE_PATTERN)
    if (match) {
      pages = parseInt(match[1], 10)
      break
    }
  }

  const candidates = lines.filter((line) => !isNoise(line) && !PAGE_PATTERN.test(line))

  const inlineMatch = candidates[0]?.match(INLINE_AUTHOR_PATTERN)
  if (inlineMatch) {
    return { title: inlineMatch[1].trim(), author: inlineMatch[2].trim(), pages }
  }

  const title = candidates[0] ?? ''
  const author = stripAuthorPrefix(candidates[1] ?? '')

  return { title, author, pages }
}
