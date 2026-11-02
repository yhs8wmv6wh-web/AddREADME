import { useMemo, useState } from 'react'
import type { Song } from '../types'
import { chordSequence, parseSheet, uniqueChords } from '../lib/sheet'
import { displayChord } from '../lib/music'
import { SongSearch } from './SongSearch'

interface Props {
  songs: Song[]
  known: string[]
  german: boolean
  onOpen: (id: string) => void
  onAdd: () => void
  onFound: (song: Song) => Promise<void>
  onNeedKey: () => void
}

export function SongList({ songs, known, german, onOpen, onAdd, onFound, onNeedKey }: Props) {
  const [q, setQ] = useState('')
  const [onlyPlayable, setOnlyPlayable] = useState(false)
  const knownSet = useMemo(() => new Set(known), [known])

  const items = useMemo(
    () =>
      songs.map((s) => {
        const chords = uniqueChords(chordSequence(parseSheet(s.text), s.transpose - s.capo))
        const missing = chords.filter((c) => !knownSet.has(c))
        return { song: s, chords, missing }
      }),
    [songs, knownSet],
  )

  const filtered = items.filter(({ song, missing, chords }) => {
    if (onlyPlayable && (missing.length > 0 || chords.length === 0)) return false
    if (!q.trim()) return true
    const t = q.toLocaleLowerCase('de')
    return song.title.toLocaleLowerCase('de').includes(t) || song.artist.toLocaleLowerCase('de').includes(t)
  })

  return (
    <div className="flex flex-col gap-4">
      <SongSearch onFound={onFound} onOpen={onOpen} onNeedKey={onNeedKey} />
      <button
        type="button"
        onClick={onAdd}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 py-2.5 text-sm"
      >
        + Song von Hand einfügen
      </button>

      {songs.length > 3 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suchen (Titel oder Interpret)"
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
        />
      )}
      {known.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyPlayable} onChange={(e) => setOnlyPlayable(e.target.checked)} className="accent-teal-600 size-4" />
          Nur Songs, deren Griffe ich alle kann
        </label>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {filtered.map(({ song, chords, missing }) => (
          <li key={song.id}>
            <button type="button" onClick={() => onOpen(song.id)} className="w-full text-left py-3 flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium truncate">{song.title}</span>
                {chords.length > 0 && known.length > 0 && (
                  <span
                    className={`text-xs shrink-0 ${missing.length === 0 ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-neutral-500'}`}
                  >
                    {missing.length === 0 ? 'spielbar' : `${missing.length} neu`}
                  </span>
                )}
              </div>
              {song.artist && <span className="text-sm text-neutral-500 truncate">{song.artist}</span>}
              {chords.length > 0 && (
                <span className="text-xs font-mono truncate">
                  {chords.slice(0, 10).map((c, i) => (
                    <span key={c} className={knownSet.has(c) ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}>
                      {i > 0 && ' '}
                      {displayChord(c, german)}
                    </span>
                  ))}
                  {chords.length > 10 && ' …'}
                  {song.capo > 0 && <span className="text-neutral-500"> · Kapo {song.capo}</span>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className="text-center text-sm text-neutral-500 py-6">Keine Songs gefunden.</p>}

      <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 px-3 py-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
        <strong>Von Hand:</strong> Akkorde/Tab-Text z. B. von Ultimate Guitar kopieren und über „Song von Hand einfügen"
        einfügen. Die App erkennt Akkordzeilen, Tabs und
        Abschnitte automatisch – dann kannst du transponieren, Kapo umrechnen lassen und die Wechsel gezielt üben.
      </div>
    </div>
  )
}
