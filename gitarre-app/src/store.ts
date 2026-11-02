// Einheitlicher Zugriff auf die Daten: im Artefakt die claude.ai-Datenbank
// (wenn angemeldet), sonst IndexedDB auf dem Gerät.
import * as local from './db'
import * as cloud from './cloud'
import { ARTIFACT } from './lib/env'

type Backend = Pick<
  typeof local,
  'getAllSongs' | 'saveSong' | 'deleteSong' | 'getPractice' | 'addPractice' | 'deletePractice' | 'getSettings' | 'saveSettings'
>

let backend: Backend = local
export let storageMode: 'cloud' | 'local' = 'local'

export async function initStore(): Promise<'cloud' | 'local'> {
  if (ARTIFACT && (await cloud.initCloud())) {
    backend = cloud
    storageMode = 'cloud'
  }
  return storageMode
}

export const getAllSongs = () => backend.getAllSongs()
export const saveSong: Backend['saveSong'] = (s) => backend.saveSong(s)
export const deleteSong: Backend['deleteSong'] = (id) => backend.deleteSong(id)
export const getPractice = () => backend.getPractice()
export const addPractice: Backend['addPractice'] = (r) => backend.addPractice(r)
export const deletePractice: Backend['deletePractice'] = (id) => backend.deletePractice(id)
export const getSettings = () => backend.getSettings()
export const saveSettings: Backend['saveSettings'] = (s) => backend.saveSettings(s)
