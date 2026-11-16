import { cyclingKcal, cyclingMet, speedKmh } from '../lib/calc'
import { fmtNum } from '../lib/nutrients'
import { NumberField, label } from './ui'

interface Props {
  km: number | undefined
  minutes: number | undefined
  weightKg: number
  onKm: (v: number | undefined) => void
  onMinutes: (v: number | undefined) => void
  perLabel?: string
}

/** Strecke + Dauer eingeben; Tempo, MET und kcal werden daraus berechnet. */
export function CyclingFields({ km, minutes, weightKg, onKm, onMinutes, perLabel = 'pro Fahrt' }: Props) {
  const v = km && minutes ? speedKmh(km, minutes) : 0
  const m = cyclingMet(v)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cyc-km" className={label}>
            Strecke (km)
          </label>
          <NumberField id="cyc-km" value={km} onChange={onKm} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cyc-min" className={label}>
            Zeit (min)
          </label>
          <NumberField id="cyc-min" value={minutes} onChange={onMinutes} />
        </div>
      </div>
      {v > 0 ? (
        <p className="text-sm text-neutral-500">
          Tempo {fmtNum(v, 1)} km/h ({m.label}) · MET {fmtNum(m.met, 1)} · {fmtNum(cyclingKcal(km!, minutes!, weightKg))} kcal {perLabel}
        </p>
      ) : (
        <p className="text-sm text-neutral-500">Strecke und Zeit {perLabel} eingeben.</p>
      )}
      <p className="text-xs text-neutral-500">
        Berechnet mit deinem aktuellen Gewicht ({fmtNum(weightKg, 1)} kg), ohne den Ruheumsatz, der schon im Tagesziel steckt.
        MET-Werte: Compendium of Physical Activities. Für ein E-Bike ist der Wert zu hoch.
      </p>
    </div>
  )
}
