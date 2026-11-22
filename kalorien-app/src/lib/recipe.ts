import type { Recipe } from '../types'
import { multiply, scale, sum, type Nutrients } from './nutrients'

export function recipeTotal(r: Recipe): Nutrients {
  return sum(r.ingredients.filter((i) => i.included).map((i) => scale(i.per100, i.grams)))
}

export function recipePerServing(r: Recipe): Nutrients {
  return multiply(recipeTotal(r), 1 / Math.max(0.5, r.servings))
}

/** Für die Suche: klein, ohne Akzente/Umlaut-Punkte, ß → ss. */
export function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Findet Rezepte über Titel und Zutaten; alle Suchwörter müssen vorkommen. */
export function recipeMatches(r: Recipe, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = normalizeSearch([r.title, ...r.ingredients.map((i) => `${i.name} ${i.original}`)].join(' '))
  return words.every((w) => hay.includes(w))
}
