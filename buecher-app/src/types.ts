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
  startedDate: string | null
  finishedDate: string | null
  genre: string
  language: BookLanguage
  tags: string[]
  notes: string
  coverUrl: string | null
  createdAt: number
}

export type BookInput = Omit<Book, 'id' | 'createdAt'>
