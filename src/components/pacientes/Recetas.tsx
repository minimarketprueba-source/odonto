import { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  Loader2, Plus, Pill, Printer, Trash2, User, Ban, AlertTriangle, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";

import {
  useRecetasPaciente, useCreateReceta, useAnularReceta, faltaMigracionRecetas,
  type RecetaItem,
} from "@/api/recetas";
import { usePacienteAnamnesis } from "@/api/odontologia";
import { useMiMedico, fechaHoyISO } from "@/api/citas";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  MEDICAMENTOS_FRECUENTES, alergiasEnConflicto,
} from "@/lib/medicamentos";
import { imprimirReceta } from "@/lib/imprimir";

interface RecetasProps {
  pacienteId: string;
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteEdad?: string | null;
}

/** Una fila vacía del formulario. */
const FILA_VACIA: RecetaItem = {
  medicamento: "",
  dosis: "",
  frecuencia: "",
  duracion: "",
  indicaciones: "",
};

export function Recetas({
  pacienteId, pacienteNombre, pacienteDocumento, pacienteEdad,
}: RecetasProps) {
  const { user, role: rol } = useAuth();
  const { isMedico, isAdmin } = usePermissions();
  const { data: miMedico } = useMiMedico(user?.id);
  const { data: anamnesis } = usePacienteAnamnesis(pacienteId);
  const { data: recetas = [], isLoading, error } = useRecetasPaciente(pacienteId);
  const crearReceta = useCreateReceta();
  const anular = useAnularReceta();

  const [abierto, setAbierto] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [items, setItems] = useState<RecetaItem[]>([{ ...FILA_VACIA }]);

  // El odontólogo y el administrador emiten. En este consultorio el dueño es
  // las dos cosas con una sola cuenta, así que exigir el rol `medico` lo
  // dejaba sin poder recetar desde la cuenta que usa todos los días.
  //
  // El permiso es de la cuenta; la FIRMA es de la ficha de odontólogo
  // vinculada a ella. Sin ficha no se emite, aunque sobre el permiso: el
  // documento saldría sin nombre ni registro profesional.
  const tienePermiso = isMedico || isAdmin;
  const puedeRecetar = tienePermiso && !!miMedico;

  const opcionesVademecum = MEDICAMENTOS_FRECUENTES.map((m) => ({
    value: m.id,
    label: m.nombre,
    detalle: `${m.dosis} · ${m.frecuencia} · ${m.duracion}`,
    buscarPor: m.categoria,
  }));

  const limpiar = () => {
    setAbierto(false);
    setDiagnostico("");
    setIndicaciones("");
    setItems([{ ...FILA_VACIA }]);
  };

  /** Agrega una fila ya cargada con la posología habitual del vademécum. */
  const agregarDelVademecum = (id: string) => {
    const m = MEDICAMENTOS_FRECUENTES.find((x) => x.id === id);
    if (!m) return;
    const fila: RecetaItem = {
      medicamento: m.nombre,
      dosis: m.dosis,
      frecuencia: m.frecuencia,
      duracion: m.duracion,
      indicaciones: m.indicaciones || "",
    };
    // Si la última fila está vacía se reemplaza, para no dejar huecos.
    setItems((prev) => {
      const ultima = prev[prev.length - 1];
      if (prev.length && !ultima.medicamento.trim()) return [...prev.slice(0, -1), fila];
      return [...prev, fila];
    });
  };

  const cambiarItem = (i: number, campo: keyof RecetaItem, valor: string) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  };

  const quitarItem = (i: number) => {
    setItems((prev) => (prev.length === 1 ? [{ ...FILA_VACIA }] : prev.filter((_, idx) => idx !== i)));
  };

  const handleGuardar = async () => {
    const cargados = items.filter((i) => i.medicamento.trim());
    if (!cargados.length) {
      toast.error("Agregue al menos un medicamento.");
      return;
    }
    if (!miMedico) {
      toast.error("Necesita tener su ficha de odontólogo cargada para emitir recetas.");
      return;
    }

    // El aviso de alergias antes de emitir: la anamnesis se cargó en otra
    // pestaña, quizá meses atrás, y al recetar no se tiene delante.
    const conflictos = alergiasEnConflicto(
      cargados.map((i) => i.medicamento),
      anamnesis?.alergias
    );
    if (conflictos.length) {
      const confirmar = await Swal.fire({
        title: "Atención: alergia declarada",
        html:
          `<div style="text-align:left; font-size:14px;">` +
          conflictos.map((c) => `<p style="margin:6px 0;">• ${c}</p>`).join("") +
          `<p style="margin-top:12px; color:#64748b; font-size:13px;">` +
          `Alergias en la anamnesis: <strong>${anamnesis?.alergias || "—"}</strong></p></div>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Recetar igual",
        cancelButtonText: "Revisar la receta",
        confirmButtonColor: "#dc2626",
      });
      if (!confirmar.isConfirmed) return;
    }

    try {
      await crearReceta.mutateAsync({
        paciente_id: pacienteId,
        medico_id: miMedico.id,
        fecha: fechaHoyISO(),
        diagnostico: diagnostico.trim() || null,
        indicaciones: indicaciones.trim() || null,
        registrado_por: user?.id ?? null,
        items: cargados.map((i) => ({
          medicamento: i.medicamento.trim(),
          dosis: i.dosis?.trim() || null,
          frecuencia: i.frecuencia?.trim() || null,
          duracion: i.duracion?.trim() || null,
          indicaciones: i.indicaciones?.trim() || null,
        })),
      });
      toast.success("Receta emitida.");
      limpiar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAnular = async (recetaId: string, numero: string) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: `Anular la receta ${numero}`,
      text: "La receta deja de ser válida pero no se borra: conserva su número.",
      input: "text",
      inputPlaceholder: "Motivo de la anulación",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Anular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      inputValidator: (v) => (!v?.trim() ? "Indique el motivo" : undefined),
    });
    if (!isConfirmed) return;
    try {
      await anular.mutateAsync({ recetaId, motivo: motivo as string, anuladaPor: user?.id ?? null });
      toast.success("Receta anulada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleImprimir = (receta: (typeof recetas)[number]) => {
    imprimirReceta({
      numero: receta.numero,
      fecha: new Date(`${receta.fecha}T00:00:00`).toLocaleDateString("es-PY"),
      pacienteNombre,
      pacienteDocumento,
      pacienteEdad,
      diagnostico: receta.diagnostico,
      indicaciones: receta.indicaciones,
      medicamentos: (receta.items || []).map((i) => ({
        medicamento: i.medicamento,
        dosis: i.dosis,
        frecuencia: i.frecuencia,
        duracion: i.duracion,
        indicaciones: i.indicaciones,
      })),
      profesionalNombre: receta.medico
        ? `Dr(a). ${receta.medico.nombres} ${receta.medico.apellidos}`
        : null,
      profesionalRegistro: receta.medico?.numero_colegiatura ?? null,
      anulada: !!receta.anulada_at,
      motivoAnulacion: receta.motivo_anulacion,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  // Sin la migración aplicada no se puede leer ni escribir: se dice, en vez de
  // mostrar una lista vacía que parecería un paciente sin recetas.
  if (error) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {faltaMigracionRecetas(error) ? "Recetas todavía no habilitadas" : "No se pudieron cargar las recetas"}
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const tieneAlergias =
    !!anamnesis?.alergias?.trim() || anamnesis?.alergia_anestesia || anamnesis?.alergia_latex;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" /> Recetas
        </h3>
        {!abierto && puedeRecetar && (
          <Button onClick={() => setAbierto(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Nueva receta
          </Button>
        )}
      </div>

      {/* Las alergias a la vista siempre que se abre la pestaña, no solo al guardar. */}
      {tieneAlergias && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="space-y-1">
            <p className="font-semibold text-red-800 dark:text-red-300">Alergias declaradas</p>
            {anamnesis?.alergias?.trim() && (
              <p className="text-red-700 dark:text-red-300">{anamnesis.alergias}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {anamnesis?.alergia_anestesia && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
                  Anestesia
                </span>
              )}
              {anamnesis?.alergia_latex && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
                  Látex
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cuando no se puede emitir, la pantalla dice QUÉ falta y con qué cuenta
          se está entrando. Antes solo desaparecía el botón, y desde afuera los
          dos motivos (sin permiso / sin ficha) se ven igual: nada. */}
      {!puedeRecetar && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2 text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              {tienePermiso ? "Falta vincular su ficha de odontólogo" : "Esta cuenta no emite recetas"}
            </p>

            <ul className="space-y-0.5">
              <li>
                Entrando como <strong>{user?.email ?? "—"}</strong>
                {rol ? <> · rol <strong>{rol}</strong></> : null}
              </li>
              <li>
                Permiso para emitir: <strong>{tienePermiso ? "sí" : "no"}</strong>
              </li>
              <li>
                Ficha de odontólogo vinculada:{" "}
                <strong>
                  {miMedico ? `${miMedico.apellidos}, ${miMedico.nombres}` : "ninguna"}
                </strong>
              </li>
            </ul>

            {tienePermiso ? (
              <p>
                La receta se firma con el nombre y el registro profesional de la ficha vinculada a
                la cuenta. Andá a <strong>Mantenimiento → Médicos</strong>, abrí su ficha (o creála)
                y en «Cuenta de acceso» elegí <strong>{user?.email ?? "esta cuenta"}</strong>.
              </p>
            ) : (
              <p>
                Las recetas las emite el odontólogo o el administrador. Desde esta cuenta se pueden
                ver e imprimir las ya emitidas.
              </p>
            )}
          </div>
        </div>
      )}

      {abierto && (
        <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
          <h4 className="text-sm font-medium">Nueva receta</h4>

          <div className="space-y-1">
            <Label>Diagnóstico (opcional)</Label>
            <Input
              placeholder="Ej: Absceso periapical pieza 36"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Agregar del vademécum</Label>
            <Combobox
              opciones={opcionesVademecum}
              value=""
              onChange={agregarDelVademecum}
              placeholder="Buscar un medicamento…"
              buscarPlaceholder="Ej: amoxicilina, ibuprofeno…"
              vacioTexto="No está en la lista. Escríbalo a mano abajo."
            />
            <p className="text-xs text-muted-foreground">
              Es solo una ayuda: puede escribir cualquier medicamento a mano en los campos de abajo.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Medicamentos *</Label>
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border bg-background p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2.5 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                  <Input
                    placeholder="Medicamento y concentración"
                    value={item.medicamento}
                    onChange={(e) => cambiarItem(i, "medicamento", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => quitarItem(i)}
                    aria-label={`Quitar medicamento ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-3">
                  <Input
                    placeholder="Dosis (1 comprimido)"
                    value={item.dosis ?? ""}
                    onChange={(e) => cambiarItem(i, "dosis", e.target.value)}
                  />
                  <Input
                    placeholder="Frecuencia (c/8 horas)"
                    value={item.frecuencia ?? ""}
                    onChange={(e) => cambiarItem(i, "frecuencia", e.target.value)}
                  />
                  <Input
                    placeholder="Duración (7 días)"
                    value={item.duracion ?? ""}
                    onChange={(e) => cambiarItem(i, "duracion", e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Indicaciones de este medicamento (opcional)"
                  value={item.indicaciones ?? ""}
                  onChange={(e) => cambiarItem(i, "indicaciones", e.target.value)}
                  className="ml-6 w-[calc(100%-1.5rem)]"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setItems((prev) => [...prev, { ...FILA_VACIA }])}
            >
              <Plus className="h-4 w-4" /> Agregar otro medicamento
            </Button>
          </div>

          <div className="space-y-1">
            <Label>Indicaciones generales (opcional)</Label>
            <Textarea
              placeholder="Ej: Reposo relativo 24 h. Dieta blanda y fría. Control en 7 días."
              className="min-h-[80px]"
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={limpiar}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={crearReceta.isPending}>
              {crearReceta.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Emitir receta
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {recetas.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            Este paciente todavía no tiene recetas emitidas.
          </p>
        ) : (
          recetas.map((r) => (
            <div key={r.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.numero}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-PY", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                  </div>
                  {r.diagnostico && (
                    <p className="mt-1 text-sm text-muted-foreground">{r.diagnostico}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleImprimir(r)}>
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </Button>
                  {(isMedico || isAdmin) && !r.anulada_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-600 hover:text-red-700"
                      onClick={() => handleAnular(r.id, r.numero)}
                      disabled={anular.isPending}
                    >
                      <Ban className="h-3.5 w-3.5" /> Anular
                    </Button>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 rounded-lg border bg-muted/20 p-3 text-sm">
                {(r.items || []).map((it, idx) => (
                  <li key={it.id ?? idx}>
                    <span className="font-medium">{it.medicamento}</span>
                    {[it.dosis, it.frecuencia, it.duracion].filter(Boolean).length > 0 && (
                      <span className="text-muted-foreground">
                        {" — "}
                        {[it.dosis, it.frecuencia, it.duracion].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {it.indicaciones && (
                      <p className="text-xs italic text-muted-foreground">{it.indicaciones}</p>
                    )}
                  </li>
                ))}
              </ul>

              {r.indicaciones && (
                <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                  {r.indicaciones}
                </p>
              )}

              <div className="flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>
                  {r.medico
                    ? `Dr(a). ${r.medico.nombres} ${r.medico.apellidos}${
                        r.medico.numero_colegiatura ? ` — Reg. ${r.medico.numero_colegiatura}` : ""
                      }`
                    : "Profesional no registrado"}
                </span>
              </div>

              {r.anulada_at && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <Trash2 className="h-3.5 w-3.5" />
                  Anulada{r.motivo_anulacion ? `: ${r.motivo_anulacion}` : ""}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
