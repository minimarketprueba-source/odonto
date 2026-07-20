import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useMedicosActivos, useMiMedico } from "@/api/citas";
import {
  DIAS_SEMANA, useAusencias, useCreateAusencia, useCreateHorario,
  useDeleteAusencia, useDeleteHorario, useHorarios,
} from "@/api/horarios";

export default function Horarios() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("citas", "editar");

  const { data: medicos = [] } = useMedicosActivos();
  const { data: miMedico } = useMiMedico(user?.id);
  const { data: horarios = [] } = useHorarios();
  const { data: ausencias = [] } = useAusencias();
  const crearHorario = useCreateHorario();
  const quitarHorario = useDeleteHorario();
  const crearAusencia = useCreateAusencia();
  const quitarAusencia = useDeleteAusencia();

  const [medicoId, setMedicoId] = useState("");
  const [dia, setDia] = useState("1");
  const [desdeHora, setDesdeHora] = useState("07:00");
  const [hastaHora, setHastaHora] = useState("13:00");
  const [ausDesde, setAusDesde] = useState("");
  const [ausHasta, setAusHasta] = useState("");
  const [ausMotivo, setAusMotivo] = useState("");

  // Por defecto, cada profesional ve su propia ficha.
  useEffect(() => {
    if (!medicoId && miMedico) setMedicoId(String(miMedico.id));
  }, [miMedico, medicoId]);

  const idSel = Number(medicoId) || null;
  const horariosSel = useMemo(
    () => horarios.filter((h) => h.medico_id === idSel),
    [horarios, idSel]
  );
  const ausenciasSel = useMemo(
    () => ausencias.filter((a) => a.medico_id === idSel),
    [ausencias, idSel]
  );

  const agregarHorario = async () => {
    if (!idSel) { toast.error("Selecciona el profesional."); return; }
    if (!desdeHora || !hastaHora || desdeHora >= hastaHora) {
      toast.error("El horario debe tener hora de inicio menor que la de fin.");
      return;
    }
    try {
      await crearHorario.mutateAsync({
        medico_id: idSel,
        dia_semana: Number(dia),
        hora_inicio: desdeHora,
        hora_fin: hastaHora,
      });
      toast.success("Horario agregado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const agregarAusencia = async () => {
    if (!idSel) { toast.error("Selecciona el profesional."); return; }
    if (!ausDesde || !ausHasta || ausDesde > ausHasta) {
      toast.error("Indica el rango de fechas de la ausencia (desde ≤ hasta).");
      return;
    }
    try {
      await crearAusencia.mutateAsync({
        medico_id: idSel,
        desde: ausDesde,
        hasta: ausHasta,
        motivo: ausMotivo.trim() || null,
      });
      setAusDesde(""); setAusHasta(""); setAusMotivo("");
      toast.success("Ausencia registrada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const nombreDia = (v: number) => DIAS_SEMANA.find((d) => d.value === v)?.label ?? String(v);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Horarios de atención
          </h2>
          <p className="text-sm text-muted-foreground">
            Días y horas en que atiende cada profesional, y sus ausencias. La agenda avisa
            si se intenta agendar fuera de estos horarios.
          </p>
        </div>

        <div className="space-y-1 max-w-md">
          <Label>Profesional</Label>
          <Select value={medicoId} onValueChange={setMedicoId}>
            <SelectTrigger><SelectValue placeholder="Selecciona un profesional" /></SelectTrigger>
            <SelectContent>
              {medicos.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.apellidos}, {m.nombres}{m.especialidad ? ` — ${m.especialidad.nombre}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {idSel && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Horario semanal
                </CardTitle>
                <CardDescription>Puede cargar más de una franja por día (ej: mañana y tarde).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {horariosSel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin horarios cargados: la agenda no valida nada para este profesional.
                  </p>
                ) : (
                  <div className="rounded-md border divide-y">
                    {horariosSel.map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{nombreDia(h.dia_semana)}</span>{" "}
                          de {h.hora_inicio.slice(0, 5)} a {h.hora_fin.slice(0, 5)}
                        </span>
                        {canEdit && (
                          <Button
                            variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                            onClick={() => quitarHorario.mutateAsync(h.id).then(() => toast.success("Horario quitado.")).catch((e) => toast.error((e as Error).message))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <div className="space-y-1">
                      <Label>Día</Label>
                      <Select value={dia} onValueChange={setDia}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIAS_SEMANA.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Desde</Label>
                      <Input type="time" className="w-28" value={desdeHora} onChange={(e) => setDesdeHora(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Hasta</Label>
                      <Input type="time" className="w-28" value={hastaHora} onChange={(e) => setHastaHora(e.target.value)} />
                    </div>
                    <Button className="gap-1" onClick={agregarHorario} disabled={crearHorario.isPending}>
                      <Plus className="w-4 h-4" /> Agregar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarOff className="w-5 h-5 text-primary" /> Ausencias
                </CardTitle>
                <CardDescription>Vacaciones, permisos, reuniones: no se agenda en esas fechas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ausenciasSel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin ausencias registradas.</p>
                ) : (
                  <div className="rounded-md border divide-y">
                    {ausenciasSel.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{a.desde}</span> al{" "}
                          <span className="font-medium">{a.hasta}</span>
                          {a.motivo ? <span className="text-muted-foreground"> · {a.motivo}</span> : ""}
                        </span>
                        {canEdit && (
                          <Button
                            variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                            onClick={() => quitarAusencia.mutateAsync(a.id).then(() => toast.success("Ausencia quitada.")).catch((e) => toast.error((e as Error).message))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <div className="space-y-1">
                      <Label>Desde</Label>
                      <Input type="date" className="w-40" value={ausDesde} onChange={(e) => setAusDesde(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Hasta</Label>
                      <Input type="date" className="w-40" value={ausHasta} onChange={(e) => setAusHasta(e.target.value)} />
                    </div>
                    <div className="space-y-1 flex-1 min-w-40">
                      <Label>Motivo</Label>
                      <Input placeholder="Ej: Vacaciones" value={ausMotivo} onChange={(e) => setAusMotivo(e.target.value)} />
                    </div>
                    <Button className="gap-1" onClick={agregarAusencia} disabled={crearAusencia.isPending}>
                      <Plus className="w-4 h-4" /> Agregar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
