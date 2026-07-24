import { useRef, useState } from 'react'
import type { BookInput } from '../types'
import { recognizeImageText } from '../lib/ocr'
import { parseLibbyText } from '../lib/parseLibbyText'
import { BookForm } from './BookForm'

interface ScreenshotImportProps {
  onSubmit: (input: BookInput) => void
  onCancel: () => void
  existingTags?: string[]
}

type Stage = 'pick' | 'scanning' | 'confirm'

export function ScreenshotImport({ onSubmit, onCancel, existingTags = [] }: ScreenshotImportProps) {
  const [stage, setStage] = useState<Stage>('pick')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [guess, setGuess] = useState<{ title: string; author: string; pages: number | null } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setPreview(URL.createObjectURL(file))
    setStage('scanning')
    setProgress(0)
    try {
      const text = await recognizeImageText(file, setProgress)
      const parsed = parseLibbyText(text)
      setGuess(parsed)
      setStage('confirm')
    } catch (err) {
      console.error(err)
      setError('Die Texterkennung ist fehlgeschlagen. Bitte versuch es erneut oder gib das Buch manuell ein.')
      setStage('pick')
    }
  }

  if (stage === 'confirm' && guess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Automatisch erkannt aus dem Screenshot. Bitte prüfen und ggf. korrigieren, bevor du speicherst.
        </p>
        {preview && (
          <img src={preview} alt="Screenshot-Vorschau" className="max-h-48 w-auto rounded-lg mx-auto object-contain" />
        )}
        <BookForm
          initial={{
            title: guess.title,
            author: guess.author,
            pages: guess.pages,
            status: 'finished',
          }}
          submitLabel="Buch speichern"
          onSubmit={onSubmit}
          onCancel={onCancel}
          existingTags={existingTags}
        />
      </div>
    )
  }

  if (stage === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        {preview && (
          <img src={preview} alt="Screenshot-Vorschau" className="max-h-48 w-auto rounded-lg object-contain" />
        )}
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Text wird erkannt … {Math.round(progress * 100)}%</p>
        <div className="w-full max-w-xs h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Mach oder wähle einen Screenshot aus deinem Libby-Verlauf (z. B. "Aktivität" → "Verlauf"). Titel und
        Autor:in werden automatisch vorausgefüllt.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border-2 border-dashed border-neutral-300 dark:border-neutral-700 py-10 text-center text-neutral-700 dark:text-neutral-300 font-medium"
      >
        Screenshot auswählen
      </button>
      {error && <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>}
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 py-2.5 font-medium text-neutral-700 dark:text-neutral-300"
      >
        Abbrechen
      </button>
    </div>
  )
}
