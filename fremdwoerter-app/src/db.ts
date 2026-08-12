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

export type StorageStatus = 'persistent' | 'best-effort' | 'unsupported'

/**
 * Bittet den Browser, den Speicher dieser Seite dauerhaft zu schützen (nicht
 * automatisch zu räumen). Gibt den resultierenden Status zurück:
 * - 'persistent'  – Speicher ist geschützt.
 * - 'best-effort' – nicht garantiert; iOS kann ihn theoretisch räumen.
 * - 'unsupported' – der Browser kennt die Funktion nicht.
 */
export async function requestPersistentStorage(): Promise<StorageStatus> {
  if (!navigator.storage?.persist || !navigator.storage?.persisted) return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'persistent'
    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}

/** Aktueller Schutz-Status, ohne den Browser erneut um Erlaubnis zu bitten. */
export async function getStorageStatus(): Promise<StorageStatus> {
  if (!navigator.storage?.persisted) return 'unsupported'
  try {
    return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}
