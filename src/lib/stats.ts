import type { Book, BookLanguage } from '../types'

export interface Bucket {
  key: string
  label: string
  count: number
  pages: number
}

function finishedWithDate(books: Book[]) {
  return books.filter((book) => book.status === 'finished' && book.finishedDate)
}

export function getAvailableYears(books: Book[]): number[] {
  const years = new Set<number>()
  years.add(new Date().getFullYear())
  for (const book of finishedWithDate(books)) {
    years.add(new Date(book.finishedDate!).getFullYear())
  }
  return Array.from(years).sort((a, b) => b - a)
}

export function booksInYear(books: Book[], year: number | null): Book[] {
  const finished = finishedWithDate(books)
  if (year === null) return finished
  return finished.filter((book) => new Date(book.finishedDate!).getFullYear() === year)
}

export function totals(books: Book[]) {
  return {
    count: books.length,
    pages: books.reduce((sum, book) => sum + (book.pages ?? 0), 0),
  }
}

export function languageBreakdown(books: Book[]): { language: BookLanguage; count: number; pages: number }[] {
  const languages: BookLanguage[] = ['de', 'en', 'other']
  return languages.map((language) => {
    const inLang = books.filter((book) => book.language === language)
    return { language, ...totals(inLang) }
  })
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
]

export function monthlyBreakdown(books: Book[], year: number): Bucket[] {
  const inYear = books.filter((book) => new Date(book.finishedDate!).getFullYear() === year)
  return MONTH_LABELS.map((label, index) => {
    const inMonth = inYear.filter((book) => new Date(book.finishedDate!).getMonth() === index)
    return { key: String(index), label, ...totals(inMonth) }
  })
}

export function yearlyBreakdown(books: Book[]): Bucket[] {
  const finished = finishedWithDate(books)
  const years = getAvailableYears(books)
  return years
    .slice()
    .sort((a, b) => a - b)
    .map((year) => {
      const inYear = finished.filter((book) => new Date(book.finishedDate!).getFullYear() === year)
      return { key: String(year), label: String(year), ...totals(inYear) }
    })
    .filter((bucket) => bucket.count > 0 || bucket.key === String(new Date().getFullYear()))
}

export function genreBreakdown(books: Book[]): { genre: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const book of books) {
    const genre = book.genre.trim() || 'Ohne Genre'
    counts.set(genre, (counts.get(genre) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
}
