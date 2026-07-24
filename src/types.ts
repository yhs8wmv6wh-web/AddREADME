export type BookStatus = 'reading' | 'finished' | 'wishlist'
export type BookLanguage = 'de' | 'en' | 'other'

export const LANGUAGE_LABEL: Record<BookLanguage, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  other: 'Andere',
}

export interface Book {
  id: string
  title: string
  author: string
  pages: number | null
  status: BookStatus
  rating: number | null
  finishedDate: string | null
  genre: string
  language: BookLanguage
  notes: string
  coverColor: string
  createdAt: number
}

export type BookInput = Omit<Book, 'id' | 'createdAt'>

export const COVER_COLORS = [
  '#9333ea',
  '#c084fc',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4b5563',
]

export function pickCoverColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % COVER_COLORS.length
  return COVER_COLORS[index]
}
