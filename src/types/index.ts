export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: "admin" | "organizador" | "jugador"
  created_at: string
  updated_at: string
}

export interface Equipo {
  id: string
  nombre: string
  ciudad?: string
  genero?: "masculino" | "femenino"
  compania?: number
  seccion?: string
  año_fundacion?: number
  logo_url?: string
  color_primario: string
  color_secundario: string
  entrenador?: string
  estadio?: string
  created_at: string
  updated_at: string
}

export interface Jugador {
  id: string
  nombre: string
  apellido: string
  equipo_id: string
  posicion: string
  numero_camiseta: number
  fecha_nacimiento?: string
  nacionalidad?: string
  altura?: number
  peso?: number
  foto?: string
  created_at: string
  updated_at: string
}

export interface Torneo {
  id: string
  nombre: string
  descripcion?: string
  tipo: "liga" | "eliminacion" | "grupos"
  estado: "upcoming" | "active" | "completed"
  genero?: "masculino" | "femenino"
  fecha_inicio: string
  fecha_fin?: string
  max_equipos: number
  user_id?: string
  created_at: string
  updated_at: string
}

export interface Partido {
  id: string
  torneo_id: string
  equipo_local_id: string
  equipo_visitante_id: string
  fecha_partido: string
  estadio?: string
  estado: "scheduled" | "live" | "completed" | "postponed"
  goles_local?: number
  goles_visitante?: number
  observaciones?: string
  created_at: string
  updated_at: string
}

// Tipos con relaciones para componentes
export interface Match extends Partido {
  equipo_local?: { nombre: string }
  equipo_visitante?: { nombre: string }
  torneo?: { nombre: string }
}

export interface Team extends Equipo {
  nombre: string
  ciudad?: string
  color_primario: string
  logo_url?: string
}

export interface Scorer {
  id: string
  nombre: string
  apellido: string
  equipo?: { nombre: string }
  goles: number
  asistencias: number
  partidos_jugados: number
  goals?: number  // Alias para compatibilidad
}

export interface TablaPosicion {
  equipo_id: string
  torneo_id: string
  partidos_jugados: number
  partidos_ganados: number
  partidos_empatados: number
  partidos_perdidos: number
  goles_favor: number
  goles_contra: number
  diferencia_goles: number
  puntos: number
}
