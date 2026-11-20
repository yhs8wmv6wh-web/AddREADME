import { useEffect, useState } from 'react'
import type { ActivityEntry, ActivityPreset } from '../types'
import { deleteActivityPreset, getActivityPresets, saveActivityPreset } from '../db'
import { cyclingKcal } from '../lib/calc'
import { CyclingFields } from './CyclingFields'
import { fmtNum } from '../lib/nutrients'
import { NumberField, Sheet, btnLink, btnPrimary, card, input, label } from './ui'

interface Props {
  date: string
  weightKg: number
  existing?: ActivityEntry
  onSave: (a: ActivityEntry) => void
  onDelete?: (a: ActivityEntry) => void
  onClose: () => void
}

type Mode = 'kcal' | 'cycling'

export function ActivitySheet({ date, weightKg, existing, onSave, onDelete, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('kcal')
  const [name, setName] = useState(existing?.name ?? '')
  const [kcal, setKcal] = useState<number | undefined>(existing?.kcal)
  const [minutes, setMinutes] = useState<number | undefined>(existing?.minutes)
  const [km, setKm] = useState<number | undefined>(existing?.distanceKm)

  const [presets, setPresets] = useState<ActivityPreset[]>([])
  const [remember, setRemember] = useState(true)
  const [editPresets, setEditPresets] = useState(false)

  useEffect(() => {
    if (!existing) getActivityPresets().then(setPresets)
  }, [existing])

  const presetKcal = (p: ActivityPreset) =>
    p.kind === 'cycling' ? cyclingKcal(p.distanceKm ?? 0, p.minutes ?? 0, weightKg) : Math.round(p.kcal ?? 0)

  function addPreset(p: ActivityPreset) {
    onSave({
      id: crypto.randomUUID(),
      date,
      name: p.name,
      kcal: presetKcal(p),
      minutes: p.minutes,
      distanceKm: p.distanceKm,
      createdAt: Date.now(),
    })
  }

  const computed = mode === 'cycling' ? cyclingKcal(km ?? 0, minutes ?? 0, weightKg) : Math.round(kcal ?? 0)
  const finalName = name.trim() || (mode === 'cycling' ? 'Fahrrad' : '')

  return (
    <Sheet title={existing ? 'Training ändern' : 'Training eintragen'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {!existing && presets.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className={label}>Meine Trainings – antippen zum Eintragen</h3>
              <button type="button" className={`${btnLink} text-sm`} onClick={() => setEditPresets(!editPresets)}>
                {editPresets ? 'Fertig' : 'Bearbeiten'}
              </button>
            </div>
            <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
              {presets.map((p) => (
                <li key={p.id} className="flex items-center">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-3 text-left disabled:opacity-100"
                    disabled={editPresets}
                    onClick={() => addPreset(p)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      {p.kind === 'cycling' && (
                        <span className="block text-xs text-neutral-500">
                          {fmtNum(p.distanceKm ?? 0, 1)} km · {fmtNum(p.minutes ?? 0)} min
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">{fmtNum(presetKcal(p))} kcal</span>
                  </button>
                  {editPresets && (
                    <button
                      type="button"
                      aria-label={`${p.name} entfernen`}
                      className="px-4 py-3 text-rose-600"
                      onClick={async () => {
                        await deleteActivityPreset(p.id)
                        setPresets(await getActivityPresets())
                      }}
                    >
                      Entfernen
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="pt-2 text-sm text-neutral-500">Oder neues Training:</p>
          </section>
        )}

        {!existing && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['kcal', 'kcal bekannt (z. B. eGym)'],
                ['cycling', 'Fahrrad berechnen'],
              ] as [Mode, string][]
            ).map(([m, l]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-2 text-sm ${mode === m ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="act-name" className={label}>
            Bezeichnung
          </label>
          <input
            id="act-name"
            className={input}
            placeholder={mode === 'cycling' ? 'Fahrrad' : 'z. B. eGym'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {mode === 'kcal' && !existing && (
            <div className="flex flex-wrap gap-2">
              {['eGym', 'Laufen', 'Schwimmen', 'Spaziergang'].map((n) => (
                <button key={n} type="button" className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm" onClick={() => setName(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'kcal' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="act-kcal" className={label}>
              Verbrannte kcal
            </label>
            <NumberField id="act-kcal" value={kcal} onChange={setKcal} />
          </div>
        ) : (
          <CyclingFields km={km} minutes={minutes} weightKg={weightKg} onKm={setKm} onMinutes={setMinutes} />
        )}

        <p className="text-3xl font-semibold tabular-nums">
          {fmtNum(computed)} <span className="text-base font-normal text-neutral-500">kcal</span>
        </p>

        {!existing && (
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Unter „Meine Trainings" merken
          </label>
        )}

        <button
          type="button"
          className={btnPrimary}
          disabled={!finalName || computed <= 0}
          onClick={async () => {
            if (!existing && remember) {
              // Gleichnamiges gemerktes Training wird aktualisiert statt gedoppelt.
              const same = presets.find((p) => p.name.toLocaleLowerCase('de') === finalName.toLocaleLowerCase('de'))
              await saveActivityPreset({
                id: same?.id ?? crypto.randomUUID(),
                name: finalName,
                kind: mode,
                kcal: mode === 'kcal' ? computed : undefined,
                distanceKm: mode === 'cycling' ? km : undefined,
                minutes: mode === 'cycling' ? minutes : undefined,
              })
            }
            onSave({
              id: existing?.id ?? crypto.randomUUID(),
              date,
              name: finalName,
              kcal: computed,
              minutes: mode === 'cycling' ? minutes : existing?.minutes,
              distanceKm: mode === 'cycling' ? km : existing?.distanceKm,
              templateId: existing?.templateId,
              slot: existing?.slot,
              createdAt: existing?.createdAt ?? Date.now(),
            })
          }}
        >
          Speichern
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
