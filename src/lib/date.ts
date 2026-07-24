const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONTH_LABELS_LONG = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Parses a "YYYY-MM" (or "YYYY-MM-DD") string without timezone shifting. */
export function splitYearMonth(value: string): { year: number; month: number } {
  const [year, month] = value.split('-').map(Number)
  return { year, month: month - 1 }
}

export function monthLabelShort(monthIndex: number): string {
  return MONTH_LABELS_SHORT[monthIndex]
}

export function formatYearMonth(value: string): string {
  const { year, month } = splitYearMonth(value)
  return `${MONTH_LABELS_LONG[month]} ${year}`
}
