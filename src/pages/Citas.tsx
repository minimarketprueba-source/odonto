import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, CheckCircle2, Stethoscope, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/context/auth-context";
import { CitaForm } from "@/components/citas/cita-form";
import { ConsultaForm } from "@/components/consultas/consulta-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ESTADOS_CITA, fechaHoyISO, useCambiarEstadoCita, useCitasDelDia, useMiMedico,
  type Cita, type EstadoCita,
} from "@/api/citas";

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  confirmada: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  atendida: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tituloFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function Citas() {
  const { hasPermission, isMedico } = usePermissions();
  const { user } = useAuth();
  const canEdit = hasPermission("citas", "editar");
  const atiendeConsultas = hasPermission("consultas", "editar");

  const [fecha, setFecha] = useState(fechaHoyISO());
  const [formOpen, setFormOpen] = useState(false);
  const [consultaCita, setConsultaCita] = useState<Cita | null>(null);
  const [soloMias, setSoloMias] = useState(isMedico);

  const { data: todasLasCitas = [], isLoading } = useCitasDelDia(fecha);
  const { data: miMedico } = useMiMedico(user?.id);
  const cambiarEstado = useCambiarEstadoCita();

  const citas = soloMias && miMedico
    ? todasLasCitas.filter((c) => c.medico_id === miMedico.id)
    : todasLasCitas;

  const handleEstado = async (cita: Cita, estado: EstadoCita) => {
    try {
      await cambiarEstado.mutateAsync({ id: cita.id, estado });
      toast.success(`Cita ${ESTADOS_CITA.find((e) => e.value === estado)?.label.toLowerCase()}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resumen = ESTADOS_CITA.map((e) => ({
    ...e,
    total: citas.filter((c) => c.estado === e.value).length,
  }));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Agenda del día
            </h2>
            <p className="text-sm text-muted-foreground capitalize">{tituloFecha(fecha)}</p>
          </div>
          {canEdit && (
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" /> Agendar cita
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input type="date" className="w-44" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFecha(fechaHoyISO())}>Hoy</Button>
          {miMedico && (
            <div className="flex items-center gap-2 ml-auto">
              <Switch id="solo-mias" checked={soloMias} onCheckedChange={setSoloMias} />
              <Label htmlFor="solo-mias" className="text-sm">Solo mis citas</Label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {resumen.map((e) => (
            <div key={e.value} className="p-2 rounded-lg border bg-muted/30 text-center">
              <div className="text-xl font-bold">{e.total}</div>
              <div className="text-xs text-muted-foreground">{e.label}s</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Cargando agenda...</p>
        ) : citas.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Sin citas para este día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {citas.map((c) => (
              <div key={c.id} className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="font-mono text-sm font-semibold w-14 flex-shrink-0">
                  {(c.hora || "").slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : `Paciente #${c.paciente_id}`}
                    {c.paciente && <span className="text-muted-foreground font-normal"> · CI {c.paciente.documento}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : `Médico #${c.medico_id}`}
                    {c.medico?.especialidad ? ` — ${c.medico.especialidad.nombre}` : ""}
                    {c.motivo ? ` · ${c.motivo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`border-0 ${COLOR_ESTADO[c.estado] || ""}`}>
                    {ESTADOS_CITA.find((e) => e.value === c.estado)?.label ?? c.estado}
                  </Badge>
                  {canEdit && c.estado === "pendiente" && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEstado(c, "confirmada")}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                    </Button>
                  )}
                  {canEdit && (c.estado === "pendiente" || c.estado === "confirmada") && (
                    <>
                      <Button
                        variant="outline" size="sm" className="gap-1"
                        onClick={() => atiendeConsultas ? setConsultaCita(c) : handleEstado(c, "atendida")}
                        title={atiendeConsultas ? "Registrar consulta y marcar atendida" : "Marcar atendida"}
                      >
                        <Stethoscope className="w-3.5 h-3.5" /> Atender
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-500 hover:text-red-600 gap-1"
                        onClick={() => handleEstado(c, "cancelada")}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CitaForm open={formOpen} onOpenChange={setFormOpen} fechaInicial={fecha} />
      <ConsultaForm
        open={!!consultaCita}
        onOpenChange={(abierto) => { if (!abierto) setConsultaCita(null); }}
        pacienteId={consultaCita?.paciente_id ?? null}
        pacienteNombre={consultaCita?.paciente ? `${consultaCita.paciente.apellidos}, ${consultaCita.paciente.nombres}` : ""}
        cita={consultaCita}
      />
    </AppLayout>
  );
}
