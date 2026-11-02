import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Song } from '../types'
import { chordSequence, parseSheet, renderTokenText, tokenChord, transitions, uniqueChords, type SheetLine } from '../lib/sheet'
import { displayChord, transposeChord } from '../lib/music'
import { gripScore, suggestCapo } from '../lib/capo'
import { getShape } from '../lib/chords'
import { strum } from '../lib/audio'
import { ChordDiagram } from './ChordDiagram'
import { parseTab, playTab } from '../lib/tabPlayer'
import { ARTIFACT } from '../lib/env'

interface Props {
  song: Song
  known: string[]
  german: boolean
  onBack: () => void
  onEdit: () => void
  onChange: (song: Song) => void
  onPractice: (chords: string[], mode: 'metronome' | 'minute', bpm?: number) => void
}

const btn =
  'rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-sm min-w-9 active:bg-neutral-100 dark:active:bg-neutral-800'

export function SongView({ song, known, german, onBack, onEdit, onChange, onPractice }: Props) {
  const sheet = useMemo(() => parseSheet(song.text), [song.text])
  // Angezeigt werden die GRIFFE: klingender Akkord minus Kapo.
  const shift = song.transpose - song.capo
  const sounding = useMemo(() => uniqueChords(chordSequence(sheet, song.transpose)), [sheet, song.transpose])
  const seq = useMemo(() => chordSequence(sheet, shift), [sheet, shift])
  const chords = useMemo(() => uniqueChords(seq), [seq])
  const trans = useMemo(() => transitions(seq), [seq])
  const capoTip = useMemo(() => suggestCapo(sounding), [sounding])
  const knownSet = new Set(known)
  const knownCount = chords.filter((c) => knownSet.has(c)).length

  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('gitarre.fontSize')) || 15)
  const [scrolling, setScrolling] = useState(false)
  const [speed, setSpeed] = useState(20)
  const [tabBpm, setTabBpm] = useState(song.bpm || 80)
  const [partsState, setPartsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [partsMsg, setPartsMsg] = useState<string | null>(null)
  const [partsDiag, setPartsDiag] = useState<string | null>(null)
  const [showDiag, setShowDiag] = useState(false)
  const partsAbort = useRef<AbortController | null>(null)
  const stopTabRef = useRef<(() => void) | null>(null)
  useEffect(() => () => stopTabRef.current?.(), [])
  const [popup, setPopup] = useState<string | null>(null)

  useEffect(() => localStorage.setItem('gitarre.fontSize', String(fontSize)), [fontSize])

  // Auto-Scroll
  const speedRef = useRef(speed)
  speedRef.current = speed
  useEffect(() => {
    if (!scrolling) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const step = (now: number) => {
      acc += ((now - last) / 1000) * speedRef.current
      last = now
      if (acc >= 1) {
        const px = Math.floor(acc)
        acc -= px
        window.scrollBy(0, px)
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
          setScrolling(false)
          return
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [scrolling])

  // Bildschirm während des Spielens anlassen (wo unterstützt)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])

  const set = (patch: Partial<Song>) => onChange({ ...song, ...patch, updatedAt: Date.now() })

  const loadParts = async () => {
    setPartsState('loading')
    setPartsMsg(null)
    setPartsDiag(null)
    const ctrl = new AbortController()
    partsAbort.current = ctrl
    try {
      const { searchPartsClaude } = await import('../lib/songSearchClaude')
      const { partsToText } = await import('../lib/songFormat')
      const { parts, sources, mode, raw } = await searchPartsClaude(song.title, song.artist, ctrl.signal)
      const text = partsToText(parts)
      if (!text) {
        setPartsState('idle')
        setPartsMsg(
          `Claude hat auf den Tab-Seiten keine Spuren gefunden (${mode === 'online' ? 'mit Browser' : 'ohne Websuche'}). Öffne die Tab-Seite über die Links unten und füge die Spur ein.`,
        )
        setPartsDiag(JSON.stringify(raw, null, 2).slice(0, 4000))
        return
      }
      const note = 'Tabs von Online-Tab-Seiten übernommen (siehe Quellen).'
      set({
        text: song.text.replace(/\s+$/, '') + '\n\n' + text,
        notes: [song.notes, note].filter(Boolean).join('\n'),
        sources: [...new Set([...(song.sources ?? []), ...sources.filter((u) => /^https?:\/\//.test(u))])].slice(0, 8),
      })
      setPartsState('idle')
      setPartsMsg(`${parts.length} Spur(en) unten im Song ergänzt.`)
    } catch (err) {
      setPartsState('error')
      setPartsMsg(err instanceof Error ? err.message : 'Fehler beim Laden der Spuren.')
      const e = err as { code?: string; message?: string; text?: string }
      setPartsDiag(JSON.stringify({ code: e?.code, message: e?.message, text: e?.text?.slice(0, 3000) }, null, 2))
    }
  }

  const [pasteName, setPasteName] = useState('Lead-Gitarre')
  const [pasteText, setPasteText] = useState('')
  const addPasted = () => {
    const lines = pasteText.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n').map((l) => l.replace(/\s+$/, ''))
    while (lines.length && !lines[0].trim()) lines.shift()
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
    if (lines.length === 0) return
    const name = (pasteName.trim() || 'Gitarre').replace(/[[\]]/g, '')
    set({ text: song.text.replace(/\s+$/, '') + '\n\n' + `[${name}]\n` + lines.join('\n') })
    setPasteText('')
    setPartsState('idle')
    setPartsDiag(null)
    setPartsMsg(`„${name}" unten im Song ergänzt – mit „Tab abspielen" anhören.`)
  }
  const q = encodeURIComponent([song.title, song.artist].filter(Boolean).join(' '))

  const startTab = (lines: string[], onCol: (c: number) => void) => {
    stopTabRef.current?.()
    const { events, width } = parseTab(lines)
    if (events.length === 0) return
    const stop = playTab(events, width, 60 / tabBpm / 4, (c) => {
      onCol(c)
      if (c < 0 && stopTabRef.current === stop) stopTabRef.current = null
    })
    stopTabRef.current = stop
  }
  const stopTab = () => {
    stopTabRef.current?.()
    stopTabRef.current = null
  }
  const showChord = (c: string) => {
    const s = getShape(c)
    if (s) strum(s.frets)
    setPopup(c)
  }

  // Zeilen zu Blöcken gruppieren (Akkord- + Textzeile scrollen gemeinsam waagerecht)
  const blocks = useMemo(() => {
    const out: SheetLine[][] = []
    let cur: SheetLine[] = []
    for (const l of sheet.lines) {
      if (l.kind === 'empty' || l.kind === 'section') {
        if (cur.length) out.push(cur)
        cur = []
        out.push([l])
      } else cur.push(l)
    }
    if (cur.length) out.push(cur)
    return out
  }, [sheet])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="text-sm text-neutral-500 mb-1">
            ← Songs
          </button>
          <h2 className="font-serif text-2xl leading-tight break-words">{song.title}</h2>
          {song.artist && <p className="text-neutral-500 dark:text-neutral-400">{song.artist}</p>}
        </div>
        <button type="button" onClick={onEdit} className={btn}>
          Bearbeiten
        </button>
      </div>

      {/* Steuerung */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stepper
          label="Tonart"
          value={song.transpose === 0 ? 'Original' : (song.transpose > 0 ? '+' : '') + song.transpose}
          onMinus={() => set({ transpose: song.transpose - 1 })}
          onPlus={() => set({ transpose: song.transpose + 1 })}
        />
        <Stepper
          label="Kapo"
          value={song.capo === 0 ? 'ohne' : `${song.capo}. Bund`}
          onMinus={() => set({ capo: Math.max(0, song.capo - 1) })}
          onPlus={() => set({ capo: Math.min(9, song.capo + 1) })}
        />
      </div>
      {sheet.capo !== undefined && sheet.capo > 0 && sheet.capo !== song.capo && (
        <button
          type="button"
          onClick={() => set({ capo: sheet.capo!, transpose: sheet.capo! })}
          className="text-left text-sm rounded-md bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 px-3 py-2"
        >
          Laut Vorlage wird mit Kapo im {sheet.capo}. Bund gespielt. Antippen zum Übernehmen – die Griffe bleiben dann genau wie
          im Text.
        </button>
      )}
      {capoTip.capo !== song.capo && capoTip.score < gripScore(sounding, song.capo) && chords.length > 0 && (
        <button
          type="button"
          onClick={() => set({ capo: capoTip.capo })}
          className="text-left text-sm rounded-md bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 px-3 py-2"
        >
          Tipp: Mit {capoTip.capo === 0 ? 'ohne Kapo' : `Kapo im ${capoTip.capo}. Bund`} brauchst du einfachere Griffe (
          {uniqueChords(sounding.map((c) => transposeChord(c, -capoTip.capo)))
            .map((c) => displayChord(c, german))
            .join(', ')}
          ). Antippen zum Übernehmen.
        </button>
      )}

      {/* Akkorde des Songs */}
      {chords.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-semibold">Griffe in diesem Song</h3>
            <span className="text-xs text-neutral-500">
              {knownCount}/{chords.length} kannst du schon
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 -mx-1 pb-1">
            {chords.map((c) => (
              <ChordDiagram key={c} chord={c} size="md" german={german} highlight={knownSet.has(c) ? 'known' : null} />
            ))}
          </div>
          {song.capo > 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              Gezeigt werden die Griffe mit Kapo im {song.capo}. Bund – es klingt {song.capo} Halbtöne höher.
            </p>
          )}
        </section>
      )}

      {/* Üben */}
      {chords.length > 1 && (
        <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <h3 className="font-semibold mb-2">Akkordwechsel üben</h3>
          <div className="flex flex-col gap-1.5">
            {trans.slice(0, 5).map((t) => (
              <div key={t.a + t.b} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{displayChord(t.a, german)}</strong> ↔ <strong>{displayChord(t.b, german)}</strong>
                  <span className="text-neutral-500"> · {t.count}× im Song</span>
                </span>
                <button type="button" className={btn} onClick={() => onPractice([t.a, t.b], 'minute')}>
                  1-Minute
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPractice(compressSeq(seq), 'metronome', song.bpm)}
            className="mt-3 w-full rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 font-medium"
          >
            Akkordfolge mit Metronom üben
          </button>
        </section>
      )}

      {(song.notes || song.sources?.length) && (
        <div className="text-sm rounded-md bg-neutral-100 dark:bg-neutral-900 px-3 py-2">
          {song.notes && <p className="whitespace-pre-wrap">{song.notes}</p>}
          {song.sources && song.sources.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500 break-all">
              Quellen:{' '}
              {song.sources.map((u, i) => (
                <span key={u}>
                  {i > 0 && ' · '}
                  <a href={u} target="_blank" rel="noreferrer" className="underline">
                    {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {song.title && (
        <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
          <h3 className="font-semibold">Echte Tabs: Riffs, Licks, Picking</h3>
          <p className="text-sm text-neutral-500">
            Original-Tabs von Lead-, Rhythmus- und zweiter Gitarre – zum Mitlesen und Anhören. Nur aus echten Tab-Seiten, nichts
            ausgedacht.
          </p>
          {!ARTIFACT ? null : partsState === 'loading' ? (
            <button type="button" onClick={() => partsAbort.current?.abort()} className={btn}>
              Sucht … (bis ~1 Min.) – Abbrechen
            </button>
          ) : (
            <button type="button" onClick={loadParts} className={btn}>
              Claude holt die Tabs online (Claude-Desktop-App)
            </button>
          )}
          {partsMsg && <p className={`text-sm ${partsState === 'error' ? 'text-red-600' : 'text-neutral-600 dark:text-neutral-400'}`}>{partsMsg}</p>}
          {partsDiag && (
            <div className="text-xs">
              <button type="button" className="underline text-neutral-500" onClick={() => setShowDiag((v) => !v)}>
                {showDiag ? 'Diagnose ausblenden' : 'Diagnose anzeigen'}
              </button>
              {showDiag && (
                <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-100 dark:bg-neutral-900 p-2">{partsDiag}</pre>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Überall (auch iPhone): Tab-Seite öffnen, gewünschte Spur markieren und kopieren, hier einfügen.
            </span>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}`} target="_blank" rel="noreferrer" className="underline text-sky-700 dark:text-sky-300">
                Ultimate Guitar: Tabs suchen
              </a>
              <a href={`https://www.songsterr.com/?pattern=${q}`} target="_blank" rel="noreferrer" className="underline text-sky-700 dark:text-sky-300">
                Songsterr (Spuren einzeln, zum Anhören)
              </a>
            </div>
            <input
              id="paste-name"
              value={pasteName}
              onChange={(e) => setPasteName(e.target.value)}
              placeholder="Spur, z. B. Lead-Gitarre, Intro-Riff, Gitarre 2"
              className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            />
            <textarea
              id="paste-tab"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder={'Tab hier einfügen, z. B.\ne|-------0---|\nB|-----1---1-|\n…'}
              className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 font-mono text-xs whitespace-pre overflow-x-auto"
            />
            <button type="button" onClick={addPasted} disabled={!pasteText.trim()} className={btn + ' disabled:opacity-40'}>
              Tab zum Song hinzufügen
            </button>
          </div>
        </section>
      )}

      {sheet.lines.some((l) => l.kind === 'tab') && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-neutral-500">Tab-Tempo</span>
          <button type="button" className={btn} onClick={() => setTabBpm((b) => Math.max(30, b - 10))}>
            −10
          </button>
          <span className="tabular-nums font-medium w-16 text-center">{tabBpm} BPM</span>
          <button type="button" className={btn} onClick={() => setTabBpm((b) => Math.min(240, b + 10))}>
            +10
          </button>
          <span className="text-xs text-neutral-500">ein „-“ ≈ eine Sechzehntel</span>
        </div>
      )}

      {/* Anzeige-Optionen */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-neutral-500">Schrift</span>
        <button type="button" className={btn} onClick={() => setFontSize((f) => Math.max(10, f - 1))}>
          A−
        </button>
        <button type="button" className={btn} onClick={() => setFontSize((f) => Math.min(28, f + 1))}>
          A+
        </button>
        <span className="text-neutral-500 ml-2">Scrollen</span>
        <button type="button" className={btn} onClick={() => setScrolling((s) => !s)}>
          {scrolling ? 'Stopp' : 'Start'}
        </button>
        <input
          type="range"
          min={5}
          max={80}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-24 accent-amber-500"
          aria-label="Scroll-Geschwindigkeit"
        />
      </div>

      {/* Songtext */}
      <div className="font-mono leading-snug" style={{ fontSize }}>
        {blocks.map((block, bi) => {
          const first = block[0]
          if (block.length === 1 && first.kind === 'empty') return <div key={bi} className="h-[1em]" />
          if (block.length === 1 && first.kind === 'section')
            return (
              <div key={bi} className="font-sans font-semibold text-sm uppercase tracking-wide text-neutral-500 mt-3 mb-1">
                {first.text}
              </div>
            )
          const tabLines = block.filter((l): l is Extract<SheetLine, { kind: 'tab' }> => l.kind === 'tab').map((l) => l.text)
          if (tabLines.length >= 2)
            return <TabBlock key={bi} block={block} tabLines={tabLines} shift={shift} german={german} onChord={showChord} onPlay={startTab} onStop={stopTab} />
          return (
            <div key={bi} className="overflow-x-auto whitespace-pre -mx-4 px-4">
              {block.map((l, li) => (
                <Line key={li} line={l} shift={shift} german={german} onChord={showChord} />
              ))}
            </div>
          )
        })}
      </div>

      {sheet.lines.some((l) => l.kind === 'tab') && shift !== 0 && (
        <p className="text-xs text-neutral-500">Hinweis: Tabs werden nicht transponiert – sie gelten für die Originaltonart ohne Kapo.</p>
      )}

      {popup && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end justify-center" onClick={() => setPopup(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-t-xl w-full max-w-2xl p-4 pb-8 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <ChordDiagram chord={popup} size="lg" german={german} />
            <p className="text-xs text-neutral-500 mt-1">Antippen zum Anhören</p>
            <button type="button" onClick={() => setPopup(null)} className={btn + ' mt-3'}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Für den Metronom-Trainer: direkte Wiederholungen entfernen, max. 32 Akkorde. */
function compressSeq(seq: string[]): string[] {
  const out: string[] = []
  for (const c of seq) if (out[out.length - 1] !== c) out.push(c)
  // Wiederholt sich die ganze Folge (z. B. Strophe = Strophe), nur den ersten Durchlauf
  for (let len = 2; len <= out.length / 2; len++) {
    let rep = true
    for (let i = len; i < out.length; i++) if (out[i] !== out[i % len]) rep = false
    if (rep) return out.slice(0, len)
  }
  return out.slice(0, 32)
}

function TabBlock({
  block,
  tabLines,
  shift,
  german,
  onChord,
  onPlay,
  onStop,
}: {
  block: SheetLine[]
  tabLines: string[]
  shift: number
  german: boolean
  onChord: (c: string) => void
  onPlay: (lines: string[], onCol: (c: number) => void) => void
  onStop: () => void
}) {
  const [col, setCol] = useState(-1)
  const playing = col >= 0
  return (
    <div className="my-1">
      <button
        type="button"
        onClick={() => (playing ? onStop() : onPlay(tabLines, setCol))}
        className="font-sans text-xs rounded border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 px-2 py-0.5 mb-1"
      >
        {playing ? 'Stopp' : 'Tab abspielen'}
      </button>
      <div className="overflow-x-auto whitespace-pre -mx-4 px-4">
        <div className="relative inline-block min-w-full">
          {block.map((l, li) => (
            <Line key={li} line={l} shift={shift} german={german} onChord={onChord} />
          ))}
          {playing && (
            <div className="absolute top-0 bottom-0 w-[1ch] bg-amber-400/40 pointer-events-none" style={{ left: `${col}ch` }} aria-hidden />
          )}
        </div>
      </div>
    </div>
  )
}

function Line({ line, shift, german, onChord }: { line: SheetLine; shift: number; german: boolean; onChord: (c: string) => void }) {
  if (line.kind === 'lyrics') return <div>{line.text || ' '}</div>
  if (line.kind === 'tab') return <div className="text-sky-700 dark:text-sky-300">{line.text}</div>
  if (line.kind !== 'chords') return null

  // Akkorde an ihre Originalspalte setzen; wenn ein Name länger wird, rutscht der nächste nach.
  const parts: ReactNode[] = []
  let pos = 0
  line.tokens.forEach((t, i) => {
    const col = Math.max(t.col, pos === 0 ? 0 : pos + 1)
    if (col > pos) parts.push(' '.repeat(col - pos))
    const text = t.chord ? displayChord(renderTokenText(t, shift), german) : t.text
    if (t.chord) {
      const c = tokenChord(t, shift)
      parts.push(
        <button key={i} type="button" onClick={() => onChord(c)} className="font-bold text-amber-600 dark:text-amber-400 font-mono">
          {text}
        </button>,
      )
    } else parts.push(<span key={i} className="text-neutral-500">{text}</span>)
    pos = col + text.length
  })
  return <div>{parts}</div>
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5">
      <button type="button" onClick={onMinus} className="px-2 text-lg leading-none" aria-label={`${label} runter`}>
        −
      </button>
      <div className="text-center leading-tight">
        <div className="text-[11px] text-neutral-500">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
      <button type="button" onClick={onPlus} className="px-2 text-lg leading-none" aria-label={`${label} hoch`}>
        +
      </button>
    </div>
  )
}
