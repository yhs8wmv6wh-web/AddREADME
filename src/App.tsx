import { useEffect, useState } from 'react'
import type { Book, BookInput } from './types'
import { addBook, deleteBook, getAllBooks, updateBook } from './db'
import { Bookshelf } from './components/Bookshelf'
import { BookForm } from './components/BookForm'
import { ScreenshotImport } from './components/ScreenshotImport'
import { Statistics } from './components/Statistics'

type View =
  | { name: 'shelf' }
  | { name: 'stats' }
  | { name: 'add-choice' }
  | { name: 'add-manual' }
  | { name: 'add-screenshot' }
  | { name: 'edit'; book: Book }

const ADD_VIEWS: View['name'][] = ['add-choice', 'add-manual', 'add-screenshot', 'edit']

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ name: 'shelf' })

  useEffect(() => {
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
    <div className="min-h-dvh flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">📚 Mein Bücherregal</h1>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 max-w-2xl w-full mx-auto">
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
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 text-left"
            >
              <p className="font-medium">✍️ Manuell eingeben</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Titel, Autor:in und Seiten selbst eintragen.</p>
            </button>
            <button
              onClick={() => setView({ name: 'add-screenshot' })}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 text-left"
            >
              <p className="font-medium">📸 Aus Libby-Screenshot</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Screenshot aus deinem Libby-Verlauf hochladen, Titel/Autor:in werden erkannt.
              </p>
            </button>
            <button
              onClick={() => setView({ name: 'shelf' })}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-2.5 font-medium text-neutral-700 dark:text-neutral-300"
            >
              Abbrechen
            </button>
          </div>
        ) : view.name === 'add-manual' ? (
          <BookForm submitLabel="Buch speichern" onSubmit={handleAdd} onCancel={() => setView({ name: 'shelf' })} />
        ) : view.name === 'add-screenshot' ? (
          <ScreenshotImport onSubmit={handleAdd} onCancel={() => setView({ name: 'shelf' })} />
        ) : (
          <BookForm
            initial={view.book}
            submitLabel="Änderungen speichern"
            onSubmit={(input) => handleUpdate(view.book.id, input)}
            onCancel={() => setView({ name: 'shelf' })}
            onDelete={() => handleDelete(view.book.id)}
          />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex gap-2 max-w-2xl mx-auto w-full">
        <button
          onClick={() => setView({ name: 'shelf' })}
          className={`flex-1 rounded-lg py-2.5 font-medium ${
            view.name === 'shelf' ? 'bg-purple-600 text-white' : 'text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Regal
        </button>
        <button
          onClick={() => setView({ name: 'stats' })}
          className={`flex-1 rounded-lg py-2.5 font-medium ${
            view.name === 'stats' ? 'bg-purple-600 text-white' : 'text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Statistik
        </button>
        <button
          onClick={() => setView({ name: 'add-choice' })}
          className={`flex-1 rounded-lg py-2.5 font-medium ${
            ADD_VIEWS.includes(view.name) ? 'bg-purple-600 text-white' : 'text-neutral-600 dark:text-neutral-300'
          }`}
        >
          + Buch
        </button>
      </nav>
    </div>
  )
}

export default App
