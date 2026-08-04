// ============================================================================
// Capa de datos: Mantenimiento de catálogos (solo admins por RLS)
// ============================================================================
// Médicos, especialidades y códigos CIE-10.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

// Los identificadores de la base son UUID (texto), no números. Decían `number`
// por herencia del esquema anterior: el valor que llegaba en tiempo de
// ejecución era un UUID igual, así que el tipo mentía sin dar error.
export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  activo: boolean;
}

export interface MedicoAdmin {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  especialidad_id: string | null;
  numero_colegiatura: string | null;
  activo: boolean;
  user_id: string | null;
  especialidad?: { id: string; nombre: string } | null;
}

export interface CreateMedicoInput {
  nombres: string;
  apellidos: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  especialidad_id?: string | null;
  numero_colegiatura?: string | null;
  activo?: boolean;
  /** Cuenta con la que entra al sistema (`auth.users.id`). Ver CuentaVinculable. */
  user_id?: string | null;
}

/** Una cuenta del sistema, para poder vincularla con la ficha del profesional. */
export interface CuentaVinculable {
  id: string;
  email: string;
  nombre: string | null;
  rol: string | null;
  /** Nombre de la ficha que ya la tiene tomada, si la hay. */
  tomadaPor: string | null;
}

/**
 * Cuentas que se pueden vincular a una ficha de profesional.
 *
 * La ficha (`medicos`) y la cuenta de acceso (`auth.users`) son cosas
 * distintas: la ficha es quién atiende y firma, la cuenta es con qué entra.
 * `medicos.user_id` las une, y de ese vínculo dependen dos cosas: que la firma
 * de los documentos quede fija en la persona correcta y que cada profesional
 * pueda corregir su propia ficha desde «Mi perfil».
 */
export async function fetchCuentasVinculables(): Promise<CuentaVinculable[]> {
  const [{ data: perfiles, error: errPerfiles }, { data: roles }, { data: fichas }] =
    await Promise.all([
      supabase.from("profiles").select("id, email, nombre, apellido").order("email"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("medicos").select("user_id, nombres, apellidos").not("user_id", "is", null),
    ]);
  if (errPerfiles) throw new Error(`No se pudieron cargar las cuentas: ${errPerfiles.message}`);

  const rolPorCuenta = new Map((roles ?? []).map((r) => [r.user_id, r.role as string | null]));
  const fichaPorCuenta = new Map(
    (fichas ?? []).map((f) => [f.user_id as string, `${f.apellidos ?? ""}, ${f.nombres ?? ""}`.trim()])
  );

  return (perfiles ?? []).map((p) => ({
    id: p.id as string,
    email: (p.email as string) ?? "sin correo",
    nombre: [p.nombre, p.apellido].filter(Boolean).join(" ") || null,
    rol: rolPorCuenta.get(p.id as string) ?? null,
    tomadaPor: fichaPorCuenta.get(p.id as string) ?? null,
  }));
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

export async function updateEspecialidad(id: string, cambios: Partial<Especialidad>): Promise<void> {
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

export async function updateMedico(id: string, cambios: Partial<CreateMedicoInput>): Promise<void> {
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

export function useCuentasVinculables(habilitado = true) {
  return useQuery({
    queryKey: [...queryKeys.medicos.all, "cuentas"],
    queryFn: fetchCuentasVinculables,
    enabled: habilitado,
  });
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
