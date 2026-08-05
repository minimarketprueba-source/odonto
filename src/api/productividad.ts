// ============================================================================
// Capa de datos: producción clínica de la clínica odontológica
// ============================================================================
// De dónde sale la producción: de `evoluciones_clinicas`, que es donde queda
// asentado cada procedimiento hecho sobre una pieza (la historia clínica
// dental). Se complementa con `presupuestos` y `pagos_presupuesto` para la
// parte de dinero.
//
// OJO: hasta el 2026-08-04 esto consultaba `consultas` y `atenciones_enfermeria`,
// tablas del sistema médico del que salió esta app y que en esta base NO
// existen. La pantalla de Reportes daba 404 y salía vacía siempre, por más
// tratamientos que se cargaran.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { avisarEsquemaFaltante } from "@/lib/esquema";

export interface AtencionProductividad {
  index: number;
  id: number | string;
  fecha: string; // YYYY-MM-DD
  hora: string | null; // HH:mm
  pacienteNombre: string;
  /** Documento del paciente; en el impreso ocupa la columna identificatoria. */
  pacienteJerarquia: string;
  pacienteSexo: "M" | "F" | string;
  /** Pieza dental tratada (notación FDI). Vacío si la nota no es de una pieza. */
  pieza: string;
  /** Procedimiento realizado: es la producción propiamente dicha. */
  procedimiento: string;
  /** Nota clínica del profesional. */
  nota: string;
  especialidadId?: string | null;
  especialidadNombre: string;
  medicoId?: string | null;
  medicoNombre: string;
  medicoColegiatura?: string | null;
}

export interface ResumenFacturacion {
  /** Cobrado en el período (pagos recibidos). */
  cobrado: number;
  /** Suma de los presupuestos creados en el período. */
  presupuestado: number;
  /** Saldo pendiente de los presupuestos aprobados. */
  pendiente: number;
  /** Cantidad de planes de tratamiento creados en el período. */
  planes: number;
}

export interface ProduccionDental {
  atenciones: AtencionProductividad[];
  facturacion: ResumenFacturacion;
  /** Citas del período agrupadas por estado. */
  citasPorEstado: Record<string, number>;
}

export interface FiltrosProductividad {
  fechaDesde: string;
  fechaHasta: string;
  /** "todas" o el id (UUID) de una especialidad. */
  especialidadId?: string;
  /** "todos", "mi_usuario" o el id (UUID) de un odontólogo. */
  medicoId?: string;
  usuarioActualId?: string;
  usuarioActualEmail?: string;
  usuarioActualNombre?: string;
  rolUsuario?: string;
}

export function formatSexo(sexo?: string | null): string {
  if (!sexo) return "—";
  const s = sexo.toUpperCase();
  if (s === "M") return "M";
  if (s === "F") return "F";
  return s;
}

/** Identificación del paciente en la planilla: su documento, o el tipo si no tiene. */
export function formatJerarquia(tipo?: string | null, grado?: string | null): string {
  const partes = [grado, tipo].filter((x) => x && String(x).trim().length > 0);
  return partes.length ? partes.join(" ") : "—";
}

/** Hora legible (HH:mm) a partir de un timestamp. */
function horaDe(valor?: string | null): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function soloFecha(valor?: string | null): string {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

export async function fetchProduccionDental(
  filtros: FiltrosProductividad
): Promise<ProduccionDental> {
  const { fechaDesde, fechaHasta, especialidadId, medicoId } = filtros;

  // El día "hasta" se incluye entero: las marcas de tiempo de ese día llegan
  // hasta las 23:59, así que se compara contra el día siguiente.
  const hastaExclusivo = new Date(`${fechaHasta}T00:00:00`);
  hastaExclusivo.setDate(hastaExclusivo.getDate() + 1);
  const hastaISO = hastaExclusivo.toISOString().slice(0, 10);

  // --- 1. Producción clínica: los procedimientos asentados ---
  let consultaEvoluciones = supabase
    .from("evoluciones_clinicas")
    .select(`
      id,
      fecha_registro,
      pieza,
      procedimiento,
      nota_clinica,
      medico:medicos(
        id, nombres, apellidos, numero_colegiatura, especialidad_id,
        especialidad:especialidades(id, nombre)
      ),
      paciente:pacientes(id, nombres, apellidos, documento, tipo, grado, sexo)
    `)
    .gte("fecha_registro", fechaDesde)
    .lt("fecha_registro", hastaISO)
    .order("fecha_registro", { ascending: true })
    .limit(5000);

  if (medicoId && medicoId !== "todos" && medicoId !== "mi_usuario") {
    consultaEvoluciones = consultaEvoluciones.eq("medico_id", medicoId);
  }

  const { data: datosEvoluciones, error: errorEvoluciones } = await consultaEvoluciones;
  if (errorEvoluciones && !avisarEsquemaFaltante(errorEvoluciones, "Reportes · evoluciones clínicas")) {
    console.error("Error al cargar la producción clínica:", errorEvoluciones);
  }

  const atenciones: AtencionProductividad[] = [];
  for (const e of (datosEvoluciones ?? []) as any[]) {
    const medico = e.medico;
    const especialidad = medico?.especialidad;

    // El filtro por especialidad se aplica acá porque cuelga del odontólogo,
    // no de la evolución: PostgREST no puede filtrar por una tabla anidada
    // dos niveles sin descartar filas sin médico asignado.
    if (especialidadId && especialidadId !== "todas" && especialidad?.id !== especialidadId) {
      continue;
    }

    const paciente = e.paciente;
    atenciones.push({
      index: atenciones.length + 1,
      id: e.id,
      fecha: soloFecha(e.fecha_registro),
      hora: horaDe(e.fecha_registro),
      pacienteNombre: paciente
        ? `${paciente.apellidos ?? ""}, ${paciente.nombres ?? ""}`.replace(/^, |, $/, "")
        : "—",
      pacienteJerarquia: paciente?.documento || formatJerarquia(paciente?.tipo, paciente?.grado),
      pacienteSexo: formatSexo(paciente?.sexo),
      pieza: e.pieza ? String(e.pieza) : "",
      procedimiento: e.procedimiento || "—",
      nota: e.nota_clinica || "",
      especialidadId: especialidad?.id ?? null,
      especialidadNombre: especialidad?.nombre || "Odontología General",
      medicoId: medico?.id ?? null,
      medicoNombre: medico ? `${medico.apellidos ?? ""}, ${medico.nombres ?? ""}` : "—",
      medicoColegiatura: medico?.numero_colegiatura ?? null,
    });
  }

  // --- 2. Dinero: lo cobrado y lo que queda por cobrar ---
  const facturacion: ResumenFacturacion = { cobrado: 0, presupuestado: 0, pendiente: 0, planes: 0 };

  const { data: pagos, error: errorPagos } = await supabase
    .from("pagos_presupuesto")
    .select("monto, fecha")
    .gte("fecha", fechaDesde)
    .lt("fecha", hastaISO)
    .limit(5000);
  if (errorPagos && !avisarEsquemaFaltante(errorPagos, "Reportes · pagos")) {
    console.error("Error al cargar los pagos:", errorPagos);
  }
  for (const p of (pagos ?? []) as any[]) facturacion.cobrado += Number(p.monto) || 0;

  const { data: presupuestos, error: errorPresupuestos } = await supabase
    .from("presupuestos")
    .select("total, saldo_pendiente, estado, created_at")
    .gte("created_at", fechaDesde)
    .lt("created_at", hastaISO)
    .limit(5000);
  if (errorPresupuestos && !avisarEsquemaFaltante(errorPresupuestos, "Reportes · presupuestos")) {
    console.error("Error al cargar los presupuestos:", errorPresupuestos);
  }
  for (const p of (presupuestos ?? []) as any[]) {
    facturacion.planes += 1;
    facturacion.presupuestado += Number(p.total) || 0;
    // Un plan rechazado o anulado no es plata por cobrar.
    const estado = String(p.estado ?? "").toLowerCase();
    if (estado !== "rechazado" && estado !== "anulado") {
      facturacion.pendiente += Number(p.saldo_pendiente) || 0;
    }
  }

  // --- 3. Citas del período, por estado ---
  let consultaCitas = supabase
    .from("citas")
    .select("estado, medico_id")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta)
    .limit(5000);
  if (medicoId && medicoId !== "todos" && medicoId !== "mi_usuario") {
    consultaCitas = consultaCitas.eq("medico_id", medicoId);
  }
  const { data: citas, error: errorCitas } = await consultaCitas;
  if (errorCitas && !avisarEsquemaFaltante(errorCitas, "Reportes · citas")) {
    console.error("Error al cargar las citas:", errorCitas);
  }

  const citasPorEstado: Record<string, number> = {};
  for (const c of (citas ?? []) as any[]) {
    const estado = c.estado || "sin estado";
    citasPorEstado[estado] = (citasPorEstado[estado] ?? 0) + 1;
  }

  return { atenciones, facturacion, citasPorEstado };
}

export function useProductividadReporte(filtros: FiltrosProductividad) {
  return useQuery({
    queryKey: [
      "produccion-dental",
      filtros.fechaDesde,
      filtros.fechaHasta,
      filtros.especialidadId ?? "todas",
      filtros.medicoId ?? "todos",
      filtros.usuarioActualId ?? "",
    ],
    queryFn: () => fetchProduccionDental(filtros),
    enabled: Boolean(filtros.fechaDesde && filtros.fechaHasta),
  });
}
