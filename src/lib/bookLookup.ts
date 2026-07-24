export interface BookCandidate {
  title: string
  authors: string
  publisher: string
  pageCount: number
  isEbook: boolean
}

interface GoogleBooksItem {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    pageCount?: number
    printType?: string
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
}

async function searchGoogleBooks(title: string, author: string): Promise<BookCandidate[]> {
  const terms = [`intitle:${title}`]
  if (author.trim()) terms.push(`inauthor:${author}`)
  const params = new URLSearchParams({ q: terms.join(' '), maxResults: '20', printType: 'books' })

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`)
  if (!response.ok) throw new Error(`Google Books API antwortete mit ${response.status}`)

  const data: { items?: GoogleBooksItem[] } = await response.json()
  const items = data.items ?? []

  return items
    .filter((item) => item.volumeInfo?.printType === 'BOOK' && (item.volumeInfo?.pageCount ?? 0) > 0)
    .map((item) => ({
      title: [item.volumeInfo!.title, item.volumeInfo!.subtitle].filter(Boolean).join(': '),
      authors: (item.volumeInfo!.authors ?? []).join(', '),
      publisher: item.volumeInfo!.publisher ?? '',
      pageCount: item.volumeInfo!.pageCount!,
      isEbook: item.saleInfo?.isEbook ?? false,
    }))
}

async function searchOpenLibrary(title: string, author: string): Promise<BookCandidate[]> {
  const params = new URLSearchParams({
    title,
    fields: 'title,author_name,publisher,number_of_pages_median',
    limit: '10',
  })
  if (author.trim()) params.set('author', author)

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
 * Looks up page counts via public, CORS-enabled book APIs (no backend
 * needed): Google Books first, falling back to Open Library if Google
 * Books errors out or has nothing. Print editions (hardcover/paperback)
 * are sorted ahead of e-book listings, since those page counts are the
 * ones that actually correspond to a physical book. Only throws if both
 * sources fail outright; an empty array means both searched successfully
 * but found nothing.
 */
export async function searchBookCandidates(title: string, author: string): Promise<BookCandidate[]> {
  let candidates: BookCandidate[] = []
  let googleError: unknown = null

  try {
    candidates = await searchGoogleBooks(title, author)
  } catch (err) {
    googleError = err
  }

  if (candidates.length === 0) {
    try {
      candidates = await searchOpenLibrary(title, author)
    } catch (openLibraryError) {
      if (googleError) throw googleError
      throw openLibraryError
    }
  }

  candidates.sort((a, b) => Number(a.isEbook) - Number(b.isEbook))
  return dedupe(candidates)
}
