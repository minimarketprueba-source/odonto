// ============================================================================
// Capa de datos: las empresas del sistema (solo el dueño del sistema)
// ============================================================================
// Todo pasa por funciones de la base (multiempresa.sql) que comprueban que
// quien llama es dueño. El dueño crea empresas y les da administrador, pero
// NO ve sus pacientes: para eso tendría que ser miembro de la empresa.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseAnonKey, getSupabaseUrl, supabase } from "@/lib/supabase";
import { MIN_CONTRASENA, AVISO_CONTRASENA_CORTA } from "@/lib/contrasena";
import { normalizarColor } from "@/lib/clinica";

export interface EmpresaDelSistema {
  clinica_id: string;
  nombre: string;
  nombre_corto: string;
  created_at: string | null;
  personas: number;
  administradores: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
  icono_url?: string | null;
  color_primario?: string;
}

const clave = ["empresas-del-sistema"] as const;

export async function listarEmpresas(): Promise<EmpresaDelSistema[]> {
  const [{ data: rpcData, error: rpcError }, { data: clinicasData }] = await Promise.all([
    supabase.rpc("listar_empresas"),
    supabase
      .from("clinicas")
      .select("id, nombre, nombre_corto, ruc, direccion, telefono, email, logo_url, icono_url, color_primario"),
  ]);

  if (rpcError) throw new Error(`No se pudieron cargar las empresas: ${rpcError.message}`);
  const base = (rpcData as EmpresaDelSistema[]) ?? [];

  interface ClinicaFila {
    id: string;
    nombre?: string;
    nombre_corto?: string;
    ruc?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    logo_url?: string | null;
    icono_url?: string | null;
    color_primario?: string | null;
  }

  const clinicasMap = new Map<string, ClinicaFila>(
    ((clinicasData as ClinicaFila[]) ?? []).map((c) => [c.id, c])
  );

  return base.map((e) => {
    const c = clinicasMap.get(e.clinica_id);
    return {
      ...e,
      ruc: c?.ruc ?? null,
      direccion: c?.direccion ?? null,
      telefono: c?.telefono ?? null,
      email: c?.email ?? null,
      logo_url: c?.logo_url ?? null,
      icono_url: c?.icono_url ?? null,
      color_primario: c?.color_primario ?? "#0e7490",
    };
  });
}

export interface ActualizarEmpresaPorIdInput {
  clinicaId: string;
  nombre: string;
  nombre_corto?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
  icono_url?: string | null;
  color_primario?: string | null;
}

export async function actualizarEmpresaPorId(input: ActualizarEmpresaPorIdInput): Promise<void> {
  if (!input.nombre.trim()) {
    throw new Error("El nombre de la empresa no puede quedar vacío.");
  }
  const { error } = await supabase
    .from("clinicas")
    .update({
      nombre: input.nombre.trim(),
      nombre_corto: input.nombre_corto?.trim() || null,
      ruc: input.ruc?.trim() || null,
      direccion: input.direccion?.trim() || null,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      logo_url: input.logo_url || null,
      icono_url: input.icono_url || null,
      color_primario: normalizarColor(input.color_primario),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.clinicaId);

  if (error) throw new Error(`No se pudieron guardar los datos: ${error.message}`);
}

/**
 * Permite al dueño del sistema ingresar y cambiar la empresa activa para trabajar
 * en ella como administrador.
 */
export async function entrarAEmpresa(clinicaId: string, emailUsuario?: string | null): Promise<void> {
  if (emailUsuario) {
    try {
      await supabase.rpc("agregar_a_empresa", {
        p_clinica: clinicaId,
        p_email: emailUsuario.trim().toLowerCase(),
        p_rol: "admin",
      });
    } catch {
      // Si ya pertenecía o si la función no es necesaria, continuamos
    }
  }

  const { error } = await supabase.rpc("cambiar_empresa", { p_clinica: clinicaId });
  if (error) throw new Error(`No se pudo cambiar de empresa: ${error.message}`);

  // Limpiar caché local y recargar para que toda la app se active con la empresa elegida
  try {
    localStorage.removeItem("odonto-empresa-v1");
  } catch (_e) {
    // Modo privado o sin permisos de storage
  }
  window.location.reload();
}

/**
 * Le da un administrador a una empresa.
 *  - Con contraseña: crea la cuenta (Edge Function create-user). Si el correo ya
 *    tenía cuenta, no se crea otra ni se le cambia la contraseña: se la suma.
 *  - Sin contraseña: la persona tiene que tener cuenta ya (trabaja en otra
 *    empresa); se la suma con una función de la base.
 */
export async function darAdministrador(input: {
  clinicaId: string;
  email: string;
  password?: string;
}): Promise<{ existente: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("El correo no es válido.");

  if (!input.password) {
    const { error } = await supabase.rpc("agregar_a_empresa", {
      p_clinica: input.clinicaId,
      p_email: email,
      p_rol: "admin",
    });
    if (error?.code === "P0002") {
      throw new Error("Esa persona todavía no tiene cuenta: poné una contraseña para crearla.");
    }
    if (error) throw new Error(error.message);
    return { existente: true };
  }

  if (input.password.length < MIN_CONTRASENA) throw new Error(AVISO_CONTRASENA_CORTA);
  const { data: sesion } = await supabase.auth.getSession();
  const token = sesion.session?.access_token;
  if (!token) throw new Error("Sesión no válida. Volvé a iniciar sesión.");

  const res = await fetch(`${getSupabaseUrl()}/functions/v1/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: JSON.stringify({ email, password: input.password, role: "admin", clinica_id: input.clinicaId }),
  });
  if (res.status === 404) {
    throw new Error(
      "Falta publicar la función create-user en Supabase (Edge Functions). " +
        "Mientras tanto, se puede sumar a alguien que ya tenga cuenta dejando la contraseña vacía."
    );
  }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(cuerpo?.error || `Error ${res.status}`);
  return { existente: !!cuerpo?.existente };
}

export function useEmpresasDelSistema() {
  return useQuery({ queryKey: clave, queryFn: listarEmpresas });
}

export function useActualizarEmpresaPorId() {
  const qc = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: actualizarEmpresaPorId,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clave });
      qc.invalidateQueries({ queryKey: ["empresa"] });
    },
  });
}

export function useCrearEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: async (input: { nombre: string; nombreCorto: string; adminEmail: string; adminPassword?: string }) => {
      const { data: id, error } = await supabase.rpc("crear_empresa", {
        p_nombre: input.nombre,
        p_nombre_corto: input.nombreCorto,
      });
      if (error) throw new Error(error.message);
      // La empresa ya existe aunque falle el administrador: se avisa aparte
      // para que se lo pueda dar después desde la lista.
      try {
        const r = await darAdministrador({ clinicaId: id as string, email: input.adminEmail, password: input.adminPassword });
        return { id: id as string, adminError: null, existente: r.existente };
      } catch (e) {
        return { id: id as string, adminError: e instanceof Error ? e.message : String(e), existente: false };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: clave }),
  });
}

export function useDarAdministrador() {
  const qc = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: darAdministrador,
    onSettled: () => qc.invalidateQueries({ queryKey: clave }),
  });
}
