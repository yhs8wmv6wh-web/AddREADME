import { useMemo, useState } from 'react'
import type { Book, BookStatus } from '../types'
import { getAllTags } from '../lib/stats'
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

const chipClass = (active: boolean) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
    active
      ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-900'
      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
  }`

type SortOption = 'added' | 'alphabetical' | 'finished'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'added', label: 'Zuletzt hinzugefügt' },
  { value: 'alphabetical', label: 'Alphabetisch (A–Z)' },
  { value: 'finished', label: 'Zuletzt gelesen' },
]

function sortBooks(books: Book[], sort: SortOption): Book[] {
  const sorted = [...books]
  if (sort === 'alphabetical') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'de'))
  } else if (sort === 'finished') {
    sorted.sort((a, b) => {
      if (!a.finishedDate && !b.finishedDate) return b.createdAt - a.createdAt
      if (!a.finishedDate) return 1
      if (!b.finishedDate) return -1
      return b.finishedDate.localeCompare(a.finishedDate)
    })
  }
  // 'added': books already arrive newest-first from the database.
  return sorted
}

export function Bookshelf({ books, onSelect }: BookshelfProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BookStatus | 'all'>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('added')

  const allTags = useMemo(() => getAllTags(books), [books])

  const stats = useMemo(() => {
    const finished = books.filter((book) => book.status === 'finished')
    const totalPages = finished.reduce((sum, book) => sum + (book.pages ?? 0), 0)
    return { finishedCount: finished.length, totalPages }
  }, [books])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = books.filter((book) => {
      const matchesFilter = filter === 'all' || book.status === filter
      const matchesTag = !activeTag || book.tags.includes(activeTag)
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.genre.toLowerCase().includes(q) ||
        book.tags.some((tag) => tag.toLowerCase().includes(q))
      return matchesFilter && matchesTag && matchesQuery
    })
    return sortBooks(matches, sort)
  }, [books, query, filter, activeTag, sort])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-6">
        <StatTile value={stats.finishedCount} label="Bücher gelesen" />
        <StatTile value={stats.totalPages.toLocaleString('de-DE')} label="Seiten gelesen" />
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Suche nach Titel, Autor:in, Genre, Tag …"
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button key={item.value} onClick={() => setFilter(item.value)} className={chipClass(filter === item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={chipClass(activeTag === tag)}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {filtered.length} {filtered.length === 1 ? 'Buch' : 'Bücher'}
        </span>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
          className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
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
