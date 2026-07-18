export interface Match {
  id: string
  home_team: { nombre: string }
  away_team: { nombre: string }
  goles_local: number
  goles_visitante: number
  fecha_partido: string
  estadio: string
  tournament: { nombre: string }
}

export interface StatsData {
  fecha: string
  partidos: number
  goles: number
}

export interface Tournament {
  id: string
  nombre: string
  status: string
  equipos_count: number
  partidos_jugados: number
  total_partidos: number
  progress: number
}

export interface Scorer {
  nombre: string
  team: {
    nombre: string
  }
  goles: number
  asistencias: number
}
