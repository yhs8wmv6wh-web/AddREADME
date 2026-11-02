import { difficulty, getShape } from './chords'
import { transposeChord } from './music'

/** Summe der Schwierigkeit aller Griffe, wenn mit Kapo `capo` gespielt wird. */
export function gripScore(soundingChords: string[], capo: number): number {
  return soundingChords.reduce((sum, c) => sum + difficulty(getShape(transposeChord(c, -capo))), 0)
}

/**
 * Sucht den Kapo-Bund (0–7), bei dem die Griffe am einfachsten sind.
 * `soundingChords` = Akkorde, wie sie klingen sollen (nach Transposition).
 */
export function suggestCapo(soundingChords: string[]): { capo: number; score: number } {
  let best = { capo: 0, score: Infinity }
  for (let c = 0; c <= 7; c++) {
    const score = gripScore(soundingChords, c)
    if (score < best.score) best = { capo: c, score }
  }
  return best
}
