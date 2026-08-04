import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEvoluciones, useCreateEvolucion } from "@/api/evoluciones";
import { useAuth } from "@/context/auth-context";
import { useMiMedico } from "@/api/citas";
import { Loader2, Plus, FileText, User } from "lucide-react";
import { toast } from "sonner";

interface EvolucionClinicaProps {
  pacienteId: string;
}

export function EvolucionClinica({ pacienteId }: EvolucionClinicaProps) {
  const { user } = useAuth();
  const { data: miMedico } = useMiMedico(user?.id);
  const { data: evoluciones = [], isLoading } = useEvoluciones(pacienteId);
  const createEvolucion = useCreateEvolucion();

  const [isAdding, setIsAdding] = useState(false);
  const [pieza, setPieza] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [nota, setNota] = useState("");

  const handleSave = async () => {
    if (!nota.trim()) {
      toast.error("La nota clínica no puede estar vacía.");
      return;
    }
    try {
      await createEvolucion.mutateAsync({
        paciente_id: pacienteId,
        medico_id: miMedico?.id || null,
        pieza: pieza.trim() || null,
        procedimiento: procedimiento.trim() || null,
        nota_clinica: nota.trim(),
        registrado_por: user?.id,
      });
      toast.success("Evolución registrada exitosamente.");
      setIsAdding(false);
      setPieza("");
      setProcedimiento("");
      setNota("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Historial de Evolución
        </h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Nota
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-sm">Registrar nueva evolución</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Pieza Dental (Opcional)</Label>
              <Input placeholder="Ej: 14" value={pieza} onChange={(e) => setPieza(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Procedimiento (Opcional)</Label>
              <Input placeholder="Ej: Profilaxis" value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nota Clínica *</Label>
            <Textarea
              placeholder="Describa los hallazgos, tratamiento realizado y plan a seguir..."
              className="min-h-[100px]"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createEvolucion.isPending}>
              {createEvolucion.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Guardar Registro"}
            </Button>
          </div>
        </div>
      )}

      <div className="relative border-l-2 border-muted ml-3 pl-6 space-y-8 mt-6 pb-6">
        {evoluciones.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay notas clínicas registradas.</p>
        ) : (
          evoluciones.map((ev) => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-[35px] bg-primary rounded-full p-1 border-4 border-background">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <div className="bg-card border rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-sm">
                      {new Date(ev.fecha_registro).toLocaleDateString("es-ES", {
                        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                    {(ev.pieza || ev.procedimiento) && (
                      <div className="flex gap-1.5">
                        {ev.pieza && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">Pieza {ev.pieza}</span>}
                        {ev.procedimiento && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-200">{ev.procedimiento}</span>}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-foreground whitespace-pre-wrap mt-2 bg-muted/20 p-3 rounded-lg border">
                  {ev.nota_clinica}
                </div>
                
                <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground mt-2 border-t">
                  <User className="w-3.5 h-3.5" />
                  <span>
                    Atendido por: {ev.medico ? `Dr(a). ${ev.medico.apellidos} (${ev.medico.especialidad?.nombre || "Odontología"})` : "Personal de Clínica"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
