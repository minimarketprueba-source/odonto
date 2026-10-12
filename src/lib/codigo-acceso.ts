// ============================================================================
// Código de acceso del consultorio (el ?c= del enlace de ingreso)
// ============================================================================
// Con varias empresas en una base, la pantalla de ingreso no sabe de qué
// consultorio es la persona. El enlace propio de cada uno
// (odonto-pied.vercel.app/?c=movadent) se lo dice, y el equipo lo recuerda:
// la próxima vez, aunque se entre sin el ?c=, aparece el mismo logo.
// Después de entrar se guarda el código de la empresa activa, así el equipo
// queda con el consultorio correcto aunque el enlace fuera otro.
// Ver supabase/migrations/marca_publica.sql.

const CLAVE = "odonto-codigo-acceso";

/** Solo letras y números en minúscula, como los genera la base. */
export function normalizarCodigo(valor: string | null | undefined): string | null {
  const c = (valor ?? "").trim().toLowerCase();
  return /^[a-z0-9]{1,40}$/.test(c) ? c : null;
}

export function guardarCodigo(codigo: string | null | undefined): void {
  const c = normalizarCodigo(codigo);
  if (!c) return;
  try {
    localStorage.setItem(CLAVE, c);
  } catch {
    /* modo privado: se usa el del enlace mientras esté abierto */
  }
}

/**
 * El código a usar: el del enlace (?c=), que además queda guardado, o el que
 * se guardó la última vez en este equipo.
 */
export function codigoDeAcceso(search: string = window.location.search): string | null {
  const delEnlace = normalizarCodigo(new URLSearchParams(search).get("c"));
  if (delEnlace) {
    guardarCodigo(delEnlace);
    return delEnlace;
  }
  try {
    return normalizarCodigo(localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

/** El enlace de ingreso del consultorio, para copiar o mandar por WhatsApp. */
export function enlaceDeIngreso(codigo: string, origen: string = window.location.origin): string {
  return `${origen}/?c=${encodeURIComponent(codigo)}`;
}
