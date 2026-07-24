interface StatTileProps {
  value: string | number
  label: string
}

export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="border-t-2 border-neutral-900 dark:border-neutral-100 pt-2">
      <p className="font-serif text-3xl text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
    </div>
  )
}
