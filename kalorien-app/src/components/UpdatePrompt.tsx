import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-16 inset-x-0 z-20 flex justify-center px-4">
      <div className="max-w-sm w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-3 flex items-center justify-between gap-3">
        <p className="text-sm">Neue Version verfügbar.</p>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium"
        >
          Aktualisieren
        </button>
      </div>
    </div>
  )
}
