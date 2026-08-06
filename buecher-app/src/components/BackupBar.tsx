import { useRef } from 'react'
import type { Book } from '../types'

interface BackupBarProps {
  books: Book[]
  onImport: (books: Book[]) => void
}

export function BackupBar({ books, onImport }: BackupBarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const payload = { app: 'buecherregal', version: 1, books }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'buecherregal-backup.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const list: Book[] = Array.isArray(parsed) ? parsed : parsed.books
      if (!Array.isArray(list)) throw new Error('ungültig')
      onImport(list)
    } catch {
      alert('Diese Datei konnte nicht gelesen werden. Bitte wähle eine Bücherregal-Backup-Datei (.json).')
    }
  }

  return (
    <div className="mt-10 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
      <button type="button" onClick={handleExport} className="underline underline-offset-2" disabled={books.length === 0}>
        Sichern (Backup)
      </button>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => fileRef.current?.click()} className="underline underline-offset-2">
        Wiederherstellen
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
    </div>
  )
}
