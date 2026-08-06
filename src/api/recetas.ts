// ============================================================================
// Capa de datos: Recetas odontológicas
// ============================================================================
// recetas (cabecera con número correlativo) + receta_items (medicamentos).
//
// Los ids son UUID, no números. El archivo original venía del sistema médico
// del que se clonó esto y los declaraba `number`; con eso la receta nunca
// habría podido guardarse, porque Postgres rechaza un número donde espera un
// UUID ("invalid input syntax for type uuid"). Nunca convertir un id con
// Number() ni parseInt(): comparar con String(a) === String(b).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { CLINICA_ID } from "./pacientes";
import { emitirConNumero, esConflictoDeNumero } from "./numeracion";
import { esTablaInexistente } from "@/lib/esquema";

/**
 * Mensaje único para cuando las tablas todavía no están creadas.
 *
 * No se degrada a lista vacía a propósito: una pantalla de recetas que dice
 * "este paciente no tiene recetas" cuando en realidad no puede leerlas es
 * indistinguible de una que funciona, y acá lo que se pierde es medicación
 * indicada. Mejor que se vea el problema.
 */
export const FALTA_MIGRACION_RECETAS =
  "Las recetas todavía no están habilitadas en la base de datos. " +
  "Hay que aplicar 'supabase/migrations/recetas.sql' en el SQL Editor de Supabase.";

export function faltaMigracionRecetas(error: unknown): boolean {
  return (error as Error)?.message === FALTA_MIGRACION_RECETAS;
}

export interface RecetaItem {
  id?: string;
  medicamento: string;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  indicaciones: string | null;
  orden?: number;
}

export interface Receta {
  id: string;
  numero: string;
  paciente_id: string;
  medico_id: string | null;
  cita_id: string | null;
  fecha: string;
  diagnostico: string | null;
  indicaciones: string | null;
  notas: string | null;
  /** Receta anulada: no se borra, conserva su número como el talonario. */
  anulada_at: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
  created_at?: string;
  items?: RecetaItem[];
  medico?: {
    id: string;
    nombres: string;
    apellidos: string;
    numero_colegiatura: string | null;
  } | null;
}

export interface CreateRecetaInput {
  paciente_id: string;
  medico_id: string;
  cita_id?: string | null;
  fecha: string;
  diagnostico?: string | null;
  indicaciones?: string | null;
  notas?: string | null;
  registrado_por?: string | null;
  items: RecetaItem[];
}

const RECETA_SELECT =
  "*, items:receta_items(*), medico:medicos(id, nombres, apellidos, numero_colegiatura)";

export async function fetchRecetasPaciente(
  pacienteId: string,
  incluirAnuladas = false
): Promise<Receta[]> {
  let query = supabase
    .from("recetas")
    .select(RECETA_SELECT)
    .eq("paciente_id", pacienteId);
  if (!incluirAnuladas) query = query.is("anulada_at", null);
  const { data, error } = await query
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (esTablaInexistente(error)) throw new Error(FALTA_MIGRACION_RECETAS);
  if (error) throw new Error(`Error al cargar las recetas: ${error.message}`);

  // Los medicamentos vienen sin orden garantizado desde PostgREST; se ordenan
  // acá para que la pantalla y el impreso los muestren como se cargaron.
  const recetas = (data as unknown as Receta[]) || [];
  for (const r of recetas) {
    r.items?.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }
  return recetas;
}

export async function createReceta(input: CreateRecetaInput): Promise<Receta> {
  const { items, ...cabecera } = input;

  const medicamentos = items.filter((i) => i.medicamento.trim());
  if (!medicamentos.length) {
    throw new Error("La receta necesita al menos un medicamento.");
  }

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
      if (esTablaInexistente(error)) throw new Error(FALTA_MIGRACION_RECETAS);
      throw new Error(`No se pudo crear la receta: ${error.message}`);
    }
    return data;
  });

  const filas = medicamentos.map((item, i) => ({
    receta_id: data.id,
    medicamento: item.medicamento.trim(),
    dosis: item.dosis,
    frecuencia: item.frecuencia,
    duracion: item.duracion,
    indicaciones: item.indicaciones,
    orden: i,
  }));

  const { error: errorItems } = await supabase.from("receta_items").insert(filas);
  if (errorItems) {
    // La cabecera quedó guardada y los medicamentos no: una receta vacía con
    // número emitido es peor que ninguna, así que se deshace y el número se
    // libera para el siguiente intento.
    await supabase.from("recetas").delete().eq("id", data.id);
    throw new Error(`No se pudo guardar la medicación: ${errorItems.message}`);
  }

  return data as Receta;
}

/**
 * Anula una receta equivocada. No la borra: conserva el número y queda a la
 * vista de quién y por qué, que es lo que permite explicar después un salto en
 * el correlativo.
 */
export async function anularReceta(
  recetaId: string,
  motivo: string,
  anuladaPor: string | null
): Promise<void> {
  const { error } = await supabase
    .from("recetas")
    .update({
      anulada_at: new Date().toISOString(),
      anulada_por: anuladaPor,
      motivo_anulacion: motivo.trim() || null,
    })
    .eq("id", recetaId);
  if (error) throw new Error(`No se pudo anular la receta: ${error.message}`);
}

export function useRecetasPaciente(pacienteId: string | null, incluirAnuladas = false) {
  return useQuery({
    queryKey: [...queryKeys.recetas.porPaciente(pacienteId ?? ""), incluirAnuladas],
    queryFn: () => fetchRecetasPaciente(pacienteId!, incluirAnuladas),
    enabled: !!pacienteId,
  });
}

export function useCreateReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReceta,
    // retry: 0 — reintentar emitiría una segunda receta con otro número.
    retry: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recetas.all }),
  });
}

export function useAnularReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recetaId,
      motivo,
      anuladaPor,
    }: {
      recetaId: string;
      motivo: string;
      anuladaPor: string | null;
    }) => anularReceta(recetaId, motivo, anuladaPor),
    retry: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recetas.all }),
  });
}
