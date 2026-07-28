// ============================================================================
// Capa de datos: Nutrición y Ficha Antropométrica (ISEPOL)
// ============================================================================
// Conecta con las tablas `cadetes`, `pesadas` y `pacientes` en Supabase.
// Incorpora todos los campos oficiales de la Ficha Antropométrica de la Academia.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import { calcularIMC, calcularPorcentajeMuscular, clasificarIMC } from "@/lib/utils/imc-utils";

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
  
  // Última pesada registrada (Ficha Antropométrica completa).
  // Todo lo que no se midió viaja en null: no se rellena con valores supuestos.
  ultima_pesada?: {
    id?: string;
    fecha: string | null;          // ISO, tal como vino de la base
    peso_kg: number | null;
    imc: number | null;            // null si falta la talla real
    clasificacion: string | null;
    cintura_cm?: number | null;
    cadera_cm?: number | null;
    icc?: number | null;
    dx_icc?: string | null;
    porcentaje_mm?: number | null; // %MM, derivado de masa_muscular_kg / peso
    masa_muscular_kg?: number | null;
    porcentaje_mg?: number | null; // %MG (% Masa Grasa)
    dx_bia?: string | null;       // DX BIA (Grasa Visceral / Bioimpedancia)
    egs?: string | null;          // EGS (Evaluación Global Subjetiva A, B, C)
    circ_brazo_cm?: number | null;
    observaciones?: string | null;
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

// ---------------------------------------------------------------------------
// EGS y DX BIA: la tabla `pesadas` es de control de peso y no tiene columnas
// para ellos, así que viajan como etiquetas al final de `observaciones`. Estas
// dos funciones son el único lugar que conoce ese formato; si no hay etiqueta,
// el dato NO se inventa: queda en null.
// ---------------------------------------------------------------------------

const ETIQUETA_EGS = /\s*\|?\s*EGS:\s*([ABC])\b/i;
const ETIQUETA_DX_BIA = /\s*\|?\s*DX_BIA:\s*([^|]+)/i;

export function leerEtiquetasPesada(observaciones?: string | null): {
  egs: string | null;
  dxBia: string | null;
  observaciones: string | null;
} {
  const texto = observaciones ?? "";
  const egs = texto.match(ETIQUETA_EGS)?.[1]?.toUpperCase() ?? null;
  const dxBia = texto.match(ETIQUETA_DX_BIA)?.[1]?.trim() || null;
  const limpio = texto
    .replace(ETIQUETA_EGS, "")
    .replace(ETIQUETA_DX_BIA, "")
    .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
    .trim();
  return { egs, dxBia, observaciones: limpio || null };
}

export function escribirEtiquetasPesada(
  observaciones?: string | null,
  egs?: string | null,
  dxBia?: string | null
): string | null {
  const partes = [observaciones?.trim() || null];
  if (egs) partes.push(`EGS: ${egs}`);
  if (dxBia) partes.push(`DX_BIA: ${dxBia}`);
  const texto = partes.filter(Boolean).join(" | ");
  return texto || null;
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
 * Mapea un objeto pesada crudo de Supabase a la estructura ultima_pesada.
 *
 * Todo lo que no está medido queda en `null`: sin talla no hay IMC, sin
 * etiqueta no hay EGS ni DX BIA. Antes se rellenaban con "A", "Normal" o una
 * talla de 170 cm y en pantalla no había forma de distinguir lo medido de lo
 * inventado.
 */
function construirObjetoPesada(pesada: any, alturaCm: number | null, sexo: "M" | "F") {
  if (!pesada) return null;

  const peso = typeof pesada.peso_kg === "number" ? pesada.peso_kg : null;
  const imc =
    pesada.imc ?? (peso && alturaCm ? calcularIMC(peso, alturaCm) : null);
  const cintura = pesada.cintura_cm ?? null;
  const cadera = pesada.cadera_cm ?? null;
  let icc: number | null = null;
  let dx_icc: string | null = null;

  if (cintura && cadera && cadera > 0) {
    icc = Number((cintura / cadera).toFixed(2));
    dx_icc = calcularDxICC(icc, sexo).label;
  }

  const etiquetas = leerEtiquetasPesada(pesada.observaciones);

  return {
    id: pesada.id,
    // Fecha en ISO: la pantalla decide cómo mostrarla. Sin fecha va null, no hoy.
    fecha: pesada.fecha ?? null,
    peso_kg: peso,
    imc,
    clasificacion: imc ? clasificarIMC(imc).label : null,
    cintura_cm: cintura,
    cadera_cm: cadera,
    icc,
    dx_icc,
    // `masa_muscular_kg` son KILOS (así lo guarda y lo lee control de peso).
    // El %MM se deriva contra el peso de esa misma pesada.
    porcentaje_mm:
      pesada.masa_muscular_kg && peso
        ? calcularPorcentajeMuscular(pesada.masa_muscular_kg, peso)
        : null,
    masa_muscular_kg: pesada.masa_muscular_kg ?? null,
    porcentaje_mg: pesada.porcentaje_grasa ?? null,
    dx_bia: etiquetas.dxBia,
    egs: etiquetas.egs,
    circ_brazo_cm: pesada.circ_brazo_cm ?? null,
    observaciones: etiquetas.observaciones,
  };
}

/**
 * Obtiene la lista de cadetes con su última pesada registrada.
 */
export async function fetchCadetesNutricion(): Promise<CadeteNutricion[]> {
  // 1. Cadetes con SU ÚLTIMA pesada. El orden y el límite van sobre la tabla
  //    embebida, así que la base manda una sola pesada por cadete en vez de
  //    todo el historial de todos (antes se descargaba entero y se ordenaba en
  //    memoria).
  const { data: cadetesRel, error: errCadetes } = await supabase
    .from("cadetes")
    .select("*, pesadas(*)")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true })
    .order("fecha", { referencedTable: "pesadas", ascending: false })
    .limit(1, { referencedTable: "pesadas" });

  if (!errCadetes && cadetesRel && cadetesRel.length > 0) {
    return cadetesRel.map((c) => mapearCadete(c, Array.isArray(c.pesadas) ? c.pesadas[0] : null));
  }

  // 2. Si la consulta relacional falla, se arma a mano. Solo se cruza por
  //    `cadete_id`, que es la relación real: cruzar además por dni o user_id
  //    podía colgarle a un cadete la pesada de otro.
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

  const ultimaPorCadete = new Map<string, any>();
  const ultimaPorDni = new Map<string, any>();
  for (const p of pesadas || []) {
    if (p.cadete_id && !ultimaPorCadete.has(String(p.cadete_id))) {
      ultimaPorCadete.set(String(p.cadete_id), p);
    }
    if (p.dni && !ultimaPorDni.has(String(p.dni))) {
      ultimaPorDni.set(String(p.dni), p);
    }
  }

  if (cadetes && cadetes.length > 0) {
    return cadetes.map((c) => mapearCadete(c, ultimaPorCadete.get(String(c.id)) ?? null));
  }

  // 3. Fallback a la tabla `pacientes` si `cadetes` es inaccesible o está vacía.
  const { data: pacientes, error: errPacientes } = await supabase
    .from("pacientes")
    .select("*")
    .eq("tipo", "cadete")
    .order("apellidos", { ascending: true });

  if (errPacientes) throw new Error(`No se pudieron cargar los datos de nutrición: ${errPacientes.message}`);

  return (pacientes || []).map((p) => {
    const dni = p.documento || "";
    const pesada = dni ? ultimaPorDni.get(dni) ?? null : null;
    const sexo = (p.sexo as "M" | "F") || "M";

    return {
      id: String(p.id),
      paciente_id: p.id,
      nombre: p.nombres,
      apellido: p.apellidos,
      dni: dni || `P${p.id}`,
      sexo,
      // La ficha de paciente no guarda la talla: sin ella no hay IMC.
      altura_cm: null,
      curso: p.grado ?? null,
      seccion: p.unidad ?? null,
      activo: p.activo,
      ultima_pesada: construirObjetoPesada(pesada, null, sexo),
    };
  });
}

/** Fila de `cadetes` + su última pesada → ficha de nutrición. */
function mapearCadete(c: any, pesada: any): CadeteNutricion {
  // Sin talla registrada no se supone ninguna: el IMC queda sin calcular.
  const altura = typeof c.altura_cm === "number" ? c.altura_cm : null;
  const sexo = (c.sexo as "M" | "F") || "M";

  return {
    id: String(c.id),
    nombre: c.nombre,
    apellido: c.apellido,
    dni: c.dni,
    sexo,
    altura_cm: altura,
    foto_url: c.foto_url ?? null,
    curso: c.curso ?? null,
    seccion: c.seccion ?? null,
    peloton: c.peloton ?? null,
    compania: c.compania ?? c.seccion ?? null,
    rango: c.rango ?? null,
    activo: c.activo ?? true,
    ultima_pesada: construirObjetoPesada(pesada, altura, sexo),
  };
}

/**
 * Registra una pesada/control antropométrico para un cadete.
 */
export async function registrarPesada(input: CrearPesadaInput): Promise<void> {
  if (!(input.peso_kg > 0) || input.peso_kg > 400) {
    throw new Error("El peso tiene que estar entre 1 y 400 kg.");
  }
  if (input.altura_cm != null && (input.altura_cm < 100 || input.altura_cm > 250)) {
    throw new Error("La talla tiene que estar entre 100 y 250 cm.");
  }
  if (input.porcentaje_mm != null && (input.porcentaje_mm <= 0 || input.porcentaje_mm >= 100)) {
    throw new Error("El %MM tiene que ser un porcentaje entre 0 y 100.");
  }
  if (input.porcentaje_mg != null && (input.porcentaje_mg <= 0 || input.porcentaje_mg >= 100)) {
    throw new Error("El %MG tiene que ser un porcentaje entre 0 y 100.");
  }

  // El IMC solo se calcula con talla real; sin ella la pesada se guarda igual
  // pero sin IMC, que es preferible a un número sacado de una talla supuesta.
  const imc = input.altura_cm ? calcularIMC(input.peso_kg, input.altura_cm) : null;
  const fechaHoy = new Date().toISOString();

  if (input.altura_cm) {
    const { error: errAltura } = await supabase
      .from("cadetes")
      .update({ altura_cm: input.altura_cm })
      .eq("id", input.cadete_id);
    // Si no se puede guardar la talla, el IMC de las próximas pesadas saldría
    // mal en silencio: mejor cortar acá.
    if (errAltura) throw new Error(`No se pudo guardar la talla: ${errAltura.message}`);
  }

  const { error } = await supabase.from("pesadas").insert({
    cadete_id: input.cadete_id,
    peso_kg: input.peso_kg,
    cintura_cm: input.cintura_cm ?? null,
    cadera_cm: input.cadera_cm ?? null,
    circ_brazo_cm: input.circ_brazo_cm ?? null,
    porcentaje_grasa: input.porcentaje_mg ?? null,
    // La columna es KILOS y así la lee control de peso. La nutricionista carga
    // el %MM de la balanza, así que se convierte contra el peso de hoy.
    masa_muscular_kg: input.porcentaje_mm
      ? Number(((input.peso_kg * input.porcentaje_mm) / 100).toFixed(2))
      : null,
    imc,
    observaciones: escribirEtiquetasPesada(input.observaciones, input.egs, input.dx_bia),
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
