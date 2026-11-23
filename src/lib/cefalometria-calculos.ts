import {
  CoordenadaPunto,
  PuntosCefalometricosMap,
  CalibracionRegla,
  MedicionResultado,
  DefinicionPunto,
  DatosBolton,
  DatosNance,
} from '@/types/cefalometria';

export const PLANTILLA_CANONICA_MM: Record<string, CoordenadaPunto> = {
  S: { x: 0, y: 0 },
  N: { x: 75.4, y: -9.3 },
  Po: { x: -13, y: 22 },
  Or: { x: 58, y: 22 },
  Ba: { x: -18.2, y: 38.4 },
  Pt: { x: 18, y: 16 },
  ANS: { x: 77, y: 48 },
  PNS: { x: 24, y: 49 },
  A: { x: 74.3, y: 55.7 },
  B: { x: 70.0, y: 93.7 },
  Pog: { x: 69.2, y: 109.0 },
  Gn: { x: 69.8, y: 117.6 },
  Me: { x: 66.0, y: 120.0 },
  Go: { x: 1.3, y: 88.4 },
  Ar: { x: -13.0, y: 44.0 },
  Co: { x: -14.0, y: 34.0 },
  Xi: { x: 11.0, y: 74.0 },
  PM: { x: 69.0, y: 102.0 },
  DC: { x: -13.7, y: 42.6 },
  SOr: { x: 67.0, y: -23.0 },
  R1: { x: 24.0, y: 70.0 },
  R2: { x: -2.0, y: 74.0 },
  R3: { x: 6.0, y: 52.0 },
  R4: { x: 6.0, y: 91.0 },
  U1A: { x: 68.2, y: 59.0 },
  U1I: { x: 76.7, y: 79.3 },
  L1A: { x: 65.3, y: 94.2 },
  L1I: { x: 74.5, y: 76.5 },
  U6C: { x: 44.0, y: 73.0 },
  L6C: { x: 44.0, y: 75.0 },
  U6D: { x: 36.0, y: 74.6 },
  L6D: { x: 39.0, y: 75.0 },
  PmO: { x: 60.0, y: 76.0 },
  U3C: { x: 64.0, y: 77.3 },
  L3C: { x: 66.0, y: 77.5 },
  G_b: { x: 82.0, y: -22.0 },
  Na_b: { x: 81.0, y: -8.0 },
  Pn: { x: 103.0, y: 40.0 },
  Sn: { x: 88.0, y: 50.0 },
  A_b: { x: 87.0, y: 57.0 },
  UL: { x: 91.0, y: 67.0 },
  Em: { x: 85.0, y: 70.0 },
  LL: { x: 90.0, y: 78.0 },
  B_b: { x: 82.0, y: 92.0 },
  Pog_b: { x: 83.0, y: 108.0 },
  Me_b: { x: 72.0, y: 126.0 },
};

const canonSug = (id: string): { x: number; y: number } => {
  const p = PLANTILLA_CANONICA_MM[id] ?? { x: 0, y: 0 };
  return {
    x: Number((0.5045 + p.x * 0.0035).toFixed(3)),
    y: Number((0.2242 + p.y * 0.0043).toFixed(3)),
  };
};

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
    sugerido: canonSug('S'),
  },
  {
    id: 'N',
    simbolo: 'Na',
    nombre: 'Nasion',
    descripcion: 'Punto más anterior de la sutura frontonasal.',
    tipo: 'esqueletico',
    color: '#3b82f6',
    sugerido: canonSug('N'),
  },
  {
    id: 'Po',
    simbolo: 'Po',
    nombre: 'Porion',
    descripcion: 'Punto más superior del conducto auditivo externo óseo.',
    tipo: 'esqueletico',
    color: '#10b981',
    sugerido: canonSug('Po'),
  },
  {
    id: 'Or',
    simbolo: 'Or',
    nombre: 'Orbitale',
    descripcion: 'Punto más inferior del reborde orbitario óseo.',
    tipo: 'esqueletico',
    color: '#f59e0b',
    sugerido: canonSug('Or'),
  },
  {
    id: 'Ba',
    simbolo: 'Ba',
    nombre: 'Basion',
    descripcion: 'Punto más posteroinferior en el borde anterior del foramen magnum.',
    tipo: 'esqueletico',
    color: '#8b5cf6',
    sugerido: canonSug('Ba'),
  },
  {
    id: 'Pt',
    simbolo: 'Pt',
    nombre: 'Pterigoideo',
    descripcion: 'Punto más superior de la fisura pterigomaxilar.',
    tipo: 'esqueletico',
    color: '#ec4899',
    sugerido: canonSug('Pt'),
  },
  {
    id: 'ANS',
    simbolo: 'ANS',
    nombre: 'Espina Nasal Anterior (ENA)',
    descripcion: 'Vértice anterior de la apófisis maxilar en el límite inferior de la cavidad nasal.',
    tipo: 'esqueletico',
    color: '#06b6d4',
    sugerido: canonSug('ANS'),
  },
  {
    id: 'PNS',
    simbolo: 'PNS',
    nombre: 'Espina Nasal Posterior (ENP)',
    descripcion: 'Vértice posterior del paladar duro.',
    tipo: 'esqueletico',
    color: '#14b8a6',
    sugerido: canonSug('PNS'),
  },
  {
    id: 'A',
    simbolo: 'A',
    nombre: 'Punto A (Subespinal)',
    descripcion: 'Punto más profundo en la concavidad anterior del maxilar entre ANS y el reborde alveolar.',
    tipo: 'esqueletico',
    color: '#ef4444',
    sugerido: canonSug('A'),
  },
  {
    id: 'B',
    simbolo: 'B',
    nombre: 'Punto B (Supramentoniano)',
    descripcion: 'Punto más profundo en la concavidad anterior de la sínfisis mandibular.',
    tipo: 'esqueletico',
    color: '#f97316',
    sugerido: canonSug('B'),
  },
  {
    id: 'Pog',
    simbolo: 'Pog',
    nombre: 'Pogonion',
    descripcion: 'Punto más anterior del contorno óseo de la sínfisis mentoniana.',
    tipo: 'esqueletico',
    color: '#eab308',
    sugerido: canonSug('Pog'),
  },
  {
    id: 'Gn',
    simbolo: 'Gn',
    nombre: 'Gnation',
    descripcion: 'Punto más anteroinferior de la sínfisis mentoniana (intersección eje facial y plano mandibular).',
    tipo: 'esqueletico',
    color: '#84cc16',
    sugerido: canonSug('Gn'),
  },
  {
    id: 'Me',
    simbolo: 'Me',
    nombre: 'Mentoniano',
    descripcion: 'Punto más inferior del contorno de la sínfisis mandibular.',
    tipo: 'esqueletico',
    color: '#22c55e',
    sugerido: canonSug('Me'),
  },
  {
    id: 'Go',
    simbolo: 'Go',
    nombre: 'Gonion',
    descripcion: 'Punto más posteroinferior en el ángulo de la mandíbula entre rama y cuerpo.',
    tipo: 'esqueletico',
    color: '#3b82f6',
    sugerido: canonSug('Go'),
  },
  {
    id: 'Ar',
    simbolo: 'Ar',
    nombre: 'Articulare',
    descripcion: 'Intersección del borde posterior de la rama mandibular con el hueso occipital.',
    tipo: 'esqueletico',
    color: '#6366f1',
    sugerido: canonSug('Ar'),
  },
  {
    id: 'Co',
    simbolo: 'Co',
    nombre: 'Condilion',
    descripcion: 'Punto más superoposterior del cóndilo mandibular.',
    tipo: 'esqueletico',
    color: '#a855f7',
    sugerido: canonSug('Co'),
  },
  {
    id: 'Xi',
    simbolo: 'Xi',
    nombre: 'Punto Xi (Ricketts)',
    descripcion: 'Centro geométrico de la rama ascendente mandibular.',
    tipo: 'esqueletico',
    color: '#d946ef',
    sugerido: canonSug('Xi'),
  },
  {
    id: 'PM',
    simbolo: 'PM',
    nombre: 'Suprapogonion / Protuberancia mentoniana (Ricketts)',
    descripcion:
      'En el borde anterior de la sínfisis, donde la curva pasa de cóncava a convexa, por encima de Pogonion.',
    tipo: 'esqueletico',
    color: '#a3e635',
    sugerido: canonSug('PM'),
  },
  {
    id: 'DC',
    simbolo: 'DC',
    nombre: 'Centro del cóndilo (Ricketts)',
    descripcion: 'Centro del cuello del cóndilo, sobre la línea Ba-N.',
    tipo: 'esqueletico',
    color: '#f472b6',
    sugerido: canonSug('DC'),
  },
  {
    id: 'SOr',
    simbolo: 'SOr',
    nombre: 'Supraorbitale',
    descripcion: 'Punto más anterior en la unión del techo orbitario con el contorno del hueso frontal.',
    tipo: 'esqueletico',
    color: '#60a5fa',
    sugerido: canonSug('SOr'),
  },
  {
    id: 'R1',
    simbolo: 'R1',
    nombre: 'Punto R1 (Rama anterior - Ricketts)',
    descripcion: 'Punto más profundo en el borde anterior de la rama ascendente mandibular.',
    tipo: 'esqueletico',
    color: '#f43f5e',
    sugerido: canonSug('R1'),
  },
  {
    id: 'R2',
    simbolo: 'R2',
    nombre: 'Punto R2 (Rama posterior - Ricketts)',
    descripcion: 'Punto en el borde posterior de la rama mandibular opuesto a R1.',
    tipo: 'esqueletico',
    color: '#f43f5e',
    sugerido: canonSug('R2'),
  },
  {
    id: 'R3',
    simbolo: 'R3',
    nombre: 'Punto R3 (Escotadura sigmoidea - Ricketts)',
    descripcion: 'Punto más profundo de la escotadura sigmoidea mandibular.',
    tipo: 'esqueletico',
    color: '#f43f5e',
    sugerido: canonSug('R3'),
  },
  {
    id: 'R4',
    simbolo: 'R4',
    nombre: 'Punto R4 (Borde inf. rama - Ricketts)',
    descripcion: 'Proyección inferior de R3 sobre el borde inferior mandibular.',
    tipo: 'esqueletico',
    color: '#f43f5e',
    sugerido: canonSug('R4'),
  },

  // --- Dentales ---
  {
    id: 'U1A',
    simbolo: 'U1A',
    nombre: 'Ápice Incisivo Superior',
    descripcion: 'Vértice apical de la raíz del incisivo central superior más vestibularizado.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: canonSug('U1A'),
  },
  {
    id: 'U1I',
    simbolo: 'U1I',
    nombre: 'Borde Incisal Superior',
    descripcion: 'Extremo incisal del incisivo central superior.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: canonSug('U1I'),
  },
  {
    id: 'L1A',
    simbolo: 'L1A',
    nombre: 'Ápice Incisivo Inferior',
    descripcion: 'Vértice apical de la raíz del incisivo central inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: canonSug('L1A'),
  },
  {
    id: 'L1I',
    simbolo: 'L1I',
    nombre: 'Borde Incisal Inferior',
    descripcion: 'Extremo incisal del incisivo central inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: canonSug('L1I'),
  },
  {
    id: 'U6C',
    simbolo: 'U6C',
    nombre: 'Cúspide Molar Superior',
    descripcion: 'Cúspide mesiovestibular del primer molar permanente superior.',
    tipo: 'dental',
    color: '#f43f5e',
    sugerido: canonSug('U6C'),
  },
  {
    id: 'L6C',
    simbolo: 'L6C',
    nombre: 'Cúspide Molar Inferior',
    descripcion: 'Cúspide mesiovestibular del primer molar permanente inferior.',
    tipo: 'dental',
    color: '#f43f5e',
    sugerido: canonSug('L6C'),
  },
  {
    id: 'U6D',
    simbolo: 'A6 / U6D',
    nombre: 'Cara Distal 1er Molar Superior',
    descripcion: 'Contorno distal de la corona del primer molar permanente superior (para Relación Molar y A6-PTV).',
    tipo: 'dental',
    color: '#fb923c',
    sugerido: canonSug('U6D'),
  },
  {
    id: 'L6D',
    simbolo: 'B6 / L6D',
    nombre: 'Cara Distal 1er Molar Inferior',
    descripcion: 'Contorno distal de la corona del primer molar permanente inferior (para Relación Molar).',
    tipo: 'dental',
    color: '#fb923c',
    sugerido: canonSug('L6D'),
  },
  {
    id: 'PmO',
    simbolo: 'PmO',
    nombre: 'Oclusión Premolar (Plano Oclusal)',
    descripcion: 'Punto de intercuspidación de los primeros premolares; junto con el molar define el Plano Oclusal Funcional.',
    tipo: 'dental',
    color: '#facc15',
    sugerido: canonSug('PmO'),
  },
  {
    id: 'U3C',
    simbolo: 'U3',
    nombre: 'Cúspide Canino Superior',
    descripcion: 'Vértice cuspídeo del canino superior.',
    tipo: 'dental',
    color: '#38bdf8',
    sugerido: canonSug('U3C'),
  },
  {
    id: 'L3C',
    simbolo: 'L3',
    nombre: 'Cúspide Canino Inferior',
    descripcion: 'Vértice cuspídeo del canino inferior.',
    tipo: 'dental',
    color: '#fb7185',
    sugerido: canonSug('L3C'),
  },

  // --- Tejido Blando ---
  {
    id: 'G_b',
    simbolo: 'G\'',
    nombre: 'Glabela Blanda',
    descripcion: 'Punto más prominente del contorno de la frente en el plano sagital.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('G_b'),
  },
  {
    id: 'Na_b',
    simbolo: 'Na\'',
    nombre: 'Nasion Blando',
    descripcion: 'Punto más profundo en la curvatura de la raíz nasal de tejido blando.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('Na_b'),
  },
  {
    id: 'Pn',
    simbolo: 'Pn',
    nombre: 'Pronasale / Punta Nasal',
    descripcion: 'Punto más anterior y prominente de la punta nasal blanda.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('Pn'),
  },
  {
    id: 'Sn',
    simbolo: 'Sn',
    nombre: 'Subnasale',
    descripcion: 'Punto en la unión entre la columela nasal y el labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('Sn'),
  },
  {
    id: 'A_b',
    simbolo: 'A\'',
    nombre: 'Punto A Blando',
    descripcion: 'Punto más cóncavo del filtrum del labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('A_b'),
  },
  {
    id: 'UL',
    simbolo: 'UL / Ls',
    nombre: 'Labio Superior (Labrale Superius)',
    descripcion: 'Punto más anterior y prominente del bermellón del labio superior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('UL'),
  },
  {
    id: 'Em',
    simbolo: 'Em / St',
    nombre: 'Comisura Labial (Stomion)',
    descripcion: 'Punto de contacto entre el labio superior e inferior en reposo (para longitud labial y plano oclusal).',
    tipo: 'blando',
    color: '#4ade80',
    sugerido: canonSug('Em'),
  },
  {
    id: 'LL',
    simbolo: 'LL / Li',
    nombre: 'Labio Inferior (Labrale Inferius)',
    descripcion: 'Punto más anterior y prominente del bermellón del labio inferior.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('LL'),
  },
  {
    id: 'B_b',
    simbolo: 'B\'',
    nombre: 'Punto B Blando (Surco Mentolabial)',
    descripcion: 'Punto más profundo de la hendidura entre el labio inferior y el mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('B_b'),
  },
  {
    id: 'Pog_b',
    simbolo: 'Pog\'',
    nombre: 'Pogonion Blando',
    descripcion: 'Punto más anterior del contorno de tejido blando del mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('Pog_b'),
  },
  {
    id: 'Me_b',
    simbolo: 'Me\'',
    nombre: 'Mentoniano Blando',
    descripcion: 'Punto más inferior del contorno de tejido blando del mentón.',
    tipo: 'blando',
    color: '#22c55e',
    sugerido: canonSug('Me_b'),
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

  // Steiner adicionales: Go-Gn-Sn (32°), FM (26°), MM (28°), 1-Plano Maxilar (110°),
  // 1-Plano Mandib. (95°), 1-NA (4 mm), 1-NB (4 mm)
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
  if (Po && Or && Go && Me) {
    empujar(
      {
        nombre: 'FM (Frankfurt a Plano Mandibular)',
        sigla: 'FM',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(Po, Or, Go, Me).toFixed(1)),
        unidad: '°',
        norma: '26° (± 3°)',
        normaValor: 26,
        tolerancia: 3,
        esqueletica: true,
      },
      ['Patrón hiperdivergente', 'Patrón hipodivergente', 'Ángulo FM normal']
    );
  }
  if (ANS && PNS && Go && Me) {
    empujar(
      {
        nombre: 'MM (Plano Maxilar a Plano Mandibular)',
        sigla: 'MM',
        tipo: 'angulo',
        valor: Number(anguloEntreLineas(ANS, PNS, Go, Me).toFixed(1)),
        unidad: '°',
        norma: '28° (± 3°)',
        normaValor: 28,
        tolerancia: 3,
        esqueletica: true,
      },
      ['Divergencia maxilo-mandibular aumentada', 'Divergencia disminuida', 'Ángulo MM normal']
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
  if (L1A && L1I && Go && Me) {
    empujar(
      {
        nombre: 'Incisivo Inferior a Plano Mandibular (1-PM)',
        sigla: '1 Plano Mandib.',
        tipo: 'angulo',
        valor: Number(anguloEntreVectores(L1A, L1I, Me, Go).toFixed(1)),
        unidad: '°',
        norma: '95° (± 5°)',
        normaValor: 95,
        tolerancia: 5,
        esqueletica: false,
      },
      ['Incisivo inferior proinclinado', 'Incisivo inferior retroinclinado', 'Inclinación normal']
    );
  }
  if (U1I && N && A && pxPorMm) {
    empujar(
      {
        nombre: '1 a NA en milímetros (Steiner)',
        sigla: '1-NA (mm)',
        tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(U1I, N, A, pxPorMm)).toFixed(1)),
        unidad: 'mm',
        norma: '4 mm (± 2 mm)',
        normaValor: 4,
        tolerancia: 2,
        esqueletica: false,
      },
      ['Incisivo superior protruido', 'Incisivo superior retruido', 'Posición normal']
    );
  }
  if (L1I && N && B && pxPorMm) {
    empujar(
      {
        nombre: '1 a NB en milímetros (Steiner)',
        sigla: '1-NB (mm)',
        tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(L1I, N, B, pxPorMm)).toFixed(1)),
        unidad: 'mm',
        norma: '4 mm (± 2 mm)',
        normaValor: 4,
        tolerancia: 2,
        esqueletica: false,
      },
      ['Incisivo inferior protruido', 'Incisivo inferior retruido', 'Posición normal']
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
  '1-NA (mm)': 'Steiner',
  '1-NB (°)': 'Steiner',
  '1-NB (mm)': 'Steiner',
  'Go-Gn-Sn': 'Steiner',
  FM: 'Steiner',
  MM: 'Steiner',
  '1-Plano Maxilar': 'Steiner',
  '1 Plano Mandib.': 'Steiner',
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
  'S', 'N', 'SOr', 'Ba', 'Po', 'Or', 'Pt', 'DC', 'R1', 'R2', 'R3', 'R4', 'Xi', 'ANS', 'PNS', 'A',
  'U6D', 'L6D', 'U6C', 'L6C', 'PmO', 'U3C', 'L3C',
  'U1A', 'U1I', 'L1I', 'L1A', 'B', 'PM', 'Pog', 'Gn', 'Me', 'Go',
  'Pn', 'UL', 'Em', 'LL', 'Pog_b',
];

// ==========================================
// ANÁLISIS FRONTAL DE RICKETTS (18 FACTORES)
// ==========================================

export const PUNTOS_FRONTAL_RICKETTS: DefinicionPunto[] = [
  { id: 'Z_izq', simbolo: 'ZL', nombre: 'Zigomático Izquierdo', descripcion: 'Sutura frontozigomática en el reborde orbitario externo izquierdo.', tipo: 'esqueletico', color: '#3b82f6', sugerido: { x: 0.27, y: 0.31 } },
  { id: 'Z_der', simbolo: 'ZR', nombre: 'Zigomático Derecho', descripcion: 'Sutura frontozigomática en el reborde orbitario externo derecho.', tipo: 'esqueletico', color: '#3b82f6', sugerido: { x: 0.73, y: 0.31 } },
  { id: 'ZA_izq', simbolo: 'ZAL', nombre: 'Arco Cigomático Izquierdo', descripcion: 'Punto más lateral del arco cigomático izquierdo.', tipo: 'esqueletico', color: '#06b6d4', sugerido: { x: 0.19, y: 0.42 } },
  { id: 'ZA_der', simbolo: 'ZAR', nombre: 'Arco Cigomático Derecho', descripcion: 'Punto más lateral del arco cigomático derecho.', tipo: 'esqueletico', color: '#06b6d4', sugerido: { x: 0.81, y: 0.42 } },
  { id: 'Cg', simbolo: 'Cg', nombre: 'Crista Galli', descripcion: 'Centro superior de la apófisis Crista Galli (eje medio craneal).', tipo: 'esqueletico', color: '#8b5cf6', sugerido: { x: 0.5, y: 0.25 } },
  { id: 'NC_izq', simbolo: 'NCL', nombre: 'Cavidad Nasal Izquierda', descripcion: 'Punto más lateral de la apertura piriforme nasal izquierda.', tipo: 'esqueletico', color: '#10b981', sugerido: { x: 0.43, y: 0.45 } },
  { id: 'NC_der', simbolo: 'NCR', nombre: 'Cavidad Nasal Derecha', descripcion: 'Punto más lateral de la apertura piriforme nasal derecha.', tipo: 'esqueletico', color: '#10b981', sugerido: { x: 0.57, y: 0.45 } },
  { id: 'ANS_f', simbolo: 'ANS', nombre: 'Espina Nasal Anterior', descripcion: 'Centro de la espina nasal anterior en proyección frontal.', tipo: 'esqueletico', color: '#14b8a6', sugerido: { x: 0.5, y: 0.52 } },
  { id: 'J_izq', simbolo: 'JL', nombre: 'Proceso Yugal Izquierdo', descripcion: 'Intersección de la tuberosidad maxilar y el proceso cigomático izquierdo.', tipo: 'esqueletico', color: '#f59e0b', sugerido: { x: 0.34, y: 0.53 } },
  { id: 'J_der', simbolo: 'JR', nombre: 'Proceso Yugal Derecho', descripcion: 'Intersección de la tuberosidad maxilar y el proceso cigomático derecho.', tipo: 'esqueletico', color: '#f59e0b', sugerido: { x: 0.66, y: 0.53 } },
  { id: 'Ag_izq', simbolo: 'AgL', nombre: 'Antegonion Izquierdo', descripcion: 'Escotadura antegonial en el borde inferior mandibular izquierdo.', tipo: 'esqueletico', color: '#ef4444', sugerido: { x: 0.29, y: 0.7 } },
  { id: 'Ag_der', simbolo: 'AgR', nombre: 'Antegonion Derecho', descripcion: 'Escotadura antegonial en el borde inferior mandibular derecho.', tipo: 'esqueletico', color: '#ef4444', sugerido: { x: 0.71, y: 0.7 } },
  { id: 'Me_f', simbolo: 'Me', nombre: 'Mentoniano Frontal', descripcion: 'Centro del borde inferior de la sínfisis mentoniana.', tipo: 'esqueletico', color: '#22c55e', sugerido: { x: 0.5, y: 0.82 } },
  { id: 'U6_izq', simbolo: 'A6L', nombre: '1er Molar Sup. Izquierdo', descripcion: 'Contorno vestibular más prominente del 1er molar superior izquierdo.', tipo: 'dental', color: '#38bdf8', sugerido: { x: 0.35, y: 0.61 } },
  { id: 'U6_der', simbolo: 'A6R', nombre: '1er Molar Sup. Derecho', descripcion: 'Contorno vestibular más prominente del 1er molar superior derecho.', tipo: 'dental', color: '#38bdf8', sugerido: { x: 0.65, y: 0.61 } },
  { id: 'L6_izq', simbolo: 'B6L', nombre: '1er Molar Inf. Izquierdo', descripcion: 'Contorno vestibular más prominente del 1er molar inferior izquierdo.', tipo: 'dental', color: '#fb7185', sugerido: { x: 0.36, y: 0.63 } },
  { id: 'L6_der', simbolo: 'B6R', nombre: '1er Molar Inf. Derecho', descripcion: 'Contorno vestibular más prominente del 1er molar inferior derecho.', tipo: 'dental', color: '#fb7185', sugerido: { x: 0.64, y: 0.63 } },
  { id: 'L3_izq', simbolo: 'B3L', nombre: 'Canino Inf. Izquierdo', descripcion: 'Vértice cuspídeo del canino inferior izquierdo.', tipo: 'dental', color: '#f472b6', sugerido: { x: 0.43, y: 0.64 } },
  { id: 'L3_der', simbolo: 'B3R', nombre: 'Canino Inf. Derecho', descripcion: 'Vértice cuspídeo del canino inferior derecho.', tipo: 'dental', color: '#f472b6', sugerido: { x: 0.57, y: 0.64 } },
  { id: 'U1M', simbolo: 'U1M', nombre: 'Línea Media Incisiva Sup.', descripcion: 'Punto interproximal entre los incisivos centrales superiores.', tipo: 'dental', color: '#facc15', sugerido: { x: 0.5, y: 0.62 } },
  { id: 'L1M', simbolo: 'L1M', nombre: 'Línea Media Incisiva Inf.', descripcion: 'Punto interproximal entre los incisivos centrales inferiores.', tipo: 'dental', color: '#facc15', sugerido: { x: 0.5, y: 0.64 } },
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

// ==========================================
// ANÁLISIS DE BOLTON (UAP)
// ==========================================

export interface ParBoltonTabla {
  max: number;
  mand: number;
}

export const TABLA_BOLTON_12: ParBoltonTabla[] = [
  { max: 85, mand: 77.6 },
  { max: 86, mand: 78.5 },
  { max: 87, mand: 79.4 },
  { max: 88, mand: 80.3 },
  { max: 89, mand: 81.3 },
  { max: 90, mand: 82.1 },
  { max: 91, mand: 83.1 },
  { max: 92, mand: 84.0 },
  { max: 93, mand: 84.9 },
  { max: 94, mand: 85.8 },
  { max: 95, mand: 86.7 },
  { max: 96, mand: 87.6 },
  { max: 97, mand: 88.6 },
  { max: 98, mand: 89.5 },
  { max: 99, mand: 90.4 },
  { max: 100, mand: 91.3 },
  { max: 101, mand: 92.2 },
  { max: 102, mand: 93.1 },
  { max: 103, mand: 94.0 },
  { max: 104, mand: 95.0 },
  { max: 105, mand: 95.9 },
  { max: 106, mand: 96.8 },
  { max: 107, mand: 97.8 },
  { max: 108, mand: 98.8 },
  { max: 109, mand: 99.5 },
  { max: 110, mand: 100.4 },
];

export const TABLA_BOLTON_6: ParBoltonTabla[] = [
  { max: 40.0, mand: 30.9 },
  { max: 40.5, mand: 31.3 },
  { max: 41.0, mand: 31.7 },
  { max: 41.5, mand: 32.0 },
  { max: 42.0, mand: 32.4 },
  { max: 42.5, mand: 32.8 },
  { max: 43.0, mand: 33.2 },
  { max: 43.5, mand: 33.6 },
  { max: 44.0, mand: 34.0 },
  { max: 44.5, mand: 34.4 },
  { max: 45.0, mand: 34.7 },
  { max: 45.5, mand: 35.1 },
  { max: 46.0, mand: 35.5 },
  { max: 46.5, mand: 35.9 },
  { max: 47.0, mand: 36.3 },
  { max: 47.5, mand: 36.7 },
  { max: 48.0, mand: 37.1 },
  { max: 48.5, mand: 37.4 },
  { max: 49.0, mand: 37.8 },
  { max: 49.5, mand: 38.2 },
  { max: 50.0, mand: 38.6 },
  { max: 50.5, mand: 39.0 },
  { max: 51.0, mand: 39.4 },
  { max: 51.5, mand: 39.8 },
  { max: 52.0, mand: 40.1 },
  { max: 52.5, mand: 40.5 },
  { max: 53.0, mand: 40.9 },
  { max: 53.5, mand: 41.3 },
  { max: 54.0, mand: 41.7 },
  { max: 54.5, mand: 42.1 },
  { max: 55.0, mand: 42.5 },
];

function interpolarTablaBolton(
  tabla: ParBoltonTabla[],
  valor: number,
  desde: 'max' | 'mand',
  mediaPct: number
): number {
  const claveIn = desde;
  const claveOut = desde === 'max' ? 'mand' : 'max';
  if (valor <= tabla[0][claveIn]) {
    return Number((desde === 'max' ? (valor * mediaPct) / 100 : (valor * 100) / mediaPct).toFixed(1));
  }
  const ultimo = tabla[tabla.length - 1];
  if (valor >= ultimo[claveIn]) {
    return Number((desde === 'max' ? (valor * mediaPct) / 100 : (valor * 100) / mediaPct).toFixed(1));
  }
  for (let i = 0; i < tabla.length - 1; i++) {
    const a = tabla[i];
    const b = tabla[i + 1];
    if (valor >= a[claveIn] && valor <= b[claveIn]) {
      const t = (valor - a[claveIn]) / (b[claveIn] - a[claveIn]);
      return Number((a[claveOut] + t * (b[claveOut] - a[claveOut])).toFixed(1));
    }
  }
  return Number((desde === 'max' ? (valor * mediaPct) / 100 : (valor * 100) / mediaPct).toFixed(1));
}

export interface ResultadoBolton {
  relacion12: number | null;
  exceso12Tipo: 'mandibular' | 'maxilar' | 'normal' | null;
  exceso12Tabla: number | null;
  exceso12Mm: number | null;
  relacion6: number | null;
  exceso6Tipo: 'mandibular' | 'maxilar' | 'normal' | null;
  exceso6Tabla: number | null;
  exceso6Mm: number | null;
}

export function calcularBolton(datos: DatosBolton): ResultadoBolton {
  const max12 = datos.max12 && datos.max12 > 0 ? datos.max12 : null;
  const mand12 = datos.mand12 && datos.mand12 > 0 ? datos.mand12 : null;
  const max6 = datos.max6 && datos.max6 > 0 ? datos.max6 : null;
  const mand6 = datos.mand6 && datos.mand6 > 0 ? datos.mand6 : null;

  let relacion12: number | null = null;
  let exceso12Tipo: ResultadoBolton['exceso12Tipo'] = null;
  let exceso12Tabla: number | null = null;
  let exceso12Mm: number | null = null;

  if (max12 && mand12) {
    relacion12 = Number(((mand12 / max12) * 100).toFixed(1));
    if (relacion12 > 91.3) {
      exceso12Tipo = 'mandibular';
      exceso12Tabla = interpolarTablaBolton(TABLA_BOLTON_12, max12, 'max', 91.3);
      exceso12Mm = Number((mand12 - exceso12Tabla).toFixed(1));
    } else if (relacion12 < 91.3) {
      exceso12Tipo = 'maxilar';
      exceso12Tabla = interpolarTablaBolton(TABLA_BOLTON_12, mand12, 'mand', 91.3);
      exceso12Mm = Number((max12 - exceso12Tabla).toFixed(1));
    } else {
      exceso12Tipo = 'normal';
      exceso12Tabla = mand12;
      exceso12Mm = 0;
    }
  }

  let relacion6: number | null = null;
  let exceso6Tipo: ResultadoBolton['exceso6Tipo'] = null;
  let exceso6Tabla: number | null = null;
  let exceso6Mm: number | null = null;

  if (max6 && mand6) {
    relacion6 = Number(((mand6 / max6) * 100).toFixed(1));
    if (relacion6 > 77.2) {
      exceso6Tipo = 'mandibular';
      exceso6Tabla = interpolarTablaBolton(TABLA_BOLTON_6, max6, 'max', 77.2);
      exceso6Mm = Number((mand6 - exceso6Tabla).toFixed(1));
    } else if (relacion6 < 77.2) {
      exceso6Tipo = 'maxilar';
      exceso6Tabla = interpolarTablaBolton(TABLA_BOLTON_6, mand6, 'mand', 77.2);
      exceso6Mm = Number((max6 - exceso6Tabla).toFixed(1));
    } else {
      exceso6Tipo = 'normal';
      exceso6Tabla = mand6;
      exceso6Mm = 0;
    }
  }

  return {
    relacion12,
    exceso12Tipo,
    exceso12Tabla,
    exceso12Mm,
    relacion6,
    exceso6Tipo,
    exceso6Tabla,
    exceso6Mm,
  };
}

// ==========================================
// ANÁLISIS DE NANCE (UAP)
// ==========================================

export const FILAS_NANCE: { id: string; label: string }[] = [
  { id: 'discrepancia_33', label: 'Discrepancia 3/3' },
  { id: 'discrepancia_45', label: 'Discrepancia 4/5' },
  { id: 'curva_spee', label: 'Curva de Spee' },
  { id: 'linea_media_inf', label: 'Linea média Inferior' },
  { id: 'linea_media_sup', label: 'Linea média superior' },
  { id: 'protrusion_incisivos', label: 'Protrusión de Incisivos' },
  { id: 'stripping', label: 'Stripping' },
  { id: 'expansion', label: 'Expansión' },
  { id: 'pos_1', label: 'Posicionamiento del 1' },
  { id: 'pos_6', label: 'Posicionamiento del 6' },
  { id: 'extracciones', label: 'Extracciones' },
];

export interface ResultadoNance {
  dmSuperior: number | null;
  dmInferior: number | null;
  totalPositivo: number;
  totalNegativo: number;
  totalNeto: number;
  dt: number | null;
  ef: number | null;
}

export function calcularNance(datos: DatosNance): ResultadoNance {
  const dmSuperior =
    datos.epSuperior !== undefined && datos.erSuperior !== undefined
      ? Number((datos.epSuperior - datos.erSuperior).toFixed(1))
      : null;
  const dmInferior =
    datos.epInferior !== undefined && datos.erInferior !== undefined
      ? Number((datos.epInferior - datos.erInferior).toFixed(1))
      : null;

  let totalPositivo = 0;
  let totalNegativo = 0;
  for (const fila of FILAS_NANCE) {
    const valores = datos.filas?.[fila.id];
    if (!valores) continue;
    if (typeof valores.positivo === 'number' && !Number.isNaN(valores.positivo)) {
      totalPositivo += Math.abs(valores.positivo);
    }
    if (typeof valores.negativo === 'number' && !Number.isNaN(valores.negativo)) {
      totalNegativo += Math.abs(valores.negativo);
    }
  }
  totalPositivo = Number(totalPositivo.toFixed(1));
  totalNegativo = Number(totalNegativo.toFixed(1));
  const totalNeto = Number((totalPositivo - totalNegativo).toFixed(1));

  const dm = datos.dm ?? dmInferior;
  const dc = datos.dc;
  const dt = dm !== null && dm !== undefined && dc !== undefined ? Number((dm + dc).toFixed(1)) : null;
  const ef = dt !== null && datos.exod !== undefined ? Number((dt + datos.exod).toFixed(1)) : dt;

  return {
    dmSuperior,
    dmInferior,
    totalPositivo,
    totalNegativo,
    totalNeto,
    dt,
    ef,
  };
}

// ==========================================
// PLANTILLA CANÓNICA Y ALINEACIÓN ANATÓMICA
// ==========================================

export const WEBCEPH_REF_WIDTH = 1005;
export const WEBCEPH_REF_HEIGHT = 803;

/** Coordenadas canónicas exactas extraídas del trazado digitalizado en WebCeph (1005 × 803 px). */
export const WEBCEPH_CANONICAL_PX: Record<string, CoordenadaPunto> = {
  S: { x: 507, y: 180 },
  N: { x: 763, y: 127 },
  SOr: { x: 732.66, y: 89.54 },
  Po: { x: 440, y: 279 },
  Or: { x: 732, y: 238 },
  Pt: { x: 591, y: 255 },
  Ba: { x: 436, y: 349 },
  ANS: { x: 804, y: 318 },
  PNS: { x: 603, y: 347 },
  A: { x: 791, y: 343 },
  B: { x: 781, y: 510 },
  PM: { x: 779, y: 533 },
  Pog: { x: 778, y: 552 },
  Gn: { x: 770, y: 569 },
  Me: { x: 752, y: 574 },
  Go: { x: 489, y: 460 },
  Ar: { x: 477, y: 314 },
  Co: { x: 486, y: 275 },
  DC: { x: 494.77, y: 309.1 },
  Xi: { x: 553.98, y: 414.63 },
  R1: { x: 618, y: 391 },
  R2: { x: 477, y: 346 },
  R3: { x: 554, y: 336 },
  R4: { x: 563, y: 492 },
  U1I: { x: 827, y: 435 },
  U1A: { x: 772, y: 353 },
  L1I: { x: 808, y: 423 },
  L1A: { x: 768, y: 497 },
  U6C: { x: 701, y: 408 },
  U6D: { x: 657, y: 403 },
  L6C: { x: 701, y: 428 },
  L6D: { x: 656, y: 423 },
  PmO: { x: 759, y: 424 },
  U3C: { x: 778, y: 426 },
  L3C: { x: 785, y: 426 },
  G_b: { x: 804, y: 83 },
  Na_b: { x: 793, y: 153 },
  Pn: { x: 876, y: 276 },
  Sn: { x: 837, y: 324 },
  A_b: { x: 834, y: 340 },
  UL: { x: 857, y: 381 },
  Em: { x: 844, y: 408 },
  LL: { x: 859, y: 433 },
  B_b: { x: 832, y: 477 },
  Pog_b: { x: 827, y: 533 },
  Me_b: { x: 756, y: 603 },
};

/**
 * Genera la plantilla anatómica canónica con proporciones isotrópicas reales
 * sobre un lienzo de `imgW × imgH` píxeles.
 */
export function generarPlantillaCanonica(
  imgW: number,
  imgH: number,
  esFrontal = false
): PuntosCefalometricosMap {
  const w = Math.max(100, imgW || 800);
  const h = Math.max(100, imgH || 800);
  const resultado: PuntosCefalometricosMap = {};

  if (esFrontal) {
    const lado = Math.min(w, h);
    const ox = (w - lado) / 2;
    const oy = (h - lado) / 2;
    for (const p of PUNTOS_FRONTAL_RICKETTS) {
      if (!p.sugerido) continue;
      resultado[p.id] = {
        x: Math.round(ox + p.sugerido.x * lado),
        y: Math.round(oy + p.sugerido.y * lado),
      };
    }
    return resultado;
  }

  const escala = Math.min(w, h) / 230;
  const origenX = w * 0.5045;
  const origenY = h * 0.2242;

  for (const [id, pt] of Object.entries(PLANTILLA_CANONICA_MM)) {
    resultado[id] = {
      x: Math.max(0, Math.min(w, Math.round(origenX + pt.x * escala))),
      y: Math.max(0, Math.min(h, Math.round(origenY + pt.y * escala))),
    };
  }
  return resultado;
}

/**
 * Proyecta los hitos canónicos de WebCeph (espacio `1005 × 803`) al tamaño real
 * de la radiografía preservando la relación isotrópica craneofacial.
 */
export function generarPlantillaWebCeph(
  imgW: number,
  imgH: number,
  esFrontal = false
): PuntosCefalometricosMap {
  const w = Math.max(100, imgW || WEBCEPH_REF_WIDTH);
  const h = Math.max(100, imgH || WEBCEPH_REF_HEIGHT);

  if (esFrontal) {
    return generarPlantillaCanonica(w, h, true);
  }

  const escala = Math.min(w / WEBCEPH_REF_WIDTH, h / WEBCEPH_REF_HEIGHT);
  const ox = (w - WEBCEPH_REF_WIDTH * escala) / 2;
  const oy = (h - WEBCEPH_REF_HEIGHT * escala) / 2;
  const resultado: PuntosCefalometricosMap = {};

  for (const [id, pt] of Object.entries(WEBCEPH_CANONICAL_PX)) {
    resultado[id] = {
      x: Math.max(0, Math.min(w, Math.round(ox + pt.x * escala))),
      y: Math.max(0, Math.min(h, Math.round(oy + pt.y * escala))),
    };
  }
  return resultado;
}

/**
 * Proyecta los 38 puntos canónicos ajustándolos al triángulo anatómico
 * definido por las anclas `S`, `N` (`Na`) y `Me`. Preserva cualquier punto cuyo id
 * esté en `ignorarIds` (ya ajustados manualmente por el profesional).
 */
export function alinearPlantillaASNaMe(
  puntosActuales: PuntosCefalometricosMap,
  imgW: number,
  imgH: number,
  anclas: { S: CoordenadaPunto; N: CoordenadaPunto; Me: CoordenadaPunto },
  ignorarIds?: Set<string>
): PuntosCefalometricosMap {
  const w = Math.max(100, imgW || 800);
  const h = Math.max(100, imgH || 800);
  const sC = PLANTILLA_CANONICA_MM.S;
  const nC = PLANTILLA_CANONICA_MM.N;
  const meC = PLANTILLA_CANONICA_MM.Me;

  const uX = nC.x - sC.x;
  const uY = nC.y - sC.y;
  const vX = meC.x - sC.x;
  const vY = meC.y - sC.y;
  const detC = uX * vY - uY * vX;

  const tUX = anclas.N.x - anclas.S.x;
  const tUY = anclas.N.y - anclas.S.y;
  const tVX = anclas.Me.x - anclas.S.x;
  const tVY = anclas.Me.y - anclas.S.y;
  const detT = tUX * tVY - tUY * tVX;

  const lenSN = Math.hypot(tUX, tUY);
  const lenSMe = Math.hypot(tVX, tVY);
  const ratioValido =
    lenSN > 10 &&
    lenSMe > 10 &&
    Math.abs(detC) > 1e-3 &&
    Math.abs(detT) > lenSN * lenSMe * 0.15;

  const resultado: PuntosCefalometricosMap = { ...puntosActuales };

  for (const [id, pt] of Object.entries(PLANTILLA_CANONICA_MM)) {
    if (id === 'S' || id === 'N' || id === 'Me') {
      resultado[id] = {
        x: Math.max(0, Math.min(w, Math.round(anclas[id].x))),
        y: Math.max(0, Math.min(h, Math.round(anclas[id].y))),
      };
      continue;
    }
    if (ignorarIds?.has(id) && puntosActuales[id]) continue;

    const dx = pt.x - sC.x;
    const dy = pt.y - sC.y;

    let xPx: number;
    let yPx: number;

    if (ratioValido) {
      // Coordenadas baricéntricas respecto al triángulo (S, N, Me)
      const alpha = (dx * vY - dy * vX) / detC;
      const beta = (uX * dy - uY * dx) / detC;
      xPx = anclas.S.x + alpha * tUX + beta * tVX;
      yPx = anclas.S.y + alpha * tUY + beta * tVY;
    } else if (lenSN > 5) {
      // Respaldo por similitud isotrópica usando S -> N
      const magC = Math.hypot(uX, uY) || 1;
      const cosC = uX / magC;
      const sinC = uY / magC;
      const esc = lenSN / magC;
      const cosT = tUX / lenSN;
      const sinT = tUY / lenSN;
      const lx = (dx * cosC + dy * sinC) * esc;
      const ly = (-dx * sinC + dy * cosC) * esc;
      xPx = anclas.S.x + (lx * cosT - ly * sinT);
      yPx = anclas.S.y + (lx * sinT + ly * cosT);
    } else {
      continue;
    }

    resultado[id] = {
      x: Math.max(0, Math.min(w, Math.round(xPx))),
      y: Math.max(0, Math.min(h, Math.round(yPx))),
    };
  }

  return resultado;
}

/**
 * Analiza la radiografía en Canvas en dos etapas fisiológicas (cortical ósea -> tejido blando
 * con banda de Mach) filtrando cadenas metálicas y posicionadores plásticos mediante continuidad craneal.
 */
export function detectarContornoAnatomicoEnCanvas(
  img: HTMLImageElement,
  esFrontal = false
): PuntosCefalometricosMap {
  const naturalW = img.naturalWidth || WEBCEPH_REF_WIDTH;
  const naturalH = img.naturalHeight || WEBCEPH_REF_HEIGHT;
  const baseWebCeph = generarPlantillaWebCeph(naturalW, naturalH, esFrontal);

  if (esFrontal || typeof document === 'undefined') {
    return baseWebCeph;
  }

  try {
    const dim = 240;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseWebCeph;

    ctx.drawImage(img, 0, 0, dim, dim);
    const { data } = ctx.getImageData(0, 0, dim, dim);

    const rawLum = (x: number, y: number) => {
      const cx = Math.max(0, Math.min(dim - 1, x));
      const cy = Math.max(0, Math.min(dim - 1, y));
      const idx = (cy * dim + cx) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };

    // Suavizado 3×3 para estabilizar densidad ósea y detectar la banda de Mach sin ruido
    const lumMap = new Float32Array(dim * dim);
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        let sum = 0;
        let cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += rawLum(x + dx, y + dy);
            cnt++;
          }
        }
        lumMap[y * dim + x] = sum / cnt;
      }
    }
    const lum = (x: number, y: number) =>
      lumMap[Math.max(0, Math.min(dim - 1, y)) * dim + Math.max(0, Math.min(dim - 1, x))];

    // 1. Densidad del núcleo craneal (validación de imagen real y orientación)
    const coreSamples: number[] = [];
    let leftSum = 0;
    let rightSum = 0;
    for (let y = Math.round(dim * 0.28); y <= Math.round(dim * 0.68); y++) {
      for (let x = Math.round(dim * 0.16); x < Math.round(dim * 0.50); x++) leftSum += lum(x, y);
      for (let x = Math.round(dim * 0.50); x <= Math.round(dim * 0.84); x++) rightSum += lum(x, y);
      for (let x = Math.round(dim * 0.25); x <= Math.round(dim * 0.55); x++) {
        coreSamples.push(lum(x, y));
      }
    }
    coreSamples.sort((a, b) => a - b);
    const p80Core = coreSamples[Math.floor(coreSamples.length * 0.8)] ?? 0;
    if (p80Core < 20) return baseWebCeph;

    const miraDerecha = leftSum >= rightSum;
    const dirIn = miraDerecha ? -1 : 1;
    const dirOut = -dirIn;

    // 2. Aire abierto anterior (percentil 18 filtrando bordes negros para resistir rostros adelantados)
    const airSamples: number[] = [];
    const airXMin = miraDerecha ? Math.round(dim * 0.68) : Math.round(dim * 0.04);
    const airXMax = miraDerecha ? Math.round(dim * 0.96) : Math.round(dim * 0.32);
    for (let y = Math.round(dim * 0.34); y <= Math.round(dim * 0.74); y++) {
      for (let x = airXMin; x <= airXMax; x++) {
        const v = lum(x, y);
        if (v > 12) airSamples.push(v);
      }
    }
    airSamples.sort((a, b) => a - b);
    const bgAir = airSamples.length
      ? (airSamples[Math.floor(airSamples.length * 0.18)] ?? 35)
      : 35;
    const umbralHueso = bgAir + (p80Core - bgAir) * 0.34;
    const umbralContiguo = (bgAir + umbralHueso) * 0.5;

    // 2b. Detección automática de cadena metálica lateral vertical (solo si existe con aire detrás)
    let chainLimitX = miraDerecha ? Math.round(dim * 0.985) : Math.round(dim * 0.015);
    const chainStart = miraDerecha ? Math.round(dim * 0.86) : Math.round(dim * 0.14);
    const chainEnd = miraDerecha ? Math.round(dim * 0.97) : Math.round(dim * 0.03);
    for (let x = chainStart; miraDerecha ? x <= chainEnd : x >= chainEnd; x += dirOut) {
      let brightRows = 0;
      for (let y = Math.round(dim * 0.15); y <= Math.round(dim * 0.82); y += 2) {
        if (rawLum(x, y) >= umbralHueso && lum(x + dirIn * 5, y) <= bgAir + 12) {
          brightRows++;
        }
      }
      if (brightRows >= 14) {
        chainLimitX = x + dirIn * 4;
        break;
      }
    }

    // 3. Etapa 1: Cortical ósea / dental anterior xHueso(y) en dos pasos (medio-inferior -> superior)
    const yMin = Math.round(dim * 0.08);
    const yMax = Math.round(dim * 0.93);
    const xHuesoRaw = new Float32Array(dim).fill(-1);
    const fwd = (x: number) => (miraDerecha ? x : dim - x);
    const endX = miraDerecha ? Math.round(dim * 0.36) : Math.round(dim * 0.64);
    const yMidSplit = Math.round(dim * 0.48);

    // Paso 3A: Tercio medio e inferior con masa craneal profunda para ignorar cadenas metálicas
    const lowerStartX = miraDerecha
      ? Math.min(chainLimitX, Math.round(dim * 0.94))
      : Math.max(chainLimitX, Math.round(dim * 0.06));
    for (let y = yMidSplit; y <= yMax; y++) {
      for (let x = lowerStartX; miraDerecha ? x >= endX : x <= endX; x += dirIn) {
        if (lum(x, y) >= umbralHueso) {
          let inCnt = 0;
          let imme = 0;
          let deepCnt = 0;
          for (let k = 1; k <= 24; k++) {
            const px = x + dirIn * k;
            if (px < 0 || px >= dim) break;
            const lv = lum(px, y);
            if (k <= 18 && lv >= bgAir + 8) inCnt++;
            if (k <= 5 && lv >= umbralContiguo) imme++;
            if (k >= 6 && k <= 24 && lv >= bgAir + 10) deepCnt++;
          }
          if (inCnt >= 12 && imme >= 4 && deepCnt >= 11) {
            xHuesoRaw[y] = x;
            break;
          }
        }
      }
    }

    // Anclaje medio-facial (xMaxilaMed) libre de posicionador nasal en todas las placas
    const midVals: number[] = [];
    for (let y = Math.round(dim * 0.50); y <= Math.round(dim * 0.75); y++) {
      if (xHuesoRaw[y] >= 0) midVals.push(xHuesoRaw[y]);
    }
    midVals.sort((a, b) => a - b);
    const xMaxilaMed = midVals.length
      ? midVals[Math.floor(midVals.length * 0.5)]
      : miraDerecha
      ? dim * 0.76
      : dim * 0.24;

    // Paso 3B: Tercio superior arrancando justo por delante de xMaxilaMed
    const upperStartX = miraDerecha
      ? Math.min(chainLimitX, Math.round(xMaxilaMed + 1))
      : Math.max(chainLimitX, Math.round(xMaxilaMed - 1));
    for (let y = yMin; y < yMidSplit; y++) {
      for (let x = upperStartX; miraDerecha ? x >= endX : x <= endX; x += dirIn) {
        if (lum(x, y) >= umbralHueso) {
          let inCnt = 0;
          let imme = 0;
          let deepCnt = 0;
          for (let k = 1; k <= 22; k++) {
            const px = x + dirIn * k;
            if (px < 0 || px >= dim) break;
            const lv = lum(px, y);
            if (k <= 18 && lv >= bgAir + 8) inCnt++;
            if (k <= 5 && lv >= umbralContiguo) imme++;
            if (k >= 6 && k <= 22 && lv >= bgAir + 10) deepCnt++;
          }
          if (inCnt >= 12 && imme >= 4 && deepCnt >= 9) {
            xHuesoRaw[y] = x;
            break;
          }
        }
      }
    }

    // Límite inferior mentoniano (paso submentoniano debajo de Me)
    let yChinMax = Math.round(dim * 0.88);
    const esDetrasDeMaxila = (v: number) =>
      v < 0 || fwd(v) < fwd(xMaxilaMed) - dim * 0.12;
    for (let y = Math.round(dim * 0.68); y <= yMax - 2; y++) {
      if (esDetrasDeMaxila(xHuesoRaw[y]) && esDetrasDeMaxila(xHuesoRaw[y + 1])) {
        yChinMax = y - 1;
        break;
      }
    }
    yChinMax = Math.max(yMin + 12, Math.min(yMax - 1, yChinMax));

    const piriYMin = Math.max(yMin + 4, Math.round(yChinMax - dim * 0.39));
    const piriYMax = Math.max(piriYMin + 8, Math.round(yChinMax - dim * 0.25));
    const foreheadYMax = Math.max(yMin + 4, Math.round(yChinMax - dim * 0.43));

    const xHueso = new Float32Array(dim).fill(-1);
    let filasHueso = 0;
    for (let y = yMin + 1; y <= yChinMax; y++) {
      const vals = [xHuesoRaw[y - 1], xHuesoRaw[y], xHuesoRaw[y + 1]].filter((v) => v >= 0);
      if (vals.length >= 2) {
        vals.sort((a, b) => a - b);
        let v = vals[Math.floor(vals.length / 2)];
        // Puente sobre la apertura piriforme para no encoger la ventana nasal
        if (y >= piriYMin && y <= piriYMax && fwd(v) < fwd(xMaxilaMed) - 7) {
          v = xMaxilaMed + dirIn * 5;
        }
        xHueso[y] = v;
        filasHueso++;
      }
    }
    if (filasHueso < 35) return baseWebCeph;

    // 4. Etapa 2: Contorno cutáneo xBlando(y) exterior-a-interior con detección de borde y banda de Mach
    const xBlandoRaw = new Float32Array(dim).fill(-1);
    const maxSoftLum = bgAir + (umbralHueso - bgAir) * 0.36;
    const absLimitX = miraDerecha
      ? Math.min(chainLimitX, Math.round(xMaxilaMed + dim * 0.155))
      : Math.max(chainLimitX, Math.round(xMaxilaMed - dim * 0.155));
    const noseEndY = piriYMax + Math.round(dim * 0.02);

    for (let y = yMin + 1; y <= yChinMax; y++) {
      const xh = xHueso[y];
      if (xh < 0) continue;
      let rOff: number;
      if (y < foreheadYMax) {
        rOff = 0.06;
      } else if (y < piriYMin) {
        rOff = 0.06 + 0.09 * ((y - foreheadYMax) / Math.max(1, piriYMin - foreheadYMax));
      } else if (y <= noseEndY) {
        rOff = 0.15;
      } else {
        rOff = 0.11;
      }
      const minOffPx = Math.round(dim * 0.018);
      const maxOffPx = Math.round(dim * rOff);

      let outerFound = -1;
      let bestFallbackX = -1;
      let bestFallbackScore = -1;
      for (let off = maxOffPx; off >= minOffPx; off--) {
        const x = Math.round(xh + dirOut * off);
        if (x < 2 || x >= dim - 3 || fwd(x) >= fwd(absLimitX)) continue;
        const lEdge = Math.min(lum(x, y), rawLum(x, y));
        if (lEdge > maxSoftLum) continue;

        const l1 = Math.min(umbralHueso, lum(x + dirIn, y));
        const l2 = Math.min(umbralHueso, lum(x + dirIn * 2, y));
        const lIn = Math.max(l1, l2);
        const drop = lIn - lEdge;
        if (drop < 2.8) continue;

        const lOut = (lum(x + dirOut * 2, y) + lum(x + dirOut * 3, y)) * 0.5;
        const machDip = Math.max(0, lOut - lEdge);
        const sc = drop + 1.8 * machDip;
        if (sc > bestFallbackScore) {
          bestFallbackScore = sc;
          bestFallbackX = x;
        }

        if (l2 >= bgAir + 5.0 && (drop >= 9.0 || (drop >= 6.0 && machDip >= 2.0))) {
          outerFound = x;
          break;
        }
      }
      const xSel = outerFound >= 0 ? outerFound : bestFallbackX;
      if (xSel >= 0) xBlandoRaw[y] = xSel;
    }

    const xBlando = new Float32Array(dim).fill(-1);
    let filasBlando = 0;
    for (let y = yMin + 2; y <= yChinMax - 1; y++) {
      const vals = [
        xBlandoRaw[y - 2],
        xBlandoRaw[y - 1],
        xBlandoRaw[y],
        xBlandoRaw[y + 1],
        xBlandoRaw[y + 2],
      ].filter((v) => v >= 0);
      if (vals.length >= 3) {
        vals.sort((a, b) => a - b);
        xBlando[y] = vals[Math.floor(vals.length / 2)];
        filasBlando++;
      }
    }
    if (filasBlando < 35) return baseWebCeph;

    const buscarBlandoExtremo = (
      yIni: number,
      yFin: number,
      modo: 'max' | 'min',
      toleranciaMeseta = 1.0,
      fraccionMeseta = 0.5
    ): CoordenadaPunto | null => {
      const y0 = Math.max(yMin + 2, Math.round(yIni));
      const y1 = Math.min(yChinMax - 1, Math.round(yFin));
      let bestScore = modo === 'max' ? -Infinity : Infinity;
      let bestX = -1;
      for (let y = y0; y <= y1; y++) {
        const xb = xBlando[y];
        if (xb < 0) continue;
        const sc = fwd(xb);
        if (modo === 'max' ? sc > bestScore : sc < bestScore) {
          bestScore = sc;
          bestX = xb;
        }
      }
      if (bestX < 0) return null;
      const filas: number[] = [];
      for (let y = y0; y <= y1; y++) {
        const xb = xBlando[y];
        if (xb < 0) continue;
        const sc = fwd(xb);
        if (
          modo === 'max'
            ? sc >= bestScore - toleranciaMeseta
            : sc <= bestScore + toleranciaMeseta
        ) {
          filas.push(y);
        }
      }
      const idx = Math.min(
        filas.length - 1,
        Math.max(0, Math.floor(filas.length * fraccionMeseta))
      );
      return { x: bestX, y: filas[idx] };
    };

    // 5. Extracción de hitos sobre la curva anatómica xBlando(y) autocalibrada respecto a yChinMax
    const pnY0 = Math.max(Math.round(dim * 0.32), Math.round(yChinMax - dim * 0.415));
    const pnY1 = Math.min(Math.round(dim * 0.58), Math.round(yChinMax - dim * 0.28));
    const pnG = buscarBlandoExtremo(pnY0, pnY1, 'max', 1.0, 0.5);
    if (!pnG) return baseWebCeph;

    const altInfG = Math.max(Math.round(dim * 0.24), yChinMax - pnG.y);

    const snG =
      buscarBlandoExtremo(pnG.y + altInfG * 0.11, pnG.y + altInfG * 0.27, 'min', 1.2, 0.65) ?? {
        x: pnG.x + dirIn * dim * 0.04,
        y: Math.round(pnG.y + altInfG * 0.16),
      };
    if (fwd(snG.x) > fwd(pnG.x) - dim * 0.025) {
      snG.x = pnG.x + dirIn * dim * 0.032;
    }

    const bbG =
      buscarBlandoExtremo(
        pnG.y + altInfG * 0.55,
        Math.min(yChinMax - 6, pnG.y + altInfG * 0.78),
        'min',
        1.0,
        0.5
      ) ?? {
        x: snG.x + dirIn * dim * 0.01,
        y: Math.round(pnG.y + altInfG * 0.68),
      };

    const pogBG =
      buscarBlandoExtremo(bbG.y + 4, Math.max(bbG.y + 6, yChinMax - 1), 'max', 1.0, 0.5) ?? {
        x: bbG.x + dirOut * dim * 0.005,
        y: Math.round(bbG.y + dim * 0.07),
      };

    const altLabios = Math.max(12, bbG.y - snG.y);

    const ulG =
      buscarBlandoExtremo(snG.y + altLabios * 0.16, snG.y + altLabios * 0.48, 'max', 1.0, 0.5) ?? {
        x: snG.x + dirOut * dim * 0.02,
        y: Math.round(snG.y + altLabios * 0.30),
      };

    const emG =
      buscarBlandoExtremo(
        Math.max(ulG.y + 3, snG.y + altLabios * 0.42),
        snG.y + altLabios * 0.66,
        'min',
        1.0,
        0.5
      ) ?? {
        x: ulG.x + dirIn * dim * 0.014,
        y: Math.round(snG.y + altLabios * 0.52),
      };

    const llG =
      buscarBlandoExtremo(
        Math.max(emG.y + 3, snG.y + altLabios * 0.58),
        bbG.y - Math.max(3, Math.round(altLabios * 0.12)),
        'max',
        1.0,
        0.5
      ) ?? {
        x: ulG.x,
        y: Math.round(snG.y + altLabios * 0.72),
      };

    const xRefLabio = fwd(ulG.x) <= fwd(llG.x) ? ulG.x : llG.x;
    if (fwd(emG.x) > fwd(xRefLabio) - 1.5) {
      emG.x = xRefLabio + dirIn * Math.max(2, Math.round(dim * 0.01));
    }

    const abYIni = snG.y + Math.max(2, Math.round((ulG.y - snG.y) * 0.22));
    const abYFin = Math.max(abYIni + 1, Math.round(snG.y + (ulG.y - snG.y) * 0.52));
    const abYFallback = Math.round(snG.y + (ulG.y - snG.y) * 0.30);
    const abG: CoordenadaPunto =
      buscarBlandoExtremo(abYIni, abYFin, 'min', 0.8, 0.45) ?? {
        x: xBlando[abYFallback] >= 0 ? xBlando[abYFallback] : (snG.x + ulG.x) / 2,
        y: abYFallback,
      };

    const altFacialG = pogBG.y - pnG.y;
    if (altFacialG < dim * 0.14 || altFacialG > dim * 0.60) {
      return baseWebCeph;
    }

    const toPx = (pt: CoordenadaPunto): CoordenadaPunto => ({
      x: Math.max(0, Math.min(naturalW, Math.round((pt.x / dim) * naturalW))),
      y: Math.max(0, Math.min(naturalH, Math.round((pt.y / dim) * naturalH))),
    });

    const pnPx = toPx(pnG);
    const llPx = toPx(llG);
    const pogBPx = toPx(pogBG);

    // 6. Hitos óseos anteriores directamente sobre xHueso(y)
    const huesoEnY = (y: number, xBlandoRef: number, fallbackOffRatio: number): number => {
      const yi = Math.max(yMin + 1, Math.min(yMax - 1, Math.round(y)));
      const candidatos = [xHueso[yi - 1], xHueso[yi], xHueso[yi + 1]].filter((v) => v >= 0);
      if (candidatos.length) {
        return candidatos.reduce((a, b) => a + b, 0) / candidatos.length;
      }
      return xBlandoRef + dirIn * dim * fallbackOffRatio;
    };

    const ansG: CoordenadaPunto = {
      x: huesoEnY(snG.y - dim * 0.008, snG.x, 0.035),
      y: Math.round(snG.y - dim * 0.006),
    };
    if (fwd(snG.x) < fwd(ansG.x) + dim * 0.024) {
      snG.x = ansG.x + dirOut * dim * 0.028;
    }

    const buscarCorticalDetrasDeAns = (y: number): number => {
      const startX = Math.max(
        0,
        Math.min(
          dim - 1,
          miraDerecha ? Math.floor(ansG.x - dim * 0.01) : Math.ceil(ansG.x + dim * 0.01)
        )
      );
      const endX = miraDerecha ? Math.round(dim * 0.36) : Math.round(dim * 0.64);
      for (let x = startX; miraDerecha ? x >= endX : x <= endX; x += dirIn) {
        if (lum(x, y) >= umbralHueso * 0.88) {
          let inCnt = 0;
          let imme = 0;
          for (let k = 1; k <= 8; k++) {
            const px = x + dirIn * k;
            if (px < 0 || px >= dim) break;
            const lv = lum(px, y);
            if (lv >= bgAir + 8) inCnt++;
            if (k <= 3 && lv >= umbralContiguo * 0.9) imme++;
          }
          if (inCnt >= 4 && imme >= 2) {
            return x;
          }
        }
      }
      if (xHueso[y] >= 0 && fwd(xHueso[y]) <= fwd(ansG.x) - dim * 0.01) {
        return xHueso[y];
      }
      return -1;
    };

    const nTargetY = Math.max(yMin + 4, Math.round(pnG.y - altFacialG * 0.58));
    let nDetG: CoordenadaPunto | null = null;
    for (let y = Math.max(yMin + 2, nTargetY - 6); y <= Math.min(yMax - 2, nTargetY + 6); y++) {
      const xDet = buscarCorticalDetrasDeAns(y);
      if (xDet >= 0 && (!nDetG || fwd(xDet) > fwd(nDetG.x))) {
        nDetG = { x: xDet, y };
      }
    }
    const nG: CoordenadaPunto = nDetG ?? {
      x: Math.round(pnG.x + dirIn * dim * 0.11),
      y: nTargetY,
    };

    const sorY = Math.max(yMin + 2, Math.round(nG.y - dim * 0.045));
    const sorDetX = buscarCorticalDetrasDeAns(sorY);
    const sorG: CoordenadaPunto = {
      x: sorDetX >= 0 ? sorDetX : nG.x + dirIn * dim * 0.025,
      y: sorY,
    };
    const aG: CoordenadaPunto = {
      x: huesoEnY(abG.y + dim * 0.005, abG.x, 0.042),
      y: Math.round(abG.y + dim * 0.005),
    };
    const u1iG: CoordenadaPunto = {
      x: huesoEnY(emG.y + dim * 0.024, emG.x, 0.022),
      y: Math.round(emG.y + dim * 0.024),
    };
    const l1iG: CoordenadaPunto = {
      x: u1iG.x + dirIn * dim * 0.016,
      y: Math.round(emG.y + dim * 0.014),
    };
    const bG: CoordenadaPunto = {
      x: huesoEnY(bbG.y + dim * 0.018, bbG.x, 0.045),
      y: Math.round(bbG.y + dim * 0.018),
    };
    const pogG: CoordenadaPunto = {
      x: huesoEnY(pogBG.y + dim * 0.014, pogBG.x, 0.045),
      y: Math.round(pogBG.y + dim * 0.014),
    };
    const pmG: CoordenadaPunto = {
      x: (bG.x + pogG.x) / 2 + dirOut * dim * 0.003,
      y: Math.round((bG.y + pogG.y) / 2),
    };
    const meG: CoordenadaPunto = {
      x: Math.round(pogG.x + dirIn * dim * 0.026),
      y: Math.max(Math.round(pogG.y + dim * 0.028), Math.min(yChinMax, Math.round(pogG.y + dim * 0.055))),
    };
    const gnG: CoordenadaPunto = {
      x: Math.round((pogG.x + meG.x) / 2 + dirOut * dim * 0.005),
      y: Math.round((pogG.y + meG.y) / 2 + dim * 0.006),
    };

    const nPx = toPx(nG);
    const mePx = toPx(meG);

    // 6b. Detección del anillo metálico del posicionador auricular (oliva del cefalostato -> Po)
    const altNMeG = Math.max(dim * 0.20, meG.y - nG.y);
    const minWH = Math.min(naturalW, naturalH);
    const poSearchYMin = Math.max(Math.round(dim * 0.18), Math.round(nG.y + altNMeG * 0.08));
    const poSearchYMax = Math.min(Math.round(dim * 0.68), Math.round(nG.y + altNMeG * 0.52));
    const poSearchXStart = miraDerecha
      ? Math.max(Math.round(dim * 0.12), Math.round(nG.x - dim * 0.44))
      : Math.max(Math.round(dim * 0.12), Math.round(nG.x + dim * 0.15));
    const poSearchXEnd = miraDerecha
      ? Math.min(Math.round(dim * 0.88), Math.round(nG.x - dim * 0.15))
      : Math.min(Math.round(dim * 0.88), Math.round(nG.x + dim * 0.44));

    let bestPoG: CoordenadaPunto | null = null;
    let bestPoScore = -Infinity;
    const dirs8 = [
      [1, 0],
      [0.707, 0.707],
      [0, 1],
      [-0.707, 0.707],
      [-1, 0],
      [-0.707, -0.707],
      [0, -1],
      [0.707, -0.707],
    ];

    for (const rG of [3.5, 4.5, 5.5, 6.5]) {
      const rx = rG * (minWH / naturalW);
      const ry = rG * (minWH / naturalH);
      for (let cy = poSearchYMin; cy <= poSearchYMax; cy += 2) {
        for (let cx = poSearchXStart; cx <= poSearchXEnd; cx += 2) {
          const centerLum = rawLum(cx, cy);
          let ringSum = 0;
          let ringMin = Infinity;
          let outerSum = 0;
          for (const [ux, uy] of dirs8) {
            const rv = rawLum(Math.round(cx + rx * ux), Math.round(cy + ry * uy));
            ringSum += rv;
            if (rv < ringMin) ringMin = rv;
            outerSum += rawLum(
              Math.round(cx + rx * 1.85 * ux),
              Math.round(cy + ry * 1.85 * uy)
            );
          }
          const ringMean = ringSum / 8;
          const outerMean = outerSum / 8;
          if (ringMin >= p80Core * 0.80 && ringMean - centerLum >= 14) {
            const score =
              (ringMean - centerLum) * 1.5 + Math.max(0, ringMean - outerMean) + 0.25 * ringMin;
            if (score > bestPoScore) {
              bestPoScore = score;
              bestPoG = {
                x: cx,
                y: cy - ry * 1.15,
              };
            }
          }
        }
      }
    }

    // 7. Proyectar estructura craneal y posterior mediante transformación afín (Po, N, Me) si hay Po,
    //    o similitud 2P (N, Me) como respaldo cuando no existe anillo auricular visible.
    const mirror = !miraDerecha;
    const poPx = bestPoG ? toPx(bestPoG) : null;
    const refX = (x: number) => (mirror ? WEBCEPH_REF_WIDTH - x : x);
    const poRef = { x: refX(WEBCEPH_CANONICAL_PX.Po.x), y: WEBCEPH_CANONICAL_PX.Po.y };
    const nRef = { x: refX(WEBCEPH_CANONICAL_PX.N.x), y: WEBCEPH_CANONICAL_PX.N.y };
    const meRef = { x: refX(WEBCEPH_CANONICAL_PX.Me.x), y: WEBCEPH_CANONICAL_PX.Me.y };

    const uRx = nRef.x - poRef.x;
    const uRy = nRef.y - poRef.y;
    const vRx = meRef.x - poRef.x;
    const vRy = meRef.y - poRef.y;
    const detRef = uRx * vRy - uRy * vRx;

    const usarAfinPoNMe = Boolean(
      poPx &&
        Math.abs(detRef) > 1e-3 &&
        Math.abs((nPx.x - poPx.x) * (mePx.y - poPx.y) - (nPx.y - poPx.y) * (mePx.x - poPx.x)) >
          Math.hypot(nPx.x - poPx.x, nPx.y - poPx.y) *
            Math.hypot(mePx.x - poPx.x, mePx.y - poPx.y) *
            0.15
    );

    const resultado: PuntosCefalometricosMap = {};
    for (const [id, ptRef] of Object.entries(WEBCEPH_CANONICAL_PX)) {
      let tr: CoordenadaPunto;
      if (usarAfinPoNMe && poPx) {
        const pRx = refX(ptRef.x) - poRef.x;
        const pRy = ptRef.y - poRef.y;
        const alpha = (pRx * vRy - pRy * vRx) / detRef;
        const beta = (uRx * pRy - uRy * pRx) / detRef;
        tr = {
          x: poPx.x + alpha * (nPx.x - poPx.x) + beta * (mePx.x - poPx.x),
          y: poPx.y + alpha * (nPx.y - poPx.y) + beta * (mePx.y - poPx.y),
        };
      } else {
        tr = transformarPunto2P(
          ptRef,
          WEBCEPH_CANONICAL_PX.N,
          WEBCEPH_CANONICAL_PX.Me,
          nPx,
          mePx,
          mirror
        );
      }
      resultado[id] = {
        x: Math.max(0, Math.min(naturalW, Math.round(tr.x))),
        y: Math.max(0, Math.min(naturalH, Math.round(tr.y))),
      };
    }

    const nabY = Math.max(yMin + 2, Math.round(nG.y + dim * 0.032));
    const nabG: CoordenadaPunto = {
      x: xBlando[nabY] >= 0 ? xBlando[nabY] : nG.x + dirOut * dim * 0.03,
      y: nabY,
    };
    const gbG: CoordenadaPunto = {
      x: xBlando[sorG.y] >= 0 ? xBlando[sorG.y] : sorG.x + dirOut * dim * 0.042,
      y: sorG.y,
    };

    // Borde submentoniano vertical real para Me'
    const meBX = Math.max(2, Math.min(dim - 3, Math.round(meG.x + dirOut * dim * 0.016)));
    const meBYMin = Math.max(yMin + 4, Math.round(meG.y + 2));
    const meBYMax = Math.min(dim - 4, Math.round(meG.y + dim * 0.075));
    let meBY = Math.min(dim - 3, Math.round(meG.y + dim * 0.035));
    let bestMeBScore = -Infinity;
    for (let y = meBYMin; y <= meBYMax; y++) {
      const lEdge = Math.min(lum(meBX, y), rawLum(meBX, y));
      const lAbove = Math.max(lum(meBX, y - 2), lum(meBX, y - 3));
      const lBelow = (lum(meBX, y + 2) + lum(meBX, y + 3)) * 0.5;
      const drop = lAbove - lEdge;
      const machDip = Math.max(0, lBelow - lEdge);
      const sc = drop + 1.6 * machDip;
      if (lEdge <= maxSoftLum && drop >= 6.0 && sc > bestMeBScore) {
        bestMeBScore = sc;
        meBY = y;
      }
    }

    // 8. Fijar hitos medidos sobre cortical ósea y contorno cutáneo real
    const medidos: PuntosCefalometricosMap = {
      SOr: toPx(sorG),
      N: nPx,
      ANS: toPx(ansG),
      A: toPx(aG),
      U1I: toPx(u1iG),
      L1I: toPx(l1iG),
      B: toPx(bG),
      PM: toPx(pmG),
      Pog: toPx(pogG),
      Gn: toPx(gnG),
      Me: mePx,
      G_b: toPx(gbG),
      Na_b: toPx(nabG),
      Pn: pnPx,
      Sn: toPx(snG),
      A_b: toPx(abG),
      UL: toPx(ulG),
      Em: toPx(emG),
      LL: llPx,
      B_b: toPx(bbG),
      Pog_b: pogBPx,
      Me_b: toPx({ x: meBX, y: meBY }),
    };

    return { ...resultado, ...medidos };
  } catch {
    return baseWebCeph;
  }
}

/**
 * Detecta puntos cefalométricos adaptados a la radiografía cargada o usa la
 * plantilla isotrópica de WebCeph cuando la lectura de píxeles no está disponible.
 */
export function detectarPuntosEnRadiografia(
  img: HTMLImageElement,
  esFrontal = false
): PuntosCefalometricosMap {
  return detectarContornoAnatomicoEnCanvas(img, esFrontal);
}

// ==========================================
// CONTORNOS ANATÓMICOS ESTILO WEBCEPH (SVG)
// ==========================================

export interface ContornoAnatomicoSvg {
  id: string;
  d: string;
  color: string;
  grosor?: number;
  fill?: string;
}

const U1_SVG_PATH =
  'M3.7,20.4c0,0-0.9,18.6-2.5,24.2c-1.4,3.8-0.7,5.9,1.9,8.3c3.5,4.4,5.1,6.2,5.6,13.9c0.5,7.7,3.4,9.9,7.3,3.4 s8.5-20,7.9-25.3c-0.2-3.7-1.7-4.7-2.2-9.6C21.3,30.6,9.3-30,3.7,20.4z';
const U1_REF_TIP: CoordenadaPunto = { x: 11.892, y: 73.884 };
const U1_REF_APEX: CoordenadaPunto = { x: 9.5, y: 0.785 };

const L1_SVG_PATH =
  'M6.139,19.266c0,0,3.634-2.413,3.575-10.239 C9.654,1.201,13.955-1.738,17.155,7.48s5.174,13.825,4.244,18.975s-1.006,5.002-1.459,14.024 c-0.453,9.023-9.722,52.785-15.038,2.425C4.34,37.579,3.714,31.08,3.335,27.896C3.033,25.369,3.69,22.146,6.139,19.266z';
const L1_REF_TIP: CoordenadaPunto = { x: 12.745, y: 1.754 };
const L1_REF_APEX: CoordenadaPunto = { x: 11.375, y: 66.716 };

const U6_SVG_PATH =
  'M6.771,24.439c0,0,0.036-9.221,0.87-14.839 c0.834-5.618,4.394-13.198,6.766-4.985s6.019,29.365,8.138,10.457s6.349-15.331,8.808-7.881s-0.052,22.629,2.176,31.864 c2.227,9.234,3.326,13.309-1.141,17.046c-2.906,2.641-5.863,3.214-8.755,1.255c-1.762-1.027-5.904-1.484-9.424,0.223 C8.214,60.486,5.64,56.595,3.84,54.745c-3.476-3.573-3.737-7.651-0.914-15.07C3.014,39.444,6.509,32.524,6.771,24.439z';
const U6_REF_MESIAL: CoordenadaPunto = { x: 35.469, y: 51.14 };
const U6_REF_DISTAL: CoordenadaPunto = { x: 1.284, y: 50.381 };

const L6_SVG_PATH =
  'M6.767,22.824c0,0,0.416,11.006-2.663,19.306 S0.971,69.883,9.49,53.955s13.966-26.819,12.365-12.124c-1.729,6.049-7.325,31.006,3.966,15.212 c5.734-9.034,8.055-12.625,9.322-22.523c1.267-9.898,2.586-14.907,5.333-20.794c2.747-5.887-0.362-8.438-1.518-9.466 c-1.157-1.028-3.453-2.898-6.671-1.675c-1.337,0.493-3.048,1.02-5.515-0.647c-1.931-1.274-5.369-0.409-7.658,0.67 c-1.326,0.618-3.148,2.023-5.967,0.643c-1.825-0.777-4.423-0.361-6.19,1.676s-3.332,6.377-1.502,10.797 C6.654,19.383,6.416,19.529,6.767,22.824z';
const L6_REF_MESIAL: CoordenadaPunto = { x: 41.579, y: 9.14 };
const L6_REF_DISTAL: CoordenadaPunto = { x: 4.846, y: 9.491 };

const SPHENOID_REF_S: CoordenadaPunto = { x: 296.72, y: 383.35 };
const SPHENOID_REF_BA: CoordenadaPunto = { x: 240.04, y: 487.01 };
const SPHENOID_OUTLINE: CoordenadaPunto[] = [
  { x: 308.59, y: 377.54 }, { x: 307.9, y: 385.35 }, { x: 303.36, y: 391.77 },
  { x: 295.61, y: 394.61 }, { x: 288.01, y: 391.8 }, { x: 284.46, y: 383.09 },
  { x: 287.53, y: 375.94 }, { x: 285.99, y: 371.6 }, { x: 280.63, y: 375.18 },
  { x: 275.27, y: 388.96 }, { x: 269.65, y: 403.01 }, { x: 255.04, y: 429.81 },
  { x: 239.78, y: 459.18 }, { x: 237.02, y: 477.33 }, { x: 240.04, y: 487.01 },
  { x: 244.38, y: 481.39 }, { x: 257.65, y: 463.26 }, { x: 281.14, y: 448.2 },
  { x: 313.31, y: 432.62 }, { x: 340.7, y: 415.67 }, { x: 360.63, y: 390.35 },
  { x: 365.0, y: 360.75 },
];

const ACB_REF_S: CoordenadaPunto = { x: 212.58, y: 456.49 };
const ACB_REF_NA: CoordenadaPunto = { x: 371.39, y: 450.96 };
const ACB_REF_SOR: CoordenadaPunto = { x: 357.049, y: 425.4085 };
const ACB_OUTLINE_2: CoordenadaPunto[] = [
  { x: 359.1341, y: 422.0255 }, { x: 340.4107, y: 444.834 }, { x: 307.049, y: 454.7063 },
  { x: 270.6234, y: 449.2595 }, { x: 240.3255, y: 445.5148 }, { x: 225.6873, y: 443.8127 },
  { x: 217.517, y: 444.834 }, { x: 218.8787, y: 448.5787 }, { x: 228.4107, y: 450.9617 },
  { x: 237.2617, y: 450.2808 },
];
const ACB_OUTLINE_3: CoordenadaPunto[] = [
  { x: 357.049, y: 425.4085 }, { x: 340.9639, y: 422.8553 }, { x: 316.6234, y: 424.983 },
  { x: 278.4958, y: 438.0042 }, { x: 249.2192, y: 444.9829 }, { x: 241.5596, y: 446.1744 },
];

const ORBIT_REF_SOR: CoordenadaPunto = { x: 305.6099, y: 352.7272 };
const ORBIT_REF_NA: CoordenadaPunto = { x: 317.27, y: 379.28 };
const ORBIT_REF_OR: CoordenadaPunto = { x: 292.76, y: 429.32 };
const ORBIT_OUTLINE_1: CoordenadaPunto[] = [
  { x: 295.6099, y: 362.7272 }, { x: 285.9716, y: 373.6634 }, { x: 278.8227, y: 390.1315 },
  { x: 278.1205, y: 408.6422 }, { x: 283.5673, y: 424.7273 }, { x: 292.7588, y: 429.323 },
  { x: 298.3759, y: 425.7485 },
];

const NASAL_REF_NA: CoordenadaPunto = { x: 294.87, y: 392.9 };
const NASAL_REF_NB: CoordenadaPunto = { x: 322.9562, y: 445.6653 };
const NASAL_BONE_OUTLINE: CoordenadaPunto[] = [
  { x: 294.8711, y: 392.8993 }, { x: 295.8924, y: 406.5164 }, { x: 302.3605, y: 422.5164 },
  { x: 310.8711, y: 435.1121 }, { x: 315.9775, y: 449.0696 }, { x: 309.5094, y: 442.6015 },
  { x: 299.2967, y: 431.027 }, { x: 283.2967, y: 417.0696 }, { x: 273.0839, y: 409.2397 },
  { x: 272.7435, y: 405.4951 }, { x: 276.1477, y: 402.0908 }, { x: 286.7009, y: 396.3036 },
  { x: 290.608, y: 394.4925 }, { x: 293.5945, y: 393.261 },
];

const PORION_REF_PO: CoordenadaPunto = { x: 297.14, y: 392.92 };
const PORION_REF_BA: CoordenadaPunto = { x: 297.9, y: 449.6 };
const PORION_OUTLINE: CoordenadaPunto[] = [
  { x: 297.1369, y: 392.9158 }, { x: 303.7752, y: 395.7243 }, { x: 304.7965, y: 402.3626 },
  { x: 297.9029, y: 409.7669 }, { x: 291.7752, y: 406.1924 }, { x: 290.2433, y: 399.0434 },
];

const PTERYGOID_REF_PT: CoordenadaPunto = { x: 295.27, y: 384.32 };
const PTERYGOID_REF_PNS: CoordenadaPunto = { x: 298.94, y: 461.53 };
const PTERYGOID_OUTLINE: CoordenadaPunto[] = [
  { x: 299.2948, y: 442.3057 }, { x: 300.3078, y: 407.5459 }, { x: 302.1947, y: 395.2946 },
  { x: 301.4834, y: 384.536 }, { x: 299.1748, y: 380.9927 }, { x: 295.2723, y: 384.3197 },
  { x: 293.5578, y: 390.631 }, { x: 292.5365, y: 404.2267 }, { x: 296.877, y: 425.9289 },
  { x: 299.6276, y: 446.3965 }, { x: 299.6855, y: 455.5459 },
];

/**
 * Transforma un punto `p` mediante la transformación de similitud 2D
 * (traslación + rotación + escala isotrópica) que mapea `[aRef, bRef]` -> `[aTgt, bTgt]`.
 */
function transformarPunto2P(
  p: CoordenadaPunto,
  aRef: CoordenadaPunto,
  bRef: CoordenadaPunto,
  aTgt: CoordenadaPunto,
  bTgt: CoordenadaPunto,
  mirrorY = false
): CoordenadaPunto {
  const vRx = bRef.x - aRef.x;
  const vRy = bRef.y - aRef.y;
  const lenRef = Math.hypot(vRx, vRy);
  const vTx = bTgt.x - aTgt.x;
  const vTy = bTgt.y - aTgt.y;
  const lenTgt = Math.hypot(vTx, vTy);
  if (lenRef < 1e-4 || lenTgt < 1e-4) return p;

  const s = lenTgt / lenRef;
  const cosR = (vRx * vTx + vRy * vTy) / (lenRef * lenTgt);
  const sinR = (vRx * vTy - vRy * vTx) / (lenRef * lenTgt);

  const midRefX = (aRef.x + bRef.x) * 0.5;
  const midRefY = (aRef.y + bRef.y) * 0.5;
  const midTgtX = (aTgt.x + bTgt.x) * 0.5;
  const midTgtY = (aTgt.y + bTgt.y) * 0.5;

  let dx = p.x - midRefX;
  let dy = p.y - midRefY;

  if (mirrorY) {
    // Reflejar localmente a través del eje aRef -> bRef antes de transformar
    const ux = vRx / lenRef;
    const uy = vRy / lenRef;
    const proj = dx * ux + dy * uy;
    const perp = -dx * uy + dy * ux;
    dx = proj * ux + perp * uy;
    dy = proj * uy - perp * ux;
  }

  return {
    x: midTgtX + s * (cosR * dx - sinR * dy),
    y: midTgtY + s * (sinR * dx + cosR * dy),
  };
}

/**
 * Parsea un path SVG compuesto por comandos `M`, `C`, `c`, `S`, `s`, `Z`, `z`
 * y transforma cada vértice y punto de control cúbico con similitud 2D.
 */
function transformarPathSvg2P(
  svgPath: string,
  aRef: CoordenadaPunto,
  bRef: CoordenadaPunto,
  aTgt: CoordenadaPunto,
  bTgt: CoordenadaPunto,
  mirrorY = false
): string {
  const tokens = svgPath.match(/[MmCcSsZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g);
  if (!tokens) return '';

  const tr = (x: number, y: number) =>
    transformarPunto2P({ x, y }, aRef, bRef, aTgt, bTgt, mirrorY);

  const cmds: string[] = [];
  let i = 0;
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let prevCp2X = 0;
  let prevCp2Y = 0;
  let prevCmd = '';
  let activeCmd = 'M';

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MmCcSsZz]$/.test(tok)) {
      activeCmd = tok;
      i++;
      if (activeCmd === 'z' || activeCmd === 'Z') {
        cmds.push('Z');
        curX = startX;
        curY = startY;
        prevCmd = activeCmd;
        continue;
      }
    }

    if (activeCmd === 'M' || activeCmd === 'm') {
      const rx = Number(tokens[i++]);
      const ry = Number(tokens[i++]);
      const absX = activeCmd === 'M' ? rx : curX + rx;
      const absY = activeCmd === 'M' ? ry : curY + ry;
      const p = tr(absX, absY);
      cmds.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      curX = absX;
      curY = absY;
      startX = absX;
      startY = absY;
      prevCmd = activeCmd;
      activeCmd = activeCmd === 'M' ? 'C' : 'c';
    } else if (activeCmd === 'C' || activeCmd === 'c') {
      if (i + 5 >= tokens.length) break;
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      const x2 = Number(tokens[i++]);
      const y2 = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      const isRel = activeCmd === 'c';
      const ax1 = isRel ? curX + x1 : x1;
      const ay1 = isRel ? curY + y1 : y1;
      const ax2 = isRel ? curX + x2 : x2;
      const ay2 = isRel ? curY + y2 : y2;
      const ax = isRel ? curX + x : x;
      const ay = isRel ? curY + y : y;
      const p1 = tr(ax1, ay1);
      const p2 = tr(ax2, ay2);
      const p = tr(ax, ay);
      cmds.push(
        `C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      );
      prevCp2X = ax2;
      prevCp2Y = ay2;
      curX = ax;
      curY = ay;
      prevCmd = activeCmd;
    } else if (activeCmd === 'S' || activeCmd === 's') {
      if (i + 3 >= tokens.length) break;
      const x2 = Number(tokens[i++]);
      const y2 = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      const isRel = activeCmd === 's';
      const hasPrevCubic = /^[CcSs]$/.test(prevCmd);
      const ax1 = hasPrevCubic ? 2 * curX - prevCp2X : curX;
      const ay1 = hasPrevCubic ? 2 * curY - prevCp2Y : curY;
      const ax2 = isRel ? curX + x2 : x2;
      const ay2 = isRel ? curY + y2 : y2;
      const ax = isRel ? curX + x : x;
      const ay = isRel ? curY + y : y;
      const p1 = tr(ax1, ay1);
      const p2 = tr(ax2, ay2);
      const p = tr(ax, ay);
      cmds.push(
        `C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      );
      prevCp2X = ax2;
      prevCp2Y = ay2;
      curX = ax;
      curY = ay;
      prevCmd = activeCmd;
    } else {
      i++;
    }
  }

  return cmds.join(' ');
}

/** Convierte una secuencia de puntos en una curva Bézier cúbica suave (Catmull-Rom abierta o cerrada). */
function curvaSuaveSvg(pts: CoordenadaPunto[], tension = 0.5, cerrada = false): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  const cmds = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  const n = pts.length;
  const segmentos = cerrada ? n : n - 1;

  for (let i = 0; i < segmentos; i++) {
    const p0 = cerrada ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const p1 = pts[i % n];
    const p2 = pts[(i + 1) % n];
    const p3 = cerrada ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * (tension * 2);
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * (tension * 2);
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * (tension * 2);
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * (tension * 2);

    cmds.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    );
  }
  if (cerrada) cmds.push('Z');
  return cmds.join(' ');
}

/**
 * Genera los contornos anatómicos curvos y siluetas dentarias vectoriales estilo WebCeph
 * a partir de los 41 hitos cefalométricos marcados.
 */
export function generarContornosAnatomicosSvg(
  puntos: PuntosCefalometricosMap
): ContornoAnatomicoSvg[] {
  const contornos: ContornoAnatomicoSvg[] = [];
  const mirror = sentidoPerfil(puntos) === -1;
  const W = WEBCEPH_CANONICAL_PX;
  const azulWebCeph = '#2563eb';
  const map2P = (
    pRef: CoordenadaPunto,
    idA: string,
    idB: string
  ): CoordenadaPunto | null => {
    const tA = puntos[idA];
    const tB = puntos[idB];
    const rA = W[idA];
    const rB = W[idB];
    if (!tA || !tB || !rA || !rB) return null;
    return transformarPunto2P(pRef, rA, rB, tA, tB, mirror);
  };

  // 1. Esfenoides / Silla turca y Clivus (S -> Ba)
  if (puntos.S && puntos.Ba) {
    const pts = SPHENOID_OUTLINE.map((p) =>
      transformarPunto2P(p, SPHENOID_REF_S, SPHENOID_REF_BA, puntos.S, puntos.Ba, mirror)
    );
    contornos.push({
      id: 'esfenoides_silla',
      d: curvaSuaveSvg(pts, 0.5),
      color: azulWebCeph,
      grosor: 1.5,
    });
  }

  // 2. Base craneal anterior (S -> SOr o S -> Na)
  if (puntos.S && (puntos.SOr || puntos.N)) {
    const rB = puntos.SOr ? ACB_REF_SOR : ACB_REF_NA;
    const tB = puntos.SOr || puntos.N;
    const pts2 = ACB_OUTLINE_2.map((p) =>
      transformarPunto2P(p, ACB_REF_S, rB, puntos.S, tB, mirror)
    );
    const pts3 = ACB_OUTLINE_3.map((p) =>
      transformarPunto2P(p, ACB_REF_S, rB, puntos.S, tB, mirror)
    );
    contornos.push({
      id: 'base_craneal_ant_2',
      d: curvaSuaveSvg(pts2, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
    contornos.push({
      id: 'base_craneal_ant_3',
      d: curvaSuaveSvg(pts3, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 2b. Contorno frontal craneal (SOr -> N)
  if (puntos.SOr && puntos.N) {
    const frentePts = [
      { x: 375.6022, y: 385.5149 },
      { x: 377.3894, y: 401.8553 },
      { x: 381.8939, y: 421.386 },
      { x: 379.6872, y: 436.7063 },
      { x: 374.7085, y: 447.1744 },
      { x: 371.3894, y: 450.9617 },
    ].map((p) =>
      transformarPunto2P(p, ACB_REF_SOR, ACB_REF_NA, puntos.SOr, puntos.N, mirror)
    );
    contornos.push({
      id: 'frente_craneal',
      d: curvaSuaveSvg(frentePts, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 3. Reborde orbitario (SOr -> Or)
  if (puntos.Or && (puntos.SOr || puntos.N)) {
    const rA = puntos.SOr ? ORBIT_REF_SOR : ORBIT_REF_NA;
    const tA = puntos.SOr || puntos.N;
    const pts = ORBIT_OUTLINE_1.map((p) =>
      transformarPunto2P(p, rA, ORBIT_REF_OR, tA, puntos.Or, mirror)
    );
    contornos.push({
      id: 'orbita',
      d: curvaSuaveSvg(pts, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 4. Hueso nasal (N -> NasalBridgePoint derivado)
  if (puntos.N && (puntos.ANS || puntos.Pn)) {
    const bridge =
      map2P({ x: 810, y: 198 }, 'N', 'ANS') ??
      map2P({ x: 810, y: 198 }, 'N', 'Pn') ?? {
        x: puntos.N.x + (mirror ? -24 : 24),
        y: puntos.N.y + 42,
      };
    const rawPts = NASAL_BONE_OUTLINE.map((p) =>
      transformarPunto2P(p, NASAL_REF_NA, NASAL_REF_NB, puntos.N, bridge, mirror)
    );
    const pts =
      puntos.Na_b && puntos.Pn && Math.abs(puntos.Pn.y - puntos.Na_b.y) > 1
        ? rawPts.map((pt) => {
            const t = Math.max(
              0,
              Math.min(1, (pt.y - puntos.Na_b!.y) / (puntos.Pn!.y - puntos.Na_b!.y))
            );
            const xPiel = puntos.Na_b!.x + t * (puntos.Pn!.x - puntos.Na_b!.x);
            if (!mirror && pt.x > xPiel - 3) {
              return { x: xPiel - 3, y: pt.y };
            }
            if (mirror && pt.x < xPiel + 3) {
              return { x: xPiel + 3, y: pt.y };
            }
            return pt;
          })
        : rawPts;
    contornos.push({
      id: 'hueso_nasal',
      d: curvaSuaveSvg(pts, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 5. Porion (contorno cerrado Po -> Ba)
  if (puntos.Po && puntos.Ba) {
    const pts = PORION_OUTLINE.map((p) =>
      transformarPunto2P(p, PORION_REF_PO, PORION_REF_BA, puntos.Po, puntos.Ba, mirror)
    );
    contornos.push({
      id: 'porion',
      d: curvaSuaveSvg(pts, 0.5, true),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 6. Fisura pterigomaxilar (Pt -> PNS)
  if (puntos.Pt && puntos.PNS) {
    const pts = PTERYGOID_OUTLINE.map((p) =>
      transformarPunto2P(p, PTERYGOID_REF_PT, PTERYGOID_REF_PNS, puntos.Pt, puntos.PNS, mirror)
    );
    contornos.push({
      id: 'fisura_pterigomaxilar',
      d: curvaSuaveSvg(pts, 0.5),
      color: azulWebCeph,
      grosor: 1.4,
    });
  }

  // 7. Maxilar superior y bóveda palatina (WebCeph maxilla)
  if (puntos.ANS && puntos.PNS && puntos.A) {
    const m1 = map2P({ x: 795, y: 328 }, 'ANS', 'A');
    const m2 = map2P({ x: 787, y: 315 }, 'ANS', 'PNS');
    const m3 = map2P({ x: 759, y: 306 }, 'ANS', 'PNS');
    const m4 = map2P({ x: 716, y: 330 }, 'ANS', 'PNS');
    const m5 = map2P({ x: 682, y: 337 }, 'ANS', 'PNS');
    const m6 = map2P({ x: 632, y: 343 }, 'ANS', 'PNS');
    const m7 = map2P({ x: 633, y: 350 }, 'ANS', 'PNS');
    const m8 = map2P({ x: 686, y: 349 }, 'ANS', 'PNS');
    const m9 = map2P({ x: 734, y: 359 }, 'ANS', 'PNS');
    const ancAlvB = puntos.U1I ? 'U1I' : 'ANS';
    const sd = map2P({ x: 813, y: 387 }, 'A', ancAlvB);
    const m10 = map2P({ x: 762, y: 382 }, 'A', ancAlvB);
    const m11 = map2P({ x: 790, y: 405 }, 'A', ancAlvB);

    const maxPts = [
      sd,
      puntos.A,
      m1,
      puntos.ANS,
      m2,
      m3,
      m4,
      m5,
      m6,
      puntos.PNS,
      m7,
      m8,
      m9,
      m10,
      m11,
    ].filter((p): p is CoordenadaPunto => Boolean(p));

    if (maxPts.length >= 4) {
      contornos.push({
        id: 'maxilar',
        d: curvaSuaveSvg(maxPts, 0.45),
        color: azulWebCeph,
        grosor: 1.6,
      });
    }
  }

  // 8. Sínfisis mentoniana (WebCeph symphysis)
  if (puntos.B && puntos.Pog && puntos.Me) {
    const idPt = map2P({ x: 798, y: 463 }, 'B', puntos.L1I ? 'L1I' : 'Pog');
    const so1 = map2P({ x: 731, y: 558 }, 'B', 'Me');
    const so2 = map2P({ x: 730, y: 526 }, 'B', 'Me');
    const so3 = map2P({ x: 750, y: 492 }, 'B', 'Me');
    const so4 = map2P({ x: 780, y: 453 }, 'B', 'Me');
    const symPts = [
      idPt,
      puntos.B,
      puntos.PM,
      puntos.Pog,
      puntos.Gn,
      puntos.Me,
      so1,
      so2,
      so3,
      so4,
    ].filter((p): p is CoordenadaPunto => Boolean(p));

    if (symPts.length >= 4) {
      contornos.push({
        id: 'sinfisis',
        d: curvaSuaveSvg(symPts, 0.5),
        color: azulWebCeph,
        grosor: 1.6,
      });
    }
  }

  // 9. Cuerpo, ángulo, rama y cóndilo mandibular (WebCeph mandible)
  if (puntos.Me && puntos.Go && (puntos.Co || puntos.Ar)) {
    const mo1 = map2P({ x: 696, y: 560 }, 'Me', 'Go');
    const mo2 = map2P({ x: 617, y: 517 }, 'Me', 'Go');
    const an = puntos.R4 ?? map2P({ x: 563, y: 492 }, 'Me', 'Go');
    const corpusLeft = map2P({ x: 526, y: 485 }, 'Me', 'Go');
    const postTopId = puntos.Ar ? 'Ar' : 'Co';
    const ramusDown = map2P({ x: 476, y: 422 }, 'Go', postTopId);
    const mo3 = puntos.R2 ?? map2P({ x: 477, y: 346 }, 'Go', postTopId);
    const condAncB = puntos.Co ? 'Co' : 'Ar';
    const mo4 = map2P({ x: 473, y: 289 }, 'Go', condAncB);
    const mo5 = map2P({ x: 504, y: 281 }, 'Go', condAncB);
    const mo6 = map2P({ x: 522, y: 314 }, 'Go', condAncB);

    const mandPts = [
      puntos.Me,
      mo1,
      mo2,
      an,
      corpusLeft,
      puntos.Go,
      ramusDown,
      mo3,
      puntos.Ar,
      mo4,
      puntos.Co,
      mo5,
      mo6,
      puntos.R3,
    ].filter((p): p is CoordenadaPunto => Boolean(p));

    if (mandPts.length >= 4) {
      contornos.push({
        id: 'mandibula',
        d: curvaSuaveSvg(mandPts, 0.5),
        color: azulWebCeph,
        grosor: 1.65,
      });
    }
  }

  // 10. Tejido blando superior e inferior (WebCeph upper & lower soft tissue)
  if (puntos.Pn && puntos.Sn) {
    const nasalBridge = puntos.Na_b ? map2P({ x: 822, y: 200 }, 'Na_b', 'Pn') : null;
    const dorsumNose = puntos.Na_b ? map2P({ x: 853, y: 240 }, 'Na_b', 'Pn') : null;
    const supratip = puntos.Na_b ? map2P({ x: 872, y: 263 }, 'Na_b', 'Pn') : null;
    const subTip = map2P({ x: 872, y: 293 }, 'Pn', 'Sn');
    const columella = map2P({ x: 855, y: 313 }, 'Pn', 'Sn');
    const upperLipSup =
      puntos.A_b && puntos.UL ? map2P({ x: 845, y: 362 }, 'A_b', 'UL') : null;
    const upperLipInf =
      puntos.UL && puntos.Em ? map2P({ x: 855, y: 396 }, 'UL', 'Em') : null;

    const supPts = [
      puntos.G_b,
      puntos.Na_b,
      nasalBridge,
      dorsumNose,
      supratip,
      puntos.Pn,
      subTip,
      columella,
      puntos.Sn,
      puntos.A_b,
      upperLipSup,
      puntos.UL,
      upperLipInf,
      puntos.Em,
    ].filter((p): p is CoordenadaPunto => Boolean(p));

    if (supPts.length >= 3) {
      contornos.push({
        id: 'perfil_blando',
        d: curvaSuaveSvg(supPts, 0.45),
        color: azulWebCeph,
        grosor: 1.7,
      });
    }
  } else {
    const fallbackPerfil = [
      puntos.G_b,
      puntos.Na_b,
      puntos.Pn,
      puntos.Sn,
      puntos.A_b,
      puntos.UL,
      puntos.Em,
      puntos.LL,
      puntos.B_b,
      puntos.Pog_b,
      puntos.Me_b,
    ].filter((p): p is CoordenadaPunto => Boolean(p));
    if (fallbackPerfil.length >= 3) {
      contornos.push({
        id: 'perfil_blando',
        d: curvaSuaveSvg(fallbackPerfil, 0.55),
        color: azulWebCeph,
        grosor: 1.7,
      });
    }
  }

  if (puntos.LL && puntos.Pog_b && puntos.Me_b) {
    const lowerLipSup =
      puntos.Em && puntos.LL ? map2P({ x: 856, y: 419 }, 'Em', 'LL') : null;
    const lowerLipInf =
      puntos.LL && puntos.B_b ? map2P({ x: 852, y: 453 }, 'LL', 'B_b') : null;
    const stGn = map2P({ x: 807, y: 583 }, 'Pog_b', 'Me_b');
    const subMand = puntos.Go
      ? map2P({ x: 695, y: 615 }, 'Me_b', 'Go')
      : map2P({ x: 695, y: 615 }, 'Pog_b', 'Me_b');
    const neckC = puntos.Go
      ? map2P({ x: 656, y: 640 }, 'Me_b', 'Go')
      : map2P({ x: 656, y: 640 }, 'Pog_b', 'Me_b');

    const infPts = [
      puntos.Em,
      lowerLipSup,
      puntos.LL,
      lowerLipInf,
      puntos.B_b,
      puntos.Pog_b,
      stGn,
      puntos.Me_b,
      subMand,
      neckC,
    ].filter((p): p is CoordenadaPunto => Boolean(p));

    if (infPts.length >= 3) {
      contornos.push({
        id: 'perfil_blando_inf',
        d: curvaSuaveSvg(infPts, 0.45),
        color: azulWebCeph,
        grosor: 1.7,
      });
    }
  }

  const incRef =
    puntos.U1I && puntos.L1I
      ? { x: (puntos.U1I.x + puntos.L1I.x) / 2, y: (puntos.U1I.y + puntos.L1I.y) / 2 }
      : (puntos.U1I ?? puntos.L1I);
  if (puntos.Em && incRef) {
    const embMid = {
      x: puntos.Em.x + (incRef.x - puntos.Em.x) * 0.24,
      y: puntos.Em.y + 1,
    };
    const embEnd = {
      x: puntos.Em.x + (incRef.x - puntos.Em.x) * 0.46,
      y: puntos.Em.y + 2.5,
    };
    contornos.push({
      id: 'comisura_labial',
      d: curvaSuaveSvg([puntos.Em, embMid, embEnd], 0.45),
      color: azulWebCeph,
      grosor: 1.55,
    });
  }

  // 11. Siluetas dentarias vectoriales reales de WebCeph (2P similarity transform)
  if (puntos.U1I && puntos.U1A) {
    const d = transformarPathSvg2P(
      U1_SVG_PATH,
      U1_REF_TIP,
      U1_REF_APEX,
      puntos.U1I,
      puntos.U1A,
      mirror
    );
    if (d) {
      contornos.push({
        id: 'incisivo_sup',
        d,
        color: azulWebCeph,
        grosor: 1.5,
      });
    }
  }

  if (puntos.L1I && puntos.L1A) {
    const d = transformarPathSvg2P(
      L1_SVG_PATH,
      L1_REF_TIP,
      L1_REF_APEX,
      puntos.L1I,
      puntos.L1A,
      mirror
    );
    if (d) {
      contornos.push({
        id: 'incisivo_inf',
        d,
        color: azulWebCeph,
        grosor: 1.5,
      });
    }
  }

  if (puntos.U6C && puntos.U6D) {
    const d = transformarPathSvg2P(
      U6_SVG_PATH,
      U6_REF_MESIAL,
      U6_REF_DISTAL,
      puntos.U6C,
      puntos.U6D,
      mirror
    );
    if (d) {
      contornos.push({
        id: 'molar_sup',
        d,
        color: azulWebCeph,
        grosor: 1.4,
      });
    }
  }

  if (puntos.L6C && puntos.L6D) {
    const d = transformarPathSvg2P(
      L6_SVG_PATH,
      L6_REF_MESIAL,
      L6_REF_DISTAL,
      puntos.L6C,
      puntos.L6D,
      mirror
    );
    if (d) {
      contornos.push({
        id: 'molar_inf',
        d,
        color: azulWebCeph,
        grosor: 1.4,
      });
    }
  }

  return contornos;
}
