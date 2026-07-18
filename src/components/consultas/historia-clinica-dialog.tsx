import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useConsultasPaciente } from "@/api/consultas";
import type { Paciente } from "@/api/pacientes";
import { ConsultaForm } from "./consulta-form";

interface HistoriaClinicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
}

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

export function HistoriaClinicaDialog({ open, onOpenChange, paciente }: HistoriaClinicaDialogProps) {
  const { hasPermission } = usePermissions();
  const puedeRegistrar = hasPermission("consultas", "editar");
  const { data: consultas = [], isLoading } = useConsultasPaciente(open ? (paciente?.id ?? null) : null);
  const [formOpen, setFormOpen] = useState(false);

  const nombre = paciente ? `${paciente.apellidos}, ${paciente.nombres}` : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Historia clínica — {nombre}
            </DialogTitle>
            <DialogDescription>
              CI {paciente?.documento} · {consultas.length} consulta{consultas.length !== 1 ? "s" : ""} registrada{consultas.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          {puedeRegistrar && (
            <Button variant="outline" className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" /> Registrar consulta (sin cita)
            </Button>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-6">Cargando historia clínica...</p>
            ) : consultas.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Sin consultas registradas todavía.
              </p>
            ) : (
              consultas.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{fmtFecha(c.fecha)}</span>
                    {c.medico?.especialidad && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/40 dark:text-blue-200">
                        {c.medico.especialidad.nombre}
                      </Badge>
                    )}
                    {c.cie10 && <Badge variant="outline">{c.cie10.codigo}</Badge>}
                  </div>
                  {c.motivo_consulta && (
                    <p className="text-sm mt-1"><span className="text-muted-foreground">Motivo: </span>{c.motivo_consulta}</p>
                  )}
                  {c.examen_fisico && (
                    <p className="text-sm"><span className="text-muted-foreground">Examen: </span>{c.examen_fisico}</p>
                  )}
                  {c.diagnostico && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Diagnóstico: </span>
                      {c.diagnostico}{c.cie10 ? ` (${c.cie10.descripcion})` : ""}
                    </p>
                  )}
                  {c.tratamiento && (
                    <p className="text-sm whitespace-pre-wrap"><span className="text-muted-foreground">Tratamiento: </span>{c.tratamiento}</p>
                  )}
                  {c.medico && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Atendió: Dr(a). {c.medico.apellidos}, {c.medico.nombres}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConsultaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        pacienteId={paciente?.id ?? null}
        pacienteNombre={nombre}
      />
    </>
  );
}
