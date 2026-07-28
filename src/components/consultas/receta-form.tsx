import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { fechaHoyISO } from "@/api/citas";
import { useCreateReceta, type RecetaItem } from "@/api/recetas";

interface RecetaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number | null;
  pacienteNombre: string;
}

const ITEM_VACIO: RecetaItem = { medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "" };

export function RecetaForm({ open, onOpenChange, pacienteId, pacienteNombre }: RecetaFormProps) {
  const crear = useCreateReceta();

  const [medicoId, setMedicoId] = useState("");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [items, setItems] = useState<RecetaItem[]>([{ ...ITEM_VACIO }]);

  useEffect(() => {
    if (open) {
      setMedicoId("");
      setFecha(fechaHoyISO());
      setDiagnostico("");
      setIndicaciones("");
      setItems([{ ...ITEM_VACIO }]);
    }
  }, [open]);

  const setItem = (i: number, campo: keyof RecetaItem, valor: string) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [campo]: valor } : item)));

  const handleGuardar = async () => {
    if (!pacienteId) return;
    if (!medicoId) { toast.error("Selecciona el médico."); return; }
    const validos = items.filter((i) => i.medicamento.trim());
    if (validos.length === 0) { toast.error("Agrega al menos un medicamento."); return; }
    try {
      await crear.mutateAsync({
        paciente_id: pacienteId,
        medico_id: Number(medicoId),
        fecha,
        diagnostico: sanitizePlainText(diagnostico) || null,
        indicaciones: sanitizeMultilineText(indicaciones) || null,
        items: validos.map((i) => ({
          medicamento: sanitizePlainText(i.medicamento),
          dosis: sanitizePlainText(i.dosis || "") || null,
          frecuencia: sanitizePlainText(i.frecuencia || "") || null,
          duracion: sanitizePlainText(i.duracion || "") || null,
          indicaciones: sanitizeMultilineText(i.indicaciones || "") || null,
        })),
      });
      toast.success("Receta emitida.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva receta — {pacienteNombre}</DialogTitle>
          <DialogDescription>Se numera automáticamente (R-00001, R-00002, ...).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rc-medico">Médico *</Label>
              <MedicoSelector id="rc-medico" value={medicoId} onChange={setMedicoId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rc-fecha">Fecha *</Label>
              <Input id="rc-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rc-dx">Diagnóstico</Label>
            <Input id="rc-dx" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Medicamentos *</Label>
            {items.map((item, i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Medicamento (ej: Ibuprofeno 400 mg)"
                    value={item.medicamento}
                    onChange={(e) => setItem(i, "medicamento", e.target.value)}
                  />
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-red-500 flex-shrink-0"
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Dosis (1 comp.)" value={item.dosis ?? ""} onChange={(e) => setItem(i, "dosis", e.target.value)} />
                  <Input placeholder="Frecuencia (c/8 h)" value={item.frecuencia ?? ""} onChange={(e) => setItem(i, "frecuencia", e.target.value)} />
                  <Input placeholder="Duración (5 días)" value={item.duracion ?? ""} onChange={(e) => setItem(i, "duracion", e.target.value)} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => setItems((prev) => [...prev, { ...ITEM_VACIO }])}>
              <Plus className="w-4 h-4" /> Agregar medicamento
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rc-ind">Indicaciones generales</Label>
            <Textarea id="rc-ind" rows={2} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
          </div>

          <Button onClick={handleGuardar} disabled={crear.isPending} className="w-full">
            {crear.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Emitiendo...</>
              : "Emitir receta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
