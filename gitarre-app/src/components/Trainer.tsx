import { useEffect, useMemo, useRef, useState } from 'react'
import type { PracticeRecord } from '../types'
import { Metronome, audio, click, strum } from '../lib/audio'
import { getShape, LEARNING_PATH } from '../lib/chords'
import { chordName, displayChord, parseChord } from '../lib/music'
import { ChordDiagram } from './ChordDiagram'

export interface TrainerPreset {
  chords: string[]
  mode: 'metronome' | 'minute'
  bpm?: number
  /** Ändert sich bei jedem Aufruf, damit derselbe Preset erneut greift */
  nonce: number
}

interface Props {
  preset: TrainerPreset | null
  german: boolean
  known: string[]
  records: PracticeRecord[]
  onSave: (r: PracticeRecord) => void
  onDeleteRecord: (id: string) => void
}

const btn =
  'rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm active:bg-neutral-100 dark:active:bg-neutral-800'
const primary = 'rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-3 font-medium w-full'

export function Trainer({ preset, german, known, records, onSave, onDeleteRecord }: Props) {
  const [mode, setMode] = useState<'metronome' | 'minute'>(preset?.mode ?? 'metronome')
  const [chords, setChords] = useState<string[]>(preset?.chords ?? ['Em', 'G', 'D', 'C'])
  const [bpm, setBpm] = useState(preset?.bpm ?? 60)

  useEffect(() => {
    if (!preset) return
    setMode(preset.mode)
    setChords(preset.chords)
    if (preset.bpm) setBpm(preset.bpm)
  }, [preset])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 p-0.5 text-sm">
        {(['metronome', 'minute'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded py-2 ${mode === m ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium' : ''}`}
          >
            {m === 'metronome' ? 'Mit Metronom' : '1-Minuten-Wechsel'}
          </button>
        ))}
      </div>

      <ChordPicker chords={chords} onChange={setChords} german={german} known={known} max={mode === 'minute' ? 2 : 32} />

      {mode === 'metronome' ? (
        <MetronomeTrainer chords={chords} bpm={bpm} setBpm={setBpm} german={german} onSave={onSave} />
      ) : (
        <MinuteTrainer chords={chords.slice(0, 2)} german={german} records={records} onSave={onSave} />
      )}

      <History records={records} german={german} onDelete={onDeleteRecord} />
    </div>
  )
}

function ChordPicker({
  chords,
  onChange,
  german,
  known,
  max,
}: {
  chords: string[]
  onChange: (c: string[]) => void
  german: boolean
  known: string[]
  max: number
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const visible = chords.slice(0, max)

  const add = (raw: string) => {
    const names = raw.split(/[\s,]+/).filter(Boolean)
    const parsed: string[] = []
    for (const n of names) {
      const c = parseChord(n)
      if (!c || !getShape(n)) {
        setError(`„${n}" kenne ich nicht als Akkord.`)
        return
      }
      parsed.push(chordName(c))
    }
    setError(null)
    const next = [...visible, ...parsed]
    onChange(max === 2 ? next.slice(-2) : next.slice(0, max))
    setInput('')
  }

  const quick = useMemo(() => {
    const base = known.length >= 2 ? known : LEARNING_PATH[0].chords.concat(LEARNING_PATH[1].chords)
    return [...new Set(base)].slice(0, 14)
  }, [known])

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{max === 2 ? 'Akkordpaar' : 'Akkordfolge'}</h3>
        {visible.length > 0 && (
          <button type="button" className="text-sm text-neutral-500 underline" onClick={() => onChange([])}>
            leeren
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((c, i) => (
          <button
            key={i + c}
            type="button"
            onClick={() => onChange(visible.filter((_, j) => j !== i))}
            className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-3 py-1 text-sm font-semibold"
            aria-label={`${c} entfernen`}
          >
            {displayChord(c, german)} ×
          </button>
        ))}
        {visible.length === 0 && <span className="text-sm text-neutral-500">Noch keine Akkorde gewählt.</span>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) add(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Akkord eintippen, z. B. Am C G"
          className="flex-1 min-w-0 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <button type="submit" className={btn}>
          Hinzufügen
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-1">
        {quick.map((c) => (
          <button key={c} type="button" onClick={() => add(c)} className="rounded border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 text-sm">
            + {displayChord(c, german)}
          </button>
        ))}
      </div>
    </section>
  )
}

function MetronomeTrainer({
  chords,
  bpm,
  setBpm,
  german,
  onSave,
}: {
  chords: string[]
  bpm: number
  setBpm: (n: number) => void
  german: boolean
  onSave: (r: PracticeRecord) => void
}) {
  const [beatsPerChord, setBeatsPerChord] = useState(4)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(-1)
  const [playChord, setPlayChord] = useState(true)
  const [speedUp, setSpeedUp] = useState(false)
  const [currentBpm, setCurrentBpm] = useState(bpm)
  const metro = useRef<Metronome | null>(null)
  const currentBpmRef = useRef(bpm)
  const startedAt = useRef(0)
  const live = useRef({ chords, beatsPerChord, playChord, speedUp, bpm })
  live.current = { chords, beatsPerChord, playChord, speedUp, bpm }

  // Index des Akkords; der erste Takt ist Einzählen (-1)
  const chordIdx = beat < 0 ? -1 : Math.floor(beat / beatsPerChord) - 1
  const counting = running && chordIdx < 0
  const cur = chords.length ? chords[((chordIdx % chords.length) + chords.length) % chords.length] : null
  const shownCur = counting ? chords[0] : cur
  const next = chords.length ? chords[(Math.max(chordIdx, -1) + 1) % chords.length] : null
  const beatInBar = beat < 0 ? 0 : beat % beatsPerChord

  const stop = () => {
    metro.current?.stop()
    metro.current = null
    setRunning(false)
    const secs = Math.round((Date.now() - startedAt.current) / 1000)
    if (secs >= 30 && live.current.chords.length >= 2) {
      onSave({
        id: crypto.randomUUID(),
        date: Date.now(),
        kind: 'metronome',
        chords: live.current.chords,
        value: currentBpmRef.current,
        seconds: secs,
      })
    }
    setBeat(-1)
  }

  const start = () => {
    if (chords.length === 0) return
    audio()
    currentBpmRef.current = bpm
    setCurrentBpm(bpm)
    const m = new Metronome({
      bpm,
      beatsPerBar: beatsPerChord,
      onBeat: (b, when) => {
        const L = live.current
        const idx = Math.floor(b / L.beatsPerChord) - 1
        const first = b % L.beatsPerChord === 0
        if (first && idx >= 0 && L.playChord) {
          const s = getShape(L.chords[idx % L.chords.length])
          if (s) strum(s.frets, when)
        }
        // Automatisch schneller: alle 8 Wechsel +4 BPM (max. 200)
        if (first && idx > 0 && idx % 8 === 0 && L.speedUp) {
          currentBpmRef.current = Math.min(200, currentBpmRef.current + 4)
          m.setBpm(currentBpmRef.current)
          m.at(when, () => setCurrentBpm(currentBpmRef.current))
        }
        m.at(when, () => setBeat(b))
      },
    })
    metro.current = m
    startedAt.current = Date.now()
    setBeat(-1)
    setRunning(true)
    m.start()
  }

  useEffect(() => () => metro.current?.stop(), [])
  useEffect(() => {
    if (running && !speedUp) metro.current?.setBpm(bpm)
    if (!speedUp) {
      currentBpmRef.current = bpm
      setCurrentBpm(bpm)
    }
  }, [bpm, running, speedUp])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 w-12">Tempo</span>
        <button type="button" className={btn} onClick={() => setBpm(Math.max(30, bpm - 5))}>
          −5
        </button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-semibold tabular-nums">{running ? currentBpm : bpm}</span>
          <span className="text-sm text-neutral-500"> BPM</span>
        </div>
        <button type="button" className={btn} onClick={() => setBpm(Math.min(200, bpm + 5))}>
          +5
        </button>
      </div>
      <input type="range" min={30} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="accent-amber-500" aria-label="Tempo" />

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-neutral-500">Schläge pro Akkord</span>
        {[1, 2, 4, 8].map((n) => (
          <button
            key={n}
            type="button"
            disabled={running}
            onClick={() => setBeatsPerChord(n)}
            className={`${btn} ${beatsPerChord === n ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={playChord} onChange={(e) => setPlayChord(e.target.checked)} className="accent-amber-500 size-4" />
        Akkord beim Wechsel mitspielen
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={speedUp} onChange={(e) => setSpeedUp(e.target.checked)} className="accent-amber-500 size-4" />
        Automatisch schneller (alle 8 Wechsel +4 BPM)
      </label>

      {/* Anzeige */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex items-center justify-center gap-4 min-h-56">
        {shownCur ? (
          <>
            <div className="flex flex-col items-center">
              <span className="text-xs text-neutral-500 mb-1">{counting ? 'Einzählen …' : running ? 'Jetzt' : 'Start mit'}</span>
              <ChordDiagram chord={shownCur} size="lg" german={german} />
            </div>
            {chords.length > 1 && (
              <div className="flex flex-col items-center">
                <span className="text-xs text-neutral-500 mb-1">Als Nächstes</span>
                <ChordDiagram chord={running ? (counting ? chords[1 % chords.length] : next!) : chords[1]} size="md" german={german} highlight="next" />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">Wähle oben mindestens einen Akkord.</p>
        )}
      </div>
      <div className="flex justify-center gap-2" aria-hidden>
        {Array.from({ length: beatsPerChord }, (_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full ${
              running && beat >= 0 && i === beatInBar ? (i === 0 ? 'bg-amber-500 scale-125' : 'bg-neutral-700 dark:bg-neutral-300') : 'bg-neutral-200 dark:bg-neutral-800'
            } transition-transform`}
          />
        ))}
      </div>

      <button type="button" onClick={running ? stop : start} disabled={chords.length === 0} className={primary}>
        {running ? 'Stopp' : 'Start'}
      </button>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Tipp: Tempo so wählen, dass du jeden Wechsel sauber schaffst. Erst wenn es 3× hintereinander klappt, +5 BPM. Übungen ab
        30 Sekunden landen im Verlauf.
      </p>
    </section>
  )
}

function MinuteTrainer({
  chords,
  german,
  records,
  onSave,
}: {
  chords: string[]
  german: boolean
  records: PracticeRecord[]
  onSave: (r: PracticeRecord) => void
}) {
  const DURATION = 60
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'running' | 'done'>('idle')
  const [left, setLeft] = useState(DURATION)
  const [count, setCount] = useState(0)
  const timer = useRef<number | null>(null)
  const [a, b] = chords
  const key = pairKey(chords)
  const history = records.filter((r) => r.kind === 'minute' && pairKey(r.chords) === key)
  const best = history.reduce((m, r) => Math.max(m, r.value), 0)

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current)
  }, [])

  const start = () => {
    if (chords.length < 2) return
    audio()
    setCount(0)
    setPhase('countdown')
    let n = 3
    setLeft(n)
    const ac = audio()
    click(ac.currentTime + 0.01, false)
    timer.current = window.setInterval(() => {
      n--
      if (n > 0) {
        setLeft(n)
        click(audio().currentTime + 0.01, false)
        return
      }
      window.clearInterval(timer.current!)
      click(audio().currentTime + 0.01, true)
      const end = Date.now() + DURATION * 1000
      setLeft(DURATION)
      setPhase('running')
      timer.current = window.setInterval(() => {
        const s = Math.max(0, Math.ceil((end - Date.now()) / 1000))
        setLeft(s)
        if (s <= 0) {
          window.clearInterval(timer.current!)
          const t = audio().currentTime
          click(t + 0.01, true)
          click(t + 0.2, true)
          click(t + 0.4, true)
          setPhase('done')
        }
      }, 200)
    }, 1000)
  }

  const cancel = () => {
    if (timer.current) window.clearInterval(timer.current)
    setPhase('idle')
  }

  const save = () => {
    onSave({ id: crypto.randomUUID(), date: Date.now(), kind: 'minute', chords: [a, b], value: count, seconds: DURATION })
    setPhase('idle')
  }

  if (chords.length < 2)
    return <p className="text-sm text-neutral-500">Wähle oben genau zwei Akkorde. Dann so oft wie möglich in 60 Sekunden zwischen ihnen wechseln.</p>

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-center gap-4">
        <ChordDiagram chord={a} size="lg" german={german} />
        <ChordDiagram chord={b} size="lg" german={german} />
      </div>

      {phase === 'idle' && (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            60 Sekunden lang so oft wie möglich zwischen <strong>{displayChord(a, german)}</strong> und{' '}
            <strong>{displayChord(b, german)}</strong> wechseln und jedes Mal einmal anschlagen. Zählen kannst du selbst oder unten
            mittippen. {best > 0 && <>Dein Rekord: <strong>{best}</strong>.</>}
          </p>
          <button type="button" onClick={start} className={primary}>
            Start (3 – 2 – 1)
          </button>
        </>
      )}

      {(phase === 'countdown' || phase === 'running') && (
        <>
          <div className="text-center">
            <div className="text-6xl font-semibold tabular-nums">{left}</div>
            <div className="text-sm text-neutral-500">{phase === 'countdown' ? 'Gleich geht’s los' : 'Sekunden'}</div>
          </div>
          <button
            type="button"
            disabled={phase !== 'running'}
            onClick={() => setCount((c) => c + 1)}
            className="rounded-lg bg-amber-500 text-neutral-900 py-10 text-2xl font-semibold active:bg-amber-400 disabled:opacity-40"
          >
            Wechsel: {count}
            <div className="text-sm font-normal">hier tippen (optional)</div>
          </button>
          <button type="button" onClick={cancel} className={btn}>
            Abbrechen
          </button>
        </>
      )}

      {phase === 'done' && (
        <div className="flex flex-col gap-3 items-center">
          <p className="font-semibold">Zeit um! Wie viele Wechsel waren es?</p>
          <div className="flex items-center gap-3">
            <button type="button" className={btn} onClick={() => setCount((c) => Math.max(0, c - 1))}>
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 text-center text-3xl font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent py-1"
            />
            <button type="button" className={btn} onClick={() => setCount((c) => c + 1)}>
              +
            </button>
          </div>
          {count > best && best > 0 && <p className="text-teal-600 dark:text-teal-400 font-medium">Neuer Rekord (vorher {best}).</p>}
          <div className="flex gap-2 w-full">
            <button type="button" onClick={() => setPhase('idle')} className={btn + ' flex-1'}>
              Verwerfen
            </button>
            <button type="button" onClick={save} className={primary + ' flex-1'}>
              Speichern
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && <MiniChart values={history.slice(0, 12).reverse().map((r) => r.value)} />}
      <p className="text-xs text-neutral-500 leading-relaxed">
        Richtwert: Unter 30 Wechsel pro Minute ist der Wechsel noch nicht automatisch. Ab etwa 60 klappt er auch in Songs flüssig.
        Täglich 1–2 Durchgänge pro Paar bringen am meisten.
      </p>
    </section>
  )
}

function MiniChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div>
      <div className="text-xs text-neutral-500 mb-1">Verlauf (älteste links)</div>
      <div className="flex items-end gap-1 h-20">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] tabular-nums text-neutral-500">{v}</span>
            <div className="w-full rounded-t bg-amber-500" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function pairKey(chords: string[]): string {
  return [...chords].slice(0, 2).sort().join('|')
}

function History({ records, german, onDelete }: { records: PracticeRecord[]; german: boolean; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  if (records.length === 0) return null

  // Bestwerte je Paar (1-Minuten-Wechsel)
  const bests = new Map<string, { chords: string[]; best: number; last: number; n: number }>()
  for (const r of records) {
    if (r.kind !== 'minute') continue
    const k = pairKey(r.chords)
    const e = bests.get(k) ?? { chords: r.chords, best: 0, last: r.value, n: 0 }
    e.best = Math.max(e.best, r.value)
    e.n++
    bests.set(k, e)
  }
  const today = new Date().toDateString()
  const todayMinutes = Math.round(
    records.filter((r) => new Date(r.date).toDateString() === today).reduce((s, r) => s + r.seconds, 0) / 60,
  )
  const days = new Set(records.map((r) => new Date(r.date).toDateString()))
  let streak = 0
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    if (days.has(d.toDateString())) streak++
    else if (d.toDateString() !== today) break
    if (streak > 365) break
  }

  return (
    <section className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex flex-col gap-3">
      <h3 className="font-semibold">Fortschritt</h3>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 py-2">
          <div className="text-xl font-semibold">{todayMinutes} min</div>
          <div className="text-xs text-neutral-500">heute geübt</div>
        </div>
        <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 py-2">
          <div className="text-xl font-semibold">{streak}</div>
          <div className="text-xs text-neutral-500">{streak === 1 ? 'Tag' : 'Tage'} in Folge</div>
        </div>
      </div>
      {bests.size > 0 && (
        <div className="text-sm">
          <div className="text-neutral-500 mb-1">Rekorde 1-Minuten-Wechsel</div>
          {[...bests.values()]
            .sort((x, y) => x.best - y.best)
            .map((e) => (
              <div key={pairKey(e.chords)} className="flex justify-between py-0.5">
                <span>
                  {displayChord(e.chords[0], german)} ↔ {displayChord(e.chords[1], german)}
                </span>
                <span className="tabular-nums">
                  <strong>{e.best}</strong> <span className="text-neutral-500">({e.n}×)</span>
                </span>
              </div>
            ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm text-neutral-500 underline self-start">
        {open ? 'Verlauf ausblenden' : `Alle Einträge (${records.length})`}
      </button>
      {open && (
        <ul className="text-sm flex flex-col gap-1">
          {records.slice(0, 100).map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              <span className="text-neutral-500 tabular-nums shrink-0">{new Date(r.date).toLocaleDateString('de-DE')}</span>
              <span className="flex-1 truncate">{r.chords.map((c) => displayChord(c, german)).join(' – ')}</span>
              <span className="tabular-nums shrink-0">{r.kind === 'minute' ? `${r.value} Wechsel` : `${r.value} BPM · ${Math.round(r.seconds / 60)} min`}</span>
              <button type="button" onClick={() => onDelete(r.id)} className="text-neutral-400" aria-label="Eintrag löschen">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
