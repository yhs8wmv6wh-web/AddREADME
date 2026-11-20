import { useEffect, useState } from 'react'
import { getActivitiesRange, getClosedDays, getEntriesRange } from '../db'
import { addDays, formatShort, today, weekday, WEEKDAY_SHORT } from '../lib/date'
import { KCAL_PER_KG } from '../lib/calc'
import { fmtNum } from '../lib/nutrients'
import { btnLink, card, label } from './ui'

interface Props {
  tdee: number // Gesamtumsatz ohne Sport
  weightKg: number
}

interface Day {
  date: string
  tracked: boolean
  eaten: number
  burned: number
  balance: number // > 0 = Defizit
}


/**
 * Bilanz der letzten 7 Tage: Ø Defizit der eingetragenen Tage und was
 * daraus in 4, 6 und 12 Wochen würde. Tage ohne Essen zählen nicht
 * (vergessen ≠ gefastet); Supplements allein machen keinen Tag „eingetragen".
 */
export function WeekSummary({ tdee, weightKg }: Props) {
  // Ende des Zeitraums: heute, wenn der Tag abgeschlossen ist, sonst gestern
  // (ein halber Tag würde das Defizit schönrechnen). offset: Wochen zurück.
  const [lastDay, setLastDay] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [days, setDays] = useState<Day[]>([])

  useEffect(() => {
    getClosedDays().then((closed) => setLastDay(closed.includes(today()) ? today() : addDays(today(), -1)))
  }, [])

  const end = lastDay ? addDays(lastDay, -7 * offset) : null
  const start = end ? addDays(end, -6) : null

  useEffect(() => {
    if (!start || !end) return
    Promise.all([getEntriesRange(start, end), getActivitiesRange(start, end)]).then(([entries, acts]) => {
      const list: Day[] = []
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i)
        const food = entries.filter((e) => e.date === d && e.meal !== 'supplements')
        const eaten = entries.filter((e) => e.date === d).reduce((n, e) => n + (e.nutrients.kcal ?? 0), 0)
        const burned = acts.filter((a) => a.date === d).reduce((n, a) => n + a.kcal, 0)
        const tracked = food.length > 0 && d <= today()
        list.push({ date: d, tracked, eaten, burned, balance: tdee + burned - eaten })
      }
      setDays(list)
    })
  }, [start, end, tdee])

  const tracked = days.filter((d) => d.tracked)
  const avg = tracked.length ? tracked.reduce((n, d) => n + d.balance, 0) / tracked.length : 0
  const perWeekKg = (avg * 7) / KCAL_PER_KG
  const losing = avg > 0
  const isCurrent = offset === 0
  const maxAbs = Math.max(1, ...tracked.map((d) => Math.abs(d.balance)))

  return (
    <section className={`${card} flex flex-col gap-3 p-4`}>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Sieben Tage zurück" className="px-2 text-xl text-neutral-500" onClick={() => setOffset(offset + 1)}>
          ‹
        </button>
        <h3 className="text-center font-semibold">
          {isCurrent ? 'Letzte 7 Tage' : '7 Tage'}
          {start && end && (
            <span className="block text-xs font-normal text-neutral-500">
              {formatShort(start)}–{formatShort(end)}
            </span>
          )}
        </h3>
        <button
          type="button"
          aria-label="Sieben Tage vor"
          className="px-2 text-xl text-neutral-500 disabled:opacity-30"
          disabled={isCurrent}
          onClick={() => setOffset(offset - 1)}
        >
          ›
        </button>
      </div>

      {/* Mini-Übersicht Mo–So: Balken nach oben = Defizit, nach unten = Überschuss */}
      <div className="grid grid-cols-7 gap-1" role="img" aria-label="Tagesbilanz der Woche">
        {days.map((d) => {
          const h = d.tracked ? Math.max(4, (Math.abs(d.balance) / maxAbs) * 36) : 0
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-full items-end justify-center">
                {d.balance > 0 && d.tracked && <div className="w-4 rounded-t bg-emerald-600 dark:bg-emerald-500" style={{ height: h }} />}
              </div>
              <div className="h-px w-full bg-neutral-300 dark:bg-neutral-700" />
              <div className="flex h-10 w-full items-start justify-center">
                {d.balance <= 0 && d.tracked && <div className="w-4 rounded-b bg-rose-500" style={{ height: h }} />}
              </div>
              <span className={`text-xs ${d.tracked ? '' : 'text-neutral-400'}`}>{WEEKDAY_SHORT[weekday(d.date) - 1]}</span>
              <span className={`text-[10px] tabular-nums ${d.tracked ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {d.tracked ? `${d.balance > 0 ? '−' : '+'}${fmtNum(Math.abs(d.balance))}` : '–'}
              </span>
            </div>
          )
        })}
      </div>

      <p className="-mt-1 text-center text-[11px] text-neutral-500">
        <span className="text-emerald-700 dark:text-emerald-400">grün</span> = Defizit ·{' '}
        <span className="text-rose-600 dark:text-rose-400">rot</span> = Überschuss · – = nichts eingetragen
      </p>

      {tracked.length === 0 ? (
        <p className="text-sm text-neutral-500">In diesen 7 Tagen ist kein Essen eingetragen.</p>
      ) : (
        <>
          <p className="text-sm">
            Ø {losing ? 'Defizit' : 'Überschuss'}: <span className="font-semibold tabular-nums">{fmtNum(Math.abs(avg))} kcal pro Tag</span>{' '}
            <span className="text-neutral-500">
              ({tracked.length} von 7 Tagen eingetragen) ≙ {losing ? '−' : '+'}
              {fmtNum(Math.abs(perWeekKg), 2)} kg pro Woche
            </span>
          </p>
          <h4 className={label}>Wenn jede Woche so läuft wie diese 7 Tage …</h4>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[4, 6, 12].map((w) => {
              const change = -perWeekKg * w
              return (
                <div key={w} className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-3">
                  <dt className="text-xs text-neutral-500">in {w} Wochen</dt>
                  <dd className="text-xl font-semibold tabular-nums">{fmtNum(weightKg + change, 1)} kg</dd>
                  <dd className={`text-sm tabular-nums ${losing ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {change > 0 ? '+' : '−'}
                    {fmtNum(Math.abs(change), 1)} kg
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="text-xs text-neutral-500">
            Ausgehend von {fmtNum(weightKg, 1)} kg (letzte Messung) und {fmtNum(tdee)} kcal Gesamtumsatz ohne Sport. Tage ohne
            eingetragenes Essen zählen nicht mit.
            {isCurrent && end !== today() ? ' Heute zählt mit, sobald du den Tag im Tagebuch abschließt.' : ''} Rechnerische Schätzung.
          </p>
        </>
      )}
      {!isCurrent && (
        <button type="button" className={`${btnLink} text-sm`} onClick={() => setOffset(0)}>
          Zu den letzten 7 Tagen
        </button>
      )}
    </section>
  )
}
