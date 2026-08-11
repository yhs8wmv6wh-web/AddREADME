import type { LookupResult } from '../types'

// Direkter Aufruf der Anthropic-API aus dem Browser. Kein Server, kein Proxy –
// der Schlüssel des Nutzers wird per Header mitgeschickt. Der Header
// `anthropic-dangerous-direct-browser-access` erlaubt den Aufruf direkt aus
// dem Browser (CORS). Modell: Haiku (schnell & günstig, für kurze
// Wörterbuch-Erklärungen völlig ausreichend).
const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'
const ANTHROPIC_VERSION = '2023-06-01'

// Unterschiedliche Fehlerklassen, damit die Oberfläche klare Meldungen zeigen kann.
export class ApiKeyError extends Error {} // 401 – Schlüssel fehlt/ungültig
export class RateLimitError extends Error {} // 429 – zu viele Anfragen
export class RefusalError extends Error {} // KI hat die Anfrage abgelehnt
export class NetworkError extends Error {} // offline / Serverfehler / unerwartete Antwort

// Erzwingt eine verlässlich geformte JSON-Antwort mit genau diesen Feldern.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    word: { type: 'string' },
    explanation: { type: 'string' },
    isGerman: { type: 'boolean' },
    etymology: { type: 'string' },
  },
  required: ['word', 'explanation', 'isGerman', 'etymology'],
} as const

const SYSTEM_PROMPT = [
  'Du bist ein deutsches Wörterbuch für Fremd- und Fachwörter.',
  'Der Nutzer gibt ein Wort ein. Antworte immer auf Deutsch.',
  '',
  '- "explanation": eine kurze, bündige Erklärung des Wortes auf Deutsch',
  '  (ein bis drei Sätze, allgemein verständlich).',
  '- "isGerman": true, wenn es ein deutschstämmiges Wort ist; false, wenn es',
  '  ein Fremdwort bzw. aus einer anderen Sprache entlehnt ist.',
  '- "etymology": nur wenn isGerman false ist, die Herkunft knapp angeben',
  '  (Ursprungssprache und ursprüngliche Bedeutung, z. B. "lat. serendipitas ...").',
  '  Wenn isGerman true ist, gib einen leeren String "" zurück.',
  '- "word": das Wort in korrekter Schreibweise (Substantive großgeschrieben).',
  '',
  'Halte dich kurz und sachlich. Keine Einleitungsfloskeln.',
].join('\n')

interface AnthropicResponse {
  stop_reason?: string
  content?: Array<{ type: string; text?: string }>
}

export async function lookupWord(word: string, apiKey: string): Promise<LookupResult> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: word.trim() }],
      }),
    })
  } catch {
    throw new NetworkError('Keine Verbindung. Bist du online?')
  }

  if (!res.ok) {
    if (res.status === 401) throw new ApiKeyError('API-Schlüssel ungültig.')
    if (res.status === 429) throw new RateLimitError('Zu viele Anfragen – bitte kurz warten und erneut versuchen.')
    if (res.status === 400) {
      // Häufigste Ursache eines 400 ist ein falsch formatierter/leerer Schlüssel.
      throw new ApiKeyError('Anfrage abgelehnt – bitte prüfe deinen API-Schlüssel.')
    }
    throw new NetworkError(`Serverfehler (${res.status}). Bitte später erneut versuchen.`)
  }

  let data: AnthropicResponse
  try {
    data = await res.json()
  } catch {
    throw new NetworkError('Unerwartete Antwort der KI.')
  }

  if (data.stop_reason === 'refusal') {
    throw new RefusalError('Die KI hat die Anfrage abgelehnt.')
  }

  const textBlock = data.content?.find((block) => block.type === 'text' && block.text)
  if (!textBlock?.text) throw new NetworkError('Unerwartete Antwort der KI.')

  let parsed: LookupResult
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new NetworkError('Die Antwort der KI konnte nicht gelesen werden.')
  }

  const isGerman = Boolean(parsed.isGerman)
  return {
    word: (parsed.word ?? word).trim() || word.trim(),
    explanation: (parsed.explanation ?? '').trim(),
    isGerman,
    etymology: isGerman ? '' : (parsed.etymology ?? '').trim(),
  }
}
