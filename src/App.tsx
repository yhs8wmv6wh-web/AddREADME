import { useEffect, useState } from 'react'
import type { Entry, EntryInput } from './types'
import { addEntry, deleteEntry, getAllEntries, toggleDone } from './db'
import { EntryList } from './components/EntryList'
import { EntryForm } from './components/EntryForm'

type View = { name: 'list' } | { name: 'add' }

const navItemClass = (active: boolean) =>
  `flex-1 rounded-md py-2.5 text-sm ${
    active ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
  }`

function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })

  useEffect(() => {
    getAllEntries().then((loadedEntries) => {
      setEntries(loadedEntries)
      setLoaded(true)
    })
  }, [])

  async function handleAdd(input: EntryInput) {
    const entry = await addEntry(input)
    setEntries((prev) => [entry, ...prev])
    setView({ name: 'list' })
  }

  async function handleToggle(id: string) {
    const updated = await toggleDone(id)
    if (!updated) return
    setEntries((prev) => prev.map((entry) => (entry.id === id ? updated : entry)))
  }

  async function handleDelete(id: string) {
    await deleteEntry(id)
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3.5">
        <h1 className="font-serif text-xl">Kulturliste</h1>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 max-w-2xl w-full mx-auto">
        {!loaded ? (
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-16">Lädt …</p>
        ) : view.name === 'list' ? (
          <EntryList entries={entries} onToggle={handleToggle} onDelete={handleDelete} />
        ) : (
          <EntryForm onSubmit={handleAdd} onCancel={() => setView({ name: 'list' })} />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex gap-2 max-w-2xl mx-auto w-full">
        <button onClick={() => setView({ name: 'list' })} className={navItemClass(view.name === 'list')}>
          Liste
        </button>
        <button onClick={() => setView({ name: 'add' })} className={navItemClass(view.name === 'add')}>
          + Neu
        </button>
      </nav>
    </div>
  )
}

export default App
