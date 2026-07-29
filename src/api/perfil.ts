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

/** Nombre y apellido de la cuenta, o null si no están cargados en ningún lado. */
export async function fetchNombrePerfil(userId: string): Promise<string | null> {
  // 1) La ficha de médico: los 24 profesionales tienen ahí su nombre real.
  const { data: medico } = await supabase
    .from("medicos")
    .select("nombres, apellidos")
    .eq("user_id", userId)
    .maybeSingle();
  const deFicha = unirNombre(medico?.nombres, medico?.apellidos);
  if (deFicha) return deFicha;

  // 2) El perfil de la cuenta (enfermería y admin lo cargan desde Mi perfil).
  //    Las columnas nombre/apellido llegan con SQL_Nombres_Perfiles.txt: si la
  //    migración no está aplicada, el error se ignora y queda el respaldo.
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", userId)
    .maybeSingle();
  // Un prellenado nunca debe romper un formulario: sin nombre, campo vacío.
  if (error) return null;
  return unirNombre(data?.nombre, data?.apellido);
}

/**
 * Guarda el nombre propio en el perfil de la cuenta (Mi perfil). Requiere las
 * columnas de SQL_Nombres_Perfiles.txt; sin ellas devuelve un error claro.
 */
export async function guardarNombrePerfil(
  userId: string,
  nombre: string,
  apellido: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ nombre: nombre.trim() || null, apellido: apellido.trim() || null })
    .eq("id", userId);
  if (error) {
    if (error.code === "42703" || /nombre|apellido/.test(error.message)) {
      throw new Error(
        "Falta aplicar la actualización de la base para los nombres de perfil " +
          "(archivo SQL_Nombres_Perfiles.txt del Escritorio). Avise al administrador."
      );
    }
    throw new Error(`No se pudo guardar el nombre: ${error.message}`);
  }
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
