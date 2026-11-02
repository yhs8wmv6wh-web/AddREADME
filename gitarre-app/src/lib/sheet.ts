// Liest eingefügte Songtexte: "Akkorde über Text" (wie bei Ultimate Guitar),
// ChordPro ([Am]Text, {title: …}) und Tabs.
import { isChord, transposeChord } from './music'

export interface ChordToken {
  col: number
  text: string
  chord: boolean
}

export type SheetLine =
  | { kind: 'empty' }
  | { kind: 'section'; text: string }
  | { kind: 'chords'; tokens: ChordToken[] }
  | { kind: 'lyrics'; text: string }
  | { kind: 'tab'; text: string }

export interface ParsedSheet {
  title?: string
  artist?: string
  capo?: number
  lines: SheetLine[]
}

// Füllwörter, die in Akkordzeilen vorkommen dürfen, ohne dass sie Akkorde sind.
const FILLER = /^(\|+|:?\|\|?:?|x\d+|\(x\d+\)|\d+x|\(\d+x\)|\*+|-+|\.{2,}|%|N\.?C\.?|\/+|>|→|-->|\(|\))$/i

function cleanToken(t: string): string {
  // "(G)" oder "G," -> "G"
  return t.replace(/^\(+/, '').replace(/[),]+$/, '')
}

function tokenize(line: string): ChordToken[] {
  const tokens: ChordToken[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const cleaned = cleanToken(m[0])
    tokens.push({ col: m.index, text: m[0], chord: cleaned !== '' && isChord(cleaned) })
  }
  return tokens
}

function isChordLine(line: string): ChordToken[] | null {
  const tokens = tokenize(line)
  if (tokens.length === 0) return null
  let chords = 0
  for (const t of tokens) {
    if (t.chord) chords++
    else if (!FILLER.test(t.text)) return null
  }
  return chords > 0 ? tokens : null
}

const TAB_CHARS = /^[\s\-–|0-9hpbrxvst/\\~()*^.=:<>[\]]*$/i

function isTabLine(line: string): boolean {
  const t = line.trim()
  if (t.length < 6) return false
  const dashes = (t.match(/[-–]/g) ?? []).length
  if (dashes < 4) return false
  // Optionaler Saitenname vorne: e| B| G| D| A| E| oder e:
  const body = t.replace(/^[A-Ga-gHh][#b]?\s*[|:]/, '|')
  return TAB_CHARS.test(body) && dashes / t.length > 0.3
}

const SECTION_WORDS =
  /^(intro|verse|vers|strophe|chorus|refrain|pre-?chorus|bridge|outro|solo|interlude|zwischenspiel|instrumental|ending|coda|riff|hook)\b/i

function sectionOf(line: string): string | null {
  const t = line.trim()
  const bracket = /^\[([^\]]+)\]$/.exec(t)
  if (bracket && !isChord(bracket[1])) return bracket[1].trim()
  if (t.length <= 30 && SECTION_WORDS.test(t) && /:$|^\S+(\s\d+)?$/.test(t)) return t.replace(/:$/, '')
  return null
}

// ChordPro-Zeile "Ich [Am]geh [C]heim" -> Akkordzeile + Textzeile
function splitInlineChords(line: string): { chords: ChordToken[]; lyric: string } | null {
  const re = /\[([^\]]+)\]/g
  if (!re.test(line)) return null
  re.lastIndex = 0
  let lyric = ''
  let last = 0
  const chords: ChordToken[] = []
  let m: RegExpExecArray | null
  let found = false
  while ((m = re.exec(line))) {
    if (!isChord(m[1])) return null
    found = true
    lyric += line.slice(last, m.index)
    const prevEnd = chords.length ? chords[chords.length - 1].col + chords[chords.length - 1].text.length + 1 : 0
    const col = Math.max(lyric.length, prevEnd)
    if (col > lyric.length) lyric += ' '.repeat(col - lyric.length)
    chords.push({ col, text: m[1], chord: true })
    last = m.index + m[0].length
  }
  if (!found) return null
  lyric += line.slice(last)
  return { chords, lyric: lyric.replace(/\s+$/, '') }
}

export function parseSheet(text: string): ParsedSheet {
  const out: ParsedSheet = { lines: [] }
  const raw = text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')

  for (const rawLine of raw) {
    const line = rawLine.replace(/\s+$/, '')

    // ChordPro-Direktiven
    const dir = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(line)
    if (dir) {
      const key = dir[1].toLowerCase()
      const val = dir[2] ?? ''
      if (key === 'title' || key === 't') out.title = val
      else if (key === 'artist' || key === 'subtitle' || key === 'st') out.artist = val
      else if (key === 'capo') out.capo = parseInt(val, 10) || 0
      else if (key === 'soc' || key === 'start_of_chorus') out.lines.push({ kind: 'section', text: val || 'Refrain' })
      else if (key === 'sov' || key === 'start_of_verse') out.lines.push({ kind: 'section', text: val || 'Strophe' })
      else if (key === 'sob' || key === 'start_of_bridge') out.lines.push({ kind: 'section', text: val || 'Bridge' })
      else if (key === 'c' || key === 'comment' || key === 'ci' || key === 'comment_italic')
        out.lines.push({ kind: 'section', text: val })
      continue
    }

    if (line.trim() === '') {
      out.lines.push({ kind: 'empty' })
      continue
    }

    const capo = /^\s*(capo|kapo)\s*[:=]?\s*(\d+)/i.exec(line)
    if (capo && line.trim().length < 30) {
      out.capo = parseInt(capo[2], 10)
      continue
    }

    const section = sectionOf(line)
    if (section) {
      out.lines.push({ kind: 'section', text: section })
      continue
    }

    if (isTabLine(line)) {
      out.lines.push({ kind: 'tab', text: line })
      continue
    }

    const chordTokens = isChordLine(line)
    if (chordTokens) {
      out.lines.push({ kind: 'chords', tokens: chordTokens })
      continue
    }

    const inline = splitInlineChords(line)
    if (inline) {
      out.lines.push({ kind: 'chords', tokens: inline.chords })
      if (inline.lyric.trim()) out.lines.push({ kind: 'lyrics', text: inline.lyric })
      continue
    }

    out.lines.push({ kind: 'lyrics', text: line })
  }

  // Mehrfache Leerzeilen zusammenfassen
  out.lines = out.lines.filter((l, i, arr) => !(l.kind === 'empty' && arr[i - 1]?.kind === 'empty'))
  return out
}

/** Akkordname eines Tokens nach Transposition (Klammern/Kommas bleiben erhalten). */
export function tokenChord(t: ChordToken, semitones: number): string {
  const cleaned = cleanToken(t.text)
  return transposeChord(cleaned, semitones)
}

export function renderTokenText(t: ChordToken, semitones: number): string {
  if (!t.chord) return t.text
  const cleaned = cleanToken(t.text)
  return t.text.replace(cleaned, transposeChord(cleaned, semitones))
}

/** Alle Akkorde in Spielreihenfolge. */
export function chordSequence(sheet: ParsedSheet, semitones: number): string[] {
  const seq: string[] = []
  for (const l of sheet.lines) {
    if (l.kind !== 'chords') continue
    for (const t of l.tokens) if (t.chord) seq.push(tokenChord(t, semitones))
  }
  return seq
}

export function uniqueChords(seq: string[]): string[] {
  return [...new Set(seq)]
}

export interface Transition {
  a: string
  b: string
  count: number
}

/** Häufigste Akkordwechsel (ungerichtet: Am↔C zählt zusammen). */
export function transitions(seq: string[]): Transition[] {
  const map = new Map<string, Transition>()
  for (let i = 1; i < seq.length; i++) {
    const x = seq[i - 1]
    const y = seq[i]
    if (x === y) continue
    const [a, b] = x < y ? [x, y] : [y, x]
    const key = a + '|' + b
    const t = map.get(key) ?? { a: x, b: y, count: 0 }
    t.count++
    map.set(key, t)
  }
  return [...map.values()].sort((p, q) => q.count - p.count)
}
