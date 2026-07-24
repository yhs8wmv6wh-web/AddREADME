import { useState } from 'react'
import type { Book, BookInput, BookLanguage, BookStatus } from '../types'
import { LANGUAGE_LABEL } from '../types'
import { combineMonthAndDay, currentYearMonth, extractDay } from '../lib/date'
import { searchBookCandidates, type BookCandidate } from '../lib/bookLookup'
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

const inputBaseClass =
  'rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'
const inputClass = `w-full ${inputBaseClass}`

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
  const [startedMonth, setStartedMonth] = useState(initial?.startedDate?.slice(0, 7) ?? '')
  const [startedDay, setStartedDay] = useState(initial?.startedDate ? (extractDay(initial.startedDate) ?? '') : '')
  const [finishedMonth, setFinishedMonth] = useState(initial?.finishedDate?.slice(0, 7) ?? currentYearMonth())
  const [finishedDay, setFinishedDay] = useState(initial?.finishedDate ? (extractDay(initial.finishedDate) ?? '') : '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [language, setLanguage] = useState<BookLanguage>(initial?.language ?? 'de')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.coverUrl ?? null)
  const [showFinishedError, setShowFinishedError] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [candidates, setCandidates] = useState<BookCandidate[]>([])

  async function handleLookup() {
    setLookupStatus('loading')
    setCandidates([])
    try {
      const results = await searchBookCandidates(title.trim(), author.trim())
      setCandidates(results)
      setLookupStatus('done')
    } catch {
      setLookupStatus('error')
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    if (status === 'finished' && !finishedMonth) {
      setShowFinishedError(true)
      return
    }
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      pages: pages.trim() ? Math.max(0, parseInt(pages, 10) || 0) : null,
      status,
      rating,
      startedDate: status === 'wishlist' || !startedMonth ? null : combineMonthAndDay(startedMonth, Number(startedDay) || null),
      finishedDate: status === 'finished' ? combineMonthAndDay(finishedMonth, Number(finishedDay) || null) : null,
      genre: genre.trim(),
      language,
      tags,
      notes: notes.trim(),
      coverUrl,
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
          <div className="flex items-baseline justify-between mb-1">
            <label className="block text-sm font-medium" htmlFor="pages">
              Seiten
            </label>
            <button
              type="button"
              onClick={handleLookup}
              disabled={!title.trim() || lookupStatus === 'loading'}
              className="text-xs text-neutral-500 dark:text-neutral-400 underline underline-offset-2 disabled:opacity-40 disabled:no-underline"
            >
              {lookupStatus === 'loading' ? 'Suche …' : 'Seiten & Cover suchen'}
            </button>
          </div>
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

      {lookupStatus === 'error' && (
        <p className="text-xs text-neutral-500 -mt-3">Suche fehlgeschlagen. Bitte Seiten manuell eintragen.</p>
      )}

      {lookupStatus === 'done' && (
        <div className="-mt-3 rounded-md border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-900 overflow-hidden">
          {candidates.length === 0 ? (
            <p className="text-xs text-neutral-500 p-3">Keine gedruckte Ausgabe gefunden. Bitte Seiten manuell eintragen.</p>
          ) : (
            candidates.slice(0, 5).map((candidate, index) => (
              <button
                key={`${candidate.title}-${candidate.pageCount}-${index}`}
                type="button"
                onClick={() => {
                  setPages(String(candidate.pageCount))
                  setCoverUrl(candidate.coverUrl)
                  setLookupStatus('idle')
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center gap-3"
              >
                {candidate.coverUrl ? (
                  <img src={candidate.coverUrl} alt="" className="w-8 h-11 object-cover rounded-sm shrink-0 border border-neutral-200 dark:border-neutral-700" />
                ) : (
                  <span className="w-8 h-11 shrink-0 rounded-sm bg-neutral-100 dark:bg-neutral-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{candidate.title}</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {[candidate.authors, candidate.publisher].filter(Boolean).join(' · ')}
                    {candidate.isEbook ? ' · E-Book' : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{candidate.pageCount} S.</span>
              </button>
            ))
          )}
        </div>
      )}

      {coverUrl && lookupStatus !== 'done' && (
        <div className="-mt-3 flex items-center gap-3">
          <img src={coverUrl} alt="" className="w-10 h-14 object-cover rounded-sm border border-neutral-200 dark:border-neutral-700" />
          <button
            type="button"
            onClick={() => setCoverUrl(null)}
            className="text-xs text-neutral-500 dark:text-neutral-400 underline underline-offset-2"
          >
            Cover entfernen
          </button>
        </div>
      )}

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
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="startedDate">
              Begonnen <span className="font-normal text-neutral-400">(Monat, Tag optional)</span>
            </label>
            <div className="flex gap-1.5">
              <input
                id="startedDate"
                type="month"
                value={startedMonth}
                onChange={(event) => setStartedMonth(event.target.value)}
                className={`${inputBaseClass} flex-1 min-w-0`}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={startedDay}
                onChange={(event) => setStartedDay(event.target.value)}
                placeholder="Tag"
                title="Genauer Tag (optional)"
                className={`${inputBaseClass} w-20 shrink-0 px-2`}
              />
            </div>
          </div>
          {status === 'finished' && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="finishedDate">
                Beendet * <span className="font-normal text-neutral-400">(Monat Pflicht, Tag optional)</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  id="finishedDate"
                  type="month"
                  required
                  value={finishedMonth}
                  onChange={(event) => {
                    setFinishedMonth(event.target.value)
                    setShowFinishedError(false)
                  }}
                  className={`${inputBaseClass} flex-1 min-w-0`}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={finishedDay}
                  onChange={(event) => setFinishedDay(event.target.value)}
                  placeholder="Tag"
                  title="Genauer Tag (optional)"
                  className={`${inputBaseClass} w-20 shrink-0 px-2`}
                />
              </div>
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
