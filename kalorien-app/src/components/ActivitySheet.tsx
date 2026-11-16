import { useState } from 'react'
import type { ActivityEntry } from '../types'
import { CYCLING_PRESETS, metKcal } from '../lib/calc'
import { fmtNum } from '../lib/nutrients'
import { NumberField, Sheet, btnPrimary, input, label } from './ui'

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
  const [minutes, setMinutes] = useState<number | undefined>(existing?.minutes ?? 30)
  const [met, setMet] = useState(6.8)

  const computed = mode === 'cycling' ? metKcal(met, weightKg, minutes ?? 0) : Math.round(kcal ?? 0)
  const finalName = name.trim() || (mode === 'cycling' ? 'Fahrrad' : '')

  return (
    <Sheet title={existing ? 'Training ändern' : 'Training eintragen'} onClose={onClose}>
      <div className="flex flex-col gap-4">
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
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="act-min" className={label}>
                Dauer in Minuten
              </label>
              <NumberField id="act-min" value={minutes} onChange={setMinutes} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Tempo</span>
              {CYCLING_PRESETS.map((p) => (
                <button
                  key={p.met}
                  type="button"
                  onClick={() => setMet(p.met)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${met === p.met ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Berechnet mit deinem aktuellen Gewicht ({fmtNum(weightKg, 1)} kg), ohne den Ruheumsatz, der ohnehin im Tagesziel steckt.
            </p>
          </>
        )}

        <p className="text-3xl font-semibold tabular-nums">
          {fmtNum(computed)} <span className="text-base font-normal text-neutral-500">kcal</span>
        </p>

        <button
          type="button"
          className={btnPrimary}
          disabled={!finalName || computed <= 0}
          onClick={() =>
            onSave({
              id: existing?.id ?? crypto.randomUUID(),
              date,
              name: finalName,
              kcal: computed,
              minutes: mode === 'cycling' ? minutes : existing?.minutes,
              templateId: existing?.templateId,
              slot: existing?.slot,
              createdAt: existing?.createdAt ?? Date.now(),
            })
          }
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
