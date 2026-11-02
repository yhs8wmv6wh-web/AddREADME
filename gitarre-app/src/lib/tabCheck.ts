// Prüft Tabs auf Format und ob die Noten zur Tonart passen (Hinweise, keine Garantie).
import { noteIndex, STANDARD_TUNING_MIDI } from './music'
import { parseTab } from './tabPlayer'

const TAB_LINE = /^\s*[A-Ga-gHh][#b]?\s*[|:]/

function tabBlocks(tab: string): string[][] {
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of tab.split('\n')) {
    if (TAB_LINE.test(line)) cur.push(line.replace(/\s+$/, ''))
    else if (cur.length) {
      blocks.push(cur)
      cur = []
    }
  }
  if (cur.length) blocks.push(cur)
  return blocks
}

function scaleOf(key: string): Set<number> | null {
  const m = /^\s*([A-H])([#b]?)\s*-?\s*(dur|moll|major|minor|m(?!aj))?/i.exec(key)
  if (!m) return null
  const root = noteIndex(m[1].toUpperCase() + m[2])
  if (root === null) return null
  const minor = !!m[3] && /^(moll|minor|m)$/i.test(m[3])
  // Tonleiter plus typische Blues-/Rock-Töne, damit gängige Riffs nicht als falsch gelten
  const steps = minor ? [0, 2, 3, 5, 6, 7, 8, 10, 11] : [0, 2, 3, 4, 5, 7, 9, 10, 11]
  return new Set(steps.map((s) => (root + s) % 12))
}

export function checkTab(tab: string, key: string): string[] {
  const warnings: string[] = []
  const blocks = tabBlocks(tab)
  if (blocks.length === 0) return ['Kein gültiger Tab erkannt.']
  if (blocks.some((b) => b.length !== 6)) warnings.push('Nicht jeder Tab-Block hat 6 Saiten.')
  if (blocks.some((b) => Math.max(...b.map((l) => l.length)) - Math.min(...b.map((l) => l.length)) > 2))
    warnings.push('Tab-Zeilen sind unterschiedlich lang – Timing evtl. verschoben.')

  const scale = key ? scaleOf(key) : null
  if (scale) {
    let total = 0
    let outside = 0
    for (const b of blocks) {
      for (const ev of parseTab(b).events)
        for (const n of ev.notes) {
          if (n.fret > 24) warnings.push(`Bund ${n.fret} ist unrealistisch.`)
          total++
          if (!scale.has((STANDARD_TUNING_MIDI[n.string] + n.fret) % 12)) outside++
        }
    }
    if (total >= 6 && outside / total > 0.2)
      warnings.push(`${outside} von ${total} Noten liegen außerhalb von ${key} – bitte mit der Aufnahme vergleichen.`)
  }
  return [...new Set(warnings)]
}
