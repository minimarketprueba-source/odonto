// ============================================================================
// Capa de datos: las empresas del sistema (solo el dueño del sistema)
// ============================================================================
// Todo pasa por funciones de la base (multiempresa.sql) que comprueban que
// quien llama es dueño. El dueño crea empresas y les da administrador, pero
// NO ve sus pacientes: para eso tendría que ser miembro de la empresa.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseAnonKey, getSupabaseUrl, supabase } from "@/lib/supabase";

export interface EmpresaDelSistema {
  clinica_id: string;
  nombre: string;
  nombre_corto: string;
  created_at: string | null;
  personas: number;
  administradores: string | null;
}

const clave = ["empresas-del-sistema"] as const;

export async function listarEmpresas(): Promise<EmpresaDelSistema[]> {
  const { data, error } = await supabase.rpc("listar_empresas");
  if (error) throw new Error(`No se pudieron cargar las empresas: ${error.message}`);
  return (data as EmpresaDelSistema[]) ?? [];
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

  if (input.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
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
