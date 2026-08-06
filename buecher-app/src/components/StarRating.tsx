interface StarRatingProps {
  value: number | null
  onChange: (value: number | null) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} Sterne`}
          onClick={() => onChange(value === star ? null : star)}
          className="text-xl leading-none px-0.5 text-neutral-800 dark:text-neutral-200"
        >
          {value !== null && star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
