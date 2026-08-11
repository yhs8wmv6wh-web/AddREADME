// Der Anthropic-API-Schlüssel wird ausschließlich lokal im Browser des Geräts
// gespeichert (localStorage). Er verlässt das Gerät nur beim direkten Aufruf
// der Anthropic-API und steht nirgends im Quellcode.
const STORAGE_KEY = 'fremdwoerter.apiKey'

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}
