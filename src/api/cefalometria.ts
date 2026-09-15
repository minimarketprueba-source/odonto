import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EstudioCefalometrico } from '@/types/cefalometria';
import { esTablaInexistente } from '@/lib/esquema';

const LOCAL_STORAGE_KEY = 'odonto_cefalometria_estudios';

function getLocalEstudios(): EstudioCefalometrico[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEstudios(estudios: EstudioCefalometrico[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(estudios));
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }
}

// 1. Obtener estudios de un paciente
export async function getEstudiosPorPaciente(pacienteId: string): Promise<EstudioCefalometrico[]> {
  if (!pacienteId) return [];

  try {
    const { data, error } = await supabase
      .from('cefalometria_estudios')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false });

    if (error) {
      if (esTablaInexistente(error)) {
        // Fallback a localStorage
        const local = getLocalEstudios();
        return local.filter((e) => e.paciente_id === pacienteId);
      }
      throw error;
    }

    return (data as EstudioCefalometrico[]) || [];
  } catch {
    const local = getLocalEstudios();
    return local.filter((e) => e.paciente_id === pacienteId);
  }
}

// 2. Obtener un estudio por ID
export async function getEstudioPorId(estudioId: string): Promise<EstudioCefalometrico | null> {
  if (!estudioId) return null;

  try {
    const { data, error } = await supabase
      .from('cefalometria_estudios')
      .select('*')
      .eq('id', estudioId)
      .single();

    if (error) {
      if (esTablaInexistente(error)) {
        const local = getLocalEstudios();
        return local.find((e) => e.id === estudioId) || null;
      }
      throw error;
    }

    return data as EstudioCefalometrico;
  } catch {
    const local = getLocalEstudios();
    return local.find((e) => e.id === estudioId) || null;
  }
}

// 3. Guardar o Actualizar estudio
export async function guardarEstudioCefalometrico(
  estudio: Partial<EstudioCefalometrico> & { paciente_id: string; imagen_url: string }
): Promise<EstudioCefalometrico> {
  const estudioCompleto: EstudioCefalometrico = {
    id: estudio.id || crypto.randomUUID(),
    paciente_id: estudio.paciente_id,
    fecha: estudio.fecha || new Date().toISOString().split('T')[0],
    titulo: estudio.titulo || 'Teleradiografía Lateral',
    tipo: estudio.tipo || 'teleradiografia_lateral',
    imagen_url: estudio.imagen_url,
    puntos: estudio.puntos || {},
    calibracion: estudio.calibracion || { distanciaRealMm: 10 },
    mediciones: estudio.mediciones || [],
    progreso: estudio.progreso || 'digitalizacion',
    notas: estudio.notas || '',
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('cefalometria_estudios')
      .upsert(estudioCompleto)
      .select()
      .single();

    if (error) {
      if (esTablaInexistente(error)) {
        const local = getLocalEstudios();
        const index = local.findIndex((e) => e.id === estudioCompleto.id);
        if (index >= 0) {
          local[index] = estudioCompleto;
        } else {
          local.unshift(estudioCompleto);
        }
        saveLocalEstudios(local);
        return estudioCompleto;
      }
      throw error;
    }

    return data as EstudioCefalometrico;
  } catch {
    const local = getLocalEstudios();
    const index = local.findIndex((e) => e.id === estudioCompleto.id);
    if (index >= 0) {
      local[index] = estudioCompleto;
    } else {
      local.unshift(estudioCompleto);
    }
    saveLocalEstudios(local);
    return estudioCompleto;
  }
}

// 4. Eliminar estudio
export async function eliminarEstudioCefalometrico(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('cefalometria_estudios').delete().eq('id', id);
    if (error && !esTablaInexistente(error)) {
      throw error;
    }
  } finally {
    const local = getLocalEstudios();
    saveLocalEstudios(local.filter((e) => e.id !== id));
  }
}

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export function useEstudiosCefalometria(pacienteId?: string) {
  return useQuery({
    queryKey: ['cefalometria_estudios', pacienteId],
    queryFn: () => getEstudiosPorPaciente(pacienteId || ''),
    enabled: Boolean(pacienteId),
  });
}

export function useEstudioCefalometria(estudioId?: string) {
  return useQuery({
    queryKey: ['cefalometria_estudio', estudioId],
    queryFn: () => getEstudioPorId(estudioId || ''),
    enabled: Boolean(estudioId),
  });
}

export function useGuardarEstudioCefalometria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardarEstudioCefalometrico,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cefalometria_estudios', data.paciente_id] });
      queryClient.invalidateQueries({ queryKey: ['cefalometria_estudio', data.id] });
    },
  });
}

export function useEliminarEstudioCefalometria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; pacienteId: string }) => eliminarEstudioCefalometrico(args.id),
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ['cefalometria_estudios', args.pacienteId] });
    },
  });
}
