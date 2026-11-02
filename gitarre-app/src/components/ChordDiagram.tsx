import { getShape, type ChordShape } from '../lib/chords'
import { strum } from '../lib/audio'
import { displayChord } from '../lib/music'

interface Props {
  chord: string
  shape?: ChordShape | null
  size?: 'sm' | 'md' | 'lg'
  german?: boolean
  /** Antippen spielt den Akkord ab (Standard: an) */
  playable?: boolean
  highlight?: 'known' | 'next' | null
  onClick?: () => void
}

const WIDTHS = { sm: 'w-16', md: 'w-24', lg: 'w-44' }

export function ChordDiagram({ chord, shape, size = 'md', german = false, playable = true, highlight, onClick }: Props) {
  const s = shape === undefined ? getShape(chord) : shape
  const name = displayChord(chord, german)

  const handle = () => {
    if (playable && s) strum(s.frets)
    onClick?.()
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={`${size === 'md' ? 'w-full max-w-24' : WIDTHS[size]} shrink-0 flex flex-col items-center rounded-md p-1 ${
        highlight === 'next' ? 'opacity-60' : ''
      } active:bg-neutral-100 dark:active:bg-neutral-800`}
      aria-label={`Akkord ${name}${playable ? ' abspielen' : ''}`}
    >
      <span
        className={`font-semibold leading-tight ${size === 'lg' ? 'text-3xl mb-1' : size === 'md' ? 'text-base' : 'text-sm'} ${
          highlight === 'known' ? 'text-teal-600 dark:text-teal-400' : ''
        }`}
      >
        {name}
      </span>
      {s ? <Diagram shape={s} showFingers={size !== 'sm'} /> : <span className="text-xs text-neutral-400 py-6">kein Griff</span>}
      {s?.note && size !== 'sm' && <span className="text-[10px] text-neutral-500 leading-tight mt-0.5">{s.note}</span>}
    </button>
  )
}

function Diagram({ shape, showFingers }: { shape: ChordShape; showFingers: boolean }) {
  const frets = shape.frets
  const fretted = frets.filter((x) => x > 0)
  const maxF = fretted.length ? Math.max(...fretted) : 0
  const minF = fretted.length ? Math.min(...fretted) : 0
  const start = maxF > 4 ? minF : 1
  const rows = 5
  const left = 18
  const gap = 14
  const top = 22
  const fh = 17
  const xs = [0, 1, 2, 3, 4, 5].map((i) => left + i * gap)
  const right = xs[5]
  const bottom = top + rows * fh
  const yOf = (fret: number) => top + (fret - start + 0.5) * fh

  return (
    <svg viewBox="0 0 100 118" className="w-full text-neutral-800 dark:text-neutral-200" aria-hidden>
      {/* Bundstäbe */}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={i} x1={left} x2={right} y1={top + i * fh} y2={top + i * fh} stroke="currentColor" strokeWidth={i === 0 && start === 1 ? 4 : 1} opacity={i === 0 ? 1 : 0.6} />
      ))}
      {/* Saiten */}
      {xs.map((x, i) => (
        <line key={i} x1={x} x2={x} y1={top} y2={bottom} stroke="currentColor" strokeWidth={1 + (5 - i) * 0.15} opacity={0.75} />
      ))}
      {start > 1 && (
        <text x={left - 6} y={top + fh * 0.5 + 4} fontSize="11" textAnchor="end" fill="currentColor">
          {start}
        </text>
      )}
      {/* x / o über dem Sattel */}
      {frets.map((fr, i) =>
        fr === -1 ? (
          <text key={i} x={xs[i]} y={top - 6} fontSize="11" textAnchor="middle" fill="currentColor" opacity={0.7}>
            ×
          </text>
        ) : fr === 0 ? (
          <circle key={i} cx={xs[i]} cy={top - 9} r={3.6} fill="none" stroke="currentColor" strokeWidth={1.3} />
        ) : null,
      )}
      {shape.barre && (
        <rect
          x={xs[shape.barre.from] - 6}
          y={yOf(shape.barre.fret) - 6}
          width={xs[shape.barre.to] - xs[shape.barre.from] + 12}
          height={12}
          rx={6}
          className="fill-amber-500"
        />
      )}
      {frets.map((fr, i) => {
        if (fr <= 0) return null
        if (shape.barre && fr === shape.barre.fret && i >= shape.barre.from && i <= shape.barre.to) return null
        const finger = shape.fingers?.[i]
        return (
          <g key={i}>
            <circle cx={xs[i]} cy={yOf(fr)} r={6} className="fill-amber-500" />
            {showFingers && finger ? (
              <text x={xs[i]} y={yOf(fr) + 3.5} fontSize="9" fontWeight="700" textAnchor="middle" fill="#1f2028">
                {finger}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
