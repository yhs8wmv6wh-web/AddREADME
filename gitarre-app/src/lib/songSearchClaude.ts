// Song-Suche im Artefakt: fragt Claude über die Artefakt-Laufzeit (kein API-Schlüssel nötig).
// In der Claude-Desktop-App liest Claude dabei Tab-Seiten im eingebauten Browser,
// sonst antwortet es aus seinem Wissen.
import { getCapability, type SampleFn, type SampleTool } from './env'
import { extractParts, type FoundSong, type GuitarPart } from './songFormat'

export class ClaudeSearchError extends Error {}

const RULES = `Regeln:
- Akkorde: Gib die Akkorde des Songs so an, wie du sie kennst (bei bekannten Songs, z. B. Beatles-Klassikern, kennst du sie). Bei Unsicherheit trotzdem liefern und "confidence" auf "mittel" oder "niedrig" setzen. "found": false NUR, wenn du den Song überhaupt nicht kennst.
- KEINE Liedtexte (Urheberrecht) – nur Abschnittsnamen, Akkorde und Gitarren-Tabs.
- Akkordnamen in englischer Standardschreibweise (B statt H, Bb statt B), z. B. Am, F#m7, Cadd9, G/B.
- Wird die bekannte Version mit Kapo gespielt: Akkorde und Tabs relativ zum Kapo angeben und "capo" setzen.
- Abschnittsnamen auf Deutsch (Intro, Strophe, Refrain, Bridge, Solo, Outro …).
- "chords": eine Zeile pro Phrase, Takte mit | getrennt, z. B. "| E | F#m7 | E |". Mehrere Zeilen mit \\n.
- Tabs: immer genau 6 Zeilen in dieser Reihenfolge: e|, B|, G|, D|, A|, E| (hohe e oben), Standardstimmung, alle Zeilen gleich lang.
  Ein "-" entspricht ungefähr einer Sechzehntelnote; Takte mit | trennen. Max. ca. 4 Takte pro Tab-Block, mehrere Blöcke mit Leerzeile trennen.`

const PARTS_SPEC = `"parts": Gitarrenspuren GENAU so, wie sie auf den gelesenen Tab-Seiten stehen – Lead-Gitarre (Riffs, Licks, Solo), Rhythmusgitarre (Picking), zweite Gitarre.
 Pro Spur: {"name": "Lead-Gitarre", "technique": "was die Seite zur Spielweise sagt (Picking, Palm Mute, Bendings …)", "tab": "Tab-Zeilen 1:1 von der Seite als EIN String mit \\n", "source": "URL der Seite"}.
 Übernimm Tabs wörtlich. Ergänze, ändere oder erfinde keine einzige Note. Steht auf den Seiten kein Tab für eine Spur, lass die Spur weg. Nichts aus dem Gedächtnis.`

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
Wenn die Werkzeuge nicht funktionieren: Akkorde aus deinem Wissen, "sources" leer, "parts" leer und "riffTab" leer – Tabs nie aus dem Gedächtnis.`

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

async function ask<T>(
  task: string,
  signal?: AbortSignal,
  opts: { requireOnline?: boolean } = {},
): Promise<{ result: T; mode: SearchMode }> {
  const sample = await getSample()
  const tools: SampleTool[] | null = null
  if (opts.requireOnline && !tools)
    throw new ClaudeSearchError(
      'Echte Tabs kann Claude nur in der Claude-Desktop-App (Mac/Windows) online lesen. Hier: Tab-Seite über die Links öffnen und den Tab unten einfügen.',
    )
  const prompt = [
    'Du hilfst in einer Gitarren-Lern-App.',
    task,
    tools ? ONLINE : 'Du hast keinen Internetzugang: antworte aus deinem Wissen, "sources" bleibt leer.',
    RULES,
    tools ? PARTS_SPEC : '"parts": immer leeres Array [] und "riffTab": "" – ohne Internet keine Tabs, nichts aus dem Gedächtnis.',
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
const MEMORY_PARTS = `Du hast keinen Internetzugang. Schreibe die Gitarrenspuren der ORIGINALAUFNAHME aus deinem Gedächtnis auf – aber nur, wenn du sie wirklich kennst.
- Nur Spuren, die du Note für Note so kennst, wie sie auf der Aufnahme gespielt werden (z. B. ein bekanntes Intro-Riff, ein bekanntes Solo, das Picking-Muster der Strophe).
- Keine Vereinfachung, kein "im Stil von", kein Arrangement aus den Akkorden. Lieber eine Spur weglassen als eine falsche liefern.
- Pro Spur "certainty": "sicher" nur, wenn du dir bei jeder Note sicher bist, sonst "unsicher".
${RULES}
Antworte NUR mit JSON:
{"key": "E-Dur", "parts": [{"name": "Intro-Riff (Lead-Gitarre)", "technique": "Spielweise: Plektrum, Hammer-ons, Bendings …", "tab": "e|…|\\nB|…|\\nG|…|\\nD|…|\\nA|…|\\nE|…|", "certainty": "sicher"}]}
Kennst du keine Spur sicher: {"key": "…", "parts": []}`

const VERIFY = `Du bist ein strenger Gitarrenlehrer und prüfst Tabs auf Richtigkeit.
Unten stehen Tabs, die angeblich Spuren der Originalaufnahme sind. Prüfe JEDE Spur Note für Note gegen deine Kenntnis der Aufnahme:
Stimmen Tonart, Bünde, Saiten, Reihenfolge und Lage? Passt die Spur zu den Akkorden des Songs?
- "verdict": "stimmt" (unverändert korrekt), "korrigiert" (Fehler gefunden und in "tab" berichtigt) oder "falsch" (nicht die Aufnahme bzw. nicht sicher korrigierbar).
- "issues": kurze Beschreibung der gefundenen Fehler auf Deutsch, sonst "".
- Tabs: genau 6 Zeilen e|, B|, G|, D|, A|, E| pro Block, alle gleich lang.
Antworte NUR mit JSON: {"parts": [{"name": "…", "technique": "…", "tab": "…", "verdict": "stimmt", "issues": ""}]}`

export interface PartsResult {
  parts: GuitarPart[]
  sources: string[]
  mode: SearchMode
  raw: unknown
  /** Anzahl verworfener Spuren (unsicher oder bei der Prüfung durchgefallen) */
  dropped: number
  key: string
}

/** Gitarrenspuren: online gelesen (Desktop-App) oder aus dem Gedächtnis mit Gegenprüfung. */
export async function searchPartsClaude(title: string, artist: string, signal?: AbortSignal): Promise<PartsResult> {
  const song = `${title}${artist ? ' – ' + artist : ''}`
  const sample = await getSample()
  // 1. Aus dem Gedächtnis – nur sichere Spuren
  let first: Record<string, unknown>
  try {
    first = await sample.json<Record<string, unknown>>(`${MEMORY_PARTS}\n\nSong: ${song}`, { modelTier: 'complex', signal, cache: false })
  } catch (err) {
    mapError(err)
  }
  const rawParts = Array.isArray(first?.parts) ? (first.parts as Record<string, unknown>[]) : []
  const sure = rawParts.filter((p) => !/unsicher|niedrig|unsure/i.test(String(p?.certainty ?? '')))
  const candidates = extractParts({ parts: sure })
  const key = typeof first?.key === 'string' ? first.key : ''
  if (candidates.length === 0) return { parts: [], sources: [], mode: 'wissen', raw: first, dropped: rawParts.length, key }

  // 2. Unabhängige Gegenprüfung (neuer Aufruf ohne Vorwissen über Aufruf 1)
  let second: Record<string, unknown>
  try {
    second = await sample.json<Record<string, unknown>>(
      `${VERIFY}\n\nSong: ${song}${key ? ` (Tonart laut erster Antwort: ${key})` : ''}\n\n${JSON.stringify({ parts: candidates }, null, 1)}`,
      { modelTier: 'complex', signal, cache: false },
    )
  } catch (err) {
    mapError(err)
  }
  const checked = Array.isArray(second?.parts) ? (second.parts as Record<string, unknown>[]) : []
  const passed = checked.filter((p) => /^(stimmt|korrigiert)/i.test(String(p?.verdict ?? '')))
  const parts: GuitarPart[] = []
  for (const p of passed) {
    const ex = extractParts({ parts: [p] })[0]
    if (ex) parts.push({ ...ex, accuracy: /korrigiert/i.test(String(p.verdict)) ? 'gedächtnis-korrigiert' : 'gedächtnis-geprüft' })
  }
  return {
    parts,
    sources: [],
    mode: 'wissen',
    raw: { erster_durchgang: first, pruefung: second },
    dropped: rawParts.length - parts.length,
    key,
  }
}
