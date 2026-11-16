import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Food, FoodEntry, Meal, Recipe, Settings } from '../types'
import { MEALS } from '../types'
import { deleteFood, getFoodByBarcode, getFoods, getRecipes, saveEntry, saveFood, saveRecipe } from '../db'
import { lookupBarcode, OffNotFound } from '../lib/off'
import { searchUsda } from '../lib/usda'
import { translateNames, translateQuery } from '../lib/claude'
import { fmt, fmtNum } from '../lib/nutrients'
import { recipePerServing } from '../lib/recipe'
import { AmountSheet } from './AmountSheet'
import { BarcodeScanner } from './BarcodeScanner'
import { FoodEditor } from './FoodEditor'
import { ErrorText, NumberField, Sheet, btnLink, btnPrimary, btnSecondary, card, input, label } from './ui'

interface Props {
  date: string
  meal: Meal
  settings: Settings
  onDone: () => void
  onClose: () => void
}

type Sub =
  | { kind: 'none' }
  | { kind: 'scan' }
  | { kind: 'amount'; food: Food }
  | { kind: 'editor'; food?: Food; barcode?: string; notFound?: string }
  | { kind: 'recipe'; recipe: Recipe }

export function AddFoodSheet({ date, meal, settings, onDone, onClose }: Props) {
  const [foods, setFoods] = useState<Food[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[] | null>(null)
  const [searchInfo, setSearchInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sub, setSub] = useState<Sub>({ kind: 'none' })

  const reload = useCallback(async () => {
    setFoods(await getFoods())
    setRecipes(await getRecipes())
  }, [])
  useEffect(() => {
    reload()
  }, [reload])

  const q = query.trim().toLocaleLowerCase('de')
  const localFoods = useMemo(
    () => (q ? foods.filter((f) => `${f.name} ${f.brand ?? ''}`.toLocaleLowerCase('de').includes(q)) : foods).slice(0, q ? 30 : 15),
    [foods, q],
  )
  const localRecipes = useMemo(
    () => (q ? recipes.filter((r) => r.title.toLocaleLowerCase('de').includes(q)) : recipes).slice(0, q ? 10 : 5),
    [recipes, q],
  )

  async function searchOnline() {
    const term = query.trim()
    if (!term) return
    setError(null)
    setResults(null)
    setSearchInfo(null)
    const key = settings.anthropicKey
    let english = term
    if (key) {
      setBusy('Übersetze Suchbegriff …')
      try {
        english = await translateQuery(key, term)
      } catch (err) {
        setBusy(null)
        setError(`Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'unbekannter Fehler'}`)
        return
      }
    }
    try {
      setBusy(`Suche „${english}" in der USDA-Datenbank …`)
      let found = await searchUsda(english, settings.usdaKey)
      if (key && found.length) {
        setBusy('Übersetze Treffer ins Deutsche …')
        try {
          const de = await translateNames(key, found.map((f) => f.name))
          found = found.map((f, i) => ({ ...f, nameEn: f.name, name: de[i] }))
        } catch {
          // Treffer trotzdem zeigen, dann eben auf Englisch.
        }
      }
      setResults(found)
      setSearchInfo(
        key
          ? `Gesucht nach „${english}"`
          : 'Ohne Claude-Schlüssel wird nicht übersetzt. USDA kennt nur englische Begriffe – Schlüssel in den Einstellungen eintragen.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suche fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  const handleBarcode = useCallback(async (code: string) => {
    setSub({ kind: 'none' })
    setError(null)
    const known = await getFoodByBarcode(code)
    if (known) {
      setSub({ kind: 'amount', food: known })
      return
    }
    setBusy('Suche Produkt in Open Food Facts …')
    try {
      const food = await lookupBarcode(code)
      setSub({ kind: 'amount', food })
    } catch (err) {
      if (err instanceof OffNotFound) setSub({ kind: 'editor', barcode: code, notFound: err.message })
      else setError(err instanceof Error ? err.message : 'Abfrage fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }, [])

  async function saveFoodEntry(entry: FoodEntry, food: Food) {
    await saveFood(food)
    await saveEntry({ ...entry, refId: food.id })
    onDone()
  }

  if (sub.kind === 'scan') return <BarcodeScanner onDetected={handleBarcode} onClose={() => setSub({ kind: 'none' })} />
  if (sub.kind === 'amount')
    return (
      <AmountSheet
        food={sub.food}
        meal={meal}
        date={date}
        onSave={saveFoodEntry}
        onEditFood={(food) => setSub({ kind: 'editor', food })}
        onClose={() => setSub({ kind: 'none' })}
      />
    )
  if (sub.kind === 'editor')
    return (
      <>
        <FoodEditor
          initial={sub.food}
          barcode={sub.barcode}
          apiKey={settings.anthropicKey}
          onSave={async (food) => {
            const saved = await saveFood(food)
            await reload()
            setSub({ kind: 'amount', food: saved })
          }}
          onDelete={async (food) => {
            await deleteFood(food.id)
            await reload()
            setSub({ kind: 'none' })
          }}
          onClose={() => setSub({ kind: 'none' })}
        />
        {sub.notFound && (
          <div className="fixed inset-x-0 bottom-0 z-40 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto max-w-xl rounded-lg bg-amber-100 dark:bg-amber-900 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 shadow-lg">
              {sub.notFound} Fotografiere die Nährwerttabelle oder trage die Werte ein.
              <button type="button" className="ml-2 underline" onClick={() => setSub({ ...sub, notFound: undefined })}>
                OK
              </button>
            </div>
          </div>
        )}
      </>
    )
  if (sub.kind === 'recipe')
    return (
      <RecipeServingSheet
        recipe={sub.recipe}
        date={date}
        meal={meal}
        onSave={async (entry) => {
          await saveEntry(entry)
          await saveRecipe({ ...sub.recipe, lastUsed: Date.now() })
          onDone()
        }}
        onClose={() => setSub({ kind: 'none' })}
      />
    )

  const mealLabel = MEALS.find((m) => m.id === meal)?.label ?? ''

  return (
    <Sheet title={`${mealLabel} hinzufügen`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btnPrimary} onClick={() => setSub({ kind: 'scan' })}>
            Barcode scannen
          </button>
          <button type="button" className={btnSecondary} onClick={() => setSub({ kind: 'editor' })}>
            Eigenes anlegen
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            searchOnline()
          }}
        >
          <input
            className={input}
            type="search"
            placeholder="Suchen, z. B. Rotwein, Haferflocken"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setResults(null)
            }}
          />
        </form>
        {query.trim() && (
          <button type="button" className={btnSecondary} onClick={searchOnline} disabled={!!busy}>
            In USDA-Datenbank suchen
          </button>
        )}
        {query.trim() && !settings.anthropicKey && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Kein Claude-Schlüssel eingetragen: Die Suche wird nicht übersetzt. Auf Englisch suchen oder Schlüssel unter Einstellungen eintragen.
          </p>
        )}
        {busy && <p className="text-sm text-neutral-500">{busy}</p>}
        <ErrorText>{error}</ErrorText>

        {results && (
          <section className="flex flex-col gap-2">
            <h3 className={label}>USDA-Treffer</h3>
            {searchInfo && (
              <p className={`text-sm ${settings.anthropicKey ? 'text-neutral-500' : 'text-amber-700 dark:text-amber-400'}`}>{searchInfo}</p>
            )}
            {results.length === 0 && <p className="text-sm text-neutral-500">Keine Treffer. Versuch einen allgemeineren Begriff.</p>}
            <FoodList foods={results} onPick={(food) => setSub({ kind: 'amount', food })} />
          </section>
        )}

        {localRecipes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={label}>Rezepte</h3>
            <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
              {localRecipes.map((r) => (
                <li key={r.id}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left" onClick={() => setSub({ kind: 'recipe', recipe: r })}>
                    <span className="min-w-0 truncate">{r.title}</span>
                    <span className="shrink-0 text-sm tabular-nums text-neutral-500">{fmt(recipePerServing(r).kcal, 'kcal')} kcal/Portion</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className={label}>{q ? 'Meine Lebensmittel' : 'Zuletzt verwendet'}</h3>
          {localFoods.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {q ? 'Nichts Passendes gespeichert. Tippe auf „In USDA-Datenbank suchen".' : 'Noch nichts gespeichert. Scanne einen Barcode oder suche ein Lebensmittel.'}
            </p>
          ) : (
            <FoodList foods={localFoods} onPick={(food) => setSub({ kind: 'amount', food })} />
          )}
        </section>
      </div>
    </Sheet>
  )
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
      {foods.map((f) => (
        <li key={f.id}>
          <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left" onClick={() => onPick(f)}>
            <span className="min-w-0">
              <span className="block truncate">{f.name}</span>
              {(f.brand || f.nameEn) && <span className="block truncate text-xs text-neutral-500">{f.brand ?? f.nameEn}</span>}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-neutral-500">
              {fmt(f.per100.kcal, 'kcal')} kcal/100 {f.unit}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function RecipeServingSheet({
  recipe,
  date,
  meal,
  onSave,
  onClose,
}: {
  recipe: Recipe
  date: string
  meal: Meal
  onSave: (e: FoodEntry) => void
  onClose: () => void
}) {
  const [servings, setServings] = useState<number | undefined>(1)
  const per = recipePerServing(recipe)
  const kcal = (per.kcal ?? 0) * (servings ?? 0)
  return (
    <Sheet title="Portionen" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">{recipe.title}</h3>
        <p className="text-sm text-neutral-500">
          Rezept geteilt durch {fmtNum(recipe.servings, 1)} Portionen · {fmt(per.kcal, 'kcal')} kcal pro Portion
        </p>
        <div className="flex gap-2">
          {[0.5, 1, 1.5, 2].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setServings(v)}
              className={`flex-1 rounded-lg border py-2 ${servings === v ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              {fmtNum(v, 1)}
            </button>
          ))}
        </div>
        <NumberField value={servings} onChange={setServings} />
        <p className="text-3xl font-semibold tabular-nums">
          {fmtNum(kcal)} <span className="text-base font-normal text-neutral-500">kcal</span>
        </p>
        <button
          type="button"
          className={btnPrimary}
          disabled={!servings || servings <= 0}
          onClick={() => {
            const s = servings ?? 1
            const nutrients = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, (v as number) * s]))
            onSave({
              id: crypto.randomUUID(),
              date,
              meal,
              kind: 'recipe',
              refId: recipe.id,
              name: recipe.title,
              amount: s,
              unit: 'Portion',
              nutrients,
              createdAt: Date.now(),
            })
          }}
        >
          Eintragen
        </button>
        <p className="text-xs text-neutral-500">
          Tipp: Die Portionszahl des Rezepts änderst du unter <span className={btnLink}>Rezepte</span>.
        </p>
      </div>
    </Sheet>
  )
}
