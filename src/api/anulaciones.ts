// ============================================================================
// Capa de datos: anular / restaurar registros médicos (solo administrador)
// ============================================================================
// Una historia clínica es un documento médico-legal: nada se borra. Una
// consulta o receta mal cargada se ANULA (deja de verse y de contar, pero
// queda guardada con el motivo y quién la anuló) y se puede restaurar.
// El candado real está en la base: el trigger `trg_control_anulacion` rechaza
// la operación si quien la pide no es administrador.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { cambiarEstadoCita } from "./citas";

/** Motivos frecuentes; el último obliga a escribir un detalle. */
export const MOTIVOS_ANULACION = [
  "Cargada en el paciente equivocado",
  "Duplicada (ya estaba registrada)",
  "Datos clínicos incorrectos",
  "Profesional o fecha equivocados",
  "Reposo mal indicado",
  "Registrada por error o prueba del sistema",
  "Otro motivo",
] as const;

const ERROR_PERMISO =
  "Solo el administrador puede anular, restaurar o corregir un registro médico.";

function traducirError(mensaje: string, accionFallida: string): Error {
  if (mensaje.includes("Solo un administrador")) return new Error(ERROR_PERMISO);
  return new Error(`${accionFallida}: ${mensaje}`);
}

/**
 * Verifica que la operación haya afectado exactamente una fila. Si las reglas
 * de seguridad la bloquean, la base no devuelve error: simplemente no cambia
 * nada, y sin este control parecería que salió bien.
 */
function verificarUnaFila(filas: unknown[] | null, accionFallida: string): void {
  if (!filas || filas.length !== 1) {
    throw new Error(`${accionFallida}. ${ERROR_PERMISO}`);
  }
}

// --- Consultas ---

export interface AnularConsultaInput {
  id: number;
  motivo: string;
  citaId?: number | null;
  /** Devolver la cita a la agenda para que el paciente sea atendido de nuevo. */
  reabrirCita?: boolean;
}

export async function anularConsulta({ id, motivo, citaId, reabrirCita }: AnularConsultaInput): Promise<void> {
  const { data, error } = await supabase
    .from("consultas")
    .update({ anulada_at: new Date().toISOString(), motivo_anulacion: motivo })
    .eq("id", id)
    .select("id");
  if (error) throw traducirError(error.message, "No se pudo anular la consulta");
  verificarUnaFila(data, "No se pudo anular la consulta");

  if (reabrirCita && citaId) {
    // Si falla, la consulta ya quedó anulada; el estado se corrige en la agenda.
    await cambiarEstadoCita(citaId, "pendiente").catch(() => undefined);
  }
}

export async function restaurarConsulta(id: number, citaId?: number | null): Promise<void> {
  const { data, error } = await supabase
    .from("consultas")
    .update({ anulada_at: null })
    .eq("id", id)
    .select("id");
  if (error) throw traducirError(error.message, "No se pudo restaurar la consulta");
  verificarUnaFila(data, "No se pudo restaurar la consulta");

  if (citaId) {
    await cambiarEstadoCita(citaId, "atendida").catch(() => undefined);
  }
}

// --- Recetas ---

export async function anularReceta(id: number, motivo: string): Promise<void> {
  const { data, error } = await supabase
    .from("recetas")
    .update({ anulada_at: new Date().toISOString(), motivo_anulacion: motivo })
    .eq("id", id)
    .select("id");
  if (error) throw traducirError(error.message, "No se pudo anular la receta");
  verificarUnaFila(data, "No se pudo anular la receta");
}

export async function restaurarReceta(id: number): Promise<void> {
  const { data, error } = await supabase
    .from("recetas")
    .update({ anulada_at: null })
    .eq("id", id)
    .select("id");
  if (error) throw traducirError(error.message, "No se pudo restaurar la receta");
  verificarUnaFila(data, "No se pudo restaurar la receta");
}

// --- Citas ---

/** Una cita con consulta registrada no se puede borrar: primero se anula la consulta. */
export async function citaTieneConsulta(citaId: number): Promise<boolean> {
  const { count, error } = await supabase
    .from("consultas")
    .select("id", { count: "exact", head: true })
    .eq("cita_id", citaId);
  if (error) throw new Error(`No se pudo verificar la cita: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function borrarCita(id: number): Promise<void> {
  if (await citaTieneConsulta(id)) {
    throw new Error(
      "Esta cita ya tiene una consulta registrada. Anule primero la consulta desde la historia clínica del paciente."
    );
  }
  const { data, error } = await supabase.from("citas").delete().eq("id", id).select("id");
  if (error) throw traducirError(error.message, "No se pudo borrar la cita");
  verificarUnaFila(data, "No se pudo borrar la cita");
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

function invalidarTodo(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.recetas.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
}

export function useAnularConsulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: anularConsulta,
    retry: 0,
    onSuccess: () => invalidarTodo(queryClient),
  });
}

export function useRestaurarConsulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, citaId }: { id: number; citaId?: number | null }) => restaurarConsulta(id, citaId),
    retry: 0,
    onSuccess: () => invalidarTodo(queryClient),
  });
}

export function useAnularReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => anularReceta(id, motivo),
    retry: 0,
    onSuccess: () => invalidarTodo(queryClient),
  });
}

export function useRestaurarReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restaurarReceta,
    retry: 0,
    onSuccess: () => invalidarTodo(queryClient),
  });
}

export function useBorrarCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: borrarCita,
    retry: 0,
    onSuccess: () => invalidarTodo(queryClient),
  });
}
