// ============================================================================
// Capa de datos: Pacientes de la Sanidad
// ============================================================================
// Tabla `pacientes` (compartida con control de peso vía cadetes.paciente_id).
// No son solo cadetes: la Sanidad también atiende policías, familiares y
// civiles. OJO: el vínculo con control de peso se apoya en que cada persona
// tenga UNA sola ficha, así que todo script que vincule cadetes con pacientes
// debe filtrar por `tipo = 'cadete'`.
// Escritura protegida por RLS: solo personal de Sanidad activo.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

// Única institución (Clínica Central); heredado del esquema multi-clínica de Laravel.
export const CLINICA_ID = 1;

export const TIPOS_PACIENTE = [
  { value: "cadete", label: "Cadete" },
  { value: "policia", label: "Policía" },
  { value: "familiar", label: "Familiar" },
  { value: "civil", label: "Civil" },
] as const;

/** Tipos que ya no se ofrecen pero pueden existir en fichas viejas. */
const TIPOS_PACIENTE_LEGACY: Record<string, string> = {
  oficial: "Oficial",
  suboficial: "Suboficial",
  personal: "Personal",
};

/** Etiqueta legible de un tipo de paciente (nunca muestra el valor crudo). */
export function labelTipoPaciente(tipo: string): string {
  return (
    TIPOS_PACIENTE.find((t) => t.value === tipo)?.label ??
    TIPOS_PACIENTE_LEGACY[tipo] ??
    tipo
  );
}

/** Estos tipos no pertenecen a la Academia: no se les piden curso ni sección. */
export function esPacienteExterno(tipo: string): boolean {
  return tipo === "familiar" || tipo === "civil";
}

export type TipoPaciente = (typeof TIPOS_PACIENTE)[number]["value"];

export interface Paciente {
  id: number;
  clinica_id: number;
  nombres: string;
  apellidos: string;
  /** Puede ser null: un familiar menor de edad todavía no tiene cédula propia. */
  documento: string | null;
  tipo: TipoPaciente | string;
  grado: string | null;
  promocion: string | null;
  unidad: string | null;
  /** Solo para tipo "familiar": nombre y CI del policía o cadete titular. */
  familiar_de: string | null;
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
  documento?: string | null;
  tipo: string;
  grado?: string | null;
  promocion?: string | null;
  unidad?: string | null;
  familiar_de?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: "M" | "F" | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

/** Mensaje claro cuando la base rechaza una cédula ya registrada. */
function mensajeError(error: { code?: string; message: string }, accion: string): Error {
  if (error.code === "23505") {
    return new Error(
      "Ya existe un paciente con esa cédula. Búsquelo en el listado (puede estar dado de baja) y use esa ficha."
    );
  }
  return new Error(`${accion}: ${error.message}`);
}

export async function fetchPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("apellidos", { ascending: true })
    .order("nombres", { ascending: true })
    .limit(5000);
  if (error) throw new Error(`Error al cargar pacientes: ${error.message}`);
  return data || [];
}

export async function createPaciente(input: CreatePacienteInput): Promise<Paciente> {
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...input, clinica_id: CLINICA_ID, activo: input.activo ?? true })
    .select()
    .single();
  if (error) throw mensajeError(error, "No se pudo registrar el paciente");
  return data;
}

export async function updatePaciente(id: number, cambios: Partial<CreatePacienteInput>): Promise<Paciente> {
  const { data, error } = await supabase
    .from("pacientes")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw mensajeError(error, "No se pudo actualizar el paciente");
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
    // Sin reintento: si la respuesta se pierde con el alta ya hecha, el reintento
    // del cliente crearía una segunda ficha de la misma persona.
    retry: 0,
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
