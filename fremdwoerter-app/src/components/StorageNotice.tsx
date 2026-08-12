import type { StorageStatus } from '../db'

interface StorageNoticeProps {
  status: StorageStatus | null
  standalone: boolean
}

// Zeigt in den Einstellungen, wie sicher die Daten auf dem Gerät liegen, und
// erklärt, wie man den Speicher am besten schützt (v. a. auf dem iPhone).
export function StorageNotice({ status, standalone }: StorageNoticeProps) {
  const geschuetzt = status === 'persistent'

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-xl mb-1">Speicher &amp; Datensicherheit</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Deine Wörter liegen ausschließlich lokal auf diesem Gerät.
        </p>
      </div>

      {geschuetzt ? (
        <div className="rounded-md bg-teal-50 dark:bg-teal-950/30 px-3 py-2.5 text-sm text-teal-800 dark:text-teal-300">
          Dauerhafter Speicher ist <strong>aktiv ✓</strong> – deine Wörter sind auf diesem Gerät geschützt.
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          Dauerhafter Speicher ist <strong>nicht garantiert</strong>. iOS kann die Daten in seltenen Fällen
          löschen. So schützt du sie am besten:
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {!standalone && (
              <li>
                App über <strong>Teilen → „Zum Home-Bildschirm"</strong> hinzufügen und danach{' '}
                <strong>immer über dieses Symbol</strong> öffnen (nicht als Safari-Tab).
              </li>
            )}
            <li>Die App gelegentlich öffnen, damit iOS sie als „genutzt" behandelt.</li>
            <li>
              Ab und zu unten auf <strong>„Sichern"</strong> tippen – so hast du jederzeit eine Kopie zum
              Wiederherstellen.
            </li>
          </ul>
        </div>
      )}

      {standalone && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Die App läuft als installierte App vom Home-Bildschirm. 👍
        </p>
      )}
    </div>
  )
}
