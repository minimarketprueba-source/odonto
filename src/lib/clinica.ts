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
  /** Para donde el nombre completo no entra: el menú lateral, la pestaña. */
  nombre_corto: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  /**
   * Logo ANCHO, en data URL (base64). Ver `empresa.sql` para por qué no va en
   * Storage. Se usa donde hay lugar horizontal: la pantalla de acceso y el
   * membrete de los impresos.
   */
  logo_url: string | null;
  /**
   * Ícono CUADRADO. Va en el recuadro de 40x40 del menú y en la pestaña del
   * navegador, donde un logo ancho se ve diminuto entre dos franjas vacías.
   */
  icono_url: string | null;
  /** Color de la marca (#rrggbb): la banda de la receta y el nombre impreso. */
  color_primario: string;
}

/**
 * Lo que se muestra hasta que la base contesta, y lo que queda si el
 * consultorio todavía no cargó sus datos.
 *
 * Es lo ÚNICO de Mova Dent que queda escrito en el código. Para entregarle el
 * sistema a otro consultorio no hace falta tocarlo: se cargan sus datos en
 * Mantenimiento → Consultorio y estos valores dejan de usarse.
 */
export const EMPRESA_PREDETERMINADA: DatosEmpresa = {
  nombre: "CONSULTORIO ODONTOLÓGICO MOVA DENT",
  nombre_corto: "Mova Dent",
  ruc: null,
  direccion: null,
  telefono: null,
  email: null,
  logo_url: null,
  icono_url: null,
  color_primario: "#0e7490",
};

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
    nombre_corto: datos.nombre_corto?.trim() || EMPRESA_PREDETERMINADA.nombre_corto,
    ruc: datos.ruc?.trim() || null,
    direccion: datos.direccion?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    email: datos.email?.trim() || null,
    logo_url: datos.logo_url || null,
    icono_url: datos.icono_url || null,
    color_primario: normalizarColor(datos.color_primario),
  };
}

/**
 * Deja el color en `#rrggbb` o devuelve el predeterminado.
 *
 * Se valida porque el color entra en el `style` de los impresos: un valor
 * cualquiera escrito en la base rompería el CSS del documento, y el papel
 * saldría sin la banda.
 */
export function normalizarColor(valor: string | null | undefined): string {
  const c = (valor ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    // #abc → #aabbcc
    return ("#" + c.slice(1).split("").map((d) => d + d).join("")).toLowerCase();
  }
  return EMPRESA_PREDETERMINADA.color_primario;
}

/**
 * Aclara un color hacia el blanco. Se usa para el degradado de la banda de la
 * receta: con un solo color cargado se arma la variante clara sin pedirle al
 * usuario que elija dos.
 */
export function aclararColor(hex: string, proporcion = 0.55): string {
  const c = normalizarColor(hex);
  const canal = (i: number) => {
    const v = parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(v + (255 - v) * proporcion);
  };
  return `#${[0, 1, 2].map((i) => canal(i).toString(16).padStart(2, "0")).join("")}`;
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
