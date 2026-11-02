import { useEffect, useState, type ReactNode } from 'react'
import type { PracticeRecord, Settings, Song } from './types'
import {
  addPractice,
  deletePractice,
  deleteSong,
  getAllSongs,
  getPractice,
  getSettings,
  requestPersistentStorage,
  saveSettings,
  saveSong,
  type StorageStatus,
} from './db'
import { SongList } from './components/SongList'
import { SongView } from './components/SongView'
import { SongEditor } from './components/SongEditor'
import { Trainer, type TrainerPreset } from './components/Trainer'
import { ChordLibrary } from './components/ChordLibrary'
import { Tuner } from './components/Tuner'
import { StorageNotice } from './components/StorageNotice'
import { BackupBar } from './components/BackupBar'
import { UpdatePrompt } from './components/UpdatePrompt'

type Tab = 'songs' | 'ueben' | 'akkorde' | 'stimmen' | 'mehr'

const TABS: { key: Tab; label: string }[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'ueben', label: 'Üben' },
  { key: 'akkorde', label: 'Akkorde' },
  { key: 'stimmen', label: 'Stimmen' },
  { key: 'mehr', label: 'Mehr' },
]

function detectStandalone(): boolean {
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  return iosStandalone || displayMode
}

function App() {
  const [loaded, setLoaded] = useState(false)
  const [songs, setSongs] = useState<Song[]>([])
  const [records, setRecords] = useState<PracticeRecord[]>([])
  const [settings, setSettings] = useState<Settings>({ known: [], german: false })
  const [tab, setTab] = useState<Tab>('songs')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Song | 'new' | null>(null)
  const [preset, setPreset] = useState<TrainerPreset | null>(null)
  const [standalone] = useState(detectStandalone)
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)

  const reload = async () => {
    const [s, p, st] = await Promise.all([getAllSongs(), getPractice(), getSettings()])
    setSongs(s)
    setRecords(p)
    setSettings(st)
  }

  useEffect(() => {
    requestPersistentStorage().then(setStorageStatus)
    reload().then(() => setLoaded(true))
  }, [])

  const goTab = (t: Tab) => {
    setTab(t)
    setEditing(null)
    if (t !== 'songs') setOpenId(null)
    window.scrollTo(0, 0)
  }

  const updateSong = async (song: Song) => {
    setSongs((prev) => [song, ...prev.filter((s) => s.id !== song.id)])
    await saveSong(song)
  }

  const updateSettings = async (s: Settings) => {
    setSettings(s)
    await saveSettings(s)
  }

  const toggleKnown = (chord: string) => {
    const known = settings.known.includes(chord) ? settings.known.filter((c) => c !== chord) : [...settings.known, chord]
    void updateSettings({ ...settings, known })
  }

  const practice = (chords: string[], mode: 'metronome' | 'minute', bpm?: number) => {
    setPreset({ chords, mode, bpm, nonce: Date.now() })
    goTab('ueben')
  }

  const openSong = songs.find((s) => s.id === openId) ?? null

  let content: ReactNode
  if (!loaded) content = <p className="text-center text-neutral-500 py-16">Lädt …</p>
  else if (tab === 'songs') {
    if (editing)
      content = (
        <SongEditor
          song={editing === 'new' ? null : editing}
          german={settings.german}
          onCancel={() => setEditing(null)}
          onSave={async (s) => {
            await updateSong(s)
            setEditing(null)
            setOpenId(s.id)
            window.scrollTo(0, 0)
          }}
          onDelete={
            editing !== 'new'
              ? async () => {
                  await deleteSong(editing.id)
                  setSongs((prev) => prev.filter((s) => s.id !== editing.id))
                  setEditing(null)
                  setOpenId(null)
                }
              : undefined
          }
        />
      )
    else if (openSong)
      content = (
        <SongView
          song={openSong}
          known={settings.known}
          german={settings.german}
          onBack={() => setOpenId(null)}
          onEdit={() => setEditing(openSong)}
          onChange={updateSong}
          onPractice={practice}
        />
      )
    else
      content = (
        <SongList
          songs={songs}
          known={settings.known}
          german={settings.german}
          onOpen={(id) => {
            setOpenId(id)
            window.scrollTo(0, 0)
          }}
          onAdd={() => setEditing('new')}
        />
      )
  } else if (tab === 'ueben')
    content = (
      <Trainer
        preset={preset}
        german={settings.german}
        known={settings.known}
        records={records}
        onSave={async (r) => {
          await addPractice(r)
          setRecords((prev) => [r, ...prev])
        }}
        onDeleteRecord={async (id) => {
          await deletePractice(id)
          setRecords((prev) => prev.filter((r) => r.id !== id))
        }}
      />
    )
  else if (tab === 'akkorde')
    content = (
      <ChordLibrary
        known={settings.known}
        german={settings.german}
        onToggleKnown={toggleKnown}
        onPractice={(c) => practice(c, 'metronome')}
      />
    )
  else if (tab === 'stimmen') content = <Tuner german={settings.german} />
  else
    content = (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl">Einstellungen</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.german}
              onChange={(e) => void updateSettings({ ...settings, german: e.target.checked })}
              className="accent-amber-500 size-4"
            />
            Deutsche Notenbezeichnung (H statt B, B statt Bb)
          </label>
          <p className="text-xs text-neutral-500">
            Betrifft nur die Anzeige. Beim Einfügen versteht die App beide Schreibweisen.
          </p>
        </section>
        <section className="flex flex-col gap-2 text-sm leading-relaxed">
          <h2 className="font-serif text-xl">So übst du am besten</h2>
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>Gitarre stimmen (Tab „Stimmen").</li>
            <li>Lieblingssong einfügen und schauen, welche Griffe fehlen.</li>
            <li>Kapo-Tipp nutzen, falls der Song Barrés hat.</li>
            <li>Die häufigsten Wechsel des Songs im 1-Minuten-Trainer üben – täglich 1–2 Runden pro Paar.</li>
            <li>Dann die ganze Akkordfolge mit Metronom: langsam starten, erst steigern, wenn es sauber klingt.</li>
            <li>Zum Schluss den Song mit Auto-Scroll durchspielen.</li>
          </ol>
          <p className="text-neutral-500">Lieber jeden Tag 15 Minuten als einmal pro Woche zwei Stunden.</p>
        </section>
        <StorageNotice status={storageStatus} standalone={standalone} />
        <BackupBar
          onImported={async (n) => {
            await reload()
            alert(`${n} Songs aus dem Backup geladen.`)
          }}
        />
      </div>
    )

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-950/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-serif text-xl max-w-2xl mx-auto">Gitarre üben</h1>
      </header>

      <main className="flex-1 px-4 py-5 pb-28 max-w-2xl w-full mx-auto">{content}</main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => goTab(t.key)}
              className={`flex-1 rounded-md py-2.5 text-sm ${
                tab === t.key ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <UpdatePrompt />
    </div>
  )
}

export default App
