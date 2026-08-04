// ============================================================================
// Catálogo de estados del odontograma
// ============================================================================
// Una sola fuente para las tres cosas que tienen que coincidir sí o sí: el
// botón de la barra de herramientas, el color con que se pinta el diente y lo
// que se guarda en `odontograma_registros`. Cuando esto estaba repartido, un
// color de la pantalla podía no corresponderse con lo guardado.

export type CaraDental = "vestibular" | "palatina" | "oclusal" | "mesial" | "distal" | "completo";

/** Las cinco caras de una pieza, en el orden en que se dibujan. */
export const CARAS_DENTALES: Exclude<CaraDental, "completo">[] = [
  "vestibular",
  "palatina",
  "oclusal",
  "mesial",
  "distal",
];

export const NOMBRE_CARA: Record<string, string> = {
  vestibular: "Vestibular",
  palatina: "Palatina / Lingual",
  oclusal: "Oclusal / Incisal",
  mesial: "Mesial",
  distal: "Distal",
  completo: "Pieza completa",
};

export interface EstadoDental {
  id: string;
  label: string;
  /** Color con que se pinta la cara o la pieza. */
  color: string;
  /** Color del texto sobre ese fondo, para que se lea. */
  contraste: string;
  diagnostico: string | null;
  tratamiento: string | null;
  estado: "pendiente" | "realizado";
  /** Se aplica a la pieza entera, no a una cara suelta (una corona no es "mesial"). */
  piezaCompleta?: boolean;
  /** Deja la pieza sin marcas (vuelve a sana). */
  limpia?: boolean;
  /** La pieza ya no está en boca: se dibuja tachada. */
  ausente?: boolean;
  descripcion: string;
}

/**
 * El orden es el de la barra de herramientas: primero lo que más se marca.
 *
 * Criterio de color, el mismo que usa el papel: ROJO = lo que hay que hacer
 * (patología o tratamiento pendiente), AZUL = lo que ya está hecho.
 */
export const ESTADOS_DENTALES: EstadoDental[] = [
  {
    id: "caries",
    label: "Caries",
    color: "#dc2626",
    contraste: "#ffffff",
    diagnostico: "caries",
    tratamiento: null,
    estado: "pendiente",
    descripcion: "Lesión de caries por tratar",
  },
  {
    id: "obturacion",
    label: "Obturación",
    color: "#2563eb",
    contraste: "#ffffff",
    diagnostico: null,
    tratamiento: "obturacion",
    estado: "realizado",
    descripcion: "Obturación ya realizada",
  },
  {
    id: "corona",
    label: "Corona",
    color: "#f59e0b",
    contraste: "#422006",
    diagnostico: null,
    tratamiento: "corona",
    estado: "realizado",
    piezaCompleta: true,
    descripcion: "Corona / funda colocada",
  },
  {
    id: "endodoncia",
    label: "Endodoncia",
    color: "#8b5cf6",
    contraste: "#ffffff",
    diagnostico: null,
    tratamiento: "endodoncia",
    estado: "realizado",
    piezaCompleta: true,
    descripcion: "Tratamiento de conducto",
  },
  {
    id: "extraccion",
    label: "Extracción",
    color: "#e11d48",
    contraste: "#ffffff",
    diagnostico: null,
    tratamiento: "extraccion",
    estado: "pendiente",
    piezaCompleta: true,
    descripcion: "Extracción indicada, todavía no hecha",
  },
  {
    id: "ausente",
    label: "Ausente",
    color: "#94a3b8",
    contraste: "#0f172a",
    diagnostico: "ausente",
    tratamiento: null,
    estado: "realizado",
    piezaCompleta: true,
    ausente: true,
    descripcion: "La pieza no está en boca",
  },
  {
    id: "implante",
    label: "Implante",
    color: "#0d9488",
    contraste: "#ffffff",
    diagnostico: null,
    tratamiento: "implante",
    estado: "realizado",
    piezaCompleta: true,
    descripcion: "Implante colocado",
  },
  {
    id: "sano",
    label: "Sano / Borrar",
    color: "#ffffff",
    contraste: "#0f172a",
    diagnostico: "sano",
    tratamiento: "ninguno",
    estado: "realizado",
    limpia: true,
    descripcion: "Sin hallazgos: borra la marca",
  },
];

export function buscarEstado(id: string | null | undefined): EstadoDental | undefined {
  if (!id) return undefined;
  return ESTADOS_DENTALES.find((e) => e.id === id);
}

/**
 * De lo guardado en la base al estado que corresponde.
 *
 * Se mira primero el tratamiento y después el diagnóstico porque una pieza con
 * caries ya obturada tiene los dos campos: lo que vale es lo último que se hizo.
 * Los registros viejos guardaban "empaste" en vez de "obturacion".
 */
export function estadoDeRegistro(registro: {
  diagnostico?: string | null;
  tratamiento?: string | null;
}): EstadoDental | undefined {
  const tratamiento = (registro.tratamiento ?? "").toLowerCase();
  const diagnostico = (registro.diagnostico ?? "").toLowerCase();

  if (diagnostico === "sano" || tratamiento === "ninguno") return buscarEstado("sano");
  if (tratamiento === "empaste") return buscarEstado("obturacion");

  const porTratamiento = ESTADOS_DENTALES.find((e) => e.tratamiento && e.tratamiento === tratamiento);
  if (porTratamiento) return porTratamiento;

  return ESTADOS_DENTALES.find((e) => e.diagnostico && e.diagnostico === diagnostico);
}
