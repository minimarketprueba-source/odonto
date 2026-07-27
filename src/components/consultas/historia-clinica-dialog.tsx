import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope, FileText, Printer, ShieldAlert, Ban, RotateCcw, BedDouble, Ambulance } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { labelDestinoAtencion, useConsultasPaciente, type Consulta } from "@/api/consultas";
import { useRecetasPaciente } from "@/api/recetas";
import {
  useAnularConsulta, useAnularReceta, useRestaurarConsulta, useRestaurarReceta,
} from "@/api/anulaciones";
import { AnularDialog } from "./anular-dialog";
import { useInternacionesPaciente } from "@/api/enfermeria";
import { labelDestino, numeroRac, triaje as nivelTriaje, useFichasRacPaciente } from "@/api/rac";
import { labelTipoPaciente, type Paciente } from "@/api/pacientes";
import { ConsultaForm } from "./consulta-form";
import { RecetaForm } from "./receta-form";
import {
  documentoReposo, imprimirCertificadoReposo, imprimirInformeConsulta, imprimirHistoriaClinicaHTML,
} from "@/lib/imprimir";

/** Textos del certificado de una consulta (parte sin servicio, enfermo local...). */
function docReposo(c: Consulta) {
  return documentoReposo(c.destino === "alta" ? null : c.destino, c.reposo_tipo);
}

interface HistoriaClinicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
}

type PrintTarget =
  | { type: "consulta"; consulta: Consulta }
  | { type: "reposo"; consulta: Consulta }
  | { type: "todas" }
  | null;

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

function fmtHora(created_at?: string | null, citaHora?: string | null): string | null {
  if (created_at) {
    const d = new Date(created_at);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (citaHora) {
    return citaHora.slice(0, 5);
  }
  return null;
}

// Tailwind no compila clases armadas al vuelo: hay que nombrarlas enteras.
const GRID_PESTANAS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

function cleanQrText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

/** Identificador del paciente para los documentos oficiales.
 *  Un familiar puede no tener cédula propia: se usa su nº de ficha. */
function idPaciente(p: Paciente): string {
  return p.documento?.trim() || `P${p.id}`;
}

/** Cédula tal como se muestra en un impreso. */
function ciImpresa(p: Paciente): string {
  return p.documento?.trim() || "sin cédula";
}

function getQrPayload(c: Consulta | null, paciente: Paciente | null, tipo: "consulta" | "reposo" | "todas"): string {
  if (!paciente) return "";
  const inst = "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA";
  const idPac = idPaciente(paciente);

  let raw = "";

  if (tipo === "reposo" && c) {
    raw = [
      inst,
      `DOCUMENTO: CERTIFICADO DE REPOSO MEDICO`,
      `Paciente: ${paciente.apellidos}, ${paciente.nombres} (CI: ${ciImpresa(paciente)})`,
      `Tipo Reposo: ${labelDestinoAtencion(c.destino, c.reposo_tipo).toUpperCase()}`,
      `Desde: ${fmtFecha(c.fecha)} Hasta: ${c.reposo_hasta ? fmtFecha(c.reposo_hasta) : "Nueva orden"}`,
      `Dx CIE-10: ${c.cie10?.codigo || "N/A"} - ${c.cie10?.descripcion || c.diagnostico || ""}`,
      `Medico: Dr(a). ${c.medico?.apellidos || ""}, ${c.medico?.nombres || ""}`,
      `ID Verificacion: REP-${idPac}-${c.id}`,
    ].join("\n");
  } else if (tipo === "consulta" && c) {
    raw = [
      inst,
      `DOCUMENTO: INFORME DE CONSULTA MEDICA`,
      `Paciente: ${paciente.apellidos}, ${paciente.nombres} (CI: ${ciImpresa(paciente)})`,
      `Fecha: ${fmtFecha(c.fecha)}`,
      `Especialidad: ${c.medico?.especialidad?.nombre || "Consulta"}`,
      `Dx CIE-10: ${c.cie10?.codigo || "N/A"} - ${c.diagnostico || ""}`,
      `Medico: Dr(a). ${c.medico?.apellidos || ""}, ${c.medico?.nombres || ""}`,
      `ID Verificacion: CON-${idPac}-${c.id}`,
    ].join("\n");
  } else {
    raw = [
      inst,
      `DOCUMENTO: HISTORIA CLINICA GENERAL`,
      `Paciente: ${paciente.apellidos}, ${paciente.nombres} (CI: ${ciImpresa(paciente)})`,
      `Tipo: ${labelTipoPaciente(paciente.tipo)}${paciente.unidad ? ` - ${paciente.unidad}` : ""}`,
      `Emision: ${new Date().toLocaleDateString("es-PY")}`,
      `ID Verificacion: HC-${idPac}`,
    ].join("\n");
  }

  return cleanQrText(raw);
}

export function HistoriaClinicaDialog({ open, onOpenChange, paciente }: HistoriaClinicaDialogProps) {
  const { hasPermission, canView, isAdmin } = usePermissions();
  const puedeRegistrar = hasPermission("consultas", "editar");
  const puedeRecetar = hasPermission("recetas", "editar");
  const veRecetas = canView("recetas");
  // El administrador trae también las anuladas, para poder verlas y restaurarlas.
  const { data: consultas = [], isLoading } = useConsultasPaciente(open ? (paciente?.id ?? null) : null, isAdmin);
  const { data: recetas = [] } = useRecetasPaciente(open && veRecetas ? (paciente?.id ?? null) : null, isAdmin);
  const { data: internaciones = [] } = useInternacionesPaciente(open ? (paciente?.id ?? null) : null);
  const { data: fichasRac = [] } = useFichasRacPaciente(open ? (paciente?.id ?? null) : null);
  const anularConsulta = useAnularConsulta();
  const anularReceta = useAnularReceta();
  const restaurarConsulta = useRestaurarConsulta();
  const restaurarReceta = useRestaurarReceta();
  const [anularTarget, setAnularTarget] = useState<
    { tipo: "consulta" | "receta"; id: number; detalle: string; tieneReposo?: boolean; citaId?: number | null } | null
  >(null);
  const [formOpen, setFormOpen] = useState(false);
  const [recetaOpen, setRecetaOpen] = useState(false);
  const [servicioFiltro, setServicioFiltro] = useState("todos");
  const [printTarget, setPrintTarget] = useState<PrintTarget>(null);

  const nombre = paciente ? `${paciente.apellidos}, ${paciente.nombres}` : "";

  const handleImprimir = (target: PrintTarget) => {
    if (!paciente || !target) return;

    if (target.type === "reposo" && target.consulta) {
      const c = target.consulta;
      const qrSvgHtml = renderToStaticMarkup(
        <QRCodeSVG
          value={getQrPayload(c, paciente, "reposo")}
          size={105}
          level="M"
        />
      );

      imprimirCertificadoReposo({
        pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
        pacienteDocumento: paciente.documento,
        pacienteTipo: paciente.tipo,
        pacienteGrado: paciente.grado,
        pacienteUnidad: paciente.unidad || "ANP",
        tipoReposo: c.reposo_tipo === "domiciliario" ? "domiciliario" : "local",
        destino: c.destino === "alta" ? null : c.destino,
        fechaDesde: fmtFecha(c.fecha),
        fechaHasta: c.reposo_hasta ? fmtFecha(c.reposo_hasta) : null,
        cieCodigo: c.cie10?.codigo,
        cieDescripcion: c.cie10?.descripcion,
        diagnosticoDetalle: c.diagnostico,
        tratamiento: c.tratamiento,
        medicoNombre: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : "Profesional Médico",
        consultaId: c.id,
        qrSvgHtml,
      });
    } else if (target.type === "consulta" && target.consulta) {
      const c = target.consulta;
      const qrSvgHtml = renderToStaticMarkup(
        <QRCodeSVG
          value={getQrPayload(c, paciente, "consulta")}
          size={105}
          level="M"
        />
      );

      const hora = fmtHora(c.created_at, c.cita?.hora);
      const reposoStr = c.reposo_tipo
        ? `${labelDestinoAtencion(c.destino, c.reposo_tipo)} desde ${fmtFecha(c.fecha)} ${c.reposo_hasta ? `hasta ${fmtFecha(c.reposo_hasta)}` : "hasta nueva orden"}`
        : null;

      imprimirInformeConsulta({
        pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
        pacienteDocumento: paciente.documento,
        pacienteTipo: labelTipoPaciente(paciente.tipo),
        pacienteGrado: paciente.grado,
        pacienteUnidad: paciente.unidad || "ANP",
        fechaConsulta: fmtFecha(c.fecha),
        horaConsulta: hora,
        especialidad: c.medico?.especialidad?.nombre || "Consulta General",
        motivoConsulta: c.motivo_consulta,
        examenFisico: c.examen_fisico,
        cieCodigo: c.cie10?.codigo,
        cieDescripcion: c.cie10?.descripcion,
        diagnosticoDetalle: c.diagnostico,
        tratamiento: c.tratamiento,
        reposoOtorgado: reposoStr,
        medicoNombre: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : "Profesional Médico",
        consultaId: c.id,
        qrSvgHtml,
      });
    } else {
      setPrintTarget(target);
      setTimeout(() => {
        const printElem = document.getElementById("historia-print");
        if (printElem) {
          imprimirHistoriaClinicaHTML(
            `${paciente.apellidos}, ${paciente.nombres}`,
            paciente.documento || "",
            printElem.innerHTML
          );
        }
      }, 150);
    }
  };

  // El administrador recibe también las anuladas, para poder restaurarlas.
  const vigentes = useMemo(() => consultas.filter((c) => !c.anulada_at), [consultas]);
  const anuladas = useMemo(() => consultas.filter((c) => c.anulada_at), [consultas]);
  const recetasVigentes = useMemo(() => recetas.filter((r) => !r.anulada_at), [recetas]);
  const recetasAnuladas = useMemo(() => recetas.filter((r) => r.anulada_at), [recetas]);

  // Historial por servicio (estilo PY HIS): filtro por especialidad de la consulta.
  const servicios = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const c of vigentes) {
      const s = c.medico?.especialidad?.nombre;
      if (s) conteo.set(s, (conteo.get(s) || 0) + 1);
    }
    return [...conteo.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [vigentes]);

  const consultasFiltradas =
    servicioFiltro === "todos"
      ? vigentes
      : vigentes.filter((c) => c.medico?.especialidad?.nombre === servicioFiltro);

  const cantidadPestanas = 1 + (veRecetas ? 1 : 0) + (isAdmin ? 1 : 0);

  const detalleConsulta = (c: Consulta) =>
    `Consulta del ${fmtFecha(c.fecha)}${c.medico?.especialidad ? ` — ${c.medico.especialidad.nombre}` : ""} — ${nombre}`;

  const handleAnular = async (motivo: string, reabrirCita: boolean) => {
    if (!anularTarget) return;
    try {
      if (anularTarget.tipo === "consulta") {
        await anularConsulta.mutateAsync({
          id: anularTarget.id, motivo, citaId: anularTarget.citaId, reabrirCita,
        });
        toast.success('Consulta anulada. La puede restaurar desde la pestaña "Anuladas".');
      } else {
        await anularReceta.mutateAsync({ id: anularTarget.id, motivo });
        toast.success('Receta anulada. La puede restaurar desde la pestaña "Anuladas".');
      }
      setAnularTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRestaurar = async (tipo: "consulta" | "receta", id: number, citaId?: number | null) => {
    try {
      if (tipo === "consulta") {
        await restaurarConsulta.mutateAsync({ id, citaId });
        toast.success("Consulta restaurada. Ya aparece de nuevo en la historia clínica.");
      } else {
        await restaurarReceta.mutateAsync(id);
        toast.success("Receta restaurada.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Historia clínica — {nombre}
                </DialogTitle>
                <DialogDescription>
                  CI {paciente?.documento} · {vigentes.length} consulta{vigentes.length !== 1 ? "s" : ""} registrada{vigentes.length !== 1 ? "s" : ""}
                </DialogDescription>
              </div>
              {vigentes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => handleImprimir({ type: "todas" })}
                  title="Imprimir o guardar en PDF toda la historia clínica"
                >
                  <Printer className="w-4 h-4" /> Imprimir Historia
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="consultas" className="flex-1 flex flex-col min-h-0">
            <TabsList className={`grid w-full ${GRID_PESTANAS[cantidadPestanas]}`}>
              <TabsTrigger value="consultas">Consultas ({vigentes.length})</TabsTrigger>
              {veRecetas && <TabsTrigger value="recetas">Recetas ({recetasVigentes.length})</TabsTrigger>}
              {isAdmin && (
                <TabsTrigger value="anuladas">
                  Anuladas ({anuladas.length + recetasAnuladas.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="consultas" className="flex-1 overflow-y-auto space-y-2 py-2">
              {puedeRegistrar && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setFormOpen(true)}>
                  <Plus className="w-4 h-4" /> Registrar consulta (sin cita)
                </Button>
              )}
              {servicios.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Servicio:</span>
                  <Select value={servicioFiltro} onValueChange={setServicioFiltro}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos ({vigentes.length})</SelectItem>
                      {servicios.map(([s, n]) => (
                        <SelectItem key={s} value={s}>{s} ({n})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {internaciones.length > 0 && servicioFiltro === "todos" && (
                <div className="rounded-lg border border-cyan-300 dark:border-cyan-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                    <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                      Internaciones en enfermería ({internaciones.length})
                    </span>
                  </div>
                  <div className="divide-y">
                    {internaciones.map((i) => (
                      <div key={i.id} className="px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{fmtFecha(i.fecha_ingreso)} · {i.hora_ingreso?.slice(0, 5)} hs</span>
                          <Badge variant="outline">{i.cama?.codigo ?? `Cama ${i.cama_id}`}</Badge>
                          {i.estado === "activo"
                            ? <Badge className="bg-cyan-100 text-cyan-700 border-0 dark:bg-cyan-900/40 dark:text-cyan-200">Internado ahora</Badge>
                            : <Badge variant="outline">
                                {i.estado === "traslado" ? "Trasladado" : "Alta"}
                                {i.fecha_egreso ? ` el ${fmtFecha(i.fecha_egreso)}` : ""}
                              </Badge>}
                        </div>
                        {i.diagnostico_ingreso && (
                          <p className="text-muted-foreground text-xs mt-0.5">{i.diagnostico_ingreso}</p>
                        )}
                        {i.motivo_egreso && (
                          <p className="text-muted-foreground text-xs">Egreso: {i.motivo_egreso}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fichasRac.length > 0 && servicioFiltro === "todos" && (
                <div className="rounded-lg border border-rose-300 dark:border-rose-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 flex items-center gap-2">
                    <Ambulance className="w-4 h-4 text-rose-700 dark:text-rose-300" />
                    <span className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                      Atenciones de urgencia ({fichasRac.length})
                    </span>
                  </div>
                  <div className="divide-y">
                    {fichasRac.map((f) => {
                      const nivel = nivelTriaje(f.triaje);
                      const signos = [
                        f.pa_sistolica && f.pa_diastolica && `PA ${f.pa_sistolica}/${f.pa_diastolica}`,
                        f.fc && `FC ${f.fc}`,
                        f.fr && `FR ${f.fr}`,
                        f.spo2 && `SpO2 ${f.spo2}%`,
                        f.temp && `T° ${f.temp}`,
                      ].filter(Boolean).join(" · ");
                      return (
                        <div key={f.id} className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {fmtFecha(f.fecha)} · {f.hora_admision?.slice(0, 5)} hs
                            </span>
                            <Badge variant="outline">{numeroRac(f.numero)}</Badge>
                            {nivel && (
                              <Badge className={`border ${nivel.clase}`}>{nivel.value.toUpperCase()}</Badge>
                            )}
                            {f.estado === "espera"
                              ? <Badge variant="outline">En espera del médico</Badge>
                              : f.destino && (
                                  <Badge variant="outline">
                                    {labelDestino(f.destino)}
                                    {f.destino_dias ? ` · ${f.destino_dias} día${f.destino_dias === 1 ? "" : "s"}` : ""}
                                  </Badge>
                                )}
                          </div>
                          {f.motivo_consulta && (
                            <p className="text-muted-foreground text-xs mt-0.5">{f.motivo_consulta}</p>
                          )}
                          {signos && <p className="text-muted-foreground text-xs">{signos}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isLoading ? (
                <p className="text-center text-sm text-muted-foreground py-6">Cargando historia clínica...</p>
              ) : consultasFiltradas.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Sin consultas registradas todavía.
                </p>
              ) : (
                consultasFiltradas.map((c) => {
                  const hora = fmtHora(c.created_at, c.cita?.hora);
                  return (
                    <div key={c.id} className="p-3 rounded-lg border space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {fmtFecha(c.fecha)}{hora ? ` · ${hora} hs` : ""}
                          </span>
                          {c.medico?.especialidad && (
                            <Badge className="bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/40 dark:text-blue-200">
                              {c.medico.especialidad.nombre}
                            </Badge>
                          )}
                          {c.cie10 && <Badge variant="outline">{c.cie10.codigo}</Badge>}
                          {c.reposo_tipo && (
                            <Badge className="bg-red-100 text-red-700 border-0 dark:bg-red-900/40 dark:text-red-200">
                              {labelDestinoAtencion(c.destino, c.reposo_tipo)}
                              {c.reposo_hasta ? ` hasta ${fmtFecha(c.reposo_hasta)}` : " (hasta nueva orden)"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {c.reposo_tipo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                              onClick={() => handleImprimir({ type: "reposo", consulta: c })}
                              title="Imprimir Certificado de Reposo Médico con Código QR"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Imp. Reposo
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleImprimir({ type: "consulta", consulta: c })}
                            title="Imprimir o guardar en PDF esta consulta"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imp. Consulta
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              title="Anular esta consulta (quedó mal cargada)"
                              onClick={() => setAnularTarget({
                                tipo: "consulta",
                                id: c.id,
                                detalle: detalleConsulta(c),
                                tieneReposo: !!c.reposo_tipo,
                                citaId: c.cita_id,
                              })}
                            >
                              <Ban className="w-3.5 h-3.5" /> Anular
                            </Button>
                          )}
                        </div>
                      </div>
                      {c.motivo_consulta && (
                        <p className="text-sm mt-1"><span className="text-muted-foreground">Motivo: </span>{c.motivo_consulta}</p>
                      )}
                      {c.examen_fisico && (
                        <p className="text-sm"><span className="text-muted-foreground">Examen: </span>{c.examen_fisico}</p>
                      )}
                      {c.diagnostico && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Diagnóstico: </span>
                          {c.diagnostico}{c.cie10 ? ` (${c.cie10.descripcion})` : ""}
                        </p>
                      )}
                      {c.tratamiento && (
                        <p className="text-sm whitespace-pre-wrap"><span className="text-muted-foreground">Tratamiento: </span>{c.tratamiento}</p>
                      )}
                      {c.medico && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Atendió: Dr(a). {c.medico.apellidos}, {c.medico.nombres}{hora ? ` (${hora} hs)` : ""}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            {veRecetas && (
              <TabsContent value="recetas" className="flex-1 overflow-y-auto space-y-2 py-2">
                {puedeRecetar && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setRecetaOpen(true)}>
                    <Plus className="w-4 h-4" /> Nueva receta
                  </Button>
                )}
                {recetasVigentes.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">Sin recetas emitidas.</p>
                ) : (
                  recetasVigentes.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm font-semibold">{r.numero}</span>
                        <span className="text-sm">{fmtFecha(r.fecha)}</span>
                        {r.diagnostico && <Badge variant="outline">{r.diagnostico}</Badge>}
                        {isAdmin && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 ml-auto"
                            title="Anular esta receta (quedó mal emitida)"
                            onClick={() => setAnularTarget({
                              tipo: "receta",
                              id: r.id,
                              detalle: `Receta ${r.numero} del ${fmtFecha(r.fecha)} — ${nombre}`,
                            })}
                          >
                            <Ban className="w-3.5 h-3.5" /> Anular
                          </Button>
                        )}
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {(r.items ?? []).map((i, idx) => (
                          <li key={i.id ?? idx} className="text-sm">
                            • {i.medicamento}
                            <span className="text-muted-foreground">
                              {[i.dosis, i.frecuencia, i.duracion].filter(Boolean).length > 0
                                ? ` — ${[i.dosis, i.frecuencia, i.duracion].filter(Boolean).join(", ")}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {r.indicaciones && (
                        <p className="text-xs text-muted-foreground mt-1">Indicaciones: {r.indicaciones}</p>
                      )}
                      {r.medico && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Dr(a). {r.medico.apellidos}, {r.medico.nombres}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="anuladas" className="flex-1 overflow-y-auto space-y-2 py-2">
                {anuladas.length === 0 && recetasAnuladas.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Acá aparecen las consultas y recetas que se anularon por error de carga.
                    Por ahora no hay ninguna.
                  </p>
                ) : (
                  <>
                    {anuladas.map((c) => (
                      <div
                        key={`c${c.id}`}
                        className="p-3 rounded-lg border border-dashed border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10 opacity-80"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="destructive">ANULADA</Badge>
                            <span className="font-medium text-sm line-through">{fmtFecha(c.fecha)}</span>
                            {c.medico?.especialidad && (
                              <Badge variant="outline">{c.medico.especialidad.nombre}</Badge>
                            )}
                            {c.reposo_tipo && <Badge variant="outline">Tenía reposo</Badge>}
                          </div>
                          <Button
                            variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                            onClick={() => handleRestaurar("consulta", c.id, c.cita_id)}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </Button>
                        </div>
                        {c.diagnostico && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Decía: </span>{c.diagnostico}
                          </p>
                        )}
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Anulada el {c.anulada_at ? new Date(c.anulada_at).toLocaleDateString("es-ES") : "—"}
                          {c.anulada_por ? ` por ${c.anulada_por.split("@")[0]}` : ""}
                          {c.motivo_anulacion ? ` — ${c.motivo_anulacion}` : ""}
                        </p>
                      </div>
                    ))}

                    {recetasAnuladas.map((r) => (
                      <div
                        key={`r${r.id}`}
                        className="p-3 rounded-lg border border-dashed border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10 opacity-80"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="destructive">ANULADA</Badge>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold line-through">{r.numero}</span>
                            <span className="text-sm">{fmtFecha(r.fecha)}</span>
                          </div>
                          <Button
                            variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                            onClick={() => handleRestaurar("receta", r.id)}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </Button>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Anulada el {r.anulada_at ? new Date(r.anulada_at).toLocaleDateString("es-ES") : "—"}
                          {r.anulada_por ? ` por ${r.anulada_por.split("@")[0]}` : ""}
                          {r.motivo_anulacion ? ` — ${r.motivo_anulacion}` : ""}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <AnularDialog
        open={!!anularTarget}
        onOpenChange={(abierto) => { if (!abierto) setAnularTarget(null); }}
        que={anularTarget?.tipo ?? "consulta"}
        detalle={anularTarget?.detalle ?? ""}
        tieneReposo={anularTarget?.tieneReposo}
        tieneCita={!!anularTarget?.citaId}
        guardando={anularConsulta.isPending || anularReceta.isPending}
        onConfirmar={handleAnular}
      />

      {/* Vista de Impresión Aislada (HTML/PDF) con QR */}
      <div id="historia-print">
        {paciente && printTarget && (
          <div className="p-4 font-sans text-black max-w-3xl mx-auto">
            {/* Encabezado Institucional */}
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <h1 className="text-xl font-bold uppercase tracking-wider">SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mt-0.5">Gral. José E. Díaz</p>
              <h2 className="text-base font-bold text-gray-900 mt-2 tracking-wide uppercase">
                {printTarget.type === "reposo"
                  ? docReposo(printTarget.consulta).titulo
                  : printTarget.type === "todas"
                  ? "HISTORIA CLÍNICA GENERAL"
                  : "INFORME DE CONSULTA MÉDICA"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Impreso el {new Date().toLocaleDateString("es-PY")} a las {new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs
              </p>
            </div>

            {/* Datos del Paciente */}
            <div className="bg-gray-50 p-3 rounded border border-gray-300 mb-5 text-sm grid grid-cols-2 gap-2">
              <div>
                <p><strong>Paciente:</strong> {paciente.apellidos}, {paciente.nombres}</p>
                <p><strong>Cédula de Identidad (CI):</strong> {ciImpresa(paciente)}</p>
              </div>
              <div>
                <p><strong>Tipo / Grado:</strong> {labelTipoPaciente(paciente.tipo)} {paciente.grado ? `— ${paciente.grado}` : ""}</p>
                {paciente.unidad && (
                  <p><strong>Unidad / Sección:</strong> {paciente.unidad} {paciente.promocion ? `(Curso ${paciente.promocion})` : ""}</p>
                )}
                {paciente.familiar_de && (
                  <p><strong>Familiar de:</strong> {paciente.familiar_de}</p>
                )}
              </div>
            </div>

            {/* OPCIÓN 1: CERTIFICADO DE REPOSO MÉDICO (DOMICILIARIO O ENFERMO LOCAL) */}
            {printTarget.type === "reposo" ? (
              <div className="border-2 border-red-600 p-5 rounded space-y-4 text-sm bg-white">
                <div className="flex justify-between font-bold border-b border-red-300 pb-2 text-base text-red-900">
                  <span>REF: {docReposo(printTarget.consulta).ref}-{idPaciente(paciente)}-{printTarget.consulta.id}</span>
                  <span>FECHA EMISIÓN: {fmtFecha(printTarget.consulta.fecha)}</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="font-bold text-red-900 text-base">TIPO DE CONDICIÓN MÉDICA:</p>
                    <p className="text-lg font-extrabold text-red-700 mt-1 uppercase">
                      • {docReposo(printTarget.consulta).condicion}
                    </p>
                    <p className="text-xs text-red-800 mt-1 font-medium">
                      {docReposo(printTarget.consulta).detalle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-200">
                    <div>
                      <p className="font-bold text-gray-700">FECHA DE INICIO:</p>
                      <p className="text-base font-semibold">{fmtFecha(printTarget.consulta.fecha)}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-700">HASTA (INCLUSIVE):</p>
                      <p className="text-base font-semibold">
                        {printTarget.consulta.reposo_hasta
                          ? fmtFecha(printTarget.consulta.reposo_hasta)
                          : "Hasta nueva orden médica"}
                      </p>
                    </div>
                  </div>

                  {printTarget.consulta.diagnostico && (
                    <div>
                      <p className="font-bold text-gray-800">DIAGNÓSTICO MÉDICO:</p>
                      <p className="pl-2 pt-0.5">
                        {printTarget.consulta.diagnostico}
                        {printTarget.consulta.cie10 ? ` [CIE-10: ${printTarget.consulta.cie10.codigo} - ${printTarget.consulta.cie10.descripcion}]` : ""}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-gray-800">INDICACIONES / RESTRICCIONES:</p>
                    <p className="pl-2 pt-0.5">
                      {printTarget.consulta.tratamiento || "Se indica suspensión total de actividades físicas, instrucción y ejercicios durante el periodo indicado."}
                    </p>
                  </div>
                </div>

                {/* Pie con Código QR y Firma */}
                <div className="pt-10 mt-8 flex justify-between items-end border-t border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 border border-gray-400 bg-white rounded">
                      <QRCodeSVG
                        value={getQrPayload(printTarget.consulta, paciente, "reposo")}
                        size={105}
                        level="M"
                      />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-gray-800">VERIFICACIÓN DIGITAL QR</p>
                      <p className="text-gray-600">Sanidad ANP — Documento Oficial</p>
                      <p className="font-mono text-[10px] text-gray-500">ID: REP-{idPaciente(paciente)}-{printTarget.consulta.id}</p>
                      <p className="text-[10px] text-gray-400">Escanee para verificar autenticidad</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-52 border-b border-black mb-1 mx-auto"></div>
                    <p className="font-bold text-sm">Dr(a). {printTarget.consulta.medico?.apellidos}, {printTarget.consulta.medico?.nombres}</p>
                    <p className="text-xs text-gray-600">Firma y Sello del Profesional Médico</p>
                  </div>
                </div>
              </div>
            ) : printTarget.type === "todas" ? (
              /* OPCIÓN 2: HISTORIA CLÍNICA COMPLETA */
              <div className="space-y-4">
                <h3 className="font-bold border-b border-gray-400 pb-1 text-sm uppercase">Historial de Consultas Registradas ({consultasFiltradas.length})</h3>
                {consultasFiltradas.map((c) => {
                  const h = fmtHora(c.created_at, c.cita?.hora);
                  return (
                    <div key={c.id} className="border border-gray-300 p-3 rounded space-y-1.5 text-xs">
                      <div className="flex justify-between font-bold border-b pb-1 text-sm">
                        <span>{fmtFecha(c.fecha)}{h ? ` · ${h} hs` : ""} — {c.medico?.especialidad?.nombre || "Consulta"}</span>
                        {c.cie10 && <span>CIE-10: {c.cie10.codigo}</span>}
                      </div>
                      {c.motivo_consulta && <p><strong>Motivo:</strong> {c.motivo_consulta}</p>}
                      {c.examen_fisico && <p><strong>Examen Físico:</strong> {c.examen_fisico}</p>}
                      {c.diagnostico && <p><strong>Diagnóstico:</strong> {c.diagnostico} {c.cie10 ? `(${c.cie10.descripcion})` : ""}</p>}
                      {c.tratamiento && <p className="whitespace-pre-wrap"><strong>Tratamiento:</strong> {c.tratamiento}</p>}
                      {c.reposo_tipo && (
                        <p className="text-red-700 font-bold"><strong>Reposo Médico:</strong> {c.reposo_tipo === "domiciliario" ? "Domiciliario" : "Local"} {c.reposo_hasta ? `hasta ${fmtFecha(c.reposo_hasta)}` : ""}</p>
                      )}
                      {c.medico && <p className="text-gray-600 pt-1">Atendió: Dr(a). {c.medico.apellidos}, {c.medico.nombres}</p>}
                    </div>
                  );
                })}

                <div className="pt-6 flex justify-between items-center border-t border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="p-1 border border-gray-400 bg-white rounded">
                      <QRCodeSVG
                        value={getQrPayload(null, paciente, "todas")}
                        size={80}
                        level="M"
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold">VERIFICACIÓN DE FICHA CLÍNICA</p>
                      <p className="text-gray-600 font-mono text-[10px]">HC-{idPaciente(paciente)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Sanidad ANP — Todos los derechos reservados</p>
                </div>
              </div>
            ) : printTarget.type === "consulta" ? (
              /* OPCIÓN 3: INFORME DE CONSULTA INDIVIDUAL */
              <div className="border-2 border-gray-400 p-5 rounded space-y-4 text-sm bg-white">
                <div className="flex justify-between font-bold border-b pb-2 text-base">
                  <span>FECHA: {fmtFecha(printTarget.consulta.fecha)} · HORA: {fmtHora(printTarget.consulta.created_at, printTarget.consulta.cita?.hora) || "—"} hs</span>
                  <span>ESPECIALIDAD: {printTarget.consulta.medico?.especialidad?.nombre || "—"}</span>
                </div>

                <div className="space-y-3">
                  {printTarget.consulta.motivo_consulta && (
                    <div>
                      <p className="font-bold text-gray-800">MOTIVO DE CONSULTA:</p>
                      <p className="pl-2 pt-0.5">{printTarget.consulta.motivo_consulta}</p>
                    </div>
                  )}
                  {printTarget.consulta.examen_fisico && (
                    <div>
                      <p className="font-bold text-gray-800">EXAMEN FÍSICO / HALLAZGOS:</p>
                      <p className="pl-2 pt-0.5">{printTarget.consulta.examen_fisico}</p>
                    </div>
                  )}
                  {printTarget.consulta.diagnostico && (
                    <div>
                      <p className="font-bold text-gray-800">DIAGNÓSTICO:</p>
                      <p className="pl-2 pt-0.5">{printTarget.consulta.diagnostico} {printTarget.consulta.cie10 ? `[CIE-10: ${printTarget.consulta.cie10.codigo} - ${printTarget.consulta.cie10.descripcion}]` : ""}</p>
                    </div>
                  )}
                  {printTarget.consulta.tratamiento && (
                    <div>
                      <p className="font-bold text-gray-800">TRATAMIENTO Y PRESCRIPCIÓN:</p>
                      <p className="pl-2 pt-0.5 whitespace-pre-wrap">{printTarget.consulta.tratamiento}</p>
                    </div>
                  )}
                  {printTarget.consulta.reposo_tipo && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded">
                      <p className="font-bold text-red-800">REPOSO MÉDICO CONCEDIDO:</p>
                      <p className="pl-2 pt-0.5 text-red-900 font-semibold">
                        {printTarget.consulta.reposo_tipo === "domiciliario" ? "Reposo domiciliario" : "Enfermo local"}
                        {printTarget.consulta.reposo_hasta ? ` hasta la fecha ${fmtFecha(printTarget.consulta.reposo_hasta)}` : " (hasta nueva orden)"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-12 mt-8 flex justify-between items-end border-t border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="p-1 border border-gray-400 bg-white rounded">
                      <QRCodeSVG
                        value={getQrPayload(printTarget.consulta, paciente, "consulta")}
                        size={90}
                        level="M"
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-gray-800">VERIFICACIÓN DIGITAL</p>
                      <p className="font-mono text-[10px] text-gray-500">CON-{idPaciente(paciente)}-{printTarget.consulta.id}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-52 border-b border-black mb-1 mx-auto"></div>
                    <p className="font-bold text-sm">Dr(a). {printTarget.consulta.medico?.apellidos}, {printTarget.consulta.medico?.nombres}</p>
                    <p className="text-xs text-gray-600">Firma y Sello del Profesional</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ConsultaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        pacienteId={paciente?.id ?? null}
        pacienteNombre={nombre}
      />
      <RecetaForm
        open={recetaOpen}
        onOpenChange={setRecetaOpen}
        pacienteId={paciente?.id ?? null}
        pacienteNombre={nombre}
      />
    </>
  );
}
