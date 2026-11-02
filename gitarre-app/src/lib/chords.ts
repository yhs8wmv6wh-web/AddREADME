// Griffbilder. Saiten-Reihenfolge immer: tiefe E, A, D, G, H, hohe e.
// -1 = Saite nicht anschlagen, 0 = leer, n = Bund.
import { chordName, noteName, parseChord, type Quality } from './music'

export interface ChordShape {
  name: string
  frets: number[]
  /** Fingersatz 1-4 je Saite (0 = kein Finger), optional */
  fingers?: number[]
  /** true = offener Anfängergriff aus der Tabelle (kein Barré-Generator) */
  open: boolean
  barre: { fret: number; from: number; to: number } | null
  /** Hinweis, z. B. "vereinfacht" oder "Bass: H" */
  note?: string
}

function f(s: string): number[] {
  return s.split('').map((c) => (c === 'x' ? -1 : parseInt(c, 36)))
}

// Offene Standardgriffe (+ wenige gängige Barrés) mit Fingersatz.
const OPEN: Record<string, [string, string?]> = {
  C: ['x32010', '032010'],
  C7: ['x32310', '032410'],
  Cmaj7: ['x32000', '032000'],
  Cadd9: ['x32033', '021034'],
  Csus2: ['x30013', '030014'],
  Csus4: ['x33011', '034011'],
  D: ['xx0232', '000132'],
  Dm: ['xx0231', '000231'],
  D7: ['xx0212', '000213'],
  Dmaj7: ['xx0222', '000111'],
  Dm7: ['xx0211', '000211'],
  Dsus2: ['xx0230', '000130'],
  Dsus4: ['xx0233', '000134'],
  D5: ['xx023x', '000130'],
  E: ['022100', '023100'],
  Em: ['022000', '023000'],
  E7: ['020100', '020100'],
  Em7: ['022030', '023040'],
  Emaj7: ['021100', '031200'],
  Esus4: ['022200', '023400'],
  E5: ['022xxx', '012000'],
  F: ['133211', '134211'],
  Fmaj7: ['xx3210', '003210'],
  Fsus2: ['xx3011', '003011'],
  G: ['320003', '210003'],
  G7: ['320001', '320001'],
  Gmaj7: ['320002', '320001'],
  G6: ['320000', '210000'],
  Gsus4: ['330013', '230014'],
  Gsus2: ['300233', '100234'],
  Gadd9: ['320203', '210304'],
  Eadd9: ['024100', '024100'],
  A9: ['x02423', '002413'],
  E9: ['020132', '020143'],
  A: ['x02220', '001230'],
  Am: ['x02210', '002310'],
  A7: ['x02020', '002030'],
  Am7: ['x02010', '002010'],
  Amaj7: ['x02120', '002130'],
  Asus2: ['x02200', '001200'],
  Asus4: ['x02230', '001240'],
  A5: ['x022xx', '001200'],
  Am6: ['x02212', '002314'],
  B7: ['x21202', '021304'],
  Bm: ['x24432', '013421'],
  'G/B': ['x20003', '010004'],
  'D/F#': ['200232', '100243'],
  'C/G': ['332010', '432010'],
  'C/B': ['x20010', '020010'],
  'C/E': ['032010', '032010'],
  'Am/G': ['3x2210', '302310'],
  'F/C': ['x33211', '034211'],
  'D/A': ['x00232', '000132'],
  'Em/D': ['xx0000', '000000'],
}

// Verschiebbare Barré-Formen als Abstand zum Grundton-Bund.
// null = Saite nicht anschlagen.
type Rel = (number | null)[]
const E_SHAPE: Partial<Record<Quality, Rel>> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, null, 1, 1, 0, null],
  sus4: [0, 2, 2, 2, 0, 0],
  '7sus4': [0, 2, 0, 2, 0, 0],
  '5': [0, 2, 2, null, null, null],
  m7b5: [0, null, 0, 0, -1, null],
  dim7: [0, null, -1, 0, -1, null],
  m6: [0, null, -1, 0, 0, null],
  '6': [0, null, -1, 1, 0, null],
  '9': [0, null, 0, 1, 0, 2],
}
const A_SHAPE: Partial<Record<Quality, Rel>> = {
  '': [null, 0, 2, 2, 2, 0],
  m: [null, 0, 2, 2, 1, 0],
  '7': [null, 0, 2, 0, 2, 0],
  m7: [null, 0, 2, 0, 1, 0],
  maj7: [null, 0, 2, 1, 2, 0],
  sus2: [null, 0, 2, 2, 0, 0],
  sus4: [null, 0, 2, 2, 3, 0],
  '7sus4': [null, 0, 2, 0, 3, 0],
  '5': [null, 0, 2, 2, null, null],
  dim: [null, 0, 1, 2, 1, null],
  aug: [null, 0, 3, 2, 2, 1],
  m7b5: [null, 0, 1, 0, 1, null],
  dim7: [null, 0, 1, -1, 1, null],
  '6': [null, 0, 2, 2, 2, 2],
  m6: [null, 0, 2, 2, 1, 2],
  '9': [null, 0, -1, 0, 0, null],
  add9: [null, 0, 2, 4, 2, 0],
  madd9: [null, 0, 2, 4, 1, 0],
}

// Wenn eine Akkordart für keine Form hinterlegt ist: nächstbeste nehmen.
const FALLBACK: Partial<Record<Quality, Quality>> = { dim: 'm', aug: '', sus2: '' }

/** Erkennt ein Barré: tiefste gegriffene Saite liegt im kleinsten Bund, mehrere Saiten im selben Bund. */
function detectBarre(frets: number[]): ChordShape['barre'] {
  const fretted = frets.filter((x) => x > 0)
  if (fretted.length < 2) return null
  const min = Math.min(...fretted)
  const first = frets.findIndex((x) => x >= 0)
  if (first < 0 || frets[first] !== min) return null
  let last = -1
  frets.forEach((x, i) => {
    if (x === min) last = i
  })
  if (last <= first) return null
  for (let i = first; i <= last; i++) if (frets[i] < min) return null
  return { fret: min, from: first, to: last }
}

function fromRel(rel: Rel, base: number): number[] | null {
  const out = rel.map((r) => (r === null ? -1 : base + r))
  if (out.some((x, i) => rel[i] !== null && x < 0)) return null
  return out
}

function generate(root: number, quality: Quality): number[] | null {
  const candidates: number[][] = []
  for (const [shapes, openString] of [
    [E_SHAPE, 4],
    [A_SHAPE, 9],
  ] as const) {
    const rel = shapes[quality]
    if (!rel) continue
    const base = (root - openString + 12) % 12
    const a = fromRel(rel, base) ?? fromRel(rel, base + 12)
    if (a) candidates.push(a)
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => Math.max(...a) - Math.max(...b))
  return candidates[0]
}

const cache = new Map<string, ChordShape | null>()

/** Liefert ein Griffbild für einen Akkordnamen oder null, wenn unbekannt. */
export function getShape(token: string): ChordShape | null {
  if (cache.has(token)) return cache.get(token)!
  const shape = computeShape(token)
  cache.set(token, shape)
  return shape
}

function computeShape(token: string): ChordShape | null {
  const c = parseChord(token)
  if (!c) return null
  const name = chordName(c)

  const exact = OPEN[name]
  if (exact) {
    const frets = f(exact[0])
    const barre = detectBarre(frets)
    return { name, frets, fingers: exact[1] ? f(exact[1]) : undefined, open: !barre, barre }
  }

  const notes: string[] = []
  // Slash-Akkord ohne eigenen Griff: Grundakkord greifen, Bass als Hinweis.
  const baseName = noteName(c.root) + c.suffix
  if (c.bass !== null) notes.push(`Bass: ${noteName(c.bass)}`)
  if (c.simplified) notes.push('vereinfacht')

  // Offener Griff für die (ggf. vereinfachte) Akkordart?
  const simpleName = noteName(c.root) + c.quality
  const openBase = OPEN[baseName] ?? OPEN[simpleName]
  if (openBase) {
    const frets = f(openBase[0])
    const barre = detectBarre(frets)
    return {
      name,
      frets,
      fingers: openBase[1] ? f(openBase[1]) : undefined,
      open: !barre,
      barre,
      note: notes.join(' · ') || undefined,
    }
  }

  let quality = c.quality
  let frets = generate(c.root, quality)
  if (!frets && FALLBACK[quality]) {
    quality = FALLBACK[quality]!
    frets = generate(c.root, quality)
    if (!notes.includes('vereinfacht')) notes.push('vereinfacht')
  }
  if (!frets) return null
  const barre = detectBarre(frets)
  return { name, frets, open: false, barre, note: notes.join(' · ') || undefined }
}

/** Schwierigkeit eines Griffs: 0 offen, 1 offen mit Mini-Barré, 2 Barré/verschoben. */
export function difficulty(shape: ChordShape | null): number {
  if (!shape) return 2
  if (shape.open) return 0
  if (shape.barre && shape.barre.to - shape.barre.from <= 1 && shape.barre.fret <= 3) return 1
  return 2
}

/** Reihenfolge, in der Anfänger die Grundakkorde typischerweise lernen. */
export const LEARNING_PATH: { title: string; chords: string[] }[] = [
  { title: 'Stufe 1 – die ersten Griffe', chords: ['Em', 'E', 'A', 'D', 'Am'] },
  { title: 'Stufe 2 – Standard-Songs', chords: ['G', 'C', 'Dm', 'Em7', 'Cadd9'] },
  { title: 'Stufe 3 – Septakkorde', chords: ['E7', 'A7', 'D7', 'G7', 'B7', 'Am7', 'C7'] },
  { title: 'Stufe 4 – Farben', chords: ['Asus2', 'Asus4', 'Dsus2', 'Dsus4', 'Cmaj7', 'Fmaj7', 'G/B', 'D/F#'] },
  { title: 'Stufe 5 – Barré', chords: ['F', 'Bm', 'B', 'F#m', 'Cm', 'Bb', 'Gm'] },
]

export const ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const LIBRARY_QUALITIES: { suffix: string; label: string }[] = [
  { suffix: '', label: 'Dur' },
  { suffix: 'm', label: 'Moll' },
  { suffix: '7', label: '7' },
  { suffix: 'm7', label: 'm7' },
  { suffix: 'maj7', label: 'maj7' },
  { suffix: 'sus2', label: 'sus2' },
  { suffix: 'sus4', label: 'sus4' },
  { suffix: 'add9', label: 'add9' },
  { suffix: '5', label: 'Power (5)' },
  { suffix: 'dim', label: 'dim' },
  { suffix: 'aug', label: 'aug' },
  { suffix: '6', label: '6' },
  { suffix: 'm6', label: 'm6' },
  { suffix: '9', label: '9' },
  { suffix: 'm7b5', label: 'm7b5' },
  { suffix: 'dim7', label: 'dim7' },
]
