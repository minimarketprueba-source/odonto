// ============================================================================
// Capa de datos: Consultas médicas (historia clínica)
// ============================================================================
// Tabla `consultas`. Al registrar una consulta desde una cita, la cita pasa a
// estado "atendida". El catálogo CIE-10 (tabla `cie10`) es opcional y puede
// estar vacío hasta que se cargue en mantenimiento.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";
import { cambiarEstadoCita } from "./citas";

export type ReposoTipo = "local" | "domiciliario";

export interface Consulta {
  id: number;
  clinica_id: number;
  paciente_id: number;
  medico_id: number;
  cita_id: number | null;
  fecha: string; // yyyy-mm-dd
  motivo_consulta: string | null;
  examen_fisico: string | null;
  cie10_id: number | null;
  diagnostico: string | null;
  tratamiento: string | null;
  reposo_tipo: ReposoTipo | null;   // null = sin reposo
  reposo_desde: string | null;      // yyyy-mm-dd (por defecto la fecha de la consulta)
  reposo_hasta: string | null;      // yyyy-mm-dd inclusive; null = hasta nueva orden
  created_at?: string;
  cita?: { id: number; hora: string } | null;
  medico?: {
    id: number;
    nombres: string;
    apellidos: string;
    especialidad: { nombre: string; color: string | null } | null;
  } | null;
  cie10?: { id: number; codigo: string; descripcion: string } | null;
}

export interface Cie10 {
  id: number;
  codigo: string;
  descripcion: string;
}

export interface CreateConsultaInput {
  paciente_id: number;
  medico_id: number;
  cita_id?: number | null;
  fecha: string;
  motivo_consulta?: string | null;
  examen_fisico?: string | null;
  cie10_id?: number | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  reposo_tipo?: ReposoTipo | null;
  reposo_desde?: string | null;
  reposo_hasta?: string | null;
}

const CONSULTA_SELECT =
  "*, medico:medicos(id, nombres, apellidos, especialidad:especialidades(nombre, color)), cie10:cie10(id, codigo, descripcion), cita:citas(id, hora)";

export async function fetchConsultasPaciente(pacienteId: number): Promise<Consulta[]> {
  const { data, error } = await supabase
    .from("consultas")
    .select(CONSULTA_SELECT)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`Error al cargar la historia clínica: ${error.message}`);
  return (data as unknown as Consulta[]) || [];
}

export async function createConsulta(input: CreateConsultaInput): Promise<Consulta> {
  const { data, error } = await supabase
    .from("consultas")
    .insert({ ...input, clinica_id: CLINICA_ID })
    .select(CONSULTA_SELECT)
    .single();
  if (error) throw new Error(`No se pudo registrar la consulta: ${error.message}`);
  // La cita asociada queda atendida (si falla, la consulta ya quedó registrada
  // y el estado puede corregirse a mano en la agenda).
  if (input.cita_id) {
    await cambiarEstadoCita(input.cita_id, "atendida");
  }
  return data as unknown as Consulta;
}

export async function searchCie10(q: string): Promise<Cie10[]> {
  // Una sola palabra busca en código y descripción; varias palabras deben
  // aparecer todas en la descripción ("fractura tibia" → "Fractura de la
  // diáfisis de la tibia"), sin exigir la frase exacta.
  const palabras = q.trim().split(/\s+/).filter(Boolean);
  let query = supabase
    .from("cie10")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo")
    .limit(35);
  if (palabras.length <= 1) {
    query = query.or(`codigo.ilike.%${palabras[0] ?? q}%,descripcion.ilike.%${palabras[0] ?? q}%`);
  } else {
    for (const palabra of palabras) {
      query = query.ilike("descripcion", `%${palabra}%`);
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(`Error al buscar en CIE-10: ${error.message}`);
  return data || [];
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useConsultasPaciente(pacienteId: number | null) {
  return useQuery({
    queryKey: queryKeys.consultas.porPaciente(pacienteId ?? 0),
    queryFn: () => fetchConsultasPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export interface AtencionRegistro {
  paciente_id: number;
  fecha: string;
}

/** Todas las atenciones (paciente + fecha), para estadísticas y filtros. */
export async function fetchAtenciones(): Promise<AtencionRegistro[]> {
  const { data, error } = await supabase
    .from("consultas")
    .select("paciente_id, fecha")
    .order("fecha", { ascending: false })
    .limit(10000);
  if (error) throw new Error(`Error al cargar las atenciones: ${error.message}`);
  return (data || []) as AtencionRegistro[];
}

export function useAtenciones(enabled = true) {
  return useQuery({
    queryKey: queryKeys.consultas.registros(),
    queryFn: fetchAtenciones,
    enabled,
  });
}

/** Última fecha de consulta de cada paciente (para el filtro «atendidos» del padrón). */
export async function fetchUltimasAtenciones(): Promise<Record<number, string>> {
  const registros = await fetchAtenciones();
  const ultimas: Record<number, string> = {};
  for (const c of registros) {
    if (!ultimas[c.paciente_id]) ultimas[c.paciente_id] = c.fecha; // viene ordenado: la primera es la más reciente
  }
  return ultimas;
}

export function useUltimasAtenciones(enabled = true) {
  return useQuery({
    queryKey: queryKeys.consultas.atenciones(),
    queryFn: fetchUltimasAtenciones,
    enabled,
  });
}

export function useSearchCie10(q: string) {
  return useQuery({
    queryKey: queryKeys.cie10.search(q),
    queryFn: () => searchCie10(q),
    enabled: q.trim().length >= 2,
  });
}

export function useCreateConsulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConsulta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
    },
  });
}
