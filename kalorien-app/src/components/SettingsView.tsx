import { useEffect, useRef, useState } from 'react'
import type { ActivityTemplate, Settings } from '../types'
import { deleteTemplate, exportAll, getTemplates, importAll, saveTemplate } from '../db'
import { ACTIVITY_LEVELS, CYCLING_PRESETS, templateKcal, type Targets } from '../lib/calc'
import { WEEKDAY_SHORT, today } from '../lib/date'
import { fmtNum } from '../lib/nutrients'
import { ErrorText, NumberField, Sheet, btnLink, btnPrimary, btnSecondary, card, input, label } from './ui'

interface Props {
  settings: Settings
  isNew: boolean
  targets: Targets
  weightKg: number
  onSave: (s: Settings) => Promise<void>
  onDataChanged: () => void
}

const LAST_BACKUP_KEY = 'kalorien.lastBackup'

export function SettingsView({ settings, isNew, targets, weightKg, onSave, onDataChanged }: Props) {
  const [s, setS] = useState<Settings>(settings)
  const [saved, setSaved] = useState(false)
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [editing, setEditing] = useState<ActivityTemplate | null>(null)

  // Nur übernehmen, wenn sich die gespeicherten Werte wirklich geändert haben –
  // sonst würden ungespeicherte Eingaben beim App-Wechsel verworfen.
  const settingsJson = JSON.stringify(settings)
  useEffect(() => setS(JSON.parse(settingsJson)), [settingsJson])
  useEffect(() => {
    getTemplates().then(setTemplates)
  }, [])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((cur) => ({ ...cur, [k]: v }))
    setSaved(false)
  }

  async function save() {
    await onSave(s)
    setSaved(true)
  }

  if (editing)
    return (
      <TemplateEditor
        template={editing}
        weightKg={weightKg}
        onSave={async (t) => {
          await saveTemplate(t)
          setTemplates(await getTemplates())
          setEditing(null)
          onDataChanged()
        }}
        onDelete={async (t) => {
          await deleteTemplate(t.id)
          setTemplates(await getTemplates())
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    )

  return (
    <div className="flex flex-col gap-6">
      {isNew && (
        <p className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-900 dark:text-emerald-200">
          Willkommen. Trag zuerst deine Daten ein, damit die App dein Kalorienziel berechnen kann. Danach unten speichern.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Profil</h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['f', 'Weiblich'],
              ['m', 'Männlich'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                set('sex', v)
                // DGE-Referenzwerte unterscheiden sich bei Eisen und Magnesium.
                set('microTargets', { ...s.microTargets, iron: v === 'm' ? 11 : 16, magnesium: v === 'm' ? 350 : 300 })
              }}
              className={`rounded-lg border px-3 py-2 ${s.sex === v ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <Field label="Geburtsjahr" value={s.birthYear} onChange={(v) => set('birthYear', v ?? s.birthYear)} />
        <Field label="Größe (cm)" value={s.heightCm} onChange={(v) => set('heightCm', v ?? s.heightCm)} />
        <Field label="Startgewicht (kg)" value={s.startWeightKg} onChange={(v) => set('startWeightKg', v ?? s.startWeightKg)} />
        <Field label="Zielgewicht (kg)" value={s.goalWeightKg} onChange={(v) => set('goalWeightKg', v ?? s.goalWeightKg)} />
        <div className="flex flex-col gap-1.5">
          <span className={label}>Tempo</span>
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set('pacePerWeekKg', p)}
                className={`rounded-lg border px-2 py-2 text-sm ${s.pacePerWeekKg === p ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                {fmtNum(p, 2)} kg/Wo
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Alltag ohne Sport</span>
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => set('activityFactor', a.value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${s.activityFactor === a.value ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              {a.label}
            </button>
          ))}
          <p className="text-xs text-neutral-500">Training und Fahrrad hier nicht einrechnen, die kommen über die Trainingseinträge dazu.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ziele</h2>
        <Field label="Eiweiß (g pro kg Zielgewicht)" value={s.proteinPerKg} onChange={(v) => set('proteinPerKg', v ?? s.proteinPerKg)} />
        <Field label="Fettanteil (% der kcal)" value={s.fatPct} onChange={(v) => set('fatPct', v ?? s.fatPct)} />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-emerald-600"
            checked={s.addExerciseToBudget}
            onChange={(e) => set('addExerciseToBudget', e.target.checked)}
          />
          Trainings-kcal zum Tagesbudget addieren
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Eisen (mg)" value={s.microTargets.iron} onChange={(v) => set('microTargets', { ...s.microTargets, iron: v ?? 0 })} />
          <Field label="Magnesium (mg)" value={s.microTargets.magnesium} onChange={(v) => set('microTargets', { ...s.microTargets, magnesium: v ?? 0 })} />
          <Field label="Vitamin D (µg)" value={s.microTargets.vitD} onChange={(v) => set('microTargets', { ...s.microTargets, vitD: v ?? 0 })} />
          <Field label="Vitamin B12 (µg)" value={s.microTargets.b12} onChange={(v) => set('microTargets', { ...s.microTargets, b12: v ?? 0 })} />
        </div>
        <p className="text-xs text-neutral-500">Vorgabe: Referenzwerte der DGE für Erwachsene. Vitamin D gilt ohne Eigenbildung durch Sonne.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Schlüssel</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ak" className={label}>
            Claude-API-Schlüssel
          </label>
          <input id="ak" type="password" autoComplete="off" className={input} placeholder="sk-ant-…" value={s.anthropicKey} onChange={(e) => set('anthropicKey', e.target.value.trim())} />
          <p className="text-xs text-neutral-500">Für Rezept-PDFs, Foto der Nährwerttabelle und deutsche Suche. Von console.anthropic.com. Bleibt nur auf diesem Gerät.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uk" className={label}>
            USDA-Schlüssel
          </label>
          <input id="uk" type="password" autoComplete="off" className={input} placeholder="leer = DEMO_KEY (stark begrenzt)" value={s.usdaKey} onChange={(e) => set('usdaKey', e.target.value.trim())} />
          <p className="text-xs text-neutral-500">Kostenlos unter api.data.gov/signup (nur E-Mail nötig, kommt sofort).</p>
        </div>
      </section>

      <div className="sticky bottom-20 z-10 flex flex-col gap-2">
        <button type="button" className={`${btnPrimary} shadow-lg`} onClick={save}>
          {saved ? 'Gespeichert' : 'Einstellungen speichern'}
        </button>
      </div>

      <section className={`${card} p-4`}>
        <h3 className={`${label} mb-2`}>Dein Tagesziel (mit gespeicherten Werten)</h3>
        <dl className="flex flex-col gap-1 text-sm tabular-nums">
          <Row k="Grundumsatz (Mifflin-St Jeor)" v={`${fmtNum(targets.bmr)} kcal`} />
          <Row k="Gesamtumsatz ohne Sport" v={`${fmtNum(targets.tdee)} kcal`} />
          <Row k="Defizit" v={`− ${fmtNum(targets.deficit)} kcal`} />
          <Row k="Kalorienziel" v={`${fmtNum(targets.kcal)} kcal`} strong />
          <Row k="Eiweiß / Kohlenhydrate / Fett" v={`${targets.protein} / ${targets.carbs} / ${targets.fat} g`} />
        </dl>
        {targets.belowBmr && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Das Ziel liegt unter deinem Grundumsatz. Ein langsameres Tempo ist nachhaltiger.
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-500">Gerechnet mit {fmtNum(weightKg, 1)} kg (letzte Messung). 1 kg Fett ≈ 7.700 kcal.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Feste Aktivitäten</h2>
        <p className="text-sm text-neutral-500">
          Werden an den gewählten Tagen automatisch eingetragen. Fällt etwas aus, löschst du den Eintrag im Tagebuch.
        </p>
        {templates.length > 0 && (
          <ul className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
            {templates.map((t) => (
              <li key={t.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left" onClick={() => setEditing(t)}>
                  <span className="min-w-0">
                    <span className={`block truncate ${t.active ? '' : 'text-neutral-400 line-through'}`}>{t.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {t.weekdays.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')}
                      {t.slots.length ? ` · ${t.slots.join(' + ')}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-500">
                    {fmtNum(templateKcal(t, weightKg))} kcal{t.slots.length > 1 ? ' je' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                name: 'Arbeitsweg Fahrrad',
                kind: 'cycling',
                weekdays: [1, 2, 3, 4, 5],
                slots: ['morgens', 'nachmittags'],
                minutes: 20,
                met: 6.8,
                startDate: today(),
                active: true,
              })
            }
          >
            + Arbeitsweg
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() =>
              setEditing({ id: crypto.randomUUID(), name: 'eGym', kind: 'fixed', weekdays: [], slots: [], kcal: undefined, startDate: today(), active: true })
            }
          >
            + Feste kcal (z. B. eGym)
          </button>
        </div>
      </section>

      <BackupSection onImported={onDataChanged} />
    </div>
  )
}

function Field({ label: l, value, onChange }: { label: string; value: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{l}</span>
      <NumberField value={value} onChange={onChange} />
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-neutral-500'}>{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

function TemplateEditor({
  template,
  weightKg,
  onSave,
  onDelete,
  onClose,
}: {
  template: ActivityTemplate
  weightKg: number
  onSave: (t: ActivityTemplate) => void
  onDelete: (t: ActivityTemplate) => void
  onClose: () => void
}) {
  const [t, setT] = useState(template)
  const [slotText, setSlotText] = useState(template.slots.join(', '))
  const toggleDay = (d: number) => setT({ ...t, weekdays: t.weekdays.includes(d) ? t.weekdays.filter((x) => x !== d) : [...t.weekdays, d].sort() })
  const slots = slotText
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  const valid = t.name.trim() && t.weekdays.length > 0 && (t.kind === 'cycling' ? (t.minutes ?? 0) > 0 : (t.kcal ?? 0) > 0)

  return (
    <Sheet title="Feste Aktivität" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={label}>Name</span>
          <input className={input} value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['cycling', 'Fahrrad (berechnet)'],
              ['fixed', 'Feste kcal'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setT({ ...t, kind: k })}
              className={`rounded-lg border px-3 py-2 text-sm ${t.kind === k ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Wochentage</span>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i + 1)}
                className={`rounded-lg border py-2 text-sm ${t.weekdays.includes(i + 1) ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Mehrmals am Tag? (optional)</span>
          <input className={input} placeholder="z. B. morgens, nachmittags" value={slotText} onChange={(e) => setSlotText(e.target.value)} />
          <p className="text-xs text-neutral-500">Mit Komma getrennt. Pro Angabe wird ein eigener Eintrag angelegt, den du einzeln löschen kannst. Leer = einmal am Tag.</p>
        </div>

        {t.kind === 'cycling' ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Minuten pro Fahrt</span>
              <NumberField value={t.minutes} onChange={(v) => setT({ ...t, minutes: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Tempo</span>
              {CYCLING_PRESETS.map((p) => (
                <button
                  key={p.met}
                  type="button"
                  onClick={() => setT({ ...t, met: p.met })}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${t.met === p.met ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-semibold' : 'border-neutral-300 dark:border-neutral-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className={label}>kcal pro Einheit</span>
            <NumberField value={t.kcal} onChange={(v) => setT({ ...t, kcal: v })} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={label}>Gilt ab</span>
          <input type="date" className={input} value={t.startDate} onChange={(e) => e.target.value && setT({ ...t, startDate: e.target.value })} />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} />
          Aktiv (pausieren z. B. im Urlaub)
        </label>

        <p className="text-2xl font-semibold tabular-nums">
          {fmtNum(templateKcal(t, weightKg))} kcal{slots.length > 1 ? ` je Eintrag, ${slots.length}× pro Tag` : ''}
        </p>

        <button type="button" className={btnPrimary} disabled={!valid} onClick={() => onSave({ ...t, name: t.name.trim(), slots })}>
          Speichern
        </button>
        <button type="button" className="text-sm text-rose-600" onClick={() => onDelete(t)}>
          Aktivität löschen (bisherige Einträge bleiben)
        </button>
      </div>
    </Sheet>
  )
}

function BackupSection({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const last = (() => {
    try {
      const n = Number(localStorage.getItem(LAST_BACKUP_KEY))
      return n ? new Date(n).toLocaleDateString('de-DE') : null
    } catch {
      return null
    }
  })()

  async function doExport() {
    setError(null)
    const json = await exportAll()
    const file = new File([json], `kalorien-backup-${today()}.json`, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Kalorien-Backup' })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
      localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
      setMsg('Backup erstellt.')
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) setError('Backup konnte nicht erstellt werden.')
    }
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError(null)
    try {
      await importAll(await f.text())
      setMsg('Backup wiederhergestellt.')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden.')
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Datensicherung</h2>
      <p className="text-sm text-neutral-500">
        Alle Daten liegen nur auf diesem iPhone. Sichere regelmäßig in „Dateien" oder iCloud Drive.
        {last ? ` Letztes Backup: ${last}.` : ' Noch kein Backup.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnSecondary} onClick={doExport}>
          Backup erstellen
        </button>
        <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
          Wiederherstellen
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
      {msg && <p className={`text-sm ${btnLink}`}>{msg}</p>}
      <ErrorText>{error}</ErrorText>
      <p className="text-xs text-neutral-500">API-Schlüssel werden nicht mitgesichert.</p>
    </section>
  )
}
