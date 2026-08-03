// ============================================================================
// Capa de datos: Mantenimiento de catálogos (solo admins por RLS)
// ============================================================================
// Médicos, especialidades y códigos CIE-10.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

export interface Especialidad {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  activo: boolean;
}

export interface MedicoAdmin {
  id: number;
  nombres: string;
  apellidos: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  especialidad_id: number | null;
  numero_colegiatura: string | null;
  activo: boolean;
  user_id: string | null;
  especialidad?: { id: number; nombre: string } | null;
}

export interface CreateMedicoInput {
  nombres: string;
  apellidos: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  especialidad_id?: number | null;
  numero_colegiatura?: string | null;
  activo?: boolean;
}

// --- Especialidades ---

export async function fetchEspecialidades(): Promise<Especialidad[]> {
  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion, color, activo")
    .order("nombre");
  if (error) throw new Error(`Error al cargar especialidades: ${error.message}`);
  return data || [];
}

export async function createEspecialidad(nombre: string, color: string): Promise<void> {
  const { error } = await supabase
    .from("especialidades")
    .insert({ nombre, color, activo: true, clinica_id: CLINICA_ID });
  if (error) throw new Error(`No se pudo crear la especialidad: ${error.message}`);
}

export async function updateEspecialidad(id: number, cambios: Partial<Especialidad>): Promise<void> {
  const { error } = await supabase.from("especialidades").update(cambios).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la especialidad: ${error.message}`);
}

// --- Médicos ---

export async function fetchMedicosAdmin(): Promise<MedicoAdmin[]> {
  const { data, error } = await supabase
    .from("medicos")
    .select("*, especialidad:especialidades(id, nombre)")
    .order("apellidos");
  if (error) throw new Error(`Error al cargar médicos: ${error.message}`);
  return (data as unknown as MedicoAdmin[]) || [];
}

export async function createMedico(input: CreateMedicoInput): Promise<void> {
  const { error } = await supabase
    .from("medicos")
    .insert({ ...input, activo: input.activo ?? true, clinica_id: CLINICA_ID });
  if (error) throw new Error(`No se pudo registrar el médico: ${error.message}`);
}

export async function updateMedico(id: number, cambios: Partial<CreateMedicoInput>): Promise<void> {
  const { error } = await supabase.from("medicos").update(cambios).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar el médico: ${error.message}`);
}

// --- CIE-10 ---

export async function createCie10(codigo: string, descripcion: string, categoria: string | null): Promise<void> {
  const { error } = await supabase
    .from("cie10")
    .insert({ codigo, descripcion, categoria, activo: true, clinica_id: CLINICA_ID });
  if (error) throw new Error(`No se pudo agregar el código: ${error.message}`);
}

export async function countCie10(): Promise<number> {
  const { count, error } = await supabase.from("cie10").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Error al contar el catálogo: ${error.message}`);
  return count ?? 0;
}

// --- Hooks ---

export function useEspecialidades() {
  return useQuery({ queryKey: queryKeys.especialidades.list(), queryFn: fetchEspecialidades });
}

export function useMedicosAdmin() {
  return useQuery({ queryKey: queryKeys.medicos.admin(), queryFn: fetchMedicosAdmin });
}

export function useCountCie10() {
  return useQuery({ queryKey: queryKeys.cie10.count(), queryFn: countCie10 });
}

export function useMantenimientoMutation<TArgs>(fn: (args: TArgs) => Promise<void>, keys: readonly (readonly string[])[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k })),
  });
}
