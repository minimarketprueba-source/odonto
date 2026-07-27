import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paciente } from "./pacientes";

export type EstadoCama = "disponible" | "ocupada" | "limpieza" | "reservada";
export type EstadoIngreso = "activo" | "alta" | "traslado";

export interface Sala {
  id: number;
  nombre: string;
  descripcion?: string;
  capacidad: number;
}

export interface Cama {
  id: number;
  sala_id: number;
  codigo: string; // ej: CAMA-01
  estado: EstadoCama;
  sala_nombre?: string;
}

export interface SignoVital {
  id: string | number;
  ingreso_id: number;
  created_at: string; // ISO
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null; // bpm
  fr?: number | null; // rpm
  temp?: number | null; // °C
  spo2?: number | null; // %
  glucemia?: number | null; // mg/dL
  observaciones?: string | null;
  enfermero_nombre?: string | null;
}

export interface IngresoCama {
  id: number;
  paciente_id: number;
  cama_id: number;
  fecha_ingreso: string; // yyyy-mm-dd
  hora_ingreso: string; // hh:mm
  diagnostico_ingreso?: string | null;
  cie10_codigo?: string | null;
  motivo_observacion?: string | null;
  medico_tratante?: string | null;
  enfermero_cargo?: string | null;
  estado: EstadoIngreso;
  fecha_egreso?: string | null;
  hora_egreso?: string | null;
  motivo_egreso?: string | null;
  created_at?: string;
  paciente?: Paciente | null;
  cama?: Cama | null;
  signos_vitales?: SignoVital[];
}

// ---------------------------------------------------------------------------
// DATOS SEMILLA EN MEMORIA / LOCALSTORAGE (Fallback robusto)
// ---------------------------------------------------------------------------

const KEY_CAMAS = "anp_enfermeria_camas_v1";
const KEY_INGRESOS = "anp_enfermeria_ingresos_v1";
const KEY_VITALES = "anp_enfermeria_vitales_v1";

const SALAS_DEFAULT: Sala[] = [
  { id: 1, nombre: "Sala 1 — Observación Masculina", capacidad: 4 },
  { id: 2, nombre: "Sala 2 — Observación Femenina", capacidad: 4 },
  { id: 3, nombre: "Sala 3 — Aislamiento / Cuarentena", capacidad: 2 },
  { id: 4, nombre: "Pavellón de Internación General", capacidad: 6 },
];

const CAMAS_DEFAULT: Cama[] = [
  { id: 101, sala_id: 1, codigo: "CAMA 101", estado: "disponible", sala_nombre: "Sala 1 — Observación Masculina" },
  { id: 102, sala_id: 1, codigo: "CAMA 102", estado: "disponible", sala_nombre: "Sala 1 — Observación Masculina" },
  { id: 103, sala_id: 1, codigo: "CAMA 103", estado: "disponible", sala_nombre: "Sala 1 — Observación Masculina" },
  { id: 104, sala_id: 1, codigo: "CAMA 104", estado: "disponible", sala_nombre: "Sala 1 — Observación Masculina" },
  { id: 201, sala_id: 2, codigo: "CAMA 201", estado: "disponible", sala_nombre: "Sala 2 — Observación Femenina" },
  { id: 202, sala_id: 2, codigo: "CAMA 202", estado: "disponible", sala_nombre: "Sala 2 — Observación Femenina" },
  { id: 203, sala_id: 2, codigo: "CAMA 203", estado: "disponible", sala_nombre: "Sala 2 — Observación Femenina" },
  { id: 204, sala_id: 2, codigo: "CAMA 204", estado: "disponible", sala_nombre: "Sala 2 — Observación Femenina" },
  { id: 301, sala_id: 3, codigo: "CAMA 301", estado: "disponible", sala_nombre: "Sala 3 — Aislamiento / Cuarentena" },
  { id: 302, sala_id: 3, codigo: "CAMA 302", estado: "disponible", sala_nombre: "Sala 3 — Aislamiento / Cuarentena" },
  { id: 401, sala_id: 4, codigo: "CAMA 401", estado: "disponible", sala_nombre: "Pavellón de Internación General" },
  { id: 402, sala_id: 4, codigo: "CAMA 402", estado: "disponible", sala_nombre: "Pavellón de Internación General" },
];

function getCamasLocal(): Cama[] {
  try {
    const s = localStorage.getItem(KEY_CAMAS);
    return s ? JSON.parse(s) : CAMAS_DEFAULT;
  } catch {
    return CAMAS_DEFAULT;
  }
}

function saveCamasLocal(camas: Cama[]) {
  localStorage.setItem(KEY_CAMAS, JSON.stringify(camas));
}

function getIngresosLocal(): IngresoCama[] {
  try {
    const s = localStorage.getItem(KEY_INGRESOS);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveIngresosLocal(ingresos: IngresoCama[]) {
  localStorage.setItem(KEY_INGRESOS, JSON.stringify(ingresos));
}

function getVitalesLocal(): SignoVital[] {
  try {
    const s = localStorage.getItem(KEY_VITALES);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveVitalesLocal(v: SignoVital[]) {
  localStorage.setItem(KEY_VITALES, JSON.stringify(v));
}

// ---------------------------------------------------------------------------
// OPERACIONES DE DATOS
// ---------------------------------------------------------------------------

export async function fetchEnfermeriaSalas(): Promise<Sala[]> {
  return SALAS_DEFAULT;
}

export async function fetchEnfermeriaCamas(): Promise<Cama[]> {
  return getCamasLocal();
}

export async function fetchIngresosActivos(): Promise<IngresoCama[]> {
  const ingresos = getIngresosLocal().filter((i) => i.estado === "activo");
  const vitales = getVitalesLocal();
  return ingresos.map((i) => ({
    ...i,
    signos_vitales: vitales.filter((v) => Number(v.ingreso_id) === Number(i.id)),
  }));
}

export interface IngresarPacienteInput {
  paciente_id: number;
  cama_id: number;
  fecha_ingreso: string;
  hora_ingreso: string;
  diagnostico_ingreso?: string;
  cie10_codigo?: string;
  motivo_observacion?: string;
  medico_tratante?: string;
  enfermero_cargo?: string;
  pacienteObj?: Paciente | null;
}

export async function ingresarPacienteACama(input: IngresarPacienteInput): Promise<IngresoCama> {
  const camas = getCamasLocal();
  const camaIdx = camas.findIndex((c) => c.id === input.cama_id);
  if (camaIdx >= 0) {
    camas[camaIdx].estado = "ocupada";
    saveCamasLocal(camas);
  }

  const ingresos = getIngresosLocal();
  const nuevoIngreso: IngresoCama = {
    id: Date.now(),
    paciente_id: input.paciente_id,
    cama_id: input.cama_id,
    fecha_ingreso: input.fecha_ingreso,
    hora_ingreso: input.hora_ingreso,
    diagnostico_ingreso: input.diagnostico_ingreso || null,
    cie10_codigo: input.cie10_codigo || null,
    motivo_observacion: input.motivo_observacion || null,
    medico_tratante: input.medico_tratante || null,
    enfermero_cargo: input.enfermero_cargo || null,
    estado: "activo",
    created_at: new Date().toISOString(),
    paciente: input.pacienteObj || null,
    cama: camas[camaIdx] || null,
    signos_vitales: [],
  };

  ingresos.unshift(nuevoIngreso);
  saveIngresosLocal(ingresos);
  return nuevoIngreso;
}

export interface RegistrarVitalesInput {
  ingreso_id: number;
  pa_sistolica?: number | null;
  pa_diastolica?: number | null;
  fc?: number | null;
  fr?: number | null;
  temp?: number | null;
  spo2?: number | null;
  glucemia?: number | null;
  observaciones?: string | null;
  enfermero_nombre?: string | null;
}

export async function registrarSignosVitales(input: RegistrarVitalesInput): Promise<SignoVital> {
  const vitales = getVitalesLocal();
  const nuevo: SignoVital = {
    id: Date.now(),
    ingreso_id: input.ingreso_id,
    created_at: new Date().toISOString(),
    pa_sistolica: input.pa_sistolica || null,
    pa_diastolica: input.pa_diastolica || null,
    fc: input.fc || null,
    fr: input.fr || null,
    temp: input.temp || null,
    spo2: input.spo2 || null,
    glucemia: input.glucemia || null,
    observaciones: input.observaciones || null,
    enfermero_nombre: input.enfermero_nombre || null,
  };
  vitales.unshift(nuevo);
  saveVitalesLocal(vitales);
  return nuevo;
}

export interface EgresoCamaInput {
  ingreso_id: number;
  cama_id: number;
  motivo_egreso: string;
  estado_final: "alta" | "traslado";
}

export async function egresarPacienteCama(input: EgresoCamaInput): Promise<void> {
  const ingresos = getIngresosLocal();
  const ingIdx = ingresos.findIndex((i) => i.id === input.ingreso_id);
  if (ingIdx >= 0) {
    const d = new Date();
    ingresos[ingIdx].estado = input.estado_final;
    ingresos[ingIdx].fecha_egreso = d.toISOString().split("T")[0];
    ingresos[ingIdx].hora_egreso = d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
    ingresos[ingIdx].motivo_egreso = input.motivo_egreso;
    saveIngresosLocal(ingresos);
  }

  const camas = getCamasLocal();
  const camaIdx = camas.findIndex((c) => c.id === input.cama_id);
  if (camaIdx >= 0) {
    camas[camaIdx].estado = "disponible";
    saveCamasLocal(camas);
  }
}

// ---------------------------------------------------------------------------
// HOOKS REACT QUERY
// ---------------------------------------------------------------------------

export function useEnfermeriaCamas() {
  return useQuery({
    queryKey: ["enfermeria", "camas"],
    queryFn: fetchEnfermeriaCamas,
  });
}

export function useEnfermeriaIngresos() {
  return useQuery({
    queryKey: ["enfermeria", "ingresos"],
    queryFn: fetchIngresosActivos,
  });
}

export function useIngresarPacienteCama() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ingresarPacienteACama,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enfermeria"] });
    },
  });
}

export function useRegistrarSignosVitales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarSignosVitales,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enfermeria"] });
    },
  });
}

export function useEgresarPacienteCama() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: egresarPacienteCama,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enfermeria"] });
    },
  });
}
