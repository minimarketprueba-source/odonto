// ============================================================================
// Capa de datos: Recetas médicas
// ============================================================================
// recetas (cabecera con numero correlativo) + receta_items (medicamentos).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";
import { emitirConNumero, esConflictoDeNumero } from "./numeracion";

export interface RecetaItem {
  id?: number;
  medicamento: string;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  indicaciones: string | null;
}

export interface Receta {
  id: number;
  numero: string;
  paciente_id: number;
  medico_id: number;
  cita_id: number | null;
  fecha: string;
  diagnostico: string | null;
  indicaciones: string | null;
  notas: string | null;
  /** Receta anulada por el administrador: no se ve, pero no se borró. */
  anulada_at: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
  items?: RecetaItem[];
  medico?: { id: number; nombres: string; apellidos: string } | null;
}

export interface CreateRecetaInput {
  paciente_id: number;
  medico_id: number;
  fecha: string;
  diagnostico?: string | null;
  indicaciones?: string | null;
  items: RecetaItem[];
}

const RECETA_SELECT = "*, items:receta_items(*), medico:medicos(id, nombres, apellidos)";

export async function fetchRecetasPaciente(
  pacienteId: number,
  incluirAnuladas = false
): Promise<Receta[]> {
  let query = supabase
    .from("recetas")
    .select(RECETA_SELECT)
    .eq("paciente_id", pacienteId);
  if (!incluirAnuladas) query = query.is("anulada_at", null);
  const { data, error } = await query
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`Error al cargar las recetas: ${error.message}`);
  return (data as unknown as Receta[]) || [];
}

export async function createReceta(input: CreateRecetaInput): Promise<Receta> {
  const { items, ...cabecera } = input;

  // Correlativo sobre el último número emitido, incluidas las anuladas: una
  // receta anulada conserva el suyo, como en un talonario de papel. Si dos
  // profesionales guardan a la vez, se reintenta con el siguiente.
  const data = await emitirConNumero("recetas", "R", async (numero) => {
    const { data, error } = await supabase
      .from("recetas")
      .insert({ ...cabecera, numero, clinica_id: CLINICA_ID })
      .select()
      .single();
    if (error) {
      // El choque de números lo resuelve emitirConNumero reintentando.
      if (esConflictoDeNumero(error)) throw error;
      throw new Error(`No se pudo crear la receta: ${error.message}`);
    }
    return data;
  });

  const filas = items
    .filter((i) => i.medicamento.trim())
    .map((i) => ({ ...i, receta_id: data.id }));
  if (filas.length) {
    const { error: errorItems } = await supabase.from("receta_items").insert(filas);
    if (errorItems) throw new Error(`Receta creada pero falló un medicamento: ${errorItems.message}`);
  }
  return data as Receta;
}

export function useRecetasPaciente(pacienteId: number | null, incluirAnuladas = false) {
  return useQuery({
    queryKey: [...queryKeys.recetas.porPaciente(pacienteId ?? 0), incluirAnuladas],
    queryFn: () => fetchRecetasPaciente(pacienteId!, incluirAnuladas),
    enabled: !!pacienteId,
  });
}

export function useCreateReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReceta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recetas.all }),
  });
}
