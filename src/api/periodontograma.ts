// ============================================================================
// Capa de datos: periodontograma
// ============================================================================
// El registro periodontal completo de una sesión: por cada diente se sondean
// SEIS sitios (tres por vestibular y tres por palatino/lingual) y se anota la
// profundidad, la recesión, si sangra y si hay placa; por diente van la
// movilidad y la furca.
//
// Todo eso vive en `periodontogramas.datos_json`: son ~32 dientes × 6 sitios,
// y una tabla con una fila por sitio sería inmanejable de leer y de versionar.
// Cada guardado crea un registro NUEVO (no pisa el anterior), porque comparar
// el sondaje de hoy contra el de hace seis meses es justamente para lo que
// sirve un periodontograma.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { avisarEsquemaFaltante } from "@/lib/esquema";

/** Los seis sitios que se sondean por diente, en el orden en que se recorren. */
export const SITIOS = ["mv", "v", "dv", "mp", "p", "dp"] as const;
export type Sitio = (typeof SITIOS)[number];

export const NOMBRE_SITIO: Record<Sitio, string> = {
  mv: "Mesio-vestibular",
  v: "Vestibular",
  dv: "Disto-vestibular",
  mp: "Mesio-palatino/lingual",
  p: "Palatino/lingual",
  dp: "Disto-palatino/lingual",
};

/** Lo que se anota en cada uno de los seis sitios. */
export interface MedicionSitio {
  /** Profundidad de sondaje en mm (lo que entra la sonda). */
  ps?: number | null;
  /** Recesión gingival en mm; negativo si la encía está agrandada. */
  rec?: number | null;
  /** Sangrado al sondaje. */
  sangra?: boolean;
  /** Placa visible. */
  placa?: boolean;
  /** Supuración. */
  pus?: boolean;
}

/** Lo que se anota una vez por diente. */
export interface DatosDiente {
  sitios: Partial<Record<Sitio, MedicionSitio>>;
  /** Movilidad de Miller: 0 ninguna, 1 leve, 2 moderada, 3 severa. */
  movilidad?: number | null;
  /** Compromiso de furca: 0 a 3. */
  furca?: number | null;
  /** La pieza no está en boca. */
  ausente?: boolean;
  /** Implante en lugar de diente natural. */
  implante?: boolean;
}

export interface DatosPeriodontograma {
  dientes: Record<string, DatosDiente>;
}

export interface Periodontograma {
  id: number;
  paciente_id: string;
  medico_id: string | null;
  fecha: string;
  datos_json: DatosPeriodontograma;
  observaciones: string | null;
  created_at?: string;
  medico?: { nombres: string; apellidos: string } | null;
}

/**
 * Nivel de inserción clínica: profundidad de sondaje + recesión.
 *
 * Es la medida que de verdad dice cuánto soporte perdió el diente. Una bolsa
 * de 4 mm sin recesión y una de 4 mm con 3 mm de recesión se ven parecidas al
 * sondar, pero la segunda perdió casi el doble de inserción.
 */
export function calcularNIC(m?: MedicionSitio | null): number | null {
  if (!m || m.ps === null || m.ps === undefined) return null;
  return m.ps + (m.rec ?? 0);
}

export interface ResumenPeriodontal {
  /** Sitios con medición cargada. */
  sitiosMedidos: number;
  /** Porcentaje de sitios que sangran (índice de sangrado). */
  porcentajeSangrado: number;
  /** Porcentaje de sitios con placa. */
  porcentajePlaca: number;
  /** Bolsas de 4 y 5 mm. */
  bolsas4a5: number;
  /** Bolsas de 6 mm o más: las que suelen necesitar cirugía. */
  bolsas6omas: number;
  /** Profundidad promedio. */
  psPromedio: number;
  /** Dientes con movilidad 2 o 3. */
  dientesConMovilidad: number;
  dientesAusentes: number;
}

export function resumirPeriodontograma(datos: DatosPeriodontograma): ResumenPeriodontal {
  let sitiosMedidos = 0;
  let sangran = 0;
  let conPlaca = 0;
  let bolsas4a5 = 0;
  let bolsas6omas = 0;
  let sumaPs = 0;
  let dientesConMovilidad = 0;
  let dientesAusentes = 0;

  for (const diente of Object.values(datos.dientes ?? {})) {
    if (diente.ausente) {
      dientesAusentes += 1;
      continue; // Una pieza que no está en boca no entra en los porcentajes.
    }
    if ((diente.movilidad ?? 0) >= 2) dientesConMovilidad += 1;

    for (const sitio of Object.values(diente.sitios ?? {})) {
      if (sitio.ps === null || sitio.ps === undefined) continue;
      sitiosMedidos += 1;
      sumaPs += sitio.ps;
      if (sitio.sangra) sangran += 1;
      if (sitio.placa) conPlaca += 1;
      if (sitio.ps >= 6) bolsas6omas += 1;
      else if (sitio.ps >= 4) bolsas4a5 += 1;
    }
  }

  const pct = (n: number) => (sitiosMedidos ? Math.round((n / sitiosMedidos) * 100) : 0);

  return {
    sitiosMedidos,
    porcentajeSangrado: pct(sangran),
    porcentajePlaca: pct(conPlaca),
    bolsas4a5,
    bolsas6omas,
    psPromedio: sitiosMedidos ? Number((sumaPs / sitiosMedidos).toFixed(1)) : 0,
    dientesConMovilidad,
    dientesAusentes,
  };
}

export const periodoKeys = {
  all: ["periodontogramas"] as const,
  porPaciente: (pacienteId: string) => [...periodoKeys.all, pacienteId] as const,
};

export async function fetchPeriodontogramas(pacienteId: string): Promise<Periodontograma[]> {
  const { data, error } = await supabase
    .from("periodontogramas")
    .select("*, medico:medicos(nombres, apellidos)")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (avisarEsquemaFaltante(error, "Periodontograma")) return [];
    throw new Error(`No se pudo cargar el periodontograma: ${error.message}`);
  }
  return (data ?? []) as unknown as Periodontograma[];
}

export interface GuardarPeriodontogramaInput {
  pacienteId: string;
  medicoId?: string | null;
  fecha: string;
  datos: DatosPeriodontograma;
  observaciones?: string | null;
}

export async function guardarPeriodontograma(input: GuardarPeriodontogramaInput): Promise<Periodontograma> {
  const { data, error } = await supabase
    .from("periodontogramas")
    .insert({
      paciente_id: input.pacienteId,
      medico_id: input.medicoId ?? null,
      fecha: input.fecha,
      datos_json: input.datos,
      observaciones: input.observaciones ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar el periodontograma: ${error.message}`);
  return data as unknown as Periodontograma;
}

export function usePeriodontogramas(pacienteId: string) {
  return useQuery({
    queryKey: periodoKeys.porPaciente(pacienteId),
    queryFn: () => fetchPeriodontogramas(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useGuardarPeriodontograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardarPeriodontograma,
    // Sin reintento: un reintento sobre una respuesta perdida guardaría dos
    // veces el mismo sondaje y ensuciaría la comparación entre sesiones.
    retry: 0,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: periodoKeys.porPaciente(data.paciente_id) });
    },
  });
}
