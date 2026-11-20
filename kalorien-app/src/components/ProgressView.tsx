import { useEffect, useState } from 'react'
import type { BodyLog, Settings } from '../types'
import { saveBodyLog } from '../db'
import { addDays, formatShort, fromISO, today } from '../lib/date'
import type { Targets } from '../lib/calc'
import { fmtNum } from '../lib/nutrients'
import { NumberField, btnPrimary, card, input, label } from './ui'
import { WeekSummary } from './WeekSummary'

interface Props {
  settings: Settings
  logs: BodyLog[]
  targets: Targets
  weightKg: number
  onChanged: () => void
}

export function ProgressView({ settings, logs, targets, weightKg, onChanged }: Props) {
  const [date, setDate] = useState(today())
  const existing = logs.find((l) => l.date === date)
  const [weight, setWeight] = useState<number | undefined>(existing?.weightKg)
  const [fat, setFat] = useState<number | undefined>(existing?.bodyFatPct)

  useEffect(() => {
    const e = logs.find((l) => l.date === date)
    setWeight(e?.weightKg)
    setFat(e?.bodyFatPct)
  }, [date, logs])


  async function save() {
    await saveBodyLog({ date, weightKg: weight, bodyFatPct: fat })
    onChanged()
  }

  const weights = logs.filter((l) => l.weightKg !== undefined).map((l) => ({ date: l.date, v: l.weightKg! }))
  const fats = logs.filter((l) => l.bodyFatPct !== undefined).map((l) => ({ date: l.date, v: l.bodyFatPct! }))
  const lost = settings.startWeightKg - weightKg
  const toGo = weightKg - settings.goalWeightKg
  const weeksLeft = settings.pacePerWeekKg > 0 ? toGo / settings.pacePerWeekKg : null
  const goalDate = weeksLeft !== null && toGo > 0 ? fromISO(addDays(today(), Math.round(weeksLeft * 7))) : null

  return (
    <div className="flex flex-col gap-4">
      <section className={`${card} grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800 py-3 text-center`}>
        <Stat title="Aktuell" value={`${fmtNum(weightKg, 1)} kg`} />
        <Stat title={lost >= 0 ? 'Abgenommen' : 'Zugenommen'} value={`${fmtNum(Math.abs(lost), 1)} kg`} />
        <Stat title="Bis zum Ziel" value={toGo > 0 ? `${fmtNum(toGo, 1)} kg` : 'erreicht'} />
      </section>
      {goalDate && (
        <p className="text-sm text-neutral-500">
          Bei {fmtNum(settings.pacePerWeekKg, 2)} kg pro Woche erreichst du {fmtNum(settings.goalWeightKg, 1)} kg etwa im{' '}
          {goalDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}.
        </p>
      )}

      <WeekSummary tdee={targets.tdee} weightKg={weightKg} />

      <section className={`${card} flex flex-col gap-3 p-4`}>
        <h3 className={label}>Messung eintragen</h3>
        <input type="date" className={input} value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="bw" className="text-sm">
              Gewicht (kg)
            </label>
            <NumberField id="bw" value={weight} onChange={setWeight} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bf" className="text-sm">
              Körperfett (%)
            </label>
            <NumberField id="bf" value={fat} onChange={setFat} />
          </div>
        </div>
        <button type="button" className={btnPrimary} onClick={save}>
          {existing ? 'Messung aktualisieren' : 'Messung speichern'}
        </button>
      </section>

      <Chart title="Gewicht" unit="kg" points={weights} goal={settings.goalWeightKg} />
      <Chart title="Körperfett" unit="%" points={fats} />


      {logs.length > 0 && (
        <section className={card}>
          <h3 className={`${label} px-4 pt-3 pb-2`}>Alle Messungen</h3>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
            {[...logs].reverse().map((l) => (
              <li key={l.date}>
                <button type="button" className="flex w-full justify-between px-4 py-2 text-sm tabular-nums" onClick={() => setDate(l.date)}>
                  <span>{fromISO(l.date).toLocaleDateString('de-DE')}</span>
                  <span className="text-neutral-500">
                    {l.weightKg !== undefined ? `${fmtNum(l.weightKg, 1)} kg` : ''}
                    {l.weightKg !== undefined && l.bodyFatPct !== undefined ? ' · ' : ''}
                    {l.bodyFatPct !== undefined ? `${fmtNum(l.bodyFatPct, 1)} %` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="px-4 py-2 text-xs text-neutral-500">Zum Ändern oder Löschen antippen, Felder leeren und speichern.</p>
        </section>
      )}
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="px-2">
      <p className="text-xs text-neutral-500">{title}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/** Einfache Linie über die Zeit; x-Achse nach echtem Datum skaliert. */
function Chart({ title, unit, points, goal }: { title: string; unit: string; points: { date: string; v: number }[]; goal?: number }) {
  if (points.length < 2) {
    return (
      <section className={`${card} p-4`}>
        <h3 className={label}>{title}</h3>
        <p className="mt-2 text-sm text-neutral-500">Ab zwei Messungen erscheint hier der Verlauf.</p>
      </section>
    )
  }
  const W = 320
  const H = 150
  const pad = { l: 36, r: 10, t: 10, b: 22 }
  const t0 = fromISO(points[0].date).getTime()
  const t1 = fromISO(points[points.length - 1].date).getTime()
  const vals = points.map((p) => p.v).concat(goal !== undefined ? [goal] : [])
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < 1) {
    lo -= 0.5
    hi += 0.5
  }
  const x = (d: string) => pad.l + ((fromISO(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const ticks = [lo, (lo + hi) / 2, hi]

  return (
    <section className={`${card} p-4`}>
      <div className="flex items-baseline justify-between">
        <h3 className={label}>{title}</h3>
        <span className="text-sm tabular-nums">
          {fmtNum(last.v, 1)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full text-neutral-400" role="img" aria-label={`Verlauf ${title}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="currentColor">
              {fmtNum(t, 1)}
            </text>
          </g>
        ))}
        {goal !== undefined && (
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#059669" strokeDasharray="4 4" strokeWidth="1.5" />
        )}
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.date)} cy={y(last.v)} r="4" fill="#059669" />
        <text x={pad.l} y={H - 4} fontSize="10" fill="currentColor">
          {formatShort(points[0].date)}
        </text>
        <text x={W - pad.r} y={H - 4} fontSize="10" textAnchor="end" fill="currentColor">
          {formatShort(last.date)}
        </text>
      </svg>
      {goal !== undefined && <p className="text-xs text-neutral-500">Gestrichelt: Zielgewicht</p>}
    </section>
  )
}
