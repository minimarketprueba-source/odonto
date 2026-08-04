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
import { insertarProcedimientos, type NuevoProcedimiento } from "./procedimientos";

export type ReposoTipo = "local" | "domiciliario";

/** Conducta con la que termina la atención (la misma lista del papel de RAC). */
export type DestinoAtencion =
  | "alta"
  | "sin_servicio"
  | "enfermo_local"
  | "reposo_domiciliario"
  | "internacion";

/**
 * Destinos posibles y qué reposo genera cada uno.
 *
 * "Parte sin servicio" también exime de la actividad física: se usa para quien
 * no está en condiciones de hacer ejercicio, aunque siga en su puesto. Por eso
 * va como reposo local.
 */
export const DESTINOS_ATENCION: {
  value: DestinoAtencion;
  label: string;
  /** Si pide cantidad de días. `alta` no pide. */
  pideDias: boolean;
  /** Reposo que se guarda en la consulta (null = ninguno). */
  reposo: ReposoTipo | null;
}[] = [
  { value: "alta", label: "Alta", pideDias: false, reposo: null },
  { value: "sin_servicio", label: "Parte sin servicio", pideDias: true, reposo: "local" },
  { value: "enfermo_local", label: "Enfermo local", pideDias: true, reposo: "local" },
  { value: "reposo_domiciliario", label: "Reposo domiciliario", pideDias: true, reposo: "domiciliario" },
  { value: "internacion", label: "Internación", pideDias: true, reposo: "local" },
];

export function destinoAtencion(destino?: string | null) {
  return DESTINOS_ATENCION.find((d) => d.value === destino) ?? null;
}

/**
 * Cómo mostrar la conducta de una consulta. Las consultas anteriores a la
 * columna `destino` no la tienen: para esas se deduce del reposo.
 */
export function labelDestinoAtencion(
  destino?: string | null,
  reposoTipo?: ReposoTipo | null
): string {
  const d = destinoAtencion(destino);
  if (d) return d.label;
  if (reposoTipo === "domiciliario") return "Reposo domiciliario";
  if (reposoTipo === "local") return "Enfermo local";
  return "Alta";
}

export interface Consulta {
  id: number;
  clinica_id: string;
  paciente_id: number;
  medico_id: string;
  cita_id: number | null;
  fecha: string; // yyyy-mm-dd
  motivo_consulta: string | null;
  examen_fisico: string | null;
  cie10_id: number | null;
  diagnostico: string | null;
  tratamiento: string | null;
  /** Conducta final. null en las consultas viejas, anteriores a la columna. */
  destino: DestinoAtencion | null;
  reposo_tipo: ReposoTipo | null;   // null = sin reposo
  reposo_desde: string | null;      // yyyy-mm-dd (por defecto la fecha de la consulta)
  reposo_hasta: string | null;      // yyyy-mm-dd inclusive; null = hasta nueva orden
  /** Consulta anulada por el administrador: no se ve ni cuenta, pero no se borró. */
  anulada_at: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
  created_at?: string;
  updated_at?: string;
  cita?: { id: number; hora: string } | null;
  medico?: {
    id: number;
    nombres: string;
    apellidos: string;
    especialidad: { nombre: string; color: string | null } | null;
  } | null;
  cie10?: { id: number; codigo: string; descripcion: string } | null;
  procedimientos?: import("./procedimientos").ProcedimientoSanitario[];
}

export interface Cie10 {
  id: number;
  codigo: string;
  descripcion: string;
}

export interface CreateConsultaInput {
  paciente_id: number;
  medico_id: string;
  cita_id?: string | null;
  fecha: string;
  motivo_consulta?: string | null;
  examen_fisico?: string | null;
  cie10_id?: number | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  destino?: DestinoAtencion | null;
  reposo_tipo?: ReposoTipo | null;
  reposo_desde?: string | null;
  reposo_hasta?: string | null;
  procedimientos?: NuevoProcedimiento[];
}

const CONSULTA_SELECT =
  "*, medico:medicos(id, nombres, apellidos, especialidad:especialidades(nombre, color)), cie10:cie10(id, codigo, descripcion), cita:citas(id, hora), procedimientos:procedimientos_sanitarios(*)";

export async function fetchConsultasPaciente(
  pacienteId: number,
  incluirAnuladas = false
): Promise<Consulta[]> {
  let query = supabase
    .from("consultas")
    .select(CONSULTA_SELECT)
    .eq("paciente_id", pacienteId);
  if (!incluirAnuladas) query = query.is("anulada_at", null);
  const { data, error } = await query
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`Error al cargar la historia clínica: ${error.message}`);
  return (data as unknown as Consulta[]) || [];
}

export async function createConsulta(input: CreateConsultaInput): Promise<Consulta> {
  const { procedimientos, ...consultaInput } = input;
  const { data, error } = await supabase
    .from("consultas")
    .insert({ ...consultaInput, clinica_id: CLINICA_ID })
    .select(CONSULTA_SELECT)
    .single();
  if (error) throw new Error(`No se pudo registrar la consulta: ${error.message}`);
  // La cita asociada queda atendida (si falla, la consulta ya quedó registrada
  // y el estado puede corregirse a mano en la agenda).
  if (input.cita_id) {
    await cambiarEstadoCita(input.cita_id, "atendida");
  }
  const procedimientosGuardados = await insertarProcedimientos(procedimientos ?? [], { paciente_id: input.paciente_id, fecha: input.fecha, consulta_id: (data as { id: number }).id });
  return { ...(data as unknown as Consulta), procedimientos: procedimientosGuardados };
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

export function useConsultasPaciente(pacienteId: number | null, incluirAnuladas = false) {
  return useQuery({
    // El flag va en la clave: si no, al pedir las anuladas se devolvería la caché sin ellas.
    queryKey: [...queryKeys.consultas.porPaciente(pacienteId ?? 0), incluirAnuladas],
    queryFn: () => fetchConsultasPaciente(pacienteId!, incluirAnuladas),
    enabled: !!pacienteId,
  });
}

export interface AtencionRegistro {
  paciente_id: number;
  fecha: string;
  medico_id: string;
}

/** Todas las atenciones (paciente + fecha + profesional), para estadísticas y filtros. */
export async function fetchAtenciones(): Promise<AtencionRegistro[]> {
  // Las anuladas no cuentan como atenciones: se filtran en la base, no en
  // memoria, para que el límite no descarte atenciones reales.
  const { data, error } = await supabase
    .from("consultas")
    .select("paciente_id, fecha, medico_id")
    .is("anulada_at", null)
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
    retry: 0, // no reintentar: crearía una segunda consulta en la historia clínica
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
    },
  });
}
