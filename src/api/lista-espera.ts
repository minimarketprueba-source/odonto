// ============================================================================
// Capa de datos: Lista de espera
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

export const PRIORIDADES = [
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
] as const;

export const ESTADOS_ESPERA = [
  { value: "esperando", label: "Esperando" },
  { value: "llamado", label: "Llamado" },
  { value: "atendido", label: "Atendido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export type PrioridadEspera = (typeof PRIORIDADES)[number]["value"];
export type EstadoEspera = (typeof ESTADOS_ESPERA)[number]["value"];

const ORDEN_PRIORIDAD: Record<string, number> = { urgente: 1, alta: 2, media: 3, baja: 4 };

export interface RegistroEspera {
  id: number;
  paciente_id: number;
  especialidad_id: number | null;
  medico_id: number | null;
  prioridad: PrioridadEspera | string;
  estado: EstadoEspera | string;
  motivo: string | null;
  notas: string | null;
  created_at: string;
  paciente?: { id: number; nombres: string; apellidos: string; documento: string } | null;
  especialidad?: { id: number; nombre: string; color: string | null } | null;
  medico?: { id: number; nombres: string; apellidos: string } | null;
}

export interface CreateEsperaInput {
  paciente_id: number;
  especialidad_id?: number | null;
  medico_id?: number | null;
  prioridad: PrioridadEspera;
  motivo?: string | null;
}

const ESPERA_SELECT =
  "*, paciente:pacientes(id, nombres, apellidos, documento), especialidad:especialidades(id, nombre, color), medico:medicos(id, nombres, apellidos)";

export async function fetchListaEspera(): Promise<RegistroEspera[]> {
  const { data, error } = await supabase
    .from("lista_espera")
    .select(ESPERA_SELECT)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(`Error al cargar la lista de espera: ${error.message}`);
  const registros = (data as unknown as RegistroEspera[]) || [];
  // Urgentes primero, y dentro de cada prioridad por orden de llegada.
  return registros.sort(
    (a, b) => (ORDEN_PRIORIDAD[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD[b.prioridad] ?? 9)
  );
}

export async function createRegistroEspera(input: CreateEsperaInput): Promise<void> {
  const { error } = await supabase
    .from("lista_espera")
    .insert({ ...input, clinica_id: CLINICA_ID, estado: "esperando" });
  if (error) throw new Error(`No se pudo agregar a la lista de espera: ${error.message}`);
}

export async function cambiarEstadoEspera(id: number, estado: EstadoEspera): Promise<void> {
  const { error } = await supabase.from("lista_espera").update({ estado }).eq("id", id);
  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`);
}

export function useListaEspera() {
  return useQuery({ queryKey: queryKeys.listaEspera.list(), queryFn: fetchListaEspera });
}

export function useCreateRegistroEspera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRegistroEspera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.listaEspera.all }),
  });
}

export function useCambiarEstadoEspera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoEspera }) => cambiarEstadoEspera(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.listaEspera.all }),
  });
}
