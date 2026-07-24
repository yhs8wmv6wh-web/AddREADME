import { useEffect, useMemo, useState } from 'react'
import type { Book, BookInput } from './types'
import { addBook, deleteBook, getAllBooks, requestPersistentStorage, updateBook } from './db'
import { getAllTags } from './lib/stats'
import { Bookshelf } from './components/Bookshelf'
import { BookForm } from './components/BookForm'
import { ScreenshotImport } from './components/ScreenshotImport'
import { Statistics } from './components/Statistics'
import { UpdatePrompt } from './components/UpdatePrompt'

type View =
  | { name: 'shelf' }
  | { name: 'stats' }
  | { name: 'add-choice' }
  | { name: 'add-manual' }
  | { name: 'add-screenshot' }
  | { name: 'edit'; book: Book }

const ADD_VIEWS: View['name'][] = ['add-choice', 'add-manual', 'add-screenshot', 'edit']

const navItemClass = (active: boolean) =>
  `flex-1 rounded-md py-2.5 text-sm ${
    active ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
  }`

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ name: 'shelf' })
  const existingTags = useMemo(() => getAllTags(books), [books])

  useEffect(() => {
    requestPersistentStorage()
    getAllBooks().then((loadedBooks) => {
      setBooks(loadedBooks)
      setLoaded(true)
    })
  }, [])

  async function handleAdd(input: BookInput) {
    const book = await addBook(input)
    setBooks((prev) => [book, ...prev])
    setView({ name: 'shelf' })
  }

  async function handleUpdate(id: string, input: BookInput) {
    const book = await updateBook(id, input)
    setBooks((prev) => prev.map((b) => (b.id === id ? book : b)))
    setView({ name: 'shelf' })
  }

  async function handleDelete(id: string) {
    await deleteBook(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
    setView({ name: 'shelf' })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3.5">
        <h1 className="font-serif text-xl">Bücherregal</h1>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 max-w-2xl w-full mx-auto">
        {!loaded ? (
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-16">Lädt …</p>
        ) : view.name === 'shelf' ? (
          <Bookshelf books={books} onSelect={(book) => setView({ name: 'edit', book })} />
        ) : view.name === 'stats' ? (
          <Statistics books={books} />
        ) : view.name === 'add-choice' ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setView({ name: 'add-manual' })}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-left"
            >
              <p className="font-medium">Manuell eingeben</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Titel, Autor:in und Seiten selbst eintragen.</p>
            </button>
            <button
              onClick={() => setView({ name: 'add-screenshot' })}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-left"
            >
              <p className="font-medium">Aus Libby-Screenshot</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Screenshot aus deinem Libby-Verlauf hochladen, Titel/Autor:in werden erkannt.
              </p>
            </button>
            <button
              onClick={() => setView({ name: 'shelf' })}
              className="rounded-md border border-neutral-200 dark:border-neutral-800 py-2.5 font-medium text-neutral-700 dark:text-neutral-300"
            >
              Abbrechen
            </button>
          </div>
        ) : view.name === 'add-manual' ? (
          <BookForm submitLabel="Buch speichern" onSubmit={handleAdd} onCancel={() => setView({ name: 'shelf' })} existingTags={existingTags} />
        ) : view.name === 'add-screenshot' ? (
          <ScreenshotImport onSubmit={handleAdd} onCancel={() => setView({ name: 'shelf' })} existingTags={existingTags} />
        ) : (
          <BookForm
            initial={view.book}
            submitLabel="Änderungen speichern"
            onSubmit={(input) => handleUpdate(view.book.id, input)}
            onCancel={() => setView({ name: 'shelf' })}
            onDelete={() => handleDelete(view.book.id)}
            existingTags={existingTags}
          />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex gap-2 max-w-2xl mx-auto w-full">
        <button onClick={() => setView({ name: 'shelf' })} className={navItemClass(view.name === 'shelf')}>
          Regal
        </button>
        <button onClick={() => setView({ name: 'stats' })} className={navItemClass(view.name === 'stats')}>
          Statistik
        </button>
        <button onClick={() => setView({ name: 'add-choice' })} className={navItemClass(ADD_VIEWS.includes(view.name))}>
          + Buch
        </button>
      </nav>

      <UpdatePrompt />
    </div>
  )
}

export default App
