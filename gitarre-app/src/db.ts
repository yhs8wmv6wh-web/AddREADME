import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PracticeRecord, Settings, Song } from './types'
import { EXAMPLE_SONGS } from './data/examples'

interface GitarreDB extends DBSchema {
  songs: { key: string; value: Song }
  practice: { key: string; value: PracticeRecord; indexes: { 'by-date': number } }
  settings: { key: string; value: unknown }
}

// Eigener Datenbankname (IndexedDB ist pro Origin, nicht pro Pfad).
const DB_NAME = 'gitarre'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GitarreDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<GitarreDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('songs', { keyPath: 'id' })
        const p = db.createObjectStore('practice', { keyPath: 'id' })
        p.createIndex('by-date', 'date')
        db.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

function sortSongs(songs: Song[]): Song[] {
  return songs.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Beim allerersten Start Beispielsongs anlegen. */
export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB()
  const seeded = await db.get('settings', 'seeded')
  if (!seeded) {
    const tx = db.transaction(['songs', 'settings'], 'readwrite')
    const now = Date.now()
    EXAMPLE_SONGS.forEach((s, i) =>
      tx.objectStore('songs').put({ ...s, id: crypto.randomUUID(), example: true, createdAt: now - i, updatedAt: now - i }),
    )
    tx.objectStore('settings').put(true, 'seeded')
    await tx.done
  }
  return sortSongs(await db.getAll('songs'))
}

export async function saveSong(song: Song): Promise<void> {
  const db = await getDB()
  await db.put('songs', song)
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('songs', id)
}

export async function getPractice(): Promise<PracticeRecord[]> {
  const db = await getDB()
  return (await db.getAllFromIndex('practice', 'by-date')).reverse()
}

export async function addPractice(rec: PracticeRecord): Promise<void> {
  const db = await getDB()
  await db.put('practice', rec)
}

export async function deletePractice(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('practice', id)
}

const DEFAULT_SETTINGS: Settings = { known: [], german: false }

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const s = (await db.get('settings', 'settings')) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(s: Settings): Promise<void> {
  const db = await getDB()
  await db.put('settings', s, 'settings')
}

export interface Backup {
  app: 'gitarre'
  version: 1
  songs: Song[]
  practice: PracticeRecord[]
  settings: Settings
}

export async function exportBackup(): Promise<Backup> {
  const db = await getDB()
  return {
    app: 'gitarre',
    version: 1,
    songs: await db.getAll('songs'),
    practice: await db.getAll('practice'),
    settings: await getSettings(),
  }
}

/** Fügt Daten aus einem Backup hinzu (gleiche IDs werden überschrieben, nichts gelöscht). */
export async function importBackup(b: Partial<Backup>): Promise<number> {
  const db = await getDB()
  const tx = db.transaction(['songs', 'practice', 'settings'], 'readwrite')
  let n = 0
  for (const s of b.songs ?? []) {
    if (s && typeof s.id === 'string' && typeof s.text === 'string') {
      await tx.objectStore('songs').put(s)
      n++
    }
  }
  for (const p of b.practice ?? []) {
    if (p && typeof p.id === 'string' && typeof p.date === 'number') await tx.objectStore('practice').put(p)
  }
  if (b.settings) {
    const cur = ((await tx.objectStore('settings').get('settings')) as Settings | undefined) ?? DEFAULT_SETTINGS
    const known = [...new Set([...(cur.known ?? []), ...(b.settings.known ?? [])])]
    await tx.objectStore('settings').put({ ...cur, ...b.settings, known }, 'settings')
  }
  await tx.done
  return n
}

export type StorageStatus = 'persistent' | 'best-effort' | 'unsupported'

export async function requestPersistentStorage(): Promise<StorageStatus> {
  if (!navigator.storage?.persist || !navigator.storage?.persisted) return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'persistent'
    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}
