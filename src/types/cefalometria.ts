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

export interface CalibracionRegla {
  puntoA?: CoordenadaPunto;
  puntoB?: CoordenadaPunto;
  distanciaRealMm: number; // Por defecto 10mm o 20mm
  pixelesPorMm?: number;
}

export interface MedicionResultado {
  nombre: string;
  sigla: string;
  tipo: 'angulo' | 'distancia';
  valor: number;
  unidad: '°' | 'mm';
  norma: string;
  desviacion?: number;
  interpretacion?: string;
  esqueletica?: boolean;
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
  imagen_url: string;
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
