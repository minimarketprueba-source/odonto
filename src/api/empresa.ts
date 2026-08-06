// ============================================================================
// Capa de datos: el consultorio (tabla `clinicas`)
// ============================================================================
// Una sola fila, la de CLINICA_ID. No se creó una tabla `empresa` aparte
// porque `clinicas` ya existía y todas las tablas del sistema apuntan a ella
// por `clinica_id`; ver el encabezado de `supabase/migrations/empresa.sql`.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { esColumnaInexistente, esTablaInexistente } from "@/lib/esquema";
import {
  EMPRESA_PREDETERMINADA, setEmpresa, type DatosEmpresa,
} from "@/lib/clinica";
import { CLINICA_ID } from "./pacientes";

export const empresaKeys = {
  all: ["empresa"] as const,
  detalle: () => [...empresaKeys.all, CLINICA_ID] as const,
};

export type ActualizarEmpresaInput = Partial<Omit<DatosEmpresa, "nombre">> & {
  nombre: string;
};

const COLUMNAS = "nombre, ruc, direccion, telefono, email, logo_url";

export async function fetchEmpresa(): Promise<DatosEmpresa> {
  const { data, error } = await supabase
    .from("clinicas")
    .select(COLUMNAS)
    .eq("id", CLINICA_ID)
    .maybeSingle();

  // Sin la migración aplicada faltan `ruc` y `logo_url`. Acá SÍ se degrada a
  // los valores por omisión en vez de romper: son los datos del cartel de la
  // puerta, no historia clínica, y dejar la app entera sin poder abrir el
  // login por eso sería peor que mostrar el nombre predeterminado.
  if (esTablaInexistente(error) || esColumnaInexistente(error)) {
    return EMPRESA_PREDETERMINADA;
  }
  if (error) throw new Error(`No se pudieron cargar los datos del consultorio: ${error.message}`);
  if (!data) return EMPRESA_PREDETERMINADA;

  const fila = data as unknown as Partial<DatosEmpresa>;
  return {
    nombre: fila.nombre?.trim() || EMPRESA_PREDETERMINADA.nombre,
    ruc: fila.ruc ?? null,
    direccion: fila.direccion ?? null,
    telefono: fila.telefono ?? null,
    email: fila.email ?? null,
    logo_url: fila.logo_url ?? null,
  };
}

export async function actualizarEmpresa(input: ActualizarEmpresaInput): Promise<void> {
  if (!input.nombre.trim()) {
    throw new Error("El nombre del consultorio no puede quedar vacío.");
  }
  const { error } = await supabase
    .from("clinicas")
    .update({
      nombre: input.nombre.trim(),
      ruc: input.ruc?.trim() || null,
      direccion: input.direccion?.trim() || null,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      logo_url: input.logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CLINICA_ID);

  if (esColumnaInexistente(error) || esTablaInexistente(error)) {
    throw new Error(
      "Falta aplicar 'supabase/migrations/empresa.sql' en el SQL Editor de Supabase " +
        "para poder guardar el RUC y el logo."
    );
  }
  if (error) throw new Error(`No se pudieron guardar los datos: ${error.message}`);
}

/**
 * Los datos del consultorio. Nunca devuelve `undefined`: hasta que la base
 * conteste entrega los valores por omisión, así ninguna pantalla tiene que
 * andar preguntando si ya cargó.
 *
 * De paso deja una copia en `src/lib/clinica.ts` para que los impresos, que no
 * son componentes de React, puedan leerla.
 */
export function useEmpresa(): DatosEmpresa {
  const { data } = useQuery({
    queryKey: empresaKeys.detalle(),
    queryFn: fetchEmpresa,
    // Cambia una vez cada tanto: no tiene sentido volver a pedirla todo el rato.
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setEmpresa(data);
  }, [data]);

  return data ?? EMPRESA_PREDETERMINADA;
}

export function useActualizarEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: actualizarEmpresa,
    retry: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: empresaKeys.all }),
  });
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

/** Lo más ancho que se guarda el logo. Más que esto no se nota al imprimir. */
const ANCHO_MAXIMO_LOGO = 600;

/**
 * Achica la imagen y la devuelve como data URL para guardarla en la columna.
 *
 * Por qué se achica: el usuario sube la foto tal como le llegó del diseñador,
 * que puede pesar varios MB. Eso viajaría entero en cada consulta de los datos
 * del consultorio y en cada impresión. A 600 px de ancho queda en 50-100 KB y
 * se imprime igual de bien.
 */
export function achicarLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo abrir la imagen."));
      img.onload = () => {
        const escala = Math.min(1, ANCHO_MAXIMO_LOGO / img.naturalWidth);
        const w = Math.round(img.naturalWidth * escala);
        const h = Math.round(img.naturalHeight * escala);

        const lienzo = document.createElement("canvas");
        lienzo.width = w;
        lienzo.height = h;
        const ctx = lienzo.getContext("2d");
        if (!ctx) {
          reject(new Error("El navegador no pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // PNG y no JPEG: el logo puede tener fondo transparente, y el JPEG lo
        // rellenaría de negro.
        resolve(lienzo.toDataURL("image/png"));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}
