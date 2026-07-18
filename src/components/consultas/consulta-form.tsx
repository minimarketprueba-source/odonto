import { useEffect, useState } from "react";
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
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useMedicosActivos, fechaHoyISO, type Cita } from "@/api/citas";
import { useCreateConsulta, useSearchCie10, type Cie10 } from "@/api/consultas";

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
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [motivo, setMotivo] = useState("");
  const [examen, setExamen] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [cieBusqueda, setCieBusqueda] = useState("");
  const [cieSel, setCieSel] = useState<Cie10 | null>(null);

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieSel ? "" : cieDebounced);

  useEffect(() => {
    if (open) {
      setMedicoId(cita ? String(cita.medico_id) : "");
      setFecha(cita?.fecha || fechaHoyISO());
      setMotivo(cita?.motivo || "");
      setExamen("");
      setDiagnostico("");
      setTratamiento("");
      setCieBusqueda("");
      setCieSel(null);
    }
  }, [open, cita]);

  const handleGuardar = async () => {
    if (!pacienteId) return;
    if (!medicoId) { toast.error("Selecciona el médico que atendió."); return; }
    if (!diagnostico.trim() && !motivo.trim()) {
      toast.error("Registra al menos el motivo o el diagnóstico.");
      return;
    }
    try {
      await crear.mutateAsync({
        paciente_id: pacienteId,
        medico_id: Number(medicoId),
        cita_id: cita?.id ?? null,
        fecha,
        motivo_consulta: sanitizePlainText(motivo) || null,
        examen_fisico: sanitizePlainText(examen) || null,
        cie10_id: cieSel?.id ?? null,
        diagnostico: sanitizePlainText(diagnostico) || null,
        tratamiento: sanitizePlainText(tratamiento) || null,
      });
      toast.success(cita ? "Consulta registrada y cita atendida." : "Consulta registrada.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar consulta — {pacienteNombre}</DialogTitle>
          <DialogDescription>
            {cita
              ? "Al guardar, la cita de la agenda quedará marcada como atendida."
              : "Consulta sin cita previa (se agrega directo a la historia clínica)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="co-medico">Médico *</Label>
              <Select value={medicoId} onValueChange={setMedicoId}>
                <SelectTrigger id="co-medico"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.apellidos}, {m.nombres}{m.especialidad ? ` — ${m.especialidad.nombre}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="co-fecha">Fecha *</Label>
              <Input id="co-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="co-motivo">Motivo de consulta</Label>
            <Input id="co-motivo" placeholder="Ej: Dolor lumbar de 3 días" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="co-examen">Examen físico</Label>
            <Textarea id="co-examen" rows={2} value={examen} onChange={(e) => setExamen(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="co-cie">Código CIE-10 (opcional)</Label>
            {cieSel ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                <span className="text-sm">
                  <Badge variant="outline" className="mr-2">{cieSel.codigo}</Badge>
                  {cieSel.descripcion}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCieSel(null)}>Quitar</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="co-cie"
                    className="pl-9"
                    placeholder="Buscar por código o descripción..."
                    value={cieBusqueda}
                    onChange={(e) => setCieBusqueda(e.target.value)}
                  />
                </div>
                {cieOpciones.length > 0 && (
                  <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
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
              </>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="co-diagnostico">Diagnóstico</Label>
            <Input id="co-diagnostico" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="co-tratamiento">Tratamiento / indicaciones</Label>
            <Textarea id="co-tratamiento" rows={3} value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />
          </div>

          <Button onClick={handleGuardar} disabled={crear.isPending} className="w-full">
            {crear.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              : "Registrar consulta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
