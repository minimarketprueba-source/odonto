// ============================================================================
// Capa de datos: Agenda de citas médicas
// ============================================================================
// Tabla `citas` con joins a pacientes y medicos (PostgREST embedding por FK).
// Escritura protegida por RLS: solo personal de Sanidad activo.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

export const ESTADOS_CITA = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "admitida", label: "Admitida" },
  { value: "atendida", label: "Atendida" },
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

export interface Cita {
  id: number;
  clinica_id: number;
  paciente_id: number;
  medico_id: number;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm:ss
  estado: EstadoCita | string;
  motivo: string | null;
  notas: string | null;
  agendado_por: string | null; // email de quien agendó (registro estilo PY HIS)
  admitida_at: string | null; // cuándo llegó el paciente (check-in)
  orden_llegada: number | null; // nº de orden del día para el médico
  paciente?: {
    id: number;
    nombres: string;
    apellidos: string;
    documento: string;
    tipo: string;
  } | null;
  medico?: {
    id: number;
    nombres: string;
    apellidos: string;
    especialidad: { nombre: string; color: string | null } | null;
  } | null;
}

export interface Medico {
  id: number;
  nombres: string;
  apellidos: string;
  activo: boolean;
  user_id?: string | null;
  especialidad: { id: number; nombre: string; color: string | null } | null;
}

export interface CreateCitaInput {
  paciente_id: number;
  medico_id: number;
  fecha: string;
  hora: string;
  motivo?: string | null;
  notas?: string | null;
  agendado_por?: string | null;
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
    .insert({ ...input, clinica_id: CLINICA_ID, estado: "pendiente" })
    .select(CITA_SELECT)
    .single();
  if (error) throw new Error(`No se pudo agendar la cita: ${error.message}`);
  return data as unknown as Cita;
}

export async function cambiarEstadoCita(id: number, estado: EstadoCita): Promise<void> {
  const { error } = await supabase.from("citas").update({ estado }).eq("id", id);
  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`);
}

export async function reprogramarCita(id: number, fecha: string, hora: string): Promise<void> {
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
    mutationFn: ({ id, estado }: { id: number; estado: EstadoCita }) => cambiarEstadoCita(id, estado),
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
    mutationFn: ({ id, fecha, hora }: { id: number; fecha: string; hora: string }) =>
      reprogramarCita(id, fecha, hora),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.citas.all }),
  });
}
