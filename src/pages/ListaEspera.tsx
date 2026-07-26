import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Plus, Search, Megaphone, CheckCircle2, XCircle, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { matchPaciente } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { usePermissions } from "@/hooks/use-permissions";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { labelTipoPaciente, usePacientes, type Paciente } from "@/api/pacientes";
import { useEspecialidades } from "@/api/mantenimiento";
import {
  PRIORIDADES, ESTADOS_ESPERA, useListaEspera, useCreateRegistroEspera, useCambiarEstadoEspera,
  type EstadoEspera, type PrioridadEspera,
} from "@/api/lista-espera";

const COLOR_PRIORIDAD: Record<string, string> = {
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  baja: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export default function ListaEspera() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("lista_espera", "editar");
  const puedeCrearPaciente = hasPermission("pacientes", "editar");

  const { data: registros = [], isLoading } = useListaEspera();
  const { data: pacientes = [] } = usePacientes();
  const { data: especialidades = [] } = useEspecialidades();
  const crear = useCreateRegistroEspera();
  const cambiarEstado = useCambiarEstadoEspera();

  const [estadoSel, setEstadoSel] = useState("activos");
  const [altaOpen, setAltaOpen] = useState(false);
  const [altaPacienteOpen, setAltaPacienteOpen] = useState(false);

  // Alta
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [especialidadId, setEspecialidadId] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadEspera>("media");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (altaOpen) {
      setBusqueda(""); setPaciente(null); setEspecialidadId(""); setPrioridad("media"); setMotivo("");
    }
  }, [altaOpen]);

  const visibles = useMemo(() => registros.filter((r) => {
    if (estadoSel === "activos") return r.estado === "esperando" || r.estado === "llamado";
    if (estadoSel === "todos") return true;
    return r.estado === estadoSel;
  }), [registros, estadoSel]);

  const sugerencias = useMemo(() => {
    if (!busqueda.trim() || busqueda.trim().length < 2) return [];
    return pacientes
      .filter((p) => p.activo)
      .filter((p) => matchPaciente(p, busqueda))
      .slice(0, 6);
  }, [pacientes, busqueda]);

  const handleAgregar = async () => {
    if (!paciente) { toast.error("Selecciona el paciente."); return; }
    try {
      await crear.mutateAsync({
        paciente_id: paciente.id,
        especialidad_id: especialidadId ? Number(especialidadId) : null,
        prioridad,
        motivo: sanitizePlainText(motivo) || null,
      });
      toast.success("Agregado a la lista de espera.");
      setAltaOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleEstado = async (id: number, estado: EstadoEspera) => {
    try {
      await cambiarEstado.mutateAsync({ id, estado });
      toast.success("Estado actualizado.");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Lista de espera
            </h2>
            <p className="text-sm text-muted-foreground">
              Urgentes primero; dentro de cada prioridad, por orden de llegada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={estadoSel} onValueChange={setEstadoSel}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activos">En espera</SelectItem>
                {ESTADOS_ESPERA.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            {canEdit && (
              <Button className="gap-2" onClick={() => setAltaOpen(true)}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Cargando lista de espera...</p>
        ) : visibles.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay pacientes en este filtro.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibles.map((r, idx) => (
              <div key={r.id} className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="text-sm font-bold text-muted-foreground w-8">{idx + 1}.</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {r.paciente ? `${r.paciente.apellidos}, ${r.paciente.nombres}` : `Paciente #${r.paciente_id}`}
                    {r.paciente && <span className="text-muted-foreground font-normal"> · CI {r.paciente.documento}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[r.especialidad?.nombre, r.motivo].filter(Boolean).join(" · ") || "Sin especialidad indicada"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`border-0 ${COLOR_PRIORIDAD[r.prioridad] || ""}`}>
                    {PRIORIDADES.find((p) => p.value === r.prioridad)?.label ?? r.prioridad}
                  </Badge>
                  <Badge variant="outline">
                    {ESTADOS_ESPERA.find((e) => e.value === r.estado)?.label ?? r.estado}
                  </Badge>
                  {canEdit && r.estado === "esperando" && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEstado(r.id, "llamado")}>
                      <Megaphone className="w-3.5 h-3.5" /> Llamar
                    </Button>
                  )}
                  {canEdit && (r.estado === "esperando" || r.estado === "llamado") && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEstado(r.id, "atendido")}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Atendido
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                        onClick={() => handleEstado(r.id, "cancelado")}
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

      <Dialog open={altaOpen} onOpenChange={setAltaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar a la lista de espera</DialogTitle>
            <DialogDescription>El paciente entra en estado «Esperando».</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="le-paciente">Paciente *</Label>
              {paciente ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                  <span className="text-sm">{paciente.apellidos}, {paciente.nombres} · CI {paciente.documento || "sin cédula"}</span>
                  <Button variant="ghost" size="sm" onClick={() => setPaciente(null)}>Cambiar</Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="le-paciente" className="pl-9" placeholder="Buscar por nombre o CI..."
                      value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  </div>
                  {sugerencias.length > 0 && (
                    <div className="rounded-md border divide-y">
                      {sugerencias.map((p) => (
                        <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setPaciente(p)}>
                          {p.apellidos}, {p.nombres}
                          <span className="text-muted-foreground">
                            {" "}· CI {p.documento || "sin cédula"} · {labelTipoPaciente(p.tipo)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {busqueda.trim().length >= 2 && sugerencias.length === 0 && (
                    <div className="rounded-md border border-dashed p-3 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        No hay ningún paciente con «{busqueda.trim()}».
                      </p>
                      {puedeCrearPaciente && (
                        <Button variant="outline" size="sm" className="gap-1.5"
                          onClick={() => setAltaPacienteOpen(true)}>
                          <UserPlus className="w-4 h-4" /> Registrar paciente nuevo
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="le-esp">Especialidad</Label>
                <Select value={especialidadId || "ninguna"} onValueChange={(v) => setEspecialidadId(v === "ninguna" ? "" : v)}>
                  <SelectTrigger id="le-esp"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Sin especificar</SelectItem>
                    {especialidades.filter((e) => e.activo).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="le-prio">Prioridad *</Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as PrioridadEspera)}>
                  <SelectTrigger id="le-prio"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="le-motivo">Motivo</Label>
              <Input id="le-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <Button onClick={handleAgregar} disabled={crear.isPending} className="w-full">
              {crear.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agregando...</> : "Agregar a la lista"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alta rápida de un paciente que todavía no está en el padrón. */}
      <PacienteForm
        open={altaPacienteOpen}
        onOpenChange={setAltaPacienteOpen}
        busquedaInicial={busqueda}
        onCreated={(nuevo) => { setPaciente(nuevo); setBusqueda(""); }}
      />
    </AppLayout>
  );
}
