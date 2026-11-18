/**
 * Tipos de datos para el módulo de Cefalometría y Digitalización (WebCeph style)
 */

export type TipoPuntoCefalometrico = 'esqueletico' | 'dental' | 'blando' | 'calibracion';

export interface DefinicionPunto {
  id: string;
  nombre: string;
  simbolo: string;
  descripcion: string;
  tipo: TipoPuntoCefalometrico;
  color?: string;
  sugerido?: { x: number; y: number };
}

export interface CoordenadaPunto {
  x: number;
  y: number;
}

export type PuntosCefalometricosMap = Record<string, CoordenadaPunto>;

export interface DatosBolton {
  max12?: number;
  mand12?: number;
  max6?: number;
  mand6?: number;
  dientes?: Record<string, number>;
}

export interface FilaNance {
  positivo?: number;
  negativo?: number;
}

export interface DatosNance {
  epSuperior?: number;
  erSuperior?: number;
  epInferior?: number;
  erInferior?: number;
  filas?: Record<string, FilaNance>;
  dm?: number;
  dc?: number;
  exod?: number;
}

export interface CalibracionRegla {
  puntoA?: CoordenadaPunto;
  puntoB?: CoordenadaPunto;
  distanciaRealMm: number; // Por defecto 10mm, 20mm o 30mm
  pixelesPorMm?: number;
  bolton?: DatosBolton;
  nance?: DatosNance;
}

export interface MedicionResultado {
  nombre: string;
  sigla: string;
  tipo: 'angulo' | 'distancia';
  valor: number;
  unidad: '°' | 'mm';
  norma: string;
  desviacion?: number;
  enNorma?: boolean;
  interpretacion?: string;
  esqueletica?: boolean;
  /** A qué análisis pertenece: se agrupan así en la pantalla y en el informe. */
  analisis?: 'Ricketts' | 'Ricketts Frontal' | 'McNamara' | 'Steiner' | 'Tweed' | 'Wits';
  /** Campo de Ricketts (I al VI) y número de factor (1 al 33). */
  campo?: string;
  factorNumero?: number;
}

export type TipoEstudioCefalometrico =
  | 'teleradiografia_lateral'
  | 'radiografia_pa'
  | 'panoramica'
  | 'foto_perfil'
  | 'foto_frontal'
  | 'foto_sonrisa'
  | 'modelos';

export interface EstudioCefalometrico {
  id: string;
  paciente_id: string;
  fecha: string;
  titulo: string;
  tipo: TipoEstudioCefalometrico;
  /** Ruta en el depósito `cefalometria` (o data URL mientras no se guardó). */
  imagen_url: string;
  /** Fotos y radiografías complementarias del caso, por casillero. */
  imagenes?: Record<string, string>;
  puntos: PuntosCefalometricosMap;
  calibracion: CalibracionRegla;
  mediciones?: MedicionResultado[];
  progreso?: 'digitalizacion' | 'analisis' | 'tratamiento' | 'terminado';
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegistroCasoClinico {
  id: string;
  fecha: string;
  titulo: string;
  etiqueta?: string;
  progreso: 'digitalizacion' | 'analisis' | 'tratamiento' | 'terminado';
  estudios: EstudioCefalometrico[];
}
