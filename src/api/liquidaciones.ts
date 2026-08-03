import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Liquidacion {
  id: number;
  medico_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  total_produccion: number;
  comision_porcentaje: number;
  total_pagar: number;
  estado: "borrador" | "pagado";
  generado_por?: string | null;
  created_at: string;
  medico?: {
    nombres: string;
    apellidos: string;
    especialidad?: { nombre: string };
  };
}

export async function fetchLiquidaciones(): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from("liquidaciones_odontologos")
    .select("*, medico:medicos(nombres, apellidos, especialidad:especialidades(nombre))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error cargando liquidaciones: ${error.message}`);
  return data || [];
}

export async function createLiquidacion(liq: Partial<Liquidacion>): Promise<Liquidacion> {
  const { data, error } = await supabase
    .from("liquidaciones_odontologos")
    .insert(liq)
    .select()
    .single();

  if (error) throw new Error(`Error guardando liquidación: ${error.message}`);
  return data;
}

export async function marcarLiquidacionPagada(id: number): Promise<void> {
  const { error } = await supabase
    .from("liquidaciones_odontologos")
    .update({ estado: "pagado" })
    .eq("id", id);
    
  if (error) throw new Error(`Error al actualizar estado: ${error.message}`);
}

export function useLiquidaciones() {
  return useQuery({
    queryKey: ["liquidaciones"],
    queryFn: fetchLiquidaciones,
  });
}

export function useCreateLiquidacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLiquidacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] });
    },
  });
}

export function useMarcarLiquidacionPagada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: marcarLiquidacionPagada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] });
    },
  });
}
