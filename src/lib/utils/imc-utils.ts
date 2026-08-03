// ============================================================================
// UTILIDADES IMC - Control-Peso v1.0.0
// ============================================================================

import { ClasificacionIMC, RangoIMC } from "@/types/peso";

/**
 * Rangos de clasificación IMC según OMS
 */
export const RANGOS_IMC: RangoIMC[] = [
  {
    min: 0,
    max: 18.5,
    clasificacion: 'bajo_peso',
    label: 'Bajo peso',
    color: '#3b82f6' // blue-500
  },
  {
    min: 18.5,
    max: 25,
    clasificacion: 'peso_normal',
    label: 'Peso normal',
    color: '#22c55e' // green-500
  },
  {
    min: 25,
    max: 30,
    clasificacion: 'sobrepeso',
    label: 'Sobrepeso',
    color: '#eab308' // yellow-500
  },
  {
    min: 30,
    max: 35,
    clasificacion: 'obesidad_i',
    label: 'Obesidad I',
    color: '#f97316' // orange-500
  },
  {
    min: 35,
    max: 40,
    clasificacion: 'obesidad_ii',
    label: 'Obesidad II',
    color: '#ef4444' // red-500
  },
  {
    min: 40,
    // Sin tope: con max 100 un IMC absurdo caía en el `|| RANGOS_IMC[1]` de
    // clasificarIMC y se mostraba como "Peso normal".
    max: Infinity,
    clasificacion: 'obesidad_iii',
    label: 'Obesidad III',
    color: '#991b1b' // red-800
  }
];

/**
 * Cache for IMC classifications to avoid repeated lookups
 */
const imcClassificationCache = new Map<number, RangoIMC>();

/**
 * Calcula el IMC (Índice de Masa Corporal)
 */
export function calcularIMC(peso_kg: number, altura_cm: number): number {
  const altura_m = altura_cm / 100;
  return Number((peso_kg / (altura_m * altura_m)).toFixed(2));
}

/**
 * Obtiene la clasificación de un valor de IMC
 * Uses caching for frequently accessed IMC values
 */
export function clasificarIMC(imc: number): RangoIMC {
  // Round to 1 decimal for cache key to improve hit rate
  const cacheKey = Math.round(imc * 10) / 10;

  const cached = imcClassificationCache.get(cacheKey);
  if (cached) return cached;

  // Binary search would be faster but with only 6 ranges, linear is fine
  const result = RANGOS_IMC.find(rango => imc >= rango.min && imc < rango.max) || RANGOS_IMC[1];

  // Only cache if map isn't too large (prevent memory leak)
  if (imcClassificationCache.size < 1000) {
    imcClassificationCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Obtiene el color para un valor de IMC
 */
export function getColorIMC(imc: number): string {
  return clasificarIMC(imc).color;
}

/**
 * Obtiene la etiqueta para un valor de IMC
 */
export function getLabelIMC(imc: number): string {
  return clasificarIMC(imc).label;
}

/**
 * Calcula el peso ideal según altura (rango normal IMC)
 */
export function calcularPesoIdeal(altura_cm: number): { min: number; max: number } {
  const altura_m = altura_cm / 100;
  return {
    min: Number((18.5 * altura_m * altura_m).toFixed(1)),
    max: Number((24.9 * altura_m * altura_m).toFixed(1))
  };
}

/**
 * Determina si un IMC requiere atención
 */
export function requiereAtencionIMC(imc: number): boolean {
  return imc < 18.5 || imc >= 30;
}

/**
 * Calcula la tendencia de peso entre dos valores
 */
export function calcularTendenciaPeso(
  peso_actual: number,
  peso_anterior: number
): 'subiendo' | 'bajando' | 'estable' {
  const diferencia = peso_actual - peso_anterior;
  const porcentaje = (diferencia / peso_anterior) * 100;

  if (Math.abs(porcentaje) < 2) return 'estable';
  return porcentaje > 0 ? 'subiendo' : 'bajando';
}

/**
 * Calcula el porcentaje de variación de peso
 */
export function calcularVariacionPeso(
  peso_actual: number,
  peso_anterior: number
): number {
  return Number((((peso_actual - peso_anterior) / peso_anterior) * 100).toFixed(2));
}

/**
 * Determina si la variación de peso requiere alerta
 */
export function requiereAlertaPeso(
  peso_actual: number,
  peso_anterior: number,
  umbral_porcentaje: number = 5
): boolean {
  return Math.abs(calcularVariacionPeso(peso_actual, peso_anterior)) >= umbral_porcentaje;
}

/**
 * Formatea un valor de peso para mostrar
 */
export function formatearPeso(peso_kg: number): string {
  return `${peso_kg.toFixed(1)} kg`;
}

/**
 * Formatea un valor de IMC para mostrar
 */
export function formatearIMC(imc: number): string {
  return imc.toFixed(2);
}

/**
 * Formatea una altura para mostrar
 */
export function formatearAltura(altura_cm: number): string {
  return `${altura_cm.toFixed(0)} cm`;
}

/**
 * Obtiene recomendaciones según clasificación IMC
 */
export function getRecomendacionesIMC(imc: number): string[] {
  const clasificacion = clasificarIMC(imc).clasificacion;

  const recomendaciones: Record<ClasificacionIMC, string[]> = {
    bajo_peso: [
      'Consultar con nutricionista para plan de alimentación',
      'Aumentar ingesta calórica de forma saludable',
      'Realizar ejercicio de fuerza para ganar masa muscular'
    ],
    peso_normal: [
      'Mantener hábitos alimenticios saludables',
      'Continuar con actividad física regular',
      'Realizar chequeos médicos periódicos'
    ],
    sobrepeso: [
      'Reducir consumo de alimentos procesados y azúcares',
      'Incrementar actividad física aeróbica',
      'Controlar porciones en las comidas'
    ],
    obesidad_i: [
      'Consulta médica y nutricional urgente',
      'Plan de reducción de peso supervisado',
      'Programa de ejercicio adaptado'
    ],
    obesidad_ii: [
      'Evaluación médica integral',
      'Programa de pérdida de peso multidisciplinario',
      'Considerar apoyo psicológico'
    ],
    obesidad_iii: [
      'Atención médica especializada inmediata',
      'Evaluación de riesgos para la salud',
      'Programa intensivo de reducción de peso'
    ]
  };

  return recomendaciones[clasificacion];
}

// ==========================================
// UTILIDADES ISAK (Antropometría)
// ==========================================

export interface RangoGrasa {
  min: number;
  max: number;
  clasificacion: 'bajo' | 'saludable' | 'alto' | 'obesidad';
  label: string;
  color: string;
}

export const RANGOS_GRASA_HOMBRES: RangoGrasa[] = [
  { min: 0, max: 6, clasificacion: 'bajo', label: 'Grasa esencial (Bajo)', color: '#3b82f6' },
  { min: 6, max: 24, clasificacion: 'saludable', label: 'Saludable', color: '#22c55e' },
  { min: 24, max: 30, clasificacion: 'alto', label: 'Alto', color: '#eab308' },
  { min: 30, max: 100, clasificacion: 'obesidad', label: 'Obesidad', color: '#ef4444' },
];

export const RANGOS_GRASA_MUJERES: RangoGrasa[] = [
  { min: 0, max: 14, clasificacion: 'bajo', label: 'Grasa esencial (Bajo)', color: '#3b82f6' },
  { min: 14, max: 31, clasificacion: 'saludable', label: 'Saludable', color: '#22c55e' },
  { min: 31, max: 37, clasificacion: 'alto', label: 'Alto', color: '#eab308' },
  { min: 37, max: 100, clasificacion: 'obesidad', label: 'Obesidad', color: '#ef4444' },
];

/**
 * Calcula el porcentaje de grasa corporal (Estimación simpa usando pliegues)
 * Nota: Esta es una aproximación general ya que fórmulas precisas (Durnin/Womersley) requieren 4 pliegues.
 * Usamos una aproximación lineal basada en tricipital + subescapular.
 */
export function calcularPorcentajeGrasa(
  pliegue_tricipital: number,
  pliegue_subescapular: number,
  sexo: 'M' | 'F' = 'M',
  _edad: number = 20
): number {
  const sumaPliegues = pliegue_tricipital + pliegue_subescapular;

  // Fórmula simplificada basada en Slaughter et al. (modificada para adultos jóvenes)
  // Mas adecuada para el contexto si no hay 4 pliegues
  if (sexo === 'M') {
    return Number((0.735 * sumaPliegues + 1.0).toFixed(1));
  } else {
    return Number((0.610 * sumaPliegues + 5.1).toFixed(1));
  }
}

/**
 * Clasifica el porcentaje de grasa corporal
 */
export function clasificarPorcentajeGrasa(porcentaje: number, sexo: 'M' | 'F' = 'M'): RangoGrasa {
  const rangos = sexo === 'M' ? RANGOS_GRASA_HOMBRES : RANGOS_GRASA_MUJERES;
  return rangos.find(r => porcentaje >= r.min && porcentaje < r.max) || rangos[rangos.length - 1];
}

/**
 * Calcula la masa muscular (Estimación)
 * Basado en Área Muscular del Brazo (AMA)
 * AMA = [C - (π * T)]^2 / (4 * π)
 * Donde C = circunferencia brazo (cm), T = pliegue tricipital (cm)
 * Se ajusta: Hombres -10, Mujeres -6.5 para área ósea
 */
export function calcularMasaMuscular(
  circ_brazo_cm: number,
  pliegue_tricipital_mm: number,
  altura_cm?: number,
  sexo: 'M' | 'F' = 'M'
): number {
  const tricipital_cm = pliegue_tricipital_mm / 10;
  const term = circ_brazo_cm - (Math.PI * tricipital_cm);
  const ama = (term * term) / (4 * Math.PI);

  // Corrección por área ósea (estimada)
  const amaCorregido = ama - (sexo === 'M' ? 10 : 6.5);

  // Si tenemos altura, usamos fórmula Heymsfield para Kg
  if (altura_cm) {
    const masaTotal = altura_cm * (0.0264 + (0.0029 * amaCorregido));
    return Number(masaTotal.toFixed(1));
  }

  // Sin altura, devolvemos el índice AMA
  return Number(amaCorregido.toFixed(1));
}

export const RANGOS_MUSCULO_HOMBRES: RangoGrasa[] = [
  { min: 0, max: 33, clasificacion: 'bajo', label: 'Bajo', color: '#eab308' },
  { min: 33, max: 39, clasificacion: 'saludable', label: 'Normal', color: '#22c55e' },
  { min: 39, max: 100, clasificacion: 'alto', label: 'Alto (Bueno)', color: '#3b82f6' },
];

export const RANGOS_MUSCULO_MUJERES: RangoGrasa[] = [
  { min: 0, max: 24, clasificacion: 'bajo', label: 'Bajo', color: '#eab308' },
  { min: 24, max: 30, clasificacion: 'saludable', label: 'Normal', color: '#22c55e' },
  { min: 30, max: 100, clasificacion: 'alto', label: 'Alto (Bueno)', color: '#3b82f6' },
];

/**
 * Calcula el porcentaje de masa muscular
 */
export function calcularPorcentajeMuscular(masa_kg: number, peso_total_kg: number): number {
  if (!peso_total_kg || peso_total_kg === 0) return 0;
  return Number(((masa_kg / peso_total_kg) * 100).toFixed(1));
}

/**
 * Clasifica el porcentaje de masa muscular
 */
export function clasificarPorcentajeMuscular(porcentaje: number, sexo: 'M' | 'F' = 'M'): RangoGrasa {
  const rangos = sexo === 'M' ? RANGOS_MUSCULO_HOMBRES : RANGOS_MUSCULO_MUJERES;
  return rangos.find(r => porcentaje >= r.min && porcentaje < r.max) || rangos[rangos.length - 1];
}
