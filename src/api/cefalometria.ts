import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EstudioCefalometrico } from '@/types/cefalometria';
import { esTablaInexistente } from '@/lib/esquema';

// ============================================================================
// Cefalometría
// ============================================================================
// Antes, si la tabla no existía, esto "guardaba" en el localStorage del
// navegador sin avisar: el trazado solo quedaba en esa computadora y se perdía
// al limpiarla (trampa 4 del CLAUDE.md). Ahora un error se muestra como error.
//
// Las imágenes van al depósito PRIVADO `cefalometria` (son radiografías y fotos
// de la cara de pacientes). En la tabla se guarda la RUTA del archivo, y la
// pantalla pide un enlace temporal para mostrarla.

const BUCKET = 'cefalometria';
const MIGRACION = 'supabase/migrations/cefalometria_setup.sql';

export class CefalometriaNoInstaladaError extends Error {
  constructor() {
    super(
      'Falta instalar el módulo de cefalometría en la base de datos. ' +
        `Hay que ejecutar ${MIGRACION} en el SQL Editor de Supabase.`
    );
  }
}

function revisar(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (esTablaInexistente(error)) throw new CefalometriaNoInstaladaError();
  throw new Error(error.message || 'Error de base de datos');
}

// ---------------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------------

/** Una ruta del depósito, a diferencia de una imagen embebida o una URL externa. */
export function esRutaDeposito(ref: string | null | undefined): ref is string {
  return !!ref && !ref.startsWith('data:') && !/^https?:\/\//.test(ref) && !ref.startsWith('blob:');
}

/**
 * Achica la imagen antes de subirla. Una foto del celular pesa 4-8 MB; a 2400 px
 * del lado mayor se sigue viendo cada estructura del trazado y pesa ~10 veces
 * menos. La calibración se hace sobre la imagen guardada, así que la escala
 * sigue siendo exacta.
 */
async function comprimir(dataUrl: string, ladoMax = 2400): Promise<Blob> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.9)
  );
}

async function subirImagen(dataUrl: string, pacienteId: string, estudioId: string, nombre: string): Promise<string> {
  const blob = await comprimir(dataUrl);
  const ruta = `${pacienteId}/${estudioId}/${nombre}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new CefalometriaNoInstaladaError();
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }
  return ruta;
}

/** Enlace para mostrar una imagen. Dura una hora; React Query lo renueva antes. */
export async function obtenerUrlImagen(ref: string): Promise<string> {
  if (!esRutaDeposito(ref)) return ref;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ref, 3600);
  if (error || !data) throw new Error(error?.message || 'No se pudo abrir la imagen');
  return data.signedUrl;
}

export function useUrlImagenCefalometria(ref: string | null | undefined) {
  return useQuery({
    queryKey: ['cefalometria_imagen', ref],
    queryFn: () => obtenerUrlImagen(ref || ''),
    enabled: !!ref,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Estudios
// ---------------------------------------------------------------------------

export async function getEstudiosPorPaciente(pacienteId: string): Promise<EstudioCefalometrico[]> {
  if (!pacienteId) return [];
  const { data, error } = await supabase
    .from('cefalometria_estudios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  revisar(error);
  return (data as EstudioCefalometrico[]) || [];
}

/**
 * Crea o actualiza un estudio. Las imágenes nuevas llegan como data URL (recién
 * elegidas del disco): se suben al depósito y en la fila queda solo la ruta.
 */
export async function guardarEstudioCefalometrico(
  estudio: Partial<EstudioCefalometrico> & { paciente_id: string }
): Promise<EstudioCefalometrico> {
  const id = estudio.id || crypto.randomUUID();

  let imagenUrl = estudio.imagen_url || '';
  if (imagenUrl.startsWith('data:')) {
    imagenUrl = await subirImagen(imagenUrl, estudio.paciente_id, id, 'teleradiografia');
  }

  const imagenes: Record<string, string> = {};
  for (const [slot, ref] of Object.entries(estudio.imagenes || {})) {
    if (!ref) continue;
    imagenes[slot] = ref.startsWith('data:') ? await subirImagen(ref, estudio.paciente_id, id, slot) : ref;
  }

  const fila = {
    id,
    paciente_id: estudio.paciente_id,
    fecha: estudio.fecha || new Date().toLocaleDateString('en-CA'),
    titulo: estudio.titulo || 'Teleradiografía lateral',
    tipo: estudio.tipo || 'teleradiografia_lateral',
    imagen_url: imagenUrl,
    imagenes,
    puntos: estudio.puntos || {},
    calibracion: estudio.calibracion || { distanciaRealMm: 10 },
    mediciones: estudio.mediciones || [],
    progreso: estudio.progreso || 'digitalizacion',
    notas: estudio.notas || '',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('cefalometria_estudios').upsert(fila).select().single();
  revisar(error);
  return data as EstudioCefalometrico;
}

export async function eliminarEstudioCefalometrico(estudio: EstudioCefalometrico): Promise<void> {
  const { data, error } = await supabase.from('cefalometria_estudios').delete().eq('id', estudio.id).select('id');
  revisar(error);
  // Con RLS, un DELETE sin permiso no da error: simplemente no borra nada.
  if (!data || data.length === 0) {
    throw new Error('Solo administración puede eliminar registros de la historia clínica.');
  }

  // Los archivos se borran después de la fila: si esto falla quedan archivos
  // sueltos, que es preferible a una fila apuntando a imágenes que ya no están.
  const rutas = [estudio.imagen_url, ...Object.values(estudio.imagenes || {})].filter(esRutaDeposito);
  if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas);
}

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export function useEstudiosCefalometria(pacienteId?: string) {
  return useQuery({
    queryKey: ['cefalometria_estudios', pacienteId],
    queryFn: () => getEstudiosPorPaciente(pacienteId || ''),
    enabled: Boolean(pacienteId),
    retry: (n, error) => !(error instanceof CefalometriaNoInstaladaError) && n < 2,
  });
}

export function useGuardarEstudioCefalometria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardarEstudioCefalometrico,
    retry: 0,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cefalometria_estudios', data.paciente_id] });
    },
  });
}

export function useEliminarEstudioCefalometria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarEstudioCefalometrico,
    retry: 0,
    onSuccess: (_, estudio) => {
      queryClient.invalidateQueries({ queryKey: ['cefalometria_estudios', estudio.paciente_id] });
    },
  });
}
