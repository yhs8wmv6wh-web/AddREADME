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

export function currentDay(): number {
  return new Date().getDate()
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

/** Extracts the day-of-month from a "YYYY-MM-DD" value, or null for "YYYY-MM". */
export function extractDay(value: string): number | null {
  const day = Number(value.split('-')[2])
  return day ? day : null
}

/** Combines a "YYYY-MM" value with an optional day into "YYYY-MM-DD" (or leaves it as "YYYY-MM"). */
export function combineMonthAndDay(monthValue: string, day: number | null): string {
  return day ? `${monthValue}-${String(day).padStart(2, '0')}` : monthValue
}

/** Formats "YYYY-MM" or "YYYY-MM-DD" as a German date/month label depending on precision. */
export function formatDateOrMonth(value: string): string {
  const { year, month } = splitYearMonth(value)
  const day = extractDay(value)
  if (day) return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`
  return `${MONTH_LABELS_LONG[month]} ${year}`
}

function toUtcDate(value: string): Date {
  const { year, month } = splitYearMonth(value)
  return new Date(Date.UTC(year, month, extractDay(value) ?? 1))
}

/** Whole days between two "YYYY-MM"/"YYYY-MM-DD" values (day defaults to the 1st when only a month is known). */
export function daysBetween(start: string, end: string): number {
  const ms = toUtcDate(end).getTime() - toUtcDate(start).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
