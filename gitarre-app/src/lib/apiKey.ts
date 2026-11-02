// Anthropic-API-Schlüssel, nur lokal im Browser (localStorage).
// localStorage gilt pro Origin – ein in der Fremdwörter-App (gleiche Domain)
// gespeicherter Schlüssel wird deshalb automatisch mitbenutzt.
const OWN_KEY = 'gitarre.apiKey'
const SHARED_KEY = 'fremdwoerter.apiKey'

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(OWN_KEY) || localStorage.getItem(SHARED_KEY)
  } catch {
    return null
  }
}

export function apiKeySource(): 'own' | 'fremdwoerter' | null {
  try {
    if (localStorage.getItem(OWN_KEY)) return 'own'
    if (localStorage.getItem(SHARED_KEY)) return 'fremdwoerter'
  } catch {
    /* ignorieren */
  }
  return null
}

export function setApiKey(key: string): void {
  localStorage.setItem(OWN_KEY, key.trim())
}

export function clearApiKey(): void {
  localStorage.removeItem(OWN_KEY)
}
