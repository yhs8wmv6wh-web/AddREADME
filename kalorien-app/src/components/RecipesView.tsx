import { useEffect, useRef, useState } from 'react'
import type { Food, Recipe, RecipeIngredient, Settings } from '../types'
import { deleteRecipe, getRecipes, saveRecipe } from '../db'
import { parseRecipe, type RecipeSource } from '../lib/claude'
import { RecipePaste } from './RecipePaste'
import { RecipeDescribe } from './RecipeDescribe'
import { searchUsda } from '../lib/usda'
import { MICRO_KEYS, NUTRIENT_META, fmt, fmtNum, scale, type NutrientKey } from '../lib/nutrients'
import { recipePerServing, recipeTotal } from '../lib/recipe'
import { ErrorText, NumberField, Sheet, btnLink, btnPrimary, btnSecondary, card, input, label } from './ui'

export function RecipesView({ settings, refreshKey }: { settings: Settings; refreshKey: number }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    setRecipes(await getRecipes())
  }
  useEffect(() => {
    reload()
  }, [refreshKey])

  async function importRecipe(src: RecipeSource, fallbackTitle: string): Promise<boolean> {
    if (!settings.anthropicKey) {
      setError('Für den Rezept-Import brauchst du einen Claude-API-Schlüssel. Trage ihn unter Einstellungen ein.')
      return false
    }
    setBusy(true)
    setError(null)
    try {
      const parsed = await parseRecipe(settings.anthropicKey, src)
      const servings = Math.round(((parsed.servingsMin + parsed.servingsMax) / 2) * 2) / 2 || 4
      setEditing({
        id: crypto.randomUUID(),
        title: parsed.title || fallbackTitle,
        servingsText: parsed.servingsText,
        servings,
        ingredients: parsed.ingredients.map((i) => ({
          id: crypto.randomUUID(),
          original: i.original,
          name: i.nameDe,
          usdaQuery: i.usdaQuery,
          grams: Math.round(i.grams),
          per100: i.estimate,
          source: 'estimate',
          included: true,
        })),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rezept konnte nicht gelesen werden.')
      return false
    } finally {
      setBusy(false)
    }
  }

  function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) importRecipe({ pdf: file }, file.name.replace(/\.pdf$/i, ''))
  }

  if (editing)
    return (
      <RecipeEditor
        recipe={editing}
        settings={settings}
        onSave={async (r) => {
          await saveRecipe(r)
          await reload()
          setEditing(null)
        }}
        onDelete={async (r) => {
          await deleteRecipe(r.id)
          await reload()
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <RecipeDescribe busy={busy} onImport={(text) => importRecipe({ text, spoken: true }, 'Selbst gekocht')} />
      <RecipePaste busy={busy} onImport={(src) => importRecipe(src, 'Rezept')} />
      {busy && <p className="text-sm text-neutral-500">Claude liest das Rezept … (ca. 30–60 Sekunden)</p>}
      <ErrorText>{error}</ErrorText>
      <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} disabled={busy}>
        PDF-Datei auswählen
      </button>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handlePdf} />
      <p className="text-sm text-neutral-500">
        Danach kannst du Zutaten abwählen, Mengen ändern und die Werte mit der USDA-Datenbank abgleichen.
      </p>

      {recipes.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch keine Rezepte.</p>
      ) : (
        <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
          {recipes.map((r) => (
            <li key={r.id}>
              <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left" onClick={() => setEditing(r)}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block text-xs text-neutral-500">
                    {fmtNum(r.servings, 1)} Portionen · {r.ingredients.filter((i) => i.included).length} Zutaten
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-neutral-500">{fmt(recipePerServing(r).kcal, 'kcal')} kcal/Portion</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const SOURCE_BADGE: Record<RecipeIngredient['source'], string> = {
  estimate: 'Schätzung',
  usda: 'USDA',
  off: 'Open Food Facts',
  custom: 'Eigen',
  label: 'Verpackung',
}

function RecipeEditor({
  recipe,
  settings,
  onSave,
  onDelete,
  onClose,
}: {
  recipe: Recipe
  settings: Settings
  onSave: (r: Recipe) => void
  onDelete: (r: Recipe) => void
  onClose: () => void
}) {
  const [r, setR] = useState<Recipe>(recipe)
  const [matching, setMatching] = useState<string | null>(null)
  const [choices, setChoices] = useState<{ id: string; foods: Food[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = (id: string, patch: Partial<RecipeIngredient>) =>
    setR((cur) => ({ ...cur, ingredients: cur.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  async function matchOne(ing: RecipeIngredient) {
    setError(null)
    setMatching(ing.id)
    try {
      const foods = await searchUsda(ing.usdaQuery || ing.name, settings.usdaKey, 6)
      if (foods.length === 0) setError(`Kein USDA-Treffer für „${ing.name}". Die Schätzung bleibt.`)
      else setChoices({ id: ing.id, foods })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Abgleich fehlgeschlagen.')
    } finally {
      setMatching(null)
    }
  }

  async function matchAll() {
    setError(null)
    for (const ing of r.ingredients.filter((i) => i.included && i.source === 'estimate')) {
      setMatching(ing.id)
      try {
        const [first] = await searchUsda(ing.usdaQuery || ing.name, settings.usdaKey, 1)
        if (first) update(ing.id, { per100: first.per100, source: 'usda', matchedName: first.name })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Abgleich fehlgeschlagen.')
        break
      }
    }
    setMatching(null)
  }

  const total = recipeTotal(r)
  const per = recipePerServing(r)
  const estimates = r.ingredients.filter((i) => i.included && i.source === 'estimate').length
  const summaryKeys: NutrientKey[] = ['protein', 'carbs', 'fat', 'fiber', ...MICRO_KEYS]

  if (choices) {
    const ing = r.ingredients.find((i) => i.id === choices.id)!
    return (
      <Sheet title="Treffer wählen" onClose={() => setChoices(null)}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">Für: {ing.original}</p>
          <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
            {choices.foods.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  onClick={() => {
                    update(ing.id, { per100: f.per100, source: 'usda', matchedName: f.name })
                    setChoices(null)
                  }}
                >
                  <span className="min-w-0">{f.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-500">{fmt(f.per100.kcal, 'kcal')} kcal/100 g</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      title="Rezept"
      onClose={onClose}
      action={
        <button type="button" className={btnLink} onClick={() => onSave(r)}>
          Sichern
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <input className={`${input} font-semibold`} value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} />

        <div className="flex flex-col gap-1.5">
          <span className={label}>Portionen (geteilt durch)</span>
          <NumberField value={r.servings} onChange={(v) => setR({ ...r, servings: v ?? 1 })} />
          {r.servingsText && <p className="text-xs text-neutral-500">Im Rezept: „{r.servingsText}"</p>}
        </div>

        <div className={`${card} p-4`}>
          <p className="text-3xl font-semibold tabular-nums">
            {fmt(per.kcal, 'kcal')} <span className="text-base font-normal text-neutral-500">kcal pro Portion</span>
          </p>
          <p className="text-sm text-neutral-500">Ganzes Rezept: {fmt(total.kcal, 'kcal')} kcal</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {summaryKeys.map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500 dark:text-neutral-400">{NUTRIENT_META[k].label}</dt>
                <dd className="tabular-nums">
                  {fmt(per[k], k)} {per[k] !== undefined ? NUTRIENT_META[k].unit : ''}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {estimates > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
            <p>{estimates} Zutaten haben noch geschätzte Werte von Claude. Der Abgleich holt gemessene Werte aus der USDA-Datenbank.</p>
            <button type="button" className={btnSecondary} onClick={matchAll} disabled={!!matching}>
              {matching ? 'Gleiche ab …' : 'Alle mit USDA abgleichen'}
            </button>
          </div>
        )}
        <ErrorText>{error}</ErrorText>

        <ul className="flex flex-col gap-2">
          {r.ingredients.map((ing) => {
            const kcal = scale(ing.per100, ing.grams).kcal
            return (
              <li key={ing.id} className={`${card} flex flex-col gap-2 p-3 ${ing.included ? '' : 'opacity-50'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${ing.name} verwenden`}
                    className="mt-1 h-5 w-5 accent-emerald-600"
                    checked={ing.included}
                    onChange={(e) => update(ing.id, { included: e.target.checked })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{ing.name}</p>
                    <p className="text-xs text-neutral-500">{ing.original}</p>
                    <p className="text-xs text-neutral-500">
                      <span className={ing.source === 'estimate' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                        {SOURCE_BADGE[ing.source]}
                      </span>
                      {ing.matchedName && ` · ${ing.matchedName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">{fmt(kcal, 'kcal')} kcal</span>
                </div>
                {ing.included && (
                  <div className="flex items-center gap-2 pl-8">
                    <NumberField value={ing.grams} onChange={(v) => update(ing.id, { grams: v ?? 0 })} className="w-24" />
                    <span className="text-sm text-neutral-500">g</span>
                    <button type="button" className={`${btnLink} ml-auto text-sm`} onClick={() => matchOne(ing)} disabled={!!matching}>
                      {matching === ing.id ? 'Suche …' : 'USDA-Treffer wählen'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <button type="button" className={btnPrimary} onClick={() => onSave(r)}>
          Rezept speichern
        </button>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button type="button" className={`${btnSecondary} flex-1 text-rose-600`} onClick={() => onDelete(r)}>
              Endgültig löschen
            </button>
            <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setConfirmDelete(false)}>
              Abbrechen
            </button>
          </div>
        ) : (
          <button type="button" className="text-sm text-rose-600" onClick={() => setConfirmDelete(true)}>
            Rezept löschen
          </button>
        )}
      </div>
    </Sheet>
  )
}
