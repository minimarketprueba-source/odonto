// ============================================================================
// Capa de datos: Atención ambulatoria de enfermería
// ============================================================================
// Cuando no hay médico de guardia, enfermería atiende igual (curaciones,
// inyectables, controles, primeros auxilios) y lo registra acá. El registro
// queda en la historia clínica del paciente como "Pendiente de revisión
// médica"; después un médico lo revisa y, si amerita, registra la consulta
// formal, que queda vinculada (`consulta_id`).
//
// La atención NO se firma a nombre de ningún médico: la firma quien atendió.
// Tabla `atenciones_enfermeria` (migración: Escritorio\SQL_Atencion_Ambulatoria.txt).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";
import { insertarProcedimientos, type NuevoProcedimiento } from "./procedimientos";

// --- Catálogos (viven en el código, la columna es texto libre) --------------

export const TIPOS_ATENCION = [
  { value: "curacion", label: "Curación" },
  { value: "medicacion", label: "Medicación / inyectable" },
  { value: "control", label: "Control de signos vitales" },
  { value: "primeros_auxilios", label: "Primeros auxilios" },
  { value: "otro", label: "Otro" },
] as const;

/**
 * Cómo termina la atención. Cuando no hay médico de guardia, enfermería puede
 * dejar al paciente con los mismos destinos del papel (pedido del usuario
 * 2026-07-29): son PROVISORIOS — la atención queda pendiente de revisión y el
 * médico después la convalida o registra la consulta formal.
 *
 * `reposo`: qué tipo de reposo implica (para la constancia impresa).
 * `pideDias`: si pide cantidad de días / fecha hasta.
 * `pideCama`: la observación interna de verdad (crea la internación).
 */
export const DESTINOS_AMBULATORIO = [
  { value: "alta", label: "Se retira (alta de enfermería)", pideDias: false, reposo: null, pideCama: false },
  { value: "cita_medico", label: "Queda citado con el médico", pideDias: false, reposo: null, pideCama: false },
  { value: "enfermo_local", label: "Enfermo local (en la unidad)", pideDias: true, reposo: "local", pideCama: false },
  { value: "sin_servicio", label: "Parte sin servicio", pideDias: true, reposo: "local", pideCama: false },
  { value: "reposo_domiciliario", label: "Reposo domiciliario", pideDias: true, reposo: "domiciliario", pideCama: false },
  { value: "observacion", label: "Queda en observación (cama de enfermería)", pideDias: false, reposo: null, pideCama: true },
  { value: "derivado", label: "Derivado a urgencias / hospital", pideDias: false, reposo: null, pideCama: false },
] as const;

export type TipoAtencion = (typeof TIPOS_ATENCION)[number]["value"];
export type DestinoAmbulatorio = (typeof DESTINOS_AMBULATORIO)[number]["value"];

export function destinoAmbulatorio(value?: string | null) {
  return DESTINOS_AMBULATORIO.find((d) => d.value === value) ?? null;
}

/** Destinos que se imprimen como constancia provisoria de enfermería. */
export function esDestinoImprimible(value?: string | null): boolean {
  const d = destinoAmbulatorio(value);
  return !!d && (d.pideDias || d.pideCama);
}

export function labelTipoAtencion(tipo?: string | null): string {
  return TIPOS_ATENCION.find((t) => t.value === tipo)?.label ?? (tipo || "Atención");
}

export function labelDestinoAmbulatorio(destino?: string | null): string {
  return DESTINOS_AMBULATORIO.find((d) => d.value === destino)?.label ?? (destino || "—");
}

// --- Tipos ------------------------------------------------------------------

export interface AtencionEnfermeria {
  id: number;
  clinica_id: number;
  paciente_id: number;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm:ss
  enfermero: string | null;
  /** Nº de registro profesional de quien atendió (para la constancia). */
  enfermero_registro: string | null;
  registrado_por: string | null;
  tipo_atencion: TipoAtencion | string;
  motivo: string | null;
  procedimiento: string | null;
  observaciones: string | null;
  destino: DestinoAmbulatorio | string | null;
  /** Hasta cuándo (inclusive) rige el reposo provisorio; desde = fecha. */
  reposo_hasta: string | null;
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  fc: number | null;
  fr: number | null;
  temp: number | null;
  spo2: number | null;
  /** Mientras sea null, la atención está pendiente de revisión médica. */
  revisada_at: string | null;
  medico_revisor_id: number | null;
  revisada_por: string | null;
  nota_revision: string | null;
  /** Consulta que el médico registró a partir de esta atención, si la hubo. */
  consulta_id: number | null;
  created_at?: string;
  paciente?: {
    id: number; nombres: string; apellidos: string; documento: string | null; tipo: string;
    grado?: string | null; unidad?: string | null;
  } | null;
  medico_revisor?: { id: number; nombres: string; apellidos: string } | null;
  procedimientos?: import("./procedimientos").ProcedimientoSanitario[];
}

export interface CrearAtencionInput {
  paciente_id: number;
  fecha: string;
  hora: string;
  enfermero?: string | null;
  enfermero_registro?: string | null;
  registrado_por?: string | null;
  tipo_atencion: string;
  motivo?: string | null;
  procedimiento?: string | null;
  observaciones?: string | null;
  destino?: string | null;
  reposo_hasta?: string | null;
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
  spo2?: number | null;
  procedimientos?: NuevoProcedimiento[];
}

export interface RevisarAtencionInput {
  id: number;
  /** Ficha del médico que firma. Null cuando revisa el administrador
   *  (el trigger de la base solo lo acepta para cuentas admin). */
  medico_revisor_id?: number | null;
  revisada_por?: string | null;
  nota_revision?: string | null;
  /** Si el médico registró una consulta a partir de la atención. */
  consulta_id?: number | null;
}

const ATENCION_SELECT =
  "*, paciente:pacientes(id, nombres, apellidos, documento, tipo, grado, unidad), " +
  "medico_revisor:medicos(id, nombres, apellidos), procedimientos:procedimientos_sanitarios(*)";

// --- Errores ----------------------------------------------------------------

/** True si la tabla todavía no existe (falta aplicar la migración). */
export function esTablaFaltante(error?: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  if (!error.message) return false;
  // También el error YA traducido: React Query le pasa al retry y al panel el
  // Error que lanzó el fetch, no el crudo de PostgREST.
  if (/SQL_Atencion_Ambulatoria/.test(error.message)) return true;
  return /atenciones_enfermeria/.test(error.message) &&
    /(does not exist|schema cache|no existe)/i.test(error.message);
}

/** Crea el Error traducido conservando el código de Postgres del original. */
function errorConCodigo(mensaje: string, code?: string): Error {
  const e = new Error(mensaje);
  (e as Error & { code?: string }).code = code;
  return e;
}

export function traducirErrorAtencion(
  error: { code?: string; message: string },
  accion: string
): Error {
  if (esTablaFaltante(error)) {
    return errorConCodigo(
      "Falta aplicar la actualización de la base de datos para la atención ambulatoria " +
        "(archivo SQL_Atencion_Ambulatoria.txt del Escritorio). Avise al administrador.",
      error.code
    );
  }
  if (error.code === "23514") {
    return errorConCodigo(
      "Hay un valor fuera de rango. Revise los signos vitales (por ejemplo, la temperatura o la saturación).",
      error.code
    );
  }
  if (error.code === "PGRST204" && /enfermero_registro/.test(error.message)) {
    return errorConCodigo(
      "Falta aplicar la actualización de la base para el registro profesional " +
        "(archivo SQL_Registro_Profesional.txt del Escritorio). Avise al administrador.",
      error.code
    );
  }
  if (error.code === "PGRST204" && /reposo_hasta/.test(error.message)) {
    return errorConCodigo(
      "Falta aplicar la actualización de la base para los destinos con reposo " +
        "(archivo SQL_Atencion_Reposo.txt del Escritorio). Avise al administrador.",
      error.code
    );
  }
  if (error.code === "22P02") {
    return errorConCodigo(
      "Hay un valor con decimales donde va un número entero. Revise los signos vitales.",
      error.code
    );
  }
  return errorConCodigo(`${accion}: ${error.message}`, error.code);
}

// --- Consultas a la base ----------------------------------------------------

/**
 * Pendientes de revisión médica, SIN límite chico: nunca deben desaparecer de
 * la pantalla por un corte (la misma trampa que tuvo la lista de espera).
 * Las más antiguas primero: son las que más urge revisar.
 */
export async function fetchAtencionesPendientes(): Promise<AtencionEnfermeria[]> {
  const { data, error } = await supabase
    .from("atenciones_enfermeria")
    .select(ATENCION_SELECT)
    .is("revisada_at", null)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(1000);
  if (error) throw traducirErrorAtencion(error, "No se pudieron cargar las atenciones pendientes");
  return (data as unknown as AtencionEnfermeria[]) || [];
}

/**
 * Últimas atenciones YA REVISADAS, para el historial del panel. El filtro va
 * en la consulta: si se trajeran "las últimas 50" y se filtrara en memoria,
 * un backlog de pendientes escondería a las revisadas sin ningún error.
 */
export async function fetchAtencionesRevisadas(): Promise<AtencionEnfermeria[]> {
  const { data, error } = await supabase
    .from("atenciones_enfermeria")
    .select(ATENCION_SELECT)
    .not("revisada_at", "is", null)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(50);
  if (error) throw traducirErrorAtencion(error, "No se pudieron cargar las atenciones");
  return (data as unknown as AtencionEnfermeria[]) || [];
}

/** Atenciones de un paciente, para su historia clínica. */
export async function fetchAtencionesPaciente(pacienteId: number): Promise<AtencionEnfermeria[]> {
  const { data, error } = await supabase
    .from("atenciones_enfermeria")
    .select(ATENCION_SELECT)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(500);
  if (error) {
    // La historia clínica tiene que seguir abriéndose aunque la migración no
    // esté aplicada: sin tabla, simplemente no hay atenciones que mostrar.
    if (esTablaFaltante(error)) return [];
    throw traducirErrorAtencion(error, "No se pudieron cargar las atenciones de enfermería");
  }
  return (data as unknown as AtencionEnfermeria[]) || [];
}

export async function crearAtencion(input: CrearAtencionInput): Promise<AtencionEnfermeria> {
  const { reposo_hasta, enfermero_registro, procedimientos, ...resto } = input;
  const { data, error } = await supabase
    .from("atenciones_enfermeria")
    // reposo_hasta solo viaja cuando hay reposo: así los demás destinos siguen
    // funcionando aunque la columna todavía no exista en la base.
    .insert({
      ...resto,
      clinica_id: CLINICA_ID,
      ...(reposo_hasta ? { reposo_hasta } : {}),
      ...(enfermero_registro ? { enfermero_registro } : {}),
    })
    .select(ATENCION_SELECT)
    .single();
  if (error) throw traducirErrorAtencion(error, "No se pudo registrar la atención");
  const procedimientosGuardados = await insertarProcedimientos(procedimientos ?? [], { paciente_id: input.paciente_id, fecha: input.fecha, atencion_enfermeria_id: (data as unknown as { id: number }).id });
  return { ...(data as unknown as AtencionEnfermeria), procedimientos: procedimientosGuardados };
}

/**
 * Marca la atención como revisada por un médico. El filtro sobre
 * `revisada_at IS NULL` evita que dos médicos la revisen a la vez: el segundo
 * recibe el aviso de que ya estaba revisada.
 */
export async function revisarAtencion(input: RevisarAtencionInput): Promise<void> {
  const { data, error } = await supabase
    .from("atenciones_enfermeria")
    .update({
      revisada_at: new Date().toISOString(),
      medico_revisor_id: input.medico_revisor_id ?? null,
      revisada_por: input.revisada_por ?? null,
      nota_revision: input.nota_revision ?? null,
      ...(input.consulta_id ? { consulta_id: input.consulta_id } : {}),
    })
    .eq("id", input.id)
    .is("revisada_at", null)
    .select("id");
  if (error) throw traducirErrorAtencion(error, "No se pudo marcar la revisión");
  if (!data || data.length !== 1) {
    throw new Error("Esa atención ya fue revisada por otro médico. Actualice la pantalla.");
  }
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useAtencionesPendientes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.enfermeria.ambulatoriasPendientes(),
    queryFn: fetchAtencionesPendientes,
    enabled,
    // Pantalla compartida entre turnos: conviene refrescar seguido. Pero si la
    // migración no está aplicada, no tiene sentido golpear cada minuto.
    refetchInterval: (query) =>
      esTablaFaltante(query.state.error as { code?: string; message?: string } | null)
        ? false
        : 60_000,
    refetchOnWindowFocus: true,
    // Sin la migración aplicada fallaría por siempre: no insistir.
    retry: (failureCount, error) =>
      !esTablaFaltante(error as { code?: string; message?: string }) && failureCount < 2,
  });
}

export function useAtencionesRevisadas(enabled = true) {
  return useQuery({
    queryKey: queryKeys.enfermeria.ambulatoriasRecientes(),
    queryFn: fetchAtencionesRevisadas,
    enabled,
    retry: (failureCount, error) =>
      !esTablaFaltante(error as { code?: string; message?: string }) && failureCount < 2,
  });
}

export function useAtencionesPaciente(pacienteId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.enfermeria.ambulatoriasPaciente(pacienteId ?? 0),
    queryFn: () => fetchAtencionesPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.enfermeria.all });
}

export function useCrearAtencion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearAtencion,
    retry: 0, // no reintentar: crearía una segunda atención
    onSuccess: () => invalidar(queryClient),
  });
}

export function useRevisarAtencion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revisarAtencion,
    retry: 0,
    onSuccess: () => invalidar(queryClient),
  });
}
