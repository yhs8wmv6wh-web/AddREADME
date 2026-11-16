import type { Food, Unit } from '../types'
import type { Nutrients } from './nutrients'

// Open Food Facts: freie Produktdatenbank, Abfrage per Barcode, kein Schlüssel nötig.
// Die *_100g-Felder liegen in Gramm vor; Mikronährstoffe werden umgerechnet.

interface OffProduct {
  product_name?: string
  product_name_de?: string
  brands?: string
  quantity?: string
  product_quantity_unit?: string
  serving_quantity?: number | string
  serving_size?: string
  nutriments?: Record<string, number | string>
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

export function offNutrients(n: Record<string, number | string> = {}): Nutrients {
  const out: Nutrients = {}
  const set = (key: keyof Nutrients, v: number | undefined, factor = 1) => {
    if (v !== undefined) out[key] = v * factor
  }
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj !== undefined) kcal = kj / 4.184
  }
  set('kcal', kcal)
  set('protein', num(n['proteins_100g']))
  set('carbs', num(n['carbohydrates_100g']))
  set('sugar', num(n['sugars_100g']))
  set('fat', num(n['fat_100g']))
  set('satFat', num(n['saturated-fat_100g']))
  set('fiber', num(n['fiber_100g']))
  const salt = num(n['salt_100g'])
  if (salt !== undefined) out.salt = salt
  else set('salt', num(n['sodium_100g']), 2.5)
  set('iron', num(n['iron_100g']), 1000)
  set('magnesium', num(n['magnesium_100g']), 1000)
  set('vitD', num(n['vitamin-d_100g']), 1_000_000)
  set('b12', num(n['vitamin-b12_100g']), 1_000_000)
  return out
}

export class OffNotFound extends Error {}

export async function lookupBarcode(code: string): Promise<Food> {
  const fields = 'product_name,product_name_de,brands,quantity,product_quantity_unit,serving_quantity,serving_size,nutriments'
  let res: Response
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`)
  } catch {
    throw new Error('Keine Verbindung zu Open Food Facts. Bist du online?')
  }
  if (res.status === 404) throw new OffNotFound('Produkt nicht in Open Food Facts gefunden.')
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (Fehler ${res.status}). Später erneut versuchen.`)
  const data = (await res.json()) as { status?: number; product?: OffProduct }
  if (data.status !== 1 || !data.product) throw new OffNotFound('Produkt nicht in Open Food Facts gefunden.')

  const p = data.product
  const per100 = offNutrients(p.nutriments)
  if (per100.kcal === undefined) throw new OffNotFound('Produkt gefunden, aber ohne Nährwerte.')

  const qty = `${p.quantity ?? ''} ${p.product_quantity_unit ?? ''}`.toLowerCase()
  const unit: Unit = /\b(ml|cl|l)\b/.test(qty) ? 'ml' : 'g'
  const serving = num(p.serving_quantity)

  return {
    id: crypto.randomUUID(),
    name: (p.product_name_de || p.product_name || `Produkt ${code}`).trim(),
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    source: 'off',
    sourceId: code,
    barcode: code,
    unit,
    per100,
    portions: serving ? [{ name: p.serving_size ? `Portion (${p.serving_size})` : 'Portion', amount: serving }] : [],
    lastUsed: Date.now(),
  }
}
