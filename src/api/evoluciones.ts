import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EvolucionClinica {
  id: string;
  paciente_id: string;
  medico_id: string | null;
  cita_id: string | null;
  pieza: string | null;
  procedimiento: string | null;
  nota_clinica: string;
  fecha_registro: string;
  registrado_por: string | null;
  medico?: {
    nombres: string;
    apellidos: string;
    especialidad?: { nombre: string };
  };
}

export async function fetchEvoluciones(pacienteId: string): Promise<EvolucionClinica[]> {
  const { data, error } = await supabase
    .from("evoluciones_clinicas")
    .select("*, medico:medicos(nombres, apellidos, especialidad:especialidades(nombre))")
    .eq("paciente_id", pacienteId)
    .order("fecha_registro", { ascending: false });

  if (error) throw new Error(`Error cargando evoluciones: ${error.message}`);
  return data || [];
}

export async function createEvolucion(evolucion: Partial<EvolucionClinica>): Promise<EvolucionClinica> {
  const { data, error } = await supabase
    .from("evoluciones_clinicas")
    .insert(evolucion)
    .select()
    .single();

  if (error) throw new Error(`Error guardando evolución: ${error.message}`);
  return data;
}

export function useEvoluciones(pacienteId: string) {
  return useQuery({
    queryKey: ["evoluciones", pacienteId],
    queryFn: () => fetchEvoluciones(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCreateEvolucion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvolucion,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evoluciones", data.paciente_id] });
    },
  });
}
