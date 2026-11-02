import { useState } from 'react'
import { ALL_ROOTS, LEARNING_PATH, LIBRARY_QUALITIES, getShape } from '../lib/chords'
import { chordName, displayChord, parseChord } from '../lib/music'
import { ChordDiagram } from './ChordDiagram'

interface Props {
  known: string[]
  german: boolean
  onToggleKnown: (chord: string) => void
  onPractice: (chords: string[]) => void
}

export function ChordLibrary({ known, german, onToggleKnown, onPractice }: Props) {
  const [tab, setTab] = useState<'path' | 'all'>('path')
  const [root, setRoot] = useState('C')
  const [query, setQuery] = useState('')
  const knownSet = new Set(known)

  const parsed = query.trim() ? parseChord(query.trim()) : null
  const searchName = parsed ? chordName(parsed) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 p-0.5 text-sm">
        {(
          [
            ['path', 'Lernpfad'],
            ['all', 'Alle Akkorde'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 rounded py-2 ${tab === k ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Akkord suchen, z. B. F#m7 oder Cadd9"
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
        autoCorrect="off"
        autoCapitalize="characters"
      />
      {query.trim() && (
        <div className="flex flex-col items-center gap-2">
          {searchName && getShape(searchName) ? (
            <>
              <ChordDiagram chord={searchName} size="lg" german={german} />
              <KnownToggle chord={searchName} known={knownSet.has(searchName)} onToggle={onToggleKnown} />
            </>
          ) : (
            <p className="text-sm text-neutral-500">Kein Griff für „{query.trim()}" gefunden.</p>
          )}
        </div>
      )}

      {tab === 'path' ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Arbeite dich Stufe für Stufe vor. Markiere Griffe als <strong>„kann ich"</strong>, sobald alle Saiten sauber klingen –
            die Songliste zeigt dir dann, welche Songs du schon spielen kannst. Zahlen in den Punkten = Finger (1 Zeige- bis 4
            kleiner Finger), × = Saite nicht anschlagen, ○ = leere Saite.
          </p>
          {LEARNING_PATH.map((stage) => {
            const done = stage.chords.filter((c) => knownSet.has(c)).length
            return (
              <section key={stage.title}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold">{stage.title}</h3>
                  <span className="text-xs text-neutral-500">
                    {done}/{stage.chords.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {stage.chords.map((c) => (
                    <div key={c} className="flex flex-col items-center">
                      <ChordDiagram chord={c} size="md" german={german} highlight={knownSet.has(c) ? 'known' : null} />
                      <KnownToggle chord={c} known={knownSet.has(c)} onToggle={onToggleKnown} />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onPractice(stage.chords.slice(0, 4))}
                  className="mt-2 text-sm text-neutral-500 underline"
                >
                  Diese Griffe im Trainer üben
                </button>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1">
            {ALL_ROOTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoot(r)}
                className={`rounded-md px-2.5 py-1.5 text-sm min-w-10 border ${
                  root === r ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 font-semibold' : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {displayChord(r, german)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LIBRARY_QUALITIES.map((q) => {
              const c = root + q.suffix
              return (
                <div key={c} className="flex flex-col items-center">
                  <span className="text-[11px] text-neutral-500">{q.label}</span>
                  <ChordDiagram chord={c} size="md" german={german} highlight={knownSet.has(c) ? 'known' : null} />
                  <KnownToggle chord={c} known={knownSet.has(c)} onToggle={onToggleKnown} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function KnownToggle({ chord, known, onToggle }: { chord: string; known: boolean; onToggle: (c: string) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
      <input type="checkbox" checked={known} onChange={() => onToggle(chord)} className="accent-teal-600 size-3.5" />
      kann ich
    </label>
  )
}
