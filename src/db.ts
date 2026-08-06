import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Entry, EntryInput } from './types'

interface KulturlisteDB extends DBSchema {
  entries: {
    key: string
    value: Entry
    indexes: { 'by-createdAt': number }
  }
}

const DB_NAME = 'kulturliste'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<KulturlisteDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KulturlisteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('entries', { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDB()
  const entries = await db.getAllFromIndex('entries', 'by-createdAt')
  return entries.reverse() // neueste zuerst
}

export async function addEntry(input: EntryInput): Promise<Entry> {
  const db = await getDB()
  const entry: Entry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  await db.put('entries', entry)
  return entry
}

export async function toggleDone(id: string): Promise<Entry | undefined> {
  const db = await getDB()
  const existing = await db.get('entries', id)
  if (!existing) return undefined
  const entry: Entry = {
    ...existing,
    done: !existing.done,
    doneAt: !existing.done ? Date.now() : null,
  }
  await db.put('entries', entry)
  return entry
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('entries', id)
}

// Fügt Einträge aus einem Backup hinzu (überschreibt gleiche IDs) und gibt
// die vollständige, aktuelle Liste zurück. Bestehende Einträge bleiben erhalten.
export async function importEntries(entries: Entry[]): Promise<Entry[]> {
  const db = await getDB()
  const tx = db.transaction('entries', 'readwrite')
  for (const entry of entries) {
    if (entry && typeof entry.id === 'string' && typeof entry.title === 'string') {
      await tx.store.put(entry)
    }
  }
  await tx.done
  return getAllEntries()
}
