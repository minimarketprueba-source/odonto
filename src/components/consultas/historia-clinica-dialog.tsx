import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope, FileText } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useConsultasPaciente } from "@/api/consultas";
import { useRecetasPaciente } from "@/api/recetas";
import type { Paciente } from "@/api/pacientes";
import { ConsultaForm } from "./consulta-form";
import { RecetaForm } from "./receta-form";

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
  const { hasPermission, canView } = usePermissions();
  const puedeRegistrar = hasPermission("consultas", "editar");
  const puedeRecetar = hasPermission("recetas", "editar");
  const veRecetas = canView("recetas");
  const { data: consultas = [], isLoading } = useConsultasPaciente(open ? (paciente?.id ?? null) : null);
  const { data: recetas = [] } = useRecetasPaciente(open && veRecetas ? (paciente?.id ?? null) : null);
  const [formOpen, setFormOpen] = useState(false);
  const [recetaOpen, setRecetaOpen] = useState(false);

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

          <Tabs defaultValue="consultas" className="flex-1 flex flex-col min-h-0">
            <TabsList className={`grid w-full ${veRecetas ? "grid-cols-2" : "grid-cols-1"}`}>
              <TabsTrigger value="consultas">Consultas ({consultas.length})</TabsTrigger>
              {veRecetas && <TabsTrigger value="recetas">Recetas ({recetas.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="consultas" className="flex-1 overflow-y-auto space-y-2 py-2">
              {puedeRegistrar && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setFormOpen(true)}>
                  <Plus className="w-4 h-4" /> Registrar consulta (sin cita)
                </Button>
              )}
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
            </TabsContent>

            {veRecetas && (
              <TabsContent value="recetas" className="flex-1 overflow-y-auto space-y-2 py-2">
                {puedeRecetar && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setRecetaOpen(true)}>
                    <Plus className="w-4 h-4" /> Nueva receta
                  </Button>
                )}
                {recetas.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">Sin recetas emitidas.</p>
                ) : (
                  recetas.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm font-semibold">{r.numero}</span>
                        <span className="text-sm">{fmtFecha(r.fecha)}</span>
                        {r.diagnostico && <Badge variant="outline">{r.diagnostico}</Badge>}
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {(r.items ?? []).map((i, idx) => (
                          <li key={i.id ?? idx} className="text-sm">
                            • {i.medicamento}
                            <span className="text-muted-foreground">
                              {[i.dosis, i.frecuencia, i.duracion].filter(Boolean).length > 0
                                ? ` — ${[i.dosis, i.frecuencia, i.duracion].filter(Boolean).join(", ")}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {r.indicaciones && (
                        <p className="text-xs text-muted-foreground mt-1">Indicaciones: {r.indicaciones}</p>
                      )}
                      {r.medico && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Dr(a). {r.medico.apellidos}, {r.medico.nombres}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConsultaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        pacienteId={paciente?.id ?? null}
        pacienteNombre={nombre}
      />
      <RecetaForm
        open={recetaOpen}
        onOpenChange={setRecetaOpen}
        pacienteId={paciente?.id ?? null}
        pacienteNombre={nombre}
      />
    </>
  );
}
