import type { Song } from '../types'

export interface Section {
  name: string
  chords: string
  repeat: number
}

export interface GuitarPart {
  name: string
  technique: string
  tab: string
}

export interface FoundSong {
  found: boolean
  title: string
  artist: string
  key: string
  capo: number
  bpm: number
  timeSignature: string
  strumming: string
  sections: Section[]
  riffTab: string
  parts?: GuitarPart[]
  notes: string
  sources: string[]
  confidence: 'hoch' | 'mittel' | 'niedrig'
}


/** Baut aus dem Rechercheergebnis einen Song im App-Format. */
/** Gitarrenspuren als Song-Text: Abschnitt + Technik-Zeile + Tab-Blöcke. */
export function partsToText(parts: GuitarPart[] | undefined): string {
  if (!Array.isArray(parts)) return ''
  const out: string[] = []
  for (const p of parts) {
    if (!p || typeof p.tab !== 'string' || !p.tab.trim()) continue
    const name = (typeof p.name === 'string' && p.name.trim() ? p.name : 'Gitarre').replace(/[[\]]/g, '')
    out.push(`[${name}]`)
    if (typeof p.technique === 'string' && p.technique.trim()) out.push(`Technik: ${p.technique.trim()}`)
    out.push(...p.tab.trim().split('\n').map((l) => l.replace(/\s+$/, '')), '')
  }
  return out.join('\n').trim()
}

export function toSong(raw: FoundSong, query: string, viaWeb = true): Song {
  const now = Date.now()
  // Antwort defensiv lesen (bei der Claude-Variante wird nichts validiert)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const r: FoundSong = {
    ...raw,
    title: str(raw.title),
    artist: str(raw.artist),
    key: str(raw.key),
    capo: num(raw.capo),
    bpm: num(raw.bpm),
    timeSignature: str(raw.timeSignature),
    strumming: str(raw.strumming),
    riffTab: str(raw.riffTab),
    notes: str(raw.notes),
    confidence: raw.confidence,
    sources: Array.isArray(raw.sources) ? raw.sources.filter((u): u is string => typeof u === 'string') : [],
    sections: Array.isArray(raw.sections)
      ? raw.sections
          .filter((x) => x && typeof x.chords === 'string')
          .map((x) => ({ name: str(x.name) || 'Teil', chords: x.chords, repeat: num(x.repeat) || 1 }))
      : [],
  }
  const lines: string[] = []
  for (const s of r.sections) {
    const rep = s.repeat > 1 ? ` (${s.repeat}x)` : ''
    lines.push(`[${s.name.replace(/[[\]]/g, '')}${rep}]`)
    for (const l of s.chords.split('\n')) if (l.trim()) lines.push(l.trim())
    lines.push('')
  }
  if (r.riffTab.trim()) {
    lines.push('[Riff]', ...r.riffTab.trim().split('\n'), '')
  }
  const partsText = partsToText(raw.parts)
  if (partsText) lines.push(partsText, '')
  const info = [
    r.key && `Tonart: ${r.key}`,
    r.timeSignature && `Takt: ${r.timeSignature}`,
    r.strumming && `Schlagmuster: ${r.strumming}`,
  ].filter(Boolean)
  const notes = [info.join(' · '), r.notes.trim(), viaWeb
      ? `KI-Recherche (Übereinstimmung der Quellen: ${r.confidence}) – mit Original vergleichen.`
      : `Aus dem Wissen von Claude, ohne Websuche (Sicherheit: ${r.confidence || 'unbekannt'}) – mit der Aufnahme vergleichen.`]
    .filter(Boolean)
    .join('\n')
  const capo = Math.max(0, Math.min(9, Math.round(r.capo || 0)))
  return {
    id: crypto.randomUUID(),
    title: r.title.trim() || query.trim(),
    artist: r.artist.trim(),
    text: lines.join('\n').trim(),
    // Kapo-Version: Text enthält Griffe, klingt um capo höher
    transpose: capo,
    capo,
    bpm: r.bpm > 0 ? Math.round(r.bpm) : undefined,
    notes,
    sources: r.sources.filter((u) => /^https?:\/\//.test(u)).slice(0, 5),
    createdAt: now,
    updatedAt: now,
  }
}
