export type Category =
  | 'kinofilm'
  | 'dvd'
  | 'mediathek'
  | 'serie'
  | 'buch'
  | 'konzert'
  | 'oper'
  | 'theater'
  | 'museum'
  | 'podcast'
  | 'schallplatte'
  | 'spotify'

// Reihenfolge hier = Anzeigereihenfolge der Kategorie-Abschnitte in der Liste.
export const CATEGORIES: Category[] = [
  'kinofilm',
  'dvd',
  'mediathek',
  'serie',
  'buch',
  'konzert',
  'oper',
  'theater',
  'museum',
  'podcast',
  'schallplatte',
  'spotify',
]

export const CATEGORY_LABEL: Record<Category, string> = {
  kinofilm: 'Kinofilm',
  dvd: 'DVD-Film',
  mediathek: 'Mediathek-Film',
  serie: 'Serie/Streaming',
  buch: 'Buch',
  konzert: 'Konzert',
  oper: 'Oper',
  theater: 'Theater',
  museum: 'Museum/Ausstellung',
  podcast: 'Podcast',
  schallplatte: 'Schallplatte (LP)',
  spotify: 'Spotify',
}

// Emoji + Farbakzent pro Kategorie (farbcodierte Darstellung).
// `dot` und `bar` sind vollständige Tailwind-Klassen, damit sie beim Build erzeugt werden.
export interface CategoryMeta {
  emoji: string
  dot: string
  bar: string
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  kinofilm: { emoji: '🎬', dot: 'bg-red-500', bar: 'bg-red-500' },
  dvd: { emoji: '📀', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  mediathek: { emoji: '📺', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  serie: { emoji: '🍿', dot: 'bg-yellow-500', bar: 'bg-yellow-500' },
  buch: { emoji: '📚', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  konzert: { emoji: '🎫', dot: 'bg-teal-500', bar: 'bg-teal-500' },
  oper: { emoji: '🎼', dot: 'bg-cyan-500', bar: 'bg-cyan-500' },
  theater: { emoji: '🎭', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  museum: { emoji: '🖼️', dot: 'bg-indigo-500', bar: 'bg-indigo-500' },
  podcast: { emoji: '🎙️', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  schallplatte: { emoji: '🎵', dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500' },
  spotify: { emoji: '🟢', dot: 'bg-green-500', bar: 'bg-green-500' },
}

export interface Entry {
  id: string
  title: string
  category: Category
  done: boolean
  doneAt: number | null
  createdAt: number
}

export type EntryInput = Omit<Entry, 'id' | 'createdAt'>
