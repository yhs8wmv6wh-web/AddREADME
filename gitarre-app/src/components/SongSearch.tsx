import { useRef, useState } from 'react'
import type { Song } from '../types'
import { getApiKey } from '../lib/apiKey'
import { ARTIFACT, UG_CLOUD } from '../lib/env'

interface Props {
  onFound: (song: Song) => Promise<void>
  onOpen: (id: string) => void
  onNeedKey: () => void
}

interface Job {
  query: string
  state: 'wartet' | 'sucht' | 'fertig' | 'fehler' | 'nicht gefunden'
  songId?: string
  error?: string
  detail?: string
  diag?: string
}

function splitQuery(q: string): [string, string] {
  const m = /^(.*?)\s+(?:–|—|-|von|by)\s+(.*)$/i.exec(q.trim())
  return m ? [m[1].trim(), m[2].trim()] : [q.trim(), '']
}

export function SongSearch({ onFound, onOpen, onNeedKey }: Props) {
  const [input, setInput] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [running, setRunning] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const update = (i: number, patch: Partial<Job>) => setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, ...patch } : j)))

  const run = async () => {
    const key = ARTIFACT ? 'claude' : getApiKey()
    if (!key) {
      onNeedKey()
      return
    }
    const queries = input
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 20)
    if (queries.length === 0) return
    const list: Job[] = queries.map((query) => ({ query, state: 'wartet' }))
    setJobs(list)
    setRunning(true)
    // SDK erst bei Bedarf laden (hält den Start der App schlank)
    const { toSong } = await import('../lib/songFormat')
    const { searchSongClaude, ClaudeSearchError } = await import('../lib/songSearchClaude')
    const web = import.meta.env.MODE === 'artifact' ? null : await import('../lib/songSearch')
    const isKnownError = (e: unknown) => e instanceof ClaudeSearchError || (web !== null && e instanceof web.SongSearchError)
    const ctrl = new AbortController()
    abort.current = ctrl
    for (let i = 0; i < list.length; i++) {
      if (ctrl.signal.aborted) break
      update(i, { state: 'sucht' })
      try {
        if (ARTIFACT) {
          // 1. Echte Daten von Ultimate Guitar (nur wenn freigeschaltet) (über eine Claude-Code-Cloud-Sitzung)
          const { fetchUltimateGuitar } = await import('../lib/ugCloud')
          const { ugToSong } = await import('../lib/songFormat')
          const [t, a] = splitQuery(list[i].query)
          let ugNote = ''
          try {
            if (!UG_CLOUD) throw new Error('nicht freigeschaltet')
            const results = await fetchUltimateGuitar(t, a, { signal: ctrl.signal, onStatus: (d) => update(i, { detail: d }) })
            const song = ugToSong(results, list[i].query)
            if (song) {
              await onFound(song)
              update(i, { state: 'fertig', songId: song.id, detail: 'von Ultimate Guitar' })
              continue
            }
            ugNote = 'Ultimate Guitar: nichts gefunden'
          } catch (e) {
            if (ctrl.signal.aborted) throw e
            ugNote = `Ultimate Guitar: ${(e as Error).message}`
          }
          // 2. Rückfall: Claude aus dem Gedächtnis
          if (UG_CLOUD) update(i, { detail: `${ugNote} – frage Claude …` })
          else ugNote = ''
          const r2 = await searchSongClaude(list[i].query, ctrl.signal)
          if (!r2 || !r2.found || !Array.isArray(r2.sections) || r2.sections.length === 0) {
            update(i, { state: 'nicht gefunden', detail: ugNote, diag: JSON.stringify(r2, null, 2).slice(0, 3000) })
            continue
          }
          const song2 = toSong(r2, list[i].query, false)
          await onFound(song2)
          update(i, { state: 'fertig', songId: song2.id, detail: `${ugNote} – aus Claudes Wissen` })
          continue
        }
        const r = web ? await web.searchSong(list[i].query, key, ctrl.signal) : await searchSongClaude(list[i].query, ctrl.signal)
        if (!r.found || r.sections.length === 0) {
          update(i, { state: 'nicht gefunden' })
          continue
        }
        const song = toSong(r, list[i].query, ARTIFACT ? (r.sources?.length ?? 0) > 0 : true)
        await onFound(song)
        update(i, { state: 'fertig', songId: song.id })
      } catch (err) {
        if (ctrl.signal.aborted) {
          update(i, { state: 'fehler', error: 'abgebrochen' })
          break
        }
        update(i, { state: 'fehler', error: isKnownError(err) ? (err as Error).message : 'Unbekannter Fehler' })
        if (isKnownError(err) && /Schlüssel|nicht erlaubt|nicht verfügbar/.test((err as Error).message)) break
      }
    }
    setRunning(false)
    setInput('')
  }

  return (
    <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
      <h3 className="font-semibold">Song automatisch suchen</h3>
      <p className="text-sm text-neutral-500 leading-relaxed">
        {ARTIFACT
          ? 'Titel und Interpret eingeben – Claude liefert Akkorde, Aufbau, Kapo und Schlagmuster und legt den Song an.'
          : 'Titel und Interpret eingeben – die KI sucht im Netz die Akkorde, den Aufbau, Kapo und Schlagmuster und legt den Song an.'}
        Mehrere Songs: einer pro Zeile.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={2}
        placeholder={'z. B. Wonderwall – Oasis\nHallelujah – Jeff Buckley'}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
        disabled={running}
      />
      {running ? (
        <button type="button" onClick={() => abort.current?.abort()} className="rounded-md border border-neutral-300 dark:border-neutral-700 py-2.5">
          Abbrechen
        </button>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={!input.trim()}
          className="rounded-md bg-amber-500 text-neutral-900 py-2.5 font-semibold disabled:opacity-40"
        >
          Suchen &amp; anlegen
        </button>
      )}
      {jobs.length > 0 && (
        <ul className="text-sm flex flex-col gap-1">
          {jobs.map((j, i) => (
            <li key={i} className="flex flex-col">
              <div className="flex justify-between gap-2">
              <span className="truncate">{j.query}</span>
              {j.state === 'fertig' && j.songId ? (
                <button type="button" onClick={() => onOpen(j.songId!)} className="text-teal-600 dark:text-teal-400 underline shrink-0">
                  öffnen
                </button>
              ) : (
                <span
                  className={`shrink-0 ${j.state === 'fehler' || j.state === 'nicht gefunden' ? 'text-red-600' : 'text-neutral-500'}`}
                  title={j.error}
                >
                  {j.state === 'sucht' ? j.detail || 'sucht …' : j.state === 'fehler' ? j.error : j.state}
                </span>
              )}
              </div>
              {j.diag && (
                <details className="text-xs text-neutral-500">
                  <summary className="cursor-pointer underline">Diagnose: Antwort von Claude</summary>
                  <pre className="whitespace-pre-wrap break-all bg-neutral-100 dark:bg-neutral-900 rounded p-2 mt-1 max-h-60 overflow-auto">{j.diag}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-500">
        {ARTIFACT
          ? 'Claude antwortet aus seinem Wissen, ohne Websuche. Bei bekannten Songs meist treffend, bei unbekannten unsicher – jeden Song kannst du danach bearbeiten.'
          : 'Ergebnis ist eine KI-Recherche mit Quellenangabe – Akkorde können von der Aufnahme abweichen. Kosten grob geschätzt: 10–30 Cent pro Song über deinen Anthropic-Schlüssel (Websuche + Modell).'}
      </p>
    </section>
  )
}
