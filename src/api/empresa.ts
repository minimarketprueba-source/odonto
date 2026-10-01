// ============================================================================
// Capa de datos: el consultorio (tabla `clinicas`)
// ============================================================================
// La fila de la empresa ACTIVA de quien inició sesión (multiempresa.sql). Sin
// sesión —la pantalla de ingreso— no se sabe de qué empresa es la persona: se
// muestra la última marca usada en esta computadora, o la del sistema.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { esColumnaInexistente, esTablaInexistente } from "@/lib/esquema";
import {
  EMPRESA_PREDETERMINADA, setEmpresa, normalizarColor, type DatosEmpresa,
} from "@/lib/clinica";
import { CLINICA_ID_UNICA_LEGADO } from "./pacientes";
import { useAuth } from "@/context/auth-context";

export const empresaKeys = {
  all: ["empresa"] as const,
  detalle: (userId: string | null) => [...empresaKeys.all, userId ?? "sin-sesion"] as const,
};

export type ActualizarEmpresaInput = Partial<Omit<DatosEmpresa, "nombre">> & {
  nombre: string;
};

const COLUMNAS =
  "nombre, nombre_corto, ruc, direccion, telefono, email, logo_url, icono_url, color_primario";

/**
 * La empresa en la que está trabajando quien inició sesión, o null sin sesión.
 * La decide la base (mi_clinica_id), la misma función que usan los permisos:
 * así lo que se muestra y lo que se deja tocar nunca pueden ser distintos.
 */
async function idEmpresaActiva(): Promise<string | null> {
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) return null;
  const { data, error } = await supabase.rpc("mi_clinica_id");
  // Base todavía sin multiempresa.sql: la función no existe y hay una sola
  // empresa.
  if (error?.code === "PGRST202" || error?.code === "42883") return CLINICA_ID_UNICA_LEGADO;
  if (error) throw new Error(`No se pudo saber la empresa activa: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function fetchEmpresa(): Promise<DatosEmpresa> {
  const id = await idEmpresaActiva();
  if (!id) return leerCache() ?? EMPRESA_PREDETERMINADA;

  const { data, error } = await supabase
    .from("clinicas")
    .select(COLUMNAS)
    .eq("id", id)
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
    nombre_corto: fila.nombre_corto?.trim() || EMPRESA_PREDETERMINADA.nombre_corto,
    ruc: fila.ruc ?? null,
    direccion: fila.direccion ?? null,
    telefono: fila.telefono ?? null,
    email: fila.email ?? null,
    logo_url: fila.logo_url ?? null,
    icono_url: fila.icono_url ?? null,
    color_primario: normalizarColor(fila.color_primario),
  };
}

export async function actualizarEmpresa(input: ActualizarEmpresaInput): Promise<void> {
  if (!input.nombre.trim()) {
    throw new Error("El nombre del consultorio no puede quedar vacío.");
  }
  const id = await idEmpresaActiva();
  if (!id) throw new Error("Hay que iniciar sesión para cambiar los datos del consultorio.");
  const { error } = await supabase
    .from("clinicas")
    .update({
      nombre: input.nombre.trim(),
      nombre_corto: input.nombre_corto?.trim() || null,
      icono_url: input.icono_url || null,
      color_primario: normalizarColor(input.color_primario),
      ruc: input.ruc?.trim() || null,
      direccion: input.direccion?.trim() || null,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      logo_url: input.logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

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
// Los últimos datos leídos quedan en el navegador. Como el valor de fábrica es
// neutro ("Consultorio"), sin esto cada consultorio vería ese nombre genérico
// durante el instante en que la base todavía no contestó. Es solo para esa
// primera pantalla: la base siempre tiene la última palabra.
const CLAVE_CACHE = "odonto-empresa-v1";

function leerCache(): DatosEmpresa | undefined {
  try {
    const crudo = localStorage.getItem(CLAVE_CACHE);
    return crudo ? (JSON.parse(crudo) as DatosEmpresa) : undefined;
  } catch {
    return undefined;
  }
}

function guardarCache(datos: DatosEmpresa): void {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
  } catch {
    // Navegador sin espacio o en modo privado: no pasa nada, se lee de la base.
  }
}

export function useEmpresa(): DatosEmpresa {
  // La clave lleva a la persona: al salir y entrar con otra cuenta (de otra
  // empresa) no se reutiliza la marca de la anterior.
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: empresaKeys.detalle(user?.id ?? null),
    queryFn: fetchEmpresa,
    // Cambia una vez cada tanto: no tiene sentido volver a pedirla todo el rato.
    staleTime: 5 * 60 * 1000,
    placeholderData: leerCache,
  });

  useEffect(() => {
    if (data) {
      setEmpresa(data);
      guardarCache(data);
    }
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

/** El ícono es cuadrado y chico: no tiene sentido guardarlo más grande. */
const LADO_MAXIMO_ICONO = 256;

/**
 * Achica la imagen y la devuelve como data URL para guardarla en la columna.
 *
 * Por qué se achica: el usuario sube la foto tal como le llegó del diseñador,
 * que puede pesar varios MB. Eso viajaría entero en cada consulta de los datos
 * del consultorio y en cada impresión. A 600 px de ancho queda en 50-100 KB y
 * se imprime igual de bien.
 */
export function achicarLogo(file: File): Promise<string> {
  return procesarImagen(file, (img) => {
    const escala = Math.min(1, ANCHO_MAXIMO_LOGO / img.naturalWidth);
    return {
      w: Math.round(img.naturalWidth * escala),
      h: Math.round(img.naturalHeight * escala),
      dibujar: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  });
}

/**
 * Deja la imagen cuadrada para usarla de ícono, sin deformarla.
 *
 * Si viene rectangular se recorta el cuadrado del centro (`object-fit: cover`
 * hecho a mano). Estirarla a la fuerza dejaría el logo achatado, que es peor
 * que perder los bordes.
 */
export function achicarIcono(file: File): Promise<string> {
  return procesarImagen(file, (img) => {
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const destino = Math.min(LADO_MAXIMO_ICONO, lado);
    const sx = (img.naturalWidth - lado) / 2;
    const sy = (img.naturalHeight - lado) / 2;
    return {
      w: destino,
      h: destino,
      dibujar: (ctx, w, h) => ctx.drawImage(img, sx, sy, lado, lado, 0, 0, w, h),
    };
  });
}

/** Lo que comparten las dos: leer el archivo, dibujarlo y devolver el data URL. */
function procesarImagen(
  file: File,
  plan: (img: HTMLImageElement) => {
    w: number;
    h: number;
    dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  }
): Promise<string> {
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
        const { w, h, dibujar } = plan(img);
        const lienzo = document.createElement("canvas");
        lienzo.width = w;
        lienzo.height = h;
        const ctx = lienzo.getContext("2d");
        if (!ctx) {
          reject(new Error("El navegador no pudo procesar la imagen."));
          return;
        }
        dibujar(ctx, w, h);
        // PNG y no JPEG: la imagen puede tener fondo transparente, y el JPEG lo
        // rellenaría de negro.
        resolve(lienzo.toDataURL("image/png"));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}
