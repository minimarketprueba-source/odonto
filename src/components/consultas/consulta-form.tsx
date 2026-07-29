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
import { BedDouble, Loader2, Printer, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { useMedicosActivos, fechaHoyISO, type Cita } from "@/api/citas";
import {
  DESTINOS_ATENCION, destinoAtencion, useCreateConsulta, useSearchCie10,
  type Cie10, type Consulta, type DestinoAtencion,
} from "@/api/consultas";
import { useEnfermeriaCamas, useEnfermeriaIngresos, useIngresarPacienteCama } from "@/api/enfermeria";
import { imprimirCertificadoReposo, documentoReposo, cleanQrText } from "@/lib/imprimir";

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
  /** Si viene de la agenda: precarga médico/fecha/motivo y marca la cita como atendida. */
  cita?: Cita | null;
  /** Precarga el motivo cuando no hay cita (ej. desde una atención de enfermería). */
  motivoInicial?: string;
  /** Se llama con la consulta recién creada (para vincularla donde se la pidió). */
  onCreated?: (consulta: Consulta) => void;
}

export function ConsultaForm({
  open, onOpenChange, pacienteId, pacienteNombre, cita, motivoInicial, onCreated,
}: ConsultaFormProps) {
  const { user } = useAuth();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: camas = [] } = useEnfermeriaCamas();
  const { data: internaciones = [] } = useEnfermeriaIngresos();
  const crear = useCreateConsulta();
  const internar = useIngresarPacienteCama();

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

  // Si la internación se creó y después falló la consulta, no se crea de nuevo.
  const internacionCreada = useRef<number | null>(null);

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieDebounced);

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
      setDestino("alta");
      setReposoHasta("");
      setReposoDias("");
      setCamaId("");
      internacionCreada.current = null;
    }
  }, [open, cita, motivoInicial]);

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

  const handleGuardar = async (opts?: { eImprimirReposo?: boolean }) => {
    if (!pacienteId) return;
    if (!medicoId) { toast.error("Selecciona el médico que atendió."); return; }
    if (cieLista.length === 0 && !diagnostico.trim() && !motivo.trim()) {
      toast.error("Registra al menos un diagnóstico CIE-10, motivo o descripción.");
      return;
    }
    if (cieLista.length === 0) {
      toast.error("Selecciona al menos un diagnóstico CIE-10 (es obligatorio).");
      return;
    }
    if (reposoTipo && reposoHasta && reposoHasta < fecha) {
      toast.error("La fecha 'hasta' del reposo no puede ser anterior a la consulta.");
      return;
    }
    if (destino === "internacion" && !camaId && !internacionCreada.current) {
      toast.error("Elija la cama donde queda internado.");
      return;
    }

    const cieTexto = cieLista.map((c) => `[${c.codigo}] ${c.descripcion}`).join(" / ");
    const diagFinal = diagnostico.trim() ? `${cieTexto} — ${diagnostico.trim()}` : cieTexto;

    try {
      // La internación va primero: es lo único que puede chocar (cama ocupada).
      // Si después falla la consulta, se reintenta sin volver a ocupar la cama.
      if (destino === "internacion" && !internacionCreada.current) {
        const creada = await internar.mutateAsync({
          paciente_id: pacienteId,
          cama_id: Number(camaId),
          medico_id: Number(medicoId),
          ingresado_por: user?.email ?? null,
          fecha_ingreso: fecha,
          hora_ingreso: horaAhora(),
          diagnostico_ingreso: sanitizePlainText(diagFinal) || null,
          cie10_id: cieLista[0]?.id ?? null,
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
        cie10_id: cieLista[0]?.id ?? null,
        diagnostico: sanitizePlainText(diagFinal) || null,
        tratamiento: sanitizeMultilineText(tratamiento) || null,
        destino,
        reposo_tipo: reposoTipo,
        reposo_desde: reposoTipo ? fecha : null,
        reposo_hasta: reposoTipo ? reposoHasta || null : null,
      });

      // Antes de la bifurcación de impresión: cubre los dos caminos.
      onCreated?.(res);

      if (opts?.eImprimirReposo && reposoTipo) {
        const qrSvgHtml = renderToStaticMarkup(
          <QRCodeSVG
            value={cleanQrText([
              "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
              `DOCUMENTO: ${tituloDocumento(destino)}`,
              `Paciente: ${pacienteNombre}`,
              `Desde: ${fecha.split("-").reverse().join("/")} Hasta: ${reposoHasta ? reposoHasta.split("-").reverse().join("/") : "Nueva orden"}`,
              `Dx: ${cieLista.map((c) => c.codigo).join(", ")}`,
              `Medico: Dr(a). ${medicoSeleccionado?.apellidos || ""} ${medicoSeleccionado?.nombres || ""}`,
            ].join("\n"))}
            size={105}
            level="M"
          />
        );

        imprimirCertificadoReposo({
          pacienteNombre,
          pacienteDocumento: String(pacienteId),
          tipoReposo: reposoTipo,
          destino: destino as "sin_servicio" | "enfermo_local" | "reposo_domiciliario" | "internacion",
          fechaDesde: fecha.split("-").reverse().join("/"),
          fechaHasta: reposoHasta ? reposoHasta.split("-").reverse().join("/") : null,
          cieCodigo: cieLista.map((c) => c.codigo).join(", "),
          cieDescripcion: cieLista.map((c) => `${c.codigo}: ${c.descripcion}`).join(" | "),
          diagnosticoDetalle: diagnostico,
          tratamiento,
          medicoNombre: medicoSeleccionado ? `Dr(a). ${medicoSeleccionado.apellidos}, ${medicoSeleccionado.nombres}` : "Profesional Médico",
          consultaId: res.id,
          qrSvgHtml,
        });

        toast.success(`Consulta registrada y ${tituloDocumento(destino)} emitido.`);
        onOpenChange(false);
      } else {
        toast.success(
          destino === "internacion"
            ? "Consulta registrada y paciente internado. Ya aparece en Enfermería."
            : cita ? "Consulta registrada y cita atendida." : "Consulta registrada."
        );
        onOpenChange(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[94vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Registrar consulta — {pacienteNombre}</DialogTitle>
            <DialogDescription className="text-sm">
              {cita
                ? "Al guardar, la cita de la agenda quedará marcada como atendida."
                : "Consulta sin cita previa (se agrega directo a la historia clínica)."}
            </DialogDescription>
          </DialogHeader>

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
                  <Label htmlFor="co-cie" className="font-semibold text-sm">Diagnósticos CIE-10 *</Label>
                  <span className="text-xs text-muted-foreground font-normal">
                    {cieLista.length} seleccionado{cieLista.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="co-cie"
                    className="pl-9 h-10"
                    placeholder="Buscar y seleccionar diagnósticos (ej. Caries, Necrosis)..."
                    value={cieBusqueda}
                    onChange={(e) => setCieBusqueda(e.target.value)}
                  />
                  {cieOpciones.length > 0 && cieBusqueda.trim() && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-52 overflow-y-auto divide-y">
                      {cieOpciones.map((c) => {
                        const yaSeleccionado = cieLista.some((item) => item.id === c.id);
                        return (
                          <button
                            key={c.id}
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

                {/* Lista de Diagnósticos CIE-10 Seleccionados */}
                {cieLista.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cieLista.map((c) => (
                      <Badge
                        key={c.id}
                        variant="outline"
                        className="px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="font-mono font-bold text-blue-950 dark:text-blue-100">{c.codigo}</span>
                        <span className="max-w-[220px] truncate">{c.descripcion}</span>
                        <button
                          type="button"
                          className="ml-1 text-blue-600 hover:text-red-600 font-bold hover:bg-blue-100 dark:hover:bg-blue-900 rounded px-1 text-xs"
                          onClick={() => setCieLista((prev) => prev.filter((item) => item.id !== c.id))}
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
    </>
  );
}
