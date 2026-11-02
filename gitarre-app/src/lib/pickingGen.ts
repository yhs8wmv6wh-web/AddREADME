// Erzeugt Picking-Übungen als Tabs aus den Akkorden eines Songs (ohne KI).
// Grundlage sind die Griffbilder der App – damit passt jede Note zum Griff.
import { getShape } from './chords'

const CELL = 3 // Zeichen pro Anschlag (Platz für zweistellige Bünde)
const NAMES = ['e', 'B', 'G', 'D', 'A', 'E'] // Tab-Zeilen von oben (hohe e) nach unten

interface Pattern {
  name: string
  technique: string
  /** Pro Anschlag: Saiten (0 = tiefe E … 5 = hohe e) oder 'bass' / 'bass2' (Wechselbass) */
  steps: ('bass' | 'bass2' | number)[][]
}

export const PATTERNS: Pattern[] = [
  {
    name: 'Picking: Arpeggio',
    technique: 'Bass – G – H – e – H – G, je Akkord einmal. Daumen spielt den Bass, Zeige-, Mittel- und Ringfinger die hohen Saiten.',
    steps: [['bass'], [3], [4], [5], [4], [3]],
  },
  {
    name: 'Picking: Travis (Wechselbass)',
    technique: 'Daumen wechselt zwischen Grundton und einer höheren Basssaite, die Finger zupfen dazwischen H und e. Klassisches Folk-Picking.',
    steps: [['bass', 5], [4], ['bass2'], [3], ['bass', 4], [5], ['bass2'], [4]],
  },
  {
    name: 'Picking: Bass + Akkord',
    technique: 'Erst den Bass allein, dann die drei hohen Saiten zusammen zupfen (Daumen – Finger). Gut für ruhige Balladen.',
    steps: [['bass'], [3, 4, 5], ['bass2'], [3, 4, 5]],
  },
]

function bassStrings(frets: number[]): [number, number] {
  const first = frets.findIndex((f) => f >= 0)
  const b = first < 0 ? 0 : first
  // Wechselbass: nächste gespielte Saite (max. D-Saite)
  let alt = b + 1
  while (alt < 3 && frets[alt] < 0) alt++
  return [b, Math.min(alt, 3)]
}

/** Ein Tab-Block (Akkordzeile + 6 Tab-Zeilen) für bis zu 4 Akkorde. */
function block(chords: string[], p: Pattern): string {
  const seg = p.steps.length * CELL
  const rows = NAMES.map(() => '')
  let chordLine = '   '
  for (const c of chords) {
    const shape = getShape(c)
    const frets = shape?.frets ?? [-1, -1, -1, -1, -1, -1]
    const [b1, b2] = bassStrings(frets)
    const cells: string[][] = NAMES.map(() => [])
    for (const step of p.steps) {
      const strings = new Set<number>()
      for (const s of step) strings.add(s === 'bass' ? b1 : s === 'bass2' ? b2 : s)
      for (let row = 0; row < 6; row++) {
        const str = 5 - row
        const f = frets[str]
        const val = strings.has(str) && f >= 0 ? String(f) : ''
        cells[row].push(val.padEnd(CELL, '-'))
      }
    }
    for (let row = 0; row < 6; row++) rows[row] += cells[row].join('') + '|'
    chordLine += c.padEnd(seg + 1, ' ')
  }
  // Zusatz "(Griffe)": Zeile gilt nicht als Akkordzeile und wird daher nicht erneut transponiert
  return [chordLine.replace(/\s+$/, '') + '  (Griffe)', ...rows.map((r, i) => `${NAMES[i]}|-${r}`)].join('\n')
}

/** Komplette Übung als Song-Text-Abschnitt. */
export function pickingExercise(chords: string[], p: Pattern): string {
  const list = chords.slice(0, 8)
  if (list.length === 0) return ''
  const blocks: string[] = []
  for (let i = 0; i < list.length; i += 4) blocks.push(block(list.slice(i, i + 4), p))
  return [`[${p.name} (aus den Akkorden erzeugt)]`, `Technik: ${p.technique}`, blocks.join('\n\n')].join('\n')
}
