import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Sillon {
  id: number;
  clinica_id: number;
  nombre: string;
  color: string;
  activo: boolean;
}

export async function fetchSillones(): Promise<Sillon[]> {
  const { data, error } = await supabase
    .from("sillones_dentales")
    .select("*")
    .eq("activo", true)
    .order("id", { ascending: true });
    
  if (error) {
    console.error("Error cargando sillones dentales:", error);
    return [];
  }
  return data || [];
}

export function useSillones() {
  return useQuery({
    queryKey: ["sillones"],
    queryFn: fetchSillones,
  });
}
