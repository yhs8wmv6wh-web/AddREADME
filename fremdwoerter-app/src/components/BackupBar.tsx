import { useRef, useState } from 'react'
import type { Fremdwort } from '../types'

interface BackupBarProps {
  woerter: Fremdwort[]
  onImport: (woerter: Fremdwort[]) => void
}

const LAST_BACKUP_KEY = 'fremdwoerter.lastBackup'

function readLastBackup(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? n : null
}

function describeAge(ts: number | null): { text: string; stale: boolean } {
  if (ts === null) return { text: 'Noch nie gesichert', stale: true }
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  const stale = days >= 14
  if (days <= 0) return { text: 'Zuletzt gesichert: heute', stale: false }
  if (days === 1) return { text: 'Zuletzt gesichert: gestern', stale: false }
  return { text: `Zuletzt gesichert: vor ${days} Tagen`, stale }
}

export function BackupBar({ woerter, onImport }: BackupBarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState<number | null>(() => readLastBackup())

  function markBackedUp() {
    const now = Date.now()
    localStorage.setItem(LAST_BACKUP_KEY, String(now))
    setLastBackup(now)
  }

  async function handleExport() {
    const json = JSON.stringify({ app: 'fremdwoerter', version: 1, woerter }, null, 2)
    const filename = 'fremdwoerter-backup.json'

    // Auf dem iPhone: per Teilen-Funktion in „Dateien"/iCloud sichern, wenn möglich.
    const file = new File([json], filename, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: 'Fremdwörter-Backup' })
        markBackedUp()
        return
      } catch (err) {
        // Nutzer hat den Teilen-Dialog abgebrochen -> nichts weiter tun.
        if (err instanceof Error && err.name === 'AbortError') return
        // Sonst: unten auf klassischen Download ausweichen.
      }
    }

    // Fallback: als Datei herunterladen.
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    markBackedUp()
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const list: Fremdwort[] = Array.isArray(parsed) ? parsed : parsed.woerter
      if (!Array.isArray(list)) throw new Error('ungültig')
      onImport(list)
    } catch {
      alert('Diese Datei konnte nicht gelesen werden. Bitte wähle eine Fremdwörter-Backup-Datei (.json).')
    }
  }

  const age = describeAge(lastBackup)

  return (
    <div className="mt-10 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={handleExport} className="underline underline-offset-2" disabled={woerter.length === 0}>
          Sichern (Backup)
        </button>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => fileRef.current?.click()} className="underline underline-offset-2">
          Wiederherstellen
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
      </div>
      {woerter.length > 0 && (
        <p className={`text-xs ${age.stale ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
          {age.text}
          {age.stale && ' – zur Sicherheit jetzt sichern.'}
        </p>
      )}
    </div>
  )
}
