// ============================================================================
// Capa de datos: nombre real de la cuenta logueada
// ============================================================================
// Para prellenar "quién atiende" en los formularios de enfermería con el
// nombre y apellido de la persona (tabla `profiles`), en vez del usuario de
// la cuenta ("llopez"). Es solo un prellenado: el campo queda editable porque
// en una computadora compartida puede atender alguien con otra sesión abierta.

import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

function unirNombre(nombre?: unknown, apellido?: unknown): string | null {
  const partes = [nombre, apellido]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
  return partes.length ? partes.join(" ") : null;
}

/** Nombre y apellido de la cuenta, o null si el perfil no los tiene cargados. */
export async function fetchNombrePerfil(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", userId)
    .maybeSingle();
  // Un prellenado nunca debe romper un formulario: sin nombre, campo vacío.
  if (error) return null;
  return unirNombre(data?.nombre, data?.apellido);
}

export function useNombrePerfil(user: User | null | undefined) {
  return useQuery({
    queryKey: queryKeys.perfil.nombre(user?.id ?? ""),
    queryFn: async () => {
      const deTabla = await fetchNombrePerfil(user!.id);
      if (deTabla) return deTabla;
      // Respaldo: los datos que se guardaron al crear la cuenta.
      const meta = (user!.user_metadata ?? {}) as Record<string, unknown>;
      return unirNombre(meta.nombre, meta.apellido);
    },
    enabled: !!user?.id,
    // El nombre propio no cambia durante la sesión.
    staleTime: Infinity,
  });
}
