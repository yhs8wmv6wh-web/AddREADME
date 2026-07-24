interface StatTileProps {
  value: string | number
  label: string
}

export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 p-3">
      <p className="text-2xl font-semibold text-purple-700 dark:text-purple-300">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}
