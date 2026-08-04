// ============================================================================
// Detección de partes del esquema que todavía no existen en la base
// ============================================================================
// Esta app nació como clon de un sistema médico y su base fue creada por
// migraciones aparte, así que hay tablas y columnas que el código pide y la
// base puede no tener todavía. Cuando eso pasa, la app NO debe romper ni
// llenar la consola de errores rojos: son condiciones conocidas, no fallos.
//
// La distinción entre tabla y columna importa: mandar a crear una tabla que ya
// existe, cuando lo que falta es una columna, esconde cuál es la migración que
// de verdad hace falta.

export interface ErrorSupabase {
  code?: string;
  message?: string;
}

/**
 * La TABLA no existe (o no está expuesta todavía en el cache del esquema).
 * PGRST205 lo dice PostgREST; 42P01 es el `undefined_table` de Postgres.
 */
export function esTablaInexistente(error: ErrorSupabase | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01";
}

/**
 * La COLUMNA no existe. PGRST204 es el de PostgREST al escribir ("Could not
 * find the 'x' column of 'y' in the schema cache") y 42703 el `undefined_column`
 * de Postgres al leer.
 *
 * OJO: PGRST204 (columna) y PGRST205 (tabla) se diferencian en un dígito. Es la
 * confusión clásica; por eso son dos funciones y no una.
 */
export function esColumnaInexistente(error: ErrorSupabase | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703";
}

/** Cualquiera de las dos: falta algo del esquema. */
export function faltaEnElEsquema(error: ErrorSupabase | null | undefined): boolean {
  return esTablaInexistente(error) || esColumnaInexistente(error);
}

const yaAvisado = new Set<string>();

/**
 * Deja UN aviso en la consola por cada parte del esquema que falte, en vez de
 * uno por cada consulta. Una pantalla que refresca sola escribía el mismo error
 * decenas de veces y tapaba todo lo demás.
 *
 * Devuelve true si el error era por esquema faltante (y por lo tanto quien
 * llama debería degradar en vez de propagarlo).
 */
export function avisarEsquemaFaltante(
  error: ErrorSupabase | null | undefined,
  contexto: string,
  archivoSql = "supabase/migrations/esquema_completo.sql"
): boolean {
  if (!faltaEnElEsquema(error)) return false;

  const clave = `${contexto}:${error?.code}:${error?.message ?? ""}`;
  if (!yaAvisado.has(clave)) {
    yaAvisado.add(clave);
    const que = esTablaInexistente(error) ? "una tabla" : "una columna";
    console.warn(
      `[esquema] ${contexto}: falta ${que} en la base (${error?.message ?? error?.code}). ` +
        `Se muestra vacío. Para habilitarlo, aplicar ${archivoSql}.`
    );
  }
  return true;
}

/** Solo para los tests: olvida los avisos ya emitidos. */
export function _resetAvisosEsquema(): void {
  yaAvisado.clear();
}
