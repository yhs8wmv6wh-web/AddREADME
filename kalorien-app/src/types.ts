import type { Nutrients } from './lib/nutrients'

// 'Stk': Werte in per100 gelten dann für EIN Stück (z. B. eine Praline).
export type Unit = 'g' | 'ml' | 'Stk'
export type FoodSource = 'off' | 'usda' | 'custom' | 'label'

export interface Portion {
  name: string // z. B. "Weinglas"
  amount: number // in g bzw. ml
}

export interface Food {
  id: string
  name: string
  nameEn?: string // Originalname aus der USDA-Datenbank
  brand?: string
  source: FoodSource
  sourceId?: string // FDC-ID bzw. Barcode
  barcode?: string
  unit: Unit
  per100: Nutrients
  portions: Portion[]
  lastUsed: number
  favorite?: boolean
}

export type Meal = 'fruehstueck' | 'mittag' | 'abend' | 'snacks'

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'fruehstueck', label: 'Frühstück' },
  { id: 'mittag', label: 'Mittagessen' },
  { id: 'abend', label: 'Abendessen' },
  { id: 'snacks', label: 'Snacks' },
]

export interface FoodEntry {
  id: string
  date: string // YYYY-MM-DD
  meal: Meal
  kind: 'food' | 'recipe'
  refId: string
  name: string
  amount: number // g/ml bei Lebensmitteln, Portionen bei Rezepten
  unit: Unit | 'Portion'
  nutrients: Nutrients // Momentaufnahme für genau diese Menge
  createdAt: number
}

export interface RecipeIngredient {
  id: string
  original: string // Zeile aus dem Rezept
  name: string // deutscher Name
  usdaQuery?: string // englischer Suchbegriff für den Abgleich
  matchedName?: string // Name des gewählten USDA-Eintrags
  grams: number
  per100: Nutrients
  source: FoodSource | 'estimate'
  included: boolean
}

export interface Recipe {
  id: string
  title: string
  servingsText: string // so wie im Rezept, z. B. "4 to 6 servings"
  servings: number // Portionen, durch die geteilt wird
  ingredients: RecipeIngredient[]
  createdAt: number
  lastUsed: number
}

export interface ActivityEntry {
  id: string
  date: string
  name: string
  kcal: number
  minutes?: number
  distanceKm?: number
  templateId?: string
  slot?: string
  createdAt: number
}

export type TemplateKind = 'cycling' | 'fixed'

export interface ActivityTemplate {
  id: string
  name: string
  kind: TemplateKind
  weekdays: number[] // 1 = Montag … 7 = Sonntag
  slots: string[] // z. B. ["morgens", "nachmittags"]; pro Slot ein Eintrag
  minutes?: number // nur Fahrrad
  distanceKm?: number // nur Fahrrad
  met?: number // veraltet: Tempo-Auswahl vor Einführung der Strecke
  kcal?: number // nur feste Aktivität
  startDate: string
  active: boolean
}

export interface BodyLog {
  date: string // Schlüssel
  weightKg?: number
  bodyFatPct?: number
}

export type Sex = 'f' | 'm'

export interface Settings {
  sex: Sex
  birthYear: number
  heightCm: number
  startWeightKg: number
  goalWeightKg: number
  pacePerWeekKg: number
  activityFactor: number
  proteinPerKg: number
  fatPct: number
  addExerciseToBudget: boolean
  microTargets: { iron: number; magnesium: number; vitD: number; b12: number }
  anthropicKey: string
  usdaKey: string
}
