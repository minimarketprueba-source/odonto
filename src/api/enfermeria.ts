// ============================================================================
// Capa de datos: Enfermería — observación / internación y signos vitales
// ============================================================================
// Todo se guarda en la base compartida: lo que carga la enfermera de un turno
// lo ve el turno siguiente y también las doctoras, desde cualquier computadora.
// Reglas garantizadas por la base (no solo por la pantalla):
//   · una cama no puede tener dos pacientes a la vez
//   · un paciente no puede estar internado en dos camas a la vez
//   · los signos vitales fuera de rango humano se rechazan

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID, type Paciente } from "./pacientes";

export type EstadoCama = "disponible" | "ocupada";
export type EstadoIngreso = "activo" | "alta" | "traslado";

export interface Sala {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
}

export interface Cama {
  id: number;
  sala_id: number;
  codigo: string;
  activa: boolean;
  fuera_de_servicio: boolean;
  sala?: { id: number; nombre: string } | null;
  /** Derivado: se calcula con las internaciones activas. */
  estado?: EstadoCama;
  sala_nombre?: string;
}

export interface SignoVital {
  id: number;
  internacion_id: number;
  registrado_por: string | null;
  tomado_at: string;
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  fc: number | null;
  fr: number | null;
  temp: number | null;
  spo2: number | null;
  glucemia: number | null;
  observaciones: string | null;
}

export interface Internacion {
  id: number;
  paciente_id: number;
  cama_id: number;
  medico_id: number | null;
  ingresado_por: string | null;
  fecha_ingreso: string;
  hora_ingreso: string;
  diagnostico_ingreso: string | null;
  cie10_id: number | null;
  motivo_observacion: string | null;
  enfermero_cargo: string | null;
  estado: EstadoIngreso;
  fecha_egreso: string | null;
  hora_egreso: string | null;
  motivo_egreso: string | null;
  egresado_por: string | null;
  created_at?: string;
  paciente?: Paciente | null;
  cama?: Cama | null;
  medico?: { id: number; nombres: string; apellidos: string } | null;
  cie10?: { id: number; codigo: string; descripcion: string } | null;
  signos_vitales?: SignoVital[];
}

const INTERNACION_SELECT =
  "*, paciente:pacientes(*), cama:camas(id, codigo, sala_id, sala:salas(id, nombre)), " +
  "medico:medicos(id, nombres, apellidos), cie10:cie10(id, codigo, descripcion)";

/** Mensajes claros para los choques que impide la base. */
function traducirError(error: { code?: string; message: string }, accion: string): Error {
  if (error.code === "23505") {
    if (error.message.includes("una_por_cama")) {
      return new Error(
        "Esa cama ya está ocupada por otro paciente. Actualice la pantalla para ver el estado real."
      );
    }
    if (error.message.includes("un_paciente_activo")) {
      return new Error("Ese paciente ya está internado en otra cama.");
    }
  }
  if (error.code === "23514") {
    return new Error(
      "Hay un valor fuera de rango. Revise los signos vitales (por ejemplo, la temperatura o la saturación)."
    );
  }
  return new Error(`${accion}: ${error.message}`);
}

// --- Salas y camas ---

export async function fetchSalas(): Promise<Sala[]> {
  const { data, error } = await supabase
    .from("salas")
    .select("id, nombre, descripcion, orden, activa")
    .eq("activa", true)
    .order("orden");
  if (error) throw new Error(`Error al cargar las salas: ${error.message}`);
  return data || [];
}

export async function fetchCamas(): Promise<Cama[]> {
  const { data, error } = await supabase
    .from("camas")
    .select("id, sala_id, codigo, activa, fuera_de_servicio, sala:salas(id, nombre)")
    .eq("activa", true)
    .order("codigo");
  if (error) throw new Error(`Error al cargar las camas: ${error.message}`);
  return ((data as unknown as Cama[]) || []).map((c) => ({
    ...c,
    sala_nombre: c.sala?.nombre ?? "",
  }));
}

// --- Internaciones ---

export async function fetchInternacionesActivas(): Promise<Internacion[]> {
  const { data, error } = await supabase
    .from("internaciones")
    .select(INTERNACION_SELECT)
    .eq("estado", "activo")
    .order("fecha_ingreso", { ascending: false })
    .order("hora_ingreso", { ascending: false });
  if (error) throw new Error(`Error al cargar las internaciones: ${error.message}`);
  const internaciones = (data as unknown as Internacion[]) || [];
  if (internaciones.length === 0) return [];

  // Los signos vitales de todas las internaciones activas, en una sola consulta.
  const { data: vitales, error: errVit } = await supabase
    .from("signos_vitales")
    .select("*")
    .in("internacion_id", internaciones.map((i) => i.id))
    .order("tomado_at", { ascending: false });
  if (errVit) throw new Error(`Error al cargar los signos vitales: ${errVit.message}`);

  const porInternacion = new Map<number, SignoVital[]>();
  for (const v of (vitales as SignoVital[]) || []) {
    const lista = porInternacion.get(v.internacion_id) || [];
    lista.push(v);
    porInternacion.set(v.internacion_id, lista);
  }
  return internaciones.map((i) => ({ ...i, signos_vitales: porInternacion.get(i.id) || [] }));
}

export interface IngresarPacienteInput {
  paciente_id: number;
  cama_id: number;
  medico_id?: number | null;
  ingresado_por?: string | null;
  fecha_ingreso: string;
  hora_ingreso: string;
  diagnostico_ingreso?: string | null;
  cie10_id?: number | null;
  motivo_observacion?: string | null;
  enfermero_cargo?: string | null;
}

export async function ingresarPaciente(input: IngresarPacienteInput): Promise<Internacion> {
  const { data, error } = await supabase
    .from("internaciones")
    .insert({ ...input, clinica_id: CLINICA_ID, estado: "activo" })
    .select(INTERNACION_SELECT)
    .single();
  if (error) throw traducirError(error, "No se pudo registrar el ingreso");
  return data as unknown as Internacion;
}

export interface RegistrarVitalesInput {
  internacion_id: number;
  registrado_por?: string | null;
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
  spo2?: number | null;
  glucemia?: number | null;
  observaciones?: string | null;
}

export async function registrarSignosVitales(input: RegistrarVitalesInput): Promise<SignoVital> {
  const { data, error } = await supabase
    .from("signos_vitales")
    .insert(input)
    .select()
    .single();
  if (error) throw traducirError(error, "No se pudieron registrar los signos vitales");
  return data as SignoVital;
}

export interface EgresoInput {
  internacion_id: number;
  motivo_egreso: string;
  estado_final: "alta" | "traslado";
  egresado_por?: string | null;
}

export async function egresarPaciente(input: EgresoInput): Promise<void> {
  const ahora = new Date();
  const { data, error } = await supabase
    .from("internaciones")
    .update({
      estado: input.estado_final,
      motivo_egreso: input.motivo_egreso,
      egresado_por: input.egresado_por ?? null,
      fecha_egreso: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
      hora_egreso: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
    })
    .eq("id", input.internacion_id)
    .eq("estado", "activo") // evita egresar dos veces la misma internación
    .select("id");
  if (error) throw traducirError(error, "No se pudo registrar el egreso");
  if (!data || data.length !== 1) {
    throw new Error("Ese paciente ya fue dado de alta. Actualice la pantalla.");
  }
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useSalas() {
  return useQuery({ queryKey: queryKeys.enfermeria.salas(), queryFn: fetchSalas });
}

export function useEnfermeriaCamas() {
  return useQuery({ queryKey: queryKeys.enfermeria.camas(), queryFn: fetchCamas });
}

export function useEnfermeriaIngresos() {
  return useQuery({
    queryKey: queryKeys.enfermeria.internaciones(),
    queryFn: fetchInternacionesActivas,
    // Varias personas trabajan sobre las mismas camas: conviene refrescar seguido.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.enfermeria.all });
}

export function useIngresarPacienteCama() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ingresarPaciente,
    retry: 0, // no reintentar: crearía una segunda internación
    onSuccess: () => invalidar(queryClient),
  });
}

export function useRegistrarSignosVitales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarSignosVitales,
    retry: 0,
    onSuccess: () => invalidar(queryClient),
  });
}

export function useEgresarPacienteCama() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: egresarPaciente,
    retry: 0,
    onSuccess: () => invalidar(queryClient),
  });
}
