// ============================================================================
// Recargar cuando se publicó una versión nueva con la app abierta
// ============================================================================
// Cada pantalla se baja por separado (React.lazy) recién cuando se abre. Los
// archivos llevan un código en el nombre (Reportes-CF_mXS7v.js) que cambia en
// cada publicación y Vercel borra los viejos. Si alguien tenía la app abierta
// desde antes, al abrir una pantalla el navegador pide un archivo que ya no
// existe, falla, y quedaba la PÁGINA EN BLANCO sin ningún aviso.
//
// La solución es recargar: la página nueva trae los nombres nuevos. Una sola
// vez por minuto, para no quedar en un bucle si el problema fuera otro (por
// ejemplo, sin internet).

const CLAVE = "odonto-recarga-por-version";
const ESPERA_MS = 60_000;

/** El error es el de "ese archivo de pantalla ya no existe / no se pudo bajar". */
export function esErrorDeVersionNueva(error: unknown): boolean {
  const texto = String((error as { message?: unknown } | null)?.message ?? error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(texto) ||
    /error loading dynamically imported module/i.test(texto) ||
    /Importing a module script failed/i.test(texto) ||
    /Unable to preload CSS/i.test(texto) ||
    /ChunkLoadError|Loading chunk \S+ failed/i.test(texto)
  );
}

/**
 * Recarga la página si no se recargó por este motivo en el último minuto.
 * Devuelve true si recargó.
 */
export function recargarUnaVez(
  ahora: number = Date.now(),
  recargar: () => void = () => window.location.reload()
): boolean {
  let ultima = 0;
  try {
    ultima = Number(sessionStorage.getItem(CLAVE)) || 0;
  } catch {
    // Sin sessionStorage (modo privado estricto): se recarga igual, una vez.
  }
  if (ahora - ultima < ESPERA_MS) return false;
  try {
    sessionStorage.setItem(CLAVE, String(ahora));
  } catch {
    /* sin sessionStorage */
  }
  recargar();
  return true;
}
