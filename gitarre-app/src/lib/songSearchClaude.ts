// Song-Suche im Artefakt: fragt Claude über die Artefakt-Laufzeit (kein API-Schlüssel nötig).
// Ohne Websuche – die Akkorde stammen aus dem Wissen des Modells.
import { getCapability, type SampleFn } from './env'
import type { FoundSong } from './songFormat'

export class ClaudeSearchError extends Error {}

const PROMPT = `Du hilfst in einer Gitarren-Lern-App. Gib die Gitarrenakkorde für den folgenden Song zurück.

Regeln:
- Nur Akkorde angeben, die du für diesen Song sicher kennst. Nichts raten. Kennst du den Song nicht sicher (oder ist er mehrdeutig), setze "found": false.
- KEINE Liedtexte (Urheberrecht) – nur Abschnittsnamen und Akkorde.
- Akkordnamen in englischer Standardschreibweise (B statt H, Bb statt B), z. B. Am, F#m7, Cadd9, G/B.
- Wird die bekannte Version mit Kapo gespielt: Akkorde als Griffe angeben und "capo" setzen.
- Abschnittsnamen auf Deutsch (Intro, Strophe, Refrain, Bridge, Solo, Outro …).
- "chords": eine Zeile pro Phrase, Takte mit | getrennt, z. B. "| E | F#m7 | E |". Mehrere Zeilen mit \\n.

Antworte NUR mit einem JSON-Objekt dieser Form:
{"found": true, "title": "…", "artist": "…", "key": "E-Dur", "capo": 0, "bpm": 0, "timeSignature": "4/4",
 "strumming": "Ab – Ab – Auf – Auf – Ab – Auf", "sections": [{"name": "Intro", "chords": "| E | F#m7 | E |", "repeat": 1}],
 "riffTab": "", "notes": "kurzer Spielhinweis, max. 2 Sätze", "confidence": "hoch"}
bpm 0 = unbekannt. riffTab nur ein kurzes Tab des Haupt-Riffs (e|…|-Zeilen), wenn du es sicher kennst, sonst "". confidence: hoch | mittel | niedrig.

Song: `

export async function searchSongClaude(query: string, signal?: AbortSignal): Promise<FoundSong> {
  const sample = await getCapability<SampleFn>('sample')
  if (!sample) throw new ClaudeSearchError('Claude ist in dieser Ansicht nicht verfügbar.')
  try {
    const r = await sample.json<FoundSong>(PROMPT + query.trim(), { modelTier: 'complex', signal, cache: false })
    if (!r || typeof r !== 'object') throw new ClaudeSearchError('Unerwartete Antwort.')
    return { ...r, sources: [] }
  } catch (err) {
    if (err instanceof ClaudeSearchError) throw err
    const code = (err as { code?: string })?.code
    if (code === 'not_granted') throw new ClaudeSearchError('Zugriff auf Claude wurde nicht erlaubt.')
    if (code === 'rate_limited') throw new ClaudeSearchError('Gerade zu viele Anfragen – bitte kurz warten.')
    if (code === 'cancelled') throw new ClaudeSearchError('abgebrochen')
    if (code === 'invalid_json') throw new ClaudeSearchError('Antwort war unvollständig – bitte nochmal versuchen.')
    if (code === 'refused') throw new ClaudeSearchError('Claude hat die Anfrage abgelehnt.')
    throw new ClaudeSearchError('Claude ist gerade nicht erreichbar.')
  }
}
