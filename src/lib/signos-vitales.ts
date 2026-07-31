// ============================================================================
// Signos vitales: rangos humanos y control antes de guardar
// ============================================================================
// La base rechaza cualquier valor imposible (los CHECK de `citas`,
// `atenciones_enfermeria`, `fichas_rac` y `signos_vitales`), pero devuelve un
// error genérico —"hay un valor fuera de rango, revise los signos vitales"— que
// no dice CUÁL corregir. Estas reglas repiten los mismos límites del servidor
// para avisar en el navegador, nombrando el campo y el rango aceptado.
//
// Los números tienen que seguir siendo los mismos que los del SQL: si algún día
// se cambia un CHECK en la base, hay que cambiarlo también acá.

export interface RangoSigno {
  /** Cómo se nombra el campo dentro del aviso ("Revise <etiqueta>: ..."). */
  etiqueta: string;
  min: number;
  max: number;
  unidad: string;
  /** La columna es entera: un decimal se redondea antes de guardar. */
  entero: boolean;
}

export const RANGOS_SIGNOS = {
  pa_sistolica: {
    etiqueta: "la presión sistólica (la de arriba)",
    min: 40, max: 300, unidad: "mmHg", entero: true,
  },
  pa_diastolica: {
    etiqueta: "la presión diastólica (la de abajo)",
    min: 20, max: 200, unidad: "mmHg", entero: true,
  },
  fc: { etiqueta: "la frecuencia cardíaca", min: 20, max: 300, unidad: "lpm", entero: true },
  fr: { etiqueta: "la frecuencia respiratoria", min: 4, max: 80, unidad: "rpm", entero: true },
  temp: { etiqueta: "la temperatura", min: 30, max: 45, unidad: "°C", entero: false },
  spo2: { etiqueta: "la saturación (SpO2)", min: 50, max: 100, unidad: "%", entero: true },
  peso_kg: { etiqueta: "el peso", min: 1, max: 400, unidad: "kg", entero: false },
  talla_cm: { etiqueta: "la talla", min: 50, max: 250, unidad: "cm", entero: true },
  glucemia: { etiqueta: "la glucemia", min: 20, max: 800, unidad: "mg/dL", entero: true },
} satisfies Record<string, RangoSigno>;

export type ClaveSigno = keyof typeof RANGOS_SIGNOS;

/** Texto → número (acepta la coma decimal) o null si está vacío o no es número. */
export function numeroSignoONull(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Los campos enteros se redondean acá en vez de que la base rechace todo. */
export function enteroSignoONull(texto: string): number | null {
  const n = numeroSignoONull(texto);
  return n === null ? null : Math.round(n);
}

/** 36.5 → "36,5" (así se escribe y así se lee en el aviso). */
function conComa(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

/**
 * Controla un solo valor. Devuelve el aviso en castellano o null si está bien.
 * Un campo vacío siempre está bien: los signos vitales son opcionales.
 */
export function validarSignoVital(clave: ClaveSigno, texto: string): string | null {
  const rango = RANGOS_SIGNOS[clave];
  const crudo = texto.trim();
  if (!crudo) return null;

  const n = numeroSignoONull(crudo);
  if (n === null) {
    return `Revise ${rango.etiqueta}: «${crudo}» no es un número. ` +
      `Escriba solo el valor, entre ${conComa(rango.min)} y ${conComa(rango.max)} ${rango.unidad}.`;
  }

  if (n < rango.min || n > rango.max) {
    let aviso =
      `Revise ${rango.etiqueta}: ${conComa(n)} ${rango.unidad} no es un valor posible. ` +
      `Tiene que estar entre ${conComa(rango.min)} y ${conComa(rango.max)} ${rango.unidad}.`;
    // El error más común es la coma que faltó: 365 por 36,5.
    const dividido = n / 10;
    if (n > rango.max && dividido >= rango.min && dividido <= rango.max) {
      aviso += ` ¿Quiso escribir ${conComa(dividido)}?`;
    }
    return aviso;
  }

  return null;
}

/**
 * Controla todos los signos vitales de un formulario, en el orden en que están
 * en pantalla, y devuelve el PRIMER aviso (o null si está todo bien).
 * Solo se miran las claves que se pasan: cada pantalla carga los suyos.
 */
export function validarSignosVitales(
  valores: Partial<Record<ClaveSigno, string>>
): string | null {
  for (const clave of Object.keys(RANGOS_SIGNOS) as ClaveSigno[]) {
    const texto = valores[clave];
    if (texto === undefined) continue;
    const aviso = validarSignoVital(clave, texto);
    if (aviso) return aviso;
  }

  // La base no lo controla, pero una presión invertida es siempre un error de
  // tipeo: la de arriba nunca puede ser menor o igual que la de abajo.
  const sis = valores.pa_sistolica ? numeroSignoONull(valores.pa_sistolica) : null;
  const dia = valores.pa_diastolica ? numeroSignoONull(valores.pa_diastolica) : null;
  if (sis !== null && dia !== null && sis <= dia) {
    return `Revise la presión: cargó ${conComa(sis)}/${conComa(dia)}. ` +
      "La de arriba (sistólica) tiene que ser mayor que la de abajo (diastólica).";
  }

  return null;
}
