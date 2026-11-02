// Grundlagen: Tonnamen, Akkordnamen parsen, transponieren.

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 }

/** Tonname (C, C#, Db, H …) -> Halbton 0..11, oder null. */
export function noteIndex(name: string): number | null {
  const m = /^([A-H])([#b]?)$/.exec(name)
  if (!m) return null
  let i = LETTER_INDEX[m[1]]
  if (m[2] === '#') i += 1
  if (m[2] === 'b') i -= 1
  return (i + 12) % 12
}

export function noteName(index: number): string {
  return NOTE_NAMES[((index % 12) + 12) % 12]
}

export type Quality =
  | ''
  | 'm'
  | '7'
  | 'm7'
  | 'maj7'
  | 'm7b5'
  | 'dim'
  | 'dim7'
  | 'aug'
  | 'sus2'
  | 'sus4'
  | '7sus4'
  | '6'
  | 'm6'
  | '9'
  | 'add9'
  | 'madd9'
  | '5'

export interface ParsedChord {
  /** Original-Schreibweise */
  raw: string
  root: number
  /** Alles zwischen Grundton und Slash, unverändert (z. B. "m7", "sus4") */
  suffix: string
  bass: number | null
  quality: Quality
  /** true, wenn die Akkordart für das Griffbild vereinfacht wurde (z. B. 13 -> 7) */
  simplified: boolean
}

// Bausteine, aus denen ein gültiges Akkord-Suffix bestehen darf. Wörter wie
// "Bad" oder "Cause" fallen dadurch durch und werden nicht als Akkord erkannt.
const SUFFIX_TOKENS = ['maj', 'Maj', 'min', 'dim', 'aug', 'sus', 'add', 'M', 'm', 'b', '#', '+', '°', 'ø', 'Δ', '-', '(', ')', '/']

function isValidSuffix(s: string): boolean {
  let i = 0
  while (i < s.length) {
    if (/[0-9]/.test(s[i])) {
      i++
      continue
    }
    const tok = SUFFIX_TOKENS.find((t) => s.startsWith(t, i))
    if (!tok) return false
    i += tok.length
  }
  return true
}

function qualityOf(suffix: string): { quality: Quality; simplified: boolean } {
  const s = suffix.replace(/[()]/g, '')
  if (s === '') return { quality: '', simplified: false }
  if (s === '5') return { quality: '5', simplified: false }

  const minor = /^(m(?!aj)|min|-)/.test(s)
  const rest = s.replace(/^(min|m(?!aj)|-)/, '')
  const hasMaj7 = /^(maj|Maj|M|Δ)/.test(rest)

  if (/^(ø|m7b5|m7-5)/.test(s)) return { quality: 'm7b5', simplified: false }
  if (/^(dim7|°7)/.test(s)) return { quality: 'dim7', simplified: false }
  if (/^(dim|°)/.test(s)) return { quality: 'dim', simplified: false }
  if (/^(aug|\+)/.test(s)) return { quality: 'aug', simplified: s.length > 3 }

  if (minor) {
    if (rest === '') return { quality: 'm', simplified: false }
    if (rest === '7') return { quality: 'm7', simplified: false }
    if (rest === '6') return { quality: 'm6', simplified: false }
    if (/^add(9|2)$/.test(rest)) return { quality: 'madd9', simplified: false }
    if (/^b5$/.test(rest)) return { quality: 'dim', simplified: false }
    if (/^7b5$/.test(rest)) return { quality: 'm7b5', simplified: false }
    if (/^(9|11|13)/.test(rest)) return { quality: 'm7', simplified: true }
    if (hasMaj7) return { quality: 'm7', simplified: true }
    return { quality: 'm', simplified: true }
  }

  if (hasMaj7) return { quality: 'maj7', simplified: !/^(maj7|Maj7|M7|Δ7?)$/.test(s) }
  if (s === '7') return { quality: '7', simplified: false }
  if (s === '6') return { quality: '6', simplified: false }
  if (s === '9') return { quality: '9', simplified: false }
  if (/^7sus4?$/.test(s)) return { quality: '7sus4', simplified: false }
  if (s === 'sus2' || s === '2') return { quality: 'sus2', simplified: false }
  if (s === 'sus4' || s === 'sus' || s === '4') return { quality: 'sus4', simplified: false }
  if (/^add(9|2)$/.test(s)) return { quality: 'add9', simplified: false }
  if (/^(11|13|7)/.test(s)) return { quality: '7', simplified: true }
  if (/^6\/?9$/.test(s)) return { quality: '6', simplified: true }
  return { quality: '', simplified: true }
}

/** Parst einen Akkordnamen wie "Am", "F#m7", "G/B", "Cadd9". Null, wenn es keiner ist. */
export function parseChord(token: string): ParsedChord | null {
  const m = /^([A-H])([#b]?)(.*?)(?:\/([A-H][#b]?))?$/.exec(token)
  if (!m) return null
  const root = noteIndex(m[1] + m[2])
  if (root === null) return null
  const suffix = m[3]
  if (!isValidSuffix(suffix)) return null
  // "H" als deutscher Name für B: nur ohne Suffix-Mehrdeutigkeit akzeptieren.
  const bass = m[4] ? noteIndex(m[4]) : null
  if (m[4] && bass === null) return null
  const { quality, simplified } = qualityOf(suffix)
  return { raw: token, root, suffix, bass, quality, simplified }
}

export function isChord(token: string): boolean {
  return parseChord(token) !== null
}

/** Normalisierter Name (Grundton immer in NOTE_NAMES-Schreibweise). */
export function chordName(c: Pick<ParsedChord, 'root' | 'suffix' | 'bass'>): string {
  return noteName(c.root) + c.suffix + (c.bass !== null ? '/' + noteName(c.bass) : '')
}

/** Transponiert einen Akkordnamen um n Halbtöne. Nicht-Akkorde bleiben unverändert. */
export function transposeChord(token: string, semitones: number): string {
  const c = parseChord(token)
  if (!c) return token
  if (semitones % 12 === 0) return chordName(c)
  return chordName({
    root: c.root + semitones,
    suffix: c.suffix,
    bass: c.bass !== null ? c.bass + semitones : null,
  })
}

// Leere Saiten der Standardstimmung (tiefe E bis hohe e) als MIDI-Noten.
export const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64]
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'H', 'e']

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Deutsche Anzeige: B -> H, Bb -> B. Intern bleibt englische Schreibweise. */
export function displayChord(name: string, german: boolean): string {
  if (!german) return name
  return name.replace(/(^|\/)B(b?)/g, (_m, pre: string, flat: string) => pre + (flat ? 'B' : 'H'))
}
