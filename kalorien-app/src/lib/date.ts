/** Lokales Datum als YYYY-MM-DD (nicht UTC). */
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return toISO(new Date())
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 1 = Montag … 7 = Sonntag */
export function weekday(s: string): number {
  const w = fromISO(s).getDay()
  return w === 0 ? 7 : w
}

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function formatLong(s: string): string {
  return fromISO(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatShort(s: string): string {
  return fromISO(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function relativeLabel(s: string): string {
  const t = today()
  if (s === t) return 'Heute'
  if (s === addDays(t, -1)) return 'Gestern'
  if (s === addDays(t, 1)) return 'Morgen'
  return formatLong(s)
}
