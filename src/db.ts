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

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB()
  const books = await db.getAllFromIndex('books', 'by-createdAt')
  return books.reverse()
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB()
  return db.get('books', id)
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
