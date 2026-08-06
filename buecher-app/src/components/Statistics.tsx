import { useMemo, useState } from 'react'
import type { Book } from '../types'
import { LANGUAGE_LABEL } from '../types'
import {
  bestMonthByPages,
  booksInYear,
  fastestBook,
  genreBreakdown,
  getAvailableYears,
  languageBreakdown,
  monthlyBreakdown,
  totals,
  yearlyBreakdown,
} from '../lib/stats'
import { StatTile } from './StatTile'
import { HorizontalBarChart } from './HorizontalBarChart'

const LANGUAGE_WEIGHT: Record<string, number> = {
  de: 1,
  en: 0.6,
  other: 0.35,
}

type Metric = 'count' | 'pages'

interface StatisticsProps {
  books: Book[]
}

const chipClass = (active: boolean) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
    active
      ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-900'
      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
  }`

export function Statistics({ books }: StatisticsProps) {
  const years = useMemo(() => getAvailableYears(books), [books])
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(years[0] ?? new Date().getFullYear())
  const [metric, setMetric] = useState<Metric>('count')

  const scopeBooks = useMemo(
    () => booksInYear(books, selectedYear === 'all' ? null : selectedYear),
    [books, selectedYear],
  )

  const scopeTotals = useMemo(() => totals(scopeBooks), [scopeBooks])
  const langBreakdown = useMemo(() => languageBreakdown(scopeBooks), [scopeBooks])
  const genres = useMemo(() => genreBreakdown(scopeBooks).slice(0, 8), [scopeBooks])
  const fastest = useMemo(() => fastestBook(scopeBooks), [scopeBooks])
  const bestMonth = useMemo(() => bestMonthByPages(scopeBooks), [scopeBooks])

  const timeBuckets = useMemo(
    () => (selectedYear === 'all' ? yearlyBreakdown(books) : monthlyBreakdown(books, selectedYear)),
    [books, selectedYear],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedYear('all')} className={chipClass(selectedYear === 'all')}>
          Alle Jahre
        </button>
        {years.map((year) => (
          <button key={year} onClick={() => setSelectedYear(year)} className={chipClass(selectedYear === year)}>
            {year}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <StatTile value={scopeTotals.count} label={selectedYear === 'all' ? 'Bücher insgesamt' : `Bücher ${selectedYear}`} />
        <StatTile
          value={scopeTotals.pages.toLocaleString('de-DE')}
          label={selectedYear === 'all' ? 'Seiten insgesamt' : `Seiten ${selectedYear}`}
        />
      </div>

      <section>
        <h2 className="font-serif text-base mb-2 text-neutral-900 dark:text-neutral-100">Sprache</h2>
        <HorizontalBarChart
          items={langBreakdown.map((item) => ({
            key: item.language,
            label: LANGUAGE_LABEL[item.language],
            value: item.count,
            weight: LANGUAGE_WEIGHT[item.language],
          }))}
          emptyMessage="Noch keine gelesenen Bücher in diesem Zeitraum."
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-base text-neutral-900 dark:text-neutral-100">
            {selectedYear === 'all' ? 'Pro Jahr' : 'Pro Monat'}
          </h2>
          <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden text-xs">
            <button
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1 font-medium ${
                metric === 'count' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Bücher
            </button>
            <button
              onClick={() => setMetric('pages')}
              className={`px-2.5 py-1 font-medium ${
                metric === 'pages' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Seiten
            </button>
          </div>
        </div>
        <HorizontalBarChart
          items={timeBuckets.map((bucket) => ({
            key: bucket.key,
            label: bucket.label,
            value: metric === 'count' ? bucket.count : bucket.pages,
          }))}
        />
      </section>

      {genres.length > 0 && (
        <section>
          <h2 className="font-serif text-base mb-2 text-neutral-900 dark:text-neutral-100">Top Genres</h2>
          <ul className="flex flex-col gap-1">
            {genres.map((item) => (
              <li key={item.genre} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                <span className="text-neutral-700 dark:text-neutral-300">{item.genre}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(fastest || bestMonth) && (
        <section>
          <h2 className="font-serif text-base mb-2 text-neutral-900 dark:text-neutral-100">Rekorde</h2>
          <ul className="flex flex-col gap-1">
            {fastest && (
              <li className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                <span className="text-neutral-700 dark:text-neutral-300 min-w-0">
                  Schnellstes Buch <span className="block truncate text-neutral-900 dark:text-neutral-100 font-medium">{fastest.book.title}</span>
                </span>
                <span className="font-medium tabular-nums shrink-0">
                  {fastest.days < 1 ? '< 1 Tag' : `${fastest.days} ${fastest.days === 1 ? 'Tag' : 'Tage'}`}
                </span>
              </li>
            )}
            {bestMonth && (
              <li className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                <span className="text-neutral-700 dark:text-neutral-300">Seitenstärkster Monat</span>
                <span className="font-medium tabular-nums shrink-0">
                  {bestMonth.label} · {bestMonth.pages.toLocaleString('de-DE')} S.
                </span>
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
