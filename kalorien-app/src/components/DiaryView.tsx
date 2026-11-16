import { useCallback, useEffect, useState } from 'react'
import type { ActivityEntry, Food, FoodEntry, Meal, Settings } from '../types'
import { MEALS } from '../types'
import { deleteActivity, deleteEntry, getActivities, getClosedDays, getDB, getEntries, materializeTemplates, saveActivity, saveEntry, saveFood, setDayClosed } from '../db'
import { addDays, relativeLabel, today } from '../lib/date'
import { KCAL_PER_KG, type Targets } from '../lib/calc'
import { MICRO_KEYS, NUTRIENT_META, fmt, fmtNum, sum, type NutrientKey } from '../lib/nutrients'
import { AddFoodSheet } from './AddFoodSheet'
import { AmountSheet } from './AmountSheet'
import { ActivitySheet } from './ActivitySheet'
import { FoodEditor } from './FoodEditor'
import { ProgressBar, btnLink, card, label } from './ui'

interface Props {
  settings: Settings
  targets: Targets
  weightKg: number
  refreshKey: number
}

type Sub =
  | { kind: 'none' }
  | { kind: 'add'; meal: Meal }
  | { kind: 'edit'; entry: FoodEntry; food: Food }
  | { kind: 'editFood'; entry: FoodEntry; food: Food }
  | { kind: 'activity'; existing?: ActivityEntry }

export function DiaryView({ settings, targets, weightKg, refreshKey }: Props) {
  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [sub, setSub] = useState<Sub>({ kind: 'none' })
  const [closed, setClosed] = useState(false)

  const reload = useCallback(async () => {
    setEntries(await getEntries(date))
    // Feste Aktivitäten auch für den angezeigten Tag eintragen (auch Zukunft).
    await materializeTemplates(weightKg, { from: date, to: date })
    setActivities(await getActivities(date))
    setClosed((await getClosedDays()).includes(date))
    // refreshKey: neu laden, wenn App-weit Daten geändert wurden (Import, Vorlagen).
  }, [date, refreshKey, weightKg])
  useEffect(() => {
    reload()
  }, [reload])

  const eaten = sum(entries.map((e) => e.nutrients))
  const burned = activities.reduce((s, a) => s + a.kcal, 0)
  const budget = targets.kcal + (settings.addExerciseToBudget ? burned : 0)
  const remaining = Math.round(budget - (eaten.kcal ?? 0))

  async function openEntry(entry: FoodEntry) {
    if (entry.kind !== 'food') return
    const food = await (await getDB()).get('foods', entry.refId)
    if (food) setSub({ kind: 'edit', entry, food })
  }

  // ---------- Unterseiten ----------
  const close = () => setSub({ kind: 'none' })
  const doneAndReload = async () => {
    close()
    await reload()
  }

  if (sub.kind === 'add') return <AddFoodSheet date={date} meal={sub.meal} settings={settings} onDone={doneAndReload} onClose={close} />
  if (sub.kind === 'edit')
    return (
      <AmountSheet
        food={sub.food}
        meal={sub.entry.meal}
        date={date}
        existing={sub.entry}
        onSave={async (entry, food) => {
          await saveFood(food)
          await saveEntry(entry)
          await doneAndReload()
        }}
        onEditFood={(food) => setSub({ kind: 'editFood', entry: sub.entry, food })}
        onDelete={async (entry) => {
          await deleteEntry(entry.id)
          await doneAndReload()
        }}
        onClose={close}
      />
    )
  if (sub.kind === 'editFood')
    return (
      <FoodEditor
        initial={sub.food}
        apiKey={settings.anthropicKey}
        onSave={async (food) => {
          const saved = await saveFood(food)
          setSub({ kind: 'edit', entry: sub.entry, food: saved })
        }}
        onClose={() => setSub({ kind: 'edit', entry: sub.entry, food: sub.food })}
      />
    )
  if (sub.kind === 'activity')
    return (
      <ActivitySheet
        date={date}
        weightKg={weightKg}
        existing={sub.existing}
        onSave={async (a) => {
          await saveActivity(a)
          await doneAndReload()
        }}
        onDelete={async (a) => {
          await deleteActivity(a.id)
          await doneAndReload()
        }}
        onClose={close}
      />
    )

  // ---------- Tagesansicht ----------
  const macroRows: { key: NutrientKey; target: number }[] = [
    { key: 'protein', target: targets.protein },
    { key: 'carbs', target: targets.carbs },
    { key: 'fat', target: targets.fat },
    { key: 'fiber', target: 30 },
  ]
  const missingCount = (k: NutrientKey) => entries.filter((e) => e.nutrients[k] === undefined).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Vorheriger Tag" className="px-3 py-2 text-xl text-neutral-500" onClick={() => setDate(addDays(date, -1))}>
          ‹
        </button>
        <button type="button" className="font-semibold" onClick={() => setDate(today())}>
          {relativeLabel(date)}
        </button>
        <button type="button" aria-label="Nächster Tag" className="px-3 py-2 text-xl text-neutral-500" onClick={() => setDate(addDays(date, 1))}>
          ›
        </button>
      </div>

      <section className={`${card} p-4`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={label}>{remaining >= 0 ? 'Noch übrig' : 'Drüber'}</p>
            <p className={`text-4xl font-semibold tabular-nums ${remaining < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              {fmtNum(Math.abs(remaining))}
              <span className="ml-1 text-base font-normal text-neutral-500">kcal</span>
            </p>
          </div>
          <dl className="text-right text-sm tabular-nums">
            <div className="flex justify-end gap-2">
              <dt className="text-neutral-500">Ziel</dt>
              <dd>{fmtNum(targets.kcal)}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-neutral-500">+ Training</dt>
              <dd>{settings.addExerciseToBudget ? fmtNum(burned) : `(${fmtNum(burned)})`}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-neutral-500">− Gegessen</dt>
              <dd>{fmt(eaten.kcal ?? 0, 'kcal')}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-3">
          <ProgressBar value={eaten.kcal ?? 0} max={budget} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {macroRows.map(({ key, target }) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{NUTRIENT_META[key].label}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-neutral-500">
                  {fmt(eaten[key] ?? 0, key)}/{fmtNum(target)} g
                </span>
              </div>
              <ProgressBar value={eaten[key] ?? 0} max={target} over={key === 'protein' || key === 'fiber' ? 'good' : 'bad'} />
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} p-4`}>
        <h3 className={`${label} mb-3`}>Mikronährstoffe</h3>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {MICRO_KEYS.map((k) => {
            const target = settings.microTargets[k as keyof Settings['microTargets']]
            const missing = missingCount(k)
            return (
              <div key={k} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{NUTRIENT_META[k].label}</span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-neutral-500">
                    {fmt(eaten[k] ?? 0, k)}/{fmtNum(target, 1)} {NUTRIENT_META[k].unit}
                  </span>
                </div>
                <ProgressBar value={eaten[k] ?? 0} max={target} over="good" />
                {missing > 0 && <span className="text-[11px] text-amber-700 dark:text-amber-400">{missing === 1 ? '1 Eintrag' : `${missing} Einträge`} ohne Angabe</span>}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span>Salz</span>
          <span className="tabular-nums text-neutral-500">{fmt(eaten.salt ?? 0, 'salt')} g (max. 6 g)</span>
        </div>
      </section>

      {MEALS.map((m) => {
        const list = entries.filter((e) => e.meal === m.id)
        const kcal = sum(list.map((e) => e.nutrients)).kcal ?? 0
        return (
          <section key={m.id} className={card}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="font-semibold">{m.label}</h3>
              <span className="text-sm tabular-nums text-neutral-500">{fmtNum(kcal)} kcal</span>
            </div>
            {list.length > 0 && (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 pl-4">
                    <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left" onClick={() => openEntry(e)}>
                      <span className="min-w-0">
                        <span className="block truncate">{e.name}</span>
                        <span className="block text-xs text-neutral-500">
                          {fmtNum(e.amount, 1)} {e.unit === 'Portion' ? (e.amount === 1 ? 'Portion' : 'Portionen') : e.unit === 'Stk' ? 'Stück' : e.unit}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm">{fmt(e.nutrients.kcal, 'kcal')}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${e.name} löschen`}
                      className="px-3 py-2.5 text-neutral-400"
                      onClick={async () => {
                        await deleteEntry(e.id)
                        await reload()
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className={`${btnLink} block w-full border-t border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-left text-sm`} onClick={() => setSub({ kind: 'add', meal: m.id })}>
              + Hinzufügen
            </button>
          </section>
        )
      })}

      <section className={card}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="font-semibold">Training</h3>
          <span className="text-sm tabular-nums text-neutral-500">{fmtNum(burned)} kcal</span>
        </div>
        {activities.length > 0 && (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center gap-2 pl-4">
                <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left" onClick={() => setSub({ kind: 'activity', existing: a })}>
                  <span className="min-w-0">
                    <span className="block truncate">{a.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {a.templateId ? 'automatisch' : 'manuell'}
                      {a.distanceKm ? ` · ${fmtNum(a.distanceKm, 1)} km` : ''}
                      {a.minutes ? ` · ${a.minutes} min` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-sm">{fmtNum(a.kcal)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`${a.name} löschen`}
                  className="px-3 py-2.5 text-neutral-400"
                  onClick={async () => {
                    await deleteActivity(a.id)
                    await reload()
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={`${btnLink} block w-full border-t border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-left text-sm`} onClick={() => setSub({ kind: 'activity' })}>
          + Training eintragen
        </button>
      </section>

      <DayClose
        closed={closed}
        hasEntries={entries.length > 0}
        eatenKcal={eaten.kcal ?? 0}
        burnedKcal={burned}
        tdee={targets.tdee}
        weightKg={weightKg}
        onToggle={async (v) => {
          await setDayClosed(date, v)
          setClosed(v)
        }}
      />
    </div>
  )
}

/**
 * „Tag abschließen": Wie viel würdest du in 4, 6 und 12 Wochen wiegen,
 * wenn jeder Tag so wäre wie dieser? Bilanz = Gesamtumsatz ohne Sport
 * + Training − Gegessen; 1 kg ≈ 7.700 kcal.
 */
function DayClose({
  closed,
  hasEntries,
  eatenKcal,
  burnedKcal,
  tdee,
  weightKg,
  onToggle,
}: {
  closed: boolean
  hasEntries: boolean
  eatenKcal: number
  burnedKcal: number
  tdee: number
  weightKg: number
  onToggle: (closed: boolean) => void
}) {
  if (!closed) {
    return (
      <button
        type="button"
        className="rounded-xl bg-emerald-700 dark:bg-emerald-500 px-4 py-3.5 font-semibold text-white dark:text-neutral-950 disabled:opacity-40"
        disabled={!hasEntries}
        onClick={() => onToggle(true)}
      >
        Tag abschließen
      </button>
    )
  }

  const deficit = tdee + burnedKcal - eatenKcal // > 0: Defizit
  const perDayKg = deficit / KCAL_PER_KG
  const rows = [4, 6, 12].map((w) => ({ weeks: w, weight: weightKg - perDayKg * w * 7, change: -perDayKg * w * 7 }))
  const losing = deficit > 0

  return (
    <section className={`${card} p-4`}>
      <h3 className="font-semibold">Wenn jeder Tag so wäre wie heute …</h3>
      <p className="mt-1 text-sm text-neutral-500">
        {losing ? 'Defizit' : 'Überschuss'} heute: {fmtNum(Math.abs(deficit))} kcal ({fmtNum(tdee)} Umsatz + {fmtNum(burnedKcal)} Training −{' '}
        {fmtNum(eatenKcal)} gegessen)
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {rows.map((r) => (
          <div key={r.weeks} className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-3">
            <dt className="text-xs text-neutral-500">in {r.weeks} Wochen</dt>
            <dd className="text-xl font-semibold tabular-nums">{fmtNum(r.weight, 1)} kg</dd>
            <dd className={`text-sm tabular-nums ${losing ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {r.change > 0 ? '+' : '−'}
              {fmtNum(Math.abs(r.change), 1)} kg
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-neutral-500">
        Ausgehend von {fmtNum(weightKg, 1)} kg (letzte Messung). Rechnerische Schätzung; Wasser und Verdauung lassen die Waage schwanken.
      </p>
      <button type="button" className={`${btnLink} mt-2 text-sm`} onClick={() => onToggle(false)}>
        Tag wieder öffnen
      </button>
    </section>
  )
}
