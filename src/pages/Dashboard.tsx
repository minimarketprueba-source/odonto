import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  FileSpreadsheet
} from "lucide-react";
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
  Legend
} from "recharts";
import { useAuth } from "@/context/auth-context";
import { usePacientes } from "@/api/pacientes";
import { useCitasDelDia, useMiMedico, fechaHoyISO } from "@/api/citas";
import { usePresupuestos } from "@/api/odontologia";

function getSaludoInfo() {
  const h = new Date().getHours();
  if (h < 12) {
    return { texto: "Buenos días", icon: Sun, color: "text-amber-500" };
  }
  if (h < 19) {
    return { texto: "Buenas tardes", icon: SunMedium, color: "text-orange-500" };
  }
  return { texto: "Buenas noches", icon: Moon, color: "text-indigo-400" };
}

function getFechaFormateada(): string {
  const fecha = new Date();
  const str = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Dashboard() {
  const { user } = useAuth();
  const hoy = fechaHoyISO();

  const { data: pacientes = [] } = usePacientes();
  const { data: citasHoy = [] } = useCitasDelDia(hoy);
  const { data: miMedico } = useMiMedico(user?.id);
  const { data: presupuestos = [] } = usePresupuestos();

  const saludo = getSaludoInfo();
  const SaludoIcon = saludo.icon;

  // Filter appointments for the current dentist in session
  const misCitasHoy = useMemo(() => {
    return miMedico ? citasHoy.filter((c) => c.medico_id === miMedico.id) : citasHoy;
  }, [miMedico, citasHoy]);

  const misAtendidas = useMemo(() => {
    return misCitasHoy.filter((c) => c.estado === "atendida");
  }, [misCitasHoy]);

  const misPendientes = useMemo(() => {
    return misCitasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada" || c.estado === "admitida");
  }, [misCitasHoy]);

  // Financial Metrics
  const totalCotizado = useMemo(() => {
    return presupuestos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }, [presupuestos]);

  const totalCobrado = useMemo(() => {
    return presupuestos.reduce((acc, p) => acc + ((Number(p.total) || 0) - (Number(p.saldo_pendiente) || 0)), 0);
  }, [presupuestos]);

  const totalPendiente = useMemo(() => {
    return presupuestos.reduce((acc, p) => acc + (Number(p.saldo_pendiente) || 0), 0);
  }, [presupuestos]);

  // Chart Data: Budgets status distribution
  const statusChartData = useMemo(() => {
    const counts = { borrador: 0, aprobado: 0, rechazado: 0, finalizado: 0 };
    presupuestos.forEach((p) => {
      if (counts[p.estado] !== undefined) {
        counts[p.estado]++;
      }
    });

    const data = [
      { name: "Borrador", value: counts.borrador, color: "#94a3b8" },
      { name: "Aprobados", value: counts.aprobado, color: "#10b981" },
      { name: "Finalizados", value: counts.finalizado, color: "#3b82f6" },
      { name: "Rechazados", value: counts.rechazado, color: "#ef4444" },
    ].filter((d) => d.value > 0);

    if (data.length === 0) {
      return [{ name: "Sin Presupuestos", value: 1, color: "#cbd5e1" }];
    }
    return data;
  }, [presupuestos]);

  // Chart Data: Budget vs Collected comparison
  const financialChartData = useMemo(() => {
    return [
      { name: "Facturación", Facturado: totalCotizado, Cobrado: totalCobrado }
    ];
  }, [totalCotizado, totalCobrado]);

  const progressPercentage = misCitasHoy.length > 0
    ? Math.round((misAtendidas.length / misCitasHoy.length) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-card border rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-full blur-3xl" />
          <div className="space-y-1 relative z-10">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <SaludoIcon className={`w-6 h-6 ${saludo.color}`} />
              {saludo.texto}, {user?.email?.split("@")[0] || "Doctor/a"}
            </h1>
            <p className="text-xs text-muted-foreground">{getFechaFormateada()}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {miMedico ? `Agenda Dental: Dr. ${miMedico.nombres} ${miMedico.apellidos}` : "Panel de Gestión de la Clínica Odontológica"}
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0 relative z-10">
            <Button size="sm" className="gap-1.5" asChild>
              <Link to="/citas">
                <CalendarPlus className="w-4 h-4" /> Agendar Cita
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/pacientes">
                <UserPlus className="w-4 h-4" /> Registrar Paciente
              </Link>
            </Button>
          </div>
        </div>

        {/* General Stats Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pacientes Activos</CardTitle>
              <Users className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{pacientes.filter((p) => p.activo).length}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Registrados en el padrón clínico</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Citas para Hoy</CardTitle>
              <CalendarDays className="w-5 h-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{misCitasHoy.length}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {misAtendidas.length} atendidas · {misPendientes.length} pendientes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Ingresos (Cobrado)</CardTitle>
              <Coins className="w-5 h-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600">{totalCobrado.toLocaleString()} ₲</div>
              <p className="text-[10px] text-muted-foreground mt-1">Abonos realizados por pacientes</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Saldo Pendiente</CardTitle>
              <DollarSign className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-destructive">{totalPendiente.toLocaleString()} ₲</div>
              <p className="text-[10px] text-muted-foreground mt-1">Saldos pendientes de planes aprobados</p>
            </CardContent>
          </Card>
        </div>

        {/* Agenda and Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily appointments agenda */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Agenda del Día
                </CardTitle>
                <CardDescription>Citas agendadas para hoy.</CardDescription>
              </div>
              {misCitasHoy.length > 0 && (
                <Badge variant="secondary" className="font-semibold">{progressPercentage}% Listo</Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4 max-h-[400px] overflow-y-auto pr-1">
              {misCitasHoy.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Avance de la consulta</span>
                    <span>{misAtendidas.length} de {misCitasHoy.length} citas</span>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5" />
                </div>
              )}

              {misCitasHoy.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Smile className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-semibold">¡Sin citas pendientes hoy!</p>
                  <p className="text-xs mt-1">Disfrute de su jornada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misCitasHoy.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 border rounded-xl flex justify-between items-start text-xs bg-card ${
                        c.estado === "atendida" ? "opacity-60 bg-muted/10 border-slate-200" : "hover:border-primary/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.hora.slice(0, 5)}</span>
                          <Badge
                            variant="secondary"
                            className={
                              c.estado === "atendida"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20"
                                : c.estado === "admitida"
                                  ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20"
                                  : "bg-slate-50 border border-slate-200 text-slate-800"
                            }
                          >
                            {c.estado}
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">
                          {c.paciente?.apellidos}, {c.paciente?.nombres}
                        </p>
                        {c.motivo && <p className="text-[11px] text-muted-foreground truncate max-w-[160px] italic">"{c.motivo}"</p>}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 px-2 font-bold text-blue-600 hover:text-blue-700" asChild>
                        <Link to={`/pacientes/${c.paciente_id}`}>Atender</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts panel */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Métricas y Rendimiento Dental
                </CardTitle>
                <CardDescription>Visualización de estados presupuestarios y balances financieros.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                <Link to="/presupuestos"><FileSpreadsheet className="w-3.5 h-3.5" /> Presupuestos</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financial comparison */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase text-center mb-4">Balance de Caja</h4>
                <div className="h-64">
                  {totalCotizado === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
                      Sin datos de facturación para graficar.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value.toLocaleString()} ₲`} />
                        <Legend />
                        <Bar dataKey="Facturado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Cobrado" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Budget Distribution */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase text-center mb-4">Planes de Tratamiento</h4>
                <div className="h-64 flex flex-col justify-center">
                  {presupuestos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
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
                            <Tooltip formatter={(value) => `${value} planes`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Custom Legend */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                        {statusChartData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize">
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
  );
}
