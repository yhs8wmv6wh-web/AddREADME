import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Sheet, btnPrimary, input } from './ui'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

/** Live-Barcode-Scanner über die Rückkamera (EAN/UPC wie auf Lebensmitteln). */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const doneRef = useRef(false)

  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
    let controls: IScannerControls | null = null
    let cancelled = false

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result) => {
          if (result && !doneRef.current) {
            doneRef.current = true
            controls?.stop()
            navigator.vibrate?.(60)
            onDetected(result.getText())
          }
        },
      )
      .then((c) => {
        controls = c
        if (cancelled) c.stop()
      })
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Kein Kamerazugriff. Erlaube die Kamera unter Einstellungen → Safari → Kamera (bzw. für diese App) und öffne den Scanner erneut.'
            : 'Kamera konnte nicht gestartet werden. Du kannst die Nummer unter dem Barcode auch eintippen.',
        )
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [onDetected])

  return (
    <Sheet title="Barcode scannen" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[3/4] max-h-[60dvh] w-full">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
        </div>
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : (
          <p className="text-sm text-neutral-500">Barcode in den Rahmen halten. Er wird automatisch erkannt.</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const code = manual.replace(/\D/g, '')
            if (code.length >= 8) onDetected(code)
          }}
        >
          <input
            className={input}
            inputMode="numeric"
            placeholder="Nummer eintippen"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button type="submit" className={btnPrimary} disabled={manual.replace(/\D/g, '').length < 8}>
            Suchen
          </button>
        </form>
      </div>
    </Sheet>
  )
}
