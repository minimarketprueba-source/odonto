import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart2,
  FileSpreadsheet,
  Printer,
  Users,
  Stethoscope,
  Filter,
  Calendar,
  Clock,
  Building2,
  CalendarDays,
  CalendarRange,
  UserCheck,
  Wallet,
  Coins,
} from 'lucide-react'
import { useCitasRango, fechaHoyISO, fechaLocalISO, ESTADOS_CITA } from '@/api/citas'
import { useEspecialidades, useMedicosAdmin } from '@/api/mantenimiento'
import { useProductividadReporte } from '@/api/productividad'
import { useAuth } from '@/context/auth-context'
import { usePerfilProfesional } from '@/api/perfil'
import { imprimirPlanillaProductividad } from '@/lib/imprimir'
import { useEmpresa } from '@/api/empresa'

type TipoPeriodo = 'diario' | 'semanal' | 'mensual' | 'personalizado'

function inicioDeMes(): string {
  return `${fechaHoyISO().slice(0, 7)}-01`
}

function getRangoSemana(fechaBaseISO?: string): { desde: string; hasta: string } {
  const base = fechaBaseISO ? new Date(`${fechaBaseISO}T12:00:00`) : new Date()
  const day = base.getDay() // 0 Domingo, 1 Lunes
  const diffALunes = base.getDate() - (day === 0 ? 6 : day - 1)
  const lunes = new Date(base.setDate(diffALunes))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  // Local y no UTC: sin fecha base, `new Date()` de las 21:30 daba el día
  // siguiente y la semana salía corrida.
  const fmt = (date: Date) => fechaLocalISO(date)
  return { desde: fmt(lunes), hasta: fmt(domingo) }
}

function getRangoMes(fechaBaseISO?: string): { desde: string; hasta: string } {
  const base = fechaBaseISO ? new Date(`${fechaBaseISO}T12:00:00`) : new Date()
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const ultimoDia = new Date(y, base.getMonth() + 1, 0).getDate()
  return {
    desde: `${y}-${m}-01`,
    hasta: `${y}-${m}-${String(ultimoDia).padStart(2, '0')}`,
  }
}

function formatFechaLarga(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-')
  return `${d}/${m}/${y}`
}

function formatNombreMes(fechaISO: string): string {
  const [y, m] = fechaISO.split('-')
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  const idx = parseInt(m, 10) - 1
  return `${meses[idx] || 'Mes'} ${y}`
}

function Barra({
  etiqueta,
  valor,
  max,
  color,
}: {
  etiqueta: string
  valor: number
  max: number
  color?: string
}) {
  const ancho = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="mr-2 truncate font-medium">{etiqueta}</span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${ancho}%`, backgroundColor: color || 'rgb(var(--primary))' }}
        />
      </div>
    </div>
  )
}

export default function Reportes() {
  const { user, role } = useAuth()
  const empresa = useEmpresa()
  const { data: perfilPropio } = usePerfilProfesional(user)

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState<'planilla' | 'estadisticas'>('planilla')

  // Filtros Planilla de Productividad (por defecto Semanal o Diario)
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('semanal')
  const rangoInicialSemana = useMemo(() => getRangoSemana(fechaHoyISO()), [])
  const [prodFechaDesde, setProdFechaDesde] = useState(rangoInicialSemana.desde)
  const [prodFechaHasta, setProdFechaHasta] = useState(rangoInicialSemana.hasta)

  const [prodEspecialidadId, setProdEspecialidadId] = useState<string>('todas')
  // Por defecto "mi_usuario": muestra la productividad propia de los pacientes que el usuario atendió
  const [prodMedicoId, setProdMedicoId] = useState<string>('mi_usuario')
  const [prodHorario, setProdHorario] = useState<string>('')

  // Manejo de cambio de tipo de período
  const cambiarPeriodo = (nuevoModo: TipoPeriodo, fechaReferencia = prodFechaDesde) => {
    setTipoPeriodo(nuevoModo)
    if (nuevoModo === 'diario') {
      const hoy = fechaHoyISO()
      setProdFechaDesde(hoy)
      setProdFechaHasta(hoy)
    } else if (nuevoModo === 'semanal') {
      const rango = getRangoSemana(fechaReferencia)
      setProdFechaDesde(rango.desde)
      setProdFechaHasta(rango.hasta)
    } else if (nuevoModo === 'mensual') {
      const rango = getRangoMes(fechaReferencia)
      setProdFechaDesde(rango.desde)
      setProdFechaHasta(rango.hasta)
    }
  }

  // Botones de presets rápidos
  const aplicarHoy = () => cambiarPeriodo('diario', fechaHoyISO())
  const aplicarSemanaActual = () => cambiarPeriodo('semanal', fechaHoyISO())
  const aplicarMesActual = () => cambiarPeriodo('mensual', fechaHoyISO())

  // Carga de especialidades y médicos
  const { data: especialidades = [] } = useEspecialidades()
  const { data: medicos = [] } = useMedicosAdmin()

  // Producción clínica del período (procedimientos, dinero y citas)
  const { data: produccion, isLoading: cargandoProd } = useProductividadReporte({
    fechaDesde: prodFechaDesde,
    fechaHasta: prodFechaHasta,
    especialidadId: prodEspecialidadId,
    medicoId: prodMedicoId,
    usuarioActualId: user?.id,
    usuarioActualEmail: user?.email ?? undefined,
    usuarioActualNombre: perfilPropio?.nombre ?? undefined,
    rolUsuario: role ?? undefined,
  })

  const atenciones = produccion?.atenciones ?? []
  const facturacion = produccion?.facturacion ?? {
    cobrado: 0,
    presupuestado: 0,
    pendiente: 0,
    planes: 0,
  }

  // Cálculos de estadísticas para la planilla
  const totalAtendidos = atenciones.length
  const totalM = useMemo(
    () => atenciones.filter((a) => a.pacienteSexo === 'M').length,
    [atenciones]
  )
  const totalF = useMemo(
    () => atenciones.filter((a) => a.pacienteSexo === 'F').length,
    [atenciones]
  )

  // Nombre de especialidad seleccionada
  const especialidadSeleccionadaNombre = useMemo(() => {
    if (prodEspecialidadId === 'todas') return 'Todas las Especialidades'
    const esp = especialidades.find((e) => String(e.id) === prodEspecialidadId)
    return esp?.nombre || 'Especialidad Externa'
  }, [prodEspecialidadId, especialidades])

  // Nombre del especialista seleccionado
  const especialistaSeleccionadoNombre = useMemo(() => {
    if (prodMedicoId === 'mi_usuario') {
      return perfilPropio?.nombre || user?.email?.split('@')[0] || 'Usuario Actual'
    }
    if (prodMedicoId === 'todos') {
      return 'Todos los profesionales'
    }
    const med = medicos.find((m) => String(m.id) === prodMedicoId)
    return med ? `${med.nombres} ${med.apellidos}` : 'Profesional'
  }, [prodMedicoId, medicos, perfilPropio, user])

  const especialistaColegiatura = useMemo(() => {
    if (prodMedicoId === 'mi_usuario') return perfilPropio?.registro || null
    if (prodMedicoId === 'todos') return null
    const med = medicos.find((m) => String(m.id) === prodMedicoId)
    return med?.numero_colegiatura || null
  }, [prodMedicoId, medicos, perfilPropio])

  // Texto para la etiqueta del período en pantalla e impresos
  const periodoTexto = useMemo(() => {
    if (tipoPeriodo === 'diario') return `Día: ${formatFechaLarga(prodFechaDesde)}`
    if (tipoPeriodo === 'semanal')
      return `Semana del ${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`
    if (tipoPeriodo === 'mensual') return `Mes de ${formatNombreMes(prodFechaDesde)}`
    return `${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`
  }, [tipoPeriodo, prodFechaDesde, prodFechaHasta])

  // Función de impresión A4 de la planilla
  const handleImprimirPlanilla = () => {
    imprimirPlanillaProductividad({
      especialidadNombre: especialidadSeleccionadaNombre,
      especialistaNombre: especialistaSeleccionadoNombre,
      especialistaColegiatura: especialistaColegiatura,
      fecha:
        prodFechaDesde === prodFechaHasta
          ? formatFechaLarga(prodFechaDesde)
          : `${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`,
      horario: prodHorario || null,
      unidad: empresa.nombre,
      tipoPeriodo,
      periodoEtiqueta: periodoTexto,
      filas: atenciones.map((a) => ({
        index: a.index,
        pacienteNombre: a.pacienteNombre,
        pacienteJerarquia: a.pacienteJerarquia,
        pacienteSexo: a.pacienteSexo,
        // El impreso mantiene dos columnas: la pieza va junto al procedimiento
        // para que se lea "16 · Obturación" de un vistazo.
        diagnostico: a.pieza ? `${a.pieza} · ${a.procedimiento}` : a.procedimiento,
        tratamiento: a.nota,
      })),
      totalAtendidos,
      totalMasculino: totalM,
      totalFemenino: totalF,
    })
  }

  // --- Filtros & Estadísticas de citas (Pestaña 2) ---
  const [estDesde, setEstDesde] = useState(inicioDeMes())
  const [estHasta, setEstHasta] = useState(fechaHoyISO())
  const { data: citas = [], isLoading: cargandoCitas } = useCitasRango(estDesde, estHasta)

  const porEstado = useMemo(
    () =>
      ESTADOS_CITA.map((e) => ({
        ...e,
        total: citas.filter((c) => c.estado === e.value).length,
      })),
    [citas]
  )

  const porEspecialidad = useMemo(() => {
    const mapa = new Map<string, { total: number; color: string | null }>()
    for (const c of citas) {
      const nombre = c.medico?.especialidad?.nombre ?? 'Sin especialidad'
      const prev = mapa.get(nombre) ?? { total: 0, color: c.medico?.especialidad?.color ?? null }
      prev.total += 1
      mapa.set(nombre, prev)
    }
    return [...mapa.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [citas])

  const topMedicos = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const c of citas) {
      const nombre = c.medico
        ? `${c.medico.apellidos}, ${c.medico.nombres}`
        : `Médico #${c.medico_id}`
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1)
    }
    return [...mapa.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [citas])

  const maxEstado = Math.max(1, ...porEstado.map((e) => e.total))
  const maxEsp = Math.max(1, ...porEspecialidad.map((e) => e.total))
  const maxMed = Math.max(1, ...topMedicos.map((m) => m.total))

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
              >
                <Building2 className="h-3.5 w-3.5" /> {empresa.nombre_corto}
              </Badge>
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <FileSpreadsheet className="h-7 w-7 text-primary" /> Producción Odontológica por
              Profesional
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Informe de los tratamientos realizados y lo facturado en el período, por odontólogo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleImprimirPlanilla}
              disabled={cargandoProd}
              className="gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <Printer className="h-4 w-4" /> Imprimir informe A4
            </Button>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <Tabs
          value={tabActiva}
          onValueChange={(v) => setTabActiva(v as 'planilla' | 'estadisticas')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1 lg:w-[420px]">
            <TabsTrigger value="planilla" className="gap-2 rounded-lg text-sm font-semibold">
              <FileSpreadsheet className="h-4 w-4" /> Informe de Producción
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="gap-2 rounded-lg text-sm font-semibold">
              <BarChart2 className="h-4 w-4" /> Estadísticas de citas
            </TabsTrigger>
          </TabsList>

          {/* PESTAÑA 1: INFORME DE PRODUCCIÓN */}
          <TabsContent value="planilla" className="mt-6 space-y-6">
            {/* Tarjeta de Filtros */}
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <Filter className="h-4 w-4 text-primary" /> Período del informe (semanal,
                      mensual o diario)
                    </CardTitle>
                    <CardDescription>
                      Consulte y descargue la producción de la clínica en la semana, en el mes o por
                      rango de fechas.
                    </CardDescription>
                  </div>

                  {/* Accesos rápidos de período */}
                  <div className="flex items-center gap-1.5 rounded-xl bg-muted p-1">
                    <Button
                      variant={tipoPeriodo === 'semanal' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={aplicarSemanaActual}
                      className="h-8 gap-1 rounded-lg text-xs font-bold"
                    >
                      <CalendarDays className="h-3.5 w-3.5" /> Esta Semana
                    </Button>
                    <Button
                      variant={tipoPeriodo === 'mensual' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={aplicarMesActual}
                      className="h-8 gap-1 rounded-lg text-xs font-bold"
                    >
                      <CalendarRange className="h-3.5 w-3.5" /> Este Mes
                    </Button>
                    <Button
                      variant={tipoPeriodo === 'diario' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={aplicarHoy}
                      className="h-8 rounded-lg text-xs font-bold"
                    >
                      Hoy
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  {/* Selector de Usuario / Profesional */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="flex items-center gap-1 text-xs font-semibold">
                      <UserCheck className="h-3.5 w-3.5 text-primary" /> Producción del odontólogo
                    </Label>
                    <Select value={prodMedicoId} onValueChange={setProdMedicoId}>
                      <SelectTrigger className="rounded-xl border-primary/30 bg-primary/5 font-bold">
                        <SelectValue placeholder="Profesional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mi_usuario" className="font-bold text-primary">
                          👤 Mi Usuario (
                          {perfilPropio?.nombre || user?.email?.split('@')[0] || 'Mi Perfil'})
                        </SelectItem>
                        <SelectItem value="todos">
                          👥 Todos los Profesionales (Vista General)
                        </SelectItem>
                        {medicos.map((med) => (
                          <SelectItem key={med.id} value={String(med.id)}>
                            🩺 {med.apellidos}, {med.nombres}{' '}
                            {med.especialidad ? `(${med.especialidad.nombre})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Modo de Período */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Período
                    </Label>
                    <Select
                      value={tipoPeriodo}
                      onValueChange={(val) => cambiarPeriodo(val as TipoPeriodo)}
                    >
                      <SelectTrigger className="rounded-xl font-medium">
                        <SelectValue placeholder="Frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal (7 días)</SelectItem>
                        <SelectItem value="mensual">Mensual (Mes completo)</SelectItem>
                        <SelectItem value="diario">Diario (Un día)</SelectItem>
                        <SelectItem value="personalizado">Personalizado (Rango)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Inputs de Fechas según modo */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="prod-desde"
                      className="flex items-center gap-1 text-xs font-semibold"
                    >
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {tipoPeriodo === 'diario' ? 'Fecha de Atención' : 'Fecha Desde'}
                    </Label>
                    <Input
                      id="prod-desde"
                      type="date"
                      className="rounded-xl"
                      value={prodFechaDesde}
                      onChange={(e) => {
                        if (e.target.value) {
                          const val = e.target.value
                          if (tipoPeriodo === 'diario') {
                            setProdFechaDesde(val)
                            setProdFechaHasta(val)
                          } else if (tipoPeriodo === 'semanal') {
                            const r = getRangoSemana(val)
                            setProdFechaDesde(r.desde)
                            setProdFechaHasta(r.hasta)
                          } else if (tipoPeriodo === 'mensual') {
                            const r = getRangoMes(val)
                            setProdFechaDesde(r.desde)
                            setProdFechaHasta(r.hasta)
                          } else {
                            setProdFechaDesde(val)
                            if (val > prodFechaHasta) setProdFechaHasta(val)
                          }
                        }
                      }}
                    />
                  </div>

                  {tipoPeriodo !== 'diario' && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="prod-hasta"
                        className="flex items-center gap-1 text-xs font-semibold"
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Fecha Hasta
                      </Label>
                      <Input
                        id="prod-hasta"
                        type="date"
                        disabled={tipoPeriodo === 'semanal' || tipoPeriodo === 'mensual'}
                        className="rounded-xl"
                        value={prodFechaHasta}
                        onChange={(e) => e.target.value && setProdFechaHasta(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-semibold">
                      <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" /> Especialidad
                    </Label>
                    <Select value={prodEspecialidadId} onValueChange={setProdEspecialidadId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Especialidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las Especialidades</SelectItem>
                        {especialidades.map((esp) => (
                          <SelectItem key={esp.id} value={String(esp.id)}>
                            {esp.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="prod-horario"
                      className="flex items-center gap-1 text-xs font-semibold"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Horario (opcional)
                    </Label>
                    <Input
                      id="prod-horario"
                      type="text"
                      placeholder="Ej.: 08:00 a 18:00"
                      className="rounded-xl"
                      value={prodHorario}
                      onChange={(e) => setProdHorario(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjetas de Resumen Dinámico */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Procedimientos
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold text-primary">{totalAtendidos}</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-primary/80">
                      {periodoTexto} · {totalM} M / {totalF} F
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 shadow-sm dark:bg-emerald-950/20">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Cobrado
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {facturacion.cobrado.toLocaleString('es-PY')} ₲
                    </h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-400/80">
                      Pagos recibidos en el período
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
                    <Wallet className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-800/50 dark:bg-indigo-950/20">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Por cobrar
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold tabular-nums text-indigo-700 dark:text-indigo-300">
                      {facturacion.pendiente.toLocaleString('es-PY')} ₲
                    </h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-indigo-700/80 dark:text-indigo-400/80">
                      Saldo de {facturacion.planes} plan{facturacion.planes === 1 ? '' : 'es'} del
                      período
                    </p>
                  </div>
                  <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600">
                    <Coins className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border shadow-sm">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="mr-2 truncate">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Profesional
                    </p>
                    <h3 className="mt-1 truncate text-sm font-bold text-foreground">
                      {especialistaSeleccionadoNombre}
                    </h3>
                  </div>
                  <div className="flex-shrink-0 rounded-2xl bg-accent p-3 text-foreground">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista previa del informe */}
            <Card className="overflow-hidden rounded-2xl border-border shadow-md">
              <CardHeader className="border-b border-border bg-muted/40 pb-4">
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-xs font-bold uppercase text-white">
                        Clínica particular
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-sky-500/30 bg-sky-500/10 text-xs font-bold uppercase text-sky-600"
                      >
                        {tipoPeriodo === 'diario' && 'Informe Diario'}
                        {tipoPeriodo === 'semanal' && 'Informe Semanal'}
                        {tipoPeriodo === 'mensual' && 'Informe Mensual'}
                        {tipoPeriodo === 'personalizado' && 'Informe Personalizado'}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 text-lg font-extrabold text-foreground">
                      {tipoPeriodo === 'semanal' && 'INFORME SEMANAL DE PRODUCCIÓN ODONTOLÓGICA'}
                      {tipoPeriodo === 'mensual' && 'INFORME MENSUAL DE PRODUCCIÓN ODONTOLÓGICA'}
                      {tipoPeriodo === 'diario' && 'INFORME DIARIO DE PRODUCCIÓN ODONTOLÓGICA'}
                      {tipoPeriodo === 'personalizado' && 'INFORME DE PRODUCCIÓN ODONTOLÓGICA'}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground">
                      Período:{' '}
                      <strong className="font-bold text-sky-700 dark:text-sky-400">
                        {periodoTexto}
                      </strong>{' '}
                      &nbsp;·&nbsp; Especialidad:{' '}
                      <strong className="uppercase text-foreground">
                        {especialidadSeleccionadaNombre}
                      </strong>{' '}
                      &nbsp;·&nbsp; Especialista / Profesional:{' '}
                      <strong className="text-foreground">{especialistaSeleccionadoNombre}</strong>
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleImprimirPlanilla}
                    variant="outline"
                    className="flex-shrink-0 gap-2 rounded-xl font-semibold"
                  >
                    <Printer className="h-4 w-4 text-primary" /> Imprimir Documento
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {cargandoProd ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    Cargando informe de producción {tipoPeriodo}...
                  </div>
                ) : atenciones.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="font-semibold">
                      Sin procedimientos registrados en este período ({periodoTexto}).
                    </p>
                    <p className="mt-1 text-xs">
                      Pruebe seleccionando otro período (Semanal o Mensual) o ajustando el
                      profesional.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-slate-900 text-xs font-semibold text-white dark:bg-slate-950">
                          <th className="w-12 border-r border-slate-800 px-4 py-3 text-center">
                            Nº
                          </th>
                          <th className="min-w-[200px] border-r border-slate-800 px-4 py-3">
                            Nombre y Apellido
                          </th>
                          <th className="w-36 border-r border-slate-800 px-4 py-3 text-center">
                            Documento
                          </th>
                          <th className="w-16 border-r border-slate-800 px-4 py-3 text-center">
                            Sexo
                          </th>
                          <th className="w-20 border-r border-slate-800 px-4 py-3 text-center">
                            Pieza
                          </th>
                          <th className="min-w-[220px] border-r border-slate-800 px-4 py-3">
                            Procedimiento
                          </th>
                          <th className="min-w-[220px] px-4 py-3">Nota clínica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {atenciones.map((row) => (
                          <tr key={row.id} className="transition-colors hover:bg-muted/50">
                            <td className="border-r border-border/50 px-4 py-3 text-center text-xs font-bold text-muted-foreground">
                              {row.index}
                            </td>
                            <td className="border-r border-border/50 px-4 py-3 font-bold text-foreground">
                              <div>{row.pacienteNombre}</div>
                              {tipoPeriodo !== 'diario' && (
                                <div className="text-[10px] font-normal text-muted-foreground">
                                  Fecha: {formatFechaLarga(row.fecha)}{' '}
                                  {row.hora ? `(${row.hora} hs)` : ''}
                                </div>
                              )}
                            </td>
                            <td className="border-r border-border/50 px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                              {row.pacienteJerarquia}
                            </td>
                            <td className="border-r border-border/50 px-4 py-3 text-center text-xs font-extrabold">
                              <span
                                className={
                                  row.pacienteSexo === 'M'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-pink-600 dark:text-pink-400'
                                }
                              >
                                {row.pacienteSexo}
                              </span>
                            </td>
                            <td className="border-r border-border/50 px-4 py-3 text-center text-xs font-bold tabular-nums">
                              {row.pieza || '—'}
                            </td>
                            <td className="border-r border-border/50 px-4 py-3 text-xs text-foreground/90">
                              {row.procedimiento}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground/90">{row.nota}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pie de tabla con totales */}
                {atenciones.length > 0 && (
                  <div className="flex flex-col items-center justify-between gap-2 border-t border-border bg-muted/30 p-4 text-xs font-bold text-foreground sm:flex-row">
                    <div>
                      TOTAL PACIENTES ATENDIDOS POR {especialistaSeleccionadoNombre.toUpperCase()} (
                      {periodoTexto.toUpperCase()}):{' '}
                      <span className="text-sm font-extrabold text-primary">{totalAtendidos}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-blue-600 dark:text-blue-400">
                        MASCULINOS (M): {totalM}
                      </span>
                      <span className="text-pink-600 dark:text-pink-400">
                        FEMENINOS (F): {totalF}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PESTAÑA 2: ESTADÍSTICAS GENERALES DE CITAS */}
          <TabsContent value="estadisticas" className="mt-6 space-y-6">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
              <div className="space-y-1">
                <Label htmlFor="r-desde" className="text-xs font-semibold">
                  Desde
                </Label>
                <Input
                  id="r-desde"
                  type="date"
                  className="w-40 rounded-xl"
                  value={estDesde}
                  onChange={(e) => e.target.value && setEstDesde(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-hasta" className="text-xs font-semibold">
                  Hasta
                </Label>
                <Input
                  id="r-hasta"
                  type="date"
                  className="w-40 rounded-xl"
                  value={estHasta}
                  onChange={(e) => e.target.value && setEstHasta(e.target.value)}
                />
              </div>
            </div>

            {cargandoCitas ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Generando estadísticas...
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Citas por estado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {porEstado.map((e) => (
                      <Barra key={e.value} etiqueta={e.label} valor={e.total} max={maxEstado} />
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Por especialidad</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {porEspecialidad.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                    ) : (
                      porEspecialidad.map((e) => (
                        <Barra
                          key={e.nombre}
                          etiqueta={e.nombre}
                          valor={e.total}
                          max={maxEsp}
                          color={e.color || undefined}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Citas por médico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topMedicos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                    ) : (
                      topMedicos.map((m) => (
                        <Barra key={m.nombre} etiqueta={m.nombre} valor={m.total} max={maxMed} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
