import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Activity, BedDouble, FileSpreadsheet, Loader2, Printer, Search, ShieldAlert } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { PacienteAlertasBanner } from "@/components/consultas/paciente-alertas-banner";
import {
  useMedicosActivos, fechaHoyISO, tienePreconsulta, resumenPreconsulta, type Cita,
} from "@/api/citas";
import { labelTipoPaciente, usePacientes, type Paciente } from "@/api/pacientes";
import {
  DESTINOS_ATENCION, destinoAtencion, useCreateConsulta, useSearchCie10,
  type Cie10, type Consulta, type DestinoAtencion,
} from "@/api/consultas";
import { useEnfermeriaCamas, useEnfermeriaIngresos, useIngresarPacienteCama } from "@/api/enfermeria";
import { imprimirCertificadoReposo, documentoReposo, cleanQrText, imprimirOrdenEstudios } from "@/lib/imprimir";
import { ProcedimientosSection } from "./procedimientos-section";
import type { NuevoProcedimiento } from "@/api/procedimientos";

function sumarDiasISO(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Cantidad de días de reposo contando ambos extremos (desde y hasta inclusive).
function diasEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`).getTime();
  const b = new Date(`${hasta}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

function horaAhora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function tituloDocumento(destino: DestinoAtencion): string {
  return destino === "alta" ? "CONSTANCIA MÉDICA" : documentoReposo(destino).titulo;
}

interface ConsultaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number | null;
  pacienteNombre: string;
  /** Objeto de paciente si se tiene a mano */
  paciente?: Paciente | null;
  /** Si viene de la agenda: precarga médico/fecha/motivo y marca la cita como atendida. */
  cita?: Cita | null;
  /** Precarga el motivo cuando no hay cita (ej. desde una atención de enfermería). */
  motivoInicial?: string;
  /** Precarga de la conducta (ej. el reposo provisorio que otorgó enfermería). */
  destinoInicial?: DestinoAtencion;
  reposoHastaInicial?: string;
  /** Se llama con la consulta recién creada (para vincularla donde se la pidió). */
  onCreated?: (consulta: Consulta) => void;
}

const FISIOTERAPIA_PRESETS: Cie10[] = [
  { id: -1, codigo: "Z50.1", descripcion: "Fisioterapia y ejercicios terapéuticos / Rehabilitación" },
  { id: -2, codigo: "M54.5", descripcion: "Lumbalgia (Lumbago no especificado / Dolor lumbar)" },
  { id: -3, codigo: "M54.2", descripcion: "Cervicalgia (Dolor cervical)" },
  { id: -4, codigo: "M54.6", descripcion: "Dorsalgia (Dolor dorsal / espalda)" },
  { id: -5, codigo: "M75.1", descripcion: "Síndrome del manguito rotatorio (Hombro doloroso)" },
  { id: -6, codigo: "M62.4", descripcion: "Contractura muscular" },
  { id: -7, codigo: "S93.4", descripcion: "Esguince y torcedura de tobillo" },
  { id: -8, codigo: "S83.5", descripcion: "Esguince y torcedura de rodilla" },
  { id: -9, codigo: "M77.1", descripcion: "Epicondilitis lateral (Codo de tenista)" },
  { id: -10, codigo: "M72.2", descripcion: "Fascitis plantar" },
  { id: -11, codigo: "M79.1", descripcion: "Mialgia (Dolor muscular generalizado / localizado)" },
  { id: -12, codigo: "M25.5", descripcion: "Artralgia (Dolor articular)" },
  { id: -13, codigo: "M17.9", descripcion: "Gonartrosis (Artrosis de rodilla)" },
  { id: -14, codigo: "M16.9", descripcion: "Coxartrosis (Artrosis de cadera)" },
  { id: -15, codigo: "M70.6", descripcion: "Bursitis trocantérea (Cadera)" },
  { id: -16, codigo: "T14.6", descripcion: "Traumatismo de músculo y tendón" },
  { id: -17, codigo: "M75.0", descripcion: "Capsulitis adhesiva de hombro (Hombro congelado)" },
  { id: -18, codigo: "Z50.8", descripcion: "Atención para otras medidas de rehabilitación" },
];

export function ConsultaForm({
  open, onOpenChange, pacienteId, pacienteNombre, paciente, cita, motivoInicial,
  destinoInicial, reposoHastaInicial, onCreated,
}: ConsultaFormProps) {
  const { user } = useAuth();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: camas = [] } = useEnfermeriaCamas();
  const { data: internaciones = [] } = useEnfermeriaIngresos();
  const { data: pacientes = [] } = usePacientes();
  const crear = useCreateConsulta();
  const internar = useIngresarPacienteCama();

  const pacienteActual = useMemo(() => {
    if (paciente) return paciente;
    if (cita?.paciente) return cita.paciente;
    if (pacienteId) return pacientes.find((p) => p.id === pacienteId) || null;
    return null;
  }, [paciente, cita, pacienteId, pacientes]);

  const [medicoId, setMedicoId] = useState("");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [motivo, setMotivo] = useState("");
  const [examen, setExamen] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [cieBusqueda, setCieBusqueda] = useState("");
  const [cieLista, setCieLista] = useState<Cie10[]>([]);
  const [destino, setDestino] = useState<DestinoAtencion>("alta");
  const [reposoHasta, setReposoHasta] = useState("");
  const [reposoDias, setReposoDias] = useState("");
  const [camaId, setCamaId] = useState("");
  const [procedimientos, setProcedimientos] = useState<NuevoProcedimiento[]>([]);

  // Estado para Solicitud de Orden de Estudios Médicos
  const [ordenEstudiosOpen, setOrdenEstudiosOpen] = useState(false);
  const [estudiosSolicitados, setEstudiosSolicitados] = useState("");
  const [estudiosIndicaciones, setEstudiosIndicaciones] = useState("");

  // Si la internación se creó y después falló la consulta, no se crea de nuevo.
  const internacionCreada = useRef<number | null>(null);

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieDebounced);

  const cieOpcionesCombinadas = useMemo(() => {
    const qLower = cieDebounced.trim().toLowerCase();
    if (!qLower) return [];

    const map = new Map<string, Cie10>();
    for (const c of cieOpciones) {
      map.set(c.codigo.toLowerCase(), c);
    }

    const esBusquedaFisio =
      "fisioterapia".includes(qLower) ||
      "kinesiologia".includes(qLower) ||
      "rehabilitacion".includes(qLower) ||
      "ejercicio".includes(qLower) ||
      "lumbalgia".includes(qLower) ||
      "lumbago".includes(qLower) ||
      "esguince".includes(qLower) ||
      "cervicalgia".includes(qLower) ||
      "contractura".includes(qLower) ||
      "manguito".includes(qLower) ||
      "tendinitis".includes(qLower) ||
      "artrosis".includes(qLower);

    for (const preset of FISIOTERAPIA_PRESETS) {
      const match =
        preset.codigo.toLowerCase().includes(qLower) ||
        preset.descripcion.toLowerCase().includes(qLower) ||
        esBusquedaFisio;
      if (match && !map.has(preset.codigo.toLowerCase())) {
        map.set(preset.codigo.toLowerCase(), preset);
      }
    }

    return Array.from(map.values());
  }, [cieOpciones, cieDebounced]);

  useEffect(() => {
    if (open) {
      setMedicoId(cita ? String(cita.medico_id) : "");
      setFecha(cita?.fecha || fechaHoyISO());
      setMotivo(cita?.motivo || motivoInicial || "");
      setExamen("");
      setDiagnostico("");
      setTratamiento("");
      setCieBusqueda("");
      setCieLista([]);
      // El reposo provisorio de enfermería llega precargado; el médico decide.
      const fechaBase = cita?.fecha || fechaHoyISO();
      const hastaInicial =
        destinoInicial && reposoHastaInicial && reposoHastaInicial >= fechaBase
          ? reposoHastaInicial
          : "";
      setDestino(destinoInicial ?? "alta");
      setReposoHasta(hastaInicial);
      setReposoDias(hastaInicial ? String(diasEntre(fechaBase, hastaInicial)) : "");
      setCamaId("");
      setProcedimientos([]);
      setEstudiosSolicitados("");
      setEstudiosIndicaciones("");
      internacionCreada.current = null;
    }
  }, [open, cita, motivoInicial, destinoInicial, reposoHastaInicial]);

  const medicoSeleccionado = useMemo(
    () => medicos.find((m) => String(m.id) === medicoId) || null,
    [medicos, medicoId]
  );

  const camasLibres = useMemo(() => {
    const ocupadas = new Set(internaciones.map((i) => i.cama_id));
    return camas.filter((c) => !c.fuera_de_servicio && !ocupadas.has(c.id));
  }, [camas, internaciones]);

  const destinoSel = destinoAtencion(destino);
  const reposoTipo = destinoSel?.reposo ?? null;
  const guardando = crear.isPending || internar.isPending;

  const handleImprimirOrdenEstudios = async () => {
    if (!estudiosSolicitados.trim()) {
      await showSwalError("Indique los estudios o análisis solicitados.");
      return;
    }

    const medicoNombre = medicoSeleccionado
      ? `Dr(a). ${medicoSeleccionado.apellidos}, ${medicoSeleccionado.nombres}`
      : "Profesional Médico";

    const cieTexto = cieLista.map((c) => `[${c.codigo}] ${c.descripcion}`).join(" / ");
    const dxFinal = [cieTexto, diagnostico.trim()].filter(Boolean).join(" — ");

    const qrSvgHtml = renderToStaticMarkup(
      <QRCodeSVG
        value={cleanQrText([
          "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
          "DOCUMENTO: SOLICITUD DE ESTUDIOS MEDICOS",
          `Paciente: ${pacienteNombre}`,
          `Estudios: ${estudiosSolicitados.trim()}`,
          `Dx: ${dxFinal || "Consulta Médica"}`,
          `Medico: ${medicoNombre}`,
        ].join("\n"))}
        size={100}
        level="M"
      />
    );

    imprimirOrdenEstudios({
      pacienteNombre,
      pacienteDocumento: pacienteActual?.documento,
      pacienteTipo: pacienteActual?.tipo ? labelTipoPaciente(pacienteActual.tipo) : null,
      pacienteGrado: (pacienteActual && "grado" in pacienteActual ? pacienteActual.grado : null) || null,
      pacienteUnidad: (pacienteActual && "unidad" in pacienteActual ? pacienteActual.unidad : null) || "ANP",
      fecha: fecha.split("-").reverse().join("/"),
      estudiosSolicitados: estudiosSolicitados.trim(),
      diagnosticoPresuntivo: dxFinal || null,
      indicaciones: estudiosIndicaciones.trim() || null,
      medicoNombre,
      qrSvgHtml,
    });

    // Guardar la orden en el tratamiento para que persista en la base de datos
    const marca = `[ESTUDIOS SOLICITADOS: ${estudiosSolicitados.trim()}]`;
    setTratamiento((prev) => (prev.includes(marca) ? prev : (prev ? `${prev.trim()}\n${marca}` : marca)));

    setOrdenEstudiosOpen(false);
    await showSwalSuccess("Orden de estudios emitida. Se abre para imprimir.");
  };

  const handleGuardar = async (opts?: { eImprimirReposo?: boolean }) => {
    if (!pacienteId) return;
    if (!medicoId) { await showSwalError("Selecciona el médico que atendió."); return; }
    if (cieLista.length === 0 && !diagnostico.trim() && !motivo.trim() && !examen.trim() && !tratamiento.trim()) {
      await showSwalError("Registra al menos un diagnóstico, motivo o descripción de la consulta.");
      return;
    }
    if (reposoTipo && reposoHasta && reposoHasta < fecha) {
      await showSwalError("La fecha 'hasta' del reposo no puede ser anterior a la consulta.");
      return;
    }
    if (destino === "internacion" && !camaId && !internacionCreada.current) {
      await showSwalError("Elija la cama donde queda internado.");
      return;
    }

    const cieTexto = cieLista.map((c) => `[${c.codigo}] ${c.descripcion}`).join(" / ");
    const diagFinal = [cieTexto, diagnostico.trim()].filter(Boolean).join(" — ");
    const primerCieId = cieLista[0]?.id && cieLista[0]?.id > 0 ? cieLista[0].id : null;

    try {
      if (destino === "internacion" && !internacionCreada.current) {
        const creada = await internar.mutateAsync({
          paciente_id: pacienteId,
          cama_id: Number(camaId),
          medico_id: Number(medicoId),
          ingresado_por: user?.email ?? null,
          fecha_ingreso: fecha,
          hora_ingreso: horaAhora(),
          diagnostico_ingreso: sanitizePlainText(diagFinal) || null,
          cie10_id: primerCieId,
          motivo_observacion: sanitizeMultilineText(motivo) || null,
        });
        internacionCreada.current = creada.id;
      }

      const res = await crear.mutateAsync({
        paciente_id: pacienteId,
        medico_id: Number(medicoId),
        cita_id: cita?.id ?? null,
        fecha,
        motivo_consulta: sanitizeMultilineText(motivo) || null,
        examen_fisico: sanitizeMultilineText(examen) || null,
        cie10_id: primerCieId,
        diagnostico: sanitizePlainText(diagFinal) || null,
        tratamiento: sanitizeMultilineText(tratamiento) || null,
        destino,
        reposo_tipo: reposoTipo,
        reposo_desde: reposoTipo ? fecha : null,
        reposo_hasta: reposoTipo ? reposoHasta || null : null,
        procedimientos,
      });

      onCreated?.(res);

      if (opts?.eImprimirReposo && reposoTipo) {
        const qrSvgHtml = renderToStaticMarkup(
          <QRCodeSVG
            value={cleanQrText([
              "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
              `DOCUMENTO: ${tituloDocumento(destino)}`,
              `Paciente: ${pacienteNombre}`,
              `Desde: ${fecha.split("-").reverse().join("/")} Hasta: ${reposoHasta ? reposoHasta.split("-").reverse().join("/") : "Nueva orden"}`,
              `Dx: ${cieLista.map((c) => c.codigo).join(", ") || diagnostico.trim() || "Consulta"}`,
              `Medico: Dr(a). ${medicoSeleccionado?.apellidos || ""} ${medicoSeleccionado?.nombres || ""}`,
            ].join("\n"))}
            size={105}
            level="M"
          />
        );

        imprimirCertificadoReposo({
          pacienteNombre,
          pacienteDocumento: pacienteActual?.documento || (pacienteId ? String(pacienteId) : null),
          pacienteTipo: pacienteActual?.tipo ? labelTipoPaciente(pacienteActual.tipo) : null,
          pacienteGrado: (pacienteActual && "grado" in pacienteActual ? pacienteActual.grado : null) || null,
          pacienteUnidad: (pacienteActual && "unidad" in pacienteActual ? pacienteActual.unidad : null) || "ANP",
          tipoReposo: reposoTipo,
          destino: destino as "sin_servicio" | "enfermo_local" | "reposo_domiciliario" | "internacion",
          fechaDesde: fecha.split("-").reverse().join("/"),
          fechaHasta: reposoHasta ? reposoHasta.split("-").reverse().join("/") : null,
          cieCodigo: cieLista.map((c) => c.codigo).join(", ") || "",
          cieDescripcion: cieLista.map((c) => `${c.codigo}: ${c.descripcion}`).join(" | ") || diagnostico,
          diagnosticoDetalle: diagnostico,
          tratamiento,
          medicoNombre: medicoSeleccionado ? `Dr(a). ${medicoSeleccionado.apellidos}, ${medicoSeleccionado.nombres}` : "Profesional Médico",
          consultaId: res.id,
          qrSvgHtml,
        });

        onOpenChange(false);
        await showSwalSuccess(`Consulta registrada y ${tituloDocumento(destino)} emitido.`);
      } else {
        onOpenChange(false);
        await showSwalSuccess(
          destino === "internacion"
            ? "Consulta registrada y paciente internado. Ya aparece en Enfermería."
            : cita ? "Consulta registrada y cita atendida." : "Consulta registrada."
        );
      }
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[94vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-xl font-bold">Registrar consulta — {pacienteNombre}</DialogTitle>
                <DialogDescription className="text-sm">
                  {cita
                    ? "Al guardar, la cita de la agenda quedará marcada como atendida."
                    : "Consulta sin cita previa (se agrega directo a la historia clínica)."}
                </DialogDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9 border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200"
                onClick={() => setOrdenEstudiosOpen(true)}
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Solicitud de Estudios
              </Button>
            </div>
          </DialogHeader>

          {/* Banner de alertas clínicas del paciente */}
          <PacienteAlertasBanner pacienteId={pacienteId} className="my-1" />

          {/* Signos vitales que enfermería tomó antes de que el paciente pasara. */}
          {cita && tienePreconsulta(cita) && (
            <div className="rounded-lg border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 px-3 py-2 my-1">
              <p className="text-xs font-semibold text-cyan-800 dark:text-cyan-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Signos vitales tomados por enfermería
              </p>
              <p className="text-sm font-mono text-cyan-900 dark:text-cyan-100 mt-0.5">
                {resumenPreconsulta(cita)}
              </p>
              {cita.preconsulta_nota && (
                <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-0.5 whitespace-pre-wrap">
                  {cita.preconsulta_nota}
                </p>
              )}
              {cita.preconsulta_enfermero && (
                <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                  Tomados por {cita.preconsulta_enfermero}
                </p>
              )}
            </div>
          )}

          <div className="space-y-5 pt-2">
            {/* Fila 1: Médico y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="co-medico" className="font-semibold text-sm">Médico *</Label>
                <MedicoSelector id="co-medico" value={medicoId} onChange={setMedicoId} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-fecha" className="font-semibold text-sm">Fecha *</Label>
                <Input id="co-fecha" type="date" className="h-10" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>

            {/* Fila 2: Motivo y Examen físico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="co-motivo" className="font-semibold text-sm">Motivo de consulta</Label>
                <Textarea
                  id="co-motivo"
                  rows={2}
                  placeholder="Ej: Dolor lumbar de 3 días"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-examen" className="font-semibold text-sm">Examen físico / Hallazgos</Label>
                <Textarea
                  id="co-examen"
                  rows={2}
                  placeholder="Ej: Dolor a la palpación..."
                  value={examen}
                  onChange={(e) => setExamen(e.target.value)}
                />
              </div>
            </div>

            {/* Fila 3: CIE-10 (Múltiples diagnósticos) y Diagnóstico texto libre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor="co-cie" className="font-semibold text-sm">Diagnósticos CIE-10 (opcional)</Label>
                  <span className="text-xs text-muted-foreground font-normal">
                    {cieLista.length} seleccionado{cieLista.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="co-cie"
                    className="pl-9 h-10"
                    placeholder="Buscar y seleccionar diagnósticos (ej. Caries, Fisioterapia, Lumbalgia)..."
                    value={cieBusqueda}
                    onChange={(e) => setCieBusqueda(e.target.value)}
                  />
                  {cieOpcionesCombinadas.length > 0 && cieBusqueda.trim() && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-52 overflow-y-auto divide-y">
                      {cieOpcionesCombinadas.map((c) => {
                        const yaSeleccionado = cieLista.some((item) => item.codigo === c.codigo);
                        return (
                          <button
                            key={c.codigo}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                              yaSeleccionado ? "bg-blue-50 text-blue-900 font-semibold dark:bg-blue-950 dark:text-blue-100" : "hover:bg-accent"
                            }`}
                            onClick={() => {
                              if (!yaSeleccionado) {
                                setCieLista((prev) => [...prev, c]);
                              }
                              setCieBusqueda("");
                            }}
                          >
                            <span>
                              <span className="font-mono font-bold mr-2 text-blue-700 dark:text-blue-400">{c.codigo}</span>
                              {c.descripcion}
                            </span>
                            {yaSeleccionado && <span className="text-xs text-blue-600 font-bold">✓ Agregado</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chips de Fisioterapia / Kinesiología frecuentes */}
                <div className="space-y-1 pt-0.5">
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <span>💡 Opciones rápidas de Fisioterapia / Kinesiología:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FISIOTERAPIA_PRESETS.slice(0, 8).map((preset) => {
                      const yaSeleccionado = cieLista.some((c) => c.codigo === preset.codigo);
                      return (
                        <button
                          key={preset.codigo}
                          type="button"
                          onClick={() => {
                            if (yaSeleccionado) {
                              setCieLista((prev) => prev.filter((c) => c.codigo !== preset.codigo));
                            } else {
                              const realFromDb = cieOpciones.find((c) => c.codigo === preset.codigo);
                              setCieLista((prev) => [...prev, realFromDb || preset]);
                            }
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            yaSeleccionado
                              ? "bg-blue-600 text-white border-blue-600 font-semibold"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/80"
                          }`}
                        >
                          <span className="font-mono font-bold mr-1">{preset.codigo}</span>
                          {preset.descripcion.split("(")[0].trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Diagnósticos CIE-10 Seleccionados */}
                {cieLista.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cieLista.map((c) => (
                      <Badge
                        key={c.codigo}
                        variant="outline"
                        className="px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="font-mono font-bold text-blue-950 dark:text-blue-100">{c.codigo}</span>
                        <span className="max-w-[220px] truncate">{c.descripcion}</span>
                        <button
                          type="button"
                          className="ml-1 text-blue-600 hover:text-red-600 font-bold hover:bg-blue-100 dark:hover:bg-blue-900 rounded px-2.5 py-2 -my-2 -mr-1 text-xs"
                          onClick={() => setCieLista((prev) => prev.filter((item) => item.codigo !== c.codigo))}
                          title="Quitar este diagnóstico"
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-diagnostico" className="font-semibold text-sm">Diagnóstico (observaciones / detalle)</Label>
                <Input
                  id="co-diagnostico"
                  className="h-10"
                  placeholder="Detalle o descripción adicional del diagnóstico..."
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                />
              </div>
            </div>

            {/* Fila 4: Tratamiento */}
            <div className="space-y-1.5">
              <Label htmlFor="co-tratamiento" className="font-semibold text-sm">Tratamiento / indicaciones</Label>
              <Textarea
                id="co-tratamiento"
                rows={3}
                placeholder="Medicamentos indicados, reposo, medidas generales..."
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
              />
            </div>

            <ProcedimientosSection value={procedimientos} onChange={setProcedimientos} />

            {/* Destino: con qué conducta termina la atención */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="co-destino" className="font-semibold text-sm">Destino del paciente</Label>
                  <Select value={destino} onValueChange={(v) => setDestino(v as DestinoAtencion)}>
                    <SelectTrigger id="co-destino" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DESTINOS_ATENCION.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reposoTipo && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="co-reposo-dias" className="font-semibold text-sm">Cantidad de días</Label>
                      <Input
                        id="co-reposo-dias"
                        type="number"
                        className="h-10"
                        min={1}
                        placeholder="Ej: 3"
                        value={reposoDias}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReposoDias(v);
                          const n = Number(v);
                          if (v && Number.isInteger(n) && n >= 1) {
                            setReposoHasta(sumarDiasISO(fecha, n - 1));
                          } else if (!v) {
                            setReposoHasta("");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="co-reposo-hasta" className="font-semibold text-sm">Reposo hasta (inclusive)</Label>
                      <Input
                        id="co-reposo-hasta"
                        type="date"
                        className="h-10"
                        min={fecha}
                        value={reposoHasta}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReposoHasta(v);
                          setReposoDias(v && v >= fecha ? String(diasEntre(fecha, v)) : "");
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {destino === "internacion" && (
                <div className="space-y-1.5">
                  <Label htmlFor="co-cama" className="font-semibold text-sm flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-muted-foreground" />
                    Cama donde queda internado *
                  </Label>
                  <Combobox
                    id="co-cama"
                    value={camaId}
                    onChange={setCamaId}
                    placeholder={camasLibres.length ? "Elija la cama libre" : "No hay camas libres disponibles"}
                    buscarPlaceholder="Buscar cama..."
                    vacioTexto="No hay camas libres."
                    opciones={camasLibres.map((c) => ({
                      value: String(c.id),
                      label: c.codigo,
                      detalle: c.sala_nombre || null,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Al guardar, el paciente aparece internado en la pantalla de Enfermería.
                  </p>
                </div>
              )}

              {reposoTipo && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900">
                  <div className="flex items-start gap-2.5 text-red-900 dark:text-red-200">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">{tituloDocumento(destino)}</p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                        Queda eximido de la educación física en esas fechas (lo ve Control de Peso).
                        Al guardar se emite el documento oficial impreso con código QR de verificación.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 gap-1.5 font-semibold text-xs text-red-800 border-red-300 bg-white hover:bg-red-100 dark:bg-red-900 dark:text-red-100 shrink-0"
                    onClick={() => handleGuardar({ eImprimirReposo: true })}
                    disabled={guardando}
                  >
                    <Printer className="w-4 h-4" />
                    Guardar e imprimir
                  </Button>
                </div>
              )}
            </div>

            <Button onClick={() => handleGuardar()} disabled={guardando} className="w-full h-11 font-semibold text-base mt-2">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar consulta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-diálogo para emitir Orden de Estudios Médicos */}
      <Dialog open={ordenEstudiosOpen} onOpenChange={setOrdenEstudiosOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Solicitud de Estudios Médicos — {pacienteNombre}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Emitir orden oficial de análisis o estudios para la Sanidad ANP o el Hospital Rigoberto Caballero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="oe-estudios" className="font-semibold text-xs">Estudios o Análisis Solicitados *</Label>
              <Textarea
                id="oe-estudios"
                rows={3}
                placeholder="Ej: Hemograma completo, Perfil renal, Ecografía abdominal, Rx Tórax PA"
                value={estudiosSolicitados}
                onChange={(e) => setEstudiosSolicitados(e.target.value)}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">Rápidos:</span>
                {["Hemograma Completo", "Perfil Renal / Uremia", "Perfil Hepático", "Rx Tórax PA", "Ecografía Abdominal"].map((est) => (
                  <Badge
                    key={est}
                    variant="outline"
                    className="cursor-pointer text-[11px] py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={() =>
                      setEstudiosSolicitados((prev) =>
                        prev ? `${prev}, ${est}` : est
                      )
                    }
                  >
                    + {est}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="oe-ind" className="font-semibold text-xs">Indicaciones previas o preparación</Label>
              <Input
                id="oe-ind"
                placeholder="Ej: Ayuno de 8 horas / Vejiga llena para ecografía"
                value={estudiosIndicaciones}
                onChange={(e) => setEstudiosIndicaciones(e.target.value)}
              />
            </div>

            <Button
              type="button"
              className="w-full gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              onClick={handleImprimirOrdenEstudios}
            >
              <Printer className="w-4 h-4" /> Emitir e Imprimir Orden de Estudios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
