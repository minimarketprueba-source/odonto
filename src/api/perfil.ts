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

export interface PerfilProfesional {
  nombre: string | null;
  /** Número de registro profesional (colegiatura). */
  registro: string | null;
  /** Teléfono de contacto cargado en el perfil de la cuenta. */
  telefono: string | null;
}

/** Nombre y registro profesional de la cuenta, con null en lo no cargado. */
export async function fetchPerfilProfesional(userId: string): Promise<PerfilProfesional> {
  // 1) La ficha de médico: los 24 profesionales tienen ahí su nombre real
  //    y su número de colegiatura.
  const { data: medico } = await supabase
    .from("medicos")
    .select("nombres, apellidos, numero_colegiatura, telefono")
    .eq("user_id", userId)
    .maybeSingle();
  const deFicha = unirNombre(medico?.nombres, medico?.apellidos);
  if (deFicha) {
    return {
      nombre: deFicha,
      registro: (medico?.numero_colegiatura as string | null) ?? null,
      telefono: (medico?.telefono as string | null) ?? null,
    };
  }

  // 2) El perfil de la cuenta (enfermería y admin lo cargan desde Mi perfil).
  //    registro_profesional llega con SQL_Registro_Profesional.txt: si esa
  //    migración falta, se reintenta sin la columna para no perder el nombre.
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido, registro_profesional, telefono")
    .eq("id", userId)
    .maybeSingle();
  if (!error) {
    return {
      nombre: unirNombre(data?.nombre, data?.apellido),
      registro: (data?.registro_profesional as string | null)?.trim() || null,
      telefono: (data?.telefono as string | null)?.trim() || null,
    };
  }
  const { data: soloNombre, error: e2 } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", userId)
    .maybeSingle();
  // Un prellenado nunca debe romper un formulario: sin datos, campos vacíos.
  if (e2) return { nombre: null, registro: null, telefono: null };
  return {
    nombre: unirNombre(soloNombre?.nombre, soloNombre?.apellido),
    registro: null,
    telefono: null,
  };
}

function esColumnaFaltante(error: { code?: string; message?: string }, columna: string): boolean {
  return (error.code === "42703" || error.code === "PGRST204") &&
    !!error.message && error.message.includes(columna);
}

/**
 * Guarda los datos propios de la cuenta (Mi perfil): nombre, apellido,
 * registro profesional y teléfono.
 *
 * Si alguna columna todavía no existe en la base, se reintenta sin ella para
 * no perder lo demás, y se avisa qué migración falta.
 */
export async function guardarPerfilPropio(
  userId: string,
  nombre: string,
  apellido: string,
  registro: string,
  telefono?: string
): Promise<void> {
  const soloNombre = { nombre: nombre.trim() || null, apellido: apellido.trim() || null };
  const completo: Record<string, string | null> = {
    ...soloNombre,
    registro_profesional: registro.trim() || null,
  };
  if (telefono !== undefined) completo.telefono = telefono.trim() || null;

  let { error } = await supabase.from("profiles").update(completo).eq("id", userId);

  // Sin la columna del teléfono se guarda el resto igual: un dato de contacto
  // no debe impedir que se guarde el nombre con el que se firman documentos.
  if (error && esColumnaFaltante(error, "telefono")) {
    const sinTelefono = { ...completo };
    delete sinTelefono.telefono;
    ({ error } = await supabase.from("profiles").update(sinTelefono).eq("id", userId));
  }

  if (error && esColumnaFaltante(error, "registro_profesional")) {
    if (registro.trim()) {
      throw new Error(
        "Falta aplicar la actualización de la base para el registro profesional " +
          "(supabase/migrations/auth_roles_setup.sql). Avise al administrador."
      );
    }
    ({ error } = await supabase.from("profiles").update(soloNombre).eq("id", userId));
  }

  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      throw new Error(
        "Falta aplicar la actualización de la base para los datos de perfil " +
          "(supabase/migrations/auth_roles_setup.sql). Avise al administrador."
      );
    }
    throw new Error(`No se pudo guardar: ${error.message}`);
  }
}

/**
 * Cambia el correo con el que se entra al sistema.
 *
 * Supabase manda un enlace de confirmación al correo NUEVO y no lo aplica
 * hasta que se abre ese enlace: mientras tanto se sigue entrando con el
 * anterior. Por eso un error de tipeo no deja a nadie afuera.
 */
export async function cambiarCorreoPropio(nuevoCorreo: string): Promise<void> {
  const correo = nuevoCorreo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error("Ese correo no parece válido.");
  }

  const { error } = await supabase.auth.updateUser({ email: correo });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new Error("Ya hay otra cuenta con ese correo.");
    }
    throw new Error(`No se pudo cambiar el correo: ${error.message}`);
  }
}

export function usePerfilProfesional(user: User | null | undefined) {
  return useQuery({
    queryKey: queryKeys.perfil.nombre(user?.id ?? ""),
    queryFn: async (): Promise<PerfilProfesional> => {
      const perfil = await fetchPerfilProfesional(user!.id);
      if (perfil.nombre) return perfil;
      // Respaldo: los datos que se guardaron al crear la cuenta.
      const meta = (user!.user_metadata ?? {}) as Record<string, unknown>;
      return { nombre: unirNombre(meta.nombre, meta.apellido), registro: perfil.registro, telefono: perfil.telefono };
    },
    enabled: !!user?.id,
    // Los datos propios no cambian durante la sesión (se invalida al guardarlos).
    staleTime: Infinity,
  });
}
