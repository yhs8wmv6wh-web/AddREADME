import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BodyLog, Settings } from './types'
import { DEFAULT_SETTINGS, currentWeight, getBodyLogs, getSettings, materializeTemplates, requestPersistentStorage, saveSettings } from './db'
import { targets as calcTargets } from './lib/calc'
import { DiaryView } from './components/DiaryView'
import { ProgressView } from './components/ProgressView'
import { RecipesView } from './components/RecipesView'
import { SettingsView } from './components/SettingsView'
import { UpdatePrompt } from './components/UpdatePrompt'

type Tab = 'tagebuch' | 'fortschritt' | 'rezepte' | 'einstellungen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tagebuch', label: 'Tagebuch' },
  { id: 'fortschritt', label: 'Fortschritt' },
  { id: 'rezepte', label: 'Rezepte' },
  { id: 'einstellungen', label: 'Einstellungen' },
]

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isNew, setIsNew] = useState(false)
  const [logs, setLogs] = useState<BodyLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('tagebuch')
  const [version, setVersion] = useState(0) // signalisiert den Ansichten: Daten neu laden

  const reload = useCallback(async () => {
    const { settings: s, isNew: n } = await getSettings()
    const l = await getBodyLogs()
    setSettings(s)
    setIsNew(n)
    setLogs(l)
    if (!n) await materializeTemplates(currentWeight(l, s))
    setVersion((v) => v + 1)
    return n
  }, [])

  useEffect(() => {
    requestPersistentStorage()
    reload().then((n) => {
      if (n) setTab('einstellungen')
      setLoaded(true)
    })
    // Beim Zurückkehren in die App (z. B. am nächsten Morgen) neue Tage eintragen.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const weightKg = currentWeight(logs, settings)
  const targets = useMemo(() => calcTargets(settings, weightKg), [settings, weightKg])

  if (!loaded) return null

  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <main
        className="mx-auto max-w-xl px-4 pb-28"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {tab === 'tagebuch' && <DiaryView settings={settings} targets={targets} weightKg={weightKg} refreshKey={version} />}
        {tab === 'fortschritt' && (
          <ProgressView settings={settings} logs={logs} targets={targets} weightKg={weightKg} onChanged={reload} />
        )}
        {tab === 'rezepte' && <RecipesView settings={settings} refreshKey={version} />}
        {tab === 'einstellungen' && (
          <SettingsView
            settings={settings}
            isNew={isNew}
            targets={targets}
            weightKg={weightKg}
            onSave={async (s) => {
              await saveSettings(s)
              await reload()
            }}
            onDataChanged={reload}
          />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3.5 text-sm ${tab === t.id ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-neutral-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <UpdatePrompt />
    </div>
  )
}
