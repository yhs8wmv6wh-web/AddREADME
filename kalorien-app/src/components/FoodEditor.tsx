import { useRef, useState } from 'react'
import type { Food, Unit } from '../types'
import { NUTRIENT_KEYS, NUTRIENT_META, perLabel, type Nutrients } from '../lib/nutrients'
import { readNutritionLabel } from '../lib/claude'
import { ErrorText, NumberField, Sheet, btnPrimary, btnSecondary, input, label } from './ui'

interface Props {
  initial?: Food
  barcode?: string
  apiKey: string
  onSave: (food: Food) => void
  onDelete?: (food: Food) => void
  onClose: () => void
}

/** Lebensmittel von Hand anlegen/bearbeiten – optional per Foto der Nährwerttabelle. */
export function FoodEditor({ initial, barcode, apiKey, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'g')
  const [per100, setPer100] = useState<Nutrients>(initial?.per100 ?? {})
  const [source, setSource] = useState<Food['source']>(initial?.source ?? 'custom')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!apiKey) {
      setError('Für das Auslesen per Foto brauchst du einen Claude-API-Schlüssel (Einstellungen).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await readNutritionLabel(apiKey, await shrinkImage(file))
      setPer100(r.per100)
      setUnit(r.unit)
      if (!name.trim() && r.name) setName(r.name)
      setSource('label')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto konnte nicht gelesen werden.')
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (!name.trim() || per100.kcal === undefined) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      source,
      sourceId: initial?.sourceId ?? barcode,
      barcode: initial?.barcode ?? barcode,
      unit,
      per100,
      portions: initial?.portions ?? [],
      lastUsed: Date.now(),
      favorite: initial?.favorite,
    })
  }

  return (
    <Sheet title={initial ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {barcode && <p className="text-sm text-neutral-500">Barcode {barcode} – wird beim nächsten Scan sofort erkannt.</p>}

        <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Claude liest die Nährwerttabelle …' : 'Nährwerttabelle fotografieren'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        <ErrorText>{error}</ErrorText>
        {source === 'label' && !busy && (
          <p className="text-sm text-amber-700 dark:text-amber-400">Werte vom Foto übernommen – bitte kurz mit der Verpackung vergleichen.</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="food-name">
            Name
          </label>
          <input id="food-name" className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="food-brand">
            Marke (optional)
          </label>
          <input id="food-brand" className={input} value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Werte gelten pro</span>
          <div className="flex gap-2">
            {(['g', 'ml', 'Stk'] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`flex-1 rounded-lg border px-3 py-2 ${unit === u ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                {u === 'Stk' ? '1 Stück' : `100 ${u}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={label}>Nährwerte {perLabel(unit)} (leer = unbekannt)</span>
          {NUTRIENT_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <label htmlFor={`n-${k}`} className="w-36 shrink-0 text-sm">
                {NUTRIENT_META[k].label}
                {k === 'kcal' && ' *'}
              </label>
              <NumberField id={`n-${k}`} value={per100[k]} onChange={(v) => setPer100((p) => ({ ...p, [k]: v }))} />
              <span className="w-10 shrink-0 text-sm text-neutral-500">{NUTRIENT_META[k].unit}</span>
            </div>
          ))}
        </div>

        <button type="button" className={btnPrimary} onClick={save} disabled={!name.trim() || per100.kcal === undefined}>
          Speichern
        </button>
        {initial && onDelete && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button type="button" className={`${btnSecondary} flex-1 text-rose-600`} onClick={() => onDelete(initial)}>
                Endgültig löschen
              </button>
              <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setConfirmDelete(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <button type="button" className="text-sm text-rose-600" onClick={() => setConfirmDelete(true)}>
              Lebensmittel löschen
            </button>
          )
        )}
      </div>
    </Sheet>
  )
}

/** Verkleinert Handyfotos (oft > 5 MB) auf max. 1600 px – spart Upload und Kosten. */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const max = 1600
    const f = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * f)
    canvas.height = Math.round(bmp.height * f)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', 0.85),
    )
  } catch {
    return file
  }
}
