export interface Song {
  id: string
  title: string
  artist: string
  /** Eingefügter Text: Akkorde über Text, ChordPro oder Tabs */
  text: string
  /** Halbtöne, um die der Song transponiert angezeigt wird */
  transpose: number
  /** Kapodaster-Bund, mit dem gespielt wird (Griffe werden entsprechend umgerechnet) */
  capo: number
  bpm?: number
  /** Notizen, z. B. Schlagmuster */
  notes?: string
  example?: boolean
  createdAt: number
  updatedAt: number
}

export interface PracticeRecord {
  id: string
  date: number
  kind: 'minute' | 'metronome'
  chords: string[]
  /** minute: Anzahl Wechsel in 60 s · metronome: BPM */
  value: number
  seconds: number
}

export interface Settings {
  known: string[]
  german: boolean
}
