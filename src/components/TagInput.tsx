import { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}

export function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const value = raw.trim()
    if (!value) return
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const remainingSuggestions = suggestions.filter(
    (s) => !tags.some((tag) => tag.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 dark:border-neutral-600 px-2 py-0.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Tag ${tag} entfernen`}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          list="tag-suggestions"
          placeholder={tags.length === 0 ? 'z. B. Buchklub' : ''}
          className="flex-1 min-w-[6rem] bg-transparent text-sm py-0.5 focus:outline-none"
        />
      </div>
      {remainingSuggestions.length > 0 && (
        <datalist id="tag-suggestions">
          {remainingSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}
    </div>
  )
}
