// ============================================================================
// Identidad del consultorio
// ============================================================================
// Los datos salen de la tabla `clinicas` y se editan en Mantenimiento →
// Consultorio. Acá viven dos cosas:
//
//   1. Los valores por omisión, que se usan mientras la consulta no terminó de
//      cargar y si la fila todavía no existe en la base.
//   2. Una copia del último dato leído, para que `src/lib/imprimir.ts` pueda
//      usarlo. Los impresos no son componentes de React: se arman con
//      funciones sueltas que no pueden llamar a un hook.
//
// En componentes de React usar `useEmpresa()` de `src/api/empresa.ts`, que se
// actualiza sola cuando se guardan los datos. `getEmpresa()` es solo para
// código que no es React.

export interface DatosEmpresa {
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  /** Logo en data URL (base64). Ver `empresa.sql` para por qué no va en Storage. */
  logo_url: string | null;
}

/** Lo que se muestra hasta que la base contesta. */
export const EMPRESA_PREDETERMINADA: DatosEmpresa = {
  nombre: "CONSULTORIO ODONTOLÓGICO MOVA DENT",
  ruc: null,
  direccion: null,
  telefono: null,
  email: null,
  logo_url: null,
};

/**
 * Versión corta para donde el nombre completo no entra: el menú lateral en el
 * celular. No se edita desde la app a propósito — es la marca, no un dato.
 */
export const NOMBRE_CLINICA_CORTO = "Mova Dent";

let empresaActual: DatosEmpresa = EMPRESA_PREDETERMINADA;

/** Los datos del consultorio para código que no es React (los impresos). */
export function getEmpresa(): DatosEmpresa {
  return empresaActual;
}

/**
 * Guarda lo último leído de la base. La llama `useEmpresa()`; no hace falta
 * llamarla a mano desde ningún otro lado.
 *
 * Los campos vacíos se ignoran y queda el valor por omisión: una fila a medio
 * cargar no tiene que dejar los impresos sin nombre de consultorio.
 */
export function setEmpresa(datos: Partial<DatosEmpresa> | null | undefined): void {
  if (!datos) return;
  empresaActual = {
    nombre: datos.nombre?.trim() || EMPRESA_PREDETERMINADA.nombre,
    ruc: datos.ruc?.trim() || null,
    direccion: datos.direccion?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    email: datos.email?.trim() || null,
    logo_url: datos.logo_url || null,
  };
}

/**
 * La línea de datos de contacto que va debajo del nombre en los impresos:
 * "Av. Mcal. López 123 · Tel: 0983 559 700 · RUC: 80012345-6".
 * Los campos vacíos no dejan separadores sueltos.
 */
export function lineaContacto(empresa: DatosEmpresa = getEmpresa()): string {
  const partes = [
    empresa.direccion,
    empresa.telefono ? `Tel: ${empresa.telefono}` : null,
    empresa.ruc ? `RUC: ${empresa.ruc}` : null,
  ].filter((p) => p && p.trim());
  return partes.join(" · ");
}
