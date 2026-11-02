// Klang: gezupfte Saiten (Karplus-Strong) und Metronom-Klick über Web Audio.
import { STANDARD_TUNING_MIDI, midiToFreq } from './music'

let ctx: AudioContext | null = null

export function audio(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const bufferCache = new Map<number, AudioBuffer>()

function pluckBuffer(freq: number): AudioBuffer {
  const key = Math.round(freq * 10)
  const cached = bufferCache.get(key)
  if (cached) return cached
  const ac = audio()
  const sr = ac.sampleRate
  const length = Math.floor(sr * 2.2)
  const buf = ac.createBuffer(1, length, sr)
  const data = buf.getChannelData(0)
  const period = Math.max(2, Math.round(sr / freq))
  const ring = new Float32Array(period)
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1
  // Etwas Tiefpass auf das Anfangsrauschen -> weicherer Anschlag
  for (let i = 1; i < period; i++) ring[i] = 0.5 * (ring[i] + ring[i - 1])
  let idx = 0
  const decay = 0.996
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period
    const v = ring[idx]
    ring[idx] = decay * 0.5 * (ring[idx] + ring[next])
    data[i] = v
    idx = next
  }
  bufferCache.set(key, buf)
  return buf
}

function playFreq(freq: number, when: number, gain = 0.35) {
  const ac = audio()
  const src = ac.createBufferSource()
  src.buffer = pluckBuffer(freq)
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.001, when + 2.1)
  src.connect(g).connect(ac.destination)
  src.start(when)
  src.stop(when + 2.2)
}

/** Spielt einen Griff ab (Abschlag von tief nach hoch). */
export function strum(frets: number[], when?: number, direction: 'down' | 'up' = 'down', spread = 0.03) {
  const ac = audio()
  const t0 = when ?? ac.currentTime + 0.02
  const order = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
  let k = 0
  for (const s of order) {
    const fret = frets[s]
    if (fret < 0) continue
    playFreq(midiToFreq(STANDARD_TUNING_MIDI[s] + fret), t0 + k * spread, direction === 'down' ? 0.3 : 0.2)
    k++
  }
}

/** Einzelne Note auf Saite (0 = tiefe E) und Bund, optional zu einem Zeitpunkt der Audio-Uhr. */
export function pluckNote(stringIndex: number, fret: number, when?: number) {
  const ac = audio()
  playFreq(midiToFreq(STANDARD_TUNING_MIDI[stringIndex] + fret), when ?? ac.currentTime + 0.02, 0.4)
}

/** Einzelne Saite (z. B. Referenzton beim Stimmen). */
export function pluckString(stringIndex: number, fret = 0) {
  const ac = audio()
  playFreq(midiToFreq(STANDARD_TUNING_MIDI[stringIndex] + fret), ac.currentTime + 0.02, 0.5)
}

export function click(when: number, accent: boolean) {
  const ac = audio()
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.frequency.value = accent ? 1600 : 1000
  g.gain.setValueAtTime(accent ? 0.5 : 0.3, when)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  osc.connect(g).connect(ac.destination)
  osc.start(when)
  osc.stop(when + 0.06)
}

export interface MetronomeOptions {
  bpm: number
  beatsPerBar: number
  onBeat: (beatIndex: number, when: number) => void
}

/**
 * Präzises Metronom: plant Klicks im Voraus auf der Audio-Uhr und meldet
 * jeden Schlag (für die Anzeige) zum richtigen Zeitpunkt.
 */
export class Metronome {
  private timer: number | null = null
  private nextTime = 0
  private beat = 0
  private opts: MetronomeOptions
  private timeouts: number[] = []
  clickEnabled = true

  constructor(opts: MetronomeOptions) {
    this.opts = opts
  }

  setBpm(bpm: number) {
    this.opts.bpm = bpm
  }

  start() {
    const ac = audio()
    this.stop()
    this.beat = 0
    this.nextTime = ac.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 25)
    this.schedule()
  }

  private schedule() {
    const ac = audio()
    while (this.nextTime < ac.currentTime + 0.12) {
      const when = this.nextTime
      const beat = this.beat
      const accent = beat % this.opts.beatsPerBar === 0
      if (this.clickEnabled) click(when, accent)
      this.opts.onBeat(beat, when)
      this.beat++
      this.nextTime += 60 / this.opts.bpm
    }
  }

  /** Führt fn aus, wenn die Audio-Uhr bei `when` angekommen ist. */
  at(when: number, fn: () => void) {
    const ms = Math.max(0, (when - audio().currentTime) * 1000)
    const id = window.setTimeout(fn, ms)
    this.timeouts.push(id)
    if (this.timeouts.length > 64) this.timeouts.shift()
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.timeouts.forEach((id) => window.clearTimeout(id))
    this.timeouts = []
  }
}
