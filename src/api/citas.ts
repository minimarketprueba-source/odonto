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
  { value: "atendida", label: "Atendida" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export type EstadoCita = (typeof ESTADOS_CITA)[number]["value"];

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
  especialidad: { id: number; nombre: string; color: string | null } | null;
}

export interface CreateCitaInput {
  paciente_id: number;
  medico_id: number;
  fecha: string;
  hora: string;
  motivo?: string | null;
  notas?: string | null;
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
  const { error } = await supabase.from("citas").update({ fecha, hora, estado: "pendiente" }).eq("id", id);
  if (error) throw new Error(`No se pudo reprogramar la cita: ${error.message}`);
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
