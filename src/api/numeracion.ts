// ============================================================================
// Numeración correlativa de documentos oficiales (recetas, salvoconductos)
// ============================================================================
// El número se arma en el navegador porque no hay una secuencia en la base, y
// eso trae dos problemas que estas funciones acotan:
//
//   1. Contar filas y sumar uno repite números si alguna vez se borra una fila.
//      Se toma el número MÁS ALTO ya emitido, que nunca retrocede.
//   2. Dos profesionales que guardan en el mismo momento leen el mismo último
//      número y los dos escriben el siguiente. Contra eso, el candado de verdad
//      es el índice único de la base (`recetas_numero_unico`,
//      `salvoconductos_numero_unico`): cuando salta, se reintenta con el
//      número siguiente en vez de devolver un error al usuario.
//
// El orden alfabético sirve para encontrar el máximo porque el número va con
// ceros a la izquierda y ancho fijo (R-00001 … R-99999).

import { supabase } from "@/lib/supabase";

/** Cuántas veces se reintenta cuando dos personas emiten a la vez. */
export const MAX_INTENTOS_NUMERO = 6;

/** Código de Postgres para "violación de índice único". */
const CONFLICTO_UNICO = "23505";

/** Devuelve el número siguiente al más alto emitido, ej. `R-00042`. */
export async function siguienteNumero(
  tabla: string,
  prefijo: string,
  desplazamiento = 0
): Promise<string> {
  const { data, error } = await supabase
    .from(tabla)
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw new Error(`No se pudo numerar el documento: ${error.message}`);

  const ultimo = (data?.[0] as { numero?: string } | undefined)?.numero;
  const soloDigitos = ultimo ? ultimo.replace(/\D/g, "") : "";
  const anterior = soloDigitos ? Number(soloDigitos) : 0;
  const siguiente = (Number.isFinite(anterior) ? anterior : 0) + 1 + desplazamiento;
  return `${prefijo}-${String(siguiente).padStart(5, "0")}`;
}

/** True si el error es el choque de dos documentos con el mismo número. */
export function esConflictoDeNumero(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === CONFLICTO_UNICO && !!e.message?.includes("numero");
}

/**
 * Emite el documento reintentando con el número siguiente si otro puesto se
 * adelantó. `emitir` recibe el número y devuelve el registro ya guardado.
 */
export async function emitirConNumero<T>(
  tabla: string,
  prefijo: string,
  emitir: (numero: string) => Promise<T>
): Promise<T> {
  let ultimoError: unknown = null;
  for (let intento = 0; intento < MAX_INTENTOS_NUMERO; intento++) {
    const numero = await siguienteNumero(tabla, prefijo, intento);
    try {
      return await emitir(numero);
    } catch (e) {
      if (!esConflictoDeNumero(e)) throw e;
      ultimoError = e;
    }
  }
  throw new Error(
    "Varios puestos están emitiendo documentos al mismo tiempo y no se pudo asignar un número. " +
      `Intente de nuevo en unos segundos. (${(ultimoError as Error)?.message ?? ""})`
  );
}
