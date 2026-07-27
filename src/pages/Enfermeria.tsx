import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BedDouble, Plus, Activity, HeartPulse, Search,
  LogOut, Printer, CheckCircle2, Clock, Hospital, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { matchPaciente } from "@/lib/utils";
import { usePacientes, labelTipoPaciente } from "@/api/pacientes";
import { useSearchCie10, type Cie10 } from "@/api/consultas";
import {
  useEnfermeriaCamas, useEnfermeriaIngresos, useIngresarPacienteCama,
  useRegistrarSignosVitales, useEgresarPacienteCama, type Cama, type Internacion,
} from "@/api/enfermeria";
import { imprimirHojaEnfermeria, cleanQrText } from "@/lib/imprimir";
import { useAuth } from "@/context/auth-context";

export default function Enfermeria() {
  const { user } = useAuth();
  const { data: camas = [] } = useEnfermeriaCamas();
  const { data: ingresos = [] } = useEnfermeriaIngresos();
  const { data: pacientes = [] } = usePacientes();

  const ingresarMut = useIngresarPacienteCama();
  const vitalesMut = useRegistrarSignosVitales();
  const egresarMut = useEgresarPacienteCama();

  const [salaFiltro, setSalaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false);
  const [camaPreseleccionada, setCamaPreseleccionada] = useState<Cama | null>(null);

  const [modalVitalesOpen, setModalVitalesOpen] = useState(false);
  const [ingresoSeleccionado, setIngresoSeleccionado] = useState<Internacion | null>(null);

  const [modalEgresoOpen, setModalEgresoOpen] = useState(false);
  const [ingresoEgreso, setIngresoEgreso] = useState<Internacion | null>(null);

  // Formulario de Ingreso
  const [pacienteId, setPacienteId] = useState("");
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [camaId, setCamaId] = useState("");
  const [diagnosticoIngreso, setDiagnosticoIngreso] = useState("");
  const [cieBusqueda, setCieBusqueda] = useState("");
  const [cieSel, setCieSel] = useState<Cie10 | null>(null);
  const [motivoObs, setMotivoObs] = useState("");
  const [medicoTratante, setMedicoTratante] = useState("");
  const [enfermeroCargo, setEnfermeroCargo] = useState("");

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieDebounced);

  // Formulario de Signos Vitales
  const [paSistolica, setPaSistolica] = useState("");
  const [paDiastolica, setPaDiastolica] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [glucemia, setGlucemia] = useState("");
  const [obsVitales, setObsVitales] = useState("");
  const [enfermeroVitales, setEnfermeroVitales] = useState("");

  // Formulario de Egreso
  const [motivoEgreso, setMotivoEgreso] = useState("");
  const [tipoEgreso, setTipoEgreso] = useState<"alta" | "traslado">("alta");

  // Pacientes filtrados para el selector de ingreso
  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return pacientes.slice(0, 15);
    return pacientes.filter((p) => matchPaciente(p, busquedaPaciente)).slice(0, 15);
  }, [pacientes, busquedaPaciente]);

  // Mapa Cama ID -> Ingreso Activo
  const mapaIngresos = useMemo(() => {
    const map = new Map<number, Internacion>();
    ingresos.forEach((ing) => {
      if (ing.estado === "activo") {
        map.set(ing.cama_id, ing);
      }
    });
    return map;
  }, [ingresos]);

  // Contadores
  const totalCamas = camas.length;
  const ocupadas = camas.filter((c) => c.estado === "ocupada").length;
  const disponibles = camas.filter((c) => c.estado === "disponible").length;
  const pctOcupacion = totalCamas > 0 ? Math.round((ocupadas / totalCamas) * 100) : 0;

  // Filtrado de camas por sala y búsqueda
  const camasFiltradas = useMemo(() => {
    return camas.filter((c) => {
      if (salaFiltro !== "todas" && String(c.sala_id) !== salaFiltro) return false;
      if (busqueda.trim()) {
        const ing = mapaIngresos.get(c.id);
        const pac = ing?.paciente;
        const target = `${c.codigo} ${c.sala_nombre || ""} ${pac ? `${pac.nombres} ${pac.apellidos} ${pac.documento}` : ""}`;
        if (!target.toLowerCase().includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [camas, salaFiltro, busqueda, mapaIngresos]);

  // Abrir modal de ingreso
  const handleAbrirIngreso = (cama?: Cama) => {
    setCamaPreseleccionada(cama || null);
    setCamaId(cama ? String(cama.id) : "");
    setPacienteId("");
    setBusquedaPaciente("");
    setDiagnosticoIngreso("");
    setCieBusqueda("");
    setCieSel(null);
    setMotivoObs("");
    setMedicoTratante("");
    setEnfermeroCargo("");
    setModalIngresoOpen(true);
  };

  // Guardar Ingreso
  const handleGuardarIngreso = async () => {
    if (!pacienteId) { toast.error("Selecciona un paciente."); return; }
    if (!camaId) { toast.error("Selecciona una cama libre."); return; }

    const now = new Date();
    const fecha = now.toISOString().split("T")[0];
    const hora = now.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });

    const diagFinal = cieSel ? `[${cieSel.codigo}] ${cieSel.descripcion}` : diagnosticoIngreso;

    try {
      await ingresarMut.mutateAsync({
        paciente_id: Number(pacienteId),
        cama_id: Number(camaId),
        fecha_ingreso: fecha,
        hora_ingreso: hora,
        diagnostico_ingreso: diagFinal || "En observación",
        cie10_id: cieSel?.id ?? null,
        motivo_observacion: motivoObs,
        medico_id: medicoTratante ? Number(medicoTratante) : null,
        enfermero_cargo: enfermeroCargo,
      });

      toast.success("Paciente ingresado a cama exitosamente.");
      setModalIngresoOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Abrir Signos Vitales
  const handleAbrirVitales = (ing: Internacion) => {
    setIngresoSeleccionado(ing);
    setPaSistolica("");
    setPaDiastolica("");
    setFc("");
    setFr("");
    setTemp("");
    setSpo2("");
    setGlucemia("");
    setObsVitales("");
    setEnfermeroVitales("");
    setModalVitalesOpen(true);
  };

  // Guardar Signos Vitales
  const handleGuardarVitales = async () => {
    if (!ingresoSeleccionado) return;
    if (!paSistolica && !fc && !temp && !spo2) {
      toast.error("Registra al menos una constante vital (PA, FC, Temp o SpO2).");
      return;
    }

    try {
      await vitalesMut.mutateAsync({
        internacion_id: Number(ingresoSeleccionado.id),
        pa_sistolica: paSistolica ? Number(paSistolica) : null,
        pa_diastolica: paDiastolica ? Number(paDiastolica) : null,
        fc: fc ? Number(fc) : null,
        fr: fr ? Number(fr) : null,
        temp: temp ? Number(temp) : null,
        spo2: spo2 ? Number(spo2) : null,
        glucemia: glucemia ? Number(glucemia) : null,
        observaciones: obsVitales,
        registrado_por: user?.email ?? enfermeroVitales ?? null,
      });

      toast.success("Signos vitales registrados correctamente.");
      setPaSistolica("");
      setPaDiastolica("");
      setFc("");
      setFr("");
      setTemp("");
      setSpo2("");
      setGlucemia("");
      setObsVitales("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Abrir Egreso
  const handleAbrirEgreso = (ing: Internacion) => {
    setIngresoEgreso(ing);
    setMotivoEgreso("");
    setTipoEgreso("alta");
    setModalEgresoOpen(true);
  };

  // Confirmar Egreso
  const handleConfirmarEgreso = async () => {
    if (!ingresoEgreso) return;
    if (!motivoEgreso.trim()) {
      toast.error("Indica la causa o resumen de egreso/alta.");
      return;
    }

    try {
      await egresarMut.mutateAsync({
        internacion_id: Number(ingresoEgreso.id),
        motivo_egreso: motivoEgreso,
        estado_final: tipoEgreso,
      });

      toast.success(
        tipoEgreso === "alta"
          ? "Paciente dado de alta de enfermería. Cama liberada."
          : "Traslado registrado. Cama liberada."
      );
      setModalEgresoOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Imprimir Hoja de Enfermería
  const handleImprimirFicha = (ing: Internacion) => {
    const pac = ing.paciente;
    const camaObj = ing.cama;
    const qrSvgHtml = renderToStaticMarkup(
      <QRCodeSVG
        value={cleanQrText([
          "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
          "DOCUMENTO: HOJA DE CONTROL DE ENFERMERIA Y GESTION DE CAMAS",
          `Paciente: ${pac ? `${pac.apellidos}, ${pac.nombres}` : "Sin datos"} (CI: ${pac?.documento || "—"})`,
          `Ubicacion: ${camaObj?.codigo || "Cama"} (${camaObj?.sala_nombre || "Sanidad"})`,
          `Ingreso: ${ing.fecha_ingreso} ${ing.hora_ingreso} hs`,
          `ID: ENF-CAM-${camaObj?.codigo || "0"}-${pac?.documento || "0"}`,
        ].join("\n"))}
        size={100}
        level="M"
      />
    );

    const signosFormateados = (ing.signos_vitales || []).map((v) => {
      const fechaObj = new Date(v.tomado_at);
      const fStr = isNaN(fechaObj.getTime())
        ? v.tomado_at
        : `${fechaObj.toLocaleDateString("es-PY")} ${fechaObj.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`;
      return {
        fechaHora: fStr,
        pa: v.pa_sistolica && v.pa_diastolica ? `${v.pa_sistolica}/${v.pa_diastolica}` : undefined,
        fc: v.fc ? String(v.fc) : undefined,
        fr: v.fr ? String(v.fr) : undefined,
        temp: v.temp ? String(v.temp) : undefined,
        spo2: v.spo2 ? String(v.spo2) : undefined,
        glucemia: v.glucemia ? String(v.glucemia) : undefined,
        observaciones: v.observaciones || undefined,
        enfermero: v.registrado_por?.split("@")[0] || undefined,
      };
    });

    imprimirHojaEnfermeria({
      pacienteNombre: pac ? `${pac.apellidos}, ${pac.nombres}` : "Sin datos",
      pacienteDocumento: pac?.documento,
      pacienteTipo: pac ? labelTipoPaciente(pac.tipo) : null,
      pacienteGrado: pac?.grado,
      pacienteUnidad: pac?.unidad || "ANP",
      camaCodigo: camaObj?.codigo || "Cama",
      salaNombre: camaObj?.sala_nombre || "Sanidad ANP",
      fechaIngreso: ing.fecha_ingreso,
      horaIngreso: ing.hora_ingreso,
      diagnosticoIngreso: ing.diagnostico_ingreso,
      motivoObservacion: ing.motivo_observacion,
      medicoTratante: ing.medico ? `Dr(a). ${ing.medico.apellidos}, ${ing.medico.nombres}` : null,
      enfermeroCargo: ing.enfermero_cargo,
      signosVitales: signosFormateados,
      qrSvgHtml,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg border border-blue-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/40 text-xs font-semibold px-2.5 py-0.5">
                SISTEMA PY HIS — MSPBS
              </Badge>
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-xs font-semibold px-2.5 py-0.5">
                SANIDAD ANP
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <BedDouble className="w-8 h-8 text-blue-400 animate-pulse" />
              Enfermería y Gestión de Camas
            </h1>
            <p className="text-sm text-blue-200/90 max-w-2xl">
              Control de internación, observación de cadetes y personal, constantes vitales y disponibilidad de salas en tiempo real.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg gap-2 shrink-0 border border-emerald-400/50"
            onClick={() => handleAbrirIngreso()}
          >
            <Plus className="w-5 h-5" />
            Ingresar Paciente a Cama
          </Button>
        </div>

        {/* Tarjetas KPI de Estado de Camas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-xs bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Camas
              </CardTitle>
              <Hospital className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">{totalCamas}</div>
              <p className="text-xs text-muted-foreground mt-1">Capacidad instalada Sanidad</p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Disponibles (Libres)
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{disponibles}</div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400 mt-1">Listas para recibir ingreso</p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Ocupadas (En Observación)
              </CardTitle>
              <HeartPulse className="h-5 w-5 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{ocupadas}</div>
              <p className="text-xs text-rose-600/80 dark:text-rose-400 mt-1">Pacientes en cama bajo control</p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                % Ocupación
              </CardTitle>
              <Activity className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{pctOcupacion}%</div>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-400 mt-1">Nivel de uso de camas Sanidad</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros de Sala y Búsqueda */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Tabs por Sala */}
              <Tabs value={salaFiltro} onValueChange={setSalaFiltro} className="w-full md:w-auto">
                <TabsList className="flex flex-wrap h-auto p-1 bg-muted/60">
                  <TabsTrigger value="todas" className="text-xs font-semibold px-3 py-1.5">
                    Todas las Salas ({totalCamas})
                  </TabsTrigger>
                  <TabsTrigger value="1" className="text-xs font-semibold px-3 py-1.5">
                    Sala 1 (Masc)
                  </TabsTrigger>
                  <TabsTrigger value="2" className="text-xs font-semibold px-3 py-1.5">
                    Sala 2 (Fem)
                  </TabsTrigger>
                  <TabsTrigger value="3" className="text-xs font-semibold px-3 py-1.5">
                    Sala 3 (Aislamiento)
                  </TabsTrigger>
                  <TabsTrigger value="4" className="text-xs font-semibold px-3 py-1.5">
                    Pavellón Internación
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Input Búsqueda */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cama, paciente o CI..."
                  className="pl-9 h-9 text-xs"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mapa / Grilla de Camas (Estilo MSPBS PY HIS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {camasFiltradas.map((cama) => {
            const ing = mapaIngresos.get(cama.id);
            const paciente = ing?.paciente;
            const esOcupada = cama.estado === "ocupada" && ing;

            return (
              <Card
                key={cama.id}
                className={`border-2 transition-all duration-200 relative overflow-hidden shadow-sm ${
                  esOcupada
                    ? "border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/10"
                    : "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-400"
                }`}
              >
                {/* Banda de Estado Superior */}
                <div
                  className={`px-3 py-1.5 flex items-center justify-between text-xs font-extrabold uppercase ${
                    esOcupada
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4" />
                    {cama.codigo}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-white/40 text-white text-[10px] px-2 py-0"
                  >
                    {esOcupada ? "• OCUPADA" : "✓ DISPONIBLE"}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide border-b pb-1">
                    {cama.sala_nombre || "Sanidad ANP"}
                  </div>

                  {esOcupada && paciente ? (
                    <div className="space-y-3">
                      {/* Ficha Paciente Ocupante */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center justify-center font-black text-sm shrink-0 border border-rose-300">
                          {paciente.nombres?.[0] || "P"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-foreground truncate leading-tight">
                            {paciente.apellidos}, {paciente.nombres}
                          </h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            CI: <span className="font-mono font-bold text-foreground">{paciente.documento || "—"}</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-800 border-blue-200">
                              {labelTipoPaciente(paciente.tipo)}
                            </Badge>
                            {paciente.unidad && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {paciente.unidad}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detalles del Ingreso */}
                      <div className="bg-background/80 border rounded-md p-2.5 text-xs space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Ingreso: </span>
                          <strong className="text-foreground">{ing.fecha_ingreso} ({ing.hora_ingreso} hs)</strong>
                        </p>
                        <p className="text-muted-foreground flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            <strong>Dx: </strong>{ing.diagnostico_ingreso || "En observación"}
                          </span>
                        </p>
                        {ing.medico && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            Dr(a): <strong>{ing.medico.apellidos}</strong>
                          </p>
                        )}
                      </div>

                      {/* Últimos Signos Vitales */}
                      {ing.signos_vitales && ing.signos_vitales.length > 0 ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md p-2 text-xs flex items-center justify-between">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                            Última PA: {ing.signos_vitales[0].pa_sistolica}/{ing.signos_vitales[0].pa_diastolica}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Temp: {ing.signos_vitales[0].temp || "—"} °C
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic">
                          Sin controles de signos vitales registrados hoy.
                        </p>
                      )}

                      {/* Botones de Acción para Cama Ocupada */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-1.5 border-rose-300 text-rose-800 hover:bg-rose-100 font-semibold"
                          onClick={() => handleAbrirVitales(ing)}
                          title="Registrar constantes vitales"
                        >
                          <Activity className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          Vitales
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-1.5 border-blue-300 text-blue-800 hover:bg-blue-100 font-semibold"
                          onClick={() => handleImprimirFicha(ing)}
                          title="Imprimir Hoja de Enfermería con QR"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Ficha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold"
                          onClick={() => handleAbrirEgreso(ing)}
                          title="Dar de alta de enfermería o trasladar"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Alta
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Cama Libre / Disponible */
                    <div className="py-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-300">
                        <BedDouble className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">CAMA DISPONIBLE</p>
                        <p className="text-[11px] text-muted-foreground">Lista para asignación de paciente</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs w-full shadow-xs gap-1.5"
                        onClick={() => handleAbrirIngreso(cama)}
                      >
                        <Plus className="w-4 h-4" />
                        Ingresar a esta cama
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* MODAL 1: Ingresar Paciente a Cama */}
        <Dialog open={modalIngresoOpen} onOpenChange={setModalIngresoOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-blue-600" />
                Ingresar Paciente a Cama (PY HIS)
              </DialogTitle>
              <DialogDescription>
                {camaPreseleccionada
                  ? `Registrar ingreso directo en ${camaPreseleccionada.codigo} (${camaPreseleccionada.sala_nombre})`
                  : "Registrar observación o internación médica en la Sección Sanidad de la ANP."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Selección de Cama */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Cama y Sala de Destino *</Label>
                <Select value={camaId} onValueChange={setCamaId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecciona la cama disponible..." />
                  </SelectTrigger>
                  <SelectContent>
                    {camas
                      .filter((c) => c.estado === "disponible" || String(c.id) === camaId)
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.codigo} — {c.sala_nombre} (Libre)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buscador y Selector de Paciente */}
              <div className="space-y-1.5 relative">
                <Label className="font-semibold text-sm">Paciente a Ingresar *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-10"
                    placeholder="Buscar por cédula, apellido o nombre..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                  />
                </div>
                {pacientesFiltrados.length > 0 && busquedaPaciente.trim() && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-44 overflow-y-auto divide-y">
                    {pacientesFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                        onClick={() => {
                          setPacienteId(String(p.id));
                          setBusquedaPaciente(`${p.apellidos}, ${p.nombres} (CI: ${p.documento || "—"})`);
                        }}
                      >
                        <span className="font-semibold">{p.apellidos}, {p.nombres}</span>
                        <Badge variant="outline" className="text-xs">{p.documento || "—"}</Badge>
                      </button>
                    ))}
                  </div>
                )}
                {pacienteId && (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 pt-0.5">
                    ✓ Paciente seleccionado correctamente
                  </p>
                )}
              </div>

              {/* Diagnóstico CIE-10 */}
              <div className="space-y-1.5 relative">
                <Label className="font-semibold text-sm">Diagnóstico de Ingreso (CIE-10)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-10"
                    placeholder="Buscar diagnóstico por código o término..."
                    value={cieBusqueda}
                    onChange={(e) => setCieBusqueda(e.target.value)}
                  />
                  {cieOpciones.length > 0 && cieBusqueda.trim() && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-44 overflow-y-auto divide-y">
                      {cieOpciones.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setCieSel(c);
                            setCieBusqueda("");
                          }}
                        >
                          <span className="font-mono font-bold mr-2 text-blue-700">{c.codigo}</span>
                          {c.descripcion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {cieSel ? (
                  <div className="flex items-center justify-between p-2 rounded-md bg-blue-50 text-blue-900 text-xs border border-blue-200">
                    <span>
                      <strong className="font-mono font-bold mr-1">{cieSel.codigo}:</strong>
                      {cieSel.descripcion}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCieSel(null)}>Quitar</Button>
                  </div>
                ) : (
                  <Input
                    placeholder="O escribe el motivo/diagnóstico directo..."
                    className="h-10 text-xs mt-1"
                    value={diagnosticoIngreso}
                    onChange={(e) => setDiagnosticoIngreso(e.target.value)}
                  />
                )}
              </div>

              {/* Motivo de Observación */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Motivo de Observación / Indicación</Label>
                <Textarea
                  rows={2}
                  placeholder="Ej: Deshidratación moderada post-instrucción, reposo bajo control de signos vitales..."
                  value={motivoObs}
                  onChange={(e) => setMotivoObs(e.target.value)}
                />
              </div>

              {/* Médico y Enfermero */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Médico Tratante</Label>
                  <Input
                    placeholder="Dr(a). Nombre..."
                    className="h-10"
                    value={medicoTratante}
                    onChange={(e) => setMedicoTratante(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Enfermero/a a Cargo</Label>
                  <Input
                    placeholder="Lic. / Enf. Nombre..."
                    className="h-10"
                    value={enfermeroCargo}
                    onChange={(e) => setEnfermeroCargo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setModalIngresoOpen(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleGuardarIngreso}>
                Confirmar Ingreso a Cama
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: Controles y Signos Vitales */}
        <Dialog open={modalVitalesOpen} onOpenChange={setModalVitalesOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" />
                Hoja de Controles y Constantes Vitales de Enfermería
              </DialogTitle>
              <DialogDescription>
                Paciente: <strong>{ingresoSeleccionado?.paciente?.apellidos}, {ingresoSeleccionado?.paciente?.nombres}</strong> (CI: {ingresoSeleccionado?.paciente?.documento})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Formulario de Carga de Constantes */}
              <div className="bg-muted/40 p-4 rounded-lg border space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Registrar Nuevas Constantes Vitales
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">PA Sist (mmHg)</Label>
                    <Input placeholder="120" type="number" className="h-9 text-xs" value={paSistolica} onChange={(e) => setPaSistolica(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">PA Diast (mmHg)</Label>
                    <Input placeholder="80" type="number" className="h-9 text-xs" value={paDiastolica} onChange={(e) => setPaDiastolica(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">FC (bpm)</Label>
                    <Input placeholder="75" type="number" className="h-9 text-xs" value={fc} onChange={(e) => setFc(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">FR (rpm)</Label>
                    <Input placeholder="18" type="number" className="h-9 text-xs" value={fr} onChange={(e) => setFr(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Temp (°C)</Label>
                    <Input placeholder="36.5" type="number" step="0.1" className="h-9 text-xs" value={temp} onChange={(e) => setTemp(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">SpO2 (%)</Label>
                    <Input placeholder="98" type="number" className="h-9 text-xs" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Observaciones / Evolución</Label>
                    <Input placeholder="Paciente normotenso, tolera líquidos..." className="h-9 text-xs" value={obsVitales} onChange={(e) => setObsVitales(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Enfermero/a Responsable</Label>
                    <Input placeholder="Nombre de enfermero/a..." className="h-9 text-xs" value={enfermeroVitales} onChange={(e) => setEnfermeroVitales(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 font-bold text-xs" onClick={handleGuardarVitales}>
                    Guardar Controles Vitales
                  </Button>
                </div>
              </div>

              {/* Historial de Signos Vitales Registrados */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">Historial de Controles en Cama</h4>
                {ingresoSeleccionado?.signos_vitales && ingresoSeleccionado.signos_vitales.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted font-bold">
                        <tr>
                          <th className="p-2">Fecha/Hora</th>
                          <th className="p-2">PA</th>
                          <th className="p-2">FC</th>
                          <th className="p-2">Temp</th>
                          <th className="p-2">SpO2</th>
                          <th className="p-2">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ingresoSeleccionado.signos_vitales.map((v) => (
                          <tr key={v.id}>
                            <td className="p-2 font-mono">{new Date(v.tomado_at).toLocaleString("es-PY")}</td>
                            <td className="p-2 font-bold text-blue-700">{v.pa_sistolica && v.pa_diastolica ? `${v.pa_sistolica}/${v.pa_diastolica}` : "—"}</td>
                            <td className="p-2">{v.fc ? `${v.fc} bpm` : "—"}</td>
                            <td className="p-2 font-bold text-rose-600">{v.temp ? `${v.temp} °C` : "—"}</td>
                            <td className="p-2">{v.spo2 ? `${v.spo2}%` : "—"}</td>
                            <td className="p-2">{v.observaciones || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No se han cargado signos vitales en esta internación.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setModalVitalesOpen(false)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: Alta o Egreso de Cama */}
        <Dialog open={modalEgresoOpen} onOpenChange={setModalEgresoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <LogOut className="w-5 h-5 text-emerald-600" />
                Dar Alta / Egreso de Enfermería
              </DialogTitle>
              <DialogDescription>
                Liberar cama ocupada por <strong>{ingresoEgreso?.paciente?.apellidos}, {ingresoEgreso?.paciente?.nombres}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Tipo de Egreso</Label>
                <Select value={tipoEgreso} onValueChange={(v) => setTipoEgreso(v as "alta" | "traslado")}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta Médica / Mejoría (Permanece en Sanidad)</SelectItem>
                    <SelectItem value="traslado">Traslado (Hospital de Trauma / Rigoberto Caballero)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Resumen / Motivo de Egreso *</Label>
                <Textarea
                  rows={3}
                  placeholder="Ej: Paciente afebril, asintomático, alta con indicación de reposo en unidad..."
                  value={motivoEgreso}
                  onChange={(e) => setMotivoEgreso(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setModalEgresoOpen(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleConfirmarEgreso}>
                Confirmar Alta y Liberar Cama
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
