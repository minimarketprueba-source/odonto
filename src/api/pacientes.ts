// ============================================================================
// Capa de datos: Pacientes de la Sanidad
// ============================================================================
// Tabla `pacientes` (compartida con control de peso vía cadetes.paciente_id).
// Escritura protegida por RLS: solo personal de Sanidad activo.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

// Única institución (Clínica Central); heredado del esquema multi-clínica de Laravel.
export const CLINICA_ID = 1;

export const TIPOS_PACIENTE = [
  { value: "cadete", label: "Cadete" },
  { value: "oficial", label: "Oficial" },
  { value: "suboficial", label: "Suboficial" },
  { value: "personal", label: "Personal" },
  { value: "familiar", label: "Familiar / Civil" },
] as const;

export type TipoPaciente = (typeof TIPOS_PACIENTE)[number]["value"];

export interface Paciente {
  id: number;
  clinica_id: number;
  nombres: string;
  apellidos: string;
  documento: string;
  tipo: TipoPaciente | string;
  grado: string | null;
  promocion: string | null;
  unidad: string | null;
  fecha_nacimiento: string | null; // yyyy-mm-dd
  sexo: "M" | "F" | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePacienteInput {
  nombres: string;
  apellidos: string;
  documento: string;
  tipo: string;
  grado?: string | null;
  promocion?: string | null;
  unidad?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: "M" | "F" | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export async function fetchPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("apellidos", { ascending: true })
    .order("nombres", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`Error al cargar pacientes: ${error.message}`);
  return data || [];
}

export async function createPaciente(input: CreatePacienteInput): Promise<Paciente> {
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...input, clinica_id: CLINICA_ID, activo: input.activo ?? true })
    .select()
    .single();
  if (error) throw new Error(`No se pudo registrar el paciente: ${error.message}`);
  return data;
}

export async function updatePaciente(id: number, cambios: Partial<CreatePacienteInput>): Promise<Paciente> {
  const { data, error } = await supabase
    .from("pacientes")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`No se pudo actualizar el paciente: ${error.message}`);
  return data;
}

/** Soft-delete: el paciente queda inactivo, nunca se borra (tiene historia clínica). */
export async function desactivarPaciente(id: number): Promise<void> {
  const { error } = await supabase.from("pacientes").update({ activo: false }).eq("id", id);
  if (error) throw new Error(`No se pudo desactivar el paciente: ${error.message}`);
}

export async function reactivarPaciente(id: number): Promise<void> {
  const { error } = await supabase.from("pacientes").update({ activo: true }).eq("id", id);
  if (error) throw new Error(`No se pudo reactivar el paciente: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function usePacientes() {
  return useQuery({
    queryKey: queryKeys.pacientes.list(),
    queryFn: fetchPacientes,
  });
}

export function useCreatePaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPaciente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pacientes.all }),
  });
}

export function useUpdatePaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<CreatePacienteInput> }) =>
      updatePaciente(id, cambios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pacientes.all }),
  });
}

export function useCambiarEstadoPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo ? reactivarPaciente(id) : desactivarPaciente(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pacientes.all }),
  });
}
