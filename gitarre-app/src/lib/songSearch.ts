// Sucht Akkorde zu einem Song per Claude + Websuche und baut daraus einen
// Songtext im App-Format. Läuft direkt im Browser mit dem Schlüssel des Nutzers.
import Anthropic from '@anthropic-ai/sdk'
import type { Song } from '../types'

const MODEL = 'claude-opus-5-5'

export class SongSearchError extends Error {}

interface Section {
  name: string
  chords: string
  repeat: number
}

interface FoundSong {
  found: boolean
  title: string
  artist: string
  key: string
  capo: number
  bpm: number
  timeSignature: string
  strumming: string
  sections: Section[]
  riffTab: string
  notes: string
  sources: string[]
  confidence: 'hoch' | 'mittel' | 'niedrig'
}

const SAVE_TOOL: Anthropic.Beta.BetaTool = {
  name: 'save_song',
  description: 'Speichert das Rechercheergebnis (Akkorde, Aufbau, Quellen) in der Gitarren-App. Genau einmal am Ende aufrufen.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'title', 'artist', 'key', 'capo', 'bpm', 'timeSignature', 'strumming', 'sections', 'riffTab', 'notes', 'sources', 'confidence'],
    properties: {
      found: { type: 'boolean', description: 'false, wenn keine verlässlichen Akkorde gefunden wurden' },
      title: { type: 'string' },
      artist: { type: 'string' },
      key: { type: 'string', description: 'Tonart, z. B. "G-Dur" oder "A-Moll", leer wenn unbekannt' },
      capo: { type: 'integer', description: 'Kapo-Bund der Version, 0 = ohne' },
      bpm: { type: 'integer', description: 'Tempo, 0 wenn unbekannt' },
      timeSignature: { type: 'string', description: 'z. B. "4/4", leer wenn unbekannt' },
      strumming: { type: 'string', description: 'Schlagmuster auf Deutsch, z. B. "Ab – Ab – Auf – Auf – Ab – Auf", leer wenn unbekannt' },
      sections: {
        type: 'array',
        description: 'Song-Abschnitte in Spielreihenfolge',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'chords', 'repeat'],
          properties: {
            name: { type: 'string', description: 'Deutsch: Intro, Strophe 1, Refrain, Bridge, Solo, Outro …' },
            chords: {
              type: 'string',
              description:
                'NUR Akkorde, keine Liedtexte. Eine Zeile pro Phrase, Takte mit | trennen, z. B. "| G | D | Em | C |". Mehrere Zeilen mit \\n.',
            },
            repeat: { type: 'integer', description: 'Wie oft der Abschnitt hintereinander gespielt wird (1 = einmal)' },
          },
        },
      },
      riffTab: {
        type: 'string',
        description: 'Optional: kurzes Tab des Haupt-Riffs (max. 6 Zeilen e|…|), nur wenn in Quellen vorhanden, sonst leer',
      },
      notes: { type: 'string', description: 'Kurze Spielhinweise auf Deutsch (Abweichungen zwischen Quellen, Besonderheiten). Max. 2 Sätze.' },
      sources: { type: 'array', items: { type: 'string' }, description: 'URLs der genutzten Quellen' },
      confidence: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'], description: 'Wie gut stimmen die Quellen überein?' },
    },
  },
}

const SYSTEM = `Du recherchierst Gitarrenakkorde für eine Lern-App.
Ablauf: Suche mit web_search nach Akkorden/Tabs des genannten Songs (z. B. Ultimate Guitar, Songsterr, Chordify, E-Chords, Songbücher). Vergleiche möglichst zwei Quellen und nimm die verbreitetste bzw. am besten bewertete Version.
Regeln:
- Nur Akkorde angeben, die du in Quellen gefunden hast. Nichts erfinden. Wenn du den Song nicht eindeutig findest: found=false.
- Keine Liedtexte wiedergeben (Urheberrecht) – nur Akkorde, Abschnittsnamen und Aufbau.
- Akkordnamen in englischer Standardschreibweise (B statt H, Bb statt B), z. B. Am, F#m7, Cadd9, G/B.
- Wenn die Version mit Kapo gespielt wird: Akkorde als Griffe und capo entsprechend setzen.
- Antworte am Ende ausschließlich mit genau einem Aufruf von save_song.`

type Msg = Anthropic.Beta.BetaMessageParam

export async function searchSong(query: string, apiKey: string, signal?: AbortSignal): Promise<FoundSong> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
  const messages: Msg[] = [{ role: 'user', content: `Song: ${query.trim()}` }]

  for (let round = 0; round < 6; round++) {
    let res: Anthropic.Beta.BetaMessage
    try {
      res = await client.beta.messages.create(
        {
          model: MODEL,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'medium' },
          system: SYSTEM,
          tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }, SAVE_TOOL],
          messages,
        },
        { signal },
      )
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new SongSearchError('API-Schlüssel ungültig. Bitte unter „Mehr" prüfen.')
      if (err instanceof Anthropic.PermissionDeniedError)
        throw new SongSearchError('Der Schlüssel darf dieses Modell oder die Websuche nicht nutzen (Console-Einstellungen prüfen).')
      if (err instanceof Anthropic.RateLimitError) throw new SongSearchError('Zu viele Anfragen – bitte kurz warten.')
      if (err instanceof Anthropic.BadRequestError) throw new SongSearchError(`Anfrage abgelehnt: ${err.message}`)
      if (err instanceof Anthropic.APIConnectionError) throw new SongSearchError('Keine Verbindung. Bist du online?')
      if (err instanceof Anthropic.APIError) throw new SongSearchError(`Serverfehler (${err.status ?? '?'}). Bitte später erneut.`)
      throw err
    }

    if (res.stop_reason === 'refusal') throw new SongSearchError('Die KI hat die Anfrage abgelehnt.')

    const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'save_song')
    if (call) return call.input as FoundSong

    messages.push({ role: 'assistant', content: res.content })
    // pause_turn: Websuche läuft noch – einfach fortsetzen.
    if (res.stop_reason !== 'pause_turn') {
      messages.push({ role: 'user', content: 'Bitte jetzt das Ergebnis mit save_song speichern.' })
    }
  }
  throw new SongSearchError('Die Suche hat kein Ergebnis geliefert. Bitte genauer angeben (Titel + Interpret).')
}

/** Baut aus dem Rechercheergebnis einen Song im App-Format. */
export function toSong(r: FoundSong, query: string): Song {
  const now = Date.now()
  const lines: string[] = []
  for (const s of r.sections) {
    const rep = s.repeat > 1 ? ` (${s.repeat}x)` : ''
    lines.push(`[${s.name.replace(/[[\]]/g, '')}${rep}]`)
    for (const l of s.chords.split('\n')) if (l.trim()) lines.push(l.trim())
    lines.push('')
  }
  if (r.riffTab.trim()) {
    lines.push('[Riff]', ...r.riffTab.trim().split('\n'), '')
  }
  const info = [
    r.key && `Tonart: ${r.key}`,
    r.timeSignature && `Takt: ${r.timeSignature}`,
    r.strumming && `Schlagmuster: ${r.strumming}`,
  ].filter(Boolean)
  const notes = [info.join(' · '), r.notes.trim(), `KI-Recherche (Übereinstimmung der Quellen: ${r.confidence}) – mit Original vergleichen.`]
    .filter(Boolean)
    .join('\n')
  const capo = Math.max(0, Math.min(9, Math.round(r.capo || 0)))
  return {
    id: crypto.randomUUID(),
    title: r.title.trim() || query.trim(),
    artist: r.artist.trim(),
    text: lines.join('\n').trim(),
    // Kapo-Version: Text enthält Griffe, klingt um capo höher
    transpose: capo,
    capo,
    bpm: r.bpm > 0 ? Math.round(r.bpm) : undefined,
    notes,
    sources: r.sources.filter((u) => /^https?:\/\//.test(u)).slice(0, 5),
    createdAt: now,
    updatedAt: now,
  }
}
