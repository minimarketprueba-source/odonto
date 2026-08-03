import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Interfaces y Tipos
// ---------------------------------------------------------------------------

export interface OdontoPrecio {
  id: number;
  codigo: string;
  nombre: string;
  costo: number;
  activo: boolean;
  created_at?: string;
}

export interface PacienteAnamnesis {
  paciente_id: number;
  alergias: string | null;
  alergia_latex: boolean;
  alergia_anestesia: boolean;
  problemas_cardiacos: boolean;
  presion_arterial: string | null;
  medicamentos: string | null;
  enfermedades_sistemicas: string | null;
  observaciones: string | null;
  updated_at?: string;
}

export interface OdontogramaRegistro {
  id?: number;
  paciente_id: number;
  pieza: number; // 11-48, 51-85
  cara: string; // vestibular, palatina, oclusal, mesial, distal, completo
  diagnostico: string | null; // caries, fractura, etc.
  tratamiento: string | null; // empaste, endodoncia, etc.
  estado: "pendiente" | "realizado";
  color: string | null;
  notas: string | null;
  registrado_por?: string | null;
  created_at?: string;
}

export interface Presupuesto {
  id: number;
  paciente_id: number;
  titulo: string;
  estado: "borrador" | "aprobado" | "rechazado" | "finalizado";
  total: number;
  saldo_pendiente: number;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  pacientes?: {
    nombres: string;
    apellidos: string;
    documento: string | null;
  };
}

export interface PresupuestoDetalle {
  id: number;
  presupuesto_id: number;
  tratamiento_id: number;
  pieza: number | null;
  cara: string | null;
  costo: number;
  descuento: number;
  estado: "pendiente" | "realizado";
  created_at: string;
  odontologia_precios?: OdontoPrecio;
}

export interface PagoPresupuesto {
  id: number;
  presupuesto_id: number;
  monto: number;
  tipo_pago: "efectivo" | "tarjeta" | "transferencia" | string;
  comentario: string | null;
  fecha: string;
  recibido_por: string | null;
  created_at: string;
}

export interface PacienteImagen {
  id: number;
  paciente_id: number;
  url: string;
  tipo: "panoramica" | "periapical" | "clinica" | "otra" | string;
  descripcion: string | null;
  fecha: string;
  registrado_por: string | null;
  created_at: string;
}

export interface ConsentimientoPaciente {
  id: number;
  paciente_id: number;
  titulo: string;
  contenido: string;
  firma: string; // Base64 de la firma
  firmado_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------
export const odontoKeys = {
  all: ["odontologia"] as const,
  precios: () => [...odontoKeys.all, "precios"] as const,
  anamnesis: (pacienteId: number) => [...odontoKeys.all, "anamnesis", pacienteId] as const,
  odontograma: (pacienteId: number) => [...odontoKeys.all, "odontograma", pacienteId] as const,
  presupuestos: (pacienteId?: number) => [...odontoKeys.all, "presupuestos", pacienteId].filter(Boolean) as string[],
  presupuestoDetalles: (presupuestoId: number) => [...odontoKeys.all, "presupuesto_detalles", presupuestoId] as const,
  pagos: (presupuestoId: number) => [...odontoKeys.all, "pagos", presupuestoId] as const,
  imagenes: (pacienteId: number) => [...odontoKeys.all, "imagenes", pacienteId] as const,
  consentimientos: (pacienteId: number) => [...odontoKeys.all, "consentimientos", pacienteId] as const,
};

// Helper para atrapar errores de tabla inexistente y dar una guía clara al usuario
function handleDbError(error: any, tabla: string): never {
  console.error(`Error en tabla ${tabla}:`, error);
  if (error?.code === "PGRST204" || error?.code === "42P01" || error?.message?.includes("relation")) {
    throw new Error(
      `La tabla '${tabla}' no existe en la base de datos de Supabase. ` +
      `Por favor, pegue el contenido de 'supabase/migrations/odontologia_setup.sql' en el SQL Editor de su Supabase y ejecútelo para continuar.`
    );
  }
  throw new Error(error?.message || "Error de base de datos desconocido");
}

// ---------------------------------------------------------------------------
// 1. API: Lista de Precios
// ---------------------------------------------------------------------------
export async function fetchOdontoPrecios(): Promise<OdontoPrecio[]> {
  const { data, error } = await supabase
    .from("odontologia_precios")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) handleDbError(error, "odontologia_precios");
  return data || [];
}

export async function saveOdontoPrecio(precio: Partial<OdontoPrecio>): Promise<OdontoPrecio> {
  const isNew = !precio.id;
  const query = isNew
    ? supabase.from("odontologia_precios").insert(precio).select().single()
    : supabase.from("odontologia_precios").update(precio).eq("id", precio.id).select().single();
  const { data, error } = await query;
  if (error) handleDbError(error, "odontologia_precios");
  return data;
}

export function useOdontoPrecios() {
  return useQuery({
    queryKey: odontoKeys.precios(),
    queryFn: fetchOdontoPrecios,
  });
}

export function useSaveOdontoPrecio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOdontoPrecio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.precios() });
    },
  });
}

// ---------------------------------------------------------------------------
// 2. API: Anamnesis
// ---------------------------------------------------------------------------
export async function fetchPacienteAnamnesis(pacienteId: number): Promise<PacienteAnamnesis | null> {
  const { data, error } = await supabase
    .from("paciente_anamnesis")
    .select("*")
    .eq("paciente_id", pacienteId)
    .maybeSingle();
  if (error) handleDbError(error, "paciente_anamnesis");
  return data;
}

export async function savePacienteAnamnesis(anamnesis: PacienteAnamnesis): Promise<PacienteAnamnesis> {
  const { data, error } = await supabase
    .from("paciente_anamnesis")
    .upsert(anamnesis, { onConflict: "paciente_id" })
    .select()
    .single();
  if (error) handleDbError(error, "paciente_anamnesis");
  return data;
}

export function usePacienteAnamnesis(pacienteId: number) {
  return useQuery({
    queryKey: odontoKeys.anamnesis(pacienteId),
    queryFn: () => fetchPacienteAnamnesis(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useSavePacienteAnamnesis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePacienteAnamnesis,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.anamnesis(variables.paciente_id) });
    },
  });
}

// ---------------------------------------------------------------------------
// 3. API: Odontograma
// ---------------------------------------------------------------------------
export async function fetchOdontograma(pacienteId: number): Promise<OdontogramaRegistro[]> {
  const { data, error } = await supabase
    .from("odontograma_registros")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });
  if (error) handleDbError(error, "odontograma_registros");
  return data || [];
}

export async function saveOdontogramaRegistro(registro: OdontogramaRegistro): Promise<OdontogramaRegistro> {
  const { data, error } = await supabase
    .from("odontograma_registros")
    .insert(registro)
    .select()
    .single();
  if (error) handleDbError(error, "odontograma_registros");
  return data;
}

export function useOdontograma(pacienteId: number) {
  return useQuery({
    queryKey: odontoKeys.odontograma(pacienteId),
    queryFn: () => fetchOdontograma(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useSaveOdontogramaRegistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOdontogramaRegistro,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.odontograma(variables.paciente_id) });
    },
  });
}

// ---------------------------------------------------------------------------
// 4. API: Presupuestos y Planes de Tratamiento
// ---------------------------------------------------------------------------
export async function fetchPresupuestos(pacienteId?: number): Promise<Presupuesto[]> {
  let query = supabase.from("presupuestos").select("*, pacientes(nombres, apellidos, documento)");
  if (pacienteId) {
    query = query.eq("paciente_id", pacienteId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) handleDbError(error, "presupuestos");
  return data || [];
}

export async function createPresupuesto(pacienteId: number, titulo: string): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from("presupuestos")
    .insert({
      paciente_id: pacienteId,
      titulo,
      estado: "borrador",
      total: 0,
      saldo_pendiente: 0,
    })
    .select()
    .single();
  if (error) handleDbError(error, "presupuestos");
  return data;
}

export async function updatePresupuesto(id: number, cambios: Partial<Presupuesto>): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from("presupuestos")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) handleDbError(error, "presupuestos");
  return data;
}

export async function deletePresupuesto(id: number): Promise<void> {
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) handleDbError(error, "presupuestos");
}

export function usePresupuestos(pacienteId?: number) {
  return useQuery({
    queryKey: odontoKeys.presupuestos(pacienteId),
    queryFn: () => fetchPresupuestos(pacienteId),
  });
}

export function useCreatePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pacienteId, titulo }: { pacienteId: number; titulo: string }) => createPresupuesto(pacienteId, titulo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos(data.paciente_id) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

export function useUpdatePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<Presupuesto> }) => updatePresupuesto(id, cambios),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos(data.paciente_id) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

export function useDeletePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: number; pacienteId: number }) => deletePresupuesto(variables.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos(variables.pacienteId) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

// ---------------------------------------------------------------------------
// Detalles de Presupuesto
// ---------------------------------------------------------------------------
export async function fetchPresupuestoDetalles(presupuestoId: number): Promise<PresupuestoDetalle[]> {
  const { data, error } = await supabase
    .from("presupuesto_detalles")
    .select("*, odontologia_precios(*)")
    .eq("presupuesto_id", presupuestoId);
  if (error) handleDbError(error, "presupuesto_detalles");
  return data || [];
}

export async function addPresupuestoDetalle(detalle: Partial<PresupuestoDetalle>): Promise<PresupuestoDetalle> {
  const { data, error } = await supabase
    .from("presupuesto_detalles")
    .insert(detalle)
    .select()
    .single();
  if (error) handleDbError(error, "presupuesto_detalles");
  return data;
}

export async function updatePresupuestoDetalle(id: number, cambios: Partial<PresupuestoDetalle>): Promise<PresupuestoDetalle> {
  const { data, error } = await supabase
    .from("presupuesto_detalles")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) handleDbError(error, "presupuesto_detalles");
  return data;
}

export async function deletePresupuestoDetalle(id: number): Promise<void> {
  const { error } = await supabase.from("presupuesto_detalles").delete().eq("id", id);
  if (error) handleDbError(error, "presupuesto_detalles");
}

export function usePresupuestoDetalles(presupuestoId: number) {
  return useQuery({
    queryKey: odontoKeys.presupuestoDetalles(presupuestoId),
    queryFn: () => fetchPresupuestoDetalles(presupuestoId),
    enabled: !!presupuestoId,
  });
}

export function useAddPresupuestoDetalle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addPresupuestoDetalle,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestoDetalles(data.presupuesto_id) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

export function useUpdatePresupuestoDetalle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<PresupuestoDetalle> }) => updatePresupuestoDetalle(id, cambios),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestoDetalles(data.presupuesto_id) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

export function useDeletePresupuestoDetalle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: number; presupuestoId: number }) => deletePresupuestoDetalle(variables.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestoDetalles(variables.presupuestoId) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

// ---------------------------------------------------------------------------
// Pagos de Presupuesto
// ---------------------------------------------------------------------------
export async function fetchPagosPresupuesto(presupuestoId: number): Promise<PagoPresupuesto[]> {
  const { data, error } = await supabase
    .from("pagos_presupuesto")
    .select("*")
    .eq("presupuesto_id", presupuestoId)
    .order("fecha", { ascending: false });
  if (error) handleDbError(error, "pagos_presupuesto");
  return data || [];
}

export async function addPagoPresupuesto(pago: Partial<PagoPresupuesto>): Promise<PagoPresupuesto> {
  const { data, error } = await supabase
    .from("pagos_presupuesto")
    .insert(pago)
    .select()
    .single();
  if (error) handleDbError(error, "pagos_presupuesto");
  return data;
}

export function usePagosPresupuesto(presupuestoId: number) {
  return useQuery({
    queryKey: odontoKeys.pagos(presupuestoId),
    queryFn: () => fetchPagosPresupuesto(presupuestoId),
    enabled: !!presupuestoId,
  });
}

export function useAddPagoPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addPagoPresupuesto,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.pagos(data.presupuesto_id) });
      queryClient.invalidateQueries({ queryKey: odontoKeys.presupuestos() });
    },
  });
}

// ---------------------------------------------------------------------------
// 5. API: Imágenes Clínicas / Radiografías
// ---------------------------------------------------------------------------
export async function fetchPacienteImagenes(pacienteId: number): Promise<PacienteImagen[]> {
  const { data, error } = await supabase
    .from("paciente_imagenes")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });
  if (error) handleDbError(error, "paciente_imagenes");
  return data || [];
}

export async function createPacienteImagen(imagen: Partial<PacienteImagen>): Promise<PacienteImagen> {
  const { data, error } = await supabase
    .from("paciente_imagenes")
    .insert(imagen)
    .select()
    .single();
  if (error) handleDbError(error, "paciente_imagenes");
  return data;
}

export async function uploadImagenFile(file: File, pacienteId: number): Promise<string> {
  // Intentar subir al bucket 'radiografias' de Supabase
  const fileExt = file.name.split(".").pop();
  const fileName = `${pacienteId}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from("radiografias")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true
    });
  
  if (error) {
    console.warn("Storage upload error (using data URL fallback):", error);
    // Fallback: Si no está creado el bucket o no hay permisos, lo leemos como Base64 (DataURL) para demostración local.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Devolver URL pública de Supabase
  const { data: publicUrlData } = supabase.storage
    .from("radiografias")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export function usePacienteImagenes(pacienteId: number) {
  return useQuery({
    queryKey: odontoKeys.imagenes(pacienteId),
    queryFn: () => fetchPacienteImagenes(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCreatePacienteImagen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPacienteImagen,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.imagenes(data.paciente_id) });
    },
  });
}

// ---------------------------------------------------------------------------
// 6. API: Consentimientos Informados
// ---------------------------------------------------------------------------
export async function fetchConsentimientos(pacienteId: number): Promise<ConsentimientoPaciente[]> {
  const { data, error } = await supabase
    .from("consentimientos_paciente")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("firmado_at", { ascending: false });
  if (error) handleDbError(error, "consentimientos_paciente");
  return data || [];
}

export async function createConsentimiento(consentimiento: Partial<ConsentimientoPaciente>): Promise<ConsentimientoPaciente> {
  const { data, error } = await supabase
    .from("consentimientos_paciente")
    .insert(consentimiento)
    .select()
    .single();
  if (error) handleDbError(error, "consentimientos_paciente");
  return data;
}

export function useConsentimientos(pacienteId: number) {
  return useQuery({
    queryKey: odontoKeys.consentimientos(pacienteId),
    queryFn: () => fetchConsentimientos(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCreateConsentimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConsentimiento,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: odontoKeys.consentimientos(data.paciente_id) });
    },
  });
}
