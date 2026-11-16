import { useEffect, useRef, useState } from 'react'
import type { Food, SupplementPlan } from '../types'
import { deleteSupplement, getDB, getSupplements, saveFood, saveSupplement, syncSupplementEntries } from '../db'
import { readSupplementLabel } from '../lib/claude'
import { WEEKDAY_SHORT, today } from '../lib/date'
import { MICRO_KEYS, NUTRIENT_META, fmt, fmtNum, pieceLabel, type NutrientKey, type Nutrients } from '../lib/nutrients'
import { shrinkImage } from './FoodEditor'
import { ErrorText, NumberField, Sheet, btnPrimary, btnSecondary, card, input, label } from './ui'

const FIELDS: NutrientKey[] = [...MICRO_KEYS, 'kcal']

interface Props {
  apiKey: string
  onClose: () => void
}

/** Supplements verwalten: Liste + Editor mit Etikett-Foto. */
export function SupplementsSheet({ apiKey, onClose }: Props) {
  const [plans, setPlans] = useState<{ plan: SupplementPlan; food?: Food }[]>([])
  const [editing, setEditing] = useState<{ plan: SupplementPlan; food?: Food } | null>(null)

  async function reload() {
    const db = await getDB()
    const list = await getSupplements()
    setPlans(await Promise.all(list.map(async (plan) => ({ plan, food: await db.get('foods', plan.foodId) }))))
  }
  useEffect(() => {
    reload()
  }, [])

  if (editing)
    return (
      <SupplementEditor
        apiKey={apiKey}
        plan={editing.plan}
        food={editing.food}
        onSaved={async () => {
          await reload()
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    )

  return (
    <Sheet title="Supplements" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Werden an den gewählten Tagen automatisch eingetragen. Nimmst du eins mal nicht, lösch den Eintrag im Tagebuch.
        </p>
        {plans.length > 0 && (
          <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
            {plans.map(({ plan, food }) => (
              <li key={plan.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left" onClick={() => setEditing({ plan, food })}>
                  <span className="min-w-0">
                    <span className={`block truncate ${plan.active ? '' : 'text-neutral-400 line-through'}`}>{food?.name ?? 'Unbekannt'}</span>
                    <span className="block text-xs text-neutral-500">
                      {fmtNum(plan.amount, 1)} {pieceLabel(food?.pieceName, plan.amount)} · {plan.weekdays.length === 7 ? 'täglich' : plan.weekdays.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-neutral-500">{food ? summary(food.per100, plan.amount) : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            setEditing({
              plan: { id: crypto.randomUUID(), foodId: '', amount: 1, weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: today(), active: true },
            })
          }
        >
          Neues Supplement
        </button>
      </div>
    </Sheet>
  )
}

function summary(perPiece: Nutrients, amount: number): string {
  return MICRO_KEYS.filter((k) => perPiece[k] !== undefined)
    .map((k) => `${NUTRIENT_META[k].label} ${fmt((perPiece[k] ?? 0) * amount, k)} ${NUTRIENT_META[k].unit}`)
    .join(' · ')
}

function SupplementEditor({
  apiKey,
  plan: initialPlan,
  food,
  onSaved,
  onClose,
}: {
  apiKey: string
  plan: SupplementPlan
  food?: Food
  onSaved: () => void
  onClose: () => void
}) {
  const [plan, setPlan] = useState(initialPlan)
  const [name, setName] = useState(food?.name ?? '')
  const [pieceName, setPieceName] = useState(food?.pieceName ?? 'Kapsel')
  const [perPiece, setPerPiece] = useState<Nutrients>(food?.per100 ?? {})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromPhoto, setFromPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    if (!apiKey) {
      setError('Zum Auslesen per Foto brauchst du den Claude-Schlüssel (Einstellungen).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await readSupplementLabel(apiKey, await Promise.all(files.map(shrinkImage)))
      setName(r.name || name)
      setPieceName(r.pieceName)
      setPerPiece(r.perPiece)
      if (r.dosePerDay) setPlan((p) => ({ ...p, amount: r.dosePerDay! }))
      setFromPhoto(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etikett konnte nicht gelesen werden.')
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (d: number) =>
    setPlan({ ...plan, weekdays: plan.weekdays.includes(d) ? plan.weekdays.filter((x) => x !== d) : [...plan.weekdays, d].sort() })
  const hasValue = FIELDS.some((k) => perPiece[k] !== undefined)
  const valid = name.trim() && plan.amount > 0 && plan.weekdays.length > 0 && hasValue

  async function save() {
    const saved = await saveFood({
      id: food?.id ?? crypto.randomUUID(),
      name: name.trim(),
      pieceName: pieceName.trim() || 'Stück',
      source: fromPhoto ? 'label' : (food?.source ?? 'custom'),
      unit: 'Stk',
      // Supplements ohne Kalorienangabe zählen mit 0 kcal.
      per100: { kcal: 0, ...perPiece },
      portions: [],
      lastUsed: Date.now(),
    })
    await saveSupplement({ ...plan, foodId: saved.id })
    await syncSupplementEntries(saved, plan.active ? plan.amount : null)
    onSaved()
  }

  return (
    <Sheet title="Supplement" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Claude liest das Etikett …' : 'Etikett fotografieren'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
        <p className="-mt-2 text-xs text-neutral-500">Am besten die Seite mit den Inhaltsstoffen und der Verzehrempfehlung. Mehrere Fotos gehen.</p>
        <ErrorText>{error}</ErrorText>
        {fromPhoto && !busy && <p className="text-sm text-amber-700 dark:text-amber-400">Vom Foto übernommen. Bitte kurz mit dem Etikett vergleichen.</p>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sup-name" className={label}>
            Name
          </label>
          <input id="sup-name" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Magnesiumbisglycinat" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sup-piece" className={label}>
              Einheit
            </label>
            <input id="sup-piece" className={input} value={pieceName} onChange={(e) => setPieceName(e.target.value)} placeholder="Kapsel, Tropfen …" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sup-amount" className={label}>
              Pro Tag
            </label>
            <NumberField id="sup-amount" value={plan.amount} onChange={(v) => setPlan({ ...plan, amount: v ?? 0 })} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={label}>Gehalt pro {pieceName || 'Einheit'}</span>
          {FIELDS.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <label htmlFor={`sup-${k}`} className="w-32 shrink-0 text-sm">
                {NUTRIENT_META[k].label}
              </label>
              <NumberField id={`sup-${k}`} value={perPiece[k]} onChange={(v) => setPerPiece((p) => ({ ...p, [k]: v }))} />
              <span className="w-10 shrink-0 text-sm text-neutral-500">{NUTRIENT_META[k].unit}</span>
            </div>
          ))}
          <p className="text-xs text-neutral-500">Vitamin D in IE? Durch 40 teilen (1.000 IE = 25 µg). Magnesium: den Gehalt an reinem Magnesium eintragen, nicht das Gewicht der Verbindung.</p>
        </div>

        {hasValue && plan.amount > 0 && (
          <p className="text-sm">
            Pro Tag: <span className="font-semibold">{summary(perPiece, plan.amount) || '–'}</span>
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={label}>Wochentage</span>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i + 1)}
                className={`rounded-lg border py-2 text-sm ${plan.weekdays.includes(i + 1) ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={plan.active} onChange={(e) => setPlan({ ...plan, active: e.target.checked })} />
          Aktiv (zum Pausieren abwählen)
        </label>

        <button type="button" className={btnPrimary} disabled={!valid} onClick={save}>
          Speichern
        </button>
        {food &&
          (confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={`${btnSecondary} flex-1 text-rose-600`}
                onClick={async () => {
                  await deleteSupplement(plan.id)
                  await syncSupplementEntries(food, null)
                  onSaved()
                }}
              >
                Endgültig entfernen
              </button>
              <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setConfirmDelete(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <button type="button" className="text-sm text-rose-600" onClick={() => setConfirmDelete(true)}>
              Supplement entfernen (bisherige Einträge bleiben)
            </button>
          ))}
      </div>
    </Sheet>
  )
}
