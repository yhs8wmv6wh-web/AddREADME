import type { Book } from '../types'

const STATUS_LABEL: Record<Book['status'], string> = {
  finished: 'Gelesen',
  reading: 'Lese ich gerade',
  wishlist: 'Wunschliste',
}

interface BookCardProps {
  book: Book
  onClick: () => void
}

export function BookCard({ book, onClick }: BookCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col text-left rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm active:scale-[0.98] transition-transform"
    >
      <div
        className="h-28 flex items-center justify-center px-3 text-center"
        style={{ backgroundColor: book.coverColor }}
      >
        <span className="text-white font-semibold text-sm line-clamp-3 leading-snug">{book.title}</span>
      </div>
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-sm font-medium truncate">{book.title}</p>
        {book.author && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{book.author}</p>}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {STATUS_LABEL[book.status]}
          </span>
          {book.rating && <span className="text-amber-400 text-xs">{'★'.repeat(book.rating)}</span>}
        </div>
      </div>
    </button>
  )
}
