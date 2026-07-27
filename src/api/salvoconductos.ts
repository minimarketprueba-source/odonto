// ============================================================================
// Capa de datos: Salvoconductos médicos
// ============================================================================
// Autorización de traslado de un paciente fuera de la Academia: al Hospital de
// Policía "Rigoberto Caballero", a estudios médicos o a donde indique el
// profesional tratante. Lo expide el médico o la enfermera de turno.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

// `label` es lo que se ve en la lista desplegable (corto, para que no estire el
// formulario); `oficial` es el nombre completo que sale impreso en el documento.
export const DESTINOS_SALVOCONDUCTO = [
  {
    value: "hospital_policia",
    label: "Hospital de Policía",
    oficial: 'Hospital de Policía "Rigoberto Caballero"',
  },
  { value: "estudios", label: "Estudios médicos", oficial: "Estudios médicos / laboratorio" },
  { value: "otro", label: "Otro destino", oficial: "Otro destino" },
] as const;

export type DestinoSalvoconducto = (typeof DESTINOS_SALVOCONDUCTO)[number]["value"];

/** Texto del destino tal como sale impreso en el documento. */
export function labelDestino(destino: string, detalle?: string | null): string {
  const d = DESTINOS_SALVOCONDUCTO.find((x) => x.value === destino);
  const base = d?.oficial ?? destino;
  if (destino === "otro") return detalle?.trim() || base;
  if (destino === "estudios" && detalle?.trim()) return `${base} — ${detalle.trim()}`;
  return base;
}

export interface Salvoconducto {
  id: number;
  numero: string;
  paciente_id: number;
  medico_id: number | null;
  expedido_por: string | null;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm:ss
  destino: DestinoSalvoconducto | string;
  destino_detalle: string | null;
  motivo: string | null;
  urgente: boolean;
  acompanante: string | null;
  retorno_fecha: string | null;
  retorno_hora: string | null;
  anulado_at: string | null;
  anulado_por: string | null;
  created_at?: string;
  paciente?: {
    id: number; nombres: string; apellidos: string; documento: string | null;
    tipo: string; grado: string | null; promocion: string | null; unidad: string | null;
  } | null;
  medico?: {
    id: number; nombres: string; apellidos: string;
    especialidad: { nombre: string } | null;
  } | null;
}

export interface CreateSalvoconductoInput {
  paciente_id: number;
  medico_id?: number | null;
  expedido_por?: string | null;
  fecha: string;
  hora: string;
  destino: string;
  destino_detalle?: string | null;
  motivo?: string | null;
  urgente?: boolean;
  acompanante?: string | null;
  retorno_fecha?: string | null;
  retorno_hora?: string | null;
}

const SELECT =
  "*, paciente:pacientes(id, nombres, apellidos, documento, tipo, grado, promocion, unidad), " +
  "medico:medicos(id, nombres, apellidos, especialidad:especialidades(nombre))";

export async function fetchSalvoconductosPaciente(pacienteId: number): Promise<Salvoconducto[]> {
  const { data, error } = await supabase
    .from("salvoconductos")
    .select(SELECT)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`Error al cargar los salvoconductos: ${error.message}`);
  return (data as unknown as Salvoconducto[]) || [];
}

export async function fetchSalvoconductosDelDia(fecha: string): Promise<Salvoconducto[]> {
  const { data, error } = await supabase
    .from("salvoconductos")
    .select(SELECT)
    .eq("fecha", fecha)
    .order("hora", { ascending: false });
  if (error) throw new Error(`Error al cargar los salvoconductos del día: ${error.message}`);
  return (data as unknown as Salvoconducto[]) || [];
}

export async function createSalvoconducto(input: CreateSalvoconductoInput): Promise<Salvoconducto> {
  // Número correlativo simple (institución única), igual que las recetas.
  const { count, error: errorCount } = await supabase
    .from("salvoconductos")
    .select("id", { count: "exact", head: true });
  if (errorCount) throw new Error(`No se pudo numerar el salvoconducto: ${errorCount.message}`);
  const numero = `SC-${String((count ?? 0) + 1).padStart(5, "0")}`;

  const { data, error } = await supabase
    .from("salvoconductos")
    .insert({ ...input, numero, clinica_id: CLINICA_ID })
    .select(SELECT)
    .single();
  if (error) throw new Error(`No se pudo expedir el salvoconducto: ${error.message}`);
  return data as unknown as Salvoconducto;
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useSalvoconductosPaciente(pacienteId: number | null) {
  return useQuery({
    queryKey: queryKeys.salvoconductos.porPaciente(pacienteId ?? 0),
    queryFn: () => fetchSalvoconductosPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useSalvoconductosDelDia(fecha: string) {
  return useQuery({
    queryKey: queryKeys.salvoconductos.porDia(fecha),
    queryFn: () => fetchSalvoconductosDelDia(fecha),
    enabled: !!fecha,
  });
}

export function useCreateSalvoconducto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSalvoconducto,
    // Sin reintento: evita expedir dos veces el mismo salvoconducto si se
    // pierde la respuesta con el documento ya guardado.
    retry: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.salvoconductos.all }),
  });
}
