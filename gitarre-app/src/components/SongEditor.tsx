import { useMemo, useState } from 'react'
import type { Song } from '../types'
import { chordSequence, parseSheet, uniqueChords } from '../lib/sheet'
import { getShape } from '../lib/chords'
import { displayChord } from '../lib/music'

interface Props {
  song: Song | null
  german: boolean
  onSave: (song: Song) => void
  onCancel: () => void
  onDelete?: () => void
}

const field = 'rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 w-full'

const PLACEHOLDER = `Hier Akkorde + Text oder Tabs einfügen, z. B.:

[Strophe]
Am          C
Erste Zeile Text
G           F
Zweite Zeile Text

oder ChordPro:  [Am]Erste [C]Zeile

oder Tab:
e|-----0---|
B|---1---1-|`

export function SongEditor({ song, german, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(song?.title ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [text, setText] = useState(song?.text ?? '')
  const [bpm, setBpm] = useState(song?.bpm ? String(song.bpm) : '')
  const [notes, setNotes] = useState(song?.notes ?? '')

  const sheet = useMemo(() => parseSheet(text), [text])
  const chords = useMemo(() => uniqueChords(chordSequence(sheet, 0)), [sheet])
  const tabLines = sheet.lines.filter((l) => l.kind === 'tab').length
  const unknown = chords.filter((c) => !getShape(c))

  const effectiveTitle = title.trim() || sheet.title || ''

  const save = () => {
    const now = Date.now()
    onSave({
      id: song?.id ?? crypto.randomUUID(),
      title: effectiveTitle || 'Ohne Titel',
      artist: artist.trim() || sheet.artist || '',
      text,
      transpose: song?.transpose ?? (sheet.capo ?? 0),
      capo: song?.capo ?? (sheet.capo ?? 0),
      bpm: Number(bpm) > 0 ? Math.round(Number(bpm)) : undefined,
      notes: notes.trim() || undefined,
      example: song?.example,
      createdAt: song?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-2xl">{song ? 'Song bearbeiten' : 'Neuer Song'}</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={sheet.title || 'Titel'} className={field} />
      <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={sheet.artist || 'Interpret'} className={field} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={16}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className={field + ' font-mono text-sm leading-snug whitespace-pre overflow-x-auto'}
      />

      <div className="text-sm rounded-md bg-neutral-100 dark:bg-neutral-900 px-3 py-2 leading-relaxed">
        {text.trim() === '' ? (
          <span className="text-neutral-500">Erkannt wird alles automatisch, sobald du Text einfügst.</span>
        ) : (
          <>
            <div>
              <strong>{chords.length}</strong> Akkorde erkannt
              {chords.length > 0 && (
                <span className="font-mono text-amber-600 dark:text-amber-400"> {chords.map((c) => displayChord(c, german)).join(' ')}</span>
              )}
            </div>
            {tabLines > 0 && (
              <div>
                <strong>{tabLines}</strong> Tab-Zeilen erkannt
              </div>
            )}
            {sheet.capo !== undefined && <div>Kapo laut Vorlage: {sheet.capo}. Bund (wird übernommen)</div>}
            {unknown.length > 0 && <div className="text-red-600">Ohne Griffbild: {unknown.join(', ')}</div>}
            {chords.length === 0 && tabLines === 0 && (
              <div className="text-neutral-500">
                Keine Akkorde gefunden. Akkorde müssen in einer eigenen Zeile über dem Text stehen oder in eckigen Klammern: [Am].
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          value={bpm}
          onChange={(e) => setBpm(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="BPM"
          className={field}
          aria-label="Tempo in BPM (optional)"
        />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notiz, z. B. Schlagmuster" className={field + ' col-span-2'} />
      </div>

      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 py-2.5">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!text.trim()}
          className="flex-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 font-medium disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => {
            if (confirm(`„${song?.title}" wirklich löschen?`)) onDelete()
          }}
          className="text-sm text-red-600 underline self-center mt-4"
        >
          Song löschen
        </button>
      )}
    </div>
  )
}
