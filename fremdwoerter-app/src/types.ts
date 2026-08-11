export interface Fremdwort {
  id: string
  word: string // das eingegebene Wort
  explanation: string // kurze, bündige deutsche Erklärung
  isGerman: boolean // von der KI bestimmt: deutsches Wort oder Fremdwort
  etymology: string // Herkunft; '' wenn es ein deutsches Wort ist
  createdAt: number
}

// Was die KI liefert, bevor wir id/createdAt vergeben.
export type LookupResult = Omit<Fremdwort, 'id' | 'createdAt'>
export type FremdwortInput = LookupResult
