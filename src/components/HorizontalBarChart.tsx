interface BarItem {
  key: string
  label: string
  value: number
  /** 0–1 opacity of the ink fill; lets categories read apart without adding hue. */
  weight?: number
}

interface HorizontalBarChartProps {
  items: BarItem[]
  emptyMessage?: string
}

export function HorizontalBarChart({ items, emptyMessage = 'Noch keine Daten.' }: HorizontalBarChartProps) {
  const max = Math.max(1, ...items.map((item) => item.value))
  const hasData = items.some((item) => item.value > 0)

  if (!hasData) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col" style={{ gap: '2px' }}>
      {items.map((item) => {
        const width = Math.max(2, Math.round((item.value / max) * 100))
        return (
          <div key={item.key} className="flex items-center gap-2 py-1" title={`${item.label}: ${item.value}`}>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12 shrink-0 text-right">{item.label}</span>
            <div className="flex-1 rounded bg-neutral-100 dark:bg-neutral-800" style={{ height: '14px' }}>
              <div
                className="h-full rounded bg-neutral-900 dark:bg-neutral-100"
                style={{ width: `${width}%`, minWidth: item.value > 0 ? '6px' : '0px', opacity: item.weight ?? 1 }}
              />
            </div>
            <span className="text-xs font-medium w-8 shrink-0 tabular-nums">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}
