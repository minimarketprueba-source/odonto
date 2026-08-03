import { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Search, UserPlus, Clock } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { matchPaciente, matchTexto } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { labelTipoPaciente, usePacientes, type Paciente } from "@/api/pacientes";
import { useMedicosActivos, useCreateCita, fechaHoyISO } from "@/api/citas";
import { useAusencias, useHorarios, evaluarDisponibilidad } from "@/api/horarios";
import { useOdontoPrecios } from "@/api/odontologia";
import { useSillones } from "@/api/sillones";

interface CitaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaInicial?: string;
}

export function CitaForm({ open, onOpenChange, fechaInicial }: CitaFormProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const puedeCrearPaciente = hasPermission("pacientes", "editar");
  const [altaPacienteOpen, setAltaPacienteOpen] = useState(false);
  const { data: pacientes = [] } = usePacientes();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: horarios = [] } = useHorarios();
  const { data: ausencias = [] } = useAusencias();
  const { data: precios = [] } = useOdontoPrecios();
  const { data: sillones = [] } = useSillones();
  const crear = useCreateCita();

  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [medicoId, setMedicoId] = useState("");
  const [busquedaMedico, setBusquedaMedico] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [fecha, setFecha] = useState(fechaInicial || fechaHoyISO());
  const [hora, setHora] = useState("08:00");
  const [tratamientoId, setTratamientoId] = useState("");
  const [sillonId, setSillonId] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) {
      setBusquedaPaciente("");
      setPaciente(null);
      setMedicoId("");
      setBusquedaMedico("");
      setMostrarListaMedicos(false);
      setFecha(fechaInicial || fechaHoyISO());
      setHora("08:00");
      setTratamientoId("");
      setSillonId("");
      setMotivo("");
    }
  }, [open, fechaInicial]);

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

  const sugerencias = useMemo(() => {
    if (!busquedaPaciente.trim() || busquedaPaciente.trim().length < 2) return [];
    return pacientes
      .filter((p) => p.activo)
      .filter((p) => matchPaciente(p, busquedaPaciente))
      .slice(0, 6);
  }, [pacientes, busquedaPaciente]);

  const disponibilidad = useMemo(() => {
    if (!medicoId || !fecha || !hora) return null;
    return evaluarDisponibilidad(Number(medicoId), fecha, hora, horarios, ausencias);
  }, [medicoId, fecha, hora, horarios, ausencias]);

  // Duración dinámica estimada basada en el tipo de tratamiento
  const duracionEstimada = useMemo(() => {
    if (!tratamientoId) return 30; // default 30 min
    const selected = precios.find((p) => String(p.id) === tratamientoId);
    if (!selected) return 30;

    const nombre = selected.nombre.toLowerCase();
    if (nombre.includes("limpieza") || nombre.includes("profilaxis") || nombre.includes("consulta")) {
      return 30;
    }
    if (nombre.includes("empaste") || nombre.includes("resina") || nombre.includes("corona") || nombre.includes("perno")) {
      return 60;
    }
    if (nombre.includes("endodoncia") || nombre.includes("molar") || nombre.includes("cirugía")) {
      return 90;
    }
    if (nombre.includes("implante")) {
      return 120; // 2 horas
    }
    return 45; // default general
  }, [tratamientoId, precios]);

  const handleAgendar = async () => {
    if (!paciente) { await showSwalError("Selecciona el paciente."); return; }
    if (!medicoId) { await showSwalError("Selecciona el odontólogo."); return; }
    if (!fecha || !hora) { await showSwalError("Indica fecha y hora."); return; }
    if (!tratamientoId) { await showSwalError("Selecciona un tratamiento para establecer la duración."); return; }

    const selectedPre = precios.find((p) => String(p.id) === tratamientoId);
    const nombreTratamiento = selectedPre ? selectedPre.nombre : "Consulta";
    const motivoFinal = motivo
      ? `${nombreTratamiento} - ${sanitizePlainText(motivo)} (${duracionEstimada} min)`
      : `${nombreTratamiento} (${duracionEstimada} min)`;

    try {
      await crear.mutateAsync({
        paciente_id: paciente.id,
        medico_id: Number(medicoId),
        fecha,
        hora,
        motivo: motivoFinal,
        agendado_por: user?.email ?? null,
        sillon_id: sillonId && sillonId !== "none" ? Number(sillonId) : null,
      });
      onOpenChange(false);
      await showSwalSuccess(
        `Cita agendada para ${paciente.apellidos}, ${paciente.nombres} — ` +
          `${fecha.split("-").reverse().join("/")} a las ${hora} hs. (Duración: ${duracionEstimada} min)`
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Cita Odontológica</DialogTitle>
          <DialogDescription>Establezca una cita. La duración se adaptará al tratamiento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Paciente */}
          <div className="space-y-1">
            <Label htmlFor="c-paciente">Paciente *</Label>
            {paciente ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                <span className="text-sm">
                  {paciente.apellidos}, {paciente.nombres}
                  <span className="text-muted-foreground"> · CI {paciente.documento || "sin cédula"}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setPaciente(null)}>Cambiar</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="c-paciente"
                    className="pl-9"
                    placeholder="Buscar por nombre o CI (mín. 2 letras)..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                  />
                </div>
                {sugerencias.length > 0 && (
                  <div className="rounded-md border divide-y">
                    {sugerencias.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setPaciente(p)}
                      >
                        {p.apellidos}, {p.nombres}
                        <span className="text-muted-foreground">
                          {" "}· CI {p.documento || "sin cédula"} · {labelTipoPaciente(p.tipo)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {busquedaPaciente.trim().length >= 2 && sugerencias.length === 0 && (
                  <div className="rounded-md border border-dashed p-3 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No hay ningún paciente con «{busquedaPaciente.trim()}».
                    </p>
                    {puedeCrearPaciente && (
                      <Button variant="outline" size="sm" className="gap-1.5"
                        onClick={() => setAltaPacienteOpen(true)}>
                        <UserPlus className="w-4 h-4" /> Registrar paciente nuevo
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Odontólogo */}
          <div className="space-y-1 relative">
            <Label htmlFor="c-medico">Odontólogo / Profesional *</Label>
            {medicoSeleccionado ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
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
                  className="h-9 text-xs"
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
                  id="c-medico"
                  className="pl-9"
                  placeholder="Buscar odontólogo por nombre..."
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
                      <p className="p-3 text-xs text-muted-foreground text-center">No se encontraron profesionales</p>
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

          {/* Tratamiento / Duración */}
          <div className="space-y-1">
            <Label htmlFor="c-tratamiento">Tratamiento Clínico (Establece Duración) *</Label>
            <Select value={tratamientoId} onValueChange={setTratamientoId}>
              <SelectTrigger id="c-tratamiento" className="bg-background">
                <SelectValue placeholder="Seleccione tratamiento..." />
              </SelectTrigger>
              <SelectContent>
                {precios.filter(pr => pr.activo).map((pr) => (
                  <SelectItem key={pr.id} value={String(pr.id)}>
                    {pr.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tratamientoId && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Duración estimada del turno: {duracionEstimada} minutos.</span>
              </div>
            )}
          </div>

          {/* Sillón Dental */}
          <div className="space-y-1">
            <Label htmlFor="c-sillon">Sillón Dental (Opcional)</Label>
            <Select value={sillonId} onValueChange={setSillonId}>
              <SelectTrigger id="c-sillon" className="bg-background">
                <SelectValue placeholder="Asignar sillón..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {sillones.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                      {s.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="c-fecha">Fecha *</Label>
              <Input id="c-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-hora">Hora *</Label>
              <Input id="c-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          {disponibilidad?.ausencia && (
            <div className="flex items-start gap-2 p-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>El profesional está ausente en esa fecha ({disponibilidad.ausencia}). Puede agendar igual, pero verifique.</span>
            </div>
          )}
          {!disponibilidad?.ausencia && disponibilidad?.fueraDeHorario && (
            <div className="flex items-start gap-2 p-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Esa fecha/hora cae fuera del horario de atención del profesional. Puede agendar igual, pero verifique.</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="c-motivo">Notas / Comentarios adicionales</Label>
            <Input id="c-motivo" placeholder="Ej: Dolor agudo, primer control..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <Button onClick={handleAgendar} disabled={crear.isPending} className="w-full">
            {crear.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agendando...</>
              : "Agendar cita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Alta rápida cuando el paciente todavía no está en el padrón. */}
    <PacienteForm
      open={altaPacienteOpen}
      onOpenChange={setAltaPacienteOpen}
      busquedaInicial={busquedaPaciente}
      onCreated={(nuevo) => { setPaciente(nuevo); setBusquedaPaciente(""); }}
    />
    </>
  );
}
