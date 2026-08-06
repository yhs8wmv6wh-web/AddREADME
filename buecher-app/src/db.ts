import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Book, BookInput } from './types'

interface BookshelfDB extends DBSchema {
  books: {
    key: string
    value: Book
    indexes: { 'by-createdAt': number }
  }
}

const DB_NAME = 'buecherregal'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<BookshelfDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BookshelfDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('books', { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

/**
 * Fills in defaults for fields added to the Book schema after some records
 * were already saved, so older entries don't crash code that assumes every
 * field is present (e.g. iterating `tags`).
 */
function normalizeBook(book: Book): Book {
  return {
    ...book,
    pages: book.pages ?? null,
    rating: book.rating ?? null,
    startedDate: book.startedDate ?? null,
    finishedDate: book.finishedDate ?? null,
    genre: book.genre ?? '',
    language: book.language ?? 'de',
    tags: book.tags ?? [],
    notes: book.notes ?? '',
    coverUrl: book.coverUrl ?? null,
  }
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB()
  const books = await db.getAllFromIndex('books', 'by-createdAt')
  return books.reverse().map(normalizeBook)
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB()
  const book = await db.get('books', id)
  return book ? normalizeBook(book) : undefined
}

export async function addBook(input: BookInput): Promise<Book> {
  const db = await getDB()
  const book: Book = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  await db.put('books', book)
  return book
}

export async function updateBook(id: string, input: BookInput): Promise<Book> {
  const db = await getDB()
  const existing = await db.get('books', id)
  const book: Book = {
    ...input,
    id,
    createdAt: existing?.createdAt ?? Date.now(),
  }
  await db.put('books', book)
  return book
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('books', id)
}

// Fügt Bücher aus einem Backup hinzu (überschreibt gleiche IDs) und gibt die
// vollständige, aktuelle Liste zurück. Bestehende Bücher bleiben erhalten.
export async function importBooks(books: Book[]): Promise<Book[]> {
  const db = await getDB()
  const tx = db.transaction('books', 'readwrite')
  for (const book of books) {
    if (book && typeof book.id === 'string' && typeof book.title === 'string') {
      await tx.store.put(book)
    }
  }
  await tx.done
  return getAllBooks()
}

/**
 * Asks the browser to exempt this origin's storage from automatic eviction
 * (e.g. Safari's 7-day cap on unused sites). Best-effort: unsupported or
 * silently denied in some browsers, but harmless to call regardless.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
