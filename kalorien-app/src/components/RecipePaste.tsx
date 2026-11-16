import { useState } from 'react'
import type { RecipeSource } from '../lib/claude'
import { btnPrimary, btnSecondary, card, input } from './ui'

interface Props {
  busy: boolean
  onImport: (src: RecipeSource) => Promise<boolean>
}

/** Rezept aus der Zwischenablage: PDF, Screenshots oder kopierter Text. */
export function RecipePaste({ busy, onImport }: Props) {
  const [pdf, setPdf] = useState<Blob | null>(null)
  const [images, setImages] = useState<Blob[]>([])
  const [text, setText] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const hasContent = !!pdf || images.length > 0 || text.trim().length > 20

  function reset() {
    setPdf(null)
    setImages([])
    setText('')
    setHint(null)
  }

  function take(files: File[] | Blob[]) {
    let found = false
    const imgs: Blob[] = []
    for (const f of files) {
      if (f.type === 'application/pdf') {
        setPdf(f)
        found = true
      } else if (f.type.startsWith('image/')) {
        imgs.push(f)
        found = true
      }
    }
    if (imgs.length) setImages((cur) => [...cur, ...imgs])
    return found
  }

  // Knopf: liest die Zwischenablage direkt (iOS zeigt dazu kurz „Einsetzen“).
  async function readClipboard() {
    setHint(null)
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        const blobs: Blob[] = []
        let plain = ''
        for (const item of items) {
          if (item.types.includes('application/pdf')) blobs.push(await item.getType('application/pdf'))
          const img = item.types.find((t) => t.startsWith('image/'))
          if (img) blobs.push(await item.getType(img))
          if (item.types.includes('text/plain')) plain += await (await item.getType('text/plain')).text()
          else if (item.types.includes('text/html')) plain += htmlToText(await (await item.getType('text/html')).text())
        }
        const gotFile = take(blobs)
        if (plain.trim()) setText((t) => (t ? `${t}\n${plain}` : plain))
        if (!gotFile && !plain.trim()) setHint('Die Zwischenablage ist leer oder enthält nichts Lesbares.')
        return
      }
      const plain = await navigator.clipboard.readText()
      if (plain.trim()) setText(plain)
      else setHint('Die Zwischenablage ist leer.')
    } catch {
      setHint('Zugriff auf die Zwischenablage nicht möglich. Tippe lange ins Feld unten und wähle „Einsetzen“.')
    }
  }

  // Feld: lange tippen → „Einsetzen“. Dateien werden abgefangen, Text landet im Feld.
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files)
    if (files.length && take(files)) e.preventDefault()
  }

  const status = [pdf ? 'PDF' : null, images.length ? `${images.length} Bild${images.length > 1 ? 'er' : ''}` : null]
    .filter(Boolean)
    .join(' + ')

  return (
    <section className={`${card} flex flex-col gap-3 p-4`}>
      <h2 className="font-semibold">Rezept einfügen</h2>
      <button type="button" className={btnSecondary} onClick={readClipboard} disabled={busy}>
        Aus Zwischenablage einfügen
      </button>
      <textarea
        className={`${input} min-h-28 text-sm`}
        placeholder="… oder hier lange tippen → „Einsetzen“. Geht mit kopiertem Rezepttext, PDF oder Screenshots."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={onPaste}
      />
      {status && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Erkannt: {status}
          {text.trim() ? ' + Text' : ''}
        </p>
      )}
      {hint && <p className="text-sm text-amber-700 dark:text-amber-400">{hint}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          className={`${btnPrimary} flex-1`}
          disabled={busy || !hasContent}
          onClick={async () => {
            // Inhalt erst nach Erfolg leeren, damit er bei einem Fehler nicht verloren geht.
            if (await onImport({ pdf: pdf ?? undefined, images, text })) reset()
          }}
        >
          Rezept auslesen
        </button>
        {hasContent && (
          <button type="button" className={btnSecondary} onClick={reset} disabled={busy}>
            Leeren
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        NYT Cooking: Rezept in Safari markieren und kopieren, oder Screenshots von Zutaten und Portionsangabe machen
        und diese kopieren.
      </p>
    </section>
  )
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.innerText || doc.body.textContent || ''
}
