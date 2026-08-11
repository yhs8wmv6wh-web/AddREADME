import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Fremdwort, FremdwortInput } from './types'

interface FremdwoerterDB extends DBSchema {
  woerter: {
    key: string
    value: Fremdwort
    indexes: { 'by-createdAt': number }
  }
}

// Eigener Datenbankname (IndexedDB ist pro Origin, nicht pro Pfad) – so kommen
// sich die Daten der drei Apps auf github.io nie in die Quere.
const DB_NAME = 'fremdwoerter'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FremdwoerterDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FremdwoerterDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('woerter', { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

/** Vergleichsschlüssel für Duplikat-Erkennung: getrimmt und kleingeschrieben. */
function normKey(word: string): string {
  return word.trim().toLocaleLowerCase('de')
}

/** Alphabetisch sortiert (deutsche Sortierung, Groß/Klein egal). */
export async function getAllFremdwoerter(): Promise<Fremdwort[]> {
  const db = await getDB()
  const woerter = await db.getAll('woerter')
  return woerter.sort((a, b) => a.word.localeCompare(b.word, 'de', { sensitivity: 'base' }))
}

/**
 * Speichert ein nachgeschlagenes Wort. Existiert bereits ein Eintrag mit
 * gleichem Wort (Groß/Klein egal), wird dieser aktualisiert statt gedoppelt.
 */
export async function saveFremdwort(input: FremdwortInput): Promise<Fremdwort> {
  const db = await getDB()
  const key = normKey(input.word)
  const existing = (await db.getAll('woerter')).find((w) => normKey(w.word) === key)

  const eintrag: Fremdwort = {
    ...input,
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? Date.now(),
  }
  await db.put('woerter', eintrag)
  return eintrag
}

export async function deleteFremdwort(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('woerter', id)
}

// Fügt Wörter aus einem Backup hinzu (überschreibt gleiche IDs) und gibt die
// vollständige, aktuelle Liste zurück. Bestehende Wörter bleiben erhalten.
export async function importFremdwoerter(woerter: Fremdwort[]): Promise<Fremdwort[]> {
  const db = await getDB()
  const tx = db.transaction('woerter', 'readwrite')
  for (const wort of woerter) {
    if (wort && typeof wort.id === 'string' && typeof wort.word === 'string') {
      await tx.store.put(wort)
    }
  }
  await tx.done
  return getAllFremdwoerter()
}

/**
 * Bittet den Browser, den Speicher dieser Seite von der automatischen Räumung
 * auszunehmen (z. B. Safaris 7-Tage-Grenze für ungenutzte Seiten). Best effort:
 * in manchen Browsern nicht unterstützt oder still abgelehnt, aber harmlos.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
