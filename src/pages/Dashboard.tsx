import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CalendarDays,
  Users,
  DollarSign,
  Clock,
  UserPlus,
  CalendarPlus,
  Sun,
  SunMedium,
  Moon,
  Coins,
  Smile,
  Activity,
  FileSpreadsheet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useAuth } from '@/context/auth-context'
import { usePacientes } from '@/api/pacientes'
import { useCitasDelDia, useMiMedico, fechaHoyISO } from '@/api/citas'
import { usePresupuestos } from '@/api/odontologia'
import { useEmpresa } from '@/api/empresa'

function getSaludoInfo() {
  const h = new Date().getHours()
  if (h < 12) {
    return { texto: 'Buenos días', icon: Sun, color: 'text-blue-500' }
  }
  if (h < 19) {
    return { texto: 'Buenas tardes', icon: SunMedium, color: 'text-blue-500' }
  }
  return { texto: 'Buenas noches', icon: Moon, color: 'text-indigo-400' }
}

function getFechaFormateada(): string {
  const fecha = new Date()
  const str = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatMontoCompleto(val: number): string {
  if (!val || val === 0) return '0 ₲'
  return `${val.toLocaleString('es-PY')} ₲`
}

export default function Dashboard() {
  const { user } = useAuth()
  const empresa = useEmpresa()
  const hoy = fechaHoyISO()

  const { data: pacientes = [] } = usePacientes()
  const { data: citasHoy = [] } = useCitasDelDia(hoy)
  const { data: miMedico } = useMiMedico(user?.id)
  const { data: presupuestos = [] } = usePresupuestos()

  const saludo = getSaludoInfo()
  const SaludoIcon = saludo.icon

  // Filter appointments for the current dentist in session
  const misCitasHoy = useMemo(() => {
    return miMedico ? citasHoy.filter((c) => c.medico_id === miMedico.id) : citasHoy
  }, [miMedico, citasHoy])

  const misAtendidas = useMemo(() => {
    return misCitasHoy.filter((c) => c.estado === 'atendida')
  }, [misCitasHoy])

  const misPendientes = useMemo(() => {
    return misCitasHoy.filter(
      (c) => c.estado === 'pendiente' || c.estado === 'confirmada' || c.estado === 'admitida'
    )
  }, [misCitasHoy])

  // Financial Metrics
  const totalCotizado = useMemo(() => {
    return presupuestos.reduce((acc, p) => acc + (Number(p.total) || 0), 0)
  }, [presupuestos])

  const totalCobrado = useMemo(() => {
    return presupuestos.reduce(
      (acc, p) => acc + ((Number(p.total) || 0) - (Number(p.saldo_pendiente) || 0)),
      0
    )
  }, [presupuestos])

  const totalPendiente = useMemo(() => {
    return presupuestos.reduce((acc, p) => acc + (Number(p.saldo_pendiente) || 0), 0)
  }, [presupuestos])

  // Chart Data: Budgets status distribution
  const statusChartData = useMemo(() => {
    const counts = { borrador: 0, aprobado: 0, rechazado: 0, finalizado: 0 }
    presupuestos.forEach((p) => {
      if (counts[p.estado] !== undefined) {
        counts[p.estado]++
      }
    })

    const data = [
      { name: 'Borrador', value: counts.borrador, color: '#94a3b8' },
      { name: 'Aprobados', value: counts.aprobado, color: '#10b981' },
      { name: 'Finalizados', value: counts.finalizado, color: '#3b82f6' },
      { name: 'Rechazados', value: counts.rechazado, color: '#ef4444' },
    ].filter((d) => d.value > 0)

    if (data.length === 0) {
      return [{ name: 'Sin Presupuestos', value: 1, color: '#cbd5e1' }]
    }
    return data
  }, [presupuestos])

  // Chart Data: Budget vs Collected comparison
  const financialChartData = useMemo(() => {
    return [{ name: 'Facturación', Facturado: totalCotizado, Cobrado: totalCobrado }]
  }, [totalCotizado, totalCobrado])

  const progressPercentage =
    misCitasHoy.length > 0 ? Math.round((misAtendidas.length / misCitasHoy.length) * 100) : 0

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-center">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10 space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <SaludoIcon className={`h-6 w-6 ${saludo.color}`} />
              {saludo.texto}, {user?.email?.split('@')[0] || 'Doctor/a'}
            </h1>
            <p className="text-xs text-muted-foreground">{getFechaFormateada()}</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {miMedico
                ? `Agenda Dental: Dr. ${miMedico.nombres} ${miMedico.apellidos}`
                : `Panel de Gestión — ${empresa.nombre_corto}`}
            </p>
          </div>
          <div className="relative z-10 mt-4 flex gap-2 md:mt-0">
            <Button size="sm" className="gap-1.5 shadow-sm" asChild>
              <Link to="/pacientes">
                <UserPlus className="h-4 w-4" /> Nuevo Paciente
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 bg-background shadow-sm" asChild>
              <Link to="/citas">
                <CalendarPlus className="h-4 w-4" /> Agendar Cita
              </Link>
            </Button>
          </div>
        </div>

        {/* Citas del Día Progress Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Citas Agendadas para Hoy
                </CardTitle>
                <CardDescription>
                  {misCitasHoy.length === 0
                    ? 'No hay citas registradas para la fecha de hoy.'
                    : `${misAtendidas.length} de ${misCitasHoy.length} pacientes atendidos · ${misPendientes.length} por atender`}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-background px-3 py-1 text-xs font-semibold">
                {hoy}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-2.5 bg-slate-100 dark:bg-slate-800" />

            {/* Citas Quick List */}
            {misCitasHoy.length > 0 && (
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                {misCitasHoy.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="shadow-2xs flex items-center justify-between space-x-2 rounded-xl border bg-card/80 p-3 text-xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate font-semibold text-foreground">
                        {c.hora} — {c.paciente?.apellidos}, {c.paciente?.nombres}
                      </span>
                    </div>
                    <Badge
                      className={
                        c.estado === 'atendida'
                          ? 'flex-shrink-0 border-0 bg-emerald-100 text-[10px] text-emerald-800'
                          : c.estado === 'cancelada'
                            ? 'flex-shrink-0 border-0 bg-red-100 text-[10px] text-red-800'
                            : 'flex-shrink-0 border-0 bg-blue-100 text-[10px] text-blue-800'
                      }
                    >
                      {c.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Pacientes Registrados
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">{pacientes.length}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Pacientes en la base clínica</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Total Cotizado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {totalCotizado.toLocaleString()} ₲
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Monto de presupuestos creados
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Total Cobrado
              </CardTitle>
              <Coins className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalCobrado.toLocaleString()} ₲
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Ingresos totales percibidos</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-colors hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Saldo Pendiente
              </CardTitle>
              <Activity className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-destructive">
                {totalPendiente.toLocaleString()} ₲
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Saldos pendientes de planes aprobados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agenda and Charts section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily appointments agenda */}
          <Card className="shadow-sm lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Clock className="h-4 w-4 text-primary" />
                  Agenda del Día
                </CardTitle>
                <CardDescription>Citas agendadas para hoy.</CardDescription>
              </div>
              {misCitasHoy.length > 0 && (
                <Badge variant="secondary" className="font-semibold">
                  {progressPercentage}% Listo
                </Badge>
              )}
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto pr-1 pt-4">
              {misCitasHoy.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Avance de la consulta</span>
                    <span>
                      {misAtendidas.length} de {misCitasHoy.length} citas
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5" />
                </div>
              )}

              {misCitasHoy.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Smile className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-semibold">¡Sin citas pendientes hoy!</p>
                  <p className="mt-1 text-xs">Disfrute de su jornada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misCitasHoy.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-start justify-between rounded-xl border bg-card p-3 text-xs ${
                        c.estado === 'atendida'
                          ? 'border-border bg-muted/10 opacity-60'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {c.hora.slice(0, 5)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              c.estado === 'atendida'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : c.estado === 'admitida'
                                  ? 'border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                                  : 'border border-border bg-muted text-foreground'
                            }
                          >
                            {c.estado}
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">
                          {c.paciente?.apellidos}, {c.paciente?.nombres}
                        </p>
                        {c.motivo && (
                          <p className="max-w-[160px] truncate text-[11px] italic text-muted-foreground">
                            "{c.motivo}"
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 font-bold text-blue-600 hover:text-blue-700"
                        asChild
                      >
                        <Link to={`/pacientes/${c.paciente_id}`}>Atender</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts panel */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Métricas y Rendimiento Dental
                </CardTitle>
                <CardDescription>
                  Visualización de estados presupuestarios y balances financieros.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                <Link to="/presupuestos">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Presupuestos
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
              {/* Financial comparison */}
              <div className="space-y-2">
                <h4 className="mb-4 text-center text-xs font-bold uppercase text-muted-foreground">
                  Balance de Caja
                </h4>
                <div className="h-64">
                  {totalCotizado === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground">
                      Sin datos de facturación para graficar.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={financialChartData}
                        margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgb(var(--border))"
                          strokeOpacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgb(var(--border))' }}
                        />
                        <YAxis
                          tick={{
                            fill: 'rgb(var(--muted-foreground))',
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgb(var(--border))' }}
                          width={110}
                          tickFormatter={formatMontoCompleto}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgb(var(--card))',
                            borderColor: 'rgb(var(--border))',
                            borderRadius: '12px',
                            color: 'rgb(var(--card-foreground))',
                            boxShadow:
                              '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          itemStyle={{ color: 'rgb(var(--foreground))' }}
                          formatter={(value: any, name: any) => [
                            `${Number(value).toLocaleString('es-PY')} ₲`,
                            name,
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: '10px',
                            fontSize: '12px',
                            color: 'rgb(var(--muted-foreground))',
                          }}
                        />
                        <Bar
                          dataKey="Facturado"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={65}
                        />
                        <Bar
                          dataKey="Cobrado"
                          fill="#059669"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={65}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Budget Distribution */}
              <div className="space-y-2">
                <h4 className="mb-4 text-center text-xs font-bold uppercase text-muted-foreground">
                  Planes de Tratamiento
                </h4>
                <div className="flex h-64 flex-col justify-center">
                  {presupuestos.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground">
                      Sin planes creados.
                    </div>
                  ) : (
                    <>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgb(var(--card))',
                                borderColor: 'rgb(var(--border))',
                                borderRadius: '12px',
                                color: 'rgb(var(--card-foreground))',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                              }}
                              itemStyle={{ color: 'rgb(var(--foreground))' }}
                              formatter={(value: any) => [`${value} planes`, 'Cantidad']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Custom Legend */}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                        {statusChartData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="font-semibold capitalize text-slate-600 dark:text-slate-400">
                              {d.name}: {d.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
