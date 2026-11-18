import { useState } from 'react'
import { btnPrimary, card, input } from './ui'

interface Props {
  busy: boolean
  onImport: (text: string) => Promise<boolean>
}

/** Frei beschreiben (am besten diktieren), was gekocht wurde – Claude macht ein Rezept daraus. */
export function RecipeDescribe({ busy, onImport }: Props) {
  const [text, setText] = useState('')
  return (
    <section className={`${card} flex flex-col gap-3 p-4`}>
      <h2 className="font-semibold">Was hast du gekocht?</h2>
      <textarea
        className={`${input} min-h-32 text-sm`}
        placeholder="z. B. „Ich hab zwei Zwiebeln und eine Knoblauchzehe in einem Esslöffel Olivenöl angebraten, dann 500 g Rinderhack, eine Dose Tomaten und 250 g Nudeln. Reicht für drei Portionen.“"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-xs text-neutral-500">
        Zum Sprechen ins Feld tippen und auf der Tastatur das Mikrofon antippen. Mengen dürfen ungefähr sein, Claude schätzt
        den Rest. Danach kannst du alles korrigieren.
      </p>
      <button
        type="button"
        className={btnPrimary}
        disabled={busy || text.trim().length < 10}
        onClick={async () => {
          // Text erst nach Erfolg leeren, damit Diktiertes nicht verloren geht.
          if (await onImport(text)) setText('')
        }}
      >
        Rezeptvorschlag erstellen
      </button>
    </section>
  )
}
