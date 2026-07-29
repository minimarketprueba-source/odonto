import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle, CheckCircle2, ClipboardCheck, HeartPulse, Loader2, Plus, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useMiMedico } from "@/api/citas";
import {
  esTablaFaltante, labelDestinoAmbulatorio, labelTipoAtencion,
  useAtencionesPendientes, useAtencionesRevisadas, useRevisarAtencion,
  type AtencionEnfermeria,
} from "@/api/atenciones-enfermeria";
import { sanitizeMultilineText } from "@/lib/security";
import { AtencionAmbulatoriaForm } from "./atencion-ambulatoria-form";
import { ConsultaForm } from "@/components/consultas/consulta-form";

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

/** Resumen en una línea de los signos vitales tomados (solo los que hay). */
function resumenVitales(a: AtencionEnfermeria): string | null {
  const partes: string[] = [];
  if (a.pa_sistolica || a.pa_diastolica) partes.push(`PA ${a.pa_sistolica ?? "—"}/${a.pa_diastolica ?? "—"}`);
  if (a.fc) partes.push(`FC ${a.fc}`);
  if (a.fr) partes.push(`FR ${a.fr}`);
  if (a.spo2) partes.push(`SpO2 ${a.spo2}%`);
  if (a.temp) partes.push(`T° ${a.temp}`);
  return partes.length ? partes.join(" · ") : null;
}

function nombrePaciente(a: AtencionEnfermeria): string {
  return a.paciente ? `${a.paciente.apellidos}, ${a.paciente.nombres}` : `Paciente #${a.paciente_id}`;
}

/** Tarjeta de una atención (se usa en pendientes y en el historial). */
function TarjetaAtencion({
  atencion, acciones,
}: {
  atencion: AtencionEnfermeria;
  acciones?: React.ReactNode;
}) {
  const vitales = resumenVitales(atencion);
  const pendiente = !atencion.revisada_at;
  return (
    <div className={`p-3 rounded-lg border ${pendiente ? "border-amber-300 dark:border-amber-800" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm">{nombrePaciente(atencion)}</span>
        {atencion.paciente?.documento && (
          <Badge variant="outline" className="text-xs">CI {atencion.paciente.documento}</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {fmtFecha(atencion.fecha)} · {atencion.hora?.slice(0, 5)} hs
        </span>
        <Badge className="bg-teal-100 text-teal-700 border-0 dark:bg-teal-900/40 dark:text-teal-200">
          {labelTipoAtencion(atencion.tipo_atencion)}
        </Badge>
        {pendiente ? (
          <Badge className="bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/40 dark:text-amber-200">
            Pendiente de revisión médica
          </Badge>
        ) : (
          <Badge className="bg-green-100 text-green-700 border-0 dark:bg-green-900/40 dark:text-green-200">
            Revisada
          </Badge>
        )}
        {atencion.consulta_id && (
          <Badge variant="outline" className="text-xs">Con consulta registrada</Badge>
        )}
      </div>
      {atencion.motivo && <p className="text-sm mt-1 whitespace-pre-wrap">{atencion.motivo}</p>}
      {atencion.procedimiento && (
        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
          Se hizo: {atencion.procedimiento}
        </p>
      )}
      {atencion.observaciones && (
        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
          Obs.: {atencion.observaciones}
        </p>
      )}
      {vitales && <p className="text-xs font-mono text-muted-foreground mt-0.5">{vitales}</p>}
      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {atencion.destino && atencion.destino !== "alta" && (
            <span className="font-medium">{labelDestinoAmbulatorio(atencion.destino)} · </span>
          )}
          Atendió: {atencion.enfermero || atencion.registrado_por?.split("@")[0] || "—"}
          {atencion.medico_revisor ? (
            <> · Revisó: Dr(a). {atencion.medico_revisor.apellidos}, {atencion.medico_revisor.nombres}</>
          ) : atencion.revisada_at && atencion.revisada_por ? (
            <> · Revisó: {atencion.revisada_por.split("@")[0]} (administración)</>
          ) : null}
        </p>
        {acciones}
      </div>
      {atencion.nota_revision && (
        <p className="text-xs mt-1 text-muted-foreground italic">Nota del médico: {atencion.nota_revision}</p>
      )}
    </div>
  );
}

export function AtencionAmbulatoriaPanel() {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const puedeRegistrar = hasPermission("consultas", "editar");
  const { data: miMedico } = useMiMedico(user?.id);
  // Revisan los médicos con su propia ficha y también el administrador (la
  // base lo acepta: el trigger permite firmar a es_sanidad_admin()).
  const puedeRevisar = !!miMedico || isAdmin;

  const pendientesQuery = useAtencionesPendientes();
  const revisadasQuery = useAtencionesRevisadas();
  const revisar = useRevisarAtencion();

  const [formOpen, setFormOpen] = useState(false);
  const [paraRevisar, setParaRevisar] = useState<AtencionEnfermeria | null>(null);
  const [notaRevision, setNotaRevision] = useState("");
  const [paraConsulta, setParaConsulta] = useState<AtencionEnfermeria | null>(null);

  const pendientes = pendientesQuery.data ?? [];
  const revisadas = revisadasQuery.data ?? [];

  // Sin la migración aplicada no hay tabla: se explica en vez de romper.
  const faltaMigracion = esTablaFaltante(
    (pendientesQuery.error ?? revisadasQuery.error) as { code?: string; message?: string } | null
  );

  const handleMarcarRevisada = async () => {
    if (!paraRevisar || !puedeRevisar) return;
    try {
      await revisar.mutateAsync({
        id: paraRevisar.id,
        // Admin sin ficha: queda su cuenta en revisada_por, sin médico.
        medico_revisor_id: miMedico?.id ?? null,
        revisada_por: user?.email ?? null,
        nota_revision: sanitizeMultilineText(notaRevision) || null,
      });
      toast.success("Atención revisada.");
      setParaRevisar(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (faltaMigracion) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">
            Falta aplicar la actualización de la base de datos
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
            Para usar la atención ambulatoria, el administrador debe ejecutar el archivo
            «SQL_Atencion_Ambulatoria.txt» (está en el Escritorio) en el editor SQL de Supabase.
            Mientras tanto, esta sección queda deshabilitada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-teal-600" /> Atención ambulatoria
          </h3>
          <p className="text-sm text-muted-foreground">
            Curaciones, medicación y controles hechos por enfermería sin médico de guardia.
            Cada registro queda en la historia clínica del paciente y figura como pendiente
            hasta que un médico lo revise.
          </p>
        </div>
        {puedeRegistrar && (
          <Button className="gap-2 bg-teal-600 hover:bg-teal-500 text-white shrink-0"
            onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Registrar atención
          </Button>
        )}
      </div>

      {/* Pendientes de revisión */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-amber-600" />
          Pendientes de revisión médica ({pendientes.length})
        </h4>
        {pendientesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
        ) : pendientesQuery.isError ? (
          // Un error real no se disfraza de lista vacía: un médico creería
          // que no hay nada para revisar.
          <div className="rounded-lg border border-red-300 dark:border-red-900 p-3 text-center space-y-2">
            <p className="text-sm text-red-700 dark:text-red-300">
              No se pudieron cargar las atenciones pendientes: {(pendientesQuery.error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => pendientesQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            No hay atenciones esperando revisión. ✔
          </p>
        ) : (
          pendientes.map((a) => (
            <TarjetaAtencion
              key={a.id}
              atencion={a}
              acciones={puedeRevisar ? (
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-9 sm:h-7 px-2.5 text-xs gap-1"
                    onClick={() => { setParaRevisar(a); setNotaRevision(""); }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar revisada
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 sm:h-7 px-2.5 text-xs gap-1"
                    onClick={() => setParaConsulta(a)}>
                    <Stethoscope className="w-3.5 h-3.5" /> Registrar consulta
                  </Button>
                </div>
              ) : undefined}
            />
          ))
        )}
        {!puedeRevisar && pendientes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            La revisión la hace un médico desde su propia cuenta, o el administrador.
          </p>
        )}
      </div>

      {/* Historial reciente */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Últimas atenciones revisadas</h4>
        {revisadasQuery.isError ? (
          <div className="rounded-lg border border-red-300 dark:border-red-900 p-3 text-center space-y-2">
            <p className="text-sm text-red-700 dark:text-red-300">
              No se pudieron cargar: {(revisadasQuery.error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => revisadasQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : revisadas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            Todavía no hay atenciones revisadas.
          </p>
        ) : (
          revisadas.map((a) => <TarjetaAtencion key={a.id} atencion={a} />)
        )}
      </div>

      {/* Formulario de alta */}
      <AtencionAmbulatoriaForm open={formOpen} onOpenChange={setFormOpen} />

      {/* Diálogo de revisión */}
      <Dialog open={!!paraRevisar} onOpenChange={(o) => { if (!o) setParaRevisar(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marcar como revisada</DialogTitle>
            <DialogDescription>
              {paraRevisar ? `${nombrePaciente(paraRevisar)} — ${labelTipoAtencion(paraRevisar.tipo_atencion)} del ${fmtFecha(paraRevisar.fecha)}.` : ""}
              {" "}Queda registrado que usted revisó esta atención.
            </DialogDescription>
          </DialogHeader>
          {/* Todo lo que anotó enfermería, a la vista antes de firmar. */}
          {paraRevisar && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-sm">
              {paraRevisar.motivo && <p className="whitespace-pre-wrap">{paraRevisar.motivo}</p>}
              {paraRevisar.procedimiento && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  Se hizo: {paraRevisar.procedimiento}
                </p>
              )}
              {paraRevisar.observaciones && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  Obs.: {paraRevisar.observaciones}
                </p>
              )}
              {resumenVitales(paraRevisar) && (
                <p className="text-xs font-mono text-muted-foreground">{resumenVitales(paraRevisar)}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="aa-nota" className="text-sm font-semibold">Nota (opcional)</Label>
            <Textarea id="aa-nota" rows={2}
              placeholder="Ej: Conforme. Citar a control en 7 días."
              value={notaRevision} onChange={(e) => setNotaRevision(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setParaRevisar(null)} disabled={revisar.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleMarcarRevisada} disabled={revisar.isPending} className="gap-2">
              {revisar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Marcar revisada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consulta a partir de la atención: al guardarla, la atención queda
          revisada por el médico que firmó y vinculada a esa consulta. */}
      <ConsultaForm
        open={!!paraConsulta}
        onOpenChange={(o) => { if (!o) setParaConsulta(null); }}
        pacienteId={paraConsulta?.paciente_id ?? null}
        pacienteNombre={paraConsulta ? nombrePaciente(paraConsulta) : ""}
        motivoInicial={paraConsulta?.motivo ?? undefined}
        onCreated={(consulta) => {
          const atencion = paraConsulta;
          if (!atencion) return;
          revisar
            .mutateAsync({
              id: atencion.id,
              medico_revisor_id: consulta.medico_id,
              revisada_por: user?.email ?? null,
              consulta_id: consulta.id,
            })
            .catch((e) => {
              // La consulta ya quedó guardada; solo falló el vínculo.
              toast.error(
                `La consulta se registró, pero no se pudo marcar la atención como revisada: ${(e as Error).message}`
              );
            });
        }}
      />
    </div>
  );
}
