// Song-Suche im Artefakt: fragt Claude über die Artefakt-Laufzeit (kein API-Schlüssel nötig).
// In der Claude-Desktop-App liest Claude dabei Tab-Seiten im eingebauten Browser,
// sonst antwortet es aus seinem Wissen.
import { getCapability, type SampleFn, type SampleTool } from './env'
import { browserTools } from './online'
import type { FoundSong, GuitarPart } from './songFormat'

export class ClaudeSearchError extends Error {}

const RULES = `Regeln:
- Nichts raten. Was du nicht sicher weißt oder nicht gelesen hast, lässt du weg bzw. setzt "found": false.
- KEINE Liedtexte (Urheberrecht) – nur Abschnittsnamen, Akkorde und Gitarren-Tabs.
- Akkordnamen in englischer Standardschreibweise (B statt H, Bb statt B), z. B. Am, F#m7, Cadd9, G/B.
- Wird die bekannte Version mit Kapo gespielt: Akkorde und Tabs relativ zum Kapo angeben und "capo" setzen.
- Abschnittsnamen auf Deutsch (Intro, Strophe, Refrain, Bridge, Solo, Outro …).
- "chords": eine Zeile pro Phrase, Takte mit | getrennt, z. B. "| E | F#m7 | E |". Mehrere Zeilen mit \\n.
- Tabs: immer genau 6 Zeilen in dieser Reihenfolge: e|, B|, G|, D|, A|, E| (hohe e oben), Standardstimmung, alle Zeilen gleich lang.
  Ein "-" entspricht ungefähr einer Sechzehntelnote; Takte mit | trennen. Max. ca. 4 Takte pro Tab-Block, mehrere Blöcke mit Leerzeile trennen.`

const PARTS_SPEC = `"parts": Gitarrenspuren der Aufnahme, so weit bekannt – z. B. Lead-Gitarre (Riffs, Licks, Solo), Rhythmusgitarre (Picking- oder Anschlagmuster), zweite Gitarre.
 Pro Spur: {"name": "Lead-Gitarre", "technique": "kurze Beschreibung auf Deutsch: Picking-Muster, Fingerpicking/Plektrum, Palm Mute, Bendings …", "tab": "Tab-Blöcke wie oben"}.
 Lieber eine Spur weniger als eine erfundene.`

const SHAPE = `Antworte am Ende NUR mit einem JSON-Objekt dieser Form:
{"found": true, "title": "…", "artist": "…", "key": "E-Dur", "capo": 0, "bpm": 0, "timeSignature": "4/4",
 "strumming": "Ab – Ab – Auf – Auf – Ab – Auf", "sections": [{"name": "Intro", "chords": "| E | F#m7 | E |", "repeat": 1}],
 "parts": [{"name": "Lead-Gitarre", "technique": "…", "tab": "e|----|\\nB|----|\\nG|----|\\nD|----|\\nA|----|\\nE|----|"}],
 "riffTab": "", "notes": "kurzer Spielhinweis, max. 2 Sätze", "sources": ["URLs der Seiten, die du wirklich gelesen hast"], "confidence": "hoch"}
bpm 0 = unbekannt. confidence: hoch | mittel | niedrig.`

const ONLINE = `Du hast Browser-Werkzeuge. So gehst du vor:
1. Öffne die Suche von Ultimate Guitar: https://www.ultimate-guitar.com/search.php?search_type=title&value=<Titel und Interpret, URL-kodiert>
2. Lies den Seitentext und öffne die am besten bewertete passende Seite (für Akkorde "Chords", für Spuren/Picking "Tab"). Wenn nötig eine zweite Quelle (z. B. Songsterr, e-chords.com).
3. Übernimm Akkorde und Tabs aus dem gelesenen Text. Trage die gelesenen URLs in "sources" ein.
Wenn die Werkzeuge nicht funktionieren: antworte aus deinem Wissen, mit leerem "sources".`

export type SearchMode = 'online' | 'wissen'

async function getSample(): Promise<SampleFn> {
  const sample = await getCapability<SampleFn>('sample')
  if (!sample) throw new ClaudeSearchError('Claude ist in dieser Ansicht nicht verfügbar.')
  return sample
}

function mapError(err: unknown): never {
  if (err instanceof ClaudeSearchError) throw err
  const code = (err as { code?: string })?.code
  if (code === 'not_granted') throw new ClaudeSearchError('Zugriff auf Claude wurde nicht erlaubt.')
  if (code === 'rate_limited') throw new ClaudeSearchError('Gerade zu viele Anfragen – bitte kurz warten.')
  if (code === 'cancelled') throw new ClaudeSearchError('abgebrochen')
  if (code === 'invalid_json') throw new ClaudeSearchError('Antwort war unvollständig – bitte nochmal versuchen.')
  if (code === 'refused') throw new ClaudeSearchError('Claude hat die Anfrage abgelehnt.')
  if (code === 'prompt_too_large') throw new ClaudeSearchError('Die gelesenen Seiten waren zu lang – bitte nochmal versuchen.')
  throw new ClaudeSearchError('Claude ist gerade nicht erreichbar.')
}

async function ask<T>(task: string, signal?: AbortSignal, withParts = true): Promise<{ result: T; mode: SearchMode }> {
  const sample = await getSample()
  let tools: SampleTool[] | null = null
  try {
    tools = await browserTools(sample, signal)
  } catch {
    tools = null
  }
  const prompt = [
    'Du hilfst in einer Gitarren-Lern-App.',
    task,
    tools ? ONLINE : 'Du hast keinen Internetzugang: antworte aus deinem Wissen, "sources" bleibt leer.',
    RULES,
    withParts ? PARTS_SPEC : '',
    SHAPE,
  ]
    .filter(Boolean)
    .join('\n\n')
  try {
    const result = await sample.json<T>(prompt, { modelTier: 'complex', signal, cache: false, ...(tools ? { tools } : {}) })
    if (!result || typeof result !== 'object') throw new ClaudeSearchError('Unerwartete Antwort.')
    return { result, mode: tools ? 'online' : 'wissen' }
  } catch (err) {
    mapError(err)
  }
}

/** Akkorde, Aufbau und Gitarrenspuren eines Songs. */
export async function searchSongClaude(query: string, signal?: AbortSignal): Promise<FoundSong> {
  const { result } = await ask<FoundSong>(`Finde Akkorde, Aufbau und Gitarrenspuren (Tabs) für diesen Song: ${query.trim()}`, signal)
  return result
}

/** Nur die Gitarrenspuren (Lead, Rhythmus, Picking) für einen vorhandenen Song. */
export async function searchPartsClaude(
  title: string,
  artist: string,
  signal?: AbortSignal,
): Promise<{ parts: GuitarPart[]; sources: string[]; mode: SearchMode }> {
  const { result, mode } = await ask<FoundSong>(
    `Finde die Gitarrenspuren als Tabs für: ${title}${artist ? ' – ' + artist : ''}. Wichtig sind hier vor allem "parts" (Lead-Gitarre, Rhythmusgitarre mit Picking-Muster, zweite Gitarre). "sections" darf leer bleiben.`,
    signal,
  )
  const parts = Array.isArray(result.parts) ? result.parts : []
  const sources = Array.isArray(result.sources) ? result.sources.filter((u): u is string => typeof u === 'string') : []
  return { parts, sources, mode }
}
