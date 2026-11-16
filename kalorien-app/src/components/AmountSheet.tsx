import { useState } from 'react'
import type { Food, FoodEntry, Meal, Portion } from '../types'
import { MEALS } from '../types'
import { MICRO_KEYS, NUTRIENT_META, fmt, forAmount, perLabel, type NutrientKey } from '../lib/nutrients'
import { NumberField, Sheet, btnLink, btnPrimary, btnSecondary, card, input, label } from './ui'

const SOURCE_LABEL: Record<Food['source'], string> = {
  off: 'Open Food Facts',
  usda: 'USDA FoodData Central',
  custom: 'Eigener Eintrag',
  label: 'Von der Verpackung (Foto)',
}

const PREVIEW_KEYS: NutrientKey[] = ['protein', 'carbs', 'fat', 'fiber', ...MICRO_KEYS]

interface Props {
  food: Food
  meal: Meal
  date: string
  existing?: FoodEntry
  onSave: (entry: FoodEntry, food: Food) => void
  onEditFood: (food: Food) => void
  onDelete?: (entry: FoodEntry) => void
  onClose: () => void
}

export function AmountSheet({ food, meal: initialMeal, date, existing, onSave, onEditFood, onDelete, onClose }: Props) {
  const [amount, setAmount] = useState<number | undefined>(existing?.amount ?? (food.unit === 'Stk' ? 1 : (food.portions[0]?.amount ?? 100)))
  const [meal, setMeal] = useState<Meal>(existing?.meal ?? initialMeal)
  const [portions, setPortions] = useState<Portion[]>(food.portions)
  const [newPortion, setNewPortion] = useState<{ name: string; amount?: number } | null>(null)

  const n = forAmount(food.per100, food.unit, amount ?? 0)
  const unit = food.unit

  function save() {
    if (!amount || amount <= 0) return
    const updatedFood: Food = { ...food, portions, lastUsed: Date.now() }
    onSave(
      {
        id: existing?.id ?? crypto.randomUUID(),
        date,
        meal,
        kind: 'food',
        refId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        amount,
        unit,
        nutrients: n,
        createdAt: existing?.createdAt ?? Date.now(),
      },
      updatedFood,
    )
  }

  function addPortion() {
    if (!newPortion?.name.trim() || !newPortion.amount) return
    const p = { name: newPortion.name.trim(), amount: newPortion.amount }
    setPortions([...portions, p])
    setAmount(p.amount)
    setNewPortion(null)
  }

  const missing = (['kcal', 'protein', 'carbs', 'fat'] as NutrientKey[]).filter((k) => food.per100[k] === undefined)

  return (
    <Sheet title={existing ? 'Eintrag ändern' : 'Menge'} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold leading-snug">{food.name}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {food.brand ? `${food.brand} · ` : ''}
            {SOURCE_LABEL[food.source]} · {fmt(food.per100.kcal, 'kcal')} kcal {perLabel(unit)}
          </p>
          {missing.length > 0 && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Fehlende Angaben: {missing.map((k) => NUTRIENT_META[k].label).join(', ')}.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="amount" className={label}>
            {unit === 'Stk' ? 'Anzahl (Stück)' : `Menge in ${unit}`}
          </label>
          <div className="flex items-center gap-2">
            <NumberField id="amount" value={amount} onChange={setAmount} className="text-xl font-semibold" />
            <span className="text-neutral-500">{unit}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {portions.map((p, i) => (
              <span key={i} className="flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 text-sm">
                <button type="button" className="py-1.5 pl-3 pr-2" onClick={() => setAmount(p.amount)}>
                  {p.name} · {p.amount} {unit}
                </button>
                <button
                  type="button"
                  aria-label={`Portion ${p.name} entfernen`}
                  className="py-1.5 pl-1 pr-3 text-neutral-400"
                  onClick={() => setPortions(portions.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </span>
            ))}
            {!newPortion && unit !== 'Stk' && (
              <button type="button" className={`${btnLink} text-sm py-1.5`} onClick={() => setNewPortion({ name: '', amount })}>
                + Eigene Portion
              </button>
            )}
          </div>
          {newPortion && (
            <div className={`${card} flex flex-col gap-2 p-3`}>
              <p className="text-sm text-neutral-500">z. B. „Mein Weinglas" = 150 ml. Wird beim Lebensmittel gespeichert.</p>
              <input
                className={input}
                placeholder="Name der Portion"
                value={newPortion.name}
                onChange={(e) => setNewPortion({ ...newPortion, name: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <NumberField value={newPortion.amount} onChange={(v) => setNewPortion({ ...newPortion, amount: v })} placeholder="Menge" />
                <span className="text-neutral-500">{unit}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnPrimary} onClick={addPortion}>
                  Portion anlegen
                </button>
                <button type="button" className={btnSecondary} onClick={() => setNewPortion(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className={label}>Mahlzeit</span>
          <div className="grid grid-cols-2 gap-2">
            {MEALS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMeal(m.id)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  meal === m.id
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`${card} p-4`}>
          <p className="text-3xl font-semibold tabular-nums">
            {fmt(n.kcal, 'kcal')} <span className="text-base font-normal text-neutral-500">kcal</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {PREVIEW_KEYS.map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500 dark:text-neutral-400">{NUTRIENT_META[k].label}</dt>
                <dd className="tabular-nums">
                  {fmt(n[k], k)} {n[k] !== undefined ? NUTRIENT_META[k].unit : ''}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <button type="button" className={btnPrimary} onClick={save} disabled={!amount || amount <= 0}>
          {existing ? 'Speichern' : 'Eintragen'}
        </button>
        <button type="button" className={`${btnLink} text-sm`} onClick={() => onEditFood({ ...food, portions })}>
          Nährwerte dieses Lebensmittels bearbeiten
        </button>
        {existing && onDelete && (
          <button type="button" className="text-sm text-rose-600" onClick={() => onDelete(existing)}>
            Eintrag löschen
          </button>
        )}
      </div>
    </Sheet>
  )
}
