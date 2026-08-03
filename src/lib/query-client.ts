import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo que los datos se consideran "frescos" (5 minutos)
      staleTime: 5 * 60 * 1000,
      // Tiempo que los datos inactivos permanecen en cache (30 minutos)
      gcTime: 30 * 60 * 1000,
      // Reintentar máximo 2 veces en caso de error
      retry: 2,
      // Refetch cuando la ventana recupera el foco
      refetchOnWindowFocus: false,
      // Refetch cuando se reconecta a internet
      refetchOnReconnect: true,
    },
    mutations: {
      // Nunca reintentar escrituras automáticamente. Si el servidor alcanzó a
      // guardar y se perdió la respuesta, repetir desde el navegador puede
      // duplicar citas, recetas, pesadas u otros registros clínicos.
      retry: 0,
    },
  },
})

// Keys centralizadas para las queries
export const queryKeys = {
  // Cadetes
  cadetes: {
    all: ['cadetes'] as const,
    list: () => [...queryKeys.cadetes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.cadetes.all, 'detail', id] as const,
    byCompania: (companiaId: string) => [...queryKeys.cadetes.all, 'compania', companiaId] as const,
  },
  // Peso / IMC
  peso: {
    all: ['peso'] as const,
    historial: (cadeteId: string) => [...queryKeys.peso.all, 'historial', cadeteId] as const,
    ultimasPesadas: () => [...queryKeys.peso.all, 'ultimas'] as const,
    estadisticas: () => [...queryKeys.peso.all, 'estadisticas'] as const,
  },
  // Companías
  companias: {
    all: ['companias'] as const,
    list: () => [...queryKeys.companias.all, 'list'] as const,
  },
  // Notificaciones
  notificaciones: {
    all: ['notificaciones'] as const,
    unread: () => [...queryKeys.notificaciones.all, 'unread'] as const,
  },
  // Usuarios
  usuarios: {
    all: ['usuarios'] as const,
    current: () => [...queryKeys.usuarios.all, 'current'] as const,
  },
  // Oficiales
  oficiales: {
    all: ['oficiales'] as const,
    list: () => [...queryKeys.oficiales.all, 'list'] as const,
  },
  // Configuración
  config: {
    all: ['config'] as const,
    firma: (userId: string) => [...queryKeys.config.all, 'firma', userId] as const,
    numNota: (userId: string) => [...queryKeys.config.all, 'numNota', userId] as const,
  },
  // Días libres
  diasLibres: {
    all: ['diasLibres'] as const,
    porDia: (dia: string) => [...queryKeys.diasLibres.all, dia] as const,
    porOficial: (oficialId: string) => [...queryKeys.diasLibres.all, 'oficial', oficialId] as const,
  },
  // Pacientes de la Sanidad
  pacientes: {
    all: ['pacientes'] as const,
    list: () => [...queryKeys.pacientes.all, 'list'] as const,
  },
  // Agenda de citas
  citas: {
    all: ['citas'] as const,
    porDia: (fecha: string) => [...queryKeys.citas.all, 'dia', fecha] as const,
    rango: (desde: string, hasta: string) =>
      [...queryKeys.citas.all, 'rango', desde, hasta] as const,
  },
  // Médicos (catálogo para la agenda)
  medicos: {
    all: ['medicos'] as const,
    list: () => [...queryKeys.medicos.all, 'list'] as const,
    mio: (userId: string) => [...queryKeys.medicos.all, 'mio', userId] as const,
    admin: () => [...queryKeys.medicos.all, 'admin'] as const,
  },
  // Consultas (historia clínica)
  consultas: {
    all: ['consultas'] as const,
    porPaciente: (pacienteId: number) =>
      [...queryKeys.consultas.all, 'paciente', pacienteId] as const,
    atenciones: () => [...queryKeys.consultas.all, 'atenciones'] as const,
    registros: () => [...queryKeys.consultas.all, 'registros'] as const,
  },
  procedimientos: {
    all: ['procedimientos'] as const,
    porPaciente: (pacienteId: number) => [...queryKeys.procedimientos.all, 'paciente', pacienteId] as const,
  },
  // Catálogo CIE-10
  cie10: {
    all: ['cie10'] as const,
    search: (q: string) => [...queryKeys.cie10.all, 'search', q] as const,
    count: () => [...queryKeys.cie10.all, 'count'] as const,
  },
  // Lista de espera
  listaEspera: {
    all: ['listaEspera'] as const,
    list: () => [...queryKeys.listaEspera.all, 'list'] as const,
  },
  // Horarios de atención de los profesionales
  horarios: {
    all: ['horarios'] as const,
    list: () => [...queryKeys.horarios.all, 'list'] as const,
  },
  // Ausencias de los profesionales
  ausencias: {
    all: ['ausencias'] as const,
    list: () => [...queryKeys.ausencias.all, 'list'] as const,
  },
  // Recetas
  recetas: {
    all: ['recetas'] as const,
    porPaciente: (pacienteId: number) =>
      [...queryKeys.recetas.all, 'paciente', pacienteId] as const,
  },
  // Enfermería: salas, camas, internaciones y atención ambulatoria
  enfermeria: {
    all: ['enfermeria'] as const,
    salas: () => [...queryKeys.enfermeria.all, 'salas'] as const,
    camas: () => [...queryKeys.enfermeria.all, 'camas'] as const,
    internaciones: () => [...queryKeys.enfermeria.all, 'internaciones'] as const,
    ambulatoriasPendientes: () =>
      [...queryKeys.enfermeria.all, 'ambulatorias', 'pendientes'] as const,
    ambulatoriasRecientes: () =>
      [...queryKeys.enfermeria.all, 'ambulatorias', 'recientes'] as const,
    ambulatoriasPaciente: (pacienteId: number) =>
      [...queryKeys.enfermeria.all, 'ambulatorias', 'paciente', pacienteId] as const,
  },
  // Perfil de la cuenta logueada
  perfil: {
    all: ['perfil'] as const,
    nombre: (userId: string) => [...queryKeys.perfil.all, 'nombre', userId] as const,
  },
  // Salvoconductos (autorización de traslado)
  salvoconductos: {
    all: ['salvoconductos'] as const,
    porPaciente: (pacienteId: number) =>
      [...queryKeys.salvoconductos.all, 'paciente', pacienteId] as const,
    porDia: (fecha: string) => [...queryKeys.salvoconductos.all, 'dia', fecha] as const,
  },
  // Fichas de RAC (urgencias)
  rac: {
    all: ['rac'] as const,
    rango: (desde: string, hasta: string) => [...queryKeys.rac.all, 'rango', desde, hasta] as const,
    porPaciente: (pacienteId: number) => [...queryKeys.rac.all, 'paciente', pacienteId] as const,
    enEspera: () => [...queryKeys.rac.all, 'en-espera'] as const,
  },
  // Especialidades
  especialidades: {
    all: ['especialidades'] as const,
    list: () => [...queryKeys.especialidades.all, 'list'] as const,
  },
} as const
