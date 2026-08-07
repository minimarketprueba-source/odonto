// Representación anatómica de las piezas a partir del atlas FDI generado.

export type TipoDiente = 'molar' | 'premolar' | 'canino' | 'incisivo'

export function tipoDeDiente(numero: number): TipoDiente {
  const posicion = numero % 10
  const temporal = numero >= 51 && numero <= 85

  if (posicion <= 2) return 'incisivo'
  if (posicion === 3) return 'canino'
  if (temporal) return 'molar'
  if (posicion <= 5) return 'premolar'
  return 'molar'
}

export function esSuperior(numero: number): boolean {
  const cuadrante = Math.floor(numero / 10)
  return cuadrante === 1 || cuadrante === 2 || cuadrante === 5 || cuadrante === 6
}

interface DienteFiguraProps {
  numero: number
  color: string
  tachado?: boolean
  className?: string
}

export function DienteFigura({ numero, tachado, className }: DienteFiguraProps) {
  const superior = esSuperior(numero)
  const temporal = numero >= 51 && numero <= 85
  const posicion = numero % 10
  const denticion = temporal ? 'primary' : 'permanent'
  const arcada = superior ? 'upper' : 'lower'
  const src = `/odontograma/piezas/${denticion}-${arcada}-${posicion}.png`

  return (
    <span
      className={`relative block shrink-0 overflow-visible ${className ?? ''}`}
      role="img"
      aria-label={`Pieza ${numero}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-contain"
      />
      {tachado && (
        <svg viewBox="0 0 40 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g stroke="#b91c1c" strokeWidth="3" strokeLinecap="round">
            <line x1="7" y1="12" x2="33" y2="52" />
            <line x1="33" y1="12" x2="7" y2="52" />
          </g>
        </svg>
      )}
    </span>
  )
}
