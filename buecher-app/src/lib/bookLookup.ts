import type { BookLanguage } from '../types'

export interface BookCandidate {
  title: string
  authors: string
  publisher: string
  pageCount: number
  isEbook: boolean
  coverUrl: string | null
}

interface GoogleBooksItem {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    pageCount?: number
    printType?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
  }
  saleInfo?: {
    isEbook?: boolean
  }
}

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  publisher?: string[]
  number_of_pages_median?: number
  cover_i?: number
}

// ISO 639-1 (Google Books) / 639-2 (Open Library) codes to bias results
// toward the edition's actual language - German titles were getting
// buried under (or replaced by) English editions without this.
const GOOGLE_LANG_RESTRICT: Partial<Record<BookLanguage, string>> = { de: 'de', en: 'en' }
const OPEN_LIBRARY_LANG: Partial<Record<BookLanguage, string>> = { de: 'ger', en: 'eng' }

/** Google Books serves cover images over http:// by default, which a https page can't load (mixed content). */
function toHttps(url: string): string {
  return url.replace(/^http:\/\//, 'https://')
}

async function searchGoogleBooks(title: string, author: string, langRestrict?: string): Promise<BookCandidate[]> {
  const terms = [`intitle:${title}`]
  if (author.trim()) terms.push(`inauthor:${author}`)
  const params = new URLSearchParams({ q: terms.join(' '), maxResults: '20', printType: 'books' })
  if (langRestrict) params.set('langRestrict', langRestrict)

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`)
  if (!response.ok) throw new Error(`Google Books API antwortete mit ${response.status}`)

  const data: { items?: GoogleBooksItem[] } = await response.json()
  const items = data.items ?? []

  return items
    .filter((item) => item.volumeInfo?.printType === 'BOOK' && (item.volumeInfo?.pageCount ?? 0) > 0)
    .map((item) => {
      const image = item.volumeInfo!.imageLinks?.thumbnail ?? item.volumeInfo!.imageLinks?.smallThumbnail
      return {
        title: [item.volumeInfo!.title, item.volumeInfo!.subtitle].filter(Boolean).join(': '),
        authors: (item.volumeInfo!.authors ?? []).join(', '),
        publisher: item.volumeInfo!.publisher ?? '',
        pageCount: item.volumeInfo!.pageCount!,
        isEbook: item.saleInfo?.isEbook ?? false,
        coverUrl: image ? toHttps(image) : null,
      }
    })
}

async function searchOpenLibrary(title: string, author: string, language?: string): Promise<BookCandidate[]> {
  const params = new URLSearchParams({
    title,
    fields: 'title,author_name,publisher,number_of_pages_median,cover_i',
    limit: '10',
  })
  if (author.trim()) params.set('author', author)
  if (language) params.set('language', language)

  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`)
  if (!response.ok) throw new Error(`Open Library antwortete mit ${response.status}`)

  const data: { docs?: OpenLibraryDoc[] } = await response.json()
  const docs = data.docs ?? []

  return docs
    .filter((doc) => (doc.number_of_pages_median ?? 0) > 0)
    .map((doc) => ({
      title: doc.title ?? title,
      authors: (doc.author_name ?? []).join(', '),
      publisher: (doc.publisher ?? [])[0] ?? '',
      pageCount: Math.round(doc.number_of_pages_median!),
      isEbook: false,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    }))
}

function dedupe(candidates: BookCandidate[]): BookCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = `${candidate.title}|${candidate.pageCount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Looks up page counts and cover images via public, CORS-enabled book APIs
 * (no backend needed): Google Books first, falling back to Open Library if
 * Google Books errors out or has nothing. Both are first tried biased
 * toward the book's selected language (helps German titles surface instead
 * of getting buried under English editions), then retried unrestricted if
 * that comes up empty. Print editions (hardcover/paperback) are sorted
 * ahead of e-book listings, since those page counts are the ones that
 * actually correspond to a physical book. Only throws if both sources fail
 * outright; an empty array means both searched successfully but found
 * nothing.
 */
export async function searchBookCandidates(title: string, author: string, language: BookLanguage): Promise<BookCandidate[]> {
  const googleLang = GOOGLE_LANG_RESTRICT[language]
  let candidates: BookCandidate[] = []
  let googleError: unknown = null

  try {
    candidates = await searchGoogleBooks(title, author, googleLang)
    if (candidates.length === 0 && googleLang) {
      candidates = await searchGoogleBooks(title, author)
    }
  } catch (err) {
    googleError = err
  }

  if (candidates.length === 0) {
    const openLibraryLang = OPEN_LIBRARY_LANG[language]
    try {
      candidates = await searchOpenLibrary(title, author, openLibraryLang)
      if (candidates.length === 0 && openLibraryLang) {
        candidates = await searchOpenLibrary(title, author)
      }
    } catch (openLibraryError) {
      if (googleError) throw googleError
      throw openLibraryError
    }
  }

  candidates.sort((a, b) => Number(a.isEbook) - Number(b.isEbook))
  return dedupe(candidates)
}
