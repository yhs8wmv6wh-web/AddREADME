import { useMemo, useState } from 'react'
import type { Book } from '../types'
import { LANGUAGE_LABEL } from '../types'
import {
  booksInYear,
  genreBreakdown,
  getAvailableYears,
  languageBreakdown,
  monthlyBreakdown,
  totals,
  yearlyBreakdown,
} from '../lib/stats'
import { StatTile } from './StatTile'
import { HorizontalBarChart } from './HorizontalBarChart'

const LANGUAGE_COLOR: Record<string, { color: string; darkColor: string }> = {
  de: { color: '#2a78d6', darkColor: '#3987e5' },
  en: { color: '#eb6834', darkColor: '#d95926' },
  other: { color: '#1baf7a', darkColor: '#199e70' },
}

const SEQUENTIAL = { color: '#2a78d6', darkColor: '#3987e5' }

type Metric = 'count' | 'pages'

interface StatisticsProps {
  books: Book[]
}

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

  const timeBuckets = useMemo(
    () => (selectedYear === 'all' ? yearlyBreakdown(books) : monthlyBreakdown(books, selectedYear)),
    [books, selectedYear],
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedYear('all')}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
            selectedYear === 'all'
              ? 'bg-purple-600 border-purple-600 text-white'
              : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Alle Jahre
        </button>
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
              selectedYear === year
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile value={scopeTotals.count} label={selectedYear === 'all' ? 'Bücher insgesamt' : `Bücher ${selectedYear}`} />
        <StatTile
          value={scopeTotals.pages.toLocaleString('de-DE')}
          label={selectedYear === 'all' ? 'Seiten insgesamt' : `Seiten ${selectedYear}`}
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Sprache</h2>
        <HorizontalBarChart
          items={langBreakdown.map((item) => ({
            key: item.language,
            label: LANGUAGE_LABEL[item.language],
            value: item.count,
            ...LANGUAGE_COLOR[item.language],
          }))}
          emptyMessage="Noch keine gelesenen Bücher in diesem Zeitraum."
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {selectedYear === 'all' ? 'Pro Jahr' : 'Pro Monat'}
          </h2>
          <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden text-xs">
            <button
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1 font-medium ${metric === 'count' ? 'bg-purple-600 text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
            >
              Bücher
            </button>
            <button
              onClick={() => setMetric('pages')}
              className={`px-2.5 py-1 font-medium ${metric === 'pages' ? 'bg-purple-600 text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
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
            ...SEQUENTIAL,
          }))}
        />
      </section>

      {genres.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Top Genres</h2>
          <ul className="flex flex-col gap-1">
            {genres.map((item) => (
              <li key={item.genre} className="flex items-center justify-between text-sm py-1 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                <span className="text-neutral-700 dark:text-neutral-300">{item.genre}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
