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
      interpretacion:
        desv > 3
          ? 'Hiperdivergente (Mordida abierta / Dolicofacial)'
          : desv < -3
          ? 'Hipodivergente (Mordida profunda / Braquifacial)'
          : 'Normodivergente (Mesofacial)',
      esqueletica: true,
    });
  }

  // 5. Eje Facial de Ricketts: Pt-Gn respecto a Ba-N. Es el ángulo posterior
  // inferior (entre Pt→Gn y N→Ba): crece cuando el mentón va hacia adelante.
  if (Pt && Gn && Ba && N) {
    const ejeFacial = anguloEntreVectores(Pt, Gn, N, Ba);
    resultados.push({
      nombre: 'Eje Facial (Dirección de Crecimiento - Ricketts)',
      sigla: 'Eje Facial',
      tipo: 'angulo',
      valor: Number(ejeFacial.toFixed(1)),
      unidad: '°',
      norma: '90° (± 3°)',
      desviacion: Number((ejeFacial - 90).toFixed(1)),
      interpretacion:
        ejeFacial > 93
          ? 'Crecimiento horizontal / Cierre'
          : ejeFacial < 87
          ? 'Crecimiento vertical / Apertura'
          : 'Crecimiento equilibrado',
      esqueletica: true,
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
      interpretacion:
        desv > 3 ? 'Proinclinación inferior' : desv < -3 ? 'Retroinclinación inferior' : 'Normoinclinación inferior',
      esqueletica: false,
    });
  }

  // 7. Ángulo Interincisivo (U1 a L1)
  if (U1A && U1I && L1A && L1I) {
    // Ángulo entre los dos ejes, cada uno de ápice a borde incisal.
    const interinc = anguloEntreVectores(U1A, U1I, L1A, L1I);
    const norma = 131;
    const desv = Number((interinc - norma).toFixed(1));
    resultados.push({
      nombre: 'Ángulo Interincisivo (U1 - L1)',
      sigla: 'Interincisivo',
      tipo: 'angulo',
      valor: Number(interinc.toFixed(1)),
      unidad: '°',
      norma: '131° (± 5°)',
      desviacion: desv,
      interpretacion:
        desv < -5 ? 'Biproinclinación dentaria' : desv > 5 ? 'Biretroinclinación dentaria' : 'Inclinación normal',
      esqueletica: false,
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
      interpretacion: l1nb > 27 ? 'Proinclinado' : l1nb < 23 ? 'Retroinclinado' : 'Normal',
      esqueletica: false,
    });
  }

  // 10. Labio Superior a Línea E de Ricketts
  // Positivo = labio por delante de la línea E; negativo = por detrás.
  if (Pn && Pog_b && UL && pxPorMm) {
    const distUL = sentido * distanciaPuntoALinea(UL, Pn, Pog_b, pxPorMm);
    resultados.push({
      nombre: 'Labio Superior a Línea E (Ricketts)',
      sigla: 'UL-E (mm)',
      tipo: 'distancia',
      valor: Number(distUL.toFixed(1)),
      desviacion: Number((distUL + 4).toFixed(1)),
      unidad: 'mm',
      norma: '-4 mm (± 2 mm)',
      interpretacion: distUL > -2 ? 'Labio superior protrusivo' : distUL < -6 ? 'Labio superior retrusivo' : 'Perfil armónico',
      esqueletica: false,
    });
  }

  // 11. Labio Inferior a Línea E de Ricketts
  if (Pn && Pog_b && LL && pxPorMm) {
    const distLL = sentido * distanciaPuntoALinea(LL, Pn, Pog_b, pxPorMm);
    resultados.push({
      nombre: 'Labio Inferior a Línea E (Ricketts)',
      sigla: 'LL-E (mm)',
      tipo: 'distancia',
      valor: Number(distLL.toFixed(1)),
      desviacion: Number((distLL + 2).toFixed(1)),
      unidad: 'mm',
      norma: '-2 mm (± 2 mm)',
      interpretacion: distLL > 0 ? 'Labio inferior protrusivo' : distLL < -4 ? 'Labio inferior retrusivo' : 'Perfil armónico',
      esqueletica: false,
    });
  }

  // ================================================================
  // RICKETTS (resumen clínico)
  // ================================================================
  // Normas de adulto. En niños varias cambian con la edad (el ángulo facial
  // aumenta ~1° cada 3 años): la interpretación es orientativa y la decide el
  // profesional.
  const empujar = (
    m: Omit<MedicionResultado, 'desviacion' | 'interpretacion'> & { normaValor: number; tolerancia: number },
    textos: [mas: string, menos: string, normal: string]
  ) => {
    const { normaValor, tolerancia, ...resto } = m;
    const desv = Number((m.valor - normaValor).toFixed(1));
    resultados.push({
      ...resto,
      desviacion: desv,
      interpretacion: desv > tolerancia ? textos[0] : desv < -tolerancia ? textos[1] : textos[2],
    });
  };

  // Ángulo facial (profundidad facial): Frankfort con N-Pog.
  if (Po && Or && N && Pog) {
    empujar(
      { nombre: 'Ángulo facial (profundidad facial)', sigla: 'Ángulo facial', tipo: 'angulo',
        valor: Number(anguloEntreVectores(Po, Or, Pog, N).toFixed(1)), unidad: '°',
        norma: '87° (± 3°)', normaValor: 87, tolerancia: 3, esqueletica: true },
      ['Mandíbula adelantada (tendencia Clase III)', 'Mandíbula retruida (tendencia Clase II)', 'Posición mandibular normal']
    );
  }

  // Profundidad maxilar: Frankfort con N-A.
  if (Po && Or && N && A) {
    empujar(
      { nombre: 'Profundidad maxilar', sigla: 'Prof. maxilar', tipo: 'angulo',
        valor: Number(anguloEntreVectores(Po, Or, A, N).toFixed(1)), unidad: '°',
        norma: '90° (± 3°)', normaValor: 90, tolerancia: 3, esqueletica: true },
      ['Maxilar adelantado', 'Maxilar retruido', 'Maxilar bien ubicado']
    );
  }

  // Plano mandibular respecto a Frankfort (la versión de Ricketts).
  if (Po && Or && Go && Me) {
    empujar(
      { nombre: 'Ángulo del plano mandibular (Ricketts)', sigla: 'Plano mandibular', tipo: 'angulo',
        valor: Number(anguloEntreLineas(Po, Or, Go, Me).toFixed(1)), unidad: '°',
        norma: '26° (± 4°)', normaValor: 26, tolerancia: 4, esqueletica: true },
      ['Dolicofacial (crecimiento vertical)', 'Braquifacial (crecimiento horizontal)', 'Mesofacial']
    );
  }

  // Altura facial inferior: ANS-Xi-PM.
  if (ANS && Xi && PM) {
    empujar(
      { nombre: 'Altura facial inferior (ANS-Xi-PM)', sigla: 'AFI', tipo: 'angulo',
        valor: Number(anguloEntre3Puntos(ANS, Xi, PM).toFixed(1)), unidad: '°',
        norma: '47° (± 4°)', normaValor: 47, tolerancia: 4, esqueletica: true },
      ['Altura facial inferior aumentada (mordida abierta)', 'Altura facial inferior disminuida (mordida profunda)', 'Altura facial inferior normal']
    );
  }

  // Arco mandibular: eje del cóndilo (DC-Xi) con el cuerpo (Xi-PM).
  if (DC && Xi && PM) {
    empujar(
      { nombre: 'Arco mandibular (DC-Xi / Xi-PM)', sigla: 'Arco mandibular', tipo: 'angulo',
        valor: Number((180 - anguloEntre3Puntos(DC, Xi, PM)).toFixed(1)), unidad: '°',
        norma: '26° (± 4°)', normaValor: 26, tolerancia: 4, esqueletica: true },
      ['Mandíbula cuadrada (braquifacial)', 'Mandíbula abierta (dolicofacial)', 'Arco mandibular normal']
    );
  }

  // Deflexión craneal: Ba-N con Frankfort.
  if (Ba && N && Po && Or) {
    empujar(
      { nombre: 'Deflexión craneal (Ba-N / Frankfort)', sigla: 'Deflexión craneal', tipo: 'angulo',
        valor: Number(anguloEntreLineas(Ba, N, Po, Or).toFixed(1)), unidad: '°',
        norma: '27° (± 3°)', normaValor: 27, tolerancia: 3, esqueletica: true },
      ['Base de cráneo favorece Clase III', 'Base de cráneo favorece Clase II', 'Deflexión craneal normal']
    );
  }

  // Convexidad: distancia de A al plano facial N-Pog (positivo = A por delante).
  if (A && N && Pog && pxPorMm) {
    empujar(
      { nombre: 'Convexidad facial (A a N-Pog)', sigla: 'Convexidad', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(A, N, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '2 mm (± 2 mm)', normaValor: 2, tolerancia: 2, esqueletica: true },
      ['Perfil convexo (tendencia Clase II)', 'Perfil cóncavo (tendencia Clase III)', 'Convexidad normal']
    );
  }

  // Incisivo inferior respecto de A-Pog: posición (mm) e inclinación (°).
  if (L1I && A && Pog && pxPorMm) {
    empujar(
      { nombre: 'Incisivo inferior a A-Pog (protrusión)', sigla: 'L1-APog (mm)', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(L1I, A, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '1 mm (± 2 mm)', normaValor: 1, tolerancia: 2, esqueletica: false },
      ['Incisivo inferior protruido', 'Incisivo inferior retruido', 'Posición normal']
    );
  }
  if (L1A && L1I && A && Pog) {
    empujar(
      { nombre: 'Inclinación del incisivo inferior a A-Pog', sigla: 'L1-APog (°)', tipo: 'angulo',
        valor: Number(anguloEntreLineas(L1A, L1I, A, Pog).toFixed(1)), unidad: '°',
        norma: '22° (± 4°)', normaValor: 22, tolerancia: 4, esqueletica: false },
      ['Incisivo inferior proinclinado', 'Incisivo inferior retroinclinado', 'Inclinación normal']
    );
  }

  // Incisivo superior respecto de A-Pog.
  if (U1I && A && Pog && pxPorMm) {
    empujar(
      { nombre: 'Incisivo superior a A-Pog (protrusión)', sigla: 'U1-APog (mm)', tipo: 'distancia',
        valor: Number((sentido * distanciaPuntoALinea(U1I, A, Pog, pxPorMm)).toFixed(1)), unidad: 'mm',
        norma: '3,5 mm (± 2 mm)', normaValor: 3.5, tolerancia: 2, esqueletica: false },
      ['Incisivo superior protruido', 'Incisivo superior retruido', 'Posición normal']
    );
  }
  if (U1A && U1I && A && Pog) {
    empujar(
      { nombre: 'Inclinación del incisivo superior a A-Pog', sigla: 'U1-APog (°)', tipo: 'angulo',
        valor: Number(anguloEntreLineas(U1A, U1I, A, Pog).toFixed(1)), unidad: '°',
        norma: '28° (± 4°)', normaValor: 28, tolerancia: 4, esqueletica: false },
      ['Incisivo superior proinclinado', 'Incisivo superior retroinclinado', 'Inclinación normal']
    );
  }

  return resultados.map((m) => ({ ...m, analisis: ANALISIS_DE[m.sigla] ?? 'Ricketts' }));
}

/** A qué análisis corresponde cada medida, para agruparlas. */
const ANALISIS_DE: Record<string, MedicionResultado['analisis']> = {
  SNA: 'Steiner',
  SNB: 'Steiner',
  ANB: 'Steiner',
  '1-NA (°)': 'Steiner',
  '1-NB (°)': 'Steiner',
  Interincisivo: 'Steiner',
  FMA: 'Tweed',
  IMPA: 'Tweed',
};

/**
 * Orden de marcado del asistente para el análisis de Ricketts: de arriba hacia
 * abajo y de atrás hacia adelante, como se recorre la placa. Solo los puntos
 * que usa el análisis (más los de Steiner, que salen gratis con los mismos).
 */
export const SECUENCIA_RICKETTS: string[] = [
  'S', 'N', 'Ba', 'Po', 'Or', 'Pt', 'DC', 'Xi', 'ANS', 'PNS', 'A',
  'U1A', 'U1I', 'L1I', 'L1A', 'B', 'PM', 'Pog', 'Gn', 'Me', 'Go',
  'Pn', 'UL', 'LL', 'Pog_b',
];
