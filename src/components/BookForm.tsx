import { useState } from 'react'
import type { Book, BookInput, BookLanguage, BookStatus } from '../types'
import { LANGUAGE_LABEL } from '../types'
import { currentYearMonth } from '../lib/date'
import { StarRating } from './StarRating'
import { TagInput } from './TagInput'

interface BookFormProps {
  initial?: Partial<Book>
  onSubmit: (input: BookInput) => void
  onCancel: () => void
  onDelete?: () => void
  submitLabel: string
  existingTags?: string[]
}

const inputClass =
  'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'

const segmentedButtonClass = (active: boolean) =>
  `flex-1 rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-900'
      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
  }`

export function BookForm({ initial, onSubmit, onCancel, onDelete, submitLabel, existingTags = [] }: BookFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [author, setAuthor] = useState(initial?.author ?? '')
  const [pages, setPages] = useState(initial?.pages != null ? String(initial.pages) : '')
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? 'finished')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [startedDate, setStartedDate] = useState(initial?.startedDate ?? '')
  const [finishedDate, setFinishedDate] = useState(initial?.finishedDate ?? currentYearMonth())
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [language, setLanguage] = useState<BookLanguage>(initial?.language ?? 'de')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [showFinishedError, setShowFinishedError] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    if (status === 'finished' && !finishedDate) {
      setShowFinishedError(true)
      return
    }
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      pages: pages.trim() ? Math.max(0, parseInt(pages, 10) || 0) : null,
      status,
      rating,
      startedDate: status === 'wishlist' ? null : startedDate || null,
      finishedDate: status === 'finished' ? finishedDate : null,
      genre: genre.trim(),
      language,
      tags,
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          className={inputClass}
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
          className={inputClass}
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
            className={inputClass}
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
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">Sprache</span>
        <div className="flex gap-2">
          {(Object.entries(LANGUAGE_LABEL) as [BookLanguage, string][]).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setLanguage(value)} className={segmentedButtonClass(language === value)}>
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
            <button key={value} type="button" onClick={() => setStatus(value)} className={segmentedButtonClass(status === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {status !== 'wishlist' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="startedDate">
              Begonnen
            </label>
            <input
              id="startedDate"
              type="month"
              value={startedDate ?? ''}
              onChange={(event) => setStartedDate(event.target.value)}
              className={inputClass}
            />
          </div>
          {status === 'finished' && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="finishedDate">
                Beendet *
              </label>
              <input
                id="finishedDate"
                type="month"
                required
                value={finishedDate ?? ''}
                onChange={(event) => {
                  setFinishedDate(event.target.value)
                  setShowFinishedError(false)
                }}
                className={inputClass}
              />
              {showFinishedError && <p className="text-xs text-neutral-500 mt-1">Bitte mindestens den Monat angeben.</p>}
            </div>
          )}
        </div>
      )}

      <div>
        <span className="block text-sm font-medium mb-1">Bewertung</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">Tags</span>
        <TagInput tags={tags} onChange={setTags} suggestions={existingTags} />
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
          className={inputClass}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 py-2.5 font-medium text-neutral-700 dark:text-neutral-300"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="flex-1 rounded-md bg-neutral-900 dark:bg-neutral-100 py-2.5 font-medium text-white dark:text-neutral-900"
        >
          {submitLabel}
        </button>
      </div>
      {onDelete && (
        <button type="button" onClick={onDelete} className="text-sm text-neutral-500 dark:text-neutral-400 font-medium py-1 underline underline-offset-2">
          Buch löschen
        </button>
      )}
    </form>
  )
}
