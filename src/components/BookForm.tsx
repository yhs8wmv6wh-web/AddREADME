import { useState } from 'react'
import type { Book, BookInput, BookLanguage, BookStatus } from '../types'
import { LANGUAGE_LABEL, pickCoverColor } from '../types'
import { StarRating } from './StarRating'

interface BookFormProps {
  initial?: Partial<Book>
  onSubmit: (input: BookInput) => void
  onCancel: () => void
  onDelete?: () => void
  submitLabel: string
}

const emptyState = (): BookInput => ({
  title: '',
  author: '',
  pages: null,
  status: 'finished',
  rating: null,
  finishedDate: new Date().toISOString().slice(0, 10),
  genre: '',
  language: 'de',
  notes: '',
  coverColor: pickCoverColor(String(Math.random())),
})

export function BookForm({ initial, onSubmit, onCancel, onDelete, submitLabel }: BookFormProps) {
  const [title, setTitle] = useState(initial?.title ?? emptyState().title)
  const [author, setAuthor] = useState(initial?.author ?? emptyState().author)
  const [pages, setPages] = useState(initial?.pages != null ? String(initial.pages) : '')
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? 'finished')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [finishedDate, setFinishedDate] = useState(initial?.finishedDate ?? emptyState().finishedDate ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [language, setLanguage] = useState<BookLanguage>(initial?.language ?? 'de')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      pages: pages.trim() ? Math.max(0, parseInt(pages, 10) || 0) : null,
      status,
      rating,
      finishedDate: status === 'finished' ? finishedDate || null : null,
      genre: genre.trim(),
      language,
      notes: notes.trim(),
      coverColor: initial?.coverColor ?? pickCoverColor(title.trim() || Math.random().toString()),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">
          Titel *
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="z. B. Die Känguru-Chroniken"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="author">
          Autor:in
        </label>
        <input
          id="author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="z. B. Marc-Uwe Kling"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="pages">
            Seiten
          </label>
          <input
            id="pages"
            type="number"
            inputMode="numeric"
            min={0}
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="z. B. 320"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="genre">
            Genre
          </label>
          <input
            id="genre"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            placeholder="z. B. Roman"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">Sprache</span>
        <div className="flex gap-2">
          {(Object.entries(LANGUAGE_LABEL) as [BookLanguage, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLanguage(value)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                language === value
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">Status</span>
        <div className="flex gap-2">
          {(
            [
              ['finished', 'Gelesen'],
              ['reading', 'Lese ich gerade'],
              ['wishlist', 'Wunschliste'],
            ] as [BookStatus, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                status === value
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {status === 'finished' && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="finishedDate">
            Fertig gelesen am
          </label>
          <input
            id="finishedDate"
            type="date"
            value={finishedDate ?? ''}
            onChange={(event) => setFinishedDate(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      <div>
        <span className="block text-sm font-medium mb-1">Bewertung</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="notes">
          Notizen
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Warum würdest du es empfehlen?"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-2.5 font-medium text-neutral-700 dark:text-neutral-300"
        >
          Abbrechen
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-purple-600 py-2.5 font-medium text-white">
          {submitLabel}
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600 dark:text-red-400 font-medium py-1"
        >
          Buch löschen
        </button>
      )}
    </form>
  )
}
