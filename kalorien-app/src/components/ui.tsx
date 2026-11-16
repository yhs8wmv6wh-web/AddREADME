import { useEffect, useState, type ReactNode } from 'react'

export const btnPrimary =
  'rounded-lg bg-emerald-700 dark:bg-emerald-500 text-white dark:text-neutral-950 px-4 py-2.5 font-medium disabled:opacity-40 active:opacity-80'
export const btnSecondary =
  'rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 font-medium disabled:opacity-40 active:bg-neutral-100 dark:active:bg-neutral-800'
export const btnLink = 'text-emerald-700 dark:text-emerald-400 font-medium'
export const input =
  'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600'
export const card = 'rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
export const label = 'text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400'

/** Vollbild-Ebene über der App (statt Modal-Dialog, passt besser aufs iPhone). */
export function Sheet({ title, onClose, children, action }: { title: string; onClose: () => void; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <header
        className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button type="button" onClick={onClose} className={btnLink}>
          Zurück
        </button>
        <h2 className="flex-1 truncate text-center font-semibold">{title}</h2>
        <div className="min-w-[3.5rem] text-right">{action}</div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ value, max, over = 'bad' }: { value: number; max: number; over?: 'bad' | 'good' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const exceeded = max > 0 && value > max
  const color = exceeded ? (over === 'bad' ? 'bg-rose-500' : 'bg-emerald-600') : 'bg-emerald-600 dark:bg-emerald-500'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Zahlenfeld, das Komma akzeptiert (deutsche iPhone-Tastatur). */
export function NumberField({
  value,
  onChange,
  placeholder,
  className = '',
  id,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  className?: string
  id?: string
}) {
  const [text, setText] = useState(show(value))
  // Von außen geänderten Wert übernehmen (z. B. Portion angetippt).
  useEffect(() => {
    setText((t) => (parse(t) === value ? t : show(value)))
  }, [value])
  return (
    <input
      id={id}
      inputMode="decimal"
      className={`${input} tabular-nums ${className}`}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = parse(e.target.value)
        if (n === undefined || Number.isFinite(n)) onChange(n)
      }}
    />
  )
}

function show(v: number | undefined): string {
  return v === undefined ? '' : String(Math.round(v * 100) / 100).replace('.', ',')
}

function parse(s: string): number | undefined {
  const raw = s.trim().replace(',', '.')
  if (raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{children}</p>
}
