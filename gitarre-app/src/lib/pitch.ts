// Tonhöhenerkennung fürs Stimmgerät (Autokorrelation, robust genug für Gitarre).

export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length
  let rms = 0
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / n)
  if (rms < 0.01) return null

  // Bereich 70 Hz (unter tiefem E) bis 1000 Hz
  const minLag = Math.floor(sampleRate / 1000)
  const maxLag = Math.min(Math.floor(sampleRate / 70), n - 1)
  const corr = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < n - lag; i++) sum += buf[i] * buf[i + lag]
    corr[lag] = sum
  }
  // Erstes deutliches Maximum (vermeidet Oktavfehler nach unten)
  let best = -1
  let bestVal = 0
  let max = 0
  for (let lag = minLag; lag <= maxLag; lag++) if (corr[lag] > max) max = corr[lag]
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1] && corr[lag] > 0.9 * max) {
      best = lag
      bestVal = corr[lag]
      break
    }
  }
  if (best < 0 || bestVal <= 0) return null
  // Parabolische Interpolation für Zwischenwerte
  const y1 = corr[best - 1]
  const y2 = corr[best]
  const y3 = corr[best + 1]
  const denom = y1 - 2 * y2 + y3
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0
  return sampleRate / (best + shift)
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}
