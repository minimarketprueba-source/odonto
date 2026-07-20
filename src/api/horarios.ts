// ============================================================================
// Capa de datos: Horarios de atención y ausencias de los profesionales
// ============================================================================
// Tablas `horarios_medicos` (días/horas de atención semanales) y
// `ausencias_medicos` (vacaciones, permisos, reuniones). Lectura y escritura
// para personal de Sanidad activo (los enfermeros cargan los horarios de las
// médicas; cada profesional puede cargar el suyo).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";

// Coincide con Date.getDay(): 0 = domingo ... 6 = sábado.
export const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export interface Horario {
  id: number;
  medico_id: number;
  dia_semana: number;
  hora_inicio: string; // HH:mm:ss
  hora_fin: string;
}

export interface Ausencia {
  id: number;
  medico_id: number;
  desde: string; // yyyy-mm-dd
  hasta: string;
  motivo: string | null;
}

export interface CreateHorarioInput {
  medico_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface CreateAusenciaInput {
  medico_id: number;
  desde: string;
  hasta: string;
  motivo?: string | null;
}

// --- Horarios ---

export async function fetchHorarios(): Promise<Horario[]> {
  const { data, error } = await supabase
    .from("horarios_medicos")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin")
    .order("dia_semana")
    .order("hora_inicio");
  if (error) throw new Error(`Error al cargar los horarios: ${error.message}`);
  return data || [];
}

export async function createHorario(input: CreateHorarioInput): Promise<void> {
  const { error } = await supabase
    .from("horarios_medicos")
    .insert({ ...input, clinica_id: CLINICA_ID });
  if (error) throw new Error(`No se pudo guardar el horario: ${error.message}`);
}

export async function deleteHorario(id: number): Promise<void> {
  const { error } = await supabase.from("horarios_medicos").delete().eq("id", id);
  if (error) throw new Error(`No se pudo quitar el horario: ${error.message}`);
}

// --- Ausencias ---

export async function fetchAusencias(): Promise<Ausencia[]> {
  const { data, error } = await supabase
    .from("ausencias_medicos")
    .select("id, medico_id, desde, hasta, motivo")
    .order("desde", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Error al cargar las ausencias: ${error.message}`);
  return data || [];
}

export async function createAusencia(input: CreateAusenciaInput): Promise<void> {
  const { error } = await supabase
    .from("ausencias_medicos")
    .insert({ ...input, clinica_id: CLINICA_ID });
  if (error) throw new Error(`No se pudo guardar la ausencia: ${error.message}`);
}

export async function deleteAusencia(id: number): Promise<void> {
  const { error } = await supabase.from("ausencias_medicos").delete().eq("id", id);
  if (error) throw new Error(`No se pudo quitar la ausencia: ${error.message}`);
}

// --- Disponibilidad ---

export interface Disponibilidad {
  /** No hay horarios cargados para el médico: no se valida nada. */
  sinHorario: boolean;
  /** La fecha/hora cae fuera de los horarios de atención cargados. */
  fueraDeHorario: boolean;
  /** Motivo de la ausencia si la fecha cae dentro de una. */
  ausencia: string | null;
}

/** Evalúa si un médico atiende en la fecha/hora dadas según sus horarios y ausencias. */
export function evaluarDisponibilidad(
  medicoId: number,
  fecha: string,
  hora: string,
  horarios: Horario[],
  ausencias: Ausencia[]
): Disponibilidad {
  const propios = horarios.filter((h) => h.medico_id === medicoId);
  const enAusencia = ausencias.find(
    (a) => a.medico_id === medicoId && a.desde <= fecha && fecha <= a.hasta
  );
  const resultado: Disponibilidad = {
    sinHorario: propios.length === 0,
    fueraDeHorario: false,
    ausencia: enAusencia ? enAusencia.motivo || "Ausencia programada" : null,
  };
  if (propios.length > 0 && fecha && hora) {
    const dia = new Date(`${fecha}T00:00:00`).getDay();
    const horaNorm = hora.length === 5 ? `${hora}:00` : hora;
    const dentro = propios.some(
      (h) => h.dia_semana === dia && h.hora_inicio <= horaNorm && horaNorm < h.hora_fin
    );
    resultado.fueraDeHorario = !dentro;
  }
  return resultado;
}

// --- Hooks React Query ---

export function useHorarios() {
  return useQuery({ queryKey: queryKeys.horarios.list(), queryFn: fetchHorarios });
}

export function useAusencias() {
  return useQuery({ queryKey: queryKeys.ausencias.list(), queryFn: fetchAusencias });
}

export function useCreateHorario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHorario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.horarios.all }),
  });
}

export function useDeleteHorario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHorario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.horarios.all }),
  });
}

export function useCreateAusencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAusencia,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ausencias.all }),
  });
}

export function useDeleteAusencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAusencia,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ausencias.all }),
  });
}
