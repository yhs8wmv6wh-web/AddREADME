import { useMemo, useState } from 'react'
import type { Book, BookStatus } from '../types'
import { BookCard } from './BookCard'
import { StatTile } from './StatTile'

interface BookshelfProps {
  books: Book[]
  onSelect: (book: Book) => void
}

const FILTERS: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'finished', label: 'Gelesen' },
  { value: 'reading', label: 'Am Lesen' },
  { value: 'wishlist', label: 'Wunschliste' },
]

export function Bookshelf({ books, onSelect }: BookshelfProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BookStatus | 'all'>('all')

  const stats = useMemo(() => {
    const finished = books.filter((book) => book.status === 'finished')
    const totalPages = finished.reduce((sum, book) => sum + (book.pages ?? 0), 0)
    return { finishedCount: finished.length, totalPages }
  }, [books])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((book) => {
      const matchesFilter = filter === 'all' || book.status === filter
      const matchesQuery =
        !q || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q) || book.genre.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [books, query, filter])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile value={stats.finishedCount} label="Bücher gelesen" />
        <StatTile value={stats.totalPages.toLocaleString('de-DE')} label="Seiten gelesen" />
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Suche nach Titel, Autor:in, Genre …"
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
              filter === item.value
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
          <p className="text-lg mb-1">📚</p>
          <p>{books.length === 0 ? 'Noch keine Bücher eingetragen.' : 'Keine Treffer.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onClick={() => onSelect(book)} />
          ))}
        </div>
      )}
    </div>
  )
}
