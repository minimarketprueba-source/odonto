// ============================================================================
// Capa de datos: Avisos del sistema (campanita)
// ============================================================================
// Los avisos los genera la base de datos. Hoy se usa para uno solo, importante:
// cuando una doctora carga un reposo, los administradores reciben el aviso de
// que ese cadete quedó exento de actividad física.
// Cada usuario solo ve y marca como leídos sus propios avisos (RLS).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { avisarEsquemaFaltante } from "@/lib/esquema";

export interface Notificacion {
  id: string;
  user_id: string;
  titulo: string | null;
  mensaje: string | null;
  tipo: string | null;
  leido: boolean;
  link: string | null;
  created_at: string;
}

export async function fetchNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  // La campanita nunca debe romper la app ni tapar la consola: si la tabla no
  // está todavía, se avisa una sola vez y se muestra vacía. Un error de verdad
  // (red, permisos) sí queda registrado.
  if (error) {
    if (!avisarEsquemaFaltante(error, "Avisos (campanita)")) {
      console.warn("No se pudieron cargar los avisos:", error.message);
    }
    return [];
  }
  return (data as Notificacion[]) || [];
}

export async function marcarLeida(id: string): Promise<void> {
  const { error } = await supabase.from("notificaciones").update({ leido: true }).eq("id", id);
  if (error) throw new Error(`No se pudo marcar el aviso: ${error.message}`);
}

export async function marcarTodasLeidas(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notificaciones").update({ leido: true }).in("id", ids);
  if (error) throw new Error(`No se pudieron marcar los avisos: ${error.message}`);
}

export function useNotificaciones() {
  return useQuery({
    queryKey: queryKeys.notificaciones.unread(),
    queryFn: fetchNotificaciones,
    // Un reposo cargado por otra persona debe aparecer sin recargar la página.
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarcarLeida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: marcarLeida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all }),
  });
}

export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all }),
  });
}
