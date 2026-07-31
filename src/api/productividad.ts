// ============================================================================
// Capa de datos: Planilla de Productividad (Informe Diario, Semanal y Mensual)
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AtencionProductividad {
  index: number;
  id: number | string;
  fecha: string; // YYYY-MM-DD
  hora: string | null; // HH:mm
  pacienteNombre: string;
  pacienteJerarquia: string; // Jerarquía / Tipo y Grado
  pacienteSexo: "M" | "F" | string;
  diagnostico: string;
  tratamiento: string;
  especialidadId?: number | null;
  especialidadNombre: string;
  medicoId?: number | null;
  medicoNombre: string;
  medicoColegiatura?: string | null;
  origen: "consulta" | "enfermeria";
}

export interface FiltrosProductividad {
  fechaDesde: string;
  fechaHasta: string;
  especialidadId?: string; // "todas" | "enfermeria" | id numérico en string
  medicoId?: string;       // "todos" | "mi_usuario" | id numérico en string
  usuarioActualId?: string | null;
  usuarioActualEmail?: string | null;
  usuarioActualNombre?: string | null;
  rolUsuario?: string | null;
}

export function formatSexo(sexo?: string | null): string {
  if (!sexo) return "M";
  const s = sexo.trim().toUpperCase();
  if (s.startsWith("F") || s.includes("FEM")) return "F";
  return "M";
}

export function formatJerarquia(tipo?: string | null, grado?: string | null): string {
  const t = tipo?.trim() || "";
  const g = grado?.trim() || "";
  if (g && t) {
    if (g.toLowerCase().includes(t.toLowerCase())) return g;
    return `${t} — ${g}`;
  }
  return g || t || "Paciente";
}

export async function fetchProductividad(
  filtros: FiltrosProductividad
): Promise<AtencionProductividad[]> {
  const {
    fechaDesde,
    fechaHasta,
    especialidadId,
    medicoId = "mi_usuario",
    usuarioActualId,
    usuarioActualEmail,
    usuarioActualNombre,
    rolUsuario,
  } = filtros;

  const esGinecologoOAdmin =
    rolUsuario &&
    ["admin", "superadmin", "super_admin", "ginecologo"].includes(rolUsuario.toLowerCase());

  // 1. Obtener consultas médicas
  let queryConsultas = supabase
    .from("consultas")
    .select(`
      id,
      fecha,
      motivo_consulta,
      diagnostico,
      tratamiento,
      destino,
      anulada_at,
      created_at,
      cita:citas(id, hora),
      cie10:cie10(codigo, descripcion),
      medico:medicos(
        id,
        nombres,
        apellidos,
        numero_colegiatura,
        especialidad_id,
        user_id,
        email,
        especialidad:especialidades(id, nombre)
      ),
      paciente:pacientes(
        id,
        nombres,
        apellidos,
        documento,
        tipo,
        grado,
        sexo
      )
    `)
    .is("anulada_at", null)
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta)
    .order("fecha", { ascending: true })
    .order("id", { ascending: true });

  if (medicoId && medicoId !== "todos" && medicoId !== "mi_usuario") {
    queryConsultas = queryConsultas.eq("medico_id", parseInt(medicoId, 10));
  }

  const { data: dataConsultas, error: errorConsultas } = await queryConsultas;
  if (errorConsultas) {
    console.error("Error fetching consultas for productividad:", errorConsultas);
  }

  const lista: AtencionProductividad[] = [];

  if (dataConsultas) {
    for (const c of dataConsultas as any[]) {
      const espNombre = c.medico?.especialidad?.nombre || "Consulta General";
      const espId = c.medico?.especialidad?.id;

      // Filtrar por especialidad en memoria si se especificó
      if (especialidadId && especialidadId !== "todas" && espId !== parseInt(especialidadId, 10)) {
        continue;
      }

      // Filtrar por "mi_usuario" si corresponde
      if (medicoId === "mi_usuario") {
        const esSuMedico =
          (usuarioActualId && c.medico?.user_id === usuarioActualId) ||
          (usuarioActualEmail && c.medico?.email?.toLowerCase() === usuarioActualEmail.toLowerCase());

        const medNom = c.medico ? `${c.medico.nombres} ${c.medico.apellidos}`.toLowerCase() : "";
        const coincidaNombre = usuarioActualNombre && medNom.includes(usuarioActualNombre.toLowerCase());

        if (!esSuMedico && !coincidaNombre && usuarioActualId) {
          // Si el usuario no es ese médico específico, no incluir esta consulta
          continue;
        }
      }

      // Regla de Confidencialidad Gineco-Obstétrica
      const esGinecologia = espNombre.toLowerCase().includes("ginecolog") || espNombre.toLowerCase().includes("obstetr");
      let diagTexto = "";
      if (esGinecologia && !esGinecologoOAdmin) {
        diagTexto = "🔒 Diagnóstico e información médica reservada (Ginecología y Obstetricia)";
      } else {
        const parteDetalle = c.diagnostico?.trim();
        const parteCie = c.cie10 ? `[${c.cie10.codigo} - ${c.cie10.descripcion}]` : "";
        diagTexto = [parteDetalle, parteCie].filter(Boolean).join(" ") || c.motivo_consulta || "Consulta Médica";
      }

      // Hora
      let horaStr = null;
      if (c.cita?.hora) {
        horaStr = c.cita.hora.slice(0, 5);
      } else if (c.created_at) {
        const d = new Date(c.created_at);
        if (!isNaN(d.getTime())) {
          horaStr = d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
        }
      }

      const pacienteNombre = c.paciente
        ? `${c.paciente.nombres || ""} ${c.paciente.apellidos || ""}`.trim()
        : "Paciente sin nombre";
      const medicoNombre = c.medico
        ? `${c.medico.nombres || ""} ${c.medico.apellidos || ""}`.trim()
        : "Profesional";

      lista.push({
        index: 0,
        id: c.id,
        fecha: c.fecha,
        hora: horaStr,
        pacienteNombre,
        pacienteJerarquia: formatJerarquia(c.paciente?.tipo, c.paciente?.grado),
        pacienteSexo: formatSexo(c.paciente?.sexo),
        diagnostico: diagTexto,
        tratamiento: c.tratamiento || c.destino || "Atención realizada",
        especialidadId: espId,
        especialidadNombre: espNombre,
        medicoId: c.medico?.id,
        medicoNombre,
        medicoColegiatura: c.medico?.numero_colegiatura,
        origen: "consulta",
      });
    }
  }

  // 2. Si la especialidad es Enfermería o "todas", incluir atenciones_enfermeria
  if (!especialidadId || especialidadId === "todas" || especialidadId === "enfermeria") {
    let queryEnfermeria = supabase
      .from("atenciones_enfermeria")
      .select(`
        id,
        fecha,
        created_at,
        tipo,
        motivo,
        procedimiento,
        destino,
        enfermero_nombre,
        anulada_at,
        paciente:pacientes(
          id,
          nombres,
          apellidos,
          documento,
          tipo,
          grado,
          sexo
        )
      `)
      .is("anulada_at", null)
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha", { ascending: true });

    const { data: dataEnf } = await queryEnfermeria;
    if (dataEnf) {
      for (const e of dataEnf as any[]) {
        let horaStr = null;
        if (e.created_at) {
          const d = new Date(e.created_at);
          if (!isNaN(d.getTime())) {
            horaStr = d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
          }
        }

        // Si se filtró por "mi_usuario", verificar si la atención la realizó el usuario conectado
        if (medicoId === "mi_usuario" && usuarioActualNombre) {
          const nomEnf = (e.enfermero_nombre || "").toLowerCase();
          const nomUsuario = usuarioActualNombre.toLowerCase();
          // Comparar si incluye al menos una palabra significativa del nombre
          const partesNom = nomUsuario.split(/\s+/).filter((p) => p.length > 2);
          const coincide = partesNom.some((p) => nomEnf.includes(p));
          if (!coincide && partesNom.length > 0) {
            continue;
          }
        } else if (medicoId && medicoId !== "todos" && medicoId !== "mi_usuario") {
          // Si especificó un id médico numérico y estamos en enfermería, omitir si no aplica
          continue;
        }

        const pacienteNombre = e.paciente
          ? `${e.paciente.nombres || ""} ${e.paciente.apellidos || ""}`.trim()
          : "Paciente sin nombre";

        lista.push({
          index: 0,
          id: `enf-${e.id}`,
          fecha: e.fecha,
          hora: horaStr,
          pacienteNombre,
          pacienteJerarquia: formatJerarquia(e.paciente?.tipo, e.paciente?.grado),
          pacienteSexo: formatSexo(e.paciente?.sexo),
          diagnostico: e.motivo || `Atención de Enfermería (${e.tipo})`,
          tratamiento: e.procedimiento || e.destino || "Atención realizada",
          especialidadNombre: "Enfermería",
          medicoNombre: e.enfermero_nombre || "Personal de Enfermería",
          origen: "enfermeria",
        });
      }
    }
  }

  // Ordenar cronológicamente y asignar índice 1, 2, 3...
  lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  lista.forEach((item, idx) => {
    item.index = idx + 1;
  });

  return lista;
}

export function useProductividadReporte(filtros: FiltrosProductividad) {
  return useQuery({
    queryKey: ["productividad", filtros],
    queryFn: () => fetchProductividad(filtros),
    enabled: !!filtros.fechaDesde && !!filtros.fechaHasta,
  });
}
