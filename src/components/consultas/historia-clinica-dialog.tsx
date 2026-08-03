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
import { Input } from "@/components/ui/input";
import { Plus, Stethoscope, FileText, Printer, ShieldAlert, Ban, RotateCcw, BedDouble, Ambulance, HeartPulse, Lock, Pill, Search, FileSpreadsheet, ClipboardPlus } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { labelDestinoAtencion, useConsultasPaciente, type Consulta } from "@/api/consultas";
import { useRecetasPaciente } from "@/api/recetas";
import {
  useAnularConsulta, useAnularReceta, useRestaurarConsulta, useRestaurarReceta,
} from "@/api/anulaciones";
import { AnularDialog } from "./anular-dialog";
import { useInternacionesPaciente } from "@/api/enfermeria";
import {
  labelDestinoAmbulatorio, labelTipoAtencion, nombreEspecialidad, useAtencionesPaciente,
} from "@/api/atenciones-enfermeria";
import { useEspecialidades } from "@/api/mantenimiento";
import { labelTipoProcedimiento, useProcedimientosPaciente } from "@/api/procedimientos";
import { labelDestino, numeroRac, triaje as nivelTriaje, useFichasRacPaciente } from "@/api/rac";
import { labelTipoPaciente, type Paciente } from "@/api/pacientes";
import { ConsultaForm } from "./consulta-form";
import { RecetaForm } from "./receta-form";
import { PacienteAlertasBanner } from "./paciente-alertas-banner";
import {
  imprimirCertificadoReposo, imprimirInformeConsulta, imprimirHistoriaClinicaCompleta,
} from "@/lib/imprimir";

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
  4: "grid-cols-4",
  5: "grid-cols-5",
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

function esConsultaGinecologia(c: Consulta): boolean {
  const esp = c.medico?.especialidad?.nombre?.toLowerCase() || "";
  return esp.includes("ginecolog") || esp.includes("obstetr");
}

export function HistoriaClinicaDialog({ open, onOpenChange, paciente }: HistoriaClinicaDialogProps) {
  const { hasPermission, canView, isAdmin, isMedico, isGinecologo } = usePermissions();
  const puedeVerGinecologia = isAdmin || isGinecologo;
  // Enfermería LEE la historia clínica, pero la consulta la firma el médico:
  // el botón de registrar es solo para quien puede firmarla con su cuenta.
  const puedeRegistrar = hasPermission("consultas", "editar") && (isMedico || isAdmin);
  const puedeRecetar = hasPermission("recetas", "editar");
  const veRecetas = canView("recetas");
  // El administrador trae también las anuladas, para poder verlas y restaurarlas.
  const { data: consultas = [], isLoading } = useConsultasPaciente(open ? (paciente?.id ?? null) : null, isAdmin);
  const { data: recetas = [] } = useRecetasPaciente(open && veRecetas ? (paciente?.id ?? null) : null, isAdmin);
  const { data: internaciones = [] } = useInternacionesPaciente(open ? (paciente?.id ?? null) : null);
  const { data: fichasRac = [] } = useFichasRacPaciente(open ? (paciente?.id ?? null) : null);
  const { data: atencionesEnfermeria = [] } = useAtencionesPaciente(open ? (paciente?.id ?? null) : null);
  const { data: procedimientos = [] } = useProcedimientosPaciente(open ? (paciente?.id ?? null) : null);
  // Para poner nombre al servicio que debe revisar cada atención de enfermería.
  const { data: especialidades = [] } = useEspecialidades();
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
  const [busquedaMedicamento, setBusquedaMedicamento] = useState("");
  const [busquedaEstudio, setBusquedaEstudio] = useState("");

  const nombre = paciente ? `${paciente.apellidos}, ${paciente.nombres}` : "";

  const handleImprimir = (target: PrintTarget) => {
    if (!paciente || !target) return;

    if (target.type === "reposo" && target.consulta) {
      const c = target.consulta;
      const esGineco = esConsultaGinecologia(c);
      const ocultar = esGineco && !puedeVerGinecologia;

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
        cieCodigo: ocultar ? undefined : c.cie10?.codigo,
        cieDescripcion: ocultar ? undefined : c.cie10?.descripcion,
        diagnosticoDetalle: ocultar ? "🔒 Diagnóstico Reservado (Ginecología y Obstetricia)" : c.diagnostico,
        tratamiento: ocultar ? "🔒 Tratamiento Reservado" : c.tratamiento,
        medicoNombre: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : "Profesional Médico",
        consultaId: c.id,
        qrSvgHtml,
      });
    } else if (target.type === "consulta" && target.consulta) {
      const c = target.consulta;
      const esGineco = esConsultaGinecologia(c);
      const ocultar = esGineco && !puedeVerGinecologia;

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
        motivoConsulta: ocultar ? "🔒 Reservado (Ginecología y Obstetricia)" : c.motivo_consulta,
        examenFisico: ocultar ? "🔒 Reservado (Ginecología y Obstetricia)" : c.examen_fisico,
        cieCodigo: ocultar ? undefined : c.cie10?.codigo,
        cieDescripcion: ocultar ? undefined : c.cie10?.descripcion,
        diagnosticoDetalle: ocultar ? "🔒 Diagnóstico Reservado (Ginecología y Obstetricia)" : c.diagnostico,
        tratamiento: ocultar ? "🔒 Tratamiento Reservado" : c.tratamiento,
        reposoOtorgado: reposoStr,
        medicoNombre: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : "Profesional Médico",
        consultaId: c.id,
        qrSvgHtml,
      });
    } else {
      const qrSvgHtml = renderToStaticMarkup(
        <QRCodeSVG
          value={getQrPayload(null, paciente, "todas")}
          size={105}
          level="M"
        />
      );

      imprimirHistoriaClinicaCompleta({
        pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
        pacienteDocumento: paciente.documento,
        pacienteTipo: labelTipoPaciente(paciente.tipo),
        pacienteGrado: paciente.grado,
        pacienteUnidad: paciente.unidad || "ANP",
        pacientePromocion: paciente.promocion,
        consultas: vigentes.map((c) => {
          const esGineco = esConsultaGinecologia(c);
          const ocultar = esGineco && !puedeVerGinecologia;
          return {
            fecha: fmtFecha(c.fecha),
            hora: fmtHora(c.created_at, c.cita?.hora),
            especialidad: c.medico?.especialidad?.nombre || "Consulta General",
            medico: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : null,
            motivo: ocultar ? "🔒 Reservado (Ginecología y Obstetricia)" : c.motivo_consulta,
            examen: ocultar ? "🔒 Reservado (Ginecología y Obstetricia)" : c.examen_fisico,
            cie10: ocultar ? null : (c.cie10 ? `[${c.cie10.codigo}] ${c.cie10.descripcion}` : null),
            diagnostico: ocultar ? "🔒 Diagnóstico Reservado (Ginecología y Obstetricia)" : c.diagnostico,
            tratamiento: ocultar ? "🔒 Tratamiento Reservado" : c.tratamiento,
            conducta: c.reposo_tipo
              ? `${labelDestinoAtencion(c.destino, c.reposo_tipo)} hasta ${c.reposo_hasta ? fmtFecha(c.reposo_hasta) : "nueva orden"}`
              : null,
          };
        }),
        recetas: recetasVigentes.map((r) => ({
          numero: r.numero,
          fecha: fmtFecha(r.fecha),
          medico: r.medico ? `Dr(a). ${r.medico.apellidos}, ${r.medico.nombres}` : null,
          items: (r.items ?? []).map(
            (i) => `${i.medicamento} ${[i.dosis, i.frecuencia, i.duracion].filter(Boolean).join(" · ")}`
          ),
          indicaciones: r.indicaciones,
        })),
        atencionesEnfermeria: atencionesEnfermeria.map((a) => ({
          fecha: fmtFecha(a.fecha),
          hora: a.hora?.slice(0, 5),
          tipo: labelTipoAtencion(a.tipo_atencion),
          motivo: a.motivo,
          procedimiento: a.procedimiento,
          signos: [
            a.pa_sistolica && a.pa_diastolica && `PA ${a.pa_sistolica}/${a.pa_diastolica}`,
            a.fc && `FC ${a.fc}`,
            a.fr && `FR ${a.fr}`,
            a.spo2 && `SpO2 ${a.spo2}%`,
            a.temp && `T° ${a.temp}`,
          ].filter(Boolean).join(" · "),
          enfermero: a.enfermero || a.registrado_por?.split("@")[0],
          revisada: a.revisada_at ? (a.medico_revisor ? `Dr(a). ${a.medico_revisor.apellidos}` : "Médico") : null,
        })),
        fichasRac: fichasRac.map((f) => ({
          numero: numeroRac(f.numero),
          fecha: fmtFecha(f.fecha),
          hora: f.hora_admision?.slice(0, 5),
          triaje: nivelTriaje(f.triaje)?.label,
          motivo: f.motivo_consulta,
          diagnostico: f.diagnostico,
          destino: labelDestino(f.destino),
        })),
        qrSvgHtml,
      });
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

  // Consolida todos los ítems prescriptos en las recetas vigentes del paciente
  const todosLosMedicamentos = useMemo(() => {
    const lista: {
      id: string;
      medicamento: string;
      dosis: string | null;
      frecuencia: string | null;
      duracion: string | null;
      indicaciones: string | null;
      fecha: string;
      recetaNumero: string;
      medicoNombre: string | null;
    }[] = [];

    for (const r of recetasVigentes) {
      const medicoNombre = r.medico ? `Dr(a). ${r.medico.apellidos}, ${r.medico.nombres}` : null;
      for (const item of r.items ?? []) {
        lista.push({
          id: `${r.id}-${item.id || item.medicamento}`,
          medicamento: item.medicamento,
          dosis: item.dosis ?? null,
          frecuencia: item.frecuencia ?? null,
          duracion: item.duracion ?? null,
          indicaciones: item.indicaciones ?? null,
          fecha: r.fecha,
          recetaNumero: r.numero,
          medicoNombre,
        });
      }
    }

    return lista;
  }, [recetasVigentes]);

  const medicamentosFiltrados = useMemo(() => {
    if (!busquedaMedicamento.trim()) return todosLosMedicamentos;
    const q = busquedaMedicamento.toLowerCase();
    return todosLosMedicamentos.filter(
      (m) =>
        m.medicamento.toLowerCase().includes(q) ||
        m.dosis?.toLowerCase().includes(q) ||
        m.frecuencia?.toLowerCase().includes(q) ||
        m.indicaciones?.toLowerCase().includes(q) ||
        m.recetaNumero.toLowerCase().includes(q)
    );
  }, [todosLosMedicamentos, busquedaMedicamento]);

  // Consolida órdenes de laboratorio y radiología (RAC) más solicitudes de estudios (consultas)
  const estudiosHistoricos = useMemo(() => {
    const lista: {
      id: string;
      tipo: "laboratorio" | "radiologia" | "estudio_medico";
      titulo: string;
      descripcion: string;
      fecha: string;
      medico: string | null;
      origen: string;
      diagnostico?: string | null;
    }[] = [];

    // 1. Laboratorio y Radiología registrados en RAC / Urgencias
    for (const f of fichasRac) {
      if (f.laboratorio?.trim()) {
        lista.push({
          id: `rac-lab-${f.id}`,
          tipo: "laboratorio",
          titulo: "Análisis de Laboratorio",
          descripcion: f.laboratorio.trim(),
          fecha: f.fecha,
          medico: f.enfermero ? `Enf. ${f.enfermero}` : "Urgencias / RAC",
          origen: "Urgencias (RAC)",
          diagnostico: f.diagnostico,
        });
      }
      if (f.radiologia?.trim()) {
        lista.push({
          id: `rac-rad-${f.id}`,
          tipo: "radiologia",
          titulo: "Radiología / Imagen",
          descripcion: f.radiologia.trim(),
          fecha: f.fecha,
          medico: f.enfermero ? `Enf. ${f.enfermero}` : "Urgencias / RAC",
          origen: "Urgencias (RAC)",
          diagnostico: f.diagnostico,
        });
      }
    }

    // 2. Órdenes de estudios emitidas en Consultas Médicas
    for (const c of vigentes) {
      const texto = c.tratamiento || "";
      const match = texto.match(/\[ESTUDIOS SOLICITADOS:\s*([^\]]+)\]/i);
      if (match && match[1]?.trim()) {
        lista.push({
          id: `con-est-${c.id}`,
          tipo: "estudio_medico",
          titulo: "Solicitud de Estudios Médicos",
          descripcion: match[1].trim(),
          fecha: c.fecha,
          medico: c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : null,
          origen: c.medico?.especialidad?.nombre || "Consulta Médica",
          diagnostico: c.diagnostico,
        });
      }
    }

    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [fichasRac, vigentes]);

  const estudiosFiltrados = useMemo(() => {
    if (!busquedaEstudio.trim()) return estudiosHistoricos;
    const q = busquedaEstudio.toLowerCase();
    return estudiosHistoricos.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.descripcion.toLowerCase().includes(q) ||
        e.origen.toLowerCase().includes(q) ||
        (e.diagnostico && e.diagnostico.toLowerCase().includes(q))
    );
  }, [estudiosHistoricos, busquedaEstudio]);

  const cantidadPestanas = 1 + (veRecetas ? 2 : 0) + 2 + (isAdmin ? 1 : 0);

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

          {/* Banner de alertas clínicas del paciente */}
          <PacienteAlertasBanner pacienteId={paciente?.id ?? null} className="my-1" />

          <Tabs defaultValue="consultas" className="flex-1 flex flex-col min-h-0">
            <TabsList className={`grid w-full ${GRID_PESTANAS[cantidadPestanas]}`}>
              <TabsTrigger value="consultas" className="min-w-0 text-xs sm:text-sm">Consultas ({vigentes.length})</TabsTrigger>
              {veRecetas && <TabsTrigger value="recetas" className="min-w-0 text-xs sm:text-sm">Recetas ({recetasVigentes.length})</TabsTrigger>}
              {veRecetas && <TabsTrigger value="medicamentos" className="min-w-0 text-xs sm:text-sm">Medicamentos ({todosLosMedicamentos.length})</TabsTrigger>}
              <TabsTrigger value="estudios" className="min-w-0 text-xs sm:text-sm">Estudios ({estudiosHistoricos.length})</TabsTrigger>
              <TabsTrigger value="procedimientos" className="min-w-0 text-xs sm:text-sm">Prácticas ({procedimientos.length})</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="anuladas" className="min-w-0 text-xs sm:text-sm">
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

              {atencionesEnfermeria.length > 0 && servicioFiltro === "todos" && (
                <div className="rounded-lg border border-teal-300 dark:border-teal-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                    <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                      Atenciones ambulatorias de enfermería ({atencionesEnfermeria.length})
                    </span>
                  </div>
                  <div className="divide-y">
                    {atencionesEnfermeria.map((a) => {
                      const signos = [
                        a.pa_sistolica && a.pa_diastolica && `PA ${a.pa_sistolica}/${a.pa_diastolica}`,
                        a.fc && `FC ${a.fc}`,
                        a.fr && `FR ${a.fr}`,
                        a.spo2 && `SpO2 ${a.spo2}%`,
                        a.temp && `T° ${a.temp}`,
                      ].filter(Boolean).join(" · ");
                      return (
                        <div key={a.id} className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{fmtFecha(a.fecha)} · {a.hora?.slice(0, 5)} hs</span>
                            <Badge variant="outline">{labelTipoAtencion(a.tipo_atencion)}</Badge>
                            {nombreEspecialidad(a.especialidad_id, especialidades) && (
                              <Badge variant="outline">
                                Para {nombreEspecialidad(a.especialidad_id, especialidades)}
                              </Badge>
                            )}
                            {a.destino && !["alta", "cita_medico", "derivado"].includes(a.destino) && (
                              <Badge className="bg-red-100 text-red-700 border-0 dark:bg-red-900/40 dark:text-red-200">
                                {labelDestinoAmbulatorio(a.destino)}
                                {a.reposo_hasta ? ` hasta ${fmtFecha(a.reposo_hasta)}` : ""}
                              </Badge>
                            )}
                            {a.revisada_at ? (
                              <Badge className="bg-green-100 text-green-700 border-0 dark:bg-green-900/40 dark:text-green-200">
                                Revisada{a.medico_revisor ? ` por Dr(a). ${a.medico_revisor.apellidos}` : ""}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/40 dark:text-amber-200">
                                Pendiente de revisión médica
                              </Badge>
                            )}
                          </div>
                          {a.motivo && (
                            <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">{a.motivo}</p>
                          )}
                          {a.procedimiento && (
                            <p className="text-muted-foreground text-xs whitespace-pre-wrap">Se hizo: {a.procedimiento}</p>
                          )}
                          {a.observaciones && (
                            <p className="text-muted-foreground text-xs whitespace-pre-wrap">Obs.: {a.observaciones}</p>
                          )}
                          {signos && <p className="text-muted-foreground text-xs">{signos}</p>}
                          <p className="text-muted-foreground text-xs">
                            Atendió: {a.enfermero || a.registrado_por?.split("@")[0] || "—"}
                            {a.nota_revision ? ` · Nota del médico: ${a.nota_revision}` : ""}
                          </p>
                        </div>
                      );
                    })}
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
                  const esGineco = esConsultaGinecologia(c);
                  const ocultar = esGineco && !puedeVerGinecologia;

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
                          {!ocultar && c.cie10 && <Badge variant="outline">{c.cie10.codigo}</Badge>}
                          {c.reposo_tipo && (
                            <Badge className="bg-red-100 text-red-700 border-0 dark:bg-red-900/40 dark:text-red-200">
                              {labelDestinoAtencion(c.destino, c.reposo_tipo)}
                              {c.reposo_hasta ? ` hasta ${fmtFecha(c.reposo_hasta)}` : " (hasta nueva orden)"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {c.reposo_tipo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 sm:h-7 px-2 text-xs gap-1 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                              onClick={() => handleImprimir({ type: "reposo", consulta: c })}
                              title="Imprimir Certificado de Reposo Médico con Código QR"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Imp. Reposo
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 sm:h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleImprimir({ type: "consulta", consulta: c })}
                            title="Imprimir o guardar en PDF esta consulta"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imp. Consulta
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 sm:h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
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
                      {ocultar ? (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2 rounded text-xs text-amber-800 dark:text-amber-300 space-y-0.5 mt-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            Diagnóstico e información médica reservada (Ginecología y Obstetricia)
                          </p>
                          <p className="text-[11px] opacity-90">
                            Acceso confidencial restringido exclusivamente a profesionales de Ginecología y Obstetricia.
                          </p>
                        </div>
                      ) : (
                        <>
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
                        </>
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
                            className="h-9 sm:h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 ml-auto"
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

            {veRecetas && (
              <TabsContent value="medicamentos" className="flex-1 overflow-y-auto space-y-3 py-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por medicamento, posología, indicación o número de receta..."
                    value={busquedaMedicamento}
                    onChange={(e) => setBusquedaMedicamento(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {medicamentosFiltrados.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <Pill className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {busquedaMedicamento ? "No se encontraron medicamentos con esa búsqueda" : "Sin fármacos prescriptos registrados"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {medicamentosFiltrados.map((m) => {
                      const posologia = [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                                <Pill className="w-4 h-4" />
                              </div>
                              <h4 className="font-semibold text-sm">{m.medicamento}</h4>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {m.recetaNumero}
                              </Badge>
                              <span>{fmtFecha(m.fecha)}</span>
                            </div>
                          </div>

                          {posologia && (
                            <p className="text-xs font-medium text-primary dark:text-primary-foreground pl-8">
                              {posologia}
                            </p>
                          )}

                          {m.indicaciones && (
                            <p className="text-xs text-muted-foreground pl-8 italic">
                              «{m.indicaciones}»
                            </p>
                          )}

                          {m.medicoNombre && (
                            <div className="text-[11px] text-muted-foreground pl-8 pt-0.5 border-t border-border/50">
                              Prescripto por: <span className="font-medium text-foreground">{m.medicoNombre}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="procedimientos" className="flex-1 overflow-y-auto space-y-2 py-2">
              {procedimientos.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Sin procedimientos o prácticas registradas.</p>
              ) : procedimientos.map((p) => (
                <div key={p.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2"><ClipboardPlus className="w-4 h-4 text-violet-600" /><span className="font-semibold text-sm">{labelTipoProcedimiento(p.tipo)}</span><Badge variant="outline">× {p.cantidad}</Badge></div>
                    <span className="text-xs text-muted-foreground">{fmtFecha(p.fecha)}</span>
                  </div>
                  {p.detalle && <p className="text-sm whitespace-pre-wrap">{p.detalle}</p>}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="estudios" className="flex-1 overflow-y-auto space-y-3 py-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tipo de estudio, laboratorio, radiología o diagnóstico..."
                  value={busquedaEstudio}
                  onChange={(e) => setBusquedaEstudio(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {estudiosFiltrados.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/20">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {busquedaEstudio ? "No se encontraron estudios con esa búsqueda" : "Sin órdenes de estudios ni análisis registrados"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {estudiosFiltrados.map((item) => {
                    const badgeColor =
                      item.tipo === "laboratorio"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 border-purple-200"
                        : item.tipo === "radiologia"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border-indigo-200";

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{item.titulo}</h4>
                              <p className="text-xs text-muted-foreground">{item.origen}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground">
                            <Badge variant="outline" className={badgeColor}>
                              {item.tipo === "laboratorio" ? "Laboratorio" : item.tipo === "radiologia" ? "Radiología / Imagen" : "Estudio Médico"}
                            </Badge>
                            <span>{fmtFecha(item.fecha)}</span>
                          </div>
                        </div>

                        <div className="pl-8 pt-1">
                          <p className="text-xs font-medium text-foreground whitespace-pre-wrap">
                            {item.descripcion}
                          </p>
                          {item.diagnostico && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dx presuntivo: {item.diagnostico}
                            </p>
                          )}
                          {item.medico && (
                            <p className="text-[11px] text-muted-foreground mt-1 border-t border-border/50 pt-0.5">
                              Solicitado por: <span className="font-medium text-foreground">{item.medico}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

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
                            variant="outline" size="sm" className="h-9 sm:h-7 px-2 text-xs gap-1"
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
                            variant="outline" size="sm" className="h-9 sm:h-7 px-2 text-xs gap-1"
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
