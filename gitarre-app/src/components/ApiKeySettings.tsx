import { useState } from 'react'
import { apiKeySource, clearApiKey, setApiKey } from '../lib/apiKey'

export function ApiKeySettings() {
  const [source, setSource] = useState(apiKeySource)
  const [value, setValue] = useState('')

  return (
    <section className="flex flex-col gap-2" id="api-key">
      <h2 className="font-serif text-xl">KI-Schlüssel für die Song-Suche</h2>
      {source === 'fremdwoerter' && (
        <p className="text-sm rounded-md bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 px-3 py-2">
          Der Schlüssel aus deiner Fremdwörter-App wird automatisch mitbenutzt. Du musst nichts eintragen.
        </p>
      )}
      {source === 'own' && (
        <div className="flex items-center justify-between text-sm rounded-md bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 px-3 py-2">
          <span>Schlüssel ist hinterlegt.</span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              clearApiKey()
              setSource(apiKeySource())
            }}
          >
            entfernen
          </button>
        </div>
      )}
      {source !== 'own' && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!value.trim()) return
            setApiKey(value)
            setValue('')
            setSource(apiKeySource())
          }}
        >
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            className="flex-1 min-w-0 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <button type="submit" className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 font-medium">
            Speichern
          </button>
        </form>
      )}
      <p className="text-xs text-neutral-500 leading-relaxed">
        Schlüssel gibt es unter console.anthropic.com → API Keys. Er bleibt nur auf diesem Gerät und wird ausschließlich direkt an
        Anthropic geschickt. Die Websuche muss in der Console erlaubt sein.
      </p>
    </section>
  )
}
