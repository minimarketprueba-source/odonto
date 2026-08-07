import { useState, useMemo, useEffect } from 'react'
import { useOdontograma, useSaveOdontogramaRegistro, OdontogramaRegistro } from '@/api/odontologia'
import { usePaciente } from '@/api/pacientes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Info,
  MousePointer2,
  History,
  Save,
  Undo2,
  UserRound,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ESTADOS_DENTALES,
  CARAS_DENTALES,
  NOMBRE_CARA,
  estadoDeRegistro,
  type EstadoDental,
} from './estados-dentales'
import { DienteFigura, esSuperior } from './diente-figura'

interface OdontogramaProps {
  pacienteId: string
}

// Notación FDI. Cada arcada se recorre de derecha a izquierda del paciente,
// que es como se la mira de frente: 18…11 | 21…28.
const SUP_DER = [18, 17, 16, 15, 14, 13, 12, 11]
const SUP_IZQ = [21, 22, 23, 24, 25, 26, 27, 28]
const INF_DER = [48, 47, 46, 45, 44, 43, 42, 41]
const INF_IZQ = [31, 32, 33, 34, 35, 36, 37, 38]

const TEMP_SUP_DER = [55, 54, 53, 52, 51]
const TEMP_SUP_IZQ = [61, 62, 63, 64, 65]
const TEMP_INF_DER = [85, 84, 83, 82, 81]
const TEMP_INF_IZQ = [71, 72, 73, 74, 75]

const SIN_COLOR = '#ffffff'

/** Las cinco caras del esquema, cada una con su polígono. */
const CARAS_DIBUJO: { cara: string; puntos: string }[] = [
  { cara: 'vestibular', puntos: '0,0 40,0 30,10 10,10' },
  { cara: 'distal', puntos: '40,0 40,40 30,30 30,10' },
  { cara: 'palatina', puntos: '0,40 40,40 30,30 10,30' },
  { cara: 'mesial', puntos: '0,0 0,40 10,30 10,10' },
  { cara: 'oclusal', puntos: '10,10 30,10 30,30 10,30' },
]

interface MarcaCara {
  estado: EstadoDental
  fecha?: string
}

export function Odontograma({ pacienteId }: OdontogramaProps) {
  const { data: paciente } = usePaciente(pacienteId)
  const { data: registros = [], isLoading } = useOdontograma(pacienteId)
  const saveRegistro = useSaveOdontogramaRegistro()

  // Herramienta activa: se elige una vez y se marca con un clic por cara, en
  // lugar de abrir un menú en cada diente. Es como se carga un odontograma en
  // papel: se agarra el lápiz rojo y se recorre la boca.
  const [herramienta, setHerramienta] = useState<EstadoDental | null>(ESTADOS_DENTALES[0])
  const [ultimoDetalle, setUltimoDetalle] = useState<string | null>(null)
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number | null>(null)

  // Lo marcado en esta sesión, todavía SIN guardar. Antes cada clic escribía
  // derecho en la base: un clic por error quedaba asentado para siempre en la
  // historia clínica del paciente y no había forma de arrepentirse. Ahora se
  // marca en pantalla y recién se asienta al confirmar con «Guardar».
  const [pendientes, setPendientes] = useState<Record<string, EstadoDental>>({})
  const [guardando, setGuardando] = useState(false)
  const [historialAbierto, setHistorialAbierto] = useState(false)

  const cantidadPendiente = Object.keys(pendientes).length
  const hayPendientes = cantidadPendiente > 0

  const edadPaciente = useMemo(() => {
    if (!paciente?.fecha_nacimiento) return null
    const nacimiento = new Date(`${paciente.fecha_nacimiento}T00:00:00`)
    if (Number.isNaN(nacimiento.getTime())) return null
    const hoy = new Date()
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    if (
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
    )
      edad--
    return edad >= 0 ? edad : null
  }, [paciente?.fecha_nacimiento])

  // Al cambiar de paciente, lo no guardado no debe arrastrarse a la otra ficha.
  useEffect(() => {
    setPendientes({})
    setPiezaSeleccionada(null)
  }, [pacienteId])

  // Cerrar la pestaña con marcas sin guardar tiene que avisar: el navegador
  // muestra su propio cartel de confirmación.
  useEffect(() => {
    if (!hayPendientes) return
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayPendientes])

  /** Estado vigente de cada cara y de cada pieza completa. */
  const { porCara, porPieza } = useMemo(() => {
    const porCara: Record<string, MarcaCara> = {}
    const porPieza: Record<number, MarcaCara> = {}

    // De más viejo a más nuevo: el último registro de una cara es el que vale.
    const ordenados = [...registros].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    )

    for (const r of ordenados) {
      const estado = estadoDeRegistro(r)
      if (!estado) continue

      if (r.cara === 'completo') {
        if (estado.limpia) {
          delete porPieza[r.pieza]
          for (const c of CARAS_DENTALES) delete porCara[`${r.pieza}_${c}`]
        } else {
          porPieza[r.pieza] = { estado, fecha: r.created_at }
        }
        continue
      }

      const clave = `${r.pieza}_${r.cara}`
      if (estado.limpia) delete porCara[clave]
      else porCara[clave] = { estado, fecha: r.created_at }
    }

    return { porCara, porPieza }
  }, [registros])

  /** Historial legible, del más reciente al más viejo. */
  const historial = useMemo(() => {
    return [...registros]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((r) => {
        const estado = estadoDeRegistro(r)
        const fecha = r.created_at ? new Date(r.created_at) : null
        return {
          id: r.id ?? `${r.pieza}-${r.cara}-${r.created_at}`,
          hora: fecha
            ? fecha.toLocaleString('es-PY', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          pieza: r.pieza,
          cara: NOMBRE_CARA[r.cara] ?? r.cara,
          etiqueta: estado?.label ?? r.tratamiento ?? r.diagnostico ?? 'Registro',
          color: estado?.color ?? '#94a3b8',
        }
      })
  }, [registros])

  /** Lo que hay que mostrar en una cara: lo pendiente pisa a lo guardado. */
  const marcaVigente = (pieza: number, cara: string): EstadoDental | undefined => {
    const pendiente = pendientes[`${pieza}_${cara}`]
    if (pendiente) return pendiente
    const guardada = cara === 'completo' ? porPieza[pieza] : porCara[`${pieza}_${cara}`]
    return guardada?.estado
  }

  /** Si esa cara está marcada pero todavía sin guardar. */
  const estaPendiente = (pieza: number, cara: string) => Boolean(pendientes[`${pieza}_${cara}`])

  const aplicar = (pieza: number, cara: string) => {
    if (!herramienta) {
      const marca = marcaVigente(pieza, cara)
      setUltimoDetalle(
        marca
          ? `Pieza ${pieza} · ${NOMBRE_CARA[cara] ?? cara}: ${marca.label}`
          : `Pieza ${pieza} · ${NOMBRE_CARA[cara] ?? cara}: sin hallazgos`
      )
      return
    }

    // Una corona, una endodoncia o una extracción son de la pieza entera: no
    // tiene sentido registrarlas en una cara suelta.
    const caraFinal = herramienta.piezaCompleta ? 'completo' : cara
    const clave = `${pieza}_${caraFinal}`

    // Volver a marcar lo mismo lo saca: sirve para deshacer sin tener que
    // buscar la herramienta «Sano / Borrar».
    setPendientes((previas) => {
      const siguientes = { ...previas }
      if (siguientes[clave]?.id === herramienta.id) delete siguientes[clave]
      else siguientes[clave] = herramienta
      return siguientes
    })
    setUltimoDetalle(
      `Pieza ${pieza} · ${NOMBRE_CARA[caraFinal] ?? caraFinal}: ${herramienta.label}`
    )
  }

  const descartar = () => {
    setPendientes({})
    setUltimoDetalle(null)
  }

  const guardar = async () => {
    const entradas = Object.entries(pendientes)
    if (entradas.length === 0) return

    setGuardando(true)
    try {
      // De a uno y en orden: son pocos registros y así, si uno falla, se sabe
      // cuál y los anteriores ya quedaron asentados.
      for (const [clave, estado] of entradas) {
        const [piezaTexto, cara] = clave.split('_')
        const payload: OdontogramaRegistro = {
          paciente_id: pacienteId,
          pieza: Number(piezaTexto),
          cara,
          diagnostico: estado.diagnostico,
          tratamiento: estado.tratamiento,
          estado: estado.estado,
          color: estado.color,
          notas: null,
        }
        await saveRegistro.mutateAsync(payload)
      }
      setPendientes({})
      toast.success(
        entradas.length === 1
          ? 'Se guardó 1 marca en la historia clínica'
          : `Se guardaron ${entradas.length} marcas en la historia clínica`
      )
    } catch (err) {
      toast.error(`No se pudo guardar: ${(err as Error).message}`)
    } finally {
      setGuardando(false)
    }
  }

  const Diente = ({ numero }: { numero: number }) => {
    const marcaPieza = marcaVigente(numero, 'completo')
    const colorPieza = marcaPieza?.color ?? SIN_COLOR
    const ausente = marcaPieza?.ausente || marcaPieza?.id === 'extraccion'
    const piezaSinGuardar = estaPendiente(numero, 'completo')

    const colorDe = (cara: string) =>
      marcaVigente(numero, cara)?.color ?? (marcaPieza ? colorPieza : SIN_COLOR)

    const titulo = marcaPieza
      ? `Pieza ${numero}: ${marcaPieza.label}${piezaSinGuardar ? ' (sin guardar)' : ''}`
      : `Pieza ${numero}`

    // En la arcada inferior se invierte el orden (esquema arriba, número
    // abajo): así el esquema de caras de las dos arcadas queda mirando al
    // centro de la boca, como en el odontograma de papel.
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="order-2 text-[10px] font-semibold tabular-nums text-slate-700">
          {numero}
        </span>

        <button
          type="button"
          title={titulo}
          onClick={() => {
            setPiezaSeleccionada(numero)
            if (!herramienta || herramienta.piezaCompleta) aplicar(numero, 'completo')
          }}
          className={`group/tooth relative rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary ${
            esSuperior(numero) ? 'order-1' : 'order-3'
          } ${piezaSinGuardar ? 'ring-dashed ring-2 ring-sky-500' : ''} ${
            piezaSeleccionada === numero ? 'ring-2 ring-sky-500 ring-offset-2' : ''
          }`}
          disabled={guardando}
        >
          <DienteFigura numero={numero} color={colorPieza} tachado={ausente} className="h-14 w-9" />
          <svg viewBox="0 0 40 64" className="absolute inset-0 h-14 w-9 overflow-visible">
            <g transform={esSuperior(numero) ? undefined : 'rotate(180 20 32)'}>
              {[
                { cara: 'vestibular', puntos: '6,33 34,33 29,43 11,43' },
                { cara: 'distal', puntos: '34,33 36,62 29,55 29,43' },
                { cara: 'palatina', puntos: '6,62 36,62 29,55 11,55' },
                { cara: 'mesial', puntos: '6,33 6,62 11,55 11,43' },
                { cara: 'oclusal', puntos: '11,43 29,43 29,55 11,55' },
              ].map(({ cara, puntos }) => {
                const estado = marcaVigente(numero, cara) ?? marcaPieza
                const sinGuardar = estaPendiente(numero, cara)
                return (
                  <polygon
                    key={cara}
                    points={puntos}
                    fill={estado?.color}
                    fillOpacity={estado ? 0.82 : 1}
                    stroke={sinGuardar ? '#0d99ff' : 'transparent'}
                    strokeDasharray={sinGuardar ? '2 1' : undefined}
                    strokeWidth="1.2"
                    className={
                      estado
                        ? 'cursor-pointer transition-all hover:brightness-90 group-hover/tooth:stroke-sky-500'
                        : 'cursor-pointer fill-transparent transition-all hover:fill-sky-200/80 hover:stroke-sky-600 group-hover/tooth:stroke-sky-400'
                    }
                    onClick={(evento) => {
                      evento.stopPropagation()
                      setPiezaSeleccionada(numero)
                      aplicar(numero, cara)
                    }}
                  >
                    <title>{`${NOMBRE_CARA[cara] ?? cara} · Pieza ${numero}`}</title>
                  </polygon>
                )
              })}
            </g>
          </svg>
        </button>

        {/* Esquema de las cinco caras: es donde se marca una caries o una
            obturación, que afectan a una cara y no a toda la pieza.
            Lo que todavía no se guardó lleva borde punteado. */}
        <svg
          viewBox="0 0 40 40"
          className="hidden"
          role="group"
          aria-label={`Caras de la pieza ${numero}`}
        >
          <g strokeWidth="1">
            {CARAS_DIBUJO.map(({ cara, puntos }) => {
              // Una corona o una extracción sin guardar tiñen la pieza entera:
              // el punteado tiene que verse en todas las caras, no en ninguna.
              const sinGuardar = estaPendiente(numero, cara) || piezaSinGuardar
              return (
                <polygon
                  key={cara}
                  points={puntos}
                  fill={colorDe(cara)}
                  stroke={sinGuardar ? '#0f172a' : '#94a3b8'}
                  strokeDasharray={sinGuardar ? '3 2' : undefined}
                  className="cursor-pointer hover:brightness-90"
                  onClick={() => aplicar(numero, cara)}
                />
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  /** Una arcada completa: los dos cuadrantes separados por la línea media. */
  const Arcada = ({ derecha, izquierda }: { derecha: number[]; izquierda: number[] }) => (
    <div className="flex items-start justify-center gap-3">
      <div className="flex gap-1">
        {derecha.map((n) => (
          <Diente key={n} numero={n} />
        ))}
      </div>
      <div className="self-stretch border-l border-dashed border-slate-300" />
      <div className="flex gap-1">
        {izquierda.map((n) => (
          <Diente key={n} numero={n} />
        ))}
      </div>
    </div>
  )

  const GuiaSuperficies = () => {
    const zonas = [
      {
        cara: 'vestibular',
        forma: 'path',
        d: 'M40 9 A31 31 0 0 1 71 40 L55 40 A15 15 0 0 0 40 25 Z',
      },
      {
        cara: 'distal',
        forma: 'path',
        d: 'M71 40 A31 31 0 0 1 40 71 L40 55 A15 15 0 0 0 55 40 Z',
      },
      {
        cara: 'palatina',
        forma: 'path',
        d: 'M40 71 A31 31 0 0 1 9 40 L25 40 A15 15 0 0 0 40 55 Z',
      },
      {
        cara: 'mesial',
        forma: 'path',
        d: 'M9 40 A31 31 0 0 1 40 9 L40 25 A15 15 0 0 0 25 40 Z',
      },
      { cara: 'oclusal', forma: 'rect' },
    ] as const

    const activarCara = (cara: string) => {
      if (piezaSeleccionada === null) {
        toast.info('Primero seleccione una pieza dental')
        return
      }
      aplicar(piezaSeleccionada, cara)
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <svg
          viewBox="0 0 80 80"
          className={`h-16 w-16 ${piezaSeleccionada === null ? 'opacity-70' : ''}`}
          role="group"
          aria-label={
            piezaSeleccionada === null
              ? 'Selector de superficies: seleccione primero una pieza'
              : `Selector de superficies de la pieza ${piezaSeleccionada}`
          }
        >
          <circle cx="40" cy="40" r="31" fill="#fff" stroke="#475569" strokeWidth="1.2" />
          {zonas.map((zona) => {
            const estado =
              piezaSeleccionada === null
                ? undefined
                : (marcaVigente(piezaSeleccionada, zona.cara) ??
                  marcaVigente(piezaSeleccionada, 'completo'))
            const propiedades = {
              key: zona.cara,
              role: 'button',
              tabIndex: 0,
              fill: estado?.color ?? '#ffffff',
              stroke: '#475569',
              strokeWidth: 1.2,
              className:
                'cursor-pointer outline-none transition-all hover:fill-sky-200 hover:stroke-sky-600 focus:fill-sky-200 focus:stroke-sky-600',
              onClick: () => activarCara(zona.cara),
              onKeyDown: (evento: React.KeyboardEvent<SVGElement>) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                  evento.preventDefault()
                  activarCara(zona.cara)
                }
              },
              'aria-label': `${NOMBRE_CARA[zona.cara] ?? zona.cara}${
                piezaSeleccionada === null ? '' : ` de la pieza ${piezaSeleccionada}`
              }`,
            }

            return zona.forma === 'rect' ? (
              <rect {...propiedades} x="25" y="25" width="30" height="30" rx="3">
                <title>{NOMBRE_CARA[zona.cara] ?? zona.cara}</title>
              </rect>
            ) : (
              <path {...propiedades} d={zona.d}>
                <title>{NOMBRE_CARA[zona.cara] ?? zona.cara}</title>
              </path>
            )
          })}
        </svg>
        <span className="text-[9px] font-semibold text-slate-500">
          {piezaSeleccionada === null ? 'Seleccione una pieza' : `Pieza ${piezaSeleccionada}`}
        </span>
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      {/* Encabezado contextual inspirado en la referencia: la ficha sigue
          siendo la fuente de datos, pero el paciente queda visible mientras
          se trabaja sobre el odontograma. */}
      <div className="hidden flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-100 text-sky-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              {paciente ? `${paciente.nombres} ${paciente.apellidos}` : 'Cargando paciente...'}
            </p>
            <p className="truncate text-xs text-slate-500">
              ID: {paciente?.documento || 'Sin documento'}{' '}
              {edadPaciente !== null ? `· ${edadPaciente} años` : ''}
              {paciente?.sexo ? ` · ${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="hidden items-center gap-1.5 sm:flex">
            <CalendarDays className="h-3.5 w-3.5" /> Última visita: ver evolución
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Alergias: ver anamnesis
          </span>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white text-slate-900 shadow-none">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Odontograma Técnico por Superficies
              </CardTitle>
              <CardDescription className="text-xs">
                Elija un estado y haga clic sobre la cara del diente. Sin estado elegido, el clic
                solo consulta.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={historialAbierto}
                className={`h-8 gap-1.5 rounded-lg border-slate-300 text-xs ${
                  historialAbierto
                    ? 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setHistorialAbierto((abierto) => !abierto)}
              >
                <History className="h-3.5 w-3.5" /> Historial
              </Button>
              {(isLoading || saveRegistro.isPending) && (
                <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-primary" />
              )}
            </div>
          </div>

          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <Button
              type="button"
              size="sm"
              variant={herramienta === null ? 'default' : 'outline'}
              className="h-8 gap-1.5 text-xs"
              onClick={() => setHerramienta(null)}
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              Seleccionar
            </Button>

            {ESTADOS_DENTALES.map((e) => {
              const activo = herramienta?.id === e.id
              return (
                <Button
                  key={e.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  title={e.descripcion}
                  onClick={() => setHerramienta(activo ? null : e)}
                  className={`h-9 gap-1.5 rounded-xl px-3 text-xs transition-all ${activo ? 'shadow-[0_0_0_3px_rgba(56,189,248,0.18)]' : ''}`}
                  style={
                    activo
                      ? { backgroundColor: e.color, color: e.contraste, borderColor: e.color }
                      : undefined
                  }
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: e.color }}
                  />
                  {e.label}
                </Button>
              )
            })}
          </div>

          {herramienta && (
            <p className="pt-1 text-xs text-muted-foreground">
              Marcando <strong style={{ color: herramienta.color }}>{herramienta.label}</strong>
              {herramienta.piezaCompleta
                ? ' — se aplica a la pieza entera.'
                : ' — haga clic en una cara del esquema de abajo.'}{' '}
              Volver a marcar lo mismo lo deshace.
            </p>
          )}

          {/* Nada se asienta en la historia clínica hasta que se confirma acá. */}
          {hayPendientes && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5">
              <span className="min-w-[180px] flex-1 text-xs font-medium text-sky-900">
                {cantidadPendiente === 1
                  ? '1 marca sin guardar'
                  : `${cantidadPendiente} marcas sin guardar`}{' '}
                — se ven con borde punteado.
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={descartar}
                disabled={guardando}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={guardar}
                disabled={guardando}
              >
                {guardando ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar en la historia clínica
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="overflow-x-auto bg-white p-4 sm:p-6">
          <div className="flex min-w-[760px] flex-col gap-7 py-1">
            <Arcada derecha={SUP_DER} izquierda={SUP_IZQ} />

            <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3 px-5">
              <GuiaSuperficies />
              <Arcada derecha={TEMP_SUP_DER} izquierda={TEMP_SUP_IZQ} />
              <GuiaSuperficies />
            </div>

            <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3 px-5">
              <GuiaSuperficies />
              <Arcada derecha={TEMP_INF_DER} izquierda={TEMP_INF_IZQ} />
              <GuiaSuperficies />
            </div>

            <Arcada derecha={INF_DER} izquierda={INF_IZQ} />
          </div>
        </CardContent>
      </Card>

      <div className="hidden grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Referencia de colores */}
        <Card className="border-0 shadow-sm ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" />
              Referencia
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-1.5 pb-4">
            {ESTADOS_DENTALES.filter((e) => !e.limpia).map((e) => (
              <div key={e.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-3 w-3 shrink-0 rounded border border-black/20"
                  style={{ backgroundColor: e.color }}
                />
                <span className="truncate" title={e.descripcion}>
                  {e.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
              <History className="h-4 w-4 text-primary" />
              Historial clínico
            </CardTitle>
            <CardDescription className="text-xs">
              {ultimoDetalle ?? 'Registro cronológico de lo marcado en el odontograma.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {historial.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay registros previos en el odontograma.
              </p>
            ) : (
              <ScrollArea className="h-[420px] pr-3">
                <ul className="space-y-2">
                  {historial.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-start gap-2 border-b pb-2 text-xs last:border-0"
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-black/20"
                        style={{ backgroundColor: h.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          Pieza {h.pieza} · {h.cara}
                        </p>
                        <p className="text-muted-foreground">{h.etiqueta}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] tabular-nums">
                        {h.hora}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {historialAbierto && (
        <div className="absolute right-4 top-[4.5rem] z-20 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-semibold">Historial</p>
              <p className="text-xs text-muted-foreground">Últimas marcas del odontograma</p>
            </div>
            <History className="h-4 w-4 text-primary" />
          </div>
          <ScrollArea className="max-h-[300px] p-4">
            {historial.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay registros previos.
              </p>
            ) : (
              <ul className="space-y-3">
                {historial.slice(0, 8).map((h) => (
                  <li key={`popover-${h.id}`} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-black/20"
                      style={{ backgroundColor: h.color }}
                    />
                    <div>
                      <p className="font-medium">
                        {h.hora} · Pieza {h.pieza}
                      </p>
                      <p className="text-muted-foreground">
                        {h.cara} · {h.etiqueta}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
