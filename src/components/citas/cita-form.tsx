import { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { matchPaciente } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { usePacientes, type Paciente } from "@/api/pacientes";
import { useMedicosActivos, useCreateCita, fechaHoyISO } from "@/api/citas";
import { useAusencias, useHorarios, evaluarDisponibilidad } from "@/api/horarios";

interface CitaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaInicial?: string;
}

export function CitaForm({ open, onOpenChange, fechaInicial }: CitaFormProps) {
  const { user } = useAuth();
  const { data: pacientes = [] } = usePacientes();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: horarios = [] } = useHorarios();
  const { data: ausencias = [] } = useAusencias();
  const crear = useCreateCita();

  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [medicoId, setMedicoId] = useState("");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [hora, setHora] = useState("08:00");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) {
      setBusquedaPaciente("");
      setPaciente(null);
      setMedicoId("");
      setFecha(fechaInicial || fechaHoyISO());
      setHora("08:00");
      setMotivo("");
    }
  }, [open, fechaInicial]);

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

  const handleAgendar = async () => {
    if (!paciente) { toast.error("Selecciona el paciente."); return; }
    if (!medicoId) { toast.error("Selecciona el médico."); return; }
    if (!fecha || !hora) { toast.error("Indica fecha y hora."); return; }
    try {
      await crear.mutateAsync({
        paciente_id: paciente.id,
        medico_id: Number(medicoId),
        fecha,
        hora,
        motivo: sanitizePlainText(motivo) || null,
        agendado_por: user?.email ?? null,
      });
      toast.success("Cita agendada.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar cita</DialogTitle>
          <DialogDescription>La cita se crea en estado «Pendiente».</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="c-paciente">Paciente *</Label>
            {paciente ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                <span className="text-sm">
                  {paciente.apellidos}, {paciente.nombres}
                  <span className="text-muted-foreground"> · CI {paciente.documento}</span>
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
                        <span className="text-muted-foreground"> · CI {p.documento}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="c-medico">Médico *</Label>
            <Select value={medicoId} onValueChange={setMedicoId}>
              <SelectTrigger id="c-medico"><SelectValue placeholder="Selecciona un médico" /></SelectTrigger>
              <SelectContent>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.apellidos}, {m.nombres}
                    {m.especialidad ? ` — ${m.especialidad.nombre}` : ""}
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
            <Label htmlFor="c-motivo">Motivo</Label>
            <Input id="c-motivo" placeholder="Ej: Control, dolor lumbar..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <Button onClick={handleAgendar} disabled={crear.isPending} className="w-full">
            {crear.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agendando...</>
              : "Agendar cita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
