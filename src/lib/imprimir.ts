/**
 * Utilidad de Impresión Aislada mediante Iframe para Sanidad ANP.
 * Garantiza impresión 100% confiable en navegadores y Electron (sin hojas en blanco ni conflictos con modales).
 */

export interface DatosImpresionReposo {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteTipo?: string | null;
  pacienteGrado?: string | null;
  pacienteUnidad?: string | null;
  tipoReposo: "domiciliario" | "local";
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

export function imprimirCertificadoReposo(datos: DatosImpresionReposo) {
  const esDom = datos.tipoReposo === "domiciliario";
  const tituloDoc = esDom ? "CERTIFICADO DE REPOSO DOMICILIARIO" : "CONSTANCIA DE ENFERMO LOCAL";
  const refCod = `${esDom ? "REP-DOM" : "ENF-LOC"}-${datos.pacienteDocumento || "0"}-${datos.consultaId}`;

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
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${datos.pacienteTipo || "Cadete"} ${datos.pacienteGrado ? `— ${datos.pacienteGrado}` : ""}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "ANP"}</p>
      </div>
    </div>

    <div class="box-reposo">
      <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #fecaca; padding-bottom: 6px; margin-bottom: 10px; font-weight:bold; color: #991b1b;">
        <span>REF: ${refCod}</span>
        <span>FECHA DE EMISIÓN: ${datos.fechaDesde}</span>
      </div>

      <div class="badge-reposo">
        <p style="margin:0; font-size:11px; font-weight:bold; color:#791616;">CONDICIÓN MÉDICA OTORGADA:</p>
        <p class="tipo">
          • ${esDom ? "REPOSO DOMICILIARIO (FUERA DE LA UNIDAD)" : "ENFERMO LOCAL (DENTRO DE LA UNIDAD)"}
        </p>
        <p style="margin:4px 0 0 0; font-size:11px; color:#991b1b;">
          ${esDom
            ? "El/la paciente debe cumplir reposo en su domicilio particular eximido de toda actividad."
            : "El/la paciente permanece en el recinto de la unidad eximido de instrucción, formación y ejercicios físicos."}
        </p>
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
            <p style="margin:1px 0;">Sanidad ANP — Documento Oficial</p>
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
        <p style="margin:2px 0;"><strong>Tipo / Grado:</strong> ${datos.pacienteTipo || "Cadete"} ${datos.pacienteGrado ? `— ${datos.pacienteGrado}` : ""}</p>
        <p style="margin:2px 0;"><strong>Unidad / Sección:</strong> ${datos.pacienteUnidad || "ANP"}</p>
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
            <p style="margin:1px 0;">Sanidad ANP — Documento Oficial</p>
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
