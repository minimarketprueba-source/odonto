import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

export const TIPOS_PROCEDIMIENTO = [
  { value: "sutura", label: "Sutura" },
  { value: "electrocardiograma", label: "Electrocardiograma" },
  { value: "curacion", label: "Curación" },
  { value: "nebulizacion", label: "Nebulización" },
  { value: "lavado_otico", label: "Lavado ótico" },
  { value: "lavado_gastrico", label: "Lavado gástrico" },
  { value: "inyeccion", label: "Inyección / medicación" },
  { value: "inmovilizacion", label: "Inmovilización" },
  { value: "extraccion_cuerpo_extrano", label: "Extracción de cuerpo extraño" },
  { value: "otro", label: "Otro" },
] as const;

export type TipoProcedimiento = (typeof TIPOS_PROCEDIMIENTO)[number]["value"] | string;
export interface NuevoProcedimiento { tipo: TipoProcedimiento; cantidad: number; detalle?: string | null; }
export interface ProcedimientoSanitario extends NuevoProcedimiento {
  id?: number; clinica_id?: string; paciente_id?: number; consulta_id?: number | null;
  atencion_enfermeria_id?: number | null; fecha: string; created_at?: string;
}

export function labelTipoProcedimiento(tipo: string) {
  return TIPOS_PROCEDIMIENTO.find((p) => p.value === tipo)?.label ?? tipo;
}

export async function insertarProcedimientos(
  procedimientos: NuevoProcedimiento[],
  parent: { paciente_id: number; fecha: string; consulta_id?: number; atencion_enfermeria_id?: number }
): Promise<ProcedimientoSanitario[]> {
  if (!procedimientos.length) return [];
  const rows = procedimientos.map((p) => ({
    paciente_id: parent.paciente_id, fecha: parent.fecha, tipo: p.tipo,
    cantidad: p.cantidad, detalle: p.detalle || null,
    ...(parent.consulta_id ? { consulta_id: parent.consulta_id } : {}),
    ...(parent.atencion_enfermeria_id ? { atencion_enfermeria_id: parent.atencion_enfermeria_id } : {}),
  }));
  const { data, error } = await supabase.from("procedimientos_sanitarios").insert(rows).select("*");
  if (error) throw new Error(`No se pudieron guardar los procedimientos: ${error.message}`);
  return (data ?? []) as ProcedimientoSanitario[];
}

export async function fetchProcedimientosPaciente(pacienteId: number): Promise<ProcedimientoSanitario[]> {
  const { data, error } = await supabase.from("procedimientos_sanitarios").select("*")
    .eq("paciente_id", pacienteId).order("fecha", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error(`No se pudo cargar el historial de procedimientos: ${error.message}`);
  return (data ?? []) as ProcedimientoSanitario[];
}

export function useProcedimientosPaciente(pacienteId: number | null) {
  return useQuery({ queryKey: queryKeys.procedimientos.porPaciente(pacienteId ?? 0), queryFn: () => fetchProcedimientosPaciente(pacienteId!), enabled: !!pacienteId });
}
