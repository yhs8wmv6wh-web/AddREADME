import { useState } from 'react'
import type { Fremdwort } from '../types'
import { WordDetail } from './WordDetail'

interface LookupFormProps {
  onLookup: (word: string) => void
  loading: boolean
  error: string | null
  result: Fremdwort | null
}

const inputClass =
  'flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'

export function LookupForm({ onLookup, loading, error, result }: LookupFormProps) {
  const [word, setWord] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = word.trim()
    if (!trimmed || loading) return
    onLookup(trimmed)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder="Fremdwort eingeben …"
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!word.trim() || loading}
          className="shrink-0 rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2.5 font-medium text-white dark:text-neutral-900 disabled:opacity-40"
        >
          {loading ? '…' : 'Erklären'}
        </button>
      </form>

      {loading && <p className="text-sm text-neutral-500 dark:text-neutral-400">Wird erklärt …</p>}

      {error && (
        <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}

      {result && !loading && (
        <section className="rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl">{result.word}</h2>
            <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">gespeichert ✓</span>
          </div>
          <WordDetail wort={result} />
        </section>
      )}
    </div>
  )
}
