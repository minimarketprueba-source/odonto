// ============================================================================
// Capa de datos: Ficha de RAC (Recepción, Acogida y Clasificación) — urgencias
// ============================================================================
// Reproduce la ficha en papel de la Academia, en cuatro etapas que llenan
// personas distintas en momentos distintos:
//   1. Admisión   → quien recibe al paciente
//   2. Enfermería → signos vitales y triaje (4 niveles MSPBS)
//   3. Médico     → evaluación clínica
//   4. Destino    → alta / sin servicio / enfermo local / reposo / internación
//
// Al cerrar la ficha se crea la consulta en la historia clínica: así el reposo
// sigue alimentando la exención de actividad física de Control de Peso, y el
// diagnóstico no queda encerrado en un registro aparte.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID, type Paciente } from "./pacientes";
import {
  createConsulta, DESTINOS_ATENCION, labelDestinoAtencion, type DestinoAtencion,
} from "./consultas";

export type NivelTriaje = "rojo" | "amarillo" | "verde" | "azul";
/** Los destinos son los mismos que los de una consulta común. */
export type DestinoRac = DestinoAtencion;
export type EstadoRac = "espera" | "atendida";

/** Los 4 niveles del MSPBS, del más grave al menos grave. */
export const NIVELES_TRIAJE: {
  value: NivelTriaje;
  label: string;
  espera: string;
  /** Clases Tailwind literales: las dinámicas no compilan. */
  clase: string;
  hex: string;
}[] = [
  {
    value: "rojo",
    label: "Rojo — Emergencia",
    espera: "Atención inmediata",
    clase: "bg-red-600 text-white border-red-700",
    hex: "#dc2626",
  },
  {
    value: "amarillo",
    label: "Amarillo — Urgencia",
    espera: "Hasta 30 minutos",
    clase: "bg-yellow-400 text-yellow-950 border-yellow-500",
    hex: "#facc15",
  },
  {
    value: "verde",
    label: "Verde — Menos urgente",
    espera: "Hasta 2 horas",
    clase: "bg-green-600 text-white border-green-700",
    hex: "#16a34a",
  },
  {
    value: "azul",
    label: "Azul — No urgente",
    espera: "Hasta 4 horas",
    clase: "bg-blue-600 text-white border-blue-700",
    hex: "#2563eb",
  },
];

export function triaje(nivel?: string | null) {
  return NIVELES_TRIAJE.find((n) => n.value === nivel) ?? null;
}

/** Orden de atención: primero el más grave, después el que llegó antes. */
const PESO_TRIAJE: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2, azul: 3 };

export const DESTINOS_RAC = DESTINOS_ATENCION;

export function labelDestino(destino?: string | null): string {
  return destino ? labelDestinoAtencion(destino) : "—";
}

export interface FichaRac {
  id: number;
  clinica_id: number;
  numero: number;
  paciente_id: number;
  fecha: string;

  hora_admision: string;
  admitida_por: string | null;
  jerarquia: string | null;
  domicilio: string | null;
  barrio_compania: string | null;
  localidad: string | null;
  referencia_domiciliaria: string | null;
  telefono: string | null;

  hora_enfermeria: string | null;
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  fc: number | null;
  fr: number | null;
  spo2: number | null;
  temp: number | null;
  motivo_consulta: string | null;
  discriminante: string | null;
  triaje: NivelTriaje | null;
  enfermero: string | null;

  hora_medico: string | null;
  medico_id: number | null;
  patologia_previa: string | null;
  alergias: string | null;
  examen_fisico: string | null;
  laboratorio: string | null;
  radiologia: string | null;
  diagnostico: string | null;
  cie10_id: number | null;
  tratamiento: string | null;
  evolucion: string | null;
  plan: string | null;

  hora_destino: string | null;
  destino: DestinoRac | null;
  destino_dias: number | null;
  consulta_id: number | null;
  internacion_id: number | null;

  estado: EstadoRac;
  anulada_at: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
  created_at?: string;
  updated_at?: string;

  paciente?: Paciente | null;
  medico?: { id: number; nombres: string; apellidos: string } | null;
  cie10?: { id: number; codigo: string; descripcion: string } | null;
}

const RAC_SELECT =
  "*, paciente:pacientes(*), medico:medicos(id, nombres, apellidos), " +
  "cie10:cie10(id, codigo, descripcion)";

/** N° visible de la ficha: RAC-00001. */
export function numeroRac(numero: number): string {
  return `RAC-${String(numero).padStart(5, "0")}`;
}

/** La tabla se crea en una actualización aparte de la base. */
function mensajeError(error: { code?: string; message: string }, accion: string): Error {
  if (error.code === "42P01" || error.message.includes("fichas_rac")) {
    return new Error(
      "Falta aplicar la actualización de la base para las fichas de RAC. Avise al administrador."
    );
  }
  if (error.code === "23514") {
    return new Error(
      "Hay un valor fuera de rango. Revise los signos vitales (temperatura, saturación, pulso)."
    );
  }
  return new Error(`${accion}: ${error.message}`);
}

// --- Lecturas ---------------------------------------------------------------

export async function fetchFichasRac(desde: string, hasta: string): Promise<FichaRac[]> {
  const { data, error } = await supabase
    .from("fichas_rac")
    .select(RAC_SELECT)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .is("anulada_at", null)
    .order("fecha", { ascending: false })
    .order("hora_admision", { ascending: false });
  if (error) throw mensajeError(error, "Error al cargar las fichas de RAC");
  const fichas = (data as unknown as FichaRac[]) || [];
  // En espera: primero el más grave; ya atendidas: la más reciente arriba.
  return fichas.sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === "espera" ? -1 : 1;
    if (a.estado === "espera") {
      const dif = (PESO_TRIAJE[a.triaje ?? "azul"] ?? 9) - (PESO_TRIAJE[b.triaje ?? "azul"] ?? 9);
      if (dif !== 0) return dif;
      return a.hora_admision.localeCompare(b.hora_admision);
    }
    return 0;
  });
}

export async function fetchFichasRacPaciente(pacienteId: number): Promise<FichaRac[]> {
  const { data, error } = await supabase
    .from("fichas_rac")
    .select(RAC_SELECT)
    .eq("paciente_id", pacienteId)
    .is("anulada_at", null)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw mensajeError(error, "Error al cargar las fichas de RAC");
  return (data as unknown as FichaRac[]) || [];
}

// --- Etapas 1 y 2: admisión + enfermería ------------------------------------

export interface AbrirFichaRacInput {
  paciente_id: number;
  fecha: string;
  hora_admision: string;
  admitida_por?: string | null;
  jerarquia?: string | null;
  domicilio?: string | null;
  barrio_compania?: string | null;
  localidad?: string | null;
  referencia_domiciliaria?: string | null;
  telefono?: string | null;
  hora_enfermeria?: string | null;
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  spo2?: number | null;
  temp?: number | null;
  motivo_consulta?: string | null;
  discriminante?: string | null;
  triaje?: NivelTriaje | null;
  enfermero?: string | null;
}

export async function abrirFichaRac(input: AbrirFichaRacInput): Promise<FichaRac> {
  const { data, error } = await supabase
    .from("fichas_rac")
    .insert({ ...input, clinica_id: CLINICA_ID, estado: "espera" })
    .select(RAC_SELECT)
    .single();
  if (error) throw mensajeError(error, "No se pudo abrir la ficha de RAC");
  return data as unknown as FichaRac;
}

export async function actualizarFichaRac(
  id: number,
  cambios: Partial<AbrirFichaRacInput>
): Promise<FichaRac> {
  const { data, error } = await supabase
    .from("fichas_rac")
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(RAC_SELECT)
    .single();
  if (error) throw mensajeError(error, "No se pudo actualizar la ficha de RAC");
  return data as unknown as FichaRac;
}

// --- Etapas 3 y 4: médico + destino -----------------------------------------

export interface CerrarFichaRacInput {
  id: number;
  paciente_id: number;
  fecha: string;
  hora_medico: string;
  medico_id: number;
  patologia_previa?: string | null;
  alergias?: string | null;
  examen_fisico?: string | null;
  laboratorio?: string | null;
  radiologia?: string | null;
  diagnostico?: string | null;
  cie10_id?: number | null;
  tratamiento?: string | null;
  evolucion?: string | null;
  plan?: string | null;
  hora_destino: string;
  destino: DestinoRac;
  destino_dias?: number | null;
  motivo_consulta?: string | null;
  /** Internación ya registrada en Enfermería, si el destino fue internación. */
  internacion_id?: number | null;
}

/** Último día de reposo, contando el primero: 1 día = el mismo día. */
export function fechaHastaReposo(desde: string, dias: number): string {
  const [y, m, d] = desde.split("-").map(Number);
  const fin = new Date(y, m - 1, d + Math.max(1, dias) - 1);
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;
}

/**
 * Cierra la ficha: primero registra la consulta en la historia clínica y
 * recién después marca la ficha como atendida. En ese orden a propósito —
 * si la consulta falla, la ficha queda en espera y se puede reintentar; al
 * revés quedaría una atención sin registro clínico.
 */
export async function cerrarFichaRac(input: CerrarFichaRacInput): Promise<FichaRac> {
  const destino = DESTINOS_RAC.find((d) => d.value === input.destino);
  const dias = input.destino_dias ?? 0;
  const conReposo = !!destino?.reposo && dias > 0;

  const consulta = await createConsulta({
    paciente_id: input.paciente_id,
    medico_id: input.medico_id,
    fecha: input.fecha,
    motivo_consulta: input.motivo_consulta ?? null,
    examen_fisico: input.examen_fisico ?? null,
    cie10_id: input.cie10_id ?? null,
    diagnostico: input.diagnostico ?? null,
    tratamiento: input.tratamiento ?? null,
    destino: input.destino,
    reposo_tipo: conReposo ? destino!.reposo : null,
    reposo_desde: conReposo ? input.fecha : null,
    reposo_hasta: conReposo ? fechaHastaReposo(input.fecha, dias) : null,
  });

  const { data, error } = await supabase
    .from("fichas_rac")
    .update({
      hora_medico: input.hora_medico,
      medico_id: input.medico_id,
      patologia_previa: input.patologia_previa ?? null,
      alergias: input.alergias ?? null,
      examen_fisico: input.examen_fisico ?? null,
      laboratorio: input.laboratorio ?? null,
      radiologia: input.radiologia ?? null,
      diagnostico: input.diagnostico ?? null,
      cie10_id: input.cie10_id ?? null,
      tratamiento: input.tratamiento ?? null,
      evolucion: input.evolucion ?? null,
      plan: input.plan ?? null,
      hora_destino: input.hora_destino,
      destino: input.destino,
      destino_dias: destino?.pideDias ? input.destino_dias ?? null : null,
      consulta_id: consulta.id,
      internacion_id: input.internacion_id ?? null,
      estado: "atendida",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("estado", "espera") // evita cerrarla dos veces desde dos computadoras
    .select(RAC_SELECT)
    .maybeSingle();
  if (error) throw mensajeError(error, "La consulta quedó registrada, pero no se pudo cerrar la ficha");
  if (!data) {
    // Otra computadora la cerró entre medio. La consulta ya existe: hay que
    // avisarlo para que el administrador anule la que sobra.
    throw new Error(
      "Otra persona cerró esta ficha mientras usted la completaba. La consulta que acaba " +
      "de registrar quedó en la historia clínica: revísela y pida al administrador que " +
      "anule la que esté repetida."
    );
  }
  return data as unknown as FichaRac;
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useFichasRac(desde: string, hasta: string) {
  return useQuery({
    queryKey: queryKeys.rac.rango(desde, hasta),
    queryFn: () => fetchFichasRac(desde, hasta),
    // Varias personas trabajan sobre la misma sala de urgencias.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useFichasRacPaciente(pacienteId: number | null) {
  return useQuery({
    queryKey: queryKeys.rac.porPaciente(pacienteId ?? 0),
    queryFn: () => fetchFichasRacPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.rac.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.enfermeria.all });
}

export function useAbrirFichaRac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: abrirFichaRac,
    retry: 0, // un reintento abriría una segunda ficha del mismo paciente
    onSuccess: () => invalidar(queryClient),
  });
}

export function useActualizarFichaRac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<AbrirFichaRacInput> }) =>
      actualizarFichaRac(id, cambios),
    onSuccess: () => invalidar(queryClient),
  });
}

export function useCerrarFichaRac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cerrarFichaRac,
    retry: 0, // un reintento crearía una segunda consulta
    onSuccess: () => invalidar(queryClient),
  });
}
