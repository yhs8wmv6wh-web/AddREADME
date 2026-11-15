import type { Recipe } from '../types'
import { multiply, scale, sum, type Nutrients } from './nutrients'

export function recipeTotal(r: Recipe): Nutrients {
  return sum(r.ingredients.filter((i) => i.included).map((i) => scale(i.per100, i.grams)))
}

export function recipePerServing(r: Recipe): Nutrients {
  return multiply(recipeTotal(r), 1 / Math.max(0.5, r.servings))
}
