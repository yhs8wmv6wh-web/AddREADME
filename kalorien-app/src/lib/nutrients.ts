// Alle Nährwerte, die die App kennt. Werte werden immer pro 100 g bzw. 100 ml
// gespeichert und bei Einträgen auf die tatsächliche Menge umgerechnet.
export const NUTRIENT_KEYS = [
  'kcal',
  'protein',
  'carbs',
  'sugar',
  'fat',
  'satFat',
  'fiber',
  'salt',
  'iron',
  'magnesium',
  'vitD',
  'b12',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

/** Fehlender Schlüssel = Wert unbekannt (nicht 0). */
export type Nutrients = Partial<Record<NutrientKey, number>>

export const NUTRIENT_META: Record<NutrientKey, { label: string; unit: string; digits: number }> = {
  kcal: { label: 'Kalorien', unit: 'kcal', digits: 0 },
  protein: { label: 'Eiweiß', unit: 'g', digits: 1 },
  carbs: { label: 'Kohlenhydr.', unit: 'g', digits: 1 },
  sugar: { label: 'davon Zucker', unit: 'g', digits: 1 },
  fat: { label: 'Fett', unit: 'g', digits: 1 },
  satFat: { label: 'davon gesättigt', unit: 'g', digits: 1 },
  fiber: { label: 'Ballaststoffe', unit: 'g', digits: 1 },
  salt: { label: 'Salz', unit: 'g', digits: 2 },
  iron: { label: 'Eisen', unit: 'mg', digits: 1 },
  magnesium: { label: 'Magnesium', unit: 'mg', digits: 0 },
  vitD: { label: 'Vitamin D', unit: 'µg', digits: 1 },
  b12: { label: 'Vitamin B12', unit: 'µg', digits: 1 },
}

export const MICRO_KEYS: NutrientKey[] = ['iron', 'magnesium', 'vitD', 'b12']

/** Skaliert Werte pro 100 g/ml auf eine Menge. */
export function scale(per100: Nutrients, amount: number): Nutrients {
  const out: Nutrients = {}
  for (const k of NUTRIENT_KEYS) {
    const v = per100[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = (v * amount) / 100
  }
  return out
}

export function multiply(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {}
  for (const k of NUTRIENT_KEYS) {
    const v = n[k]
    if (typeof v === 'number') out[k] = v * factor
  }
  return out
}

/** Summe. Ein Schlüssel bleibt nur dann unbekannt, wenn ihn kein Summand hat. */
export function sum(list: Nutrients[]): Nutrients {
  const out: Nutrients = {}
  for (const n of list) {
    for (const k of NUTRIENT_KEYS) {
      const v = n[k]
      if (typeof v === 'number') out[k] = (out[k] ?? 0) + v
    }
  }
  return out
}

export function fmt(v: number | undefined, key: NutrientKey): string {
  if (v === undefined) return '–'
  return v.toLocaleString('de-DE', {
    maximumFractionDigits: NUTRIENT_META[key].digits,
    minimumFractionDigits: 0,
  })
}

export function fmtNum(v: number, digits = 0): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: digits })
}

/** Nährwerte für eine Menge: g/ml bezogen auf 100, Stück direkt multipliziert. */
export function forAmount(per: Nutrients, unit: string, amount: number): Nutrients {
  return unit === 'Stk' ? multiply(per, amount) : scale(per, amount)
}

/** "pro 100 g", "pro 100 ml" oder "pro Stück" */
export function perLabel(unit: string): string {
  return unit === 'Stk' ? 'pro Stück' : `pro 100 ${unit}`
}
