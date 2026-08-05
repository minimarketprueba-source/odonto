/**
 * Utilidad de impresión aislada mediante iframe.
 * Garantiza impresión 100% confiable en navegadores y Electron (sin hojas en blanco ni conflictos con modales).
 */

export interface DatosImpresionReposo {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  tipoReposo: "domiciliario" | "local";
  /**
   * Conducta exacta con la que se cierra la atención. Distingue el parte sin
   * servicio del enfermo local, que en la base son los dos reposo "local".
   * Si no viene, el documento se arma según `tipoReposo` (consultas viejas).
   */
  destino?: DestinoImpreso | null;
  fechaDesde: string;
  fechaHasta?: string | null;
  cieCodigo?: string | null;
  cieDescripcion?: string | null;
  diagnosticoDetalle?: string | null;
  tratamiento?: string | null;
  medicoNombre: string;
  consultaId: number | string;
  qrSvgHtml?: string;
}

export interface DatosImpresionConsulta {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  fechaConsulta: string;
  horaConsulta?: string | null;
  especialidad?: string | null;
  motivoConsulta?: string | null;
  examenFisico?: string | null;
  cieCodigo?: string | null;
  cieDescripcion?: string | null;
  diagnosticoDetalle?: string | null;
  tratamiento?: string | null;
  reposoOtorgado?: string | null;
  medicoNombre: string;
  consultaId: number | string;
  qrSvgHtml?: string;
}

export function cleanQrText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

export function formatTipoGrado(tipo?: string | null, grado?: string | null): string {
  const t = tipo?.trim();
  const g = grado?.trim();

  if (t && g) {
    if (g.toLowerCase().includes(t.toLowerCase())) {
      return g;
    }
    return `${t} — ${g}`;
  }
  return g || t || "—";
}

/** Título, código de referencia y texto de cada conducta que se imprime. */
const DOCUMENTOS_REPOSO = {
  reposo_domiciliario: {
    titulo: "CERTIFICADO DE REPOSO DOMICILIARIO",
    ref: "REP-DOM",
    condicion: "REPOSO DOMICILIARIO (FUERA DE LA UNIDAD)",
    detalle: "El/la paciente debe cumplir reposo en su domicilio particular eximido de toda actividad.",
  },
  enfermo_local: {
    titulo: "CONSTANCIA DE ENFERMO LOCAL",
    ref: "ENF-LOC",
    condicion: "ENFERMO LOCAL (DENTRO DE LA UNIDAD)",
    detalle: "El/la paciente permanece en el recinto de la unidad eximido de instrucción, formación y ejercicios físicos.",
  },
  sin_servicio: {
    titulo: "PARTE SIN SERVICIO",
    ref: "SIN-SERV",
    condicion: "SIN SERVICIO (DENTRO DE LA UNIDAD)",
    detalle: "El/la paciente queda eximido del servicio, la guardia, la instrucción y los ejercicios físicos por el periodo indicado.",
  },
  internacion: {
    titulo: "CONSTANCIA DE INTERNACIÓN",
    ref: "INTERN",
    condicion: "INTERNACIÓN EN SALA DE OBSERVACIÓN",
    detalle: "El/la paciente queda internado en la sala de observación de la clínica, eximido de toda actividad.",
  },
} as const;

export type DestinoImpreso = keyof typeof DOCUMENTOS_REPOSO;

/**
 * Textos del documento de cada conducta. Con `reposoTipo` como respaldo para
 * las consultas viejas, anteriores a la columna `destino`.
 */
export function documentoReposo(
  destino?: DestinoImpreso | null,
  reposoTipo?: "domiciliario" | "local" | null
) {
  const clave = destino ?? (reposoTipo === "domiciliario" ? "reposo_domiciliario" : "enfermo_local");
  return DOCUMENTOS_REPOSO[clave];
}

export function imprimirCertificadoReposo(datos: DatosImpresionReposo) {
  const doc = documentoReposo(datos.destino, datos.tipoReposo);
  const tituloDoc = doc.titulo;
  const refCod = `${doc.ref}-${datos.pacienteDocumento || "0"}-${datos.consultaId}`;

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">Emisión: ${new Date().toLocaleDateString("es-PY")} — ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${formatTipoGrado(datos.pacienteTipo, datos.pacienteGrado)}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "—"}</p>
      </div>
    </div>

    <div class="box-reposo">
      <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #fecaca; padding-bottom: 6px; margin-bottom: 10px; font-weight:bold; color: #991b1b;">
        <span>REF: ${refCod}</span>
        <span>FECHA DE EMISIÓN: ${datos.fechaDesde}</span>
      </div>

      <div class="badge-reposo">
        <p style="margin:0; font-size:11px; font-weight:bold; color:#791616;">CONDICIÓN MÉDICA OTORGADA:</p>
        <p class="tipo">• ${doc.condicion}</p>
        <p style="margin:4px 0 0 0; font-size:11px; color:#991b1b;">${doc.detalle}</p>
      </div>

      <div class="dates-grid">
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">FECHA DE INICIO:</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.fechaDesde}</p>
        </div>
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">HASTA (INCLUSIVE):</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.fechaHasta || "Hasta nueva orden médica"}</p>
        </div>
      </div>

      ${datos.cieCodigo || datos.diagnosticoDetalle ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">DIAGNÓSTICO MÉDICO:</p>
          <p style="margin:2px 0 0 8px;">
            ${datos.diagnosticoDetalle ? `${datos.diagnosticoDetalle} ` : ""}
            ${datos.cieCodigo ? `[CIE-10: ${datos.cieCodigo} - ${datos.cieDescripcion || ""}]` : ""}
          </p>
        </div>
      ` : ""}

      <div style="margin-bottom:12px;">
        <p style="margin:0; font-weight:bold; color:#1e293b;">INDICACIONES / RESTRICCIONES:</p>
        <p style="margin:2px 0 0 8px;">
          ${datos.tratamiento || "Se indica suspensión total de actividades físicas, instrucción y ejercicios durante el periodo indicado."}
        </p>
      </div>

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Documento Oficial</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
            <p style="margin:1px 0; color:#64748b;">Escanee para verificar validez</p>
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.medicoNombre}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Firma y Sello del Profesional Médico</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosConstanciaEnfermeria {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  /** Destino ambulatorio que genera constancia. */
  destino: "enfermo_local" | "sin_servicio" | "reposo_domiciliario" | "observacion";
  fechaDesde: string; // dd/mm/yyyy
  fechaHasta?: string | null; // dd/mm/yyyy, inclusive
  motivo?: string | null;
  procedimiento?: string | null;
  enfermeroNombre: string;
  /** Nº de registro profesional del enfermero/a, si lo cargó en Mi perfil. */
  enfermeroRegistro?: string | null;
  atencionId: number | string;
  /** dd/mm/yyyy si un médico ya la revisó (reimpresión). */
  revisadaEl?: string | null;
  revisadaPor?: string | null;
  qrSvgHtml?: string;
}

/**
 * Constancia PROVISORIA expedida por enfermería cuando no hay médico de
 * guardia. Usa los mismos textos oficiales de cada conducta, pero se
 * distingue a propósito del certificado médico: lo firma el enfermero/a y
 * lleva bien visible que queda pendiente de revisión médica.
 */
export function imprimirConstanciaEnfermeria(datos: DatosConstanciaEnfermeria) {
  // La observación en cama de enfermería usa el texto de internación.
  const doc = DOCUMENTOS_REPOSO[datos.destino === "observacion" ? "internacion" : datos.destino];
  // Nunca la palabra CERTIFICADO: eso es del documento que firma el médico.
  const tituloDoc = "CONSTANCIA PROVISORIA DE ENFERMERÍA";
  const refCod = `ENF-${doc.ref}-${datos.pacienteDocumento || "0"}-${datos.atencionId}`;

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="sub" style="font-weight:bold;">${doc.condicion}</p>
      <p class="meta">Emisión: ${new Date().toLocaleDateString("es-PY")} — ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${formatTipoGrado(datos.pacienteTipo, datos.pacienteGrado)}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "—"}</p>
      </div>
    </div>

    ${datos.revisadaEl ? `
    <div style="border: 2px solid #16a34a; background: #f0fdf4; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;">
      <p style="margin:0; font-size:11px; font-weight:bold; color:#166534;">
        ATENCIÓN DE ENFERMERÍA — YA REVISADA POR EL MÉDICO
      </p>
      <p style="margin:2px 0 0 0; font-size:10.5px; color:#166534;">
        Revisada el ${datos.revisadaEl}${datos.revisadaPor ? ` por ${datos.revisadaPor}` : ""}.
        Si se emitió certificado médico, ese documento reemplaza a esta constancia.
      </p>
    </div>` : `
    <div style="border: 2px solid #d97706; background: #fffbeb; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;">
      <p style="margin:0; font-size:11px; font-weight:bold; color:#92400e;">
        CONSTANCIA PROVISORIA — ATENCIÓN DE ENFERMERÍA SIN MÉDICO DE GUARDIA
      </p>
      <p style="margin:2px 0 0 0; font-size:10.5px; color:#92400e;">
        Queda pendiente de revisión médica: será convalidada o reemplazada por el
        certificado del profesional médico en la próxima jornada de atención.
      </p>
    </div>`}

    <div class="box-reposo">
      <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #fecaca; padding-bottom: 6px; margin-bottom: 10px; font-weight:bold; color: #991b1b;">
        <span>REF: ${refCod}</span>
        <span>FECHA DE EMISIÓN: ${datos.fechaDesde}</span>
      </div>

      <div class="badge-reposo">
        <p style="margin:0; font-size:11px; font-weight:bold; color:#791616;">CONDICIÓN OTORGADA (PROVISORIA):</p>
        <p class="tipo">• ${doc.condicion}</p>
        <p style="margin:4px 0 0 0; font-size:11px; color:#991b1b;">${doc.detalle}</p>
      </div>

      <div class="dates-grid">
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">FECHA DE INICIO:</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.fechaDesde}</p>
        </div>
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">HASTA (INCLUSIVE):</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.fechaHasta || "Hasta revisión médica"}</p>
        </div>
      </div>

      ${datos.motivo ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">MOTIVO DE LA ATENCIÓN:</p>
          <p style="margin:2px 0 0 8px; white-space:pre-wrap;">${datos.motivo}</p>
        </div>
      ` : ""}

      ${datos.procedimiento ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">PROCEDIMIENTO REALIZADO:</p>
          <p style="margin:2px 0 0 8px; white-space:pre-wrap;">${datos.procedimiento}</p>
        </div>
      ` : ""}

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Constancia</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
            <p style="margin:1px 0; color:#64748b;">Escanee para verificar validez</p>
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.enfermeroNombre}</p>
          ${datos.enfermeroRegistro ? `<p style="margin:0; font-size:11px; font-weight:bold;">Reg. Prof. N° ${datos.enfermeroRegistro}</p>` : ""}
          <p style="margin:0; font-size:10px; color:#64748b;">Firma del Profesional — Clínica Odontológica</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export function imprimirInformeConsulta(datos: DatosImpresionConsulta) {
  const tituloDoc = "INFORME DE CONSULTA MÉDICA";
  const refCod = `CON-${datos.pacienteDocumento || "0"}-${datos.consultaId}`;

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">Emisión: ${new Date().toLocaleDateString("es-PY")} — ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${formatTipoGrado(datos.pacienteTipo, datos.pacienteGrado)}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "—"}</p>
      </div>
    </div>

    <div class="box-reposo">
      <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; font-weight:bold; color: #1e293b;">
        <span>REF: ${refCod}</span>
        <span>FECHA CONSULTA: ${datos.fechaConsulta}${datos.horaConsulta ? ` (${datos.horaConsulta} hs)` : ""}</span>
      </div>

      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; font-weight:bold; color:#0f172a;">ESPECIALIDAD / SERVICIO:</span>
        <span style="font-size:13px; font-weight:800; color:#1e40af; text-transform:uppercase;">${datos.especialidad || "CONSULTA GENERAL"}</span>
      </div>

      ${datos.motivoConsulta ? `
        <div style="margin-bottom:14px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 4px 0; font-weight:bold; color:#334155; font-size:11px; text-transform:uppercase;">MOTIVO DE CONSULTA:</p>
          <p style="margin:0; font-size:12.5px; color:#0f172a;">${datos.motivoConsulta}</p>
        </div>
      ` : ""}

      ${datos.examenFisico ? `
        <div style="margin-bottom:14px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 4px 0; font-weight:bold; color:#334155; font-size:11px; text-transform:uppercase;">EXAMEN FÍSICO / HALLAZGOS:</p>
          <p style="margin:0; font-size:12.5px; color:#0f172a; white-space:pre-wrap;">${datos.examenFisico}</p>
        </div>
      ` : ""}

      <div style="margin-bottom:14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 12px;">
        <p style="margin:0 0 4px 0; font-weight:bold; color:#1e40af; font-size:11px; text-transform:uppercase;">DIAGNÓSTICO MÉDICO (CIE-10):</p>
        <p style="margin:0; font-size:13px; font-weight:600; color:#1e3a8a;">
          ${datos.diagnosticoDetalle ? `${datos.diagnosticoDetalle} ` : ""}
          ${datos.cieCodigo ? `[CIE-10: ${datos.cieCodigo} - ${datos.cieDescripcion || ""}]` : ""}
        </p>
      </div>

      ${datos.tratamiento ? `
        <div style="margin-bottom:14px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 4px 0; font-weight:bold; color:#334155; font-size:11px; text-transform:uppercase;">TRATAMIENTO / INDICACIONES:</p>
          <p style="margin:0; font-size:12.5px; color:#0f172a; white-space:pre-wrap;">${datos.tratamiento}</p>
        </div>
      ` : ""}

      ${datos.reposoOtorgado ? `
        <div style="margin-bottom:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 2px 0; font-weight:bold; color:#991b1b; font-size:11px; text-transform:uppercase;">CONDICIÓN DE REPOSO OTORGADO:</p>
          <p style="margin:0; font-size:12.5px; font-weight:bold; color:#b91c1c;">${datos.reposoOtorgado}</p>
        </div>
      ` : ""}

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Documento Oficial</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
            <p style="margin:1px 0; color:#64748b;">Escanee para verificar validez</p>
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.medicoNombre}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Firma y Sello del Profesional Médico</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionSalvoconducto {
  numero: string;
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  pacientePromocion?: string | null;
  destino: string;
  motivo?: string | null;
  urgente: boolean;
  acompanante?: string | null;
  fechaSalida: string;
  horaSalida: string;
  retornoTexto?: string | null;
  profesionalNombre: string;
  expedidoPor?: string | null;
  qrSvgHtml?: string;
}

/** Autorización de traslado del paciente fuera de la Academia. */
export function imprimirSalvoconducto(datos: DatosImpresionSalvoconducto) {
  const tituloDoc = datos.urgente
    ? "SALVOCONDUCTO MÉDICO DE URGENCIA"
    : "SALVOCONDUCTO MÉDICO";
  const datosAcademicos = [
    datos.pacientePromocion ? `Curso ${datos.pacientePromocion}` : "",
    datos.pacienteUnidad || "",
  ].filter(Boolean).join(" · ");

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">N° ${datos.numero} — Emisión: ${datos.fechaSalida} a las ${datos.horaSalida} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${datos.pacienteTipo || "—"} ${datos.pacienteGrado ? `— ${datos.pacienteGrado}` : ""}</p>
        ${datosAcademicos ? `<p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datosAcademicos}</p>` : ""}
      </div>
    </div>

    <div class="box-reposo">
      ${datos.urgente ? `
        <div class="badge-reposo">
          <p class="tipo" style="margin:0;">• TRASLADO DE URGENCIA</p>
          <p style="margin:4px 0 0 0; font-size:11px; color:#991b1b;">
            Requiere traslado inmediato. Se solicita a la guardia dar curso sin demora.
          </p>
        </div>` : ""}

      <p style="margin:0 0 4px 0; font-size:13px;">
        Por la presente se <strong>AUTORIZA LA SALIDA</strong> de la persona arriba individualizada
        de las instalaciones de la institución, por razones médicas, con el
        siguiente destino:
      </p>

      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 12px; margin:10px 0;">
        <p style="margin:0; font-size:11px; font-weight:bold; color:#1e3a8a;">DESTINO AUTORIZADO:</p>
        <p style="margin:2px 0 0 0; font-size:15px; font-weight:800; color:#1d4ed8;">${datos.destino}</p>
      </div>

      ${datos.motivo ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">MOTIVO MÉDICO:</p>
          <p style="margin:2px 0 0 8px;">${datos.motivo}</p>
        </div>` : ""}

      <div class="dates-grid">
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">FECHA Y HORA DE SALIDA:</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.fechaSalida} — ${datos.horaSalida} hs</p>
        </div>
        <div>
          <p style="margin:0; font-size:11px; font-weight:bold; color:#475569;">RETORNO PREVISTO:</p>
          <p style="margin:2px 0 0 0; font-size:14px; font-weight:bold;">${datos.retornoTexto || "Según indicación médica"}</p>
        </div>
      </div>

      ${datos.acompanante ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">ACOMPAÑANTE:</p>
          <p style="margin:2px 0 0 8px;">${datos.acompanante}</p>
        </div>` : ""}

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Documento Oficial</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${datos.numero}</p>
            ${datos.expedidoPor ? `<p style="margin:1px 0; color:#64748b;">Expedido por: ${datos.expedidoPor}</p>` : ""}
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.profesionalNombre}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Firma y Sello del Profesional Tratante</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionHojaEnfermeria {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  camaCodigo: string;
  salaNombre: string;
  fechaIngreso: string;
  horaIngreso: string;
  diagnosticoIngreso?: string | null;
  motivoObservacion?: string | null;
  medicoTratante?: string | null;
  enfermeroCargo?: string | null;
  signosVitales: {
    fechaHora: string;
    pa?: string;
    fc?: string;
    fr?: string;
    temp?: string;
    spo2?: string;
    glucemia?: string;
    observaciones?: string;
    enfermero?: string;
  }[];
  qrSvgHtml?: string;
}

export function imprimirHojaEnfermeria(datos: DatosImpresionHojaEnfermeria) {
  const tituloDoc = "HOJA DE CONTROL Y EVOLUCIÓN DE ENFERMERÍA";
  const refCod = `ENF-CAM-${datos.camaCodigo.replace(/\s+/g, "")}-${datos.pacienteDocumento || "0"}`;

  const filasVitales = datos.signosVitales.map((v) => `
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold;">${v.fechaHora}</td>
      <td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e40af;">${v.pa || "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">${v.fc ? `${v.fc} bpm` : "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">${v.fr ? `${v.fr} rpm` : "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold; color:#b91c1c;">${v.temp ? `${v.temp} °C` : "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">${v.spo2 ? `${v.spo2}%` : "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">${v.glucemia ? `${v.glucemia} mg/dL` : "—"}</td>
      <td style="padding:6px; border:1px solid #cbd5e1; font-size:11px;">${v.observaciones || "—"}</td>
    </tr>
  `).join("");

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">Emisión: ${new Date().toLocaleDateString("es-PY")} — ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
        <p style="margin:2px 0;"><strong>Médico Tratante:</strong> ${datos.medicoTratante || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Ubicación:</strong> ${datos.camaCodigo} (${datos.salaNombre})</p>
        <p style="margin:2px 0;"><strong>Ingreso:</strong> ${datos.fechaIngreso} a las ${datos.horaIngreso} hs</p>
        <p style="margin:2px 0;"><strong>Enfermero/a a Cargo:</strong> ${datos.enfermeroCargo || "—"}</p>
      </div>
    </div>

    <div class="box-reposo">
      <div style="margin-bottom:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
        <p style="margin:0 0 2px 0; font-weight:bold; color:#1e293b; font-size:11px; text-transform:uppercase;">DIAGNÓSTICO Y MOTIVO DE OBSERVACIÓN / INTERNACIÓN:</p>
        <p style="margin:0; font-size:13px; font-weight:600; color:#0f172a;">${datos.diagnosticoIngreso || "En observación"}</p>
        ${datos.motivoObservacion ? `<p style="margin:4px 0 0 0; font-size:12px; color:#334155;">${datos.motivoObservacion}</p>` : ""}
      </div>

      <h3 style="margin:16px 0 8px 0; font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; border-bottom:1px solid #bfdbfe; padding-bottom:4px;">
        HISTORIAL DE CONSTANTES VITALES Y CONTROLES
      </h3>

      <table style="width:100%; border-collapse:collapse; text-align:center; font-size:11px; margin-bottom:16px;">
        <thead>
          <tr style="background:#f1f5f9; color:#0f172a;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Fecha / Hora</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">PA (mmHg)</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">FC</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">FR</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Temp</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">SpO2</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Glucemia</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Observaciones / Evolución</th>
          </tr>
        </thead>
        <tbody>
          ${filasVitales.length > 0 ? filasVitales : `<tr><td colspan="8" style="padding:10px; border:1px solid #cbd5e1; color:#64748b;">Sin registros de signos vitales aún.</td></tr>`}
        </tbody>
      </table>

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Ficha Clínica</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.enfermeroCargo || "Personal de Enfermería"}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Firma del Responsable de Enfermería</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionHistoriaClinicaCompleta {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  pacientePromocion?: string | null;
  consultas: {
    fecha: string;
    hora?: string | null;
    especialidad?: string | null;
    medico?: string | null;
    motivo?: string | null;
    examen?: string | null;
    cie10?: string | null;
    diagnostico?: string | null;
    tratamiento?: string | null;
    conducta?: string | null;
  }[];
  recetas?: {
    numero: string;
    fecha: string;
    medico?: string | null;
    items: string[];
    indicaciones?: string | null;
  }[];
  atencionesEnfermeria?: {
    fecha: string;
    hora?: string | null;
    tipo: string;
    motivo?: string | null;
    procedimiento?: string | null;
    signos?: string | null;
    enfermero?: string | null;
    revisada?: string | null;
  }[];
  fichasRac?: {
    numero: string;
    fecha: string;
    hora?: string | null;
    triaje?: string | null;
    motivo?: string | null;
    diagnostico?: string | null;
    destino?: string | null;
  }[];
  qrSvgHtml?: string;
}

export function imprimirHistoriaClinicaCompleta(datos: DatosImpresionHistoriaClinicaCompleta) {
  const tituloDoc = "HISTORIA CLÍNICA GENERAL Y LEGAJO MÉDICO";
  const refCod = `HC-${datos.pacienteDocumento || "0"}`;

  const numConsultas = datos.consultas.length;
  const numRecetas = datos.recetas?.length ?? 0;
  const numEnfermeria = datos.atencionesEnfermeria?.length ?? 0;
  const numRac = datos.fichasRac?.length ?? 0;

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">Emisión: ${new Date().toLocaleDateString("es-PY")} — ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${formatTipoGrado(datos.pacienteTipo, datos.pacienteGrado)}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "—"}</p>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:16px; text-align:center;">
      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
        <div style="font-size:18px; font-weight:800; color:#1e40af;">${numConsultas}</div>
        <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">Consultas</div>
      </div>
      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
        <div style="font-size:18px; font-weight:800; color:#0d9488;">${numEnfermeria}</div>
        <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">Enfermería</div>
      </div>
      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
        <div style="font-size:18px; font-weight:800; color:#e11d48;">${numRac}</div>
        <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">Urgencias RAC</div>
      </div>
      <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
        <div style="font-size:18px; font-weight:800; color:#7c3aed;">${numRecetas}</div>
        <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">Recetas</div>
      </div>
    </div>

    ${datos.consultas.length > 0 ? `
      <h3 style="font-size:13px; font-weight:800; color:#1e3a8a; text-transform:uppercase; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin:16px 0 10px 0;">
        1. HISTORIAL DE CONSULTAS MÉDICAS (${datos.consultas.length})
      </h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${datos.consultas.map((c) => `
          <div class="consulta-card" style="page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
              <span style="font-weight:bold; font-size:12px; color:#0f172a;">${c.fecha}${c.hora ? ` · ${c.hora} hs` : ""}</span>
              <span style="font-weight:bold; font-size:11px; color:#1e40af; text-transform:uppercase;">${c.especialidad || "CONSULTA GENERAL"}</span>
            </div>
            ${c.motivo ? `<p style="margin:2px 0;"><strong>Motivo:</strong> ${c.motivo}</p>` : ""}
            ${c.examen ? `<p style="margin:2px 0;"><strong>Examen Físico:</strong> ${c.examen}</p>` : ""}
            ${c.diagnostico ? `<p style="margin:2px 0;"><strong>Diagnóstico:</strong> ${c.diagnostico}</p>` : ""}
            ${c.tratamiento ? `<p style="margin:2px 0; white-space:pre-wrap;"><strong>Tratamiento / Indicaciones:</strong> ${c.tratamiento}</p>` : ""}
            ${c.conducta ? `<p style="margin:2px 0; color:#b91c1c; font-weight:bold;"><strong>Conducta:</strong> ${c.conducta}</p>` : ""}
            ${c.medico ? `<p style="margin:4px 0 0 0; font-size:11px; color:#64748b;">Médico: ${c.medico}</p>` : ""}
          </div>
        `).join("")}
      </div>
    ` : `<p style="color:#64748b; font-style:italic;">Sin consultas médicas registradas.</p>`}

    ${datos.atencionesEnfermeria && datos.atencionesEnfermeria.length > 0 ? `
      <h3 style="font-size:13px; font-weight:800; color:#0d9488; text-transform:uppercase; border-bottom:2px solid #0d9488; padding-bottom:4px; margin:20px 0 10px 0;">
        2. ATENCIONES AMBULATORIAS DE ENFERMERÍA (${datos.atencionesEnfermeria.length})
      </h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${datos.atencionesEnfermeria.map((a) => `
          <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; background:#f0fdf4; page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:11.5px; color:#166534;">
              <span>${a.fecha}${a.hora ? ` · ${a.hora} hs` : ""} — ${a.tipo}</span>
              <span>${a.revisada ? `Revisada por ${a.revisada}` : "Pendiente revisión"}</span>
            </div>
            ${a.motivo ? `<p style="margin:2px 0; font-size:11px;"><strong>Motivo:</strong> ${a.motivo}</p>` : ""}
            ${a.procedimiento ? `<p style="margin:2px 0; font-size:11px;"><strong>Procedimiento:</strong> ${a.procedimiento}</p>` : ""}
            ${a.signos ? `<p style="margin:2px 0; font-size:11px; color:#334155;"><strong>Signos Vitales:</strong> ${a.signos}</p>` : ""}
            ${a.enfermero ? `<p style="margin:2px 0 0 0; font-size:10.5px; color:#64748b;">Atendió: ${a.enfermero}</p>` : ""}
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${datos.fichasRac && datos.fichasRac.length > 0 ? `
      <h3 style="font-size:13px; font-weight:800; color:#e11d48; text-transform:uppercase; border-bottom:2px solid #e11d48; padding-bottom:4px; margin:20px 0 10px 0;">
        3. ATENCIONES DE URGENCIAS / RAC (${datos.fichasRac.length})
      </h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${datos.fichasRac.map((f) => `
          <div style="border:1px solid #fecaca; border-radius:6px; padding:8px 10px; background:#fff1f2; page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:11.5px; color:#9f1239;">
              <span>${f.numero} · ${f.fecha}${f.hora ? ` (${f.hora} hs)` : ""}</span>
              <span>Triaje: ${f.triaje || "Sin clasificar"}</span>
            </div>
            ${f.motivo ? `<p style="margin:2px 0; font-size:11px;"><strong>Motivo:</strong> ${f.motivo}</p>` : ""}
            ${f.diagnostico ? `<p style="margin:2px 0; font-size:11px;"><strong>Diagnóstico:</strong> ${f.diagnostico}</p>` : ""}
            ${f.destino ? `<p style="margin:2px 0; font-size:11px; font-weight:bold;"><strong>Conducta:</strong> ${f.destino}</p>` : ""}
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${datos.recetas && datos.recetas.length > 0 ? `
      <h3 style="font-size:13px; font-weight:800; color:#7c3aed; text-transform:uppercase; border-bottom:2px solid #7c3aed; padding-bottom:4px; margin:20px 0 10px 0;">
        4. RECETAS MÉDICAS EMITIDAS (${datos.recetas.length})
      </h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${datos.recetas.map((r) => `
          <div style="border:1px solid #ddd6fe; border-radius:6px; padding:8px 10px; background:#f5f3ff; page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:11.5px; color:#5b21b6;">
              <span>Receta ${r.numero} — ${r.fecha}</span>
              <span>${r.medico || ""}</span>
            </div>
            <ul style="margin:4px 0; padding-left:16px; font-size:11px;">
              ${r.items.map((it) => `<li>${it}</li>`).join("")}
            </ul>
            ${r.indicaciones ? `<p style="margin:2px 0; font-size:10.5px; color:#4c1d95;"><strong>Indicaciones:</strong> ${r.indicaciones}</p>` : ""}
          </div>
        `).join("")}
      </div>
    ` : ""}

    <div class="footer-qr">
      <div style="display:flex; align-items:center; gap: 12px;">
        ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
        <div style="font-size:10px; color:#475569;">
          <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
          <p style="margin:1px 0;">Clínica Odontológica — Legajo Clínico</p>
          <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
          <p style="margin:1px 0; color:#64748b;">Documento oficial expedido por la Clínica Odontológica</p>
        </div>
      </div>

      <div class="firmas">
        <div class="linea-firma"></div>
        <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">Dirección de la Clínica Odontológica</p>
        <p style="margin:0; font-size:10px; color:#64748b;">Firma y Sello del Responsable de la Clínica</p>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export function imprimirHistoriaClinicaHTML(pacienteNombre: string, pacienteDoc: string, contenidoBodyHtml: string) {
  const tituloDoc = `HISTORIA CLÍNICA — ${pacienteNombre} (CI: ${pacienteDoc})`;
  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>INFORME DE HISTORIA CLÍNICA (CI: ${pacienteDoc})</h2>
      <p class="meta">Impreso el ${new Date().toLocaleDateString("es-PY")} a las ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} hs</p>
    </div>
    ${contenidoBodyHtml}
  `;
  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionFichaRac {
  numero: string;
  fecha: string;
  edad: string;
  sexo: string;
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  jerarquia?: string | null;
  domicilio?: string | null;
  barrioCompania?: string | null;
  localidad?: string | null;
  referenciaDomiciliaria?: string | null;
  telefono?: string | null;
  horaAdmision?: string | null;
  horaEnfermeria?: string | null;
  presionArterial?: string | null;
  fc?: string | null;
  fr?: string | null;
  spo2?: string | null;
  temp?: string | null;
  motivoConsulta?: string | null;
  discriminante?: string | null;
  triajeLabel?: string | null;
  triajeHex?: string | null;
  enfermero?: string | null;
  horaMedico?: string | null;
  patologiaPrevia?: string | null;
  alergias?: string | null;
  examenFisico?: string | null;
  laboratorio?: string | null;
  radiologia?: string | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  evolucion?: string | null;
  plan?: string | null;
  horaDestino?: string | null;
  /** value del destino elegido; marca la casilla correspondiente. */
  destino?: string | null;
  destinoDias?: number | null;
  profesionalNombre?: string | null;
}

/** Ficha de RAC (urgencias), con la misma disposición que la ficha en papel. */
export function imprimirFichaRac(datos: DatosImpresionFichaRac) {
  const vacio = "&nbsp;";
  const v = (texto?: string | null) => (texto ? String(texto) : vacio);
  // Reserva alto para lo escrito a mano cuando el campo viene vacío.
  const campo = (etiqueta: string, texto?: string | null, alto = 0) => `
    <div style="border-bottom:1px solid #94a3b8; padding:3px 4px; min-height:${alto || 18}px;">
      <span style="font-size:9px; font-weight:700; color:#334155;">${etiqueta}</span>
      <span style="font-size:11px; margin-left:6px;">${v(texto)}</span>
    </div>`;
  const seccion = (hora: string | null | undefined, titulo: string, cuerpo: string) => `
    <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
      <tr>
        <td style="width:58px; border:1px solid #000; text-align:center; vertical-align:top; padding:3px;">
          <div style="font-size:8px; font-weight:700;">HORA</div>
          <div style="font-size:12px; font-weight:700; margin-top:2px;">${hora || vacio}</div>
        </td>
        <td style="border:1px solid #000; padding:0;">
          <div style="border-bottom:1px solid #000; padding:2px 5px; font-size:11px; font-weight:800;">${titulo}</div>
          <div style="padding:4px 5px;">${cuerpo}</div>
        </td>
      </tr>
    </table>`;

  const casilla = (valor: string, etiqueta: string, pideDias: boolean) => {
    const marcada = datos.destino === valor;
    return `
      <tr>
        <td style="padding:3px 6px; font-size:11px; width:150px;">${etiqueta}</td>
        <td style="padding:3px 6px;">
          <span style="display:inline-block; width:34px; height:15px; border:1px solid #000;
            text-align:center; font-weight:800; font-size:12px; line-height:15px;
            background:${marcada ? "#000" : "#fff"}; color:${marcada ? "#fff" : "#000"};">${marcada ? "X" : ""}</span>
        </td>
        <td style="padding:3px 6px; font-size:11px;">
          ${pideDias
            ? `<span style="display:inline-block; min-width:44px; border-bottom:1px solid #000; text-align:center; font-weight:700;">${
                marcada && datos.destinoDias ? datos.destinoDias : vacio
              }</span> días`
            : ""}
        </td>
      </tr>`;
  };

  const html = `
    <div style="text-align:center; margin-bottom:8px;">
      <div style="font-size:13px; font-weight:800;">INSTITUTO SUPERIOR DE EDUCACIÓN POLICIAL</div>
      <div style="font-size:12px; font-weight:800;">DIRECCIÓN DE GRADO</div>
      <div style="font-size:12px; font-weight:800;">ACADEMIA NACIONAL DE POLICÍA "GRAL. JOSÉ E. DÍAZ"</div>
    </div>

    <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
      <tr>
        <td style="border:1px solid #000; padding:3px 6px; font-size:12px; font-weight:800; width:150px;">
          FICHA DE RAC
        </td>
        <td style="border:1px solid #000; padding:3px 6px; font-size:11px;">
          N°: <strong>${datos.numero}</strong>
        </td>
        <td style="border:1px solid #000; padding:3px 6px; font-size:11px;">
          FECHA: <strong>${datos.fecha}</strong>
        </td>
        <td style="border:1px solid #000; padding:3px 6px; font-size:11px;">
          EDAD: <strong>${v(datos.edad)}</strong>
        </td>
        <td style="border:1px solid #000; padding:3px 6px; font-size:11px;">
          SEXO: <strong>${v(datos.sexo)}</strong>
        </td>
      </tr>
    </table>

    ${seccion(datos.horaAdmision, "1. ADMISIÓN", `
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:62%; vertical-align:top;">
            ${campo("Nombre y apellido:", datos.pacienteNombre)}
            ${campo("Domicilio:", datos.domicilio)}
            ${campo("Barrio o Compañía:", datos.barrioCompania)}
            ${campo("Localidad:", datos.localidad)}
            ${campo("Referencia Domiciliaria:", datos.referenciaDomiciliaria)}
          </td>
          <td style="width:38%; vertical-align:top; padding-left:8px;">
            ${campo("N° C.I.:", datos.pacienteDocumento)}
            ${campo("Jerarquía:", datos.jerarquia)}
            ${campo("Tel./Cel.:", datos.telefono)}
          </td>
        </tr>
      </table>`)}

    ${seccion(datos.horaEnfermeria, "2. ENFERMERÍA", `
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          ${[
            ["PA", datos.presionArterial],
            ["FC", datos.fc],
            ["FR", datos.fr],
            ["SPO2", datos.spo2],
            ["T° Axilar", datos.temp],
          ].map(([et, val]) => `
            <td style="border:1px solid #94a3b8; padding:3px 5px; font-size:10px;">
              <strong>${et}</strong>
              <span style="font-size:12px; margin-left:4px;">${v(val as string)}</span>
            </td>`).join("")}
        </tr>
      </table>
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:64%; vertical-align:top;">
            ${campo("Motivo de consulta:", datos.motivoConsulta, 26)}
            ${campo("Discriminante:", datos.discriminante)}
            ${campo("Firma y sello:", datos.enfermero)}
          </td>
          <td style="width:36%; vertical-align:middle; text-align:center; padding-left:8px;">
            <div style="font-size:9px; font-weight:700; color:#334155;">CLASIFICACIÓN</div>
            <div style="display:inline-block; margin-top:3px; padding:6px 14px; border:2px solid #000;
              border-radius:4px; font-size:13px; font-weight:800; text-transform:uppercase;
              background:${datos.triajeHex || "#fff"}; color:${datos.triajeHex ? "#fff" : "#000"};">
              ${datos.triajeLabel || "SIN CLASIFICAR"}
            </div>
          </td>
        </tr>
      </table>`)}

    ${seccion(datos.horaMedico, "3. MÉDICO", `
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:64%; vertical-align:top;">${campo("Patología Previa y Tratamiento Actual:", datos.patologiaPrevia, 26)}</td>
          <td style="width:36%; vertical-align:top; padding-left:8px;">${campo("Alergias:", datos.alergias, 26)}</td>
        </tr>
      </table>
      ${campo("Examen Físico:", datos.examenFisico, 26)}
      ${campo("Laboratorio:", datos.laboratorio)}
      ${campo("Radiología:", datos.radiologia)}
      ${campo("Diagnóstico:", datos.diagnostico, 26)}
      ${campo("TRATAMIENTO Suministro en Consultorio:", datos.tratamiento, 44)}
      ${campo("Evolución:", datos.evolucion, 44)}
      ${campo("Plan:", datos.plan, 30)}`)}

    ${seccion(datos.horaDestino, "4. DESTINO / NOVEDAD", `
      <table style="border-collapse:collapse;">
        ${casilla("sin_servicio", "Parte Sin Servicio", true)}
        ${casilla("enfermo_local", "Enfermo local", true)}
        ${casilla("reposo_domiciliario", "Reposo Domiciliario", true)}
        ${casilla("internacion", "Internación", true)}
        ${casilla("alta", "Alta", false)}
      </table>
      <div style="margin-top:26px; text-align:center;">
        <div style="width:260px; border-bottom:1px solid #000; margin:0 auto 3px auto;"></div>
        <div style="font-size:11px; font-weight:700;">${v(datos.profesionalNombre)}</div>
        <div style="font-size:9px; color:#475569;">NOMBRE, FIRMA Y SELLO DEL PROFESIONAL</div>
      </div>`)}
  `;

  ejecutarImpresionIframe(`Ficha de RAC ${datos.numero}`, html);
}

export interface DatosImpresionOrdenEstudios {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  fecha: string;
  estudiosSolicitados: string;
  diagnosticoPresuntivo?: string | null;
  indicaciones?: string | null;
  medicoNombre: string;
  ordenId?: string | number;
  qrSvgHtml?: string;
}

export function imprimirOrdenEstudios(datos: DatosImpresionOrdenEstudios) {
  const tituloDoc = "SOLICITUD DE ESTUDIOS MÉDICOS Y ANÁLISIS";
  const refCod = `ORD-${datos.pacienteDocumento || "0"}-${datos.ordenId || Date.now().toString().slice(-5)}`;

  const html = `
    <div class="header">
      <h1>SECCIÓN SANIDAD — ACADEMIA NACIONAL DE POLICÍA</h1>
      <p class="sub">Gral. José E. Díaz</p>
      <h2>${tituloDoc}</h2>
      <p class="meta">Emisión: ${datos.fecha} — Clínica Odontológica</p>
    </div>

    <div class="box-paciente">
      <div>
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:2px 0;"><strong>Cédula de Identidad (CI):</strong> ${datos.pacienteDocumento || "—"}</p>
      </div>
      <div>
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${formatTipoGrado(datos.pacienteTipo, datos.pacienteGrado)}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "—"}</p>
      </div>
    </div>

    <div class="box-reposo">
      <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; font-weight:bold; color: #1e293b;">
        <span>REF: ${refCod}</span>
        <span>FECHA SOLICITUD: ${datos.fecha}</span>
      </div>

      <div style="margin-bottom:14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 12px;">
        <p style="margin:0 0 6px 0; font-weight:bold; color:#1e40af; font-size:11px; text-transform:uppercase;">ESTUDIOS / ANÁLISIS SOLICITADOS:</p>
        <p style="margin:0; font-size:13px; font-weight:700; color:#1e3a8a; white-space:pre-wrap;">${datos.estudiosSolicitados}</p>
      </div>

      ${datos.diagnosticoPresuntivo ? `
        <div style="margin-bottom:14px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 4px 0; font-weight:bold; color:#334155; font-size:11px; text-transform:uppercase;">DIAGNÓSTICO PRESUNTIVO / JUSTIFICACIÓN MÉDICA:</p>
          <p style="margin:0; font-size:12.5px; color:#0f172a;">${datos.diagnosticoPresuntivo}</p>
        </div>
      ` : ""}

      ${datos.indicaciones ? `
        <div style="margin-bottom:14px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
          <p style="margin:0 0 4px 0; font-weight:bold; color:#334155; font-size:11px; text-transform:uppercase;">INDICACIONES PREVIAS / PREPARACIÓN DEL PACIENTE:</p>
          <p style="margin:0; font-size:12.5px; color:#0f172a; white-space:pre-wrap;">${datos.indicaciones}</p>
        </div>
      ` : ""}

      <div class="footer-qr">
        <div style="display:flex; align-items:center; gap: 12px;">
          ${datos.qrSvgHtml ? `<div style="border: 1px solid #94a3b8; padding: 4px; background: #fff;">${datos.qrSvgHtml}</div>` : ""}
          <div style="font-size:10px; color:#475569;">
            <p style="margin:0; font-weight:bold; color:#0f172a; font-size:11px;">VERIFICACIÓN DIGITAL QR</p>
            <p style="margin:1px 0;">Clínica Odontológica — Solicitud de Estudios</p>
            <p style="margin:1px 0; font-family: monospace;">ID: ${refCod}</p>
          </div>
        </div>

        <div class="firmas">
          <div class="linea-firma"></div>
          <p style="margin:2px 0 0 0; font-weight:bold; font-size:12px;">${datos.medicoNombre}</p>
          <p style="margin:0; font-size:10px; color:#64748b;">Firma y Sello del Médico Solicitante</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

function ejecutarImpresionIframe(titulo: string, bodyContent: string) {
  // Eliminar iframe previo si existe
  const idIframe = "anp-print-iframe";
  const viejo = document.getElementById(idIframe);
  if (viejo) viejo.remove();

  const iframe = document.createElement("iframe");
  iframe.id = idIframe;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-9999";
  iframe.title = titulo;

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .header h1 {
            font-size: 17px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header p.sub {
            font-size: 10px;
            font-weight: 700;
            color: #334155;
            margin: 2px 0 0 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 700;
            margin: 6px 0 0 0;
            text-transform: uppercase;
          }
          .header p.meta {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .box-paciente {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 12px;
          }
          .box-reposo {
            border: 2px solid #0284c7;
            border-radius: 6px;
            padding: 14px;
            background-color: #fff;
          }
          .badge-reposo {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 12px;
          }
          .badge-reposo .tipo {
            font-size: 15px;
            font-weight: 800;
            color: #b91c1c;
            text-transform: uppercase;
            margin: 2px 0 0 0;
          }
          .dates-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .footer-qr {
            margin-top: 24px;
            padding-top: 14px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .firmas {
            text-align: center;
          }
          .linea-firma {
            width: 190px;
            border-bottom: 1px solid #000;
            margin: 0 auto 4px auto;
          }
          .consulta-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 10px;
            background: #fff;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  doc.close();

  // Esperar montaje y llamar a print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Error al imprimir iframe:", e);
    }
  }, 250);
}

export function imprimirFichaAntropometrica(cadete: {
  nombre: string;
  apellido: string;
  dni: string;
  curso?: string | null;
  seccion?: string | null;
  altura_cm?: number | null;
  ultima_pesada?: {
    fecha: string | null;
    peso_kg: number | null;
    imc: number | null;
    masa_muscular_kg?: number | null;
    cintura_cm?: number | null;
    cadera_cm?: number | null;
    icc?: number | null;
    dx_icc?: string | null;
    porcentaje_mm?: number | null;
    porcentaje_mg?: number | null;
    dx_bia?: string | null;
    egs?: string | null;
  } | null;
}) {
  const p = cadete.ultima_pesada;
  // La ficha en papel no inventa nada: lo que no se midió sale con guión.
  const fechaPesada = p?.fecha
    ? new Date(p.fecha).toLocaleDateString('es-PY')
    : null;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <h3 style="margin: 0; text-transform: uppercase; font-size: 14px;">POLICÍA NACIONAL — GOBIERNO DEL PARAGUAY</h3>
        <h2 style="margin: 4px 0; font-size: 15px;">INSTITUTO SUPERIOR DE EDUCACIÓN POLICIAL</h2>
        <h3 style="margin: 0; font-size: 13px;">ACADEMIA NACIONAL DE POLICÍA "GRAL. JOSÉ E. DÍAZ"</h3>
        <h1 style="margin: 15px 0 5px 0; font-size: 18px; text-decoration: underline;">FICHA ANTROPOMÉTRICA</h1>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 15px; line-height: 1.6;">
        <div><strong>Nombre y Apellido:</strong> ${cadete.nombre} ${cadete.apellido}</div>
        <div><strong>C.I. Nº:</strong> ${cadete.dni}</div>
        <div><strong>Curso:</strong> ${cadete.curso || '—'} &nbsp;&nbsp;&nbsp; <strong>Sección:</strong> ${cadete.seccion || '—'}</div>
        <div><strong>Talla:</strong> ${cadete.altura_cm ? `${cadete.altura_cm} cm` : '—'}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; margin-top: 10px;" border="1">
        <thead>
          <tr style="background-color: #e5e7eb;">
            <th style="padding: 8px; text-align: left;">PARÁMETRO</th>
            <th style="padding: 8px; width: 120px;">VALOR ACTUAL</th>
            <th style="padding: 8px; text-align: left;">DIAGNÓSTICO / RANGO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; font-weight: bold; text-align: left;">FECHA</td>
            <td style="padding: 8px;">${fechaPesada || '—'}</td>
            <td style="padding: 8px; text-align: left;">Control Antropométrico</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; text-align: left;">PESO</td>
            <td style="padding: 8px;">${p?.peso_kg ? `${p.peso_kg} kg` : '—'}</td>
            <td style="padding: 8px; text-align: left;">—</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; text-align: left;">IMC</td>
            <td style="padding: 8px;">${p?.imc ?? '—'}</td>
            <td style="padding: 8px; text-align: left;">${p?.imc ? 'Índice de Masa Corporal (OMS)' : (cadete.altura_cm ? '—' : 'Sin talla registrada: no se puede calcular')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; text-align: left;">CINTURA / CADERA</td>
            <td style="padding: 8px;">${p?.cintura_cm ? `${p.cintura_cm} cm` : '—'} / ${p?.cadera_cm ? `${p.cadera_cm} cm` : '—'}</td>
            <td style="padding: 8px; text-align: left;">—</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; text-align: left;">DX ICC</td>
            <td style="padding: 8px;">${p?.icc || '—'}</td>
            <td style="padding: 8px; text-align: left;">${p?.dx_icc || 'Diagnóstico Índice Cintura-Cadera'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; text-align: left;">%MM (% Masa Muscular)</td>
            <td style="padding: 8px;">${p?.porcentaje_mm ? `${p.porcentaje_mm}%${p.masa_muscular_kg ? ` (${p.masa_muscular_kg} kg)` : ''}` : '—'}</td>
            <td style="padding: 8px; text-align: left;">Porcentaje de Masa Muscular</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; text-align: left;">%MG (% Masa Grasa)</td>
            <td style="padding: 8px;">${p?.porcentaje_mg ? `${p.porcentaje_mg}%` : '—'}</td>
            <td style="padding: 8px; text-align: left;">Porcentaje de Masa Grasa</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; text-align: left;">DX BIA</td>
            <td style="padding: 8px;">${p?.dx_bia || '—'}</td>
            <td style="padding: 8px; text-align: left;">Diagnóstico Bioimpedancia / Grasa Visceral</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; text-align: left;">EGS</td>
            <td style="padding: 8px;">${p?.egs || '—'}</td>
            <td style="padding: 8px; text-align: left;">Evaluación Global Subjetiva</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center;">
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma del Cadete</span>
        </div>
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma y Sello Nutricionista</span>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe("Ficha Antropométrica", html);
}

export interface DatosImpresionProductividad {
  especialidadNombre: string;
  especialistaNombre: string;
  especialistaColegiatura?: string | null;
  fecha: string;
  horario?: string | null;
  unidad?: string | null;
  tipoPeriodo?: "diario" | "semanal" | "mensual" | "personalizado";
  periodoEtiqueta?: string;
  filas: {
    index: number;
    pacienteNombre: string;
    pacienteJerarquia: string;
    pacienteSexo: string;
    diagnostico: string;
    tratamiento: string;
  }[];
  totalAtendidos: number;
  totalMasculino: number;
  totalFemenino: number;
}

export function imprimirPlanillaProductividad(datos: DatosImpresionProductividad) {
  let tituloPrincipal = "INFORME DIARIO DE PRODUCCIÓN ODONTOLÓGICA";
  if (datos.tipoPeriodo === "semanal") {
    tituloPrincipal = "INFORME SEMANAL DE PRODUCCIÓN ODONTOLÓGICA";
  } else if (datos.tipoPeriodo === "mensual") {
    tituloPrincipal = "INFORME MENSUAL DE PRODUCCIÓN ODONTOLÓGICA";
  } else if (datos.tipoPeriodo === "personalizado") {
    tituloPrincipal = "INFORME DE PRODUCCIÓN ODONTOLÓGICA";
  }

  const tituloDoc = tituloPrincipal;

  const trs = datos.filas.map((f) => `
    <tr>
      <td style="padding: 6px 4px; border: 1px solid #334155; text-align: center; font-weight: bold; font-size: 11px;">${f.index}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 12px; font-weight: 600; color: #0f172a;">${f.pacienteNombre}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; text-align: center; color: #334155;">${f.pacienteJerarquia}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; text-align: center; font-weight: bold; color: ${f.pacienteSexo === "M" ? "#1d4ed8" : "#be185d"};">${f.pacienteSexo}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; color: #1e293b;">${f.diagnostico}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; color: #1e293b;">${f.tratamiento}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #0f172a; max-width: 900px; margin: 0 auto;">
      <!-- CABECERA INSTITUCIONAL OFICIAL -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: left;">
          <h3 style="margin: 0; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">POLICÍA NACIONAL DEL PARAGUAY</h3>
          <h2 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">HOSPITAL CENTRAL DE POLICÍA "RIGOBERTO CABALLERO"</h2>
          <h1 style="margin: 4px 0 0 0; font-size: 15px; font-weight: 900; color: #1e3a8a; text-transform: UPPERCASE; letter-spacing: 0.5px;">${tituloPrincipal}</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #2563eb;">PLANILLA DE PRODUCTIVIDAD POR ESPECIALIDAD Y PROFESIONAL</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #334155; line-height: 1.4;">
          <p style="margin: 0; font-weight: bold; color: #0f172a;">CLÍNICA ODONTOLÓGICA</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Emisión: ${new Date().toLocaleDateString("es-PY")}</p>
        </div>
      </div>

      <!-- METADATOS DE CABECERA -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px;">
        <div><strong>Especialidad:</strong> <span style="color: #1e40af; font-weight: bold; text-transform: uppercase;">${datos.especialidadNombre}</span></div>
        <div><strong>Especialista / Profesional:</strong> <span style="font-weight: bold; color: #0f172a;">${datos.especialistaNombre}</span> ${datos.especialistaColegiatura ? `(Reg. N° ${datos.especialistaColegiatura})` : ""}</div>
        <div><strong>Período de Atención:</strong> <span style="font-weight: bold; color: #0369a1;">${datos.periodoEtiqueta || datos.fecha}</span></div>
        <div><strong>Horario / Turno:</strong> <span style="font-weight: bold;">${datos.horario || "13:00 a 19:00"} hs</span></div>
      </div>

      <!-- TABLA DE PACIENTES ATENDIDOS -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;" border="1">
        <thead>
          <tr style="background-color: #1e293b; color: #ffffff;">
            <th style="padding: 8px 4px; width: 35px; text-align: center;">Nº</th>
            <th style="padding: 8px; text-align: left;">Nombre y Apellido</th>
            <th style="padding: 8px; width: 110px; text-align: center;">Documento</th>
            <th style="padding: 8px; width: 45px; text-align: center;">Sexo</th>
            <th style="padding: 8px; text-align: left;">Pieza y procedimiento</th>
            <th style="padding: 8px; text-align: left;">Nota clínica</th>
          </tr>
        </thead>
        <tbody>
          ${trs.length > 0 ? trs : `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">Sin atenciones registradas en la fecha seleccionada.</td></tr>`}
        </tbody>
      </table>

      <!-- RESUMEN DE PRODUCTIVIDAD -->
      <div style="display: flex; justify-content: space-between; align-items: center; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 14px; margin-bottom: 40px; font-size: 12px; font-weight: bold; color: #1e3a8a;">
        <span>TOTAL PACIENTES ATENDIDOS: ${datos.totalAtendidos}</span>
        <div style="display: flex; gap: 16px; font-size: 11px;">
          <span style="color: #1d4ed8;">Masculino (M): ${datos.totalMasculino}</span>
          <span style="color: #be185d;">Femenino (F): ${datos.totalFemenino}</span>
        </div>
      </div>

      <!-- FIRMAS OFICIALES -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; text-align: center; page-break-inside: avoid; margin-top: 50px;">
        <div>
          <div style="width: 220px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">${datos.especialistaNombre}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">${datos.especialidadNombre} ${datos.especialistaColegiatura ? `· Reg. N° ${datos.especialistaColegiatura}` : ""}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Firma y Sello del Especialista / Profesional</p>
        </div>
        <div>
          <div style="width: 220px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">V° B° JEFATURA DE SANIDAD</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">Clínica Odontológica</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Firma y Sello Autorizado</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionPresupuesto {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  titulo: string;
  fecha: string;
  estado: string;
  total: number;
  saldoPendiente: number;
  detalles: {
    pieza?: number | null;
    cara?: string | null;
    tratamiento: string;
    costo: number;
    descuento: number;
  }[];
  pagos: {
    fecha: string;
    monto: number;
    metodo: string;
  }[];
}

export function imprimirPresupuesto(datos: DatosImpresionPresupuesto) {
  const tituloDoc = "PRESUPUESTO ODONTOLÓGICO";

  const trsDetalles = datos.detalles.map((d) => `
    <tr>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${d.pieza ? `${d.pieza} (${d.cara || "Completo"})` : "Boca entera"}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${d.tratamiento}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${d.costo.toLocaleString()} ₲</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">-${d.descuento.toLocaleString()} ₲</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${(d.costo - d.descuento).toLocaleString()} ₲</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px;">
        <h1 style="margin: 0; font-size: 18px; color: #1e3a8a;">CLÍNICA ODONTOLÓGICA</h1>
        <h2 style="margin: 5px 0; font-size: 14px;">${tituloDoc}</h2>
        <p style="margin: 0; font-size: 11px; color: #475569;">Fecha: ${datos.fecha}</p>
      </div>

      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc;">
        <p style="margin: 4px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin: 4px 0;"><strong>Documento:</strong> ${datos.pacienteDocumento || "—"}</p>
        <p style="margin: 4px 0;"><strong>Plan de Tratamiento:</strong> ${datos.titulo} <span style="padding: 2px 6px; background-color: #e2e8f0; border-radius: 4px; font-size: 10px; text-transform: uppercase;">${datos.estado}</span></p>
      </div>

      <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">DETALLE DE TRATAMIENTOS</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Diente/Cara</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Tratamiento</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Costo</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Descuento</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${trsDetalles || `<tr><td colspan="5" style="text-align:center; padding: 10px;">Sin procedimientos</td></tr>`}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="width: 250px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f1f5f9;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Cotizado:</span>
            <strong>${datos.total.toLocaleString()} ₲</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Abonado:</span>
            <strong style="color: #16a34a;">${(datos.total - datos.saldoPendiente).toLocaleString()} ₲</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 14px;">
            <strong>SALDO PENDIENTE:</strong>
            <strong style="color: #dc2626;">${datos.saldoPendiente.toLocaleString()} ₲</strong>
          </div>
        </div>
      </div>

      <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center;">
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma del Paciente</span>
        </div>
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma y Sello del Odontólogo</span>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}
