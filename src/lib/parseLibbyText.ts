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
  /^\d{1,2}:\d{2}$/,
  /^\d+\s*%$/,
  /^\d+g$/i,
  /^narrated by/i,
  /^format:/i,
  /^vormerken$/i,
  /^auszug lesen$/i,
  /^verlauf$/i,
  /^<\s*verlauf$/i,
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

// Libby renders the author's name in a small ALL-CAPS line directly above
// the (mixed-case) title. Require a few letters so short UI chrome (e.g. a
// leftover "5G"/battery reading) can't be mistaken for a name.
function looksLikeAllCapsAuthor(line: string): boolean {
  if (line.length < 4) return false
  return /[A-ZÀ-ÖØ-Þ]/.test(line) && !/[a-zà-öø-þ]/.test(line)
}

function toTitleCase(line: string): string {
  return line
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

// Strips trailing OCR junk (a misread share/clock icon often shows up as a
// stray digit or symbol right after the name) before title-casing.
function cleanAuthorLine(line: string): string {
  return line
    .replace(/\s*\d+\s*$/, '')
    .replace(/[^\p{L}\s'.-]+$/gu, '')
    .trim()
}

/**
 * Heuristically extracts title/author/pages from raw OCR text of a Libby
 * screenshot. Libby's book detail/history view shows the author in a small
 * ALL-CAPS line immediately above the (larger, mixed-case) title - that
 * adjacent pair is looked for first. Some screenshots also carry a
 * duplicate ALL-CAPS title line (a collapsed sticky header) before that
 * pair, which is skipped since it isn't itself followed by a mixed-case
 * line. Falls back to "Title by Author" on one line, then to the older
 * title-then-author two-line assumption for other layouts.
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

  for (let i = 0; i < candidates.length - 1; i++) {
    if (looksLikeAllCapsAuthor(candidates[i]) && !looksLikeAllCapsAuthor(candidates[i + 1])) {
      return { title: candidates[i + 1], author: toTitleCase(cleanAuthorLine(candidates[i])), pages }
    }
  }

  const inlineMatch = candidates[0]?.match(INLINE_AUTHOR_PATTERN)
  if (inlineMatch) {
    return { title: inlineMatch[1].trim(), author: inlineMatch[2].trim(), pages }
  }

  const title = candidates[0] ?? ''
  const author = stripAuthorPrefix(candidates[1] ?? '')

  return { title, author, pages }
}
