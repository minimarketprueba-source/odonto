// ============================================================================
// Capa de datos: Agenda de citas médicas
// ============================================================================
// Tabla `citas` con joins a pacientes y medicos (PostgREST embedding por FK).
// Escritura protegida por RLS: solo personal activo de la clínica.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

export const ESTADOS_CITA = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "admitida", label: "Admitida" },
  { value: "atendida", label: "Atendida" },
  { value: "no_acudio", label: "No acudió" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export type EstadoCita = (typeof ESTADOS_CITA)[number]["value"];

/** Turno según la hora de la cita (estilo PY HIS). */
export function turnoDeHora(hora: string): "Mañana" | "Tarde" | "Noche" {
  const h = Number((hora || "0").slice(0, 2));
  if (h < 12) return "Mañana";
  if (h < 17) return "Tarde";
  return "Noche";
}

// Los identificadores de esta base son UUID (texto). Estaban declarados como
// `number` por herencia del esquema anterior, y de ahí salían los `Number(id)`
// que devolvían NaN y hacían fallar el guardado.
export interface Cita {
  id: string;
  clinica_id: string;
  paciente_id: string;
  medico_id: string;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm:ss
  estado: EstadoCita | string;
  motivo: string | null;
  notas: string | null;
  agendado_por: string | null; // email de quien agendó (registro estilo PY HIS)
  admitida_at: string | null; // cuándo llegó el paciente (check-in)
  orden_llegada: number | null; // nº de orden del día para el médico
  // Preconsulta: signos vitales que se toman mientras el paciente
  // espera al médico. Todos opcionales (migración SQL_Preconsulta.txt).
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
  spo2?: number | null;
  peso_kg?: number | null;
  talla_cm?: number | null;
  preconsulta_enfermero?: string | null;
  preconsulta_at?: string | null;
  preconsulta_nota?: string | null;
  paciente?: {
    id: string;
    nombres: string;
    apellidos: string;
    documento: string;
    tipo: string;
    grado?: string | null;
    unidad?: string | null;
  } | null;
  medico?: {
    id: string;
    nombres: string;
    apellidos: string;
    especialidad: { nombre: string; color: string | null } | null;
  } | null;
}

export interface Medico {
  id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  user_id?: string | null;
  especialidad: { id: string; nombre: string; color: string | null } | null;
}

export interface CreateCitaInput {
  paciente_id: string;
  medico_id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  notas?: string | null;
  agendado_por?: string | null;
  sillon_id?: string | null;
}

const CITA_SELECT =
  "*, paciente:pacientes(id, nombres, apellidos, documento, tipo), medico:medicos(id, nombres, apellidos, especialidad:especialidades(nombre, color))";

/** Fecha local de hoy en formato yyyy-mm-dd. */
export function fechaHoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchCitasDelDia(fecha: string): Promise<Cita[]> {
  const { data, error } = await supabase
    .from("citas")
    .select(CITA_SELECT)
    .eq("fecha", fecha)
    .order("hora", { ascending: true });
  if (error) throw new Error(`Error al cargar las citas: ${error.message}`);
  return (data as unknown as Cita[]) || [];
}

export async function fetchCitasRango(desde: string, hasta: string): Promise<Cita[]> {
  const { data, error } = await supabase
    .from("citas")
    .select(CITA_SELECT)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .limit(5000);
  if (error) throw new Error(`Error al cargar las citas del rango: ${error.message}`);
  return (data as unknown as Cita[]) || [];
}

export function useCitasRango(desde: string, hasta: string) {
  return useQuery({
    queryKey: queryKeys.citas.rango(desde, hasta),
    queryFn: () => fetchCitasRango(desde, hasta),
    enabled: !!desde && !!hasta,
  });
}

export async function createCita(input: CreateCitaInput): Promise<Cita> {
  const { data, error } = await supabase
    .from("citas")
    .insert({ ...input, clinica_id: CLINICA_ID, estado: "Confirmada" })
    .select(CITA_SELECT)
    .single();
  if (error) throw new Error(`No se pudo agendar la cita: ${error.message}`);
  return data as unknown as Cita;
}

export async function cambiarEstadoCita(id: string, estado: EstadoCita): Promise<void> {
  const { error } = await supabase.from("citas").update({ estado }).eq("id", id);
  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`);
}

export async function reprogramarCita(id: string, fecha: string, hora: string): Promise<void> {
  const { error } = await supabase
    .from("citas")
    .update({ fecha, hora, estado: "pendiente", admitida_at: null, orden_llegada: null })
    .eq("id", id);
  if (error) throw new Error(`No se pudo reprogramar la cita: ${error.message}`);
}

/**
 * Check-in del paciente (botón «Admitir» estilo PY HIS): asigna el número de
 * orden del día para ese médico y deja la cita lista para ser atendida.
 */
export async function admitirCita(cita: Cita): Promise<void> {
  const { data, error: errMax } = await supabase
    .from("citas")
    .select("orden_llegada")
    .eq("fecha", cita.fecha)
    .eq("medico_id", cita.medico_id)
    .not("orden_llegada", "is", null)
    .order("orden_llegada", { ascending: false })
    .limit(1);
  if (errMax) throw new Error(`No se pudo calcular el orden de llegada: ${errMax.message}`);
  const siguiente = ((data?.[0]?.orden_llegada as number | undefined) ?? 0) + 1;

  const { error } = await supabase
    .from("citas")
    .update({ estado: "admitida", admitida_at: new Date().toISOString(), orden_llegada: siguiente })
    .eq("id", cita.id);
  if (error) throw new Error(`No se pudo admitir al paciente: ${error.message}`);
}

export interface PreconsultaInput {
  cita_id: string;
  enfermero?: string | null;
  nota?: string | null;
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
  spo2?: number | null;
  peso_kg?: number | null;
  talla_cm?: number | null;
}

/** True si faltan las columnas de la preconsulta (migración sin aplicar). */
export function faltaMigracionPreconsulta(error?: { code?: string; message?: string } | null): boolean {
  if (!error?.message) return false;
  if (error.code !== "PGRST204" && error.code !== "42703") return false;
  return /pa_sistolica|preconsulta_/.test(error.message);
}

/**
 * Guarda los signos vitales tomados antes de la atención.
 * Quedan en la propia cita: el médico los ve al atender, sin volver a
 * preguntarlos ni abrir una ficha de urgencias.
 */
export async function guardarPreconsulta(input: PreconsultaInput): Promise<void> {
  const { cita_id, enfermero, nota, ...signos } = input;
  const { error } = await supabase
    .from("citas")
    .update({
      ...signos,
      preconsulta_enfermero: enfermero ?? null,
      preconsulta_nota: nota ?? null,
      preconsulta_at: new Date().toISOString(),
    })
    .eq("id", cita_id);
  if (error) {
    if (faltaMigracionPreconsulta(error)) {
      throw new Error(
        "Falta aplicar la actualización de la base para la preconsulta " +
          "(archivo SQL_Preconsulta.txt del Escritorio). Avise al administrador."
      );
    }
    if (error.code === "23514") {
      throw new Error(
        "Hay un valor fuera de rango. Revise los signos vitales (por ejemplo, la temperatura o la saturación)."
      );
    }
    throw new Error(`No se pudieron guardar los signos vitales: ${error.message}`);
  }
}

/** True si la cita ya tiene los signos vitales cargados. */
export function tienePreconsulta(c: Cita): boolean {
  return !!(c.preconsulta_at || c.pa_sistolica || c.fc || c.temp || c.spo2 || c.fr);
}

/** Resumen en una línea de los signos tomados (solo los que hay). */
export function resumenPreconsulta(c: Cita): string | null {
  const partes: string[] = [];
  if (c.pa_sistolica || c.pa_diastolica) partes.push(`PA ${c.pa_sistolica ?? "—"}/${c.pa_diastolica ?? "—"}`);
  if (c.fc) partes.push(`FC ${c.fc}`);
  if (c.fr) partes.push(`FR ${c.fr}`);
  if (c.spo2) partes.push(`SpO2 ${c.spo2}%`);
  if (c.temp) partes.push(`T° ${c.temp}`);
  if (c.peso_kg) partes.push(`Peso ${c.peso_kg} kg`);
  if (c.talla_cm) partes.push(`Talla ${c.talla_cm} cm`);
  return partes.length ? partes.join(" · ") : null;
}

export async function fetchMedicosActivos(): Promise<Medico[]> {
  const { data, error } = await supabase
    .from("medicos")
    .select("id, nombres, apellidos, activo, especialidad:especialidades(id, nombre, color)")
    .eq("activo", true)
    .order("apellidos", { ascending: true });
  if (error) throw new Error(`Error al cargar los médicos: ${error.message}`);
  return (data as unknown as Medico[]) || [];
}

/** Ficha de médico vinculada a la cuenta logueada (medicos.user_id), si existe. */
export async function fetchMiMedico(userId: string): Promise<Medico | null> {
  const { data, error } = await supabase
    .from("medicos")
    .select("id, nombres, apellidos, activo, user_id, especialidad:especialidades(id, nombre, color)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Error al buscar la ficha del médico: ${error.message}`);
  return (data as unknown as Medico) || null;
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useCitasDelDia(fecha: string) {
  return useQuery({
    queryKey: queryKeys.citas.porDia(fecha),
    queryFn: () => fetchCitasDelDia(fecha),
    enabled: !!fecha,
  });
}

export function useGuardarPreconsulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardarPreconsulta,
    retry: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}

export function useMedicosActivos() {
  return useQuery({
    queryKey: queryKeys.medicos.list(),
    queryFn: fetchMedicosActivos,
  });
}

export function useMiMedico(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.medicos.mio(userId || ""),
    queryFn: () => fetchMiMedico(userId!),
    enabled: !!userId,
  });
}

export function useCreateCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCita,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}

export function useCambiarEstadoCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoCita }) => cambiarEstadoCita(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}

export function useAdmitirCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: admitirCita,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}

export function useReprogramarCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fecha, hora }: { id: string; fecha: string; hora: string }) =>
      reprogramarCita(id, fecha, hora),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}
