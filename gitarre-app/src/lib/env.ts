// Läuft die App als claude.ai-Artefakt (eigener Build-Modus)?
export const ARTIFACT = import.meta.env.MODE === 'artifact'

// Minimale Typen für die Laufzeit-Schnittstelle der Artefakte (window.claude).
export interface DocSnap {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
}
export interface QuerySnap {
  docs: DocSnap[]
}
export interface DocRef {
  get(): Promise<DocSnap>
  set(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  collection(path: string): CollRef
}
export interface CollRef {
  doc(id: string): DocRef
  limit(n: number): { get(): Promise<QuerySnap> }
}
export interface DB {
  doc(path: string): DocRef
}
export interface UserNs {
  id(): Promise<string | null>
}
export interface SampleFn {
  json<T = unknown>(input: string, opts?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal; cache?: boolean }): Promise<T>
}

interface ClaudeWindow {
  claude?: { use(name: string): Promise<unknown> }
}

export async function getCapability<T>(name: string): Promise<T | null> {
  const c = (window as unknown as ClaudeWindow).claude
  if (!c?.use) return null
  try {
    return ((await c.use(name)) as T | null) ?? null
  } catch {
    return null
  }
}
