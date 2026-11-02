import type { Song } from '../types'
import { checkTab } from './tabCheck'

export interface Section {
  name: string
  chords: string
  repeat: number
}

export interface GuitarPart {
  name: string
  technique: string
  tab: string
  /** z. B. "original" oder "ungefähr" */
  accuracy?: string
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
function tabText(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : tabText(x))).join('\n')
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return tabText(o.tab ?? o.lines ?? o.text ?? '')
  }
  return ''
}

/** Spuren aus einer Claude-Antwort holen – tolerant gegenüber anderen Schlüsselnamen/Formaten. */
export function extractParts(r: unknown): GuitarPart[] {
  if (!r || typeof r !== 'object') return []
  const o = r as Record<string, unknown>
  const raw = o.parts ?? o.tracks ?? o.guitarParts ?? o.guitars ?? o.spuren
  if (!Array.isArray(raw)) return []
  return raw
    .map((x): GuitarPart | null => {
      if (!x || typeof x !== 'object') return null
      const p = x as Record<string, unknown>
      const tab = tabText(p.tab ?? p.tabs ?? p.lines ?? p.blocks)
      if (!tab.trim()) return null
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      return {
        name: str(p.name) || str(p.role) || 'Gitarre',
        technique: str(p.technique) || str(p.description) || str(p.picking),
        tab,
        accuracy: str(p.accuracy) || str(p.confidence),
      }
    })
    .filter((x): x is GuitarPart => x !== null)
}

/** Gitarrenspuren als Song-Text: Abschnitt + Technik-Zeile + Tab-Blöcke. */
export function partsToText(parts: GuitarPart[] | undefined, key = ''): string {
  if (!Array.isArray(parts)) return ''
  const out: string[] = []
  for (const p of parts) {
    const tab = tabText(p?.tab)
    if (!tab.trim()) continue
    const acc = p.accuracy ?? ''
    const label = /korrigiert/.test(acc)
      ? ' (aus dem Gedächtnis, bei Prüfung korrigiert)'
      : /geprüft/.test(acc)
        ? ' (aus dem Gedächtnis, gegengeprüft)'
        : /ungef|niedrig|mittel|approx/i.test(acc)
          ? ' (ungefähr)'
          : ''
    const name = ((typeof p.name === 'string' && p.name.trim() ? p.name : 'Gitarre') + label).replace(/[[\]]/g, '')
    out.push(`[${name}]`)
    if (typeof p.technique === 'string' && p.technique.trim()) out.push(`Technik: ${p.technique.trim()}`)
    for (const w of checkTab(tab, key)) out.push(`Hinweis: ${w}`)
    out.push(...tab.trim().split('\n').map((l) => l.replace(/\s+$/, '')), '')
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
  const partsText = partsToText(extractParts(raw), r.key)
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
