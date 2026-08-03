export interface Cadete {
  id: string;
  user_id: string;

  // Datos personales
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento?: string | null;
  sexo?: "M" | "F" | null;

  // Datos antropometricos base
  altura_cm?: number | null;

  // Foto (retrato) del cadete — URL publica en el bucket 'fotos-cadetes'
  foto_url?: string | null;

  // Datos militares
  curso?: string | null;
  seccion?: string | null;
  peloton?: string | null;
  compania?: string | null; // Alias de seccion en algunos contextos
  rango?: string | null;

  // Estado
  activo: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface Pesada {
  id: string;
  cadete_id: string;
  user_id: string;

  // Datos de la pesada
  fecha: string;
  peso_kg: number;

  // Medidas antropometricas
  circ_brazo_cm?: number;
  pliegue_tricipital_mm?: number;
  pliegue_subescapular_mm?: number;

  // Campos calculados
  imc?: number;
  masa_muscular_kg?: number;
  porcentaje_grasa?: number;
  cintura_cm?: number;
  cadera_cm?: number;

  // Contexto temporal
  semana_ano?: number;
  mes?: number;
  ano?: number;

  // Rango del cadete al momento de la pesada
  rango?: string;

  // Observaciones
  observaciones?: string;
  alerta_tendencia?: boolean;

  // Metadata
  created_at: string;
  updated_at: string;

  // Relaciones
  cadete?: Cadete;
}

export interface ConfigPeso {
  id: string;
  user_id: string;

  // Umbrales de alertas
  umbral_imc_bajo: number;
  umbral_imc_sobrepeso: number;
  umbral_imc_obesidad: number;

  umbral_variacion_peso_porcentaje: number;
  umbral_variacion_semanas: number;

  // Configuracion de exportacion
  incluir_logo_instituto: boolean;
  formato_exportacion_preferido: "PDF" | "CSV";
  institucion_nombre?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// Vista: Ultima pesada por cadete
export interface UltimaPesadaCadete {
  cadete_id: string;
  nombre: string;
  apellido: string;
  dni: string;
  seccion?: string;
  curso?: string;
  peloton?: string;
  compania?: string;
  fecha?: string;
  peso_kg?: number;
  altura_cm?: number;
  imc?: number;
  masa_muscular_kg?: number;
  porcentaje_grasa?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  rango?: string;
}

// Vista: Tendencia de peso
export interface TendenciaPeso {
  cadete_id: string;
  nombre: string;
  apellido: string;
  peso_actual: number;
  peso_4_semanas_atras: number;
  variacion_porcentaje: number;
  requiere_atencion: boolean;
}

// Formularios
export interface CadeteFormData {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  sexo: "M" | "F";
  curso?: string;
  seccion?: string;
  rango?: string;
  altura_cm?: number;
}

export interface PesadaFormData {
  cadete_id: string;
  peso_kg?: number;
  circ_brazo_cm?: number;
  pliegue_tricipital_mm?: number;
  pliegue_subescapular_mm?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  observaciones?: string;
}

// Filtros
export interface FiltrosPesada {
  cadete_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  semana_ano?: number;
  mes?: number;
  ano?: number;
}

// Estadisticas
export interface EstadisticasCadete {
  cadete_id: string;
  nombre_completo: string;
  total_pesadas: number;
  peso_minimo: number;
  peso_maximo: number;
  peso_promedio: number;
  imc_promedio: number;
  ultima_pesada: string;
  tendencia: "subiendo" | "bajando" | "estable";
}

// Clasificacion IMC
export type ClasificacionIMC =
  | "bajo_peso"
  | "peso_normal"
  | "sobrepeso"
  | "obesidad_i"
  | "obesidad_ii"
  | "obesidad_iii";

export interface RangoIMC {
  min: number;
  max: number;
  clasificacion: ClasificacionIMC;
  label: string;
  color: string;
}

// Exportacion
export interface ExportPesoOptions {
  formato: "CSV" | "PDF";
  cadete_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  incluir_graficos?: boolean;
  incluir_logo?: boolean;
}
