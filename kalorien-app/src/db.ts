import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ActivityEntry, ActivityTemplate, BodyLog, Food, FoodEntry, Recipe, Settings, SupplementPlan } from './types'
import { addDays, today, weekday } from './lib/date'
import { templateKcal } from './lib/calc'
import { forAmount } from './lib/nutrients'

interface KalorienDB extends DBSchema {
  foods: { key: string; value: Food; indexes: { 'by-barcode': string } }
  entries: { key: string; value: FoodEntry; indexes: { 'by-date': string } }
  recipes: { key: string; value: Recipe }
  activities: { key: string; value: ActivityEntry; indexes: { 'by-date': string } }
  templates: { key: string; value: ActivityTemplate }
  // Merkt sich, für welchen Tag/Slot eine Vorlage schon eingetragen wurde.
  // So taucht eine gelöschte Fahrt nicht wieder auf.
  materialized: { key: string; value: { key: string } }
  body: { key: string; value: BodyLog }
  kv: { key: string; value: unknown }
}

// Eigener Name: IndexedDB gilt pro Origin, alle Apps teilen sich github.io.
const DB_NAME = 'kalorien'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<KalorienDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KalorienDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('foods', { keyPath: 'id' }).createIndex('by-barcode', 'barcode')
        db.createObjectStore('entries', { keyPath: 'id' }).createIndex('by-date', 'date')
        db.createObjectStore('recipes', { keyPath: 'id' })
        db.createObjectStore('activities', { keyPath: 'id' }).createIndex('by-date', 'date')
        db.createObjectStore('templates', { keyPath: 'id' })
        db.createObjectStore('materialized', { keyPath: 'key' })
        db.createObjectStore('body', { keyPath: 'date' })
        db.createObjectStore('kv')
      },
    })
  }
  return dbPromise
}

// ---------- Einstellungen ----------

export const DEFAULT_SETTINGS: Settings = {
  sex: 'f',
  birthYear: 1990,
  heightCm: 170,
  startWeightKg: 80,
  goalWeightKg: 70,
  pacePerWeekKg: 0.5,
  activityFactor: 1.2,
  proteinPerKg: 1.8,
  fatPct: 30,
  addExerciseToBudget: true,
  // DGE-Referenzwerte für Erwachsene (25–51 J.); je nach Geschlecht beim ersten Speichern gesetzt.
  microTargets: { iron: 16, magnesium: 300, vitD: 20, b12: 4 },
  anthropicKey: '',
  usdaKey: '',
}

export async function getSettings(): Promise<{ settings: Settings; isNew: boolean }> {
  const db = await getDB()
  const stored = (await db.get('kv', 'settings')) as Partial<Settings> | undefined
  if (!stored) return { settings: DEFAULT_SETTINGS, isNew: true }
  return {
    settings: { ...DEFAULT_SETTINGS, ...stored, microTargets: { ...DEFAULT_SETTINGS.microTargets, ...stored.microTargets } },
    isNew: false,
  }
}

export async function saveSettings(s: Settings) {
  const db = await getDB()
  await db.put('kv', s, 'settings')
}

// ---------- Lebensmittel ----------

export async function getFoods(): Promise<Food[]> {
  const db = await getDB()
  return (await db.getAll('foods')).sort((a, b) => b.lastUsed - a.lastUsed)
}

export async function getFoodByBarcode(code: string): Promise<Food | undefined> {
  const db = await getDB()
  return db.getFromIndex('foods', 'by-barcode', code)
}

/** Speichert ein Lebensmittel; gleiche Quelle + ID wird überschrieben statt gedoppelt. */
export async function saveFood(food: Food): Promise<Food> {
  const db = await getDB()
  if (food.sourceId) {
    const all = await db.getAll('foods')
    const existing = all.find((f) => f.source === food.source && f.sourceId === food.sourceId && f.id !== food.id)
    if (existing) food = { ...food, id: existing.id, portions: food.portions.length ? food.portions : existing.portions }
  }
  await db.put('foods', food)
  return food
}

export async function deleteFood(id: string) {
  const db = await getDB()
  await db.delete('foods', id)
}

// ---------- Tagebuch ----------

export async function getEntries(date: string): Promise<FoodEntry[]> {
  const db = await getDB()
  return (await db.getAllFromIndex('entries', 'by-date', date)).sort((a, b) => a.createdAt - b.createdAt)
}

export async function getEntriesRange(from: string, to: string): Promise<FoodEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('entries', 'by-date', IDBKeyRange.bound(from, to))
}

export async function saveEntry(e: FoodEntry) {
  const db = await getDB()
  await db.put('entries', e)
}

export async function deleteEntry(id: string) {
  const db = await getDB()
  await db.delete('entries', id)
}

// ---------- Rezepte ----------

export async function getRecipes(): Promise<Recipe[]> {
  const db = await getDB()
  return (await db.getAll('recipes')).sort((a, b) => b.lastUsed - a.lastUsed)
}

export async function saveRecipe(r: Recipe) {
  const db = await getDB()
  await db.put('recipes', r)
}

export async function deleteRecipe(id: string) {
  const db = await getDB()
  await db.delete('recipes', id)
}

// ---------- Aktivitäten ----------

export async function getActivities(date: string): Promise<ActivityEntry[]> {
  const db = await getDB()
  return (await db.getAllFromIndex('activities', 'by-date', date)).sort((a, b) => a.createdAt - b.createdAt)
}

export async function getActivitiesRange(from: string, to: string): Promise<ActivityEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('activities', 'by-date', IDBKeyRange.bound(from, to))
}

export async function saveActivity(a: ActivityEntry) {
  const db = await getDB()
  await db.put('activities', a)
}

export async function deleteActivity(id: string) {
  const db = await getDB()
  await db.delete('activities', id)
}

export async function getTemplates(): Promise<ActivityTemplate[]> {
  const db = await getDB()
  return db.getAll('templates')
}

export async function saveTemplate(t: ActivityTemplate) {
  const db = await getDB()
  await db.put('templates', t)
}

/** Rechnet alle automatisch angelegten Einträge einer Vorlage neu (nach Änderung). */
export async function recalcTemplateEntries(t: ActivityTemplate, weightKg: number) {
  const db = await getDB()
  const all = await db.getAll('activities')
  const kcal = templateKcal(t, weightKg)
  for (const a of all) {
    if (a.templateId !== t.id) continue
    await db.put('activities', {
      ...a,
      name: a.slot ? `${t.name} (${a.slot})` : t.name,
      kcal,
      minutes: t.kind === 'cycling' ? t.minutes : undefined,
      distanceKm: t.kind === 'cycling' ? t.distanceKm : undefined,
    })
  }
}

export async function deleteTemplate(id: string) {
  const db = await getDB()
  await db.delete('templates', id)
}

/**
 * Trägt wiederkehrende Aktivitäten automatisch ein. Standard: alle Tage ab
 * Startdatum der Vorlage bis heute (höchstens 60 Tage zurück). Mit `range`
 * auch für einen bestimmten Tag, z. B. einen zukünftigen, den du im
 * Tagebuch öffnest. Jeder Tag/Slot wird genau einmal eingetragen; was du
 * löschst, bleibt gelöscht.
 */
export async function materializeTemplates(weightKg: number, range?: { from: string; to: string }): Promise<number> {
  const db = await getDB()
  const templates = (await db.getAll('templates')).filter((t) => t.active)
  const end = range?.to ?? today()
  const from = range?.from ?? addDays(end, -60)
  let created = 0
  for (const t of templates) {
    let day = t.startDate > from ? t.startDate : from
    while (day <= end) {
      if (t.weekdays.includes(weekday(day))) {
        const slots = t.slots.length ? t.slots : ['']
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]
          // Index statt Name: Umbenennen eines Slots erzeugt keine Doppel-Einträge.
          const key = `${t.id}|${i}|${day}`
          // Prüfen und Eintragen in derselben Transaktion: IndexedDB führt
          // schreibende Transaktionen nacheinander aus, so entstehen keine Doppel.
          const tx = db.transaction(['materialized', 'activities'], 'readwrite')
          if (await tx.objectStore('materialized').get(key)) {
            await tx.done
            continue
          }
          {
            await tx.objectStore('materialized').put({ key })
            await tx.objectStore('activities').put({
              id: crypto.randomUUID(),
              date: day,
              name: slot ? `${t.name} (${slot})` : t.name,
              kcal: templateKcal(t, weightKg),
              minutes: t.kind === 'cycling' ? t.minutes : undefined,
              distanceKm: t.kind === 'cycling' ? t.distanceKm : undefined,
              templateId: t.id,
              slot,
              createdAt: Date.now() + i, // hält die Reihenfolge morgens → nachmittags
            })
            await tx.done
            created++
          }
        }
      }
      day = addDays(day, 1)
    }
  }
  created += await materializeSupplements(from, end)
  return created
}

// ---------- Supplements ----------

export async function getSupplements(): Promise<SupplementPlan[]> {
  const db = await getDB()
  return ((await db.get('kv', 'supplements')) as SupplementPlan[] | undefined) ?? []
}

export async function saveSupplement(p: SupplementPlan) {
  const db = await getDB()
  const list = (await getSupplements()).filter((x) => x.id !== p.id)
  await db.put('kv', [...list, p], 'supplements')
}

export async function deleteSupplement(id: string) {
  const db = await getDB()
  await db.put('kv', (await getSupplements()).filter((x) => x.id !== id), 'supplements')
}

/**
 * Nach Änderung oder Entfernen eines Supplements: Einträge ab heute anpassen
 * bzw. ab morgen entfernen. Vergangene Tage bleiben, wie sie waren.
 */
export async function syncSupplementEntries(food: Food, amount: number | null) {
  const db = await getDB()
  const t = today()
  const entries = await db.getAllFromIndex('entries', 'by-date', IDBKeyRange.lowerBound(t))
  for (const e of entries) {
    if (e.meal !== 'supplements' || e.refId !== food.id) continue
    if (amount === null) {
      if (e.date > t) await db.delete('entries', e.id)
    } else {
      await db.put('entries', { ...e, name: food.name, amount, pieceName: food.pieceName, nutrients: forAmount(food.per100, food.unit, amount) })
    }
  }
}

/** Trägt aktive Supplements für die Tage im Bereich ein (je Tag genau einmal). */
async function materializeSupplements(from: string, to: string): Promise<number> {
  const db = await getDB()
  const plans = (await getSupplements()).filter((p) => p.active)
  let created = 0
  for (const p of plans) {
    const food = await db.get('foods', p.foodId)
    if (!food) continue
    let day = p.startDate > from ? p.startDate : from
    while (day <= to) {
      if (p.weekdays.includes(weekday(day))) {
        const key = `sup|${p.id}|${day}`
        const tx = db.transaction(['materialized', 'entries'], 'readwrite')
        if (!(await tx.objectStore('materialized').get(key))) {
          await tx.objectStore('materialized').put({ key })
          await tx.objectStore('entries').put({
            id: crypto.randomUUID(),
            date: day,
            meal: 'supplements',
            kind: 'food',
            refId: food.id,
            name: food.name,
            amount: p.amount,
            unit: food.unit,
            pieceName: food.pieceName,
            nutrients: forAmount(food.per100, food.unit, p.amount),
            createdAt: Date.now(),
          })
          created++
        }
        await tx.done
      }
      day = addDays(day, 1)
    }
  }
  return created
}

// ---------- Abgeschlossene Tage ----------

export async function getClosedDays(): Promise<string[]> {
  const db = await getDB()
  return ((await db.get('kv', 'closedDays')) as string[] | undefined) ?? []
}

export async function setDayClosed(date: string, closed: boolean) {
  const db = await getDB()
  const days = new Set(await getClosedDays())
  if (closed) days.add(date)
  else days.delete(date)
  await db.put('kv', [...days].sort(), 'closedDays')
}

// ---------- Körperdaten ----------

export async function getBodyLogs(): Promise<BodyLog[]> {
  const db = await getDB()
  return (await db.getAll('body')).sort((a, b) => a.date.localeCompare(b.date))
}

export async function saveBodyLog(b: BodyLog) {
  const db = await getDB()
  if (b.weightKg === undefined && b.bodyFatPct === undefined) await db.delete('body', b.date)
  else await db.put('body', b)
}

/** Letztes eingetragenes Gewicht oder Startgewicht. */
export function currentWeight(logs: BodyLog[], s: Settings): number {
  for (let i = logs.length - 1; i >= 0; i--) {
    const w = logs[i].weightKg
    if (w !== undefined) return w
  }
  return s.startWeightKg
}

// ---------- Backup ----------

const STORES = ['foods', 'entries', 'recipes', 'activities', 'templates', 'materialized', 'body'] as const

export async function exportAll(): Promise<string> {
  const db = await getDB()
  const data: Record<string, unknown> = { app: 'kalorien', version: 1, exportedAt: new Date().toISOString() }
  for (const s of STORES) data[s] = await db.getAll(s)
  const settings = (await getSettings()).settings
  // API-Schlüssel gehören nicht in eine Datei, die evtl. in der Cloud landet.
  data.settings = { ...settings, anthropicKey: '', usdaKey: '' }
  data.closedDays = await getClosedDays()
  data.supplements = await getSupplements()
  return JSON.stringify(data)
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data?.app !== 'kalorien') throw new Error('Keine Kalorien-Backup-Datei.')
  const db = await getDB()
  for (const s of STORES) {
    const list = data[s]
    if (!Array.isArray(list)) continue
    const tx = db.transaction(s, 'readwrite')
    for (const item of list) await tx.store.put(item)
    await tx.done
  }
  if (Array.isArray(data.supplements)) {
    const ids = new Set((data.supplements as SupplementPlan[]).map((p) => p.id))
    await db.put('kv', [...(await getSupplements()).filter((p) => !ids.has(p.id)), ...data.supplements], 'supplements')
  }
  if (Array.isArray(data.closedDays)) {
    const merged = new Set([...(await getClosedDays()), ...data.closedDays])
    await db.put('kv', [...merged].sort(), 'closedDays')
  }
  if (data.settings) {
    const current = (await getSettings()).settings
    await saveSettings({ ...current, ...data.settings, anthropicKey: current.anthropicKey, usdaKey: current.usdaKey })
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
