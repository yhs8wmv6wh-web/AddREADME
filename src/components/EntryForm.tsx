import { useState } from 'react'
import type { Category, EntryInput } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_META } from '../types'

interface EntryFormProps {
  onSubmit: (input: EntryInput) => void
  onCancel: () => void
}

const inputClass =
  'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'

const categoryChipClass = (active: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
    active
      ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-900'
      : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
  }`

export function EntryForm({ onSubmit, onCancel }: EntryFormProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('kinofilm')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), category, done: false, doneAt: null })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">
          Titel *
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
          placeholder="z. B. Dune 2"
          className={inputClass}
        />
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">Kategorie</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((value) => (
            <button key={value} type="button" onClick={() => setCategory(value)} className={categoryChipClass(category === value)}>
              <span aria-hidden>{CATEGORY_META[value].emoji}</span>
              {CATEGORY_LABEL[value]}
            </button>
          ))}
        </div>
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
          disabled={!title.trim()}
          className="flex-1 rounded-md bg-neutral-900 dark:bg-neutral-100 py-2.5 font-medium text-white dark:text-neutral-900 disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
