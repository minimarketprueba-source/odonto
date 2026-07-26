import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Printer, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { matchTexto } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useMedicosActivos, fechaHoyISO, type Cita } from "@/api/citas";
import { useCreateConsulta, useSearchCie10, type Cie10, type ReposoTipo } from "@/api/consultas";
import { imprimirCertificadoReposo, cleanQrText } from "@/lib/imprimir";

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

interface ConsultaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number | null;
  pacienteNombre: string;
  /** Si viene de la agenda: precarga médico/fecha/motivo y marca la cita como atendida. */
  cita?: Cita | null;
}

export function ConsultaForm({ open, onOpenChange, pacienteId, pacienteNombre, cita }: ConsultaFormProps) {
  const { data: medicos = [] } = useMedicosActivos();
  const crear = useCreateConsulta();

  const [medicoId, setMedicoId] = useState("");
  const [busquedaMedico, setBusquedaMedico] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [motivo, setMotivo] = useState("");
  const [examen, setExamen] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [cieBusqueda, setCieBusqueda] = useState("");
  const [cieSel, setCieSel] = useState<Cie10 | null>(null);
  const [reposoTipo, setReposoTipo] = useState<"none" | ReposoTipo>("none");
  const [reposoHasta, setReposoHasta] = useState("");
  const [reposoDias, setReposoDias] = useState("");

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieSel ? "" : cieDebounced);

  useEffect(() => {
    if (open) {
      setMedicoId(cita ? String(cita.medico_id) : "");
      setBusquedaMedico("");
      setMostrarListaMedicos(false);
      setFecha(cita?.fecha || fechaHoyISO());
      setMotivo(cita?.motivo || "");
      setExamen("");
      setDiagnostico("");
      setTratamiento("");
      setCieBusqueda("");
      setCieSel(null);
      setReposoTipo("none");
      setReposoHasta("");
      setReposoDias("");
    }
  }, [open, cita]);

  const medicosFiltrados = useMemo(() => {
    if (!busquedaMedico.trim()) return medicos;
    return medicos.filter((m) => {
      const target = `${m.apellidos} ${m.nombres} ${m.especialidad?.nombre || ""}`;
      return matchTexto(target, busquedaMedico);
    });
  }, [medicos, busquedaMedico]);

  const medicoSeleccionado = useMemo(
    () => medicos.find((m) => String(m.id) === medicoId) || null,
    [medicos, medicoId]
  );

  const handleGuardar = async (opts?: { eImprimirReposo?: boolean }) => {
    if (!pacienteId) return;
    if (!medicoId) { toast.error("Selecciona el médico que atendió."); return; }
    if (!diagnostico.trim() && !motivo.trim()) {
      toast.error("Registra al menos el motivo o el diagnóstico.");
      return;
    }
    if (!cieSel) {
      toast.error("Selecciona el diagnóstico CIE-10 (es obligatorio para guardar).");
      return;
    }
    if (reposoTipo !== "none" && reposoHasta && reposoHasta < fecha) {
      toast.error("La fecha 'hasta' del reposo no puede ser anterior a la consulta.");
      return;
    }
    try {
      const res = await crear.mutateAsync({
        paciente_id: pacienteId,
        medico_id: Number(medicoId),
        cita_id: cita?.id ?? null,
        fecha,
        motivo_consulta: sanitizePlainText(motivo) || null,
        examen_fisico: sanitizePlainText(examen) || null,
        cie10_id: cieSel?.id ?? null,
        diagnostico: sanitizePlainText(diagnostico) || null,
        tratamiento: sanitizePlainText(tratamiento) || null,
        reposo_tipo: reposoTipo === "none" ? null : reposoTipo,
        reposo_desde: reposoTipo === "none" ? null : fecha,
        reposo_hasta: reposoTipo === "none" ? null : reposoHasta || null,
      });

      if (opts?.eImprimirReposo && reposoTipo !== "none") {
        const qrSvgHtml = renderToStaticMarkup(
          <QRCodeSVG
            value={cleanQrText([
              "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
              `DOCUMENTO: ${reposoTipo === "domiciliario" ? "CERTIFICADO DE REPOSO DOMICILIARIO" : "CONSTANCIA DE ENFERMO LOCAL"}`,
              `Paciente: ${pacienteNombre}`,
              `Desde: ${fecha.split("-").reverse().join("/")} Hasta: ${reposoHasta ? reposoHasta.split("-").reverse().join("/") : "Nueva orden"}`,
              `Dx: ${cieSel?.codigo || ""} ${cieSel?.descripcion || ""}`,
              `Medico: Dr(a). ${medicoSeleccionado?.apellidos || ""} ${medicoSeleccionado?.nombres || ""}`,
            ].join("\n"))}
            size={105}
            level="M"
          />
        );

        imprimirCertificadoReposo({
          pacienteNombre,
          pacienteDocumento: String(pacienteId),
          tipoReposo: reposoTipo as "domiciliario" | "local",
          fechaDesde: fecha.split("-").reverse().join("/"),
          fechaHasta: reposoHasta ? reposoHasta.split("-").reverse().join("/") : null,
          cieCodigo: cieSel?.codigo,
          cieDescripcion: cieSel?.descripcion,
          diagnosticoDetalle: diagnostico,
          tratamiento,
          medicoNombre: medicoSeleccionado ? `Dr(a). ${medicoSeleccionado.apellidos}, ${medicoSeleccionado.nombres}` : "Profesional Médico",
          consultaId: res.id,
          qrSvgHtml,
        });

        toast.success(
          reposoTipo === "domiciliario"
            ? "Consulta registrada y Certificado de Reposo Domiciliario emitido."
            : "Consulta registrada y Constancia de Enfermo Local emitida."
        );
        onOpenChange(false);
      } else {
        toast.success(cita ? "Consulta registrada y cita atendida." : "Consulta registrada.");
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
              <div className="space-y-1.5 relative">
                <Label htmlFor="co-medico" className="font-semibold text-sm">Médico *</Label>
                {medicoSeleccionado ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/30">
                    <span className="text-sm font-medium">
                      {medicoSeleccionado.apellidos}, {medicoSeleccionado.nombres}
                      {medicoSeleccionado.especialidad && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                          {medicoSeleccionado.especialidad.nombre}
                        </Badge>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs"
                      onClick={() => {
                        setMedicoId("");
                        setBusquedaMedico("");
                        setMostrarListaMedicos(true);
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="co-medico"
                      className="pl-9 h-10"
                      placeholder="Buscar por nombre o especialidad..."
                      value={busquedaMedico}
                      onChange={(e) => {
                        setBusquedaMedico(e.target.value);
                        setMostrarListaMedicos(true);
                      }}
                      onFocus={() => setMostrarListaMedicos(true)}
                      onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
                    />
                    {mostrarListaMedicos && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-48 overflow-y-auto divide-y">
                        {medicosFiltrados.length === 0 ? (
                          <p className="p-3 text-xs text-muted-foreground text-center">No se encontraron médicos</p>
                        ) : (
                          medicosFiltrados.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                              onClick={() => {
                                setMedicoId(String(m.id));
                                setMostrarListaMedicos(false);
                              }}
                            >
                              <span className="font-medium">{m.apellidos}, {m.nombres}</span>
                              {m.especialidad && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {m.especialidad.nombre}
                                </Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
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

            {/* Fila 3: CIE-10 y Diagnóstico texto libre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 relative">
                <Label htmlFor="co-cie" className="font-semibold text-sm">Diagnóstico CIE-10 *</Label>
                {cieSel ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/30">
                    <span className="text-sm">
                      <Badge variant="outline" className="mr-2 font-mono font-semibold">{cieSel.codigo}</Badge>
                      {cieSel.descripcion}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setCieSel(null)}>Quitar</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="co-cie"
                        className="pl-9 h-10"
                        placeholder="Buscar por código o descripción..."
                        value={cieBusqueda}
                        onChange={(e) => setCieBusqueda(e.target.value)}
                      />
                    </div>
                    {cieOpciones.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-44 overflow-y-auto divide-y">
                        {cieOpciones.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => setCieSel(c)}
                          >
                            <span className="font-mono font-semibold mr-2">{c.codigo}</span>
                            {c.descripcion}
                          </button>
                        ))}
                      </div>
                    )}
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

            {/* Sección de Reposo */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="co-reposo" className="font-semibold text-sm">Reposo (actividad física)</Label>
                  <Select value={reposoTipo} onValueChange={(v) => setReposoTipo(v as "none" | ReposoTipo)}>
                    <SelectTrigger id="co-reposo" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin reposo (apto)</SelectItem>
                      <SelectItem value="local">Enfermo local (en la unidad)</SelectItem>
                      <SelectItem value="domiciliario">Reposo domiciliario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reposoTipo !== "none" && (
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

              {reposoTipo !== "none" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900">
                  <div className="flex items-start gap-2.5 text-red-900 dark:text-red-200">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">
                        {reposoTipo === "domiciliario"
                          ? "Certificado de Reposo Domiciliario"
                          : "Constancia de Enfermo Local (en la Unidad)"}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                        Al guardar, se emitirá el documento oficial impreso con Código QR de Verificación Digital.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 gap-1.5 font-semibold text-xs text-red-800 border-red-300 bg-white hover:bg-red-100 dark:bg-red-900 dark:text-red-100 shrink-0"
                    onClick={() => handleGuardar({ eImprimirReposo: true })}
                    disabled={crear.isPending}
                  >
                    <Printer className="w-4 h-4" />
                    {reposoTipo === "domiciliario" ? "Guardar e Imprimir Reposo Domiciliario" : "Guardar e Imprimir Enfermo Local"}
                  </Button>
                </div>
              )}
            </div>

            <Button onClick={() => handleGuardar()} disabled={crear.isPending} className="w-full h-11 font-semibold text-base mt-2">
              {crear.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar consulta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
