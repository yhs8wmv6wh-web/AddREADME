import { useState } from 'react'

interface ApiKeySettingsProps {
  hasKey: boolean
  onSave: (key: string) => void
  onClear: () => void
}

const inputClass =
  'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100'

export function ApiKeySettings({ hasKey, onSave, onClear }: ApiKeySettingsProps) {
  const [value, setValue] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSave(trimmed)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-xl mb-1">KI-Schlüssel</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Die Erklärungen kommen von Claude (Anthropic). Dafür brauchst du einen eigenen API-Schlüssel. Er wird{' '}
          <strong>nur auf diesem Gerät</strong> gespeichert und an niemanden sonst weitergegeben.
        </p>
      </div>

      {hasKey && (
        <div className="rounded-md bg-teal-50 dark:bg-teal-950/30 px-3 py-2.5 text-sm text-teal-800 dark:text-teal-300">
          Ein Schlüssel ist gespeichert. ✓
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="apikey">
          {hasKey ? 'Neuen Schlüssel eintragen' : 'API-Schlüssel eintragen'}
        </label>
        <input
          id="apikey"
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="sk-ant-…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded-md bg-neutral-900 dark:bg-neutral-100 py-2.5 font-medium text-white dark:text-neutral-900 disabled:opacity-40"
        >
          Speichern
        </button>
      </form>

      {hasKey && (
        <button
          type="button"
          onClick={onClear}
          className="self-start text-sm text-neutral-400 dark:text-neutral-500 underline underline-offset-2"
        >
          Schlüssel entfernen
        </button>
      )}

      <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
        Einen Schlüssel bekommst du unter console.anthropic.com (Bereich „API Keys"). Die App nutzt das günstige,
        schnelle Modell Claude Haiku – pro nachgeschlagenem Wort fallen nur Bruchteile eines Cents an.
      </p>
    </div>
  )
}
