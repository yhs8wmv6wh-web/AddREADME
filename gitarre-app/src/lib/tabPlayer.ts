// Spielt einen Tab-Block ab. Jede Textspalte ist ein Zeitschritt; Ziffern sind Bünde.
import { audio, pluckNote } from './audio'

export interface TabEvent {
  col: number
  notes: { string: number; fret: number }[]
}

const STRING_BY_NAME: Record<string, number> = { e: 5, b: 4, h: 4, g: 3, d: 2, a: 1, E: 0 }

/** Zerlegt 6 (oder weniger) Tab-Zeilen in Zeitschritte. Zeile oben = hohe e, wenn keine Namen dastehen. */
export function parseTab(lines: string[]): { events: TabEvent[]; width: number } {
  // 6 Zeilen: Reihenfolge e B G D A E (oben hohe e). Sonst nach Saitennamen.
  const hasLowerE = lines.some((l) => /^\s*e\s*[|:]/.test(l))
  const rows = lines.map((text, i) => {
    let string = 5 - i
    if (lines.length !== 6) {
      const n = /^\s*([A-Ga-gHh])/.exec(text)?.[1]
      if (n === 'e') string = 5
      else if (n === 'E') string = hasLowerE ? 0 : i < lines.length / 2 ? 5 : 0
      else if (n) string = STRING_BY_NAME[n.toLowerCase()] ?? string
    }
    return { string: Math.max(0, Math.min(5, string)), text }
  })
  const map = new Map<number, TabEvent>()
  let width = 0
  for (const { string, text } of rows) {
    width = Math.max(width, text.length)
    // Saitenname am Anfang überspringen
    const start = (/^\s*[A-Ga-gHh][#b]?\s*[|:]/.exec(text)?.[0].length ?? 0)
    for (let c = start; c < text.length; c++) {
      if (!/[0-9]/.test(text[c])) continue
      let fretStr = text[c]
      if (/[0-9]/.test(text[c + 1] ?? '') && Number(text[c] + text[c + 1]) <= 24) fretStr += text[c + 1]
      const ev = map.get(c) ?? { col: c, notes: [] }
      ev.notes.push({ string, fret: Number(fretStr) })
      map.set(c, ev)
      c += fretStr.length - 1
    }
  }
  return { events: [...map.values()].sort((a, b) => a.col - b.col), width }
}

/** Startet das Abspielen; gibt eine Stopp-Funktion zurück. onCol meldet die aktuelle Spalte (-1 = fertig). */
export function playTab(
  events: TabEvent[],
  width: number,
  secondsPerColumn: number,
  onCol: (col: number) => void,
): () => void {
  const ac = audio()
  const t0 = ac.currentTime + 0.15
  const timers: number[] = []
  const at = (when: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, (when - ac.currentTime) * 1000)))
  // Töne kurz vorher einplanen (genau auf der Audio-Uhr), damit Stopp sofort wirkt
  for (const ev of events) {
    const when = t0 + ev.col * secondsPerColumn
    at(when - 0.08, () => ev.notes.forEach((n) => pluckNote(n.string, n.fret, when)))
  }
  for (let c = 0; c <= width; c++) at(t0 + c * secondsPerColumn, () => onCol(c >= width ? -1 : c))
  return () => {
    timers.forEach((t) => window.clearTimeout(t))
    onCol(-1)
  }
}
