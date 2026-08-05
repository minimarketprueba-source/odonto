import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart2, FileSpreadsheet, Printer, Users, Stethoscope, Filter, Calendar, Clock, Building2, CalendarDays, CalendarRange, UserCheck, Wallet, Coins
} from "lucide-react";
import { useCitasRango, fechaHoyISO, ESTADOS_CITA } from "@/api/citas";
import { useEspecialidades, useMedicosAdmin } from "@/api/mantenimiento";
import { useProductividadReporte } from "@/api/productividad";
import { useAuth } from "@/context/auth-context";
import { usePerfilProfesional } from "@/api/perfil";
import { imprimirPlanillaProductividad } from "@/lib/imprimir";

type TipoPeriodo = "diario" | "semanal" | "mensual" | "personalizado";

function inicioDeMes(): string {
  return `${fechaHoyISO().slice(0, 7)}-01`;
}

function getRangoSemana(fechaBaseISO?: string): { desde: string; hasta: string } {
  const base = fechaBaseISO ? new Date(`${fechaBaseISO}T12:00:00`) : new Date();
  const day = base.getDay(); // 0 Domingo, 1 Lunes
  const diffALunes = base.getDate() - (day === 0 ? 6 : day - 1);
  const lunes = new Date(base.setDate(diffALunes));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const fmt = (date: Date) => date.toISOString().slice(0, 10);
  return { desde: fmt(lunes), hasta: fmt(domingo) };
}

function getRangoMes(fechaBaseISO?: string): { desde: string; hasta: string } {
  const base = fechaBaseISO ? new Date(`${fechaBaseISO}T12:00:00`) : new Date();
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const ultimoDia = new Date(y, base.getMonth() + 1, 0).getDate();
  return {
    desde: `${y}-${m}-01`,
    hasta: `${y}-${m}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function formatFechaLarga(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-");
  return `${d}/${m}/${y}`;
}

function formatNombreMes(fechaISO: string): string {
  const [y, m] = fechaISO.split("-");
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const idx = parseInt(m, 10) - 1;
  return `${meses[idx] || "Mes"} ${y}`;
}

function Barra({ etiqueta, valor, max, color }: { etiqueta: string; valor: number; max: number; color?: string }) {
  const ancho = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate mr-2 font-medium">{etiqueta}</span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${ancho}%`, backgroundColor: color || "hsl(var(--primary))" }}
        />
      </div>
    </div>
  );
}

export default function Reportes() {
  const { user, role } = useAuth();
  const { data: perfilPropio } = usePerfilProfesional(user);

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState<"planilla" | "estadisticas">("planilla");

  // Filtros Planilla de Productividad (por defecto Semanal o Diario)
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("semanal");
  const rangoInicialSemana = useMemo(() => getRangoSemana(fechaHoyISO()), []);
  const [prodFechaDesde, setProdFechaDesde] = useState(rangoInicialSemana.desde);
  const [prodFechaHasta, setProdFechaHasta] = useState(rangoInicialSemana.hasta);

  const [prodEspecialidadId, setProdEspecialidadId] = useState<string>("todas");
  // Por defecto "mi_usuario": muestra la productividad propia de los pacientes que el usuario atendió
  const [prodMedicoId, setProdMedicoId] = useState<string>("mi_usuario");
  const [prodHorario, setProdHorario] = useState<string>("13:00 a 19:00");

  // Manejo de cambio de tipo de período
  const cambiarPeriodo = (nuevoModo: TipoPeriodo, fechaReferencia = prodFechaDesde) => {
    setTipoPeriodo(nuevoModo);
    if (nuevoModo === "diario") {
      const hoy = fechaHoyISO();
      setProdFechaDesde(hoy);
      setProdFechaHasta(hoy);
    } else if (nuevoModo === "semanal") {
      const rango = getRangoSemana(fechaReferencia);
      setProdFechaDesde(rango.desde);
      setProdFechaHasta(rango.hasta);
    } else if (nuevoModo === "mensual") {
      const rango = getRangoMes(fechaReferencia);
      setProdFechaDesde(rango.desde);
      setProdFechaHasta(rango.hasta);
    }
  };

  // Botones de presets rápidos
  const aplicarHoy = () => cambiarPeriodo("diario", fechaHoyISO());
  const aplicarSemanaActual = () => cambiarPeriodo("semanal", fechaHoyISO());
  const aplicarMesActual = () => cambiarPeriodo("mensual", fechaHoyISO());

  // Carga de especialidades y médicos
  const { data: especialidades = [] } = useEspecialidades();
  const { data: medicos = [] } = useMedicosAdmin();

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
  });

  const atenciones = produccion?.atenciones ?? [];
  const facturacion = produccion?.facturacion ?? { cobrado: 0, presupuestado: 0, pendiente: 0, planes: 0 };

  // Cálculos de estadísticas para la planilla
  const totalAtendidos = atenciones.length;
  const totalM = useMemo(() => atenciones.filter((a) => a.pacienteSexo === "M").length, [atenciones]);
  const totalF = useMemo(() => atenciones.filter((a) => a.pacienteSexo === "F").length, [atenciones]);

  // Nombre de especialidad seleccionada
  const especialidadSeleccionadaNombre = useMemo(() => {
    if (prodEspecialidadId === "todas") return "Todas las Especialidades";
    const esp = especialidades.find((e) => String(e.id) === prodEspecialidadId);
    return esp?.nombre || "Especialidad Externa";
  }, [prodEspecialidadId, especialidades]);

  // Nombre del especialista seleccionado
  const especialistaSeleccionadoNombre = useMemo(() => {
    if (prodMedicoId === "mi_usuario") {
      return perfilPropio?.nombre || user?.email?.split("@")[0] || "Usuario Actual";
    }
    if (prodMedicoId === "todos") {
      return "Todos los profesionales";
    }
    const med = medicos.find((m) => String(m.id) === prodMedicoId);
    return med ? `${med.nombres} ${med.apellidos}` : "Profesional";
  }, [prodMedicoId, medicos, perfilPropio, user]);

  const especialistaColegiatura = useMemo(() => {
    if (prodMedicoId === "mi_usuario") return perfilPropio?.registro || null;
    if (prodMedicoId === "todos") return null;
    const med = medicos.find((m) => String(m.id) === prodMedicoId);
    return med?.numero_colegiatura || null;
  }, [prodMedicoId, medicos, perfilPropio]);

  // Texto para la etiqueta del período en pantalla e impresos
  const periodoTexto = useMemo(() => {
    if (tipoPeriodo === "diario") return `Día: ${formatFechaLarga(prodFechaDesde)}`;
    if (tipoPeriodo === "semanal") return `Semana del ${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`;
    if (tipoPeriodo === "mensual") return `Mes de ${formatNombreMes(prodFechaDesde)}`;
    return `${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`;
  }, [tipoPeriodo, prodFechaDesde, prodFechaHasta]);

  // Función de impresión A4 de la planilla
  const handleImprimirPlanilla = () => {
    imprimirPlanillaProductividad({
      especialidadNombre: especialidadSeleccionadaNombre,
      especialistaNombre: especialistaSeleccionadoNombre,
      especialistaColegiatura: especialistaColegiatura,
      fecha: prodFechaDesde === prodFechaHasta ? formatFechaLarga(prodFechaDesde) : `${formatFechaLarga(prodFechaDesde)} al ${formatFechaLarga(prodFechaHasta)}`,
      horario: prodHorario,
      unidad: 'Clínica Odontológica',
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
    });
  };

  // --- Filtros & Estadísticas de citas (Pestaña 2) ---
  const [estDesde, setEstDesde] = useState(inicioDeMes());
  const [estHasta, setEstHasta] = useState(fechaHoyISO());
  const { data: citas = [], isLoading: cargandoCitas } = useCitasRango(estDesde, estHasta);

  const porEstado = useMemo(() => ESTADOS_CITA.map((e) => ({
    ...e,
    total: citas.filter((c) => c.estado === e.value).length,
  })), [citas]);

  const porEspecialidad = useMemo(() => {
    const mapa = new Map<string, { total: number; color: string | null }>();
    for (const c of citas) {
      const nombre = c.medico?.especialidad?.nombre ?? "Sin especialidad";
      const prev = mapa.get(nombre) ?? { total: 0, color: c.medico?.especialidad?.color ?? null };
      prev.total += 1;
      mapa.set(nombre, prev);
    }
    return [...mapa.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [citas]);

  const topMedicos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of citas) {
      const nombre = c.medico ? `${c.medico.apellidos}, ${c.medico.nombres}` : `Médico #${c.medico_id}`;
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [citas]);

  const maxEstado = Math.max(1, ...porEstado.map((e) => e.total));
  const maxEsp = Math.max(1, ...porEspecialidad.map((e) => e.total));
  const maxMed = Math.max(1, ...topMedicos.map((m) => m.total));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" /> Clínica Odontológica
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-primary" /> Producción Odontológica por Profesional
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Informe de los tratamientos realizados y lo facturado en el período, por odontólogo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleImprimirPlanilla}
              disabled={cargandoProd}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2 rounded-xl font-bold"
            >
              <Printer className="w-4 h-4" /> Imprimir Planilla A4
            </Button>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as "planilla" | "estadisticas")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[420px] rounded-xl p-1 bg-muted">
            <TabsTrigger value="planilla" className="rounded-lg gap-2 text-sm font-semibold">
              <FileSpreadsheet className="w-4 h-4" /> Planilla de Productividad
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="rounded-lg gap-2 text-sm font-semibold">
              <BarChart2 className="w-4 h-4" /> Estadísticas de citas
            </TabsTrigger>
          </TabsList>

          {/* PESTAÑA 1: PLANILLA DE PRODUCTIVIDAD (MODELO OFICIAL) */}
          <TabsContent value="planilla" className="space-y-6 mt-6">
            {/* Tarjeta de Filtros */}
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" /> Período del informe (semanal, mensual o diario)
                    </CardTitle>
                    <CardDescription>
                      Consulte y descargue la producción de la clínica en la semana, en el mes o por rango de fechas.
                    </CardDescription>
                  </div>

                  {/* Accesos rápidos de período */}
                  <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
                    <Button
                      variant={tipoPeriodo === "semanal" ? "default" : "ghost"}
                      size="sm"
                      onClick={aplicarSemanaActual}
                      className="rounded-lg text-xs font-bold h-8 gap-1"
                    >
                      <CalendarDays className="w-3.5 h-3.5" /> Esta Semana
                    </Button>
                    <Button
                      variant={tipoPeriodo === "mensual" ? "default" : "ghost"}
                      size="sm"
                      onClick={aplicarMesActual}
                      className="rounded-lg text-xs font-bold h-8 gap-1"
                    >
                      <CalendarRange className="w-3.5 h-3.5" /> Este Mes
                    </Button>
                    <Button
                      variant={tipoPeriodo === "diario" ? "default" : "ghost"}
                      size="sm"
                      onClick={aplicarHoy}
                      className="rounded-lg text-xs font-bold h-8"
                    >
                      Hoy
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                  {/* Selector de Usuario / Profesional */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-primary" /> Producción del odontólogo
                    </Label>
                    <Select value={prodMedicoId} onValueChange={setProdMedicoId}>
                      <SelectTrigger className="rounded-xl font-bold bg-primary/5 border-primary/30">
                        <SelectValue placeholder="Profesional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mi_usuario" className="font-bold text-primary">
                          👤 Mi Usuario ({perfilPropio?.nombre || user?.email?.split("@")[0] || "Mi Perfil"})
                        </SelectItem>
                        <SelectItem value="todos">👥 Todos los Profesionales (Vista General)</SelectItem>
                        {medicos.map((med) => (
                          <SelectItem key={med.id} value={String(med.id)}>
                            🩺 {med.apellidos}, {med.nombres} {med.especialidad ? `(${med.especialidad.nombre})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Modo de Período */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Período
                    </Label>
                    <Select value={tipoPeriodo} onValueChange={(val) => cambiarPeriodo(val as TipoPeriodo)}>
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
                    <Label htmlFor="prod-desde" className="text-xs font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {tipoPeriodo === "diario" ? "Fecha de Atención" : "Fecha Desde"}
                    </Label>
                    <Input
                      id="prod-desde"
                      type="date"
                      className="rounded-xl"
                      value={prodFechaDesde}
                      onChange={(e) => {
                        if (e.target.value) {
                          const val = e.target.value;
                          if (tipoPeriodo === "diario") {
                            setProdFechaDesde(val);
                            setProdFechaHasta(val);
                          } else if (tipoPeriodo === "semanal") {
                            const r = getRangoSemana(val);
                            setProdFechaDesde(r.desde);
                            setProdFechaHasta(r.hasta);
                          } else if (tipoPeriodo === "mensual") {
                            const r = getRangoMes(val);
                            setProdFechaDesde(r.desde);
                            setProdFechaHasta(r.hasta);
                          } else {
                            setProdFechaDesde(val);
                            if (val > prodFechaHasta) setProdFechaHasta(val);
                          }
                        }
                      }}
                    />
                  </div>

                  {tipoPeriodo !== "diario" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prod-hasta" className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Fecha Hasta
                      </Label>
                      <Input
                        id="prod-hasta"
                        type="date"
                        disabled={tipoPeriodo === "semanal" || tipoPeriodo === "mensual"}
                        className="rounded-xl"
                        value={prodFechaHasta}
                        onChange={(e) => e.target.value && setProdFechaHasta(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" /> Especialidad
                    </Label>
                    <Select value={prodEspecialidadId} onValueChange={setProdEspecialidadId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Especialidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las Especialidades</SelectItem>
                        <SelectItem value="enfermeria">Enfermería</SelectItem>
                        {especialidades.map((esp) => (
                          <SelectItem key={esp.id} value={String(esp.id)}>
                            {esp.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prod-horario" className="text-xs font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Horario / Turno
                    </Label>
                    <Input
                      id="prod-horario"
                      type="text"
                      placeholder="13:00 a 19:00"
                      className="rounded-xl"
                      value={prodHorario}
                      onChange={(e) => setProdHorario(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjetas de Resumen Dinámico */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Procedimientos</p>
                    <h3 className="text-2xl font-extrabold text-primary mt-1">{totalAtendidos}</h3>
                    <p className="text-[11px] text-primary/80 font-semibold mt-0.5">
                      {periodoTexto} · {totalM} M / {totalF} F
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Cobrado</p>
                    <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                      {facturacion.cobrado.toLocaleString("es-PY")} ₲
                    </h3>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-semibold mt-0.5">
                      Pagos recibidos en el período
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Por cobrar</p>
                    <h3 className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 tabular-nums">
                      {facturacion.pendiente.toLocaleString("es-PY")} ₲
                    </h3>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-semibold mt-0.5">
                      Saldo de {facturacion.planes} plan{facturacion.planes === 1 ? "" : "es"} del período
                    </p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                    <Coins className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profesional</p>
                    <h3 className="text-sm font-bold text-foreground truncate mt-1">{especialistaSeleccionadoNombre}</h3>
                  </div>
                  <div className="p-3 bg-accent rounded-2xl text-foreground flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista Previa de la Planilla Oficial */}
            <Card className="rounded-2xl border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white font-bold text-xs uppercase">
                        Modelo Oficial
                      </Badge>
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-xs font-bold uppercase">
                        {tipoPeriodo === "diario" && "Informe Diario"}
                        {tipoPeriodo === "semanal" && "Informe Semanal"}
                        {tipoPeriodo === "mensual" && "Informe Mensual"}
                        {tipoPeriodo === "personalizado" && "Informe Personalizado"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-extrabold text-foreground mt-1">
                      {tipoPeriodo === "semanal" && "INFORME SEMANAL DE PRODUCCIÓN ODONTOLÓGICA"}
                      {tipoPeriodo === "mensual" && "INFORME MENSUAL DE PRODUCCIÓN ODONTOLÓGICA"}
                      {tipoPeriodo === "diario" && "INFORME DIARIO DE PRODUCCIÓN ODONTOLÓGICA"}
                      {tipoPeriodo === "personalizado" && "INFORME DE PRODUCCIÓN ODONTOLÓGICA"}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground">
                      Período: <strong className="text-sky-700 dark:text-sky-400 font-bold">{periodoTexto}</strong> &nbsp;·&nbsp;
                      Especialidad: <strong className="text-foreground uppercase">{especialidadSeleccionadaNombre}</strong> &nbsp;·&nbsp;
                      Especialista / Profesional: <strong className="text-foreground">{especialistaSeleccionadoNombre}</strong>
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleImprimirPlanilla}
                    variant="outline"
                    className="rounded-xl gap-2 font-semibold flex-shrink-0"
                  >
                    <Printer className="w-4 h-4 text-primary" /> Imprimir Documento
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {cargandoProd ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                    Cargando informe de productividad {tipoPeriodo}...
                  </div>
                ) : atenciones.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-semibold">Sin atenciones ni consultas registradas en este período ({periodoTexto}).</p>
                    <p className="text-xs mt-1">Pruebe seleccionando otro período (Semanal o Mensual) o ajustando el profesional.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white dark:bg-slate-950 font-semibold text-xs border-b border-border">
                          <th className="py-3 px-4 text-center w-12 border-r border-slate-800">Nº</th>
                          <th className="py-3 px-4 min-w-[200px] border-r border-slate-800">Nombre y Apellido</th>
                          <th className="py-3 px-4 text-center w-36 border-r border-slate-800">Documento</th>
                          <th className="py-3 px-4 text-center w-16 border-r border-slate-800">Sexo</th>
                          <th className="py-3 px-4 text-center w-20 border-r border-slate-800">Pieza</th>
                          <th className="py-3 px-4 min-w-[220px] border-r border-slate-800">Procedimiento</th>
                          <th className="py-3 px-4 min-w-[220px]">Nota clínica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {atenciones.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-muted-foreground border-r border-border/50 text-xs">
                              {row.index}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground border-r border-border/50">
                              <div>{row.pacienteNombre}</div>
                              {tipoPeriodo !== "diario" && (
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  Fecha: {formatFechaLarga(row.fecha)} {row.hora ? `(${row.hora} hs)` : ""}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-xs text-muted-foreground border-r border-border/50 font-medium">
                              {row.pacienteJerarquia}
                            </td>
                            <td className="py-3 px-4 text-center font-extrabold border-r border-border/50 text-xs">
                              <span className={row.pacienteSexo === "M" ? "text-blue-600 dark:text-blue-400" : "text-pink-600 dark:text-pink-400"}>
                                {row.pacienteSexo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center border-r border-border/50 text-xs font-bold tabular-nums">
                              {row.pieza || "—"}
                            </td>
                            <td className="py-3 px-4 border-r border-border/50 text-xs text-foreground/90">
                              {row.procedimiento}
                            </td>
                            <td className="py-3 px-4 text-xs text-foreground/90">
                              {row.nota}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pie de tabla con totales */}
                {atenciones.length > 0 && (
                  <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-foreground">
                    <div>
                      TOTAL PACIENTES ATENDIDOS POR {especialistaSeleccionadoNombre.toUpperCase()} ({periodoTexto.toUpperCase()}): <span className="text-primary text-sm font-extrabold">{totalAtendidos}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-blue-600 dark:text-blue-400">MASCULINOS (M): {totalM}</span>
                      <span className="text-pink-600 dark:text-pink-400">FEMENINOS (F): {totalF}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PESTAÑA 2: ESTADÍSTICAS GENERALES DE CITAS */}
          <TabsContent value="estadisticas" className="space-y-6 mt-6">
            <div className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <Label htmlFor="r-desde" className="text-xs font-semibold">Desde</Label>
                <Input id="r-desde" type="date" className="w-40 rounded-xl" value={estDesde} onChange={(e) => e.target.value && setEstDesde(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-hasta" className="text-xs font-semibold">Hasta</Label>
                <Input id="r-hasta" type="date" className="w-40 rounded-xl" value={estHasta} onChange={(e) => e.target.value && setEstHasta(e.target.value)} />
              </div>
            </div>

            {cargandoCitas ? (
              <p className="text-center text-sm text-muted-foreground py-12">Generando estadísticas...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base font-bold">Citas por estado</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {porEstado.map((e) => (
                      <Barra key={e.value} etiqueta={e.label} valor={e.total} max={maxEstado} />
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base font-bold">Por especialidad</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {porEspecialidad.length === 0
                      ? <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                      : porEspecialidad.map((e) => (
                          <Barra key={e.nombre} etiqueta={e.nombre} valor={e.total} max={maxEsp} color={e.color || undefined} />
                        ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base font-bold">Citas por médico</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {topMedicos.length === 0
                      ? <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                      : topMedicos.map((m) => (
                          <Barra key={m.nombre} etiqueta={m.nombre} valor={m.total} max={maxMed} />
                        ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
