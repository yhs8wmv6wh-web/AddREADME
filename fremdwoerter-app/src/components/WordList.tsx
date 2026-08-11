import { useMemo, useState } from 'react'
import type { Fremdwort } from '../types'
import { WordDetail } from './WordDetail'

interface WordListProps {
  woerter: Fremdwort[]
  onDelete: (id: string) => void
}

const searchInputClass =
  'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'

export function WordList({ woerter, onDelete }: WordListProps) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de')
    if (!q) return woerter
    return woerter.filter((w) =>
      `${w.word} ${w.explanation} ${w.etymology}`.toLocaleLowerCase('de').includes(q),
    )
  }, [woerter, query])

  if (woerter.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
        <p>Noch keine Wörter gespeichert.</p>
        <p className="text-sm mt-1">Gib oben ein Fremdwort ein, um es erklären zu lassen.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nachschlagen / suchen …"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={searchInputClass}
      />

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-sm text-neutral-500 dark:text-neutral-400">Nichts gefunden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((wort) => {
            const isOpen = openId === wort.id
            return (
              <li key={wort.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : wort.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="h-6 w-1 shrink-0 rounded-full bg-teal-500" aria-hidden />
                  <span className="font-serif text-base flex-1">{wort.word}</span>
                  {!wort.isGerman && (
                    <span className="shrink-0 rounded-full bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                      Fremdwort
                    </span>
                  )}
                  <span className="shrink-0 text-neutral-400 dark:text-neutral-500 text-xs" aria-hidden>
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-100 dark:border-neutral-900 px-3 py-3 flex flex-col gap-3">
                    <WordDetail wort={wort} />
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(wort.id)
                        setOpenId(null)
                      }}
                      className="self-start text-sm text-neutral-400 dark:text-neutral-500 underline underline-offset-2"
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
