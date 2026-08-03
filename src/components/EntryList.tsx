import { useMemo, useState } from 'react'
import type { Category, Entry } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_META } from '../types'

interface EntryListProps {
  entries: Entry[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function EntryList({ entries, onToggle, onDelete }: EntryListProps) {
  // Eingeklappte Kategorien merken; leer = alle offen (neue Kategorien sind standardmäßig offen).
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set())

  const groups = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      items: entries.filter((entry) => entry.category === category),
    })).filter((group) => group.items.length > 0)
  }, [entries])

  function toggleCollapsed(category: Category) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
        <p>Noch keine Einträge.</p>
        <p className="text-sm mt-1">Tippe unten auf „+ Neu", um etwas hinzuzufügen.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ category, items }) => {
        const meta = CATEGORY_META[category]
        const isOpen = !collapsed.has(category)
        return (
          <section key={category} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCollapsed(category)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className={`h-6 w-1 rounded-full ${meta.bar}`} aria-hidden />
              <span className="text-lg" aria-hidden>
                {meta.emoji}
              </span>
              <span className="font-serif text-base flex-1">{CATEGORY_LABEL[category]}</span>
              <span className="text-sm text-neutral-400 dark:text-neutral-500 tabular-nums">{items.length}</span>
              <span className="text-neutral-400 dark:text-neutral-500 text-xs" aria-hidden>
                {isOpen ? '▾' : '▸'}
              </span>
            </button>

            {isOpen && (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-900 border-t border-neutral-100 dark:border-neutral-900">
                {items.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggle(entry.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                      aria-pressed={entry.done}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                          entry.done
                            ? `${meta.dot} border-transparent text-white`
                            : 'border-neutral-300 dark:border-neutral-600 text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span
                        className={`text-base ${
                          entry.done ? 'line-through text-neutral-400 dark:text-neutral-600' : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {entry.title}
                      </span>
                    </button>
                    {entry.done && (
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="shrink-0 text-sm text-neutral-400 dark:text-neutral-500 underline underline-offset-2"
                      >
                        Löschen
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
