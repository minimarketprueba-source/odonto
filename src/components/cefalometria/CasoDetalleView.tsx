import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EstudioCefalometrico } from '@/types/cefalometria'
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Eye,
  Folder,
  Grid2X2,
  Heart,
  ImageIcon,
  Layers,
  MoreVertical,
  ScanLine,
  Smile,
  Sparkles,
  Stethoscope,
  Timer,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

type PestanaId =
  | 'digitalizacion'
  | 'analisis'
  | 'pa'
  | 'tejido_blando'
  | 'oclusograma'
  | 'evaluacion'
  | 'tratamiento'
  | 'superposicion'
  | 'visor'
  | 'caso'
  | 'lapso'

type TipoMarcador =
  | 'radiografia'
  | 'rostro'
  | 'sonrisa'
  | 'perfil'
  | 'intraoral'
  | 'oclusal'
  | 'extra'

interface SlotImagen {
  id: string
  etiqueta: string
  tipo: TipoMarcador
  destacado?: boolean
}

interface PestanaConfig {
  id: PestanaId
  label: string
  icono: React.ReactNode
  indicador?: 'P' | 'E'
  habilitada: boolean
}

const PESTANAS: PestanaConfig[] = [
  {
    id: 'digitalizacion',
    label: 'Digitalización',
    icono: <ScanLine className="h-4 w-4" />,
    habilitada: true,
  },
  { id: 'analisis', label: 'Análisis', icono: <BarChart2 className="h-4 w-4" />, habilitada: true },
  {
    id: 'pa',
    label: 'PA',
    icono: <Grid2X2 className="h-4 w-4" />,
    indicador: 'P',
    habilitada: false,
  },
  {
    id: 'tejido_blando',
    label: 'Tejido blando',
    icono: <Heart className="h-4 w-4" />,
    indicador: 'P',
    habilitada: true,
  },
  {
    id: 'oclusograma',
    label: 'Oclusograma',
    icono: <Smile className="h-4 w-4" />,
    indicador: 'E',
    habilitada: false,
  },
  {
    id: 'evaluacion',
    label: 'Evaluación',
    icono: <ClipboardList className="h-4 w-4" />,
    habilitada: false,
  },
  {
    id: 'tratamiento',
    label: 'Tratamiento',
    icono: <Stethoscope className="h-4 w-4" />,
    habilitada: false,
  },
  {
    id: 'superposicion',
    label: 'Superposición',
    icono: <Layers className="h-4 w-4" />,
    habilitada: false,
  },
  { id: 'visor', label: 'Visor', icono: <Eye className="h-4 w-4" />, habilitada: false },
  {
    id: 'caso',
    label: 'Caso',
    icono: <Folder className="h-4 w-4" />,
    indicador: 'P',
    habilitada: true,
  },
  {
    id: 'lapso',
    label: 'Lapso de tiempo',
    icono: <Timer className="h-4 w-4" />,
    indicador: 'P',
    habilitada: false,
  },
]

// La distribución sigue el orden clínico de la pantalla de referencia:
// radiografías y fotografías diagnósticas arriba, extras abajo.
const SLOTS_IMAGENES: SlotImagen[] = [
  { id: 'tele_lat', etiqueta: 'Teleradiografía lateral', tipo: 'radiografia' },
  { id: 'craneo', etiqueta: 'Radiografía de cráneo', tipo: 'radiografia' },
  { id: 'panoramica', etiqueta: 'Radiografía panorámica', tipo: 'radiografia' },
  { id: 'foto_frontal', etiqueta: 'Fotografía frontal', tipo: 'rostro' },
  { id: 'foto_sonrisa', etiqueta: 'Fotografía de sonrisa', tipo: 'sonrisa' },
  { id: 'foto_perfil', etiqueta: 'Fotografía de perfil', tipo: 'perfil' },
  { id: 'perfil_completo', etiqueta: 'Perfil completo', tipo: 'perfil' },
  { id: 'intra_lateral_d', etiqueta: 'Intraoral lateral derecha', tipo: 'intraoral' },
  { id: 'intra_frontal', etiqueta: 'Intraoral frontal', tipo: 'intraoral' },
  { id: 'intra_lateral_i', etiqueta: 'Intraoral lateral izquierda', tipo: 'intraoral' },
  { id: 'oclusal_superior', etiqueta: 'Oclusal superior', tipo: 'oclusal' },
  { id: 'oclusal_inferior', etiqueta: 'Oclusal inferior', tipo: 'oclusal' },
  { id: 'extra_1', etiqueta: 'Foto extra 1', tipo: 'extra' },
  { id: 'extra_2', etiqueta: 'Foto extra 2', tipo: 'extra' },
  { id: 'extra_3', etiqueta: 'Foto extra 3', tipo: 'extra' },
  { id: 'extra_4', etiqueta: 'Foto extra 4', tipo: 'extra' },
  { id: 'extra_5', etiqueta: 'Foto extra 5', tipo: 'oclusal', destacado: true },
  { id: 'extra_6', etiqueta: 'Foto extra 6', tipo: 'oclusal', destacado: true },
]

interface CasoDetalleViewProps {
  estudio: EstudioCefalometrico
  pacienteNombre: string
  pacienteEdad?: string | null
  pacienteDocumento?: string
  onVolver: () => void
  onAbrirDigitalizacion: (estudio: EstudioCefalometrico) => void
  onGuardar: (estudioActualizado: EstudioCefalometrico) => Promise<void> | void
  onEliminar?: () => void
}

function fechaVisible(fecha: string) {
  const [anio, mes, dia] = fecha.split('-')
  return dia && mes && anio ? `${dia}-${mes}-${anio}` : fecha
}

function IconoMarcador({ tipo }: { tipo: TipoMarcador }) {
  const clase = 'h-12 w-12 stroke-[1.25]'

  if (tipo === 'rostro') return <User className={clase} />
  if (tipo === 'sonrisa') return <Smile className={clase} />
  if (tipo === 'perfil') return <User className={`${clase} -scale-x-100`} />
  if (tipo === 'intraoral') return <Smile className={clase} />
  if (tipo === 'oclusal') return <Layers className={clase} />
  if (tipo === 'extra') return <ImageIcon className={clase} />
  return <ScanLine className={clase} />
}

export function CasoDetalleView({
  estudio,
  pacienteNombre,
  pacienteEdad,
  pacienteDocumento,
  onVolver,
  onAbrirDigitalizacion,
  onEliminar,
}: CasoDetalleViewProps) {
  const [pestanaActiva, setPestanaActiva] = useState<PestanaId>('caso')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [tipoRegistro, setTipoRegistro] = useState(estudio.tipo)
  const [imagenesSlots, setImagenesSlots] = useState<Record<string, string>>({
    tele_lat: estudio.imagen_url,
  })
  const [slotParaSubir, setSlotParaSubir] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const numPuntos = Object.keys(estudio.puntos || {}).length

  const abrirSelectorArchivo = (slotId?: string) => {
    const destino = slotId || SLOTS_IMAGENES.find((slot) => !imagenesSlots[slot.id])?.id
    if (!destino) {
      toast.info('Todos los espacios del registro ya tienen una imagen.')
      return
    }
    setSlotParaSubir(destino)
    fileInputRef.current?.click()
  }

  const handleSlotClick = (slot: SlotImagen) => {
    if (slot.id === 'tele_lat' && imagenesSlots.tele_lat) {
      onAbrirDigitalizacion(estudio)
      return
    }
    abrirSelectorArchivo(slot.id)
  }

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo || !slotParaSubir) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      const dataUrl = evento.target?.result as string
      if (dataUrl) {
        setImagenesSlots((previas) => ({ ...previas, [slotParaSubir]: dataUrl }))
        const nombre = SLOTS_IMAGENES.find((slot) => slot.id === slotParaSubir)?.etiqueta
        toast.success(`${nombre || 'Imagen'} cargada.`)
      }
    }
    reader.readAsDataURL(archivo)
    e.target.value = ''
    setSlotParaSubir(null)
  }

  const eliminarImagen = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (slotId === 'tele_lat') {
      toast.info('La teleradiografía principal se cambia desde el digitalizador.')
      return
    }
    setImagenesSlots((previas) => {
      const actualizadas = { ...previas }
      delete actualizadas[slotId]
      return actualizadas
    })
  }

  const seleccionarPestana = (tab: PestanaConfig) => {
    if (tab.id === 'digitalizacion') {
      onAbrirDigitalizacion(estudio)
      return
    }
    if (!tab.habilitada) {
      toast.info(`${tab.label} estará disponible próximamente.`)
      return
    }
    setPestanaActiva(tab.id)
  }

  const renderPanelClinico = () => {
    if (pestanaActiva === 'analisis') {
      const mediciones = estudio.mediciones || []
      return (
        <div className="mx-auto w-full max-w-5xl p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Análisis cefalométrico</h2>
              <p className="text-sm text-muted-foreground">
                Resultados calculados a partir del trazado anatómico.
              </p>
            </div>
            <Button size="sm" onClick={() => onAbrirDigitalizacion(estudio)} className="gap-2">
              <ScanLine className="h-4 w-4" /> Abrir digitalizador
            </Button>
          </div>
          {mediciones.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mediciones.map((medicion, indice) => (
                <div
                  key={`${medicion.sigla}-${indice}`}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{medicion.sigla}</span>
                    <span className="font-mono text-lg font-bold text-primary">
                      {medicion.valor} {medicion.unidad}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {medicion.interpretacion || medicion.nombre}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center">
              <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">Todavía no hay mediciones</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Coloque los puntos cefalométricos en el digitalizador para generar el análisis
                automático.
              </p>
            </div>
          )}
        </div>
      )
    }

    if (pestanaActiva === 'tejido_blando') {
      return (
        <div className="flex min-h-[34rem] flex-col items-center justify-center p-8 text-center">
          <Heart className="mb-3 h-11 w-11 text-pink-400" />
          <h2 className="text-lg font-semibold">Análisis de tejido blando</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Coloque los puntos Pn, Sn, UL, LL, Pog&apos; y Me&apos; en el digitalizador para activar
            este análisis.
          </p>
          <Button className="mt-5 gap-2" onClick={() => onAbrirDigitalizacion(estudio)}>
            <ScanLine className="h-4 w-4" /> Abrir digitalizador
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 xl:grid-cols-6">
        {SLOTS_IMAGENES.map((slot) => {
          const url = imagenesSlots[slot.id]
          const principal = slot.id === 'tele_lat'

          return (
            <button
              type="button"
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              className={`group relative flex aspect-[1.18/1] min-h-28 overflow-hidden rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                slot.destacado
                  ? 'border-dashed border-rose-300 bg-rose-50/50 text-rose-300 hover:border-rose-400 hover:bg-rose-50 dark:bg-rose-950/10'
                  : 'border-dashed border-slate-300 bg-slate-50/65 text-slate-300 hover:border-primary/55 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-600'
              } ${url ? 'border-solid border-slate-300 bg-black/5' : ''}`}
              aria-label={`${url ? 'Abrir' : 'Cargar'} ${slot.etiqueta}`}
            >
              {url ? (
                <>
                  <img src={url} alt={slot.etiqueta} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/45 group-hover:opacity-100">
                    <span className="rounded-full bg-white/95 p-2 text-slate-700 shadow">
                      <Eye className="h-4 w-4" />
                    </span>
                    {!principal && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => eliminarImagen(slot.id, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ')
                            eliminarImagen(slot.id, e as unknown as React.MouseEvent)
                        }}
                        className="rounded-full bg-rose-500 p-2 text-white shadow hover:bg-rose-600"
                        aria-label={`Eliminar ${slot.etiqueta}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-medium text-white">
                    {slot.etiqueta}
                  </div>
                  {principal && numPuntos > 0 && (
                    <Badge className="absolute right-1.5 top-1.5 h-5 bg-emerald-500 px-1.5 text-[9px] text-white hover:bg-emerald-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> {numPuntos} puntos
                    </Badge>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                  <IconoMarcador tipo={slot.tipo} />
                  <span
                    className={`text-[11px] font-medium ${slot.destacado ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    {slot.etiqueta}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/0 text-xs font-semibold text-primary opacity-0 transition-all group-hover:bg-background/85 group-hover:opacity-100">
                    <Upload className="mr-1.5 h-4 w-4" /> Cargar imagen
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm dark:border-slate-800">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleArchivoSeleccionado}
      />

      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 bg-slate-600 px-3 py-2.5 text-white dark:bg-slate-800 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onVolver}
            className="h-8 w-8 shrink-0 text-white hover:bg-white/15 hover:text-white"
            title="Volver a la lista de registros"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold sm:text-sm">
              Registro 1 · {fechaVisible(estudio.fecha)}
            </p>
            <p className="truncate text-[10px] text-white/70">
              {pacienteNombre}
              {pacienteEdad ? ` · ${pacienteEdad}` : ''}
              {pacienteDocumento ? ` · CI ${pacienteDocumento}` : ''}
            </p>
          </div>
          <select
            value={tipoRegistro}
            onChange={(e) => setTipoRegistro(e.target.value as EstudioCefalometrico['tipo'])}
            className="hidden h-8 rounded-full border-0 bg-white px-3 text-xs font-medium text-slate-700 outline-none ring-offset-2 focus:ring-2 focus:ring-white/70 sm:block"
            aria-label="Tipo de registro"
          >
            <option value="teleradiografia_lateral">Registro cefalométrico</option>
            <option value="radiografia_pa">Radiografía PA</option>
            <option value="panoramica">Panorámica</option>
            <option value="modelos">Registros fotográficos</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => abrirSelectorArchivo()}
            className="h-9 gap-2 bg-white text-xs text-slate-700 hover:bg-slate-100"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Carga inteligente</span>
            <Sparkles className="h-3 w-3 text-rose-500" />
          </Button>

          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              className="h-9 w-9 text-white hover:bg-white/15 hover:text-white"
              aria-label="Más acciones del registro"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuAbierto && (
              <div className="absolute right-0 top-11 z-30 w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false)
                    onAbrirDigitalizacion(estudio)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-accent"
                >
                  <ScanLine className="h-4 w-4" /> Abrir digitalizador
                </button>
                {onEliminar && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false)
                      onEliminar()
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar registro
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-[34rem] flex-col lg:flex-row">
        <aside className="shrink-0 border-b bg-slate-50/80 dark:bg-slate-900/30 lg:w-56 lg:border-b-0 lg:border-r">
          <div className="hidden border-b px-4 py-3 lg:block">
            <p className="truncate text-xs font-semibold" title={pacienteNombre}>
              {pacienteNombre}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Caso clínico · {fechaVisible(estudio.fecha)}
            </p>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1 lg:overflow-visible">
            {PESTANAS.map((tab) => {
              const activa = pestanaActiva === tab.id
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => seleccionarPestana(tab)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-left text-xs transition-colors lg:w-full ${
                    activa
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'bg-slate-200/65 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/65 dark:text-slate-300 dark:hover:bg-slate-800'
                  } ${!tab.habilitada ? 'opacity-65' : ''}`}
                  title={!tab.habilitada ? `${tab.label} (próximamente)` : tab.label}
                >
                  <span className="shrink-0">{tab.icono}</span>
                  <span className="whitespace-nowrap lg:flex-1">{tab.label}</span>
                  {tab.indicador && (
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${tab.indicador === 'E' ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    >
                      {tab.indicador}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="hidden border-t p-3 lg:block">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-700 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-300">
              <AlertCircle className="mb-1.5 h-4 w-4" />
              Organice aquí las radiografías y fotografías del caso antes de realizar el análisis.
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-background">{renderPanelClinico()}</main>
      </div>
    </div>
  )
}
