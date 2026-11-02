import { useEffect, useRef, useState } from 'react'
import { audio, pluckString } from '../lib/audio'
import { detectPitch, freqToMidi } from '../lib/pitch'
import { NOTE_NAMES, STANDARD_TUNING_MIDI, STRING_NAMES, displayChord } from '../lib/music'

interface Reading {
  freq: number
  note: string
  cents: number
  string: number
  stringCents: number
}

export function Tuner({ german }: { german: boolean }) {
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const ac = audio()
      const src = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 4096
      src.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let raf = 0
      let smooth: number | null = null
      let lastSeen = 0
      const loop = () => {
        analyser.getFloatTimeDomainData(buf)
        const f = detectPitch(buf, ac.sampleRate)
        const now = performance.now()
        if (f && f > 60 && f < 1100) {
          smooth = smooth && Math.abs(f - smooth) / smooth < 0.03 ? smooth * 0.7 + f * 0.3 : f
          lastSeen = now
          const midi = freqToMidi(smooth)
          const nearest = Math.round(midi)
          // Nächste Gitarrensaite
          let best = 0
          STANDARD_TUNING_MIDI.forEach((m, i) => {
            if (Math.abs(midi - m) < Math.abs(midi - STANDARD_TUNING_MIDI[best])) best = i
          })
          setReading({
            freq: smooth,
            note: NOTE_NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1),
            cents: Math.round((midi - nearest) * 100),
            string: best,
            stringCents: Math.round((midi - STANDARD_TUNING_MIDI[best]) * 100),
          })
        } else if (now - lastSeen > 1500) {
          setReading(null)
          smooth = null
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      stopRef.current = () => {
        cancelAnimationFrame(raf)
        src.disconnect()
        stream.getTracks().forEach((t) => t.stop())
      }
      setActive(true)
    } catch {
      setError('Kein Zugriff aufs Mikrofon. Bitte in den Einstellungen des Browsers erlauben.')
    }
  }

  const stop = () => {
    stopRef.current?.()
    stopRef.current = null
    setActive(false)
    setReading(null)
  }

  const cents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0
  const inTune = reading !== null && Math.abs(reading.cents) <= 5
  const stringOff = reading ? reading.stringCents : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col items-center gap-3">
        <div className={`text-6xl font-semibold tabular-nums ${inTune ? 'text-teal-600 dark:text-teal-400' : ''}`}>
          {reading ? displayChord(reading.note.replace(/\d+$/, ''), german) : '–'}
          <span className="text-2xl text-neutral-400">{reading ? reading.note.match(/\d+$/)?.[0] : ''}</span>
        </div>
        <div className="text-sm text-neutral-500 tabular-nums h-5">{reading ? `${reading.freq.toFixed(1)} Hz · ${reading.cents > 0 ? '+' : ''}${reading.cents} Cent` : active ? 'Spiel eine Saite an …' : ''}</div>
        {/* Zeiger */}
        <div className="relative w-full h-10">
          <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-300 dark:bg-neutral-700" />
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -ml-px bg-teal-500" />
          {[-50, -25, 25, 50].map((c) => (
            <div key={c} className="absolute top-3 bottom-3 w-px bg-neutral-300 dark:bg-neutral-700" style={{ left: `${50 + c}%` }} />
          ))}
          {reading && (
            <div
              className={`absolute top-1 bottom-1 w-1.5 -ml-0.75 rounded-full transition-[left] duration-100 ${inTune ? 'bg-teal-500' : 'bg-amber-500'}`}
              style={{ left: `${50 + cents}%` }}
            />
          )}
        </div>
        <div className="flex justify-between w-full text-xs text-neutral-500">
          <span>zu tief</span>
          <span>zu hoch</span>
        </div>
        {reading && Math.abs(stringOff) < 300 && (
          <p className="text-sm">
            Saite <strong>{stringLabel(reading.string, german)}</strong>:{' '}
            {Math.abs(stringOff) <= 5 ? 'gestimmt' : stringOff < 0 ? 'höher drehen (spannen)' : 'tiefer drehen (lockern)'}
          </p>
        )}
        <button
          type="button"
          onClick={active ? stop : start}
          className="w-full rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-3 font-medium"
        >
          {active ? 'Stimmgerät aus' : 'Stimmgerät starten (Mikrofon)'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <section>
        <h3 className="font-semibold mb-1">Referenztöne (Standardstimmung)</h3>
        <p className="text-sm text-neutral-500 mb-2">Antippen spielt die leere Saite. Von tief nach hoch: {STRING_NAMES.map((_, i) => stringLabel(i, german)).join(' ')}.</p>
        <div className="grid grid-cols-6 gap-1.5">
          {STRING_NAMES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pluckString(i)}
              className={`rounded-md border py-3 font-semibold ${
                reading?.string === i ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              {stringLabel(i, german)}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function stringLabel(i: number, german: boolean): string {
  return german ? STRING_NAMES[i] : STRING_NAMES[i].replace('H', 'B')
}
