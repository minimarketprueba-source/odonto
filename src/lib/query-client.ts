import { QueryClient } from '@tanstack/react-query';

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
      // Reintentar máximo 1 vez en mutaciones
      retry: 1,
    },
  },
});

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
    rango: (desde: string, hasta: string) => [...queryKeys.citas.all, 'rango', desde, hasta] as const,
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
    porPaciente: (pacienteId: number) => [...queryKeys.consultas.all, 'paciente', pacienteId] as const,
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
  // Recetas
  recetas: {
    all: ['recetas'] as const,
    porPaciente: (pacienteId: number) => [...queryKeys.recetas.all, 'paciente', pacienteId] as const,
  },
  // Especialidades
  especialidades: {
    all: ['especialidades'] as const,
    list: () => [...queryKeys.especialidades.all, 'list'] as const,
  },
} as const;
