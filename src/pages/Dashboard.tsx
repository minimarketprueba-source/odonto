import { useMemo } from "react"
import { Link } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SkeletonDashboard } from "@/components/ui/skeleton-dashboard"
import {
  CalendarDays,
  Users,
  Stethoscope,
  HeartPulse,
  ClipboardCheck,
  Activity,
  Clock,
  BarChart2,
  CalendarPlus,
  UserPlus,
  ArrowRight,
  Sun,
  SunMedium,
  Moon,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  FileText,
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { useAuth } from "@/context/auth-context"
import { usePacientes } from "@/api/pacientes"
import { useCitasDelDia, useCitasRango, useMiMedico, fechaHoyISO } from "@/api/citas"
import { useAtenciones } from "@/api/consultas"

function pacientesDistintos(regs: { paciente_id: number; fecha: string }[], desde?: string): number {
  const ids = new Set<number>()
  for (const r of regs) {
    if (!desde || r.fecha >= desde) ids.add(r.paciente_id)
  }
  return ids.size
}

function getSaludoInfo() {
  const h = new Date().getHours()
  if (h < 12) {
    return { texto: "Buenos días", icon: Sun, color: "text-amber-500" }
  }
  if (h < 19) {
    return { texto: "Buenas tardes", icon: SunMedium, color: "text-orange-500" }
  }
  return { texto: "Buenas noches", icon: Moon, color: "text-indigo-400" }
}

function getHace7DiasISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getFechaFormateada(): string {
  const fecha = new Date()
  const str = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function Dashboard() {
  const { user } = useAuth()
  const hoy = fechaHoyISO()
  const hace7Dias = getHace7DiasISO()
  const inicioMes = `${hoy.slice(0, 7)}-01`

  const { data: pacientes = [], isLoading: loadingPacientes } = usePacientes()
  const { data: citasHoy = [], isLoading: loadingCitasHoy } = useCitasDelDia(hoy)
  const { data: citasSemana = [], isLoading: loadingCitasSemana } = useCitasRango(hace7Dias, hoy)
  const { data: miMedico, isLoading: loadingMedico } = useMiMedico(user?.id)
  const { data: atenciones = [], isLoading: loadingAtenciones } = useAtenciones()

  const isLoading = loadingPacientes || loadingCitasHoy || loadingCitasSemana || loadingMedico || loadingAtenciones

  const saludo = getSaludoInfo()
  const SaludoIcon = saludo.icon

  // Filtros del médico en sesión
  const misCitasHoy = useMemo(
    () => (miMedico ? citasHoy.filter((c) => c.medico_id === miMedico.id) : []),
    [miMedico, citasHoy]
  )
  const misEnEspera = useMemo(
    () =>
      misCitasHoy
        .filter((c) => c.estado === "admitida")
        .sort((a, b) => (a.orden_llegada ?? 999) - (b.orden_llegada ?? 999)),
    [misCitasHoy]
  )
  const misPorLlegar = useMemo(
    () => misCitasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada"),
    [misCitasHoy]
  )
  const misAtendidas = useMemo(
    () => misCitasHoy.filter((c) => c.estado === "atendida"),
    [misCitasHoy]
  )

  // Porcentaje de avance del día para el médico
  const porcentajeMedico = misCitasHoy.length > 0
    ? Math.round((misAtendidas.length / misCitasHoy.length) * 100)
    : 0

  // Métricas generales
  const totalPacientesActivos = useMemo(() => pacientes.filter((p) => p.activo).length, [pacientes])
  const citasPendienteOAdmitida = useMemo(
    () => citasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada" || c.estado === "admitida").length,
    [citasHoy]
  )
  const citasEnEsperaHoy = useMemo(() => citasHoy.filter((c) => c.estado === "admitida").length, [citasHoy])
  const atendidosHoyCount = useMemo(() => pacientesDistintos(atenciones, hoy), [atenciones, hoy])
  const atendidosMesCount = useMemo(() => pacientesDistintos(atenciones, inicioMes), [atenciones, inicioMes])
  const atendidosTotalCount = useMemo(() => pacientesDistintos(atenciones), [atenciones])

  // Datos para gráfico de Dona (Citas por Estado)
  const pieData = useMemo(() => {
    const counts = {
      admitida: 0,
      atendida: 0,
      pendiente: 0,
      confirmada: 0,
      otros: 0,
    }
    for (const c of citasHoy) {
      if (c.estado === "admitida") counts.admitida++
      else if (c.estado === "atendida") counts.atendida++
      else if (c.estado === "pendiente") counts.pendiente++
      else if (c.estado === "confirmada") counts.confirmada++
      else counts.otros++
    }
    const data = [
      { name: "En Espera", value: counts.admitida, color: "#06b6d4" },
      { name: "Atendidas", value: counts.atendida, color: "#10b981" },
      { name: "Pendientes", value: counts.pendiente + counts.confirmada, color: "#3b82f6" },
      { name: "Canceladas / Otro", value: counts.otros, color: "#f43f5e" },
    ].filter((d) => d.value > 0)

    if (data.length === 0) {
      return [{ name: "Sin citas agendadas", value: 1, color: "#94a3b8" }]
    }
    return data
  }, [citasHoy])

  // Datos para gráfico de tendencia semanal (7 días)
  const areaData = useMemo(() => {
    const diasMap: Record<string, { fecha: string; dia: string; total: number; atendidas: number }> = {}
    const fechaObj = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(fechaObj.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const label = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
      diasMap[iso] = { fecha: iso, dia: label.charAt(0).toUpperCase() + label.slice(1), total: 0, atendidas: 0 }
    }

    for (const c of citasSemana) {
      if (diasMap[c.fecha]) {
        diasMap[c.fecha].total++
        if (c.estado === "atendida") {
          diasMap[c.fecha].atendidas++
        }
      }
    }

    return Object.values(diasMap)
  }, [citasSemana])

  // Módulos del sistema
  const modulos = [
    {
      nombre: "Agenda de Citas",
      descripcion: "Agendar, admitir en sala de espera y gestionar estados de atención médica.",
      icon: CalendarDays,
      href: "/citas",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
      badge: `${citasHoy.length} hoy`,
    },
    {
      nombre: "Padrón de Pacientes",
      descripcion: "Personal policial, cadetes, oficiales y familiares registrados.",
      icon: Users,
      href: "/pacientes",
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
      badge: `${totalPacientesActivos} activos`,
    },
    {
      nombre: "Enfermería / Triaje",
      descripcion: "Check-in de sala de espera, control de signos vitales y salvoconductos.",
      icon: HeartPulse,
      href: "/enfermeria",
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
      badge: `${citasEnEsperaHoy} en espera`,
    },
    {
      nombre: "Lista de Espera",
      descripcion: "Gestión de turnos prioritarios y pacientes agendados sin médico asignado.",
      icon: Clock,
      href: "/lista-espera",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    },
    {
      nombre: "Reportes & Analítica",
      descripcion: "Estadísticas comparativas de consultas por médico, especialidad y fechas.",
      icon: BarChart2,
      href: "/reportes",
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    },
    {
      nombre: "Mantenimiento & Médicos",
      descripcion: "Gestión de profesionales de la salud, especialidades y usuarios.",
      icon: UserCheck,
      href: "/mantenimiento",
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    },
  ]

  if (isLoading) {
    return (
      <AppLayout>
        <SkeletonDashboard />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Banner de Bienvenida & Acciones Rápidas */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SaludoIcon className={`h-5 w-5 ${saludo.color}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  {saludo.texto}, {user?.email?.split("@")[0] ?? "Usuario"}
                </span>
                <Badge variant="outline" className="ml-2 text-xs font-normal border-primary/30">
                  <ShieldCheck className="mr-1 h-3 w-3 text-primary" /> Sanidad Policial ISEPOL
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Panel de Control de Sanidad
              </h1>
              <p className="text-sm text-muted-foreground">
                {getFechaFormateada()} — Resumen operativo del centro médico policial
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="gap-2">
                <Link to="/citas">
                  <CalendarPlus className="h-4 w-4" />
                  Agendar Cita
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur">
                <Link to="/pacientes">
                  <UserPlus className="h-4 w-4" />
                  Nuevo Paciente
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Panel del Médico en Sesión ("Mi Día") */}
        {miMedico && (
          <Card className="border-primary/40 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-cyan-500 to-emerald-500" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Mi Día — Dr(a). {miMedico.apellidos}, {miMedico.nombres}
                    {miMedico.especialidad && (
                      <Badge variant="secondary" className="font-normal text-xs ml-1">
                        {miMedico.especialidad.nombre}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {misCitasHoy.length === 0
                      ? "No tiene citas agendadas para la jornada de hoy."
                      : `${misCitasHoy.length} cita${misCitasHoy.length === 1 ? "" : "s"} hoy · ${misPorLlegar.length} por llegar · ${misEnEspera.length} en espera · ${misAtendidas.length} atendida${misAtendidas.length === 1 ? "" : "s"}`}
                  </CardDescription>
                </div>
                {misCitasHoy.length > 0 && (
                  <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Progreso diario:</span>
                    <span className="font-bold text-primary">{porcentajeMedico}%</span>
                    <div className="w-24">
                      <Progress value={porcentajeMedico} className="h-2" />
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            {misEnEspera.length > 0 && (
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-cyan-600 animate-pulse" />
                    Pacientes en Sala de Espera ({misEnEspera.length})
                  </p>
                  <Link to="/citas" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                    Ir a mi agenda <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {misEnEspera.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800 text-sm"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-600 text-white text-xs font-bold shrink-0 shadow-sm">
                          #{c.orden_llegada}
                        </span>
                        <div className="truncate">
                          <p className="font-medium truncate leading-tight">
                            {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : `Paciente #${c.paciente_id}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.paciente?.documento ? `CI: ${c.paciente.documento}` : "Sanidad"}
                          </p>
                        </div>
                      </div>
                      {c.admitida_at && (
                        <Badge variant="outline" className="bg-background text-[10px] shrink-0 border-cyan-300 font-mono">
                          {new Date(c.admitida_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Tarjetas KPI de Métricas Clave */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/pacientes" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pacientes</span>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalPacientesActivos}</div>
                  <p className="text-[11px] text-muted-foreground">activos en el padrón</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/citas" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citas Hoy</span>
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{citasHoy.length}</div>
                  <p className="text-[11px] text-muted-foreground">{citasPendienteOAdmitida} por atender</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/enfermeria" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sala Espera</span>
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{citasEnEsperaHoy}</div>
                  <p className="text-[11px] text-muted-foreground">pacientes admitidos</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/pacientes?atencion=hoy" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendidos Hoy</span>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{atendidosHoyCount}</div>
                  <p className="text-[11px] text-muted-foreground">pacientes consultados</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/pacientes?atencion=mes" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Este Mes</span>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{atendidosMesCount}</div>
                  <p className="text-[11px] text-muted-foreground">atendidos en el mes</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/pacientes?atencion=alguna_vez" className="block group">
            <Card className="h-full transition-all duration-200 hover:border-primary/60 hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico</span>
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{atendidosTotalCount}</div>
                  <p className="text-[11px] text-muted-foreground">total acumulado</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Sección de Analítica y Gráficos (Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico 1: Estado de Citas de Hoy */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Estado de Citas de Hoy
              </CardTitle>
              <CardDescription>Distribución porcentual del día ({citasHoy.length} citas)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} cita(s)`, "Cantidad"]}
                      contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px", borderColor: "var(--border)" }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Tendencia Semanal de Consultas y Citas */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Actividad de la Última Semana
                </CardTitle>
                <CardDescription>Citas agendadas vs. consultas completadas (últimos 7 días)</CardDescription>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                Últimos 7 días
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAtendidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px", borderColor: "var(--border)" }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }} />
                    <Area type="monotone" dataKey="total" name="Total Citas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="atendidas" name="Atendidas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAtendidas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Módulos del Sistema */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Módulos y Operaciones Sanidad
            </h2>
            <span className="text-xs text-muted-foreground">Accesos directos al sistema</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((m) => (
              <Link key={m.nombre} to={m.href} className="block group">
                <Card className="h-full transition-all duration-200 group-hover:border-primary/60 group-hover:shadow-md overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl border ${m.color} group-hover:scale-105 transition-transform`}>
                        <m.icon className="h-5 w-5" />
                      </div>
                      {m.badge && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {m.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold pt-2 flex items-center justify-between group-hover:text-primary transition-colors">
                      {m.nombre}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.descripcion}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Lista de Próximas Citas del Día */}
        {citasHoy.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Agenda del Día ({citasHoy.length})
                </CardTitle>
                <CardDescription>Citas programadas para la jornada de hoy</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/citas">
                  Ver agenda completa <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y rounded-lg border overflow-hidden">
                {citasHoy.slice(0, 5).map((cita) => {
                  const estadoColor =
                    cita.estado === "admitida"
                      ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300"
                      : cita.estado === "atendida"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                      : cita.estado === "cancelada" || cita.estado === "no_acudio"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"

                  return (
                    <div key={cita.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs font-bold px-2 py-1 rounded bg-muted text-muted-foreground shrink-0">
                          {cita.hora ? cita.hora.slice(0, 5) : "--:--"}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}` : `Paciente #${cita.paciente_id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cita.medico ? `Dr(a). ${cita.medico.apellidos}` : "Médico no asignado"}
                            {cita.medico?.especialidad ? ` · ${cita.medico.especialidad.nombre}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        {cita.motivo && <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:inline">{cita.motivo}</span>}
                        <Badge variant="outline" className={`text-xs capitalize ${estadoColor}`}>
                          {cita.estado}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
