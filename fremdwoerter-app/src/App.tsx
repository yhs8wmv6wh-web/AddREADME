import { useEffect, useState } from 'react'
import type { Fremdwort } from './types'
import {
  deleteFremdwort,
  getAllFremdwoerter,
  importFremdwoerter,
  requestPersistentStorage,
  saveFremdwort,
  type StorageStatus,
} from './db'
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from './lib/apiKey'
import { lookupWord } from './lib/anthropic'
import { LookupForm } from './components/LookupForm'
import { WordList } from './components/WordList'
import { ApiKeySettings } from './components/ApiKeySettings'
import { StorageNotice } from './components/StorageNotice'
import { BackupBar } from './components/BackupBar'
import { UpdatePrompt } from './components/UpdatePrompt'

type View = 'liste' | 'einstellungen'

// Läuft die App als installierte Home-Bildschirm-App (statt als Safari-Tab)?
// Nur dann behandelt iOS den Speicher zuverlässig dauerhaft.
function detectStandalone(): boolean {
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  return iosStandalone || displayMode
}

const navItemClass = (active: boolean) =>
  `flex-1 rounded-md py-2.5 text-sm ${
    active ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
  }`

function App() {
  const [woerter, setWoerter] = useState<Fremdwort[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>('liste')
  const [keyPresent, setKeyPresent] = useState(hasApiKey())

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Fremdwort | null>(null)

  const [standalone] = useState(detectStandalone)
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)

  useEffect(() => {
    requestPersistentStorage().then(setStorageStatus)
    getAllFremdwoerter().then((list) => {
      setWoerter(list)
      setLoaded(true)
    })
  }, [])

  async function handleLookup(word: string) {
    const apiKey = getApiKey()
    if (!apiKey) {
      setKeyPresent(false)
      setView('einstellungen')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const lookup = await lookupWord(word, apiKey)
      const saved = await saveFremdwort(lookup)
      setWoerter(await getAllFremdwoerter())
      setResult(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteFremdwort(id)
    setWoerter((prev) => prev.filter((w) => w.id !== id))
    setResult((prev) => (prev?.id === id ? null : prev))
  }

  async function handleImport(imported: Fremdwort[]) {
    const merged = await importFremdwoerter(imported)
    setWoerter(merged)
    alert(`${imported.length} Wörter aus dem Backup geladen.`)
  }

  function handleSaveKey(key: string) {
    setApiKey(key)
    setKeyPresent(true)
    setError(null)
    setView('liste')
  }

  function handleClearKey() {
    clearApiKey()
    setKeyPresent(false)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3.5">
        <h1 className="font-serif text-xl">Fremdwörter</h1>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 max-w-2xl w-full mx-auto">
        {!loaded ? (
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-16">Lädt …</p>
        ) : view === 'liste' ? (
          <div className="flex flex-col gap-8">
            {!standalone && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Tipp fürs iPhone:</strong> Füge die App über <strong>Teilen → „Zum Home-Bildschirm"</strong> hinzu
                und öffne sie danach immer über dieses Symbol. Nur so speichert iOS deine Wörter zuverlässig dauerhaft.
              </div>
            )}

            <LookupForm onLookup={handleLookup} loading={loading} error={error} result={result} />

            {!keyPresent && (
              <button
                type="button"
                onClick={() => setView('einstellungen')}
                className="rounded-md bg-teal-50 dark:bg-teal-950/30 px-3 py-2.5 text-left text-sm text-teal-800 dark:text-teal-300"
              >
                Noch kein KI-Schlüssel hinterlegt – hier eintragen, damit Erklärungen funktionieren.
              </button>
            )}

            <div>
              <WordList woerter={woerter} onDelete={handleDelete} />
              <BackupBar woerter={woerter} onImport={handleImport} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <StorageNotice status={storageStatus} standalone={standalone} />
            <ApiKeySettings hasKey={keyPresent} onSave={handleSaveKey} onClear={handleClearKey} />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex gap-2 max-w-2xl mx-auto w-full">
        <button onClick={() => setView('liste')} className={navItemClass(view === 'liste')}>
          Wörter
        </button>
        <button onClick={() => setView('einstellungen')} className={navItemClass(view === 'einstellungen')}>
          Einstellungen
        </button>
      </nav>

      <UpdatePrompt />
    </div>
  )
}

export default App
