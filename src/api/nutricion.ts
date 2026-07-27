// ============================================================================
// Capa de datos: Nutrición y Ficha Antropométrica (ISEPOL)
// ============================================================================
// Conecta con las tablas `cadetes`, `pesadas` y `pacientes` en Supabase.
// Incorpora todos los campos oficiales de la Ficha Antropométrica de la Academia.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { calcularIMC, clasificarIMC } from "@/lib/utils/imc-utils";

export interface CadeteNutricion {
  id: string;
  paciente_id?: number | null;
  nombre: string;
  apellido: string;
  dni: string;
  sexo: "M" | "F";
  edad?: number | null;
  altura_cm: number | null;
  foto_url?: string | null;
  curso?: string | null;
  seccion?: string | null;
  peloton?: string | null;
  compania?: string | null;
  rango?: string | null;
  activo: boolean;
  
  // Última pesada registrada (Ficha Antropométrica completa)
  ultima_pesada?: {
    id?: string;
    fecha: string;
    peso_kg: number;
    imc: number;
    clasificacion: string;
    cintura_cm?: number | null;
    cadera_cm?: number | null;
    icc?: number | null;
    dx_icc?: string | null;
    porcentaje_mm?: number | null; // %MM (% Masa Muscular)
    porcentaje_mg?: number | null; // %MG (% Masa Grasa)
    dx_bia?: string | null;       // DX BIA (Grasa Visceral / Bioimpedancia)
    egs?: string | null;          // EGS (Evaluación Global Subjetiva A, B, C)
    circ_brazo_cm?: number | null;
    observaciones?: string | null;
  } | null;

  // Situación médica
  situacion_medica?: {
    estado: "APTO" | "REPOSO" | "OBSERVACION";
    descripcion?: string;
    fecha?: string;
  } | null;
}

export interface CrearPesadaInput {
  cadete_id: string;
  peso_kg: number;
  altura_cm?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  porcentaje_mm?: number; // %MM
  porcentaje_mg?: number; // %MG
  dx_bia?: string;       // DX BIA / Grasa Visceral
  egs?: string;          // EGS
  circ_brazo_cm?: number;
  observaciones?: string;
}

/**
 * Calcula el DX ICC (Diagnóstico de Índice Cintura-Cadera)
 */
export function calcularDxICC(icc: number, sexo: "M" | "F"): { label: string; riesgo: "bajo" | "medio" | "alto" } {
  if (sexo === "M") {
    if (icc < 0.90) return { label: "Normal", riesgo: "bajo" };
    if (icc < 1.00) return { label: "Riesgo Moderado", riesgo: "medio" };
    return { label: "Riesgo Alto", riesgo: "alto" };
  } else {
    if (icc < 0.80) return { label: "Normal", riesgo: "bajo" };
    if (icc < 0.85) return { label: "Riesgo Moderado", riesgo: "medio" };
    return { label: "Riesgo Alto", riesgo: "alto" };
  }
}

/**
 * Mapea un objeto pesada crudo de Supabase a la estructura ultima_pesada
 */
function construirObjetoPesada(pesada: any, alturaCm: number, sexo: "M" | "F") {
  if (!pesada) return null;
  const imcCalculado = pesada.imc || (pesada.peso_kg ? calcularIMC(pesada.peso_kg, alturaCm) : 0);
  const cintura = pesada.cintura_cm;
  const cadera = pesada.cadera_cm;
  let icc = null;
  let dx_icc = null;

  if (cintura && cadera && cadera > 0) {
    icc = Number((cintura / cadera).toFixed(2));
    dx_icc = calcularDxICC(icc, sexo).label;
  }

  return {
    id: pesada.id,
    fecha: pesada.fecha ? new Date(pesada.fecha).toLocaleDateString("es-PY") : new Date().toLocaleDateString("es-PY"),
    peso_kg: pesada.peso_kg,
    imc: imcCalculado,
    clasificacion: clasificarIMC(imcCalculado).label,
    cintura_cm: cintura || null,
    cadera_cm: cadera || null,
    icc: icc,
    dx_icc: dx_icc,
    porcentaje_mm: pesada.masa_muscular_kg || pesada.porcentaje_mm || null,
    porcentaje_mg: pesada.porcentaje_grasa || pesada.porcentaje_mg || null,
    dx_bia: pesada.dx_bia || (pesada.cintura_cm ? (pesada.cintura_cm > 90 ? "Grasa Visceral Elevada" : "Grasa Visceral Normal") : null),
    egs: pesada.observaciones?.includes("EGS") ? pesada.observaciones.match(/EGS:?\s*([A-C])/i)?.[1] || "A" : "A",
    circ_brazo_cm: pesada.circ_brazo_cm,
    observaciones: pesada.observaciones,
  };
}

/**
 * Obtiene la lista de cadetes con su última pesada registrada.
 */
export async function fetchCadetesNutricion(): Promise<CadeteNutricion[]> {
  // 1. Intentar obtener cadetes relacionales junto con sus pesadas asociadas
  const { data: cadetesRel, error: errCadetes } = await supabase
    .from("cadetes")
    .select("*, pesadas(*)")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });

  if (!errCadetes && cadetesRel && cadetesRel.length > 0) {
    return cadetesRel.map((c) => {
      // Ordenar pesadas de este cadete por fecha descendente
      const listaPesadas: any[] = Array.isArray(c.pesadas) ? [...c.pesadas] : [];
      listaPesadas.sort((a, b) => {
        const fA = new Date(a.fecha || a.created_at || 0).getTime();
        const fB = new Date(b.fecha || b.created_at || 0).getTime();
        return fB - fA;
      });

      const pesada = listaPesadas[0] || null;
      const altura = c.altura_cm || (pesada?.altura_cm) || 170;
      const sexo = (c.sexo as "M" | "F") || "M";

      return {
        id: String(c.id),
        nombre: c.nombre,
        apellido: c.apellido,
        dni: c.dni,
        sexo: sexo,
        altura_cm: c.altura_cm || null,
        foto_url: c.foto_url,
        curso: c.curso || "1er Año",
        seccion: c.seccion || "Primera",
        peloton: c.peloton || "Primer Pelotón",
        compania: c.compania || c.seccion || "Primera",
        rango: c.rango || "Cadete",
        activo: c.activo ?? true,
        ultima_pesada: construirObjetoPesada(pesada, altura, sexo),
        situacion_medica: {
          estado: "APTO",
          descripcion: "Puede realizar actividad física según capacidades",
        },
      };
    });
  }

  // 2. Si la consulta relacional no devuelve pesadas o falla, intentar consulta manual
  const { data: cadetes } = await supabase
    .from("cadetes")
    .select("*")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });

  const { data: pesadas } = await supabase
    .from("pesadas")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(5000);

  const ultimasPesadasMap = new Map<string, any>();
  if (pesadas && pesadas.length > 0) {
    for (const p of pesadas) {
      if (p.cadete_id && !ultimasPesadasMap.has(String(p.cadete_id))) {
        ultimasPesadasMap.set(String(p.cadete_id), p);
      }
      if (p.user_id && !ultimasPesadasMap.has(String(p.user_id))) {
        ultimasPesadasMap.set(String(p.user_id), p);
      }
      if (p.dni && !ultimasPesadasMap.has(String(p.dni))) {
        ultimasPesadasMap.set(String(p.dni), p);
      }
    }
  }

  if (cadetes && cadetes.length > 0) {
    return cadetes.map((c) => {
      const pesada = ultimasPesadasMap.get(String(c.id)) ||
        (c.dni ? ultimasPesadasMap.get(String(c.dni)) : null) ||
        (c.user_id ? ultimasPesadasMap.get(String(c.user_id)) : null);
      
      const altura = c.altura_cm || (pesada?.altura_cm) || 170;
      const sexo = (c.sexo as "M" | "F") || "M";

      return {
        id: String(c.id),
        nombre: c.nombre,
        apellido: c.apellido,
        dni: c.dni,
        sexo: sexo,
        altura_cm: c.altura_cm || null,
        foto_url: c.foto_url,
        curso: c.curso || "1er Año",
        seccion: c.seccion || "Primera",
        peloton: c.peloton || "Primer Pelotón",
        compania: c.compania || c.seccion || "Primera",
        rango: c.rango || "Cadete",
        activo: c.activo ?? true,
        ultima_pesada: construirObjetoPesada(pesada, altura, sexo),
        situacion_medica: {
          estado: "APTO",
          descripcion: "Puede realizar actividad física según capacidades",
        },
      };
    });
  }

  // 3. Fallback a la tabla `pacientes` si `cadetes` es inaccesible o está vacía
  const { data: pacientes, error: errPacientes } = await supabase
    .from("pacientes")
    .select("*")
    .eq("tipo", "cadete")
    .order("apellidos", { ascending: true });

  if (errPacientes) throw new Error(`No se pudieron cargar los datos de nutrición: ${errPacientes.message}`);

  return (pacientes || []).map((p) => {
    const dni = p.documento || "";
    const pesada = (dni ? ultimasPesadasMap.get(dni) : null) || ultimasPesadasMap.get(String(p.id));
    const altura = 170;
    const sexo = (p.sexo as "M" | "F") || "M";

    return {
      id: String(p.id),
      paciente_id: p.id,
      nombre: p.nombres,
      apellido: p.apellidos,
      dni: dni || `P${p.id}`,
      sexo: sexo,
      altura_cm: altura,
      curso: p.grado || "Cadete",
      seccion: p.unidad || "Sin sección",
      activo: p.activo,
      ultima_pesada: construirObjetoPesada(pesada, altura, sexo),
      situacion_medica: { estado: "APTO" },
    };
  });
}

/**
 * Registra una pesada/control antropométrico para un cadete.
 */
export async function registrarPesada(input: CrearPesadaInput): Promise<void> {
  const altura = input.altura_cm || 170;
  const imc = calcularIMC(input.peso_kg, altura);
  const fechaHoy = new Date().toISOString();

  if (input.altura_cm) {
    await supabase
      .from("cadetes")
      .update({ altura_cm: input.altura_cm })
      .eq("id", input.cadete_id);
  }

  const { error } = await supabase.from("pesadas").insert({
    cadete_id: input.cadete_id,
    peso_kg: input.peso_kg,
    cintura_cm: input.cintura_cm || null,
    cadera_cm: input.cadera_cm || null,
    circ_brazo_cm: input.circ_brazo_cm || null,
    porcentaje_grasa: input.porcentaje_mg || null,
    masa_muscular_kg: input.porcentaje_mm || null,
    imc: imc,
    observaciones: input.observaciones ? `${input.observaciones} | EGS: ${input.egs || "A"} | DX_BIA: ${input.dx_bia || "Normal"}` : `EGS: ${input.egs || "A"} | DX_BIA: ${input.dx_bia || "Normal"}`,
    fecha: fechaHoy,
  });

  if (error) {
    throw new Error(`Error al registrar la pesada: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

export function useCadetesNutricion() {
  return useQuery({
    queryKey: queryKeys.peso.ultimasPesadas(),
    queryFn: fetchCadetesNutricion,
  });
}

export function useCrearPesada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarPesada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.peso.all });
    },
  });
}
