import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Printer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PeriodontogramaProps {
  pacienteId: string;
}

export function Periodontograma({ pacienteId }: PeriodontogramaProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simular guardado
    setTimeout(() => {
      setIsSaving(false);
      toast.success(`Periodontograma guardado correctamente para el paciente ${pacienteId}.`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Periodontograma
          </h3>
          <p className="text-sm text-muted-foreground">Registro de profundidad de sondaje, sangrado, placa y movilidad.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button onClick={handleSave} size="sm" className="gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Módulo en Desarrollo</h4>
          <p className="text-xs mt-1">
            La interfaz gráfica completa del periodontograma (con representación de todas las caras de la raíz y márgenes gingivales)
            está en fase de integración. Actualmente puede guardar notas periodontales en la evolución clínica.
          </p>
        </div>
      </div>

      {/* Mockup de la tabla de sondaje */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="bg-muted p-3 font-semibold text-sm text-center border-b">
          Arcada Superior (Piezas 18 a 28)
        </div>
        <div className="p-8 text-center text-muted-foreground bg-muted/10 border-b">
          [Gráfico de Dientes Superiores y Tabla de Profundidades]
        </div>
        <div className="bg-muted p-3 font-semibold text-sm text-center border-b">
          Arcada Inferior (Piezas 48 a 38)
        </div>
        <div className="p-8 text-center text-muted-foreground bg-muted/10">
          [Gráfico de Dientes Inferiores y Tabla de Profundidades]
        </div>
      </div>
    </div>
  );
}
