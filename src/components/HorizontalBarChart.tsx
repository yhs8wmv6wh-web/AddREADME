import type { CSSProperties } from 'react'

interface BarItem {
  key: string
  label: string
  value: number
  color: string
  darkColor: string
}

interface HorizontalBarChartProps {
  items: BarItem[]
  valueSuffix?: string
  emptyMessage?: string
}

export function HorizontalBarChart({ items, valueSuffix = '', emptyMessage = 'Noch keine Daten.' }: HorizontalBarChartProps) {
  const max = Math.max(1, ...items.map((item) => item.value))
  const hasData = items.some((item) => item.value > 0)

  if (!hasData) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">{emptyMessage}</p>
  }

  return (
    <div className="viz-root flex flex-col" style={{ gap: '2px' }}>
      <style>{`
        .viz-root { --track: #e1e0d9; }
        .viz-root .viz-bar { background-color: var(--bar-light); }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root { --track: #2c2c2a; }
          :root:where(:not([data-theme="light"])) .viz-root .viz-bar { background-color: var(--bar-dark); }
        }
        :root[data-theme="dark"] .viz-root { --track: #2c2c2a; }
        :root[data-theme="dark"] .viz-root .viz-bar { background-color: var(--bar-dark); }
      `}</style>
      {items.map((item) => {
        const width = Math.max(2, Math.round((item.value / max) * 100))
        const barStyle = {
          width: `${width}%`,
          minWidth: item.value > 0 ? '8px' : '0px',
          '--bar-light': item.color,
          '--bar-dark': item.darkColor,
        } as CSSProperties

        return (
          <div key={item.key} className="flex items-center gap-2 py-1" title={`${item.label}: ${item.value}${valueSuffix}`}>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-10 shrink-0 text-right">{item.label}</span>
            <div className="flex-1 rounded" style={{ backgroundColor: 'var(--track)', height: '16px' }}>
              <div className="viz-bar h-full rounded" style={barStyle} />
            </div>
            <span className="text-xs font-medium w-8 shrink-0 tabular-nums">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}
