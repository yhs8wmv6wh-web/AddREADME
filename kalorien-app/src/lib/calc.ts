import type { ActivityTemplate, Settings } from '../types'

/** Grundumsatz nach Mifflin-St Jeor (kcal/Tag). */
export function bmr(s: Settings, weightKg: number, year = new Date().getFullYear()): number {
  const age = year - s.birthYear
  const base = 10 * weightKg + 6.25 * s.heightCm - 5 * age
  return base + (s.sex === 'm' ? 5 : -161)
}

/** Gesamtumsatz im Alltag ohne Sport. */
export function tdee(s: Settings, weightKg: number): number {
  return bmr(s, weightKg) * s.activityFactor
}

/** 1 kg Körperfett ≈ 7.700 kcal (gängige Faustregel). */
export const KCAL_PER_KG = 7700

export interface Targets {
  bmr: number
  tdee: number
  deficit: number
  kcal: number
  protein: number
  fat: number
  carbs: number
  belowBmr: boolean
}

export function targets(s: Settings, weightKg: number): Targets {
  const b = bmr(s, weightKg)
  const t = b * s.activityFactor
  const deficit = (s.pacePerWeekKg * KCAL_PER_KG) / 7
  const kcal = Math.round(t - deficit)
  // Eiweiß pro kg Zielgewicht: bei Übergewicht ergibt das aktuelle Gewicht zu hohe Werte.
  const protein = Math.round(s.proteinPerKg * Math.min(weightKg, s.goalWeightKg))
  const fat = Math.round((kcal * (s.fatPct / 100)) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(b), tdee: Math.round(t), deficit: Math.round(deficit), kcal, protein, fat, carbs, belowBmr: kcal < b }
}

export const ACTIVITY_LEVELS: { value: number; label: string }[] = [
  { value: 1.2, label: 'Überwiegend sitzend (Büro, Schreibtisch)' },
  { value: 1.375, label: 'Teils sitzend, teils auf den Beinen' },
  { value: 1.55, label: 'Überwiegend stehend oder gehend' },
]

// MET-Werte aus dem Compendium of Physical Activities (Ainsworth et al. 2011).
export const CYCLING_PRESETS: { met: number; label: string }[] = [
  { met: 4.0, label: 'Gemütlich, unter 16 km/h (MET 4,0)' },
  { met: 6.8, label: 'Arbeitsweg, eigenes Tempo (MET 6,8)' },
  { met: 8.0, label: 'Zügig, 19–22 km/h (MET 8,0)' },
]

/**
 * Netto-Verbrauch: (MET − 1) × kg × Stunden. Der Ruheumsatz für diese Zeit
 * steckt schon im Tagesumsatz und wird deshalb nicht doppelt gezählt.
 */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  return Math.max(0, Math.round((met - 1) * weightKg * (minutes / 60)))
}

export function templateKcal(t: ActivityTemplate, weightKg: number): number {
  if (t.kind === 'cycling') return metKcal(t.met ?? 6.8, weightKg, t.minutes ?? 0)
  return Math.round(t.kcal ?? 0)
}
