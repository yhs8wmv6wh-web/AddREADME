import Anthropic from '@anthropic-ai/sdk'
import type { Nutrients } from './nutrients'

// Claude wird direkt aus dem Browser aufgerufen, mit deinem eigenen Schlüssel,
// der nur lokal auf dem Gerät liegt. Kein Server dazwischen.
const MODEL = 'claude-opus-5-5'

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
}

function explain(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Claude-API-Schlüssel ungültig. Bitte in den Einstellungen prüfen.')
  if (err instanceof Anthropic.PermissionDeniedError) return new Error('Der Claude-Schlüssel hat keine Berechtigung (Guthaben aufgebraucht?).')
  if (err instanceof Anthropic.RateLimitError) return new Error('Zu viele Anfragen an Claude. Bitte kurz warten.')
  if (err instanceof Anthropic.BadRequestError) return new Error(`Claude hat die Anfrage abgelehnt: ${err.message}`)
  if (err instanceof Anthropic.APIConnectionError) return new Error('Keine Verbindung zu Claude. Bist du online?')
  if (err instanceof Anthropic.APIError) return new Error(`Claude-Fehler (${err.status}). Bitte später erneut versuchen.`)
  return err instanceof Error ? err : new Error('Unbekannter Fehler bei Claude.')
}

async function askJson<T>(
  apiKey: string,
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: Record<string, unknown>,
  effort: 'low' | 'medium' | 'high',
  maxTokens: number,
): Promise<T> {
  let msg: Anthropic.Beta.BetaMessage
  try {
    const stream = client(apiKey).beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    })
    msg = await stream.finalMessage()
  } catch (err) {
    throw explain(err)
  }
  if (msg.stop_reason === 'refusal') throw new Error('Claude hat die Anfrage abgelehnt.')
  if (msg.stop_reason === 'max_tokens') throw new Error('Die Antwort war zu lang und wurde abgeschnitten.')
  const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text
  if (!text) throw new Error('Unerwartete Antwort von Claude.')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Die Antwort von Claude konnte nicht gelesen werden.')
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk))
  return btoa(bin)
}

// ---------- Suchbegriff übersetzen ----------

const TRANSLATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { query: { type: 'string' } },
  required: ['query'],
}

/** Macht aus "Rotwein" einen USDA-tauglichen englischen Suchbegriff ("wine red table"). */
export async function translateQuery(apiKey: string, german: string): Promise<string> {
  const r = await askJson<{ query: string }>(
    apiKey,
    [
      {
        type: 'text',
        text:
          'Translate this German food search term into a short English search query for the USDA FoodData Central ' +
          'database (Foundation and SR Legacy foods). Use the wording USDA uses (e.g. "Rotwein" -> "wine red", ' +
          '"Haferflocken" -> "oats rolled", "Hähnchenbrust" -> "chicken breast raw"). Prefer raw/unprepared items ' +
          'unless the term says otherwise. Return only the query.\n\nTerm: ' +
          german,
      },
    ],
    TRANSLATE_SCHEMA,
    'low',
    2000,
  )
  return r.query.trim() || german
}

// ---------- Nährwerttabelle vom Foto ----------

const NUTRIENT_PROPS = {
  kcal: { type: ['number', 'null'] },
  protein: { type: ['number', 'null'] },
  carbs: { type: ['number', 'null'] },
  sugar: { type: ['number', 'null'] },
  fat: { type: ['number', 'null'] },
  satFat: { type: ['number', 'null'] },
  fiber: { type: ['number', 'null'] },
  salt: { type: ['number', 'null'] },
  iron: { type: ['number', 'null'] },
  magnesium: { type: ['number', 'null'] },
  vitD: { type: ['number', 'null'] },
  b12: { type: ['number', 'null'] },
}
const NUTRIENT_REQUIRED = Object.keys(NUTRIENT_PROPS)

const LABEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    unit: { type: 'string', enum: ['g', 'ml'] },
    nutrients: { type: 'object', additionalProperties: false, properties: NUTRIENT_PROPS, required: NUTRIENT_REQUIRED },
  },
  required: ['name', 'unit', 'nutrients'],
}

function cleanNutrients(raw: Record<string, number | null>): Nutrients {
  const out: Nutrients = {}
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && Number.isFinite(v)) out[k as keyof Nutrients] = v
  return out
}

export async function readNutritionLabel(apiKey: string, image: Blob): Promise<{ name: string; unit: 'g' | 'ml'; per100: Nutrients }> {
  const media = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  const r = await askJson<{ name: string; unit: 'g' | 'ml'; nutrients: Record<string, number | null> }>(
    apiKey,
    [
      { type: 'image', source: { type: 'base64', media_type: media, data: await toBase64(image) } },
      {
        type: 'text',
        text:
          'Das Foto zeigt eine Nährwerttabelle einer Lebensmittelverpackung. Lies die Werte PRO 100 g bzw. 100 ml ab ' +
          '(nicht pro Portion). Einheiten: kcal; protein, carbs, sugar, fat, satFat, fiber, salt in g; iron und ' +
          'magnesium in mg; vitD und b12 in µg. Steht ein Wert nicht auf der Verpackung, gib null zurück – ' +
          'nichts schätzen. Wenn nur kJ angegeben ist, rechne kcal = kJ / 4,184. "name": Produktname, falls ' +
          'erkennbar, sonst "". "unit": "ml" bei Getränken bzw. Angaben pro 100 ml, sonst "g".',
      },
    ],
    LABEL_SCHEMA,
    'medium',
    4000,
  )
  return { name: r.name, unit: r.unit, per100: cleanNutrients(r.nutrients) }
}

// ---------- Rezept-PDF ----------

export interface ParsedIngredient {
  original: string
  nameDe: string
  usdaQuery: string
  grams: number
  estimate: Nutrients
}

export interface ParsedRecipe {
  title: string
  servingsText: string
  servingsMin: number
  servingsMax: number
  ingredients: ParsedIngredient[]
}

const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    servingsText: { type: 'string' },
    servingsMin: { type: 'number' },
    servingsMax: { type: 'number' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          original: { type: 'string' },
          nameDe: { type: 'string' },
          usdaQuery: { type: 'string' },
          grams: { type: 'number' },
          estimate: { type: 'object', additionalProperties: false, properties: NUTRIENT_PROPS, required: NUTRIENT_REQUIRED },
        },
        required: ['original', 'nameDe', 'usdaQuery', 'grams', 'estimate'],
      },
    },
  },
  required: ['title', 'servingsText', 'servingsMin', 'servingsMax', 'ingredients'],
}

const RECIPE_PROMPT = `Das PDF ist ein Rezept (meist von NYT Cooking, also mit US-Mengenangaben).
Extrahiere alle Zutaten. Für jede Zutat:
- "original": die Zeile genau wie im Rezept.
- "nameDe": kurzer deutscher Name (z. B. "Olivenöl", "Zwiebel, roh").
- "usdaQuery": englischer Suchbegriff im Stil der USDA FoodData Central (Foundation/SR Legacy), z. B. "oil olive", "onions raw", "chicken thigh raw".
- "grams": Menge in Gramm (Flüssigkeiten: Milliliter ≈ Gramm). Rechne US-Einheiten um (1 cup Mehl ≈ 125 g, 1 cup Wasser ≈ 240 g, 1 tbsp Öl ≈ 13,5 g, 1 tsp Salz ≈ 6 g, 1 mittelgroße Zwiebel ≈ 110 g, 1 Knoblauchzehe ≈ 3 g usw.). Bei Mengenbereichen nimm die Mitte. Bei "nach Geschmack" eine realistische kleine Menge. Wasser zählt mit 0 kcal.
- "estimate": Nährwerte PRO 100 g dieser Zutat (roh bzw. wie eingekauft) als Schätzung aus deinem Wissen über USDA-Daten. Einheiten: kcal; Makros und Salz in g; iron, magnesium in mg; vitD, b12 in µg. null, wenn du es nicht weißt.
Optionale Zutaten und Garnituren mit aufnehmen. Zutaten, die nur zum Kochen und nicht zum Essen dienen (z. B. Frittieröl, Nudelwasser-Salz), mit realistischer aufgenommener Menge ansetzen.
"servingsText": die Portionsangabe aus dem Rezept wörtlich (z. B. "4 to 6 servings"). "servingsMin"/"servingsMax": Zahlen daraus (bei einer einzigen Zahl beide gleich; wenn keine Angabe: 4 und 4).`

export async function parseRecipePdf(apiKey: string, pdf: Blob): Promise<ParsedRecipe> {
  const r = await askJson<ParsedRecipe & { ingredients: (Omit<ParsedIngredient, 'estimate'> & { estimate: Record<string, number | null> })[] }>(
    apiKey,
    [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await toBase64(pdf) } },
      { type: 'text', text: RECIPE_PROMPT },
    ],
    RECIPE_SCHEMA,
    'medium',
    32000,
  )
  return { ...r, ingredients: r.ingredients.map((i) => ({ ...i, estimate: cleanNutrients(i.estimate) })) }
}
