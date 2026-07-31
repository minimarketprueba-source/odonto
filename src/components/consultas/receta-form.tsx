import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Pill } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { PacienteAlertasBanner } from "@/components/consultas/paciente-alertas-banner";
import { fechaHoyISO } from "@/api/citas";
import { useCreateReceta, type RecetaItem } from "@/api/recetas";
import { MEDICAMENTOS_FRECUENTES, type MedicamentoFrecuente } from "@/lib/medicamentos";
import { Combobox } from "@/components/ui/combobox";

interface RecetaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number | null;
  pacienteNombre: string;
}

const ITEM_VACIO: RecetaItem = { medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "" };

/** Selección rápida de medicamentos más recetados */
const SUGERENCIAS_RAPIDAS = [
  "Ibuprofeno 400 mg",
  "Paracetamol 500 mg",
  "Amoxicilina 500 mg",
  "Azitromicina 500 mg",
  "Omeprazol 20 mg",
  "Loratadina 10 mg",
];

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

  const aplicarMedicamentoFrecuente = (i: number, med: MedicamentoFrecuente) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              medicamento: med.nombre,
              dosis: med.dosis,
              frecuencia: med.frecuencia,
              duracion: med.duracion,
              indicaciones: med.indicaciones || item.indicaciones || "",
            }
          : item
      )
    );
  };

  const agregarMedicamentoRapido = (nombreMed: string) => {
    const med = MEDICAMENTOS_FRECUENTES.find((m) => m.nombre === nombreMed);
    if (!med) return;

    // Si el último item está totalmente vacío, lo completa. Si no, agrega un nuevo item.
    setItems((prev) => {
      const ultimo = prev[prev.length - 1];
      if (prev.length === 1 && !ultimo.medicamento.trim()) {
        return [
          {
            medicamento: med.nombre,
            dosis: med.dosis,
            frecuencia: med.frecuencia,
            duracion: med.duracion,
            indicaciones: med.indicaciones || "",
          },
        ];
      }
      return [
        ...prev,
        {
          medicamento: med.nombre,
          dosis: med.dosis,
          frecuencia: med.frecuencia,
          duracion: med.duracion,
          indicaciones: med.indicaciones || "",
        },
      ];
    });
  };

  const handleGuardar = async () => {
    if (!pacienteId) return;
    if (!medicoId) { await showSwalError("Selecciona el médico."); return; }
    const validos = items.filter((i) => i.medicamento.trim());
    if (validos.length === 0) { await showSwalError("Agrega al menos un medicamento."); return; }
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
      onOpenChange(false);
      await showSwalSuccess(
        validos.length === 1
          ? "Receta emitida con 1 medicamento."
          : `Receta emitida con ${validos.length} medicamentos.`
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  const opcionesCatalogos = MEDICAMENTOS_FRECUENTES.map((m) => ({
    value: m.id,
    label: m.nombre,
    detalle: `${m.dosis} · ${m.frecuencia} · ${m.duracion}`,
    buscarPor: m.categoria,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Nueva receta — {pacienteNombre}
          </DialogTitle>
          <DialogDescription>Se numera automáticamente (R-00001, R-00002, ...).</DialogDescription>
        </DialogHeader>

        {/* Banner de alertas clínicas del paciente */}
        <PacienteAlertasBanner pacienteId={pacienteId} className="my-1" />

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

          {/* Accesos rápidos de prescripción */}
          <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              ⚡ Prescripción rápida (1-clic):
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGERENCIAS_RAPIDAS.map((sug) => (
                <Badge
                  key={sug}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1 px-2 text-xs"
                  onClick={() => agregarMedicamentoRapido(sug)}
                >
                  + {sug}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Medicamentos *</Label>
            {items.map((item, i) => {
              const idSeleccionado = MEDICAMENTOS_FRECUENTES.find((m) => m.nombre === item.medicamento)?.id || "";
              return (
                <div key={i} className="p-3 rounded-lg border space-y-2 bg-card">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Selección desde el catálogo predefinido */}
                    <div className="sm:col-span-6">
                      <Combobox
                        opciones={opcionesCatalogos}
                        value={idSeleccionado}
                        onChange={(val) => {
                          const med = MEDICAMENTOS_FRECUENTES.find((m) => m.id === val);
                          if (med) aplicarMedicamentoFrecuente(i, med);
                        }}
                        placeholder="Buscar en catálogo o escribir..."
                        buscarPlaceholder="Buscar por nombre o categoría..."
                        className="h-9"
                      />
                    </div>

                    {/* Edición directa del nombre si se requiere fármaco personalizado */}
                    <div className="sm:col-span-5">
                      <Input
                        placeholder="O nombre del medicamento..."
                        value={item.medicamento}
                        onChange={(e) => setItem(i, "medicamento", e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 h-9 w-9"
                          onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Dosis (ej: 1 comp.)" value={item.dosis ?? ""} onChange={(e) => setItem(i, "dosis", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="Frecuencia (ej: c/8 h)" value={item.frecuencia ?? ""} onChange={(e) => setItem(i, "frecuencia", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="Duración (ej: 5 días)" value={item.duracion ?? ""} onChange={(e) => setItem(i, "duracion", e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 sm:h-8"
              onClick={() => setItems((prev) => [...prev, { ...ITEM_VACIO }])}
            >
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
