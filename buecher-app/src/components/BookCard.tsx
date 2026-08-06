import { useState } from 'react'
import type { Book } from '../types'
import { LANGUAGE_LABEL } from '../types'

const STATUS_LABEL: Record<Book['status'], string> = {
  finished: 'Gelesen',
  reading: 'Am Lesen',
  wishlist: 'Wunschliste',
}

interface BookCardProps {
  book: Book
  onClick: () => void
}

export function BookCard({ book, onClick }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false)
  const meta = [book.genre, LANGUAGE_LABEL[book.language], book.pages ? `${book.pages} S.` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      onClick={onClick}
      className="flex flex-col text-left rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 active:scale-[0.98] transition-transform"
    >
      {book.coverUrl && !coverFailed ? (
        <div className="aspect-[2/3] w-full bg-stone-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
          <img
            src={book.coverUrl}
            alt=""
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="aspect-[2/3] w-full flex items-center justify-center px-3 text-center bg-stone-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 relative">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-900 dark:bg-neutral-100" />
          <span className="font-serif text-neutral-900 dark:text-neutral-100 text-base leading-snug line-clamp-6">{book.title}</span>
        </div>
      )}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="font-serif text-sm truncate">{book.title}</p>
        {book.author && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{book.author}</p>}
        {meta && <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{meta}</p>}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{STATUS_LABEL[book.status]}</span>
          {book.rating && <span className="text-neutral-800 dark:text-neutral-200 text-xs">{'★'.repeat(book.rating)}</span>}
        </div>
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {book.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] rounded-full border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 text-neutral-500 dark:text-neutral-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
