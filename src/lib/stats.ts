import type { Book, BookLanguage } from '../types'
import { daysBetween, formatYearMonth, monthLabelShort, splitYearMonth } from './date'

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
    years.add(splitYearMonth(book.finishedDate!).year)
  }
  return Array.from(years).sort((a, b) => b - a)
}

export function booksInYear(books: Book[], year: number | null): Book[] {
  const finished = finishedWithDate(books)
  if (year === null) return finished
  return finished.filter((book) => splitYearMonth(book.finishedDate!).year === year)
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

export function monthlyBreakdown(books: Book[], year: number): Bucket[] {
  const inYear = finishedWithDate(books).filter((book) => splitYearMonth(book.finishedDate!).year === year)
  return Array.from({ length: 12 }, (_, index) => {
    const inMonth = inYear.filter((book) => splitYearMonth(book.finishedDate!).month === index)
    return { key: String(index), label: monthLabelShort(index), ...totals(inMonth) }
  })
}

export function yearlyBreakdown(books: Book[]): Bucket[] {
  const finished = finishedWithDate(books)
  const years = getAvailableYears(books)
  return years
    .slice()
    .sort((a, b) => a - b)
    .map((year) => {
      const inYear = finished.filter((book) => splitYearMonth(book.finishedDate!).year === year)
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

export function fastestBook(books: Book[]): { book: Book; days: number } | null {
  let best: { book: Book; days: number } | null = null
  for (const book of finishedWithDate(books)) {
    if (!book.startedDate) continue
    const days = daysBetween(book.startedDate, book.finishedDate!)
    if (days < 0) continue
    if (!best || days < best.days) best = { book, days }
  }
  return best
}

export function bestMonthByPages(books: Book[]): { key: string; label: string; pages: number } | null {
  const totalsByMonth = new Map<string, number>()
  for (const book of finishedWithDate(books)) {
    const key = book.finishedDate!.slice(0, 7)
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + (book.pages ?? 0))
  }
  let best: { key: string; label: string; pages: number } | null = null
  for (const [key, pages] of totalsByMonth) {
    if (pages > 0 && (!best || pages > best.pages)) best = { key, label: formatYearMonth(key), pages }
  }
  return best
}

export function getAllTags(books: Book[]): string[] {
  const tags = new Set<string>()
  for (const book of books) {
    for (const tag of book.tags) tags.add(tag)
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'de'))
}
