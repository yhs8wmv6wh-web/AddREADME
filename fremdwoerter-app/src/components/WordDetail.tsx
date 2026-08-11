import type { Fremdwort } from '../types'

interface WordDetailProps {
  wort: Fremdwort
}

// Zeigt Erklärung und – bei Fremdwörtern – die Etymologie.
export function WordDetail({ wort }: WordDetailProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">{wort.explanation}</p>

      {!wort.isGerman && wort.etymology && (
        <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400 mb-1">Herkunft</p>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{wort.etymology}</p>
        </div>
      )}

      {wort.isGerman && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">Deutsches Wort – keine Etymologie nötig.</p>
      )}
    </div>
  )
}
