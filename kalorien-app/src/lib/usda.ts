import type { Food, Portion } from '../types'
import type { Nutrients } from './nutrients'

// USDA FoodData Central: Grundnahrungsmittel mit gemessenen Nährwerten inkl.
// Mikronährstoffen. Nur "Foundation" und "SR Legacy" (keine Markenprodukte).
// Kostenloser Schlüssel: https://api.data.gov/signup – ohne Schlüssel wird
// DEMO_KEY benutzt (stark begrenzt).

interface UsdaNutrient {
  nutrientNumber?: string
  nutrientName?: string
  unitName?: string
  value?: number
}

interface UsdaFood {
  fdcId: number
  description: string
  dataType?: string
  foodNutrients?: UsdaNutrient[]
  foodMeasures?: { disseminationText?: string; gramWeight?: number }[]
}

export function usdaNutrients(list: UsdaNutrient[] = []): Nutrients {
  const byNum = new Map<string, UsdaNutrient>()
  for (const n of list) if (n.nutrientNumber && typeof n.value === 'number') byNum.set(n.nutrientNumber, n)
  const val = (...nums: string[]) => {
    for (const k of nums) {
      const n = byNum.get(k)
      if (n && typeof n.value === 'number') return n
    }
    return undefined
  }
  const out: Nutrients = {}
  // Energie: 208 (kcal); Foundation-Daten haben teils nur 957/958 (Atwater).
  const energy = val('208', '958', '957')
  if (energy?.value !== undefined) out.kcal = energy.unitName?.toLowerCase() === 'kj' ? energy.value / 4.184 : energy.value
  const map: [keyof Nutrients, string[]][] = [
    ['protein', ['203']],
    ['fat', ['204']],
    ['carbs', ['205']],
    ['fiber', ['291']],
    ['sugar', ['269', '269.3']],
    ['satFat', ['606']],
    ['iron', ['303']], // mg
    ['magnesium', ['304']], // mg
    ['vitD', ['328']], // µg (D2 + D3)
    ['b12', ['418']], // µg
  ]
  for (const [key, nums] of map) {
    const n = val(...nums)
    if (n?.value !== undefined) out[key] = n.value
  }
  const sodium = val('307') // mg
  if (sodium?.value !== undefined) out.salt = (sodium.value * 2.5) / 1000
  return out
}

export function usdaToFood(f: UsdaFood): Food {
  const portions: Portion[] = []
  for (const m of f.foodMeasures ?? []) {
    if (m.disseminationText && m.gramWeight && portions.length < 6) {
      portions.push({ name: m.disseminationText, amount: Math.round(m.gramWeight * 10) / 10 })
    }
  }
  return {
    id: crypto.randomUUID(),
    name: f.description,
    source: 'usda',
    sourceId: String(f.fdcId),
    unit: 'g',
    per100: usdaNutrients(f.foodNutrients),
    portions,
    lastUsed: Date.now(),
  }
}

export async function searchUsda(query: string, apiKey: string, pageSize = 20): Promise<Food[]> {
  const key = apiKey.trim() || 'DEMO_KEY'
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}` +
    `&query=${encodeURIComponent(query)}&dataType=${encodeURIComponent('Foundation,SR Legacy')}&pageSize=${pageSize}`
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('Keine Verbindung zur USDA-Datenbank. Bist du online?')
  }
  if (res.status === 429) {
    throw new Error(
      key === 'DEMO_KEY'
        ? 'USDA-Limit erreicht. Trage in den Einstellungen deinen eigenen kostenlosen USDA-Schlüssel ein.'
        : 'USDA-Limit erreicht. Bitte in einer Stunde erneut versuchen.',
    )
  }
  if (res.status === 401 || res.status === 403) throw new Error('USDA-Schlüssel ungültig. Bitte in den Einstellungen prüfen.')
  if (!res.ok) throw new Error(`USDA-Datenbank antwortet nicht (Fehler ${res.status}).`)
  const data = (await res.json()) as { foods?: UsdaFood[] }
  return (data.foods ?? []).map(usdaToFood).filter((f) => f.per100.kcal !== undefined)
}
