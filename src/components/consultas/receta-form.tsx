import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { matchTexto } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { useMedicosActivos, fechaHoyISO } from "@/api/citas";
import { useCreateReceta, type RecetaItem } from "@/api/recetas";

interface RecetaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number | null;
  pacienteNombre: string;
}

const ITEM_VACIO: RecetaItem = { medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "" };

export function RecetaForm({ open, onOpenChange, pacienteId, pacienteNombre }: RecetaFormProps) {
  const { data: medicos = [] } = useMedicosActivos();
  const crear = useCreateReceta();

  const [medicoId, setMedicoId] = useState("");
  const [busquedaMedico, setBusquedaMedico] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [items, setItems] = useState<RecetaItem[]>([{ ...ITEM_VACIO }]);

  useEffect(() => {
    if (open) {
      setMedicoId("");
      setBusquedaMedico("");
      setMostrarListaMedicos(false);
      setFecha(fechaHoyISO());
      setDiagnostico("");
      setIndicaciones("");
      setItems([{ ...ITEM_VACIO }]);
    }
  }, [open]);

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
        indicaciones: sanitizePlainText(indicaciones) || null,
        items: validos.map((i) => ({
          medicamento: sanitizePlainText(i.medicamento),
          dosis: sanitizePlainText(i.dosis || "") || null,
          frecuencia: sanitizePlainText(i.frecuencia || "") || null,
          duracion: sanitizePlainText(i.duracion || "") || null,
          indicaciones: sanitizePlainText(i.indicaciones || "") || null,
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
            <div className="space-y-1 relative">
              <Label htmlFor="rc-medico">Médico *</Label>
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
                    id="rc-medico"
                    className="pl-9"
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
