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

/**
 * Looks up page counts via the Google Books API (public, CORS-enabled,
 * no key needed for search). Print editions (hardcover/paperback) are
 * sorted ahead of e-book listings, since those page counts are the ones
 * that actually correspond to a physical book.
 */
export async function searchBookCandidates(title: string, author: string): Promise<BookCandidate[]> {
  const terms = [`intitle:${title}`]
  if (author.trim()) terms.push(`inauthor:${author}`)
  const query = encodeURIComponent(terms.join('+'))

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20&printType=books`)
  if (!response.ok) throw new Error(`Google Books API antwortete mit ${response.status}`)

  const data: { items?: GoogleBooksItem[] } = await response.json()
  const items = data.items ?? []

  const candidates: BookCandidate[] = items
    .filter((item) => item.volumeInfo?.printType === 'BOOK' && (item.volumeInfo?.pageCount ?? 0) > 0)
    .map((item) => ({
      title: [item.volumeInfo!.title, item.volumeInfo!.subtitle].filter(Boolean).join(': '),
      authors: (item.volumeInfo!.authors ?? []).join(', '),
      publisher: item.volumeInfo!.publisher ?? '',
      pageCount: item.volumeInfo!.pageCount!,
      isEbook: item.saleInfo?.isEbook ?? false,
    }))

  // Print (hardcover/paperback) editions first, e-book listings last.
  candidates.sort((a, b) => Number(a.isEbook) - Number(b.isEbook))

  // De-duplicate identical (title, pageCount) pairs from multiple regional listings.
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = `${candidate.title}|${candidate.pageCount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
