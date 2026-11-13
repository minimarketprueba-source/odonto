import {
  CoordenadaPunto,
  PuntosCefalometricosMap,
  CalibracionRegla,
  MedicionResultado,
  DefinicionPunto,
} from '@/types/cefalometria';

/**
 * Catálogo maestro de puntos cefalométricos anatómicos estándar (WebCeph / Steiner / Ricketts / Downs)
 */
export const PUNTOS_CEFALOMETRICOS: DefinicionPunto[] = [
  // --- Esqueléticos / Craneales ---
  {
    id: 'S',
    simbolo: 'S',
    nombre: 'Sella / Silla Turca',
    descripcion: 'Centro geométrico de la fosa hipofisiaria o silla turca del esfenoides.',
    tipo: 'esqueletico',
    color: '#ef4444',
    sugerido: { x: 0.38, y: 0.35 },
  },
  {
    id: 'N',
    simbolo: 'Na',
    nombre: 'Nasion',
    descripcion: 'Punto más anterior de la sutura frontonasal.',
    tipo: 'esqueletico',
    color: '#3b82f6',
    sugerido: { x: 0.58, y: 0.28 },
  },
  {
    id: 'Po',
    simbolo: 'Po',
    nombre: 'Porion',
    descripcion: 'Punto más superior del conducto auditivo externo óseo.',
    tipo: 'esqueletico',
    color: '#10b981',
    sugerido: { x: 0.32, y: 0.46 },
  },
  {
    id: 'Or',
    simbolo: 'Or',
    nombre: 'Orbitale',
    descripcion: 'Punto más inferior del reborde orbitario óseo.',
    tipo: 'esqueletico',
    color: '#f59e0b',
    sugerido: { x: 0.55, y: 0.43 },
  },
  {
    id: 'Ba',
    simbolo: 'Ba',
    nombre: 'Basion',
    descripcion: 'Punto más posteroinferior en el borde anterior del foramen magnum.',
    tipo: 'esqueletico',
    color: '#8b5cf6',
    sugerido: { x: 0.34, y: 0.52 },
  },
  {
    id: 'Pt',
    simbolo: 'Pt',
    nombre: 'Pterigoideo',
    descripcion: 'Punto más superior de la fisura pterigomaxilar.',
    tipo: 'esqueletico',
    color: '#ec4899',
    sugerido: { x: 0.44, y: 0.42 },
  },
  {
    id: 'ANS',
    simbolo: 'ANS',
    nombre: 'Espina Nasal Anterior (ENA)',
    descripcion: 'Vértice anterior de la apófisis maxilar en el límite inferior de la cavidad nasal.',
    tipo: 'esqueletico',
    color: '#06b6d4',
    sugerido: { x: 0.60, y: 0.49 },
  },
  {
    id: 'PNS',
    simbolo: 'PNS',
    nombre: 'Espina Nasal Posterior (ENP)',
    descripcion: 'Vértice posterior del paladar duro.',
    tipo: 'esqueletico',
    color: '#14b8a6',
    sugerido: { x: 0.43, y: 0.51 },
  },
  {
    id: 'A',
    simbolo: 'A',
    nombre: 'Punto A (Subespinal)',
    descripcion: 'Punto más profundo en la concavidad anterior del maxilar entre ANS y el reborde alveolar.',
    tipo: 'esqueletico',
    color: '#ef4444',
    sugerido: { x: 0.58, y: 0.53 },
  },
  {
    id: 'B',
    simbolo: 'B',
    nombre: 'Punto B (Supramentoniano)',
    descripcion: 'Punto más profundo en la concavidad anterior de la sínfisis mandibular.',
    tipo: 'esqueletico',
    color: '#f97316',
    sugerido: { x: 0.57, y: 0.69 },
  },
  {
    id: 'Pog',
    simbolo: 'Pog',
    nombre: 'Pogonion',
    descripcion: 'Punto más anterior del contorno óseo de la sínfisis mentoniana.',
    tipo: 'esqueletico',
    color: '#eab308',
    sugerido: { x: 0.59, y: 0.74 },
  },
  {
    id: 'Gn',
    simbolo: 'Gn',
    nombre: 'Gnation',
    descripcion: 'Punto más anteroinferior de la sínfisis mentoniana (intersección eje facial y plano mandibular).',
    tipo: 'esqueletico',
    color: '#84cc16',
    sugerido: { x: 0.58, y: 0.77 },
  },
  {
    id: 'Me',
    simbolo: 'Me',
    nombre: 'Mentoniano',
    descripcion: 'Punto más inferior del contorno de la sínfisis mandibular.',
    tipo: 'esqueletico',
    color: '#22c55e',
    sugerido: { x: 0.56, y: 0.79 },
  },
  {
    id: 'Go',
    simbolo: 'Go',
    nombre: 'Gonion',
    descripcion: 'Punto más posteroinferior en el ángulo de la mandíbula entre rama y cuerpo.',
    tipo: 'esqueletico',
    color: '#3b82f6',
    sugerido: { x: 0.38, y: 0.64 },
  },
  {
    id: 'Ar',
    simbolo: 'Ar',
    nombre: 'Articulare',
    descripcion: 'Intersección del borde posterior de la rama mandibular con el hueso occipital.',
    tipo: 'esqueletico',
    color: '#6366f1',
    sugerido: { x: 0.36, y: 0.49 },
  },
  {
    id: 'Co',
    simbolo: 'Co',
    nombre: 'Condilion',
    descripcion: 'Punto más superoposterior del cóndilo mandibular.',
    tipo: 'esqueletico',
    color: '#a855f7',
    sugerido: { x: 0.37, y: 0.44 },
  },
  {
    id: 'Xi',
    simbolo: 'Xi',
    nombre: 'Punto Xi (Ricketts)',
    descripcion: 'Centro geométrico de la rama ascendente mandibular.',
    tipo: 'esqueletico',
    color: '#d946ef',
    sugerido: { x: 0.42, y: 0.59 },
  },
  {
    id: 'PM',
    simbolo: 'PM',
    nombre: 'Suprapogonion / Protuberancia mentoniana (Ricketts)',
    descripcion:
      'En el borde anterior de la sínfisis, donde la curva pasa de cóncava a convexa, por encima de Pogonion.',
    tipo: 'esqueletico',
    color: '#a3e635',
    sugerido: { x: 0.6, y: 0.7 },
  },
  {
    id: 'DC',
    simbolo: 'DC',
    nombre: 'Centro del cóndilo (Ricketts)',
    descripcion: 'Centro del cuello del cóndilo, sobre la línea Ba-N.',
    tipo: 'esqueletico',
    color: '#f472b6',
    sugerido: { x: 0.36, y: 0.5 },
  },

  // --- Dentales ---
  {
    id: 'U1A',
    simbolo: 'U1A',
    nombre: 'Ápice Incisivo Superior',
    descripcion: 'Vértice apical de la raíz del incisivo central superior más vestibularizado.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: { x: 0.54, y: 0.52 },
  },
  {
    id: 'U1I',
    simbolo: 'U1I',
    nombre: 'Borde Incisal Superior',
    descripcion: 'Extremo incisal del incisivo central superior.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: { x: 0.60, y: 0.61 },
  },
  {
    id: 'L1A',
    simbolo: 'L1A',
    nombre: 'Ápice Incisivo Inferior',
    descripcion: 'Vértice apical de la raíz del incisivo central inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: { x: 0.55, y: 0.72 },
  },
  {
    id: 'L1I',
    simbolo: 'L1I',
    nombre: 'Borde Incisal Inferior',
    descripcion: 'Extremo incisal del incisivo central inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: { x: 0.59, y: 0.63 },
  },
  {
    id: 'U6C',
    simbolo: 'U6C',
    nombre: 'Cúspide Molar Superior',
    descripcion: 'Cúspide mesiovestibular del primer molar permanente superior.',
    tipo: 'dental',
    color: '#f43f5e',
    sugerido: { x: 0.49, y: 0.60 },
  },
  {
    id: 'L6C',
    simbolo: 'L6C',
    nombre: 'Cúspide Molar Inferior',
    descripcion: 'Cúspide mesiovestibular del primer molar permanente inferior.',
    tipo: 'dental',
    color: '#f43f5e',
    sugerido: { x: 0.49, y: 0.62 },
  },
  {
    id: 'U6D',
    simbolo: 'A6 / U6D',
    nombre: 'Cara Distal 1er Molar Superior',
    descripcion: 'Contorno distal de la corona del primer molar permanente superior (para Relación Molar y A6-PTV).',
    tipo: 'dental',
    color: '#fb923c',
    sugerido: { x: 0.47, y: 0.59 },
  },
  {
    id: 'L6D',
    simbolo: 'B6 / L6D',
    nombre: 'Cara Distal 1er Molar Inferior',
    descripcion: 'Contorno distal de la corona del primer molar permanente inferior (para Relación Molar).',
    tipo: 'dental',
    color: '#fb923c',
    sugerido: { x: 0.48, y: 0.63 },
  },
  {
    id: 'PmO',
    simbolo: 'PmO',
    nombre: 'Oclusión Premolar (Plano Oclusal)',
    descripcion: 'Punto de intercuspidación de los primeros premolares; junto con el molar define el Plano Oclusal Funcional.',
    tipo: 'dental',
    color: '#facc15',
    sugerido: { x: 0.54, y: 0.61 },
  },
  {
    id: 'U3C',
    simbolo: 'U3',
    nombre: 'Cúspide Canino Superior',
    descripcion: 'Vértice cuspídeo del canino superior.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: { x: 0.57, y: 0.61 },
  },
  {
    id: 'L3C',
    simbolo: 'L3',
    nombre: 'Cúspide Canino Inferior',
    descripcion: 'Vértice cuspídeo del canino inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: { x: 0.56, y: 0.62 },
  },

  // --- Tejido Blando ---
  {
    id: 'G_b',
    simbolo: 'G\'',
    nombre: 'Glabela Blanda',
    descripcion: 'Punto más prominente del contorno de la frente en el plano sagital.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.60, y: 0.23 },
  },
  {
    id: 'Na_b',
    simbolo: 'Na\'',
    nombre: 'Nasion Blando',
    descripcion: 'Punto más profundo en la curvatura de la raíz nasal de tejido blando.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.61, y: 0.28 },
  },
  {
    id: 'Pn',
    simbolo: 'Pn',
    nombre: 'Pronasale / Punta Nasal',
    descripcion: 'Punto más anterior y prominente de la punta nasal blanda.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.68, y: 0.45 },
  },
  {
    id: 'Sn',
    simbolo: 'Sn',
    nombre: 'Subnasale',
    descripcion: 'Punto en la unión entre la columela nasal y el labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.62, y: 0.51 },
  },
  {
    id: 'A_b',
    simbolo: 'A\'',
    nombre: 'Punto A Blando',
    descripcion: 'Punto más cóncavo del filtrum del labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.62, y: 0.54 },
  },
  {
    id: 'UL',
    simbolo: 'UL / Ls',
    nombre: 'Labio Superior (Labrale Superius)',
    descripcion: 'Punto más anterior y prominente del bermellón del labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.64, y: 0.58 },
  },
  {
    id: 'Em',
    simbolo: 'Em / St',
    nombre: 'Comisura Labial (Stomion)',
    descripcion: 'Punto de contacto entre el labio superior e inferior en reposo (para longitud labial y plano oclusal).',
    tipo: 'blando',
    color: '#4ade80',
    sugerido: { x: 0.63, y: 0.61 },
  },
  {
    id: 'LL',
    simbolo: 'LL / Li',
    nombre: 'Labio Inferior (Labrale Inferius)',
    descripcion: 'Punto más anterior y prominente del bermellón del labio inferior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.63, y: 0.64 },
  },
  {
    id: 'B_b',
    simbolo: 'B\'',
    nombre: 'Punto B Blando (Surco Mentolabial)',
    descripcion: 'Punto más profundo de la hendidura entre el labio inferior y el mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.61, y: 0.68 },
  },
  {
    id: 'Pog_b',
    simbolo: 'Pog\'',
    nombre: 'Pogonion Blando',
    descripcion: 'Punto más anterior del contorno de tejido blando del mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.62, y: 0.74 },
  },
  {
    id: 'Me_b',
    simbolo: 'Me\'',
    nombre: 'Mentoniano Blando',
    descripcion: 'Punto más inferior del contorno de tejido blando del mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: { x: 0.58, y: 0.81 },
  },
];

/**
 * Conexiones anatómicas para el trazado cefalométrico (Líneas y Polígonos)
 */
export interface SegmentoCefalometrico {
  id: string;
  de: string;
  a: string;
  color: string;
  dash?: boolean;
  grosor?: number;
  etiqueta?: string;
}

export const SEGMENTOS_CEFALOMETRICOS: SegmentoCefalometrico[] = [
  // Base de cráneo
  { id: 'SN', de: 'S', a: 'N', color: '#3b82f6', grosor: 2, etiqueta: 'Base Craneal Ant.' },
  { id: 'SBa', de: 'S', a: 'Ba', color: '#3b82f6', dash: true, grosor: 1.5, etiqueta: 'Base Craneal Post.' },

  // Plano de Frankfurt
  { id: 'PoOr', de: 'Po', a: 'Or', color: '#10b981', grosor: 2, etiqueta: 'Frankfurt' },

  // Plano Palatino
  { id: 'PNSANS', de: 'PNS', a: 'ANS', color: '#06b6d4', grosor: 2, etiqueta: 'Plano Palatino' },

  // Plano Mandibular
  { id: 'GoMe', de: 'Go', a: 'Me', color: '#f59e0b', grosor: 2, etiqueta: 'Plano Mandibular' },
  { id: 'GoAr', de: 'Go', a: 'Ar', color: '#6366f1', grosor: 1.5 },
  { id: 'ArCo', de: 'Ar', a: 'Co', color: '#a855f7', grosor: 1.5 },
  { id: 'MeGn', de: 'Me', a: 'Gn', color: '#22c55e', grosor: 1.5 },
  { id: 'GnPog', de: 'Gn', a: 'Pog', color: '#eab308', grosor: 1.5 },
  { id: 'PogB', de: 'Pog', a: 'B', color: '#f97316', grosor: 1.5 },

  // Eje Facial y Crecimiento
  { id: 'PtGn', de: 'Pt', a: 'Gn', color: '#ec4899', dash: true, grosor: 1.5, etiqueta: 'Eje Facial' },
  { id: 'SGn', de: 'S', a: 'Gn', color: '#8b5cf6', dash: true, grosor: 1.5, etiqueta: 'Eje Y' },

  // Relaciones sagitales (Steiner)
  { id: 'NA', de: 'N', a: 'A', color: '#ef4444', grosor: 1.5 },
  { id: 'NB', de: 'N', a: 'B', color: '#f97316', grosor: 1.5 },
  { id: 'NPog', de: 'N', a: 'Pog', color: '#eab308', dash: true, grosor: 1 },

  // Ejes dentarios
  { id: 'U1', de: 'U1A', a: 'U1I', color: '#0284c7', grosor: 2, etiqueta: 'Eje Inc. Sup.' },
  { id: 'L1', de: 'L1A', a: 'L1I', color: '#e11d48', grosor: 2, etiqueta: 'Eje Inc. Inf.' },
  { id: 'PO', de: 'U6C', a: 'PmO', color: '#facc15', dash: true, grosor: 1.5, etiqueta: 'Plano Oclusal' },

  // Línea Estética de Ricketts
  { id: 'RickettsE', de: 'Pn', a: 'Pog_b', color: '#16a34a', dash: true, grosor: 1.5, etiqueta: 'Línea E Ricketts' },

  // Contorno facial de tejido blando
  { id: 'G_Na', de: 'G_b', a: 'Na_b', color: '#22c55e', grosor: 1.5 },
  { id: 'Na_Pn', de: 'Na_b', a: 'Pn', color: '#22c55e', grosor: 1.5 },
  { id: 'Pn_Sn', de: 'Pn', a: 'Sn', color: '#22c55e', grosor: 1.5 },
  { id: 'Sn_Ab', de: 'Sn', a: 'A_b', color: '#22c55e', grosor: 1.5 },
  { id: 'Ab_UL', de: 'A_b', a: 'UL', color: '#22c55e', grosor: 1.5 },
  { id: 'UL_LL', de: 'UL', a: 'LL', color: '#22c55e', grosor: 1.5 },
  { id: 'LL_Bb', de: 'LL', a: 'B_b', color: '#22c55e', grosor: 1.5 },
  { id: 'Bb_Pogb', de: 'B_b', a: 'Pog_b', color: '#22c55e', grosor: 1.5 },
  { id: 'Pogb_Meb', de: 'Pog_b', a: 'Me_b', color: '#22c55e', grosor: 1.5 },
];

// ==========================================
// CÁLCULOS GEOMÉTRICOS Y MATEMÁTICOS
// ==========================================

/**
 * Distancia euclidiana en píxeles entre dos puntos
 */
export function distanciaPuntos(p1: CoordenadaPunto, p2: CoordenadaPunto): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Ángulo entre 3 puntos (P1 - Vértice - P2) en grados sexagesimales [0..180]
 */
export function anguloEntre3Puntos(
  p1: CoordenadaPunto,
  vertice: CoordenadaPunto,
  p2: CoordenadaPunto
): number {
  const v1 = { x: p1.x - vertice.x, y: p1.y - vertice.y };
  const v2 = { x: p2.x - vertice.x, y: p2.y - vertice.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Ángulo entre 2 segmentos/rectas (AB y CD) en grados sexagesimales
 */
export function anguloEntreLineas(
  a: CoordenadaPunto,
  b: CoordenadaPunto,
  c: CoordenadaPunto,
  d: CoordenadaPunto
): number {
  const v1 = { x: b.x - a.x, y: b.y - a.y };
  const v2 = { x: d.x - c.x, y: d.y - c.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, Math.abs(dot) / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Ángulo entre dos vectores CON SENTIDO (A→B y C→D), en grados [0..180].
 *
 * `anguloEntreLineas` devuelve siempre el ángulo agudo (0..90), que sirve para
 * FMA o 1-NA pero NO para medidas que normalmente pasan de 90°: el
 * interincisivo (norma 131°) salía siempre por debajo de 90 y el informe decía
 * "biproinclinación" en todos los pacientes. Con el sentido de cada vector se
 * obtiene el ángulo que se mide en el trazado de papel.
 */
export function anguloEntreVectores(
  a: CoordenadaPunto,
  b: CoordenadaPunto,
  c: CoordenadaPunto,
  d: CoordenadaPunto
): number {
  const v1 = { x: b.x - a.x, y: b.y - a.y };
  const v2 = { x: d.x - c.x, y: d.y - c.y };
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Hacia qué lado mira el paciente en la radiografía: +1 a la derecha, -1 a la
 * izquierda. Nasion está siempre por delante de Sella. Hace falta para el signo
 * de las distancias a la línea E: "delante" de la línea es un lado u otro
 * según cómo se haya tomado la placa.
 */
export function sentidoPerfil(puntos: PuntosCefalometricosMap): 1 | -1 {
  const S = puntos['S'];
  const N = puntos['N'];
  if (S && N && N.x < S.x) return -1;
  return 1;
}

/**
 * Distancia perpendicular de un punto P a la recta definida por A y B
 * Signo: positivo si está por delante de la línea en sentido X, negativo si detrás.
 */
export function distanciaPuntoALinea(
  punto: CoordenadaPunto,
  lineaA: CoordenadaPunto,
  lineaB: CoordenadaPunto,
  pxPorMm?: number
): number {
  const dx = lineaB.x - lineaA.x;
  const dy = lineaB.y - lineaA.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return 0;

  // Producto cruzado con signo
  const cross = (punto.x - lineaA.x) * dy - (punto.y - lineaA.y) * dx;
  const distPx = cross / mag;

  if (pxPorMm && pxPorMm > 0) {
    return distPx / pxPorMm;
  }
  return distPx;
}

/** Proyección perpendicular de un punto P sobre la recta definida por A y B. */
export function proyeccionSobreRecta(
  p: CoordenadaPunto,
  a: CoordenadaPunto,
  b: CoordenadaPunto
): CoordenadaPunto {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const mag2 = vx * vx + vy * vy;
  if (mag2 === 0) return a;
  const t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / mag2;
  return { x: a.x + t * vx, y: a.y + t * vy };
}

/** Intersección de dos rectas (A-B y C-D). Devuelve null si son paralelas. */
export function interseccionRectas(
  a: CoordenadaPunto,
  b: CoordenadaPunto,
  c: CoordenadaPunto,
  d: CoordenadaPunto
): CoordenadaPunto | null {
  const a1 = b.y - a.y;
  const b1 = a.x - b.x;
  const c1 = a1 * a.x + b1 * a.y;

  const a2 = d.y - c.y;
  const b2 = c.x - d.x;
  const c2 = a2 * c.x + b2 * c.y;

  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (b2 * c1 - b1 * c2) / det,
    y: (a1 * c2 - a2 * c1) / det,
  };
}

/** Vector unitario en la dirección A→B. */
function vectorUnitario(a: CoordenadaPunto, b: CoordenadaPunto): CoordenadaPunto | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return null;
  return { x: dx / mag, y: dy / mag };
}

/** Proyección escalar del vector P1→P2 sobre el eje unitario `dir`, en milímetros. */
function proyeccionEnMm(
  p1: CoordenadaPunto,
  p2: CoordenadaPunto,
  dir: CoordenadaPunto,
  pxPorMm: number
): number {
  return ((p2.x - p1.x) * dir.x + (p2.y - p1.y) * dir.y) / pxPorMm;
}

// ==========================================
// ANÁLISIS CEFALOMÉTRICO (STEINER / TWEED / RICKETTS)
// ==========================================

export function calcularAnalisisCefalometrico(
  puntos: PuntosCefalometricosMap,
  calibracion: CalibracionRegla
): MedicionResultado[] {
  const resultados: MedicionResultado[] = [];
  const pxPorMm = calibracion.pixelesPorMm;
  const sentido = sentidoPerfil(puntos);

  const S = puntos['S'];
  const N = puntos['N'];
  const A = puntos['A'];
  const B = puntos['B'];
  const Po = puntos['Po'];
  const Or = puntos['Or'];
  const Go = puntos['Go'];
  const Me = puntos['Me'];
  const Pt = puntos['Pt'];
  const PM = puntos['PM'];
  const DC = puntos['DC'];
  const Xi = puntos['Xi'];
  const ANS = puntos['ANS'];
  const Pog = puntos['Pog'];
  const Ba = puntos['Ba'];
  const Gn = puntos['Gn'];
  const U1A = puntos['U1A'];
  const U1I = puntos['U1I'];
  const L1A = puntos['L1A'];
  const L1I = puntos['L1I'];
  const Pn = puntos['Pn'];
  const Pog_b = puntos['Pog_b'];
  const UL = puntos['UL'];
  const LL = puntos['LL'];
  const Em = puntos['Em'];
  const PNS = puntos['PNS'];
  const U6C = puntos['U6C'];
  const L6C = puntos['L6C'];
  const U6D = puntos['U6D'];
  const L6D = puntos['L6D'];
  const PmO = puntos['PmO'];
  const U3C = puntos['U3C'];
  const L3C = puntos['L3C'];

  // 1. SNA (Ángulo S-N-A) - Posición maxilar
  if (S && N && A) {
    const sna = anguloEntre3Puntos(S, N, A);
    const norma = 82;
    const desv = Number((sna - norma).toFixed(1));
    resultados.push({
      nombre: 'SNA (Maxilar respecto a Base Craneal)',
      sigla: 'SNA',
      tipo: 'angulo',
      valor: Number(sna.toFixed(1)),
      unidad: '°',
      norma: '82° (± 2°)',
      desviacion: desv,
      enNorma: Math.abs(desv) <= 2,
      interpretacion:
        desv > 2 ? 'Prognatismo maxilar' : desv < -2 ? 'Retrognatismo maxilar' : 'Normoposición maxilar',
      esqueletica: true,
    });
  }

  // 2. SNB (Ángulo S-N-B) - Posición mandibular
  if (S && N && B) {
    const snb = anguloEntre3Puntos(S, N, B);
    const norma = 80;
    const desv = Number((snb - norma).toFixed(1));
    resultados.push({
      nombre: 'SNB (Mandíbula respecto a Base Craneal)',
      sigla: 'SNB',
      tipo: 'angulo',
      valor: Number(snb.toFixed(1)),
      unidad: '°',
      norma: '80° (± 2°)',
      desviacion: desv,
      enNorma: Math.abs(desv) <= 2,
      interpretacion:
        desv > 2 ? 'Prognatismo mandibular' : desv < -2 ? 'Retrognatismo mandibular' : 'Normoposición mandibular',
      esqueletica: true,
    });
  }

  // 3. ANB (Diferencia Sagital Esquelética)
  if (S && N && A && B) {
    const sna = anguloEntre3Puntos(S, N, A);
    const snb = anguloEntre3Puntos(S, N, B);
    const anb = Number((sna - snb).toFixed(1));
    resultados.push({
      nombre: 'ANB (Relación Sagital Maxilo-Mandibular)',
      sigla: 'ANB',
      tipo: 'angulo',
      valor: anb,
      unidad: '°',
      norma: '2° (± 2°)',
      desviacion: Number((anb - 2).toFixed(1)),
      enNorma: anb >= 0 && anb <= 4,
      interpretacion:
        anb > 4
          ? 'Clase II Esquelética'
          : anb < 0
          ? 'Clase III Esquelética'
          : 'Clase I Esquelética (Armónica)',
      esqueletica: true,
    });
  }

  // 4. FMA (Plano de Frankfurt a Plano Mandibular) - Crecimiento vertical
  if (Po && Or && Go && Me) {
    const fma = anguloEntreLineas(Po, Or, Go, Me);
    const norma = 25;
    const desv = Number((fma - norma).toFixed(1));
    resultados.push({
      nombre: 'FMA (Frankfurt a Plano Mandibular - Tweed)',
      sigla: 'FMA',
      tipo: 'angulo',
      valor: Number(fma.toFixed(1)),
      unidad: '°',
      norma: '25° (± 3°)',
      desviacion: desv,
      enNorma: Math.abs(desv) <= 3,
      interpretacion:
        desv > 3
          ? 'Hiperdivergente (Mordida abierta / Dolicofacial)'
          : desv < -3
          ? 'Hipodivergente (Mordida profunda / Braquifacial)'
          : 'Normodivergente (Mesofacial)',
      esqueletica: true,
    });
  }

  // 5. Eje Facial de Ricketts (Factor 20): Pt-Gn respecto a Ba-N. Es el ángulo posterior
  // inferior (entre Pt→Gn y N→Ba): crece cuando el mentón va hacia adelante.
  if (Pt && Gn && Ba && N) {
    const ejeFacial = anguloEntreVectores(Pt, Gn, N, Ba);
    resultados.push({
      nombre: 'Eje Facial (Dirección de Crecimiento - Ricketts)',
      sigla: 'Eje Facial',
      tipo: 'angulo',
      valor: Number(ejeFacial.toFixed(1)),
      unidad: '°',
      norma: '90° (± 3,5°)',
      desviacion: Number((ejeFacial - 90).toFixed(1)),
      enNorma: Math.abs(ejeFacial - 90) <= 3.5,
      interpretacion:
        ejeFacial > 93.5
          ? 'Crecimiento horizontal / Cierre'
          : ejeFacial < 86.5
          ? 'Crecimiento vertical / Apertura'
          : 'Crecimiento equilibrado',
      esqueletica: true,
      campo: 'Campo V · Relación Craneofacial',
      factorNumero: 20,
    });
  }

  // 6. IMPA (Incisivo Inferior a Plano Mandibular)
  if (L1A && L1I && Go && Me) {
    // Eje del incisivo (ápice → borde) contra el plano mandibular hacia atrás
    // (Me → Go): es el ángulo posterior, que pasa de 90° cuando el incisivo
    // está proinclinado.
    const impa = anguloEntreVectores(L1A, L1I, Me, Go);
    const norma = 90;
    const desv = Number((impa - norma).toFixed(1));
    resultados.push({
      nombre: 'IMPA (Incisivo Inferior a Plano Mandibular)',
      sigla: 'IMPA',
      tipo: 'angulo',
      valor: Number(impa.toFixed(1)),
      unidad: '°',
      norma: '90° (± 3°)',
      desviacion: desv,
      enNorma: Math.abs(desv) <= 3,
      interpretacion:
        desv > 3 ? 'Proinclinación inferior' : desv < -3 ? 'Retroinclinación inferior' : 'Normoinclinación inferior',
      esqueletica: false,
    });
  }

  // 7. Ángulo Interincisivo (U1 a L1) - Factor 6 de Ricketts
  if (U1A && U1I && L1A && L1I) {
    // Ángulo entre los dos ejes, cada uno de ápice a borde incisal.
    const interinc = anguloEntreVectores(U1A, U1I, L1A, L1I);
    const norma = 130;
    const desv = Number((interinc - norma).toFixed(1));
    resultados.push({
      nombre: 'Ángulo Interincisivo (U1 - L1)',
      sigla: 'Interincisivo',
      tipo: 'angulo',
      valor: Number(interinc.toFixed(1)),
      unidad: '°',
      norma: '130° (± 6°)',
      desviacion: desv,
      enNorma: Math.abs(desv) <= 6,
      interpretacion:
        desv < -6 ? 'Biproinclinación dentaria' : desv > 6 ? 'Biretroinclinación dentaria' : 'Inclinación normal',
      esqueletica: false,
      campo: 'Campo I · Problema Dentario',
      factorNumero: 6,
    });
  }

  // 8. 1-NA (Incisivo Superior a NA)
  if (U1A && U1I && N && A) {
    const u1na = anguloEntreLineas(U1A, U1I, N, A);
    resultados.push({
      nombre: '1 a NA (Ángulo de Steiner)',
      sigla: '1-NA (°)',
      tipo: 'angulo',
      valor: Number(u1na.toFixed(1)),
      unidad: '°',
      norma: '22° (± 2°)',
      desviacion: Number((u1na - 22).toFixed(1)),
      enNorma: u1na >= 20 && u1na <= 24,
      interpretacion: u1na > 24 ? 'Proinclinado' : u1na < 20 ? 'Retroinclinado' : 'Normal',
      esqueletica: false,
    });
  }

  // 9. 1-NB (Incisivo Inferior a NB)
  if (L1A && L1I && N && B) {
    const l1nb = anguloEntreLineas(L1A, L1I, N, B);
    resultados.push({
      nombre: '1 a NB (Ángulo de Steiner)',
      sigla: '1-NB (°)',
      tipo: 'angulo',
      valor: Number(l1nb.toFixed(1)),
      unidad: '°',
      norma: '25° (± 2°)',
      desviacion: Number((l1nb - 25).toFixed(1)),
      enNorma: l1nb >= 23 && l1nb <= 27,
      interpretacion: l1nb > 27 ? 'Proinclinado' : l1nb < 23 ? 'Retroinclinado' : 'Normal',
      esqueletica: false,
    });
  }

  // 10. Labio Superior a Línea E de Ricketts (complementario)
  // Positivo = labio por delante de la línea E; negativo = por detrás.
  if (Pn && Pog_b && UL && pxPorMm) {
    const distUL = sentido * distanciaPuntoALinea(UL, Pn, Pog_b, pxPorMm);
    resultados.push({
      nombre: 'Labio Superior a Línea E (Ricketts)',
      sigla: 'UL-E (mm)',
      tipo: 'distancia',
      valor: Number(distUL.toFixed(1)),
      desviacion: Number((distUL + 4).toFixed(1)),
      enNorma: distUL >= -6 && distUL <= -2,
      unidad: 'mm',
      norma: '-4 mm (± 2 mm)',
      interpretacion: distUL > -2 ? 'Labio superior protrusivo' : distUL < -6 ? 'Labio superior retrusivo' : 'Perfil armónico',
      esqueletica: false,
      campo: 'Campo IV · Problema Estético',
    });
  }

  // 11. Labio Inferior a Línea E de Ricketts (Factor 16: Protrusión Labial)
  if (Pn && Pog_b && LL && pxPorMm) {
    const distLL = sentido * distanciaPuntoALinea(LL, Pn, Pog_b, pxPorMm);
    resultados.push({
      nombre: 'Protrusión Labial (Labio Inferior a Línea E)',
      sigla: 'LL-E (mm)',
      tipo: 'distancia',
      valor: Number(distLL.toFixed(1)),
      desviacion: Number((distLL + 2).toFixed(1)),
      enNorma: distLL >= -4 && distLL <= 0,
      unidad: 'mm',
      norma: '-2 mm (± 2 mm)',
      interpretacion: distLL > 0 ? 'Labio inferior protrusivo' : distLL < -4 ? 'Labio inferior retrusivo' : 'Perfil armónico',
      esqueletica: false,
      campo: 'Campo IV · Problema Estético',
      factorNumero: 16,
    });
  }

  // ================================================================
  // RICKETTS COMPLETO (33 FACTORES EN 6 CAMPOS)
  // ================================================================
  // Normas de adulto/referencia. En niños varias cambian con la edad (el ángulo facial
  // aumenta ~1° cada 3 años): la interpretación es orientativa y la decide el
  // profesional.
  const empujar = (
    m: Omit<MedicionResultado, 'desviacion' | 'enNorma' | 'interpretacion'> & {
      normaValor: number;
      tolerancia: number;
    },
    textos: [mas: string, menos: string, normal: string]
  ) => {
    const { normaValor, tolerancia, ...resto } = m;
    const desv = Number((m.valor - normaValor).toFixed(1));
    const enNorma = Math.abs(desv) <= tolerancia;
    resultados.push({
      ...resto,
      desviacion: desv,
      enNorma,
      interpretacion: desv > tolerancia ? textos[0] : desv < -tolerancia ? textos[1] : textos[2],
    });
  };

  // Puntos construidos geométricamente (CF, CC) y ejes de referencia (PO, FH)
  const cf = Po && Or && Pt ? proyeccionSobreRecta(Pt, Po, Or) : null;
  const cc = Ba && N && Pt && Gn ? interseccionRectas(Ba, N, Pt, Gn) : null;
  const dirFH = Po && Or ? vectorUnitario(Po, Or) : null;

  // Plano Oclusal Funcional: punto posterior (punto medio molar) -> punto anterior (PmO)
  const poPost =
    U6C && L6C
      ? { x: (U6C.x + L6C.x) / 2, y: (U6C.y + L6C.y) / 2 }
      : U6C ?? L6C ?? (U6D && L6D ? { x: (U6D.x + L6D.x) / 2, y: (U6D.y + L6D.y) / 2 } : null);
  const poAnt = PmO ?? null;
  const dirPO = poPost && poAnt ? vectorUnitario(poPost, poAnt) : null;
  const dirPOAbajo = dirPO ? { x: -sentido * dirPO.y, y: sentido * dirPO.x } : null;

  // --- CAMPO I: PROBLEMA DENTARIO ---
  if (U6D && L6D && dirPO && pxPorMm) {
    empujar(
      {
        nombre: 'Relación molar (A6-B6 sobre PO)',
        sigla: 'Relación molar',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(L6D, U6D, dirPO, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-3 mm (± 3 mm)',
        normaValor: -3,
        tolerancia: 3,
        esqueletica: false,
        campo: 'Campo I · Problema Dentario',
        factorNumero: 1,
      },
      ['Tendencia Clase II molar', 'Tendencia Clase III molar', 'Clase I molar']
    );
  }

  if (U3C && L3C && dirPO && pxPorMm) {
    empujar(
      {
        nombre: 'Relación canina (U3-L3 sobre PO)',
        sigla: 'Relación canina',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(L3C, U3C, dirPO, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-2 mm (± 3 mm)',
        normaValor: -2,
        tolerancia: 3,
        esqueletica: false,
        campo: 'Campo I · Problema Dentario',
        factorNumero: 2,
      },
      ['Tendencia Clase II canina', 'Tendencia Clase III canina', 'Clase I canina']
    );
  }

  if (U1I && L1I && dirPO && pxPorMm) {
    empujar(
      {
        nombre: 'Overjet incisivo (Resalte)',
        sigla: 'Overjet',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(L1I, U1I, dirPO, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '2,5 mm (± 2,5 mm)',
        normaValor: 2.5,
        tolerancia: 2.5,
        esqueletica: false,
        campo: 'Campo I · Problema Dentario',
        factorNumero: 3,
      },
      ['Overjet aumentado', 'Mordida cruzada / borde a borde', 'Overjet normal']
    );
  }

  if (U1I && L1I && dirPOAbajo && pxPorMm) {
    empujar(
      {
        nombre: 'Overbite incisivo (Sobremordida)',
        sigla: 'Overbite',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(L1I, U1I, dirPOAbajo, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '2,5 mm (± 2 mm)',
        normaValor: 2.5,
        tolerancia: 2,
        esqueletica: false,
        campo: 'Campo I · Problema Dentario',
        factorNumero: 4,
      },
      ['Sobremordida profunda', 'Mordida abierta anterior', 'Overbite normal']
    );
  }

  if (L1I && poPost && dirPOAbajo && pxPorMm) {
    empujar(
      {
        nombre: 'Extrusión del incisivo inferior (L1 a PO)',
        sigla: 'Extrusión L1',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(poPost, L1I, { x: -dirPOAbajo.x, y: -dirPOAbajo.y }, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '1,25 mm (± 2 mm)',
        normaValor: 1.25,
        tolerancia: 2,
        esqueletica: false,
        campo: 'Campo I · Problema Dentario',
        factorNumero: 5,
      },
      ['Incisivo inferior extruido', 'Incisivo inferior intruido', 'Nivel incisivo normal']
    );
  }

  // --- CAMPO II: RELACIÓN MAXILO-MANDIBULAR ---
  // Convexidad: distancia de A al plano facial N-Pog (positivo = A por delante).
  if (A && N && Pog && pxPorMm) {
    empujar(
      { nombre: 'Convexidad facial (A a N-Pog)', sigla: 'Convexidad', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(A, N, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '2 mm (± 2 mm)', normaValor: 2, tolerancia: 2, esqueletica: true,
        campo: 'Campo II · Relación Maxilo-Mandibular', factorNumero: 7 },
      ['Perfil convexo (tendencia Clase II)', 'Perfil cóncavo (tendencia Clase III)', 'Convexidad normal']
    );
  }

  // Altura facial inferior: ANS-Xi-PM.
  if (ANS && Xi && PM) {
    empujar(
      { nombre: 'Altura facial inferior (ANS-Xi-PM)', sigla: 'AFI', tipo: 'angulo',
        valor: Number(anguloEntre3Puntos(ANS, Xi, PM).toFixed(1)), unidad: '°',
        norma: '47° (± 4°)', normaValor: 47, tolerancia: 4, esqueletica: true,
        campo: 'Campo II · Relación Maxilo-Mandibular', factorNumero: 8 },
      ['Altura facial inferior aumentada (mordida abierta)', 'Altura facial inferior disminuida (mordida profunda)', 'Altura facial inferior normal']
    );
  }

  // --- CAMPO III: DENTOESQUELÉTICO ---
  if (U6D && Pt && dirFH && pxPorMm) {
    empujar(
      {
        nombre: 'Posición del molar superior (A6 a PTV)',
        sigla: 'A6-PTV',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(Pt, U6D, dirFH, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: 'Edad + 3 mm (ref. 18 ± 3 mm)',
        normaValor: 18,
        tolerancia: 3,
        esqueletica: false,
        campo: 'Campo III · Dentoesquelético',
        factorNumero: 9,
      },
      ['Molar superior mesializado (poco espacio posterior)', 'Molar superior distalizado', 'Posición molar adecuada']
    );
  }

  // Incisivo inferior respecto de A-Pog: posición (mm) e inclinación (°).
  if (L1I && A && Pog && pxPorMm) {
    empujar(
      { nombre: 'Protrusión del Incisivo Inferior (L1 a A-Pog)', sigla: 'L1-APog (mm)', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(L1I, A, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '1 mm (± 2,2 mm)', normaValor: 1, tolerancia: 2.2, esqueletica: false,
        campo: 'Campo III · Dentoesquelético', factorNumero: 10 },
      ['Incisivo inferior protruido', 'Incisivo inferior retruido', 'Posición normal']
    );
  }
  if (U1I && A && Pog && pxPorMm) {
    empujar(
      { nombre: 'Protrusión del Incisivo Superior (U1 a A-Pog)', sigla: 'U1-APog (mm)', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(U1I, A, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '3,5 mm (± 2,3 mm)', normaValor: 3.5, tolerancia: 2.3, esqueletica: false,
        campo: 'Campo III · Dentoesquelético', factorNumero: 11 },
      ['Incisivo superior protruido', 'Incisivo superior retruido', 'Posición normal']
    );
  }
  if (L1A && L1I && A && Pog) {
    empujar(
      { nombre: 'Inclinación del Incisivo Inferior (L1 a A-Pog)', sigla: 'L1-APog (°)', tipo: 'angulo',
        valor: Number(anguloEntreLineas(L1A, L1I, A, Pog).toFixed(1)), unidad: '°',
        norma: '22° (± 4°)', normaValor: 22, tolerancia: 4, esqueletica: false,
        campo: 'Campo III · Dentoesquelético', factorNumero: 12 },
      ['Incisivo inferior proinclinado', 'Incisivo inferior retroinclinado', 'Inclinación normal']
    );
  }
  if (U1A && U1I && A && Pog) {
    empujar(
      { nombre: 'Inclinación del Incisivo Superior (U1 a A-Pog)', sigla: 'U1-APog (°)', tipo: 'angulo',
        valor: Number(anguloEntreLineas(U1A, U1I, A, Pog).toFixed(1)), unidad: '°',
        norma: '28° (± 4°)', normaValor: 28, tolerancia: 4, esqueletica: false,
        campo: 'Campo III · Dentoesquelético', factorNumero: 13 },
      ['Incisivo superior proinclinado', 'Incisivo superior retroinclinado', 'Inclinación normal']
    );
  }

  if (Xi && poPost && dirPOAbajo && pxPorMm) {
    empujar(
      {
        nombre: 'Plano Oclusal a la Rama (PO a Xi)',
        sigla: 'PO-Xi',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(poPost, Xi, dirPOAbajo, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '3,5 mm (± 3 mm)',
        normaValor: 3.5,
        tolerancia: 3,
        esqueletica: false,
        campo: 'Campo III · Dentoesquelético',
        factorNumero: 14,
      },
      ['Plano oclusal alto respecto a Xi', 'Plano oclusal bajo respecto a Xi', 'Plano oclusal en norma']
    );
  }

  if (poPost && poAnt && Xi && PM) {
    empujar(
      {
        nombre: 'Inclinación del Plano Oclusal (PO a Xi-PM)',
        sigla: 'PO-XiPM',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(poPost, poAnt, Xi, PM).toFixed(1)),
        unidad: '°',
        norma: '22° (± 4°)',
        normaValor: 22,
        tolerancia: 4,
        esqueletica: false,
        campo: 'Campo III · Dentoesquelético',
        factorNumero: 15,
      },
      ['Plano oclusal inclinado / abierto', 'Plano oclusal plano', 'Inclinación oclusal normal']
    );
  }

  // --- CAMPO IV: PROBLEMA ESTÉTICO ---
  if (ANS && Em && pxPorMm) {
    empujar(
      {
        nombre: 'Largura del Labio Superior (ANS a Em)',
        sigla: 'Long. labio sup.',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(ANS, Em) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '24 mm (± 2 mm)',
        normaValor: 24,
        tolerancia: 2,
        esqueletica: false,
        campo: 'Campo IV · Problema Estético',
        factorNumero: 17,
      },
      ['Labio superior largo', 'Labio superior corto (sonrisa gingival)', 'Longitud labial normal']
    );
  }

  if (Em && poPost && dirPOAbajo && pxPorMm) {
    empujar(
      {
        nombre: 'Punto de Unión Interlabial (Em a PO)',
        sigla: 'Em-PO',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(poPost, Em, dirPOAbajo, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-3 mm (± 2 mm)',
        normaValor: -3,
        tolerancia: 2,
        esqueletica: false,
        campo: 'Campo IV · Problema Estético',
        factorNumero: 18,
      },
      ['Plano oclusal alto / poca exposición incisiva', 'Plano oclusal bajo / sobreexposición', 'Exposición labial armónica']
    );
  }

  // --- CAMPO V: RELACIÓN CRANEOFACIAL ---
  // Ángulo facial (profundidad facial): Frankfort con N-Pog.
  if (Po && Or && N && Pog) {
    empujar(
      { nombre: 'Profundidad Facial (Ángulo Facial)', sigla: 'Ángulo facial', tipo: 'angulo',
        valor: Number(anguloEntreVectores(Po, Or, Pog, N).toFixed(1)), unidad: '°',
        norma: '87° (± 3°)', normaValor: 87, tolerancia: 3, esqueletica: true,
        campo: 'Campo V · Relación Craneofacial', factorNumero: 19 },
      ['Mandíbula adelantada (tendencia Clase III)', 'Mandíbula retruida (tendencia Clase II)', 'Posición mandibular normal']
    );
  }

  if (N && Pog && Go && Me) {
    empujar(
      {
        nombre: 'Cono Facial (N-Pog a Go-Me)',
        sigla: 'Cono facial',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(N, Pog, Go, Me).toFixed(1)),
        unidad: '°',
        norma: '68° (± 3,5°)',
        normaValor: 68,
        tolerancia: 3.5,
        esqueletica: true,
        campo: 'Campo V · Relación Craneofacial',
        factorNumero: 21,
      },
      ['Cono facial cerrado (braquifacial)', 'Cono facial abierto (dolicofacial)', 'Cono facial normal']
    );
  }

  // Profundidad maxilar: Frankfort con N-A.
  if (Po && Or && N && A) {
    empujar(
      { nombre: 'Profundidad Maxilar', sigla: 'Prof. maxilar', tipo: 'angulo',
        valor: Number(anguloEntreVectores(Po, Or, A, N).toFixed(1)), unidad: '°',
        norma: '90° (± 3°)', normaValor: 90, tolerancia: 3, esqueletica: true,
        campo: 'Campo V · Relación Craneofacial', factorNumero: 22 },
      ['Maxilar adelantado', 'Maxilar retruido', 'Maxilar bien ubicado']
    );
  }

  if (N && cf && A) {
    empujar(
      {
        nombre: 'Altura Maxilar (N-CF-A)',
        sigla: 'Altura maxilar',
        tipo: 'angulo',
        valor: Number(anguloEntre3Puntos(N, cf, A).toFixed(1)),
        unidad: '°',
        norma: '53° (± 3°)',
        normaValor: 53,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo V · Relación Craneofacial',
        factorNumero: 23,
      },
      ['Maxilar descendido verticalmente', 'Maxilar ascendido', 'Altura maxilar normal']
    );
  }

  if (ANS && PNS && Po && Or) {
    const angFH = Math.atan2(Or.y - Po.y, Or.x - Po.x);
    const angPP = Math.atan2(ANS.y - PNS.y, ANS.x - PNS.x);
    let diffDeg = ((angPP - angFH) * 180) / Math.PI;
    while (diffDeg > 180) diffDeg -= 360;
    while (diffDeg < -180) diffDeg += 360;
    empujar(
      {
        nombre: 'Plano Palatal (PP a FH)',
        sigla: 'Plano palatino',
        tipo: 'angulo',
        valor: Number((sentido * diffDeg).toFixed(1)),
        unidad: '°',
        norma: '1° (± 3,5°)',
        normaValor: 1,
        tolerancia: 3.5,
        esqueletica: true,
        campo: 'Campo V · Relación Craneofacial',
        factorNumero: 24,
      },
      ['Plano palatino inclinado hacia abajo', 'Plano palatino inclinado hacia arriba (mordida abierta)', 'Plano palatino normal']
    );
  }

  // Plano mandibular respecto a Frankfort (la versión de Ricketts).
  if (Po && Or && Go && Me) {
    empujar(
      { nombre: 'Plano Mandibular (Ricketts)', sigla: 'Plano mandibular', tipo: 'angulo',
        valor: Number(anguloEntreLineas(Po, Or, Go, Me).toFixed(1)), unidad: '°',
        norma: '26° (± 4°)', normaValor: 26, tolerancia: 4, esqueletica: true,
        campo: 'Campo V · Relación Craneofacial', factorNumero: 25 },
      ['Dolicofacial (crecimiento vertical)', 'Braquifacial (crecimiento horizontal)', 'Mesofacial']
    );
  }

  // --- CAMPO VI: ESTRUCTURAS INTERNAS ---
  // Deflexión craneal: Ba-N con Frankfort.
  if (Ba && N && Po && Or) {
    empujar(
      { nombre: 'Deflexión Craneana (Ba-N / Frankfort)', sigla: 'Deflexión craneal', tipo: 'angulo',
        valor: Number(anguloEntreLineas(Ba, N, Po, Or).toFixed(1)), unidad: '°',
        norma: '27° (± 3°)', normaValor: 27, tolerancia: 3, esqueletica: true,
        campo: 'Campo VI · Estructuras Internas', factorNumero: 26 },
      ['Base de cráneo favorece Clase III', 'Base de cráneo favorece Clase II', 'Deflexión craneal normal']
    );
  }

  if (cc && N && pxPorMm) {
    empujar(
      {
        nombre: 'Longitud Craneal Anterior (CC-N)',
        sigla: 'CC-N',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(cc, N) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '55 mm (± 2,5 mm)',
        normaValor: 55,
        tolerancia: 2.5,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 27,
      },
      ['Base craneal anterior larga', 'Base craneal anterior corta', 'Longitud craneal normal']
    );
  }

  if (Go && cf && pxPorMm) {
    empujar(
      {
        nombre: 'Altura Facial Posterior (Go-CF)',
        sigla: 'Go-CF',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(Go, cf) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '55 mm (± 3,3 mm)',
        normaValor: 55,
        tolerancia: 3.3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 28,
      },
      ['Rama mandibular larga (braquifacial)', 'Rama mandibular corta (dolicofacial)', 'Altura facial posterior normal']
    );
  }

  if (Ba && N && Xi && PM) {
    empujar(
      {
        nombre: 'Altura Facial Total (Ba-N a Xi-PM)',
        sigla: 'Altura facial total',
        tipo: 'angulo',
        valor: Number(anguloEntreVectores(Ba, N, Xi, PM).toFixed(1)),
        unidad: '°',
        norma: '60° (± 3°)',
        normaValor: 60,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 29,
      },
      ['Altura facial total aumentada (dolicofacial)', 'Altura facial total disminuida (braquifacial)', 'Altura facial total normal']
    );
  }

  if (Po && Or && cf && Xi) {
    empujar(
      {
        nombre: 'Posición de la Rama (FH a CF-Xi)',
        sigla: 'Posición rama',
        tipo: 'angulo',
        valor: Number(anguloEntreVectores(Or, Po, cf, Xi).toFixed(1)),
        unidad: '°',
        norma: '76° (± 3°)',
        normaValor: 76,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 30,
      },
      ['Rama adelantada (tendencia Clase III)', 'Rama posterior (tendencia Clase II)', 'Posición de rama normal']
    );
  }

  if (Po && Pt && dirFH && pxPorMm) {
    empujar(
      {
        nombre: 'Posición de la ATM (Po a PTV)',
        sigla: 'Po-PTV',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(Pt, Po, dirFH, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-31 mm (± 2 mm)',
        normaValor: -31,
        tolerancia: 2,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 31,
      },
      ['ATM adelantada (tendencia Clase III)', 'ATM posterior (tendencia Clase II)', 'Posición de ATM normal']
    );
  }

  // Arco mandibular: eje del cóndilo (DC-Xi) con el cuerpo (Xi-PM).
  if (DC && Xi && PM) {
    empujar(
      { nombre: 'Arco Mandibular (DC-Xi / Xi-PM)', sigla: 'Arco mandibular', tipo: 'angulo',
        valor: Number((180 - anguloEntre3Puntos(DC, Xi, PM)).toFixed(1)), unidad: '°',
        norma: '26° (± 4°)', normaValor: 26, tolerancia: 4, esqueletica: true,
        campo: 'Campo VI · Estructuras Internas', factorNumero: 32 },
      ['Mandíbula cuadrada (braquifacial)', 'Mandíbula abierta (dolicofacial)', 'Arco mandibular normal']
    );
  }

  if (Xi && PM && pxPorMm) {
    empujar(
      {
        nombre: 'Longitud Cuerpo Mandibular (Xi-PM)',
        sigla: 'Xi-PM',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(Xi, PM) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '65 mm (± 2,7 mm)',
        normaValor: 65,
        tolerancia: 2.7,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 33,
      },
      ['Cuerpo mandibular largo (tendencia Clase III)', 'Cuerpo mandibular corto (tendencia Clase II)', 'Longitud mandibular normal']
    );
  }

  // ================================================================
  // MCNAMARA, STEINER EXTRA Y WITS (Hoja Post-grado UAP)
  // ================================================================
  // McNamara: perpendicular a Frankfort pasando por Nasion (N-perp).
  if (Po && Or && N && A && dirFH && pxPorMm) {
    empujar(
      {
        nombre: 'Línea McNamara – Punto A (N-perp a A)',
        sigla: 'McNamara-A',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(N, A, dirFH, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '0 mm (± 1 mm)',
        normaValor: 0,
        tolerancia: 1,
        esqueletica: true,
      },
      ['Protrusión maxilar', 'Retrusión maxilar', 'Maxilar en norma']
    );
  }
  if (Po && Or && N && Pog && dirFH && pxPorMm) {
    empujar(
      {
        nombre: 'Línea McNamara – a Pog. (N-perp a Pog)',
        sigla: 'McNamara-Pog',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(N, Pog, dirFH, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-4 a 0 mm (jóvenes -8 a -6)',
        normaValor: -2,
        tolerancia: 2,
        esqueletica: true,
      },
      ['Prognatismo mandibular', 'Retrognatismo mandibular', 'Mandíbula en norma']
    );
  }

  // Steiner adicionales: Go-Gn-Sn (32°) y 1-Plano Maxilar (110°)
  if (S && N && Go && Gn) {
    empujar(
      {
        nombre: 'Go-Gn a Base Craneal (Steiner)',
        sigla: 'Go-Gn-Sn',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(S, N, Go, Gn).toFixed(1)),
        unidad: '°',
        norma: '32° (± 4°)',
        normaValor: 32,
        tolerancia: 4,
        esqueletica: true,
      },
      ['Patrón hiperdivergente', 'Patrón hipodivergente', 'Crecimiento vertical normal']
    );
  }
  if (U1A && U1I && ANS && PNS) {
    empujar(
      {
        nombre: 'Incisivo Superior a Plano Maxilar (1-PP)',
        sigla: '1-Plano Maxilar',
        tipo: 'angulo',
        valor: Number(anguloEntreVectores(U1A, U1I, ANS, PNS).toFixed(1)),
        unidad: '°',
        norma: '110° (± 5°)',
        normaValor: 110,
        tolerancia: 5,
        esqueletica: false,
      },
      ['Incisivo superior proinclinado', 'Incisivo superior retroinclinado', 'Inclinación normal']
    );
  }

  // Wits (AO - BO sobre el plano oclusal funcional)
  if (A && B && dirPO && pxPorMm) {
    empujar(
      {
        nombre: 'Evaluación de Wits (AO - BO sobre PO)',
        sigla: 'Wits',
        tipo: 'distancia',
        valor: Number(proyeccionEnMm(B, A, dirPO, pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '-1 mm (± 2 mm)',
        normaValor: -1,
        tolerancia: 2,
        esqueletica: true,
      },
      ['Clase II esquelética (Wits)', 'Clase III esquelética (Wits)', 'Clase I esquelética (Wits)']
    );
  }

  return resultados.map((m) => ({ ...m, analisis: ANALISIS_DE[m.sigla] ?? 'Ricketts' }));
}

export interface SintesisRicketts {
  factoresMedidos: number;
  totalFactores: 33;
  vert: number | null;
  biotipo: string;
  claseEsqueletica: string;
  sugerenciasPlan: string[];
}

/**
 * Calcula el índice VERT de Ricketts y genera una síntesis orientativa para el plan de tratamiento.
 */
export function calcularSintesisRicketts(mediciones: MedicionResultado[]): SintesisRicketts {
  const ricketts = mediciones.filter((m) => (m.analisis ?? 'Ricketts') === 'Ricketts');
  const factoresMedidos = ricketts.filter((m) => m.factorNumero != null).length;
  const buscar = (sigla: string) => ricketts.find((m) => m.sigla === sigla)?.valor;

  const ejeFacial = buscar('Eje Facial');
  const angFacial = buscar('Ángulo facial');
  const planoMand = buscar('Plano mandibular');
  const afi = buscar('AFI');
  const arcoMand = buscar('Arco mandibular');

  const indicesVert: number[] = [];
  if (ejeFacial != null) indicesVert.push((ejeFacial - 90) / 3);
  if (angFacial != null) indicesVert.push((angFacial - 87) / 3);
  if (planoMand != null) indicesVert.push((26 - planoMand) / 4);
  if (afi != null) indicesVert.push((47 - afi) / 4);
  if (arcoMand != null) indicesVert.push((arcoMand - 26) / 4);

  const vert =
    indicesVert.length >= 3
      ? Number((indicesVert.reduce((a, b) => a + b, 0) / indicesVert.length).toFixed(2))
      : null;

  let biotipo = 'Pendiente (marque Eje Facial, Plano Mandibular, AFI, Ángulo Facial y Arco Mandibular)';
  if (vert !== null) {
    if (vert >= 1) biotipo = 'Braquifacial severo';
    else if (vert >= 0.5) biotipo = 'Braquifacial';
    else if (vert <= -1) biotipo = 'Dolicofacial severo';
    else if (vert <= -0.5) biotipo = 'Dolicofacial';
    else biotipo = 'Mesofacial';
  }

  const convexidad = buscar('Convexidad');
  let claseEsqueletica = 'Pendiente (requiere calibración y A, N, Pog)';
  if (convexidad != null) {
    if (convexidad > 4) claseEsqueletica = 'Tendencia Clase II esquelética (perfil convexo)';
    else if (convexidad < 0) claseEsqueletica = 'Tendencia Clase III esquelética (perfil cóncavo)';
    else claseEsqueletica = 'Clase I esquelética';
  }

  const sugerenciasPlan: string[] = [];
  if (vert !== null) {
    if (vert <= -0.5) {
      sugerenciasPlan.push('Control vertical y de anclaje estricto (evitar extrusión molar).');
    } else if (vert >= 0.5) {
      sugerenciasPlan.push('Musculatura fuerte (braquifacial): admite mecánica de apertura de mordida / extrusión controlada.');
    }
  }

  const l1Apog = buscar('L1-APog (mm)');
  const l1Ang = buscar('L1-APog (°)');
  if (l1Apog != null && l1Apog > 3) {
    sugerenciasPlan.push('Incisivo inferior protruido respecto a A-Pog: evaluar necesidad de desgaste interproximal (stripping), distalización o extracciones según discrepancia.');
  } else if (l1Apog != null && l1Apog < -1) {
    sugerenciasPlan.push('Incisivo inferior retruido: admite proinclinación / avance anterior si el perfil lo permite.');
  } else if (l1Ang != null && l1Ang > 26) {
    sugerenciasPlan.push('Incisivo inferior proinclinado (>26° a A-Pog): controlar torque radicular lingual.');
  }

  const a6Ptv = buscar('A6-PTV');
  if (a6Ptv != null && a6Ptv > 21) {
    sugerenciasPlan.push('Molar superior mesializado (A6-PTV aumentado): espacio posterior limitado para distalización.');
  }

  const overbite = buscar('Overbite');
  if (overbite != null) {
    if (overbite > 4.5) sugerenciasPlan.push('Sobremordida profunda: considerar intrusión incisiva o nivelación de curva de Spee.');
    else if (overbite < 0.5) sugerenciasPlan.push('Mordida abierta / borde a borde: evitar extrusión posterior y evaluar hábito lingual.');
  }

  const llE = buscar('LL-E (mm)');
  if (llE != null && llE > 0) {
    sugerenciasPlan.push('Labio inferior protrusivo respecto a Línea E: evitar mayor protrusión incisiva.');
  }

  return {
    factoresMedidos,
    totalFactores: 33,
    vert,
    biotipo,
    claseEsqueletica,
    sugerenciasPlan,
  };
}

/** A qué análisis corresponde cada medida, para agruparlas. */
const ANALISIS_DE: Record<string, MedicionResultado['analisis']> = {
  SNA: 'Steiner',
  SNB: 'Steiner',
  ANB: 'Steiner',
  '1-NA (°)': 'Steiner',
  '1-NB (°)': 'Steiner',
  'Go-Gn-Sn': 'Steiner',
  '1-Plano Maxilar': 'Steiner',
  FMA: 'Tweed',
  IMPA: 'Tweed',
  'McNamara-A': 'McNamara',
  'McNamara-Pog': 'McNamara',
  Wits: 'Wits',
};

/**
 * Orden de marcado del asistente para el análisis completo de Ricketts (33 factores):
 * de arriba hacia abajo y de atrás hacia adelante, como se recorre la placa.
 */
export const SECUENCIA_RICKETTS: string[] = [
  'S', 'N', 'Ba', 'Po', 'Or', 'Pt', 'DC', 'Xi', 'ANS', 'PNS', 'A',
  'U6D', 'L6D', 'U6C', 'L6C', 'PmO', 'U3C', 'L3C',
  'U1A', 'U1I', 'L1I', 'L1A', 'B', 'PM', 'Pog', 'Gn', 'Me', 'Go',
  'Pn', 'UL', 'Em', 'LL', 'Pog_b',
];

// ==========================================
// ANÁLISIS FRONTAL DE RICKETTS (18 FACTORES)
// ==========================================

export const PUNTOS_FRONTAL_RICKETTS: DefinicionPunto[] = [
  { id: 'Z_izq', simbolo: 'ZL', nombre: 'Zigomático Izquierdo', descripcion: 'Sutura frontozigomática en el reborde orbitario externo izquierdo.', tipo: 'esqueletico', color: '#3b82f6' },
  { id: 'Z_der', simbolo: 'ZR', nombre: 'Zigomático Derecho', descripcion: 'Sutura frontozigomática en el reborde orbitario externo derecho.', tipo: 'esqueletico', color: '#3b82f6' },
  { id: 'ZA_izq', simbolo: 'ZAL', nombre: 'Arco Cigomático Izquierdo', descripcion: 'Punto más lateral del arco cigomático izquierdo.', tipo: 'esqueletico', color: '#06b6d4' },
  { id: 'ZA_der', simbolo: 'ZAR', nombre: 'Arco Cigomático Derecho', descripcion: 'Punto más lateral del arco cigomático derecho.', tipo: 'esqueletico', color: '#06b6d4' },
  { id: 'Cg', simbolo: 'Cg', nombre: 'Crista Galli', descripcion: 'Centro superior de la apófisis Crista Galli (eje medio craneal).', tipo: 'esqueletico', color: '#8b5cf6' },
  { id: 'NC_izq', simbolo: 'NCL', nombre: 'Cavidad Nasal Izquierda', descripcion: 'Punto más lateral de la apertura piriforme nasal izquierda.', tipo: 'esqueletico', color: '#10b981' },
  { id: 'NC_der', simbolo: 'NCR', nombre: 'Cavidad Nasal Derecha', descripcion: 'Punto más lateral de la apertura piriforme nasal derecha.', tipo: 'esqueletico', color: '#10b981' },
  { id: 'ANS_f', simbolo: 'ANS', nombre: 'Espina Nasal Anterior', descripcion: 'Centro de la espina nasal anterior en proyección frontal.', tipo: 'esqueletico', color: '#14b8a6' },
  { id: 'J_izq', simbolo: 'JL', nombre: 'Proceso Yugal Izquierdo', descripcion: 'Intersección de la tuberosidad maxilar y el proceso cigomático izquierdo.', tipo: 'esqueletico', color: '#f59e0b' },
  { id: 'J_der', simbolo: 'JR', nombre: 'Proceso Yugal Derecho', descripcion: 'Intersección de la tuberosidad maxilar y el proceso cigomático derecho.', tipo: 'esqueletico', color: '#f59e0b' },
  { id: 'Ag_izq', simbolo: 'AgL', nombre: 'Antegonion Izquierdo', descripcion: 'Escotadura antegonial en el borde inferior mandibular izquierdo.', tipo: 'esqueletico', color: '#ef4444' },
  { id: 'Ag_der', simbolo: 'AgR', nombre: 'Antegonion Derecho', descripcion: 'Escotadura antegonial en el borde inferior mandibular derecho.', tipo: 'esqueletico', color: '#ef4444' },
  { id: 'Me_f', simbolo: 'Me', nombre: 'Mentoniano Frontal', descripcion: 'Centro del borde inferior de la sínfisis mentoniana.', tipo: 'esqueletico', color: '#22c55e' },
  { id: 'U6_izq', simbolo: 'A6L', nombre: '1er Molar Sup. Izquierdo', descripcion: 'Contorno vestibular más prominente del 1er molar superior izquierdo.', tipo: 'dental', color: '#38bdf8' },
  { id: 'U6_der', simbolo: 'A6R', nombre: '1er Molar Sup. Derecho', descripcion: 'Contorno vestibular más prominente del 1er molar superior derecho.', tipo: 'dental', color: '#38bdf8' },
  { id: 'L6_izq', simbolo: 'B6L', nombre: '1er Molar Inf. Izquierdo', descripcion: 'Contorno vestibular más prominente del 1er molar inferior izquierdo.', tipo: 'dental', color: '#fb7185' },
  { id: 'L6_der', simbolo: 'B6R', nombre: '1er Molar Inf. Derecho', descripcion: 'Contorno vestibular más prominente del 1er molar inferior derecho.', tipo: 'dental', color: '#fb7185' },
  { id: 'L3_izq', simbolo: 'B3L', nombre: 'Canino Inf. Izquierdo', descripcion: 'Vértice cuspídeo del canino inferior izquierdo.', tipo: 'dental', color: '#f472b6' },
  { id: 'L3_der', simbolo: 'B3R', nombre: 'Canino Inf. Derecho', descripcion: 'Vértice cuspídeo del canino inferior derecho.', tipo: 'dental', color: '#f472b6' },
  { id: 'U1M', simbolo: 'U1M', nombre: 'Línea Media Incisiva Sup.', descripcion: 'Punto interproximal entre los incisivos centrales superiores.', tipo: 'dental', color: '#facc15' },
  { id: 'L1M', simbolo: 'L1M', nombre: 'Línea Media Incisiva Inf.', descripcion: 'Punto interproximal entre los incisivos centrales inferiores.', tipo: 'dental', color: '#facc15' },
];

export const SEGMENTOS_FRONTAL_RICKETTS: SegmentoCefalometrico[] = [
  { id: 'ZZ', de: 'Z_izq', a: 'Z_der', color: '#3b82f6', grosor: 2, etiqueta: 'Plano Z' },
  { id: 'ZAgL', de: 'Z_izq', a: 'Ag_izq', color: '#ef4444', grosor: 1.5, etiqueta: 'Frontal Izq.' },
  { id: 'ZAgR', de: 'Z_der', a: 'Ag_der', color: '#ef4444', grosor: 1.5, etiqueta: 'Frontal Der.' },
  { id: 'CgANS', de: 'Cg', a: 'ANS_f', color: '#8b5cf6', dash: true, grosor: 1.5 },
  { id: 'ANSMe', de: 'ANS_f', a: 'Me_f', color: '#22c55e', dash: true, grosor: 1.5 },
  { id: 'JJ', de: 'J_izq', a: 'J_der', color: '#f59e0b', dash: true, grosor: 1.5 },
  { id: 'AgAg', de: 'Ag_izq', a: 'Ag_der', color: '#ef4444', dash: true, grosor: 1.5 },
  { id: 'ZAZA', de: 'ZA_izq', a: 'ZA_der', color: '#06b6d4', dash: true, grosor: 1 },
  { id: 'NCNC', de: 'NC_izq', a: 'NC_der', color: '#10b981', dash: true, grosor: 1 },
  { id: 'OclF', de: 'L6_izq', a: 'L6_der', color: '#facc15', grosor: 1.5, etiqueta: 'Plano Oclusal' },
];

export const SECUENCIA_FRONTAL_RICKETTS: string[] = PUNTOS_FRONTAL_RICKETTS.map((p) => p.id);

export function calcularAnalisisFrontalRicketts(
  puntos: PuntosCefalometricosMap,
  calibracion: CalibracionRegla
): MedicionResultado[] {
  const resultados: MedicionResultado[] = [];
  const pxPorMm = calibracion.pixelesPorMm;

  const empujar = (
    m: Omit<MedicionResultado, 'desviacion' | 'enNorma' | 'interpretacion'> & {
      normaValor: number;
      tolerancia: number;
    },
    textos: [mas: string, menos: string, normal: string]
  ) => {
    const { normaValor, tolerancia, ...resto } = m;
    const desv = Number((m.valor - normaValor).toFixed(1));
    const enNorma = Math.abs(desv) <= tolerancia;
    resultados.push({
      ...resto,
      analisis: 'Ricketts Frontal',
      desviacion: desv,
      enNorma,
      interpretacion: desv > tolerancia ? textos[0] : desv < -tolerancia ? textos[1] : textos[2],
    });
  };

  const Z_izq = puntos['Z_izq'];
  const Z_der = puntos['Z_der'];
  const ZA_izq = puntos['ZA_izq'];
  const ZA_der = puntos['ZA_der'];
  const Cg = puntos['Cg'];
  const NC_izq = puntos['NC_izq'];
  const NC_der = puntos['NC_der'];
  const ANS_f = puntos['ANS_f'];
  const J_izq = puntos['J_izq'];
  const J_der = puntos['J_der'];
  const Ag_izq = puntos['Ag_izq'];
  const Ag_der = puntos['Ag_der'];
  const Me_f = puntos['Me_f'];
  const U6_izq = puntos['U6_izq'];
  const U6_der = puntos['U6_der'];
  const L6_izq = puntos['L6_izq'];
  const L6_der = puntos['L6_der'];
  const L3_izq = puntos['L3_izq'];
  const L3_der = puntos['L3_der'];
  const U1M = puntos['U1M'];
  const L1M = puntos['L1M'];

  // Campo I: Problemas Dentarios (Relación molar izq. y der.)
  if (Z_izq && Z_der && pxPorMm) {
    const ladosMolar = [
      { u6: U6_izq, l6: L6_izq, dir: vectorUnitario(Z_der, Z_izq), etiqueta: 'izquierda', sigla: 'izq.', num: 1 },
      { u6: U6_der, l6: L6_der, dir: vectorUnitario(Z_izq, Z_der), etiqueta: 'derecha', sigla: 'der.', num: 2 },
    ] as const;
    ladosMolar.forEach(({ u6, l6, dir, etiqueta, sigla, num }) => {
      if (!u6 || !l6 || !dir) return;
      empujar(
        {
          nombre: `Relación molar ${etiqueta}`,
          sigla: `Rel. molar ${sigla}`,
          tipo: 'distancia',
          valor: Number(proyeccionEnMm(l6, u6, dir, pxPorMm).toFixed(1)),
          unidad: 'mm',
          norma: '1,5 mm (± 1,5 mm)',
          normaValor: 1.5,
          tolerancia: 1.5,
          campo: 'Campo I · Problemas Dentarios',
          factorNumero: num,
        },
        [`Resalte vestibular aumentado ${sigla}`, `Mordida cruzada posterior ${sigla}`, 'Relación transversal normal']
      );
    });
  }
  if (L6_izq && L6_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal intermolar inferior',
        sigla: 'Intermolar inf.',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(L6_izq, L6_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '55,0 mm (± 2,0 mm)',
        normaValor: 55,
        tolerancia: 2,
        campo: 'Campo I · Problemas Dentarios',
        factorNumero: 3,
      },
      ['Arcada inferior ancha', 'Compresión molar inferior', 'Anchura intermolar normal']
    );
  }
  if (L3_izq && L3_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal intercanina inferior',
        sigla: 'Intercanina inf.',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(L3_izq, L3_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '27,5 mm (± 3,2 mm)',
        normaValor: 27.5,
        tolerancia: 3.2,
        campo: 'Campo I · Problemas Dentarios',
        factorNumero: 4,
      },
      ['Distancia intercanina aumentada', 'Compresión intercanina inferior', 'Anchura intercanina normal']
    );
  }
  if (U1M && L1M && pxPorMm) {
    empujar(
      {
        nombre: 'Línea mediana dentaria',
        sigla: 'Línea media dent.',
        tipo: 'distancia',
        valor: Number((Math.abs(U1M.x - L1M.x) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '0 mm (± 1,5 mm)',
        normaValor: 0,
        tolerancia: 1.5,
        campo: 'Campo I · Problemas Dentarios',
        factorNumero: 5,
      },
      ['Desviación de línea media dentaria', 'Desviación de línea media dentaria', 'Líneas medias coincidentes']
    );
  }

  // Campo II: Problemas Esqueléticos (Max-Mand izq. y der.)
  if (pxPorMm) {
    const ladosMaxMand = [
      { j: J_izq, z: Z_izq, ag: Ag_izq, etiqueta: 'izquierda', sigla: 'izq.', num: 6 },
      { j: J_der, z: Z_der, ag: Ag_der, etiqueta: 'derecha', sigla: 'der.', num: 7 },
    ] as const;
    ladosMaxMand.forEach(({ j, z, ag, etiqueta, sigla, num }) => {
      if (!j || !z || !ag) return;
      empujar(
        {
          nombre: `Dimensión transversal maxilo-mandibular ${etiqueta}`,
          sigla: `Max-Mand ${sigla}`,
          tipo: 'distancia',
          valor: Number(Math.abs(distanciaPuntoALinea(j, z, ag, pxPorMm)).toFixed(1)),
          unidad: 'mm',
          norma: '10,0 mm (± 1,5 mm)',
          normaValor: 10,
          tolerancia: 1.5,
          esqueletica: true,
          campo: 'Campo II · Problemas Esqueléticos',
          factorNumero: num,
        },
        [`Compresión maxilar esquelética ${sigla}`, `Maxilar ancho ${sigla}`, `Relación transversal normal ${sigla}`]
      );
    });
  }
  if (Cg && ANS_f && Me_f) {
    empujar(
      {
        nombre: 'Línea mediana maxilo-mandibular',
        sigla: 'Línea media esq.',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(Cg, ANS_f, ANS_f, Me_f).toFixed(1)),
        unidad: '°',
        norma: '0° (± 2,0°)',
        normaValor: 0,
        tolerancia: 2,
        esqueletica: true,
        campo: 'Campo II · Problemas Esqueléticos',
        factorNumero: 8,
      },
      ['Asimetría mandibular esquelética', 'Asimetría mandibular esquelética', 'Simetría esquelética normal']
    );
  }

  // Campo III: Problemas Dento-Esqueléticos (L6-Rama izq. y der.)
  if (pxPorMm) {
    const ladosL6Rama = [
      { l6: L6_izq, z: Z_izq, ag: Ag_izq, etiqueta: 'izquierda', sigla: 'izq.', num: 9 },
      { l6: L6_der, z: Z_der, ag: Ag_der, etiqueta: 'derecha', sigla: 'der.', num: 10 },
    ] as const;
    ladosL6Rama.forEach(({ l6, z, ag, etiqueta, sigla, num }) => {
      if (!l6 || !z || !ag) return;
      empujar(
        {
          nombre: `Molar inferior a la rama ${etiqueta}`,
          sigla: `L6-Rama ${sigla}`,
          tipo: 'distancia',
          valor: Number(Math.abs(distanciaPuntoALinea(l6, z, ag, pxPorMm)).toFixed(1)),
          unidad: 'mm',
          norma: '13 mm (± 1,7 mm)',
          normaValor: 13,
          tolerancia: 1.7,
          campo: 'Campo III · Problemas Dento-Esqueléticos',
          factorNumero: num,
        },
        [`Molar lingualizado ${sigla}`, `Molar vestibularizado ${sigla}`, `Posición molar normal ${sigla}`]
      );
    });
  }
  if (L1M && ANS_f && Me_f && pxPorMm) {
    empujar(
      {
        nombre: 'Dientes a la línea mediana maxilo-mandibular',
        sigla: 'L1-Línea media',
        tipo: 'distancia',
        valor: Number(Math.abs(distanciaPuntoALinea(L1M, ANS_f, Me_f, pxPorMm)).toFixed(1)),
        unidad: 'mm',
        norma: '0 mm (± 1,5 mm)',
        normaValor: 0,
        tolerancia: 1.5,
        campo: 'Campo III · Problemas Dento-Esqueléticos',
        factorNumero: 11,
      },
      ['Desviación dentaria respecto a base ósea', 'Desviación dentaria respecto a base ósea', 'Centrado en base ósea']
    );
  }
  if (L6_izq && L6_der && Z_izq && Z_der && pxPorMm) {
    const d1 = Math.abs(distanciaPuntoALinea(L6_izq, Z_izq, Z_der, pxPorMm));
    const d2 = Math.abs(distanciaPuntoALinea(L6_der, Z_izq, Z_der, pxPorMm));
    empujar(
      {
        nombre: 'Inclinación del plano oclusal',
        sigla: 'Plano oclusal (mm)',
        tipo: 'distancia',
        valor: Number(Math.abs(d1 - d2).toFixed(1)),
        unidad: 'mm',
        norma: '0 mm (± 2,0 mm)',
        normaValor: 0,
        tolerancia: 2,
        campo: 'Campo III · Problemas Dento-Esqueléticos',
        factorNumero: 12,
      },
      ['Canteo del plano oclusal', 'Canteo del plano oclusal', 'Plano oclusal nivelado']
    );
  }

  // Campo V: Relación Craneo-Facial
  if (Z_izq && Z_der) {
    const angZ = Math.abs((Math.atan2(Z_der.y - Z_izq.y, Z_der.x - Z_izq.x) * 180) / Math.PI);
    const desvPostural = angZ > 90 ? 180 - angZ : angZ;
    empujar(
      {
        nombre: 'Simetría postural',
        sigla: 'Simetría postural',
        tipo: 'angulo',
        valor: Number(desvPostural.toFixed(1)),
        unidad: '°',
        norma: '0° (± 2,0°)',
        normaValor: 0,
        tolerancia: 2,
        esqueletica: true,
        campo: 'Campo V · Relación Craneofacial',
        factorNumero: 13,
      },
      ['Inclinación postural / asimetría', 'Inclinación postural / asimetría', 'Postura craneal simétrica']
    );
  }

  // Campo VI: Estructuras Internas
  if (NC_izq && NC_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal nasal',
        sigla: 'Anchura nasal',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(NC_izq, NC_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '30,6 mm (± 2,0 mm)',
        normaValor: 30.6,
        tolerancia: 2,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 14,
      },
      ['Cavidad nasal ancha', 'Estenosis / cavidad nasal estrecha', 'Anchura nasal normal']
    );
  }
  if (ANS_f && Z_izq && Z_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión vertical nasal',
        sigla: 'Altura nasal',
        tipo: 'distancia',
        valor: Number(Math.abs(distanciaPuntoALinea(ANS_f, Z_izq, Z_der, pxPorMm)).toFixed(1)),
        unidad: 'mm',
        norma: '52 mm (± 3,0 mm)',
        normaValor: 52,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 15,
      },
      ['Altura nasal aumentada', 'Altura nasal disminuida', 'Altura nasal normal']
    );
  }
  if (J_izq && J_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal maxilar',
        sigla: 'Anchura maxilar',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(J_izq, J_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '66,3 mm (± 3,0 mm)',
        normaValor: 66.3,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 16,
      },
      ['Maxilar ancho', 'Compresión esquelética maxilar', 'Anchura maxilar normal']
    );
  }
  if (Ag_izq && Ag_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal mandibular',
        sigla: 'Anchura mandibular',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(Ag_izq, Ag_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '86,5 mm (± 3,0 mm)',
        normaValor: 86.5,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 17,
      },
      ['Mandíbula ancha', 'Mandíbula estrecha', 'Anchura mandibular normal']
    );
  }
  if (ZA_izq && ZA_der && pxPorMm) {
    empujar(
      {
        nombre: 'Dimensión transversal facial',
        sigla: 'Anchura facial',
        tipo: 'distancia',
        valor: Number((distanciaPuntos(ZA_izq, ZA_der) / pxPorMm).toFixed(1)),
        unidad: 'mm',
        norma: '132,5 mm (± 3,0 mm)',
        normaValor: 132.5,
        tolerancia: 3,
        esqueletica: true,
        campo: 'Campo VI · Estructuras Internas',
        factorNumero: 18,
      },
      ['Anchura facial aumentada', 'Anchura facial disminuida', 'Anchura facial normal']
    );
  }

  return resultados;
}
