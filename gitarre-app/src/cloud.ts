// Speicherung in der claude.ai-Artefakt-Datenbank, privat pro Person:
// data/users/<id>/profile            -> Einstellungen
// data/users/<id>/profile/songs/<id> -> Songs
// data/users/<id>/profile/practice/<id> -> Übungen
import type { PracticeRecord, Settings, Song } from './types'
import { EXAMPLE_SONGS } from './data/examples'
import { getCapability, type DB, type DocRef, type UserNs } from './lib/env'

let base: DocRef | null = null

function withTimeout<T>(p: Promise<T>, ms = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Zeitüberschreitung beim Laden')), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

/** true, wenn die Cloud-Datenbank nutzbar ist (angemeldet in claude.ai). */
export async function initCloud(): Promise<boolean> {
  const [db, user] = await Promise.all([getCapability<DB>('db'), getCapability<UserNs>('user')])
  if (!db || !user) return false
  const uid = await user.id()
  if (!uid) return false
  base = db.doc(`data/users/${uid}/profile`)
  return true
}

function clean<T>(o: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(o)) as Record<string, unknown>
}

const DEFAULT_SETTINGS: Settings = { known: [], german: false, hiddenExamples: [] }

export async function getSettings(): Promise<Settings> {
  const snap = await withTimeout(base!.get())
  const s = (snap.data()?.settings ?? {}) as Partial<Settings>
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(s: Settings): Promise<void> {
  await base!.set({ settings: clean(s) })
}

export function exampleSongs(): Song[] {
  return EXAMPLE_SONGS.map((s, i) => ({ ...s, id: `example-${i + 1}`, example: true, createdAt: i, updatedAt: i }))
}

/** Eigene Songs + Beispielsongs (außer ausgeblendeten), neueste zuerst. */
export async function getAllSongs(): Promise<Song[]> {
  const [snap, settings] = await Promise.all([withTimeout(base!.collection('songs').limit(1000).get()), getSettings()])
  const own = snap.docs.map((d) => d.data() as unknown as Song).filter((s) => s && typeof s.text === 'string')
  const ownIds = new Set(own.map((s) => s.id))
  const hidden = new Set(settings.hiddenExamples ?? [])
  const examples = exampleSongs().filter((e) => !ownIds.has(e.id) && !hidden.has(e.id))
  return [...own, ...examples].sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveSong(song: Song): Promise<void> {
  await base!.collection('songs').doc(song.id).set(clean(song))
}

export async function deleteSong(id: string): Promise<void> {
  await base!.collection('songs').doc(id).delete()
  if (id.startsWith('example-')) {
    const s = await getSettings()
    await saveSettings({ ...s, hiddenExamples: [...new Set([...(s.hiddenExamples ?? []), id])] })
  }
}

export async function getPractice(): Promise<PracticeRecord[]> {
  const snap = await withTimeout(base!.collection('practice').limit(1000).get())
  return snap.docs
    .map((d) => d.data() as unknown as PracticeRecord)
    .filter((r) => r && typeof r.date === 'number')
    .sort((a, b) => b.date - a.date)
}

export async function addPractice(r: PracticeRecord): Promise<void> {
  await base!.collection('practice').doc(r.id).set(clean(r))
}

export async function deletePractice(id: string): Promise<void> {
  await base!.collection('practice').doc(id).delete()
}
