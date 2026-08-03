import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReprogramarCita, type Cita } from "@/api/citas";

interface ReagendarDialogProps {
  cita: Cita | null;
  onOpenChange: (open: boolean) => void;
}

export function ReagendarDialog({ cita, onOpenChange }: ReagendarDialogProps) {
  const reprogramar = useReprogramarCita();
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  useEffect(() => {
    if (cita) {
      setFecha(cita.fecha);
      setHora((cita.hora || "08:00").slice(0, 5));
    }
  }, [cita]);

  const handleGuardar = async () => {
    if (!cita) return;
    if (!fecha || !hora) { toast.error("Indica la nueva fecha y hora."); return; }
    try {
      await reprogramar.mutateAsync({ id: cita.id, fecha, hora });
      toast.success("Cita reagendada. Queda en estado «Pendiente».");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={!!cita} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reagendar cita</DialogTitle>
          <DialogDescription>
            {cita?.paciente
              ? `${cita.paciente.apellidos}, ${cita.paciente.nombres} — con ${cita?.medico ? `${cita.medico.apellidos}, ${cita.medico.nombres}` : "el profesional"}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="r-fecha">Nueva fecha *</Label>
            <Input id="r-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r-hora">Nueva hora *</Label>
            <Input id="r-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleGuardar} disabled={reprogramar.isPending} className="w-full">
          {reprogramar.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            : "Reagendar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
